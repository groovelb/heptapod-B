"""C07-only reverse plate, full protected alpha from frame0; preserve prior render."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import cv2
import numpy as np
import screen_fog as f
from render_screen_fog import probe_with_approved_plate


AUDIT_HASH = '4bbee40064a1f825d7f37db6baa496404aa15378f7462c4b0062d57e91868cb3'


def main():
    assert sys.argv[1:] == ['--render'], 'Explicit --render required'
    cv2.setNumThreads(2)
    source = f.RUN / 'clips/C07.mp4'
    audit_path = f.RUN / 'qa/B/C07-mask-audit/audit.json'
    assert f.sha(audit_path) == AUDIT_HASH
    audit = json.loads(audit_path.read_text())
    record = f.provenance(source, 'C07')
    for key in ['source_sha256', 'fog_plate_sha256', 'script_sha256', 'policy']:
        assert record[key] == audit[key], key
    protected = [f.APPROVED/'clips/C06.mp4', f.APPROVED/'clips/C08.mp4',
                 f.RUN/'processed/C07/C07.mp4']
    protected_hashes = {str(p): f.sha(p) for p in protected}
    probe_with_approved_plate(f.PLATE)
    # Establish ground-truth decoded frame hashes forward before reverse seeks.
    fog_cap = cv2.VideoCapture(str(f.PLATE))
    frame_hashes = []
    for n in range(f.N):
        ok, fog = fog_cap.read()
        assert ok
        frame_hashes.append(hashlib.sha256(fog.tobytes()).hexdigest())
    ok, _ = fog_cap.read()
    assert not ok
    folder = f.RUN / 'processed/C07-continuous'
    folder.mkdir(parents=True, exist_ok=False)
    master, output = folder/'C07.nut', folder/'C07.mp4'
    encoder = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-n', '-f', 'rawvideo', '-pix_fmt', 'bgr24',
        '-s', '1920x1080', '-r', '24', '-i', 'pipe:0', '-an', '-c:v', 'ffv1',
        '-level', '3', '-coder', '1', '-context', '1', '-g', '1', '-threads', '2',
        '-pix_fmt', 'bgr0', '-f', 'nut', str(master)], stdin=subprocess.PIPE)
    cap = cv2.VideoCapture(str(source))
    rows = []
    try:
        for n in range(f.N):
            ok, src = cap.read()
            assert ok
            alpha, row = f.mask_for(src, 'C07', n)
            assert row['accepted'], f'Raw mask not accepted at {n}'
            assert row['bounds'] == audit['frames'][n]['bounds']
            # All masks were spatially reviewed; n0/n1 were only stability skips.
            if n < 2:
                assert audit['frames'][n]['reason'] == 'waiting_three_stable_frames'
            else:
                assert int((alpha > 0).sum()) == audit['frames'][n]['editable_pixels']
            index = 144-n
            assert fog_cap.set(cv2.CAP_PROP_POS_FRAMES, index)
            ok, fog = fog_cap.read()
            assert ok and hashlib.sha256(fog.tobytes()).hexdigest() == frame_hashes[index]
            result = f.compose(src, fog, alpha, row['bounds'])
            delta = np.abs(result.astype(np.int16)-src.astype(np.int16))
            assert not np.any(delta[alpha == 0])
            rows.append(dict(row, plate_frame=index,
                             plate_decoded_frame_sha256=frame_hashes[index],
                             alpha_temporal_multiplier=1,
                             changed_pixels=int(np.any(delta, axis=2).sum()),
                             outside_mask_max_difference=0, source_coordinate_displacement=0))
            encoder.stdin.write(result.tobytes())
        assert not cap.read()[0]
        encoder.stdin.close()
        assert encoder.wait() == 0
    except BaseException:
        encoder.kill()
        encoder.wait()
        raise
    finally:
        cap.release()
        fog_cap.release()
    subprocess.run([
        'ffmpeg', '-v', 'error', '-n', '-i', str(master), '-i', str(source),
        '-map', '0:v:0', '-map', '1:a:0?', '-c:v', 'libx264', '-preset', 'fast',
        '-crf', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '24',
        '-g', '6', '-keyint_min', '6', '-sc_threshold', '0',
        '-video_track_timescale', '12288', '-threads', '2', '-c:a', 'copy',
        '-avoid_negative_ts', 'disabled', '-movflags', '+faststart', str(output)], check=True)
    assert f.packets(source) == f.packets(output)
    assert f.sha(source) == audit['source_sha256']
    assert all(f.sha(p) == digest for p, digest in protected_hashes.items())
    record.update(output=str(output), output_sha256=f.sha(output), video=f.probe(output),
                  lossless_master=str(master), frames=rows, mode='continuous_reverse_plate',
                  render_script=str(Path(__file__).resolve()), render_script_sha256=f.sha(__file__),
                  audit_path=str(audit_path), audit_sha256=AUDIT_HASH,
                  approved_mask_exception='n0/n1 raw mask geometry reviewed in C07-continuous-start-masks.jpg; remove only temporal acquisition skip/ramp. All spatial protection unchanged.',
                  temporal_plate_mapping={'C06_unchanged':'plate[n] for clip frames0..144',
                                          'C07_new':'plate[144-n] for clip frames0..144',
                                          'C08_unchanged':'plate[n] for clip frames0..144',
                                          'clip_boundary_frames':'C06 n144/plate144 -> C07 n0/plate144; C07 n144/plate0 -> C08 n0/plate0',
                                          'assembly_excludes_first_frame':'Actual seams: C06 n144/plate144 -> C07 n1/plate143; C07 n144/plate0 -> C08 n1/plate1'},
                  original_blending_math_unchanged=True, alpha_temporal_multiplier=1,
                  source_image_remapping=False, source_camera_or_timing_changed=False,
                  outside_mask_pixels_changed_before_encoding=0,
                  audio_packets_and_timestamps_identical=True,
                  protected_inputs_unchanged=protected_hashes,
                  mp4_compression_note='Delivery H264 can change exterior pixels through compression; pre-encoding lossless master preserves mask-exterior source pixels exactly.',
                  visual_review_pending=True)
    f.write_json(folder/'validation.json', record)
    print(json.dumps({'output': str(output), 'sha256': record['output_sha256']}))


if __name__ == '__main__':
    main()
