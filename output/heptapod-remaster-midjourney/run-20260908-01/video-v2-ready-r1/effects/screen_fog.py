"""Audit first; composite the approved atmosphere plate without remapping source pixels.

Only C04/C05/C07 are accepted. All outputs stay under this run's owned folders.
Use /tmp/heptapod-local-video-venv/bin/python -s. See README.md for commands.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import collections
import shutil
import cv2
import numpy as np

RUN = Path(__file__).resolve().parents[1]
APPROVED = RUN.with_name('video-screen-fog-plate-r1')
PLATE = APPROVED / 'fog-plate.mp4'
W, H, N, FPS = 1920, 1080, 145, 24
# Normalized target ROIs are derived from selected endpoint images, not bright sky.
# A candidate must lie ENTIRELY inside its ROI; clipping a sky region is forbidden.
POLICIES = {
    'C04': dict(first_frame=72, roi=[.32, .005, .68, .40], max_area=.025),
    'C05': dict(first_frame=0, roi=[.30, .005, .70, .38], max_area=.04),
    'C07': dict(first_frame=0, roi=[.10, .06, .90, .59], max_area=.42),
}
ALGORITHM = 'approved-fog-math-conservative-single-screen-mask-v1'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, indent=2) + '\n')
    temporary.replace(path)


def probe(path):
    data = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(path)]))
    stream = next(x for x in data['streams'] if x['codec_type'] == 'video')
    assert (int(stream['width']), int(stream['height'])) == (W, H)
    assert stream['r_frame_rate'] == '24/1'
    assert int(stream['nb_frames']) == N
    return stream


def packets(path):
    data = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_packets',
        '-show_data_hash', 'sha256', '-show_entries',
        'packet=pts,dts,duration,size,data_hash', '-of', 'json', str(path)]))
    return data.get('packets', [])


def mask_for(frame, cid, n):
    """Return no mask when target identity/size/location is uncertain."""
    assert cid in POLICIES and frame.shape == (H, W, 3)
    policy = POLICIES[cid]
    empty = np.zeros((H, W), np.float32)
    record = {'frame': n, 'accepted': False, 'reason': None, 'bounds': None}

    def skip(reason):
        record['reason'] = reason
        return empty, record

    if n < policy['first_frame']:
        return skip('before_interior_time_gate')
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    # C04 must have actually left the exterior. This is additional to time+ROI.
    if cid == 'C04' and float((gray[int(H * .55):] > 175).mean()) > .025:
        return skip('bright_exterior_still_visible')
    binary = (cv2.GaussianBlur(gray, (5, 5), 0) > 185).astype(np.uint8) * 255
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    x0, y0, x1, y1 = policy['roi']
    roi = [round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H)]
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 150:
            continue
        x, y, w, h = cv2.boundingRect(contour)
        if x < roi[0] or y < roi[1] or x + w > roi[2] or y + h > roi[3]:
            continue
        candidates.append((area, contour, (x, y, w, h)))
    if not candidates:
        return skip('no_target_inside_fixed_roi')
    candidates.sort(key=lambda x: x[0], reverse=True)
    area, contour, bounds = candidates[0]
    x, y, w, h = bounds
    record['bounds'] = list(bounds)
    # Never choose between similarly sized glowing panels. A second panel is QA.
    if len(candidates) > 1 and candidates[1][0] > max(150, area * .08):
        return skip('ambiguous_multiple_surfaces')
    if w < 64 or h < 24 or area < 1000:
        return skip('surface_too_small_for_protected_fog')
    if not 1.5 <= w / h <= 12 or area / (W * H) > policy['max_area']:
        return skip('unexpected_surface_shape_or_size')
    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)
    if hull_area <= 0 or area / hull_area < .72 or hull_area / (w * h) < .65:
        return skip('fragmented_or_non_screen_shape')
    # Do not fill the convex hull through dark people, cases or physical rim.
    mask = np.zeros((H, W), np.uint8)
    cv2.fillConvexPoly(mask, hull, 255)
    dark = cv2.dilate((gray < 145).astype(np.uint8), np.ones((9, 9), np.uint8))
    mask[dark > 0] = 0
    distance = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    edge_guard = min(8, max(2, h * .04))
    feather = min(18, max(3, h * .06))
    alpha = np.clip((distance - edge_guard) / feather, 0, 1).astype(np.float32)
    alpha = alpha * alpha * (3 - 2 * alpha)
    # Stray white foreground outside the tracked hull cannot receive a mask.
    if int((alpha > 0).sum()) < 400:
        return skip('insufficient_safe_interior')
    record.update(accepted=True, reason='single_surface_with_protected_rim',
                  area=area, edge_guard=edge_guard, feather=feather,
                  safe_pixels=int((alpha > 0).sum()))
    return alpha, record


def all_masks(source, cid):
    cap = cv2.VideoCapture(str(source))
    assert cap.isOpened()
    previous, streak, rows = None, 0, []
    try:
        for n in range(N):
            ok, frame = cap.read()
            assert ok, f'Missing source frame {n}'
            alpha, row = mask_for(frame, cid, n)
            if row['accepted']:
                x, y, w, h = row['bounds']
                current = np.array([x + w / 2, y + h / 2, w, h], dtype=float)
                stable = previous is None or (
                    np.linalg.norm(current[:2] - previous[:2]) < 20 and
                    np.all(np.abs(current[2:] - previous[2:]) / previous[2:] < .18))
                streak = streak + 1 if stable else 1
                previous = current
                if streak < 3:
                    alpha[:] = 0
                    row.update(accepted=False, reason='waiting_three_stable_frames')
                else:
                    # Conservative short fade-in on first reliable detection.
                    alpha *= min(1., (streak - 2) / 6.)
            else:
                previous, streak = None, 0
            row['mask_sha256'] = hashlib.sha256(alpha.tobytes()).hexdigest()
            row['editable_pixels'] = int((alpha > 0).sum())
            rows.append(row)
            yield n, frame, alpha, row
        ok, _ = cap.read()
        assert not ok, 'Unexpected extra source frame'
    finally:
        cap.release()


def compose(src, fog, alpha, bounds):
    """Same blend math as approved composite.py; ONLY new layer is resized."""
    if not np.any(alpha):
        return src.copy()
    x, y, w, h = bounds
    gray = cv2.cvtColor(fog, cv2.COLOR_BGR2GRAY).astype(np.float32)
    gray = cv2.GaussianBlur(gray, (0, 0), 2.0)
    gray = (gray - float(gray.mean())) / max(float(gray.std()), 2.0)
    layer = cv2.resize(np.clip(gray, -2.4, 2.4), (w, h), interpolation=cv2.INTER_LINEAR)
    local = src[y:y+h, x:x+w].astype(np.float32)
    weight = (alpha[y:y+h, x:x+w] > 0).astype(np.float32)
    sigma = max(4, h * .09)
    denominator = cv2.GaussianBlur(weight, (0, 0), sigma)
    illumination = cv2.GaussianBlur(local * weight[:, :, None], (0, 0), sigma) / np.maximum(denominator[:, :, None], 1e-5)
    grain = local - cv2.GaussianBlur(local, (0, 0), 1.0)
    target = np.clip(illumination + layer[:, :, None] * 14.0 + grain * .35, 0, 255)
    a = alpha[y:y+h, x:x+w] * .9
    result = src.copy()
    region = result[y:y+h, x:x+w]
    inside = a > 0
    region[inside] = np.clip(np.rint(local[inside] * (1-a[inside, None]) + target[inside] * a[inside, None]), 0, 255).astype(np.uint8)
    assert np.array_equal(result[alpha == 0], src[alpha == 0])
    return result


def provenance(source, cid):
    return dict(id=cid, source=str(source), source_sha256=sha(source),
                fog_plate=str(PLATE), fog_plate_sha256=sha(PLATE),
                approved_composite_sha256=sha(APPROVED / 'composite.py'),
                script_sha256=sha(__file__), algorithm=ALGORITHM,
                policy=POLICIES[cid], video=probe(source))


def audit(source, cid):
    record = provenance(source, cid)
    folder = RUN / 'qa/B' / f'{cid}-mask-audit'
    folder.mkdir(parents=True, exist_ok=False)
    rows, sheet = [], None
    for n, frame, alpha, row in all_masks(source, cid):
        rows.append(row)
        # Every frame gets an inspectable overlay; source files are untouched.
        overlay = frame.copy()
        active = alpha > 0
        overlay[active] = (frame[active].astype(float) * .45 + np.array([20, 220, 20]) * .55).astype(np.uint8)
        thumb = cv2.resize(overlay, (480, 270))
        cv2.putText(thumb, f'{cid} n={n} {row["reason"]}', (6, 18), cv2.FONT_HERSHEY_SIMPLEX, .38, (255, 255, 255), 1)
        if n % 20 == 0:
            sheet = np.zeros((1500, 1920, 3), np.uint8)
        x, y = (n % 4) * 480, ((n % 20) // 4) * 300
        sheet[y:y+270, x:x+480] = thumb
        if n % 20 == 19 or n == N-1:
            cv2.imwrite(str(folder / f'overlay-{n//20+1}.jpg'), sheet)
    record.update(mode='mask_audit_only', frames=rows,
                  applied_frames=sum(x['accepted'] for x in rows),
                  reasons=dict(collections.Counter(x['reason'] for x in rows)),
                  visual_mask_review_required=True, source_coordinate_displacement=0)
    target = folder / 'audit.json'
    write_json(target, record)
    print(json.dumps({'audit': str(target), 'audit_sha256': sha(target), 'applied_frames': record['applied_frames'], 'reasons': record['reasons']}))


def render(source, cid, audit_path, audit_hash):
    assert audit_path.resolve().is_relative_to(RUN / 'qa/B')
    assert sha(audit_path) == audit_hash, 'Audit file hash changed'
    reviewed = json.loads(audit_path.read_text())
    record = provenance(source, cid)
    for key in ['id', 'source_sha256', 'fog_plate_sha256', 'script_sha256', 'policy']:
        assert reviewed[key] == record[key], f'Audit binding changed: {key}'
    folder = RUN / 'processed' / cid
    folder.mkdir(parents=True, exist_ok=False)
    master, out = folder / f'{cid}.nut', folder / f'{cid}.mp4'
    if reviewed['applied_frames'] == 0:
        # A genuinely tiny point is safer left byte-identical, not reencoded.
        shutil.copy2(source, out)
        assert sha(out) == record['source_sha256']
        record.update(mode='all_frames_skipped_byte_exact_copy', output=str(out),
                      output_sha256=sha(out), lossless_master=None,
                      frames=reviewed['frames'], audit_sha256=audit_hash,
                      source_image_remapping=False, source_camera_or_timing_changed=False,
                      audio_packets_and_timestamps_identical=True,
                      outside_mask_pixels_changed_before_encoding=0)
        write_json(folder / 'validation.json', record)
        print(json.dumps({'output': str(out), 'sha256': record['output_sha256'],
                          'all_frames_skipped': True}))
        return
    probe(PLATE)
    fogcap = cv2.VideoCapture(str(PLATE))
    encoder = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-n', '-f', 'rawvideo', '-pix_fmt', 'bgr24',
        '-s', f'{W}x{H}', '-r', '24', '-i', 'pipe:0', '-an', '-c:v', 'ffv1',
        '-level', '3', '-coder', '1', '-context', '1', '-g', '1', '-threads', '2',
        '-pix_fmt', 'bgr0', '-f', 'nut', str(master)], stdin=subprocess.PIPE)
    rows = []
    try:
        for n, src, alpha, row in all_masks(source, cid):
            assert row == reviewed['frames'][n], f'Mask differs from audit at {n}'
            ok, fog = fogcap.read()
            assert ok
            result = compose(src, fog, alpha, row['bounds'])
            delta = np.abs(result.astype(np.int16)-src.astype(np.int16))
            assert not np.any(delta[alpha == 0])
            rows.append(dict(row, changed_pixels=int(np.any(delta, axis=2).sum()),
                             outside_mask_max_difference=0, source_coordinate_displacement=0))
            encoder.stdin.write(result.tobytes())
        encoder.stdin.close()
        assert encoder.wait() == 0
    except BaseException:
        encoder.kill()
        encoder.wait()
        raise
    finally:
        fogcap.release()
    subprocess.run([
        'ffmpeg', '-v', 'error', '-n', '-i', str(master), '-i', str(source),
        '-map', '0:v:0', '-map', '1:a:0?', '-c:v', 'libx264', '-preset', 'fast',
        '-crf', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '24',
        '-g', '6', '-keyint_min', '6', '-sc_threshold', '0',
        '-video_track_timescale', '12288', '-threads', '2', '-c:a', 'copy',
        '-avoid_negative_ts', 'disabled', '-movflags', '+faststart', str(out)], check=True)
    assert packets(source) == packets(out), 'Source audio packets/timestamps changed'
    assert sha(source) == record['source_sha256'], 'Source changed during render'
    record.update(mode='rendered_pending_visual_qa', output=str(out), output_sha256=sha(out),
                  lossless_master=str(master), video=probe(out), frames=rows,
                  audio_packets_and_timestamps_identical=True, source_image_remapping=False,
                  source_camera_or_timing_changed=False, outside_mask_pixels_changed_before_encoding=0,
                  audit_sha256=audit_hash,
                  mp4_compression_note='H264 compression may change exterior pixels. The lossless master preserves exterior source pixels exactly before encoding.')
    write_json(folder / 'validation.json', record)
    print(json.dumps({'output': str(out), 'sha256': record['output_sha256']}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--clip', choices=sorted(POLICIES), required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--render', action='store_true', help='Only after root instruction and visual mask audit')
    parser.add_argument('--audit', type=Path)
    parser.add_argument('--audit-sha256')
    args = parser.parse_args()
    cv2.setNumThreads(2)
    source = args.source.resolve(strict=True)
    assert source.stem == args.clip, 'Clip/source ID mismatch'
    assert source.parent != APPROVED / 'clips', 'Approved source clips cannot be processed here'
    if args.render:
        assert args.audit and args.audit_sha256, '--render requires reviewed audit path+hash'
        render(source, args.clip, args.audit, args.audit_sha256)
    else:
        audit(source, args.clip)


if __name__ == '__main__':
    main()
