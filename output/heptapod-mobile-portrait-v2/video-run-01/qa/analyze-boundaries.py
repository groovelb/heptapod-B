"""Read-only native mobile boundary observations, not an automatic visual gate.

Run with /tmp/heptapod-local-video-venv/bin/python -s (numpy + cv2).
Default: wait until all eight clips exist. --available observes ready adjacent
pairs only. Outputs go into a NEW qa/boundaries/<UTC timestamp>/ directory.
No source editing, alignment, color correction, resizing of metric inputs,
interpolation, browser, network request, or paid generation occurs.
1080x1916 and 1080x1920 pairs compare their center overlap, explicitly recording
the omitted two rows at each edge of the taller metric input; PNGs stay native.
"""
import argparse
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import subprocess
import sys

RUN = Path(__file__).resolve().parents[1]
IDS = [f'C{i:02}' for i in range(1, 9)]
COUNTS = dict(zip(IDS, [97, 193, 121, 145, 145, 145, 145, 145]))
COMMANDS = []


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(path):
    value = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()


def read(path):
    return json.loads(path.read_text())


def run(command):
    command = list(map(str, command))
    COMMANDS.append(command)
    result = subprocess.run(command, capture_output=True, text=True)
    require(result.returncode == 0, f'{command[0]} failed:\n{result.stderr[-5000:]}')
    return result.stdout


def probe(path, count):
    data = json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
                          '-count_frames', '-show_streams', '-show_frames',
                          '-show_entries', 'frame=best_effort_timestamp', '-of', 'json', path]))
    require(len(data.get('streams', [])) == 1, f'{path}: no unique video stream')
    video = data['streams'][0]
    require(int(video.get('nb_read_frames', -1)) == count,
            f'{path}: decoded {video.get("nb_read_frames")} frames, expected {count}; wait for a complete valid file')
    for field in ('r_frame_rate', 'avg_frame_rate'):
        require(Fraction(video[field]) == 24, f'{path}: {field} is not 24fps; no retiming permitted')
    times = [Fraction(v['best_effort_timestamp']) * Fraction(video['time_base']) for v in data['frames']]
    require(len(times) == count and all(b-a == Fraction(1, 24) for a, b in zip(times, times[1:])),
            f'{path}: incomplete or nonuniform 24fps cadence')
    require(video['width'] < video['height'], f'{path}: not a native portrait clip')
    require(not any(v.get('rotation', 0) for v in video.get('side_data_list', [])), f'{path}: unexpected rotation metadata')
    return video


def local_path(value):
    path = Path(value)
    return path if path.is_absolute() else RUN / path


def file_reference(value, expected=None):
    if not value:
        return None
    path = local_path(value)
    exists = path.is_file()
    actual = sha(path) if exists else None
    return {'path': str(path), 'exists': exists, 'expected_sha256': expected,
            'actual_sha256': actual, 'hash_matches': actual == expected if expected and exists else None}


def boundary_provenance(spec, edge, state):
    value = spec.get(edge)
    if not isinstance(value, dict):
        return {'status': 'missing_in_specs', 'edge': edge}
    result = {'status': 'recorded', 'edge': edge, 'id': value.get('id'),
              'image': file_reference(value.get('path'), value.get('sha256')),
              'source_frame': value.get('source_frame'),
              'source_video': file_reference(value.get('source_video'), value.get('source_video_sha256')),
              'keyframe_anchor': value.get('keyframe_anchor'),
              'submitted_image_url': state.get('input', {}).get(f'{edge}_image_url')}
    upload_path = RUN / 'uploads' / f'{value.get("sha256")}.json'
    if upload_path.is_file():
        upload = read(upload_path)
        result['upload_receipt'] = {'path': str(upload_path), 'sha256': sha(upload_path), 'url': upload.get('url')}
        result['submitted_url_matches_upload_receipt'] = result['submitted_image_url'] == upload.get('url') if result['submitted_image_url'] else None
    else:
        result['upload_receipt'] = None
        result['submitted_url_matches_upload_receipt'] = None
    return result


def clip_provenance(identifier, spec, clip_hash):
    state_path = RUN / 'states' / f'{identifier}.json'
    state = read(state_path) if state_path.is_file() else {}
    # The current queue contract uses JSON.stringify(spec). This compact JSON
    # matches the current string/integer/finite-decimal schema and preserves order.
    compact_hash = hashlib.sha256(json.dumps(spec, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest() if spec else None
    expected_contract = state.get('contract_sha256')
    return {'spec_pointer': f'/clips/{IDS.index(identifier)}', 'request_id': state.get('request_id'),
            'state': file_reference(str(state_path)), 'state_status': state.get('status'),
            'output_matches_state_hash': clip_hash == state.get('output_sha256') if state.get('output_sha256') else None,
            'expected_contract_sha256': expected_contract, 'current_spec_compact_sha256': compact_hash,
            'current_spec_matches_request_contract': compact_hash == expected_contract if expected_contract and compact_hash else None,
            'start': boundary_provenance(spec, 'start', state),
            'end': boundary_provenance(spec, 'end', state),
            'prompt_lineage_only_pc_path': spec.get('source_pc'),
            'pc_video_frames_read': False}


def extract(path, identifier, count, folder):
    target = folder / identifier
    target.mkdir()
    indices = [0, 1, count-2, count-1]
    expression = '+'.join(f'eq(n\\,{n})' for n in indices)
    run(['ffmpeg', '-hide_banner', '-v', 'error', '-n', '-noautorotate', '-threads', '2',
         '-i', path, '-map', '0:v:0', '-an', '-sn', '-vf', f'select={expression}',
         '-fps_mode', 'passthrough', '-frames:v', '4', '-pix_fmt', 'rgb24',
         '-threads', '2', target / '.extract-%02d.png'])
    result = {}
    for sequence, index in enumerate(indices, 1):
        temporary = target / f'.extract-{sequence:02}.png'
        output = target / f'frame-{index:03}.png'
        require(temporary.is_file(), f'{identifier}: extraction did not return frame {index}')
        temporary.rename(output)
        result[index] = {'frame': index, 'path': str(output), 'sha256': sha(output)}
    return result


def metrics(a, b, cv2, np):
    require(a.shape[1] == b.shape[1], 'Native widths differ; refusing metric-time resize')
    require(a.shape[0] == b.shape[0] or set((a.shape[0], b.shape[0])) == {1916, 1920},
            'Only the explicitly documented 1916/1920 native height difference can use center overlap')
    h = min(a.shape[0], b.shape[0])
    a_top, b_top = (a.shape[0]-h)//2, (b.shape[0]-h)//2
    region = {'a_native_dimensions': [a.shape[1], a.shape[0]], 'b_native_dimensions': [b.shape[1], b.shape[0]],
              'compared_dimensions': [a.shape[1], h], 'native_height_difference_px': abs(a.shape[0]-b.shape[0]),
              'a_metric_excluded_rows': {'top': a_top, 'bottom': a.shape[0]-h-a_top},
              'b_metric_excluded_rows': {'top': b_top, 'bottom': b.shape[0]-h-b_top},
              'method': 'native central overlap; no resize or asset crop', 'saved_pngs_unchanged': True}
    a, b = a[a_top:a_top+h], b[b_top:b_top+h]
    # cv2 decodes the lossless ffmpeg RGB PNG as BGR; report channel order RGB.
    aa, bb = a[:, :, ::-1].astype(np.float64), b[:, :, ::-1].astype(np.float64)
    delta = np.abs(bb-aa)
    weights = np.array([.2126, .7152, .0722])
    ya, yb = aa @ weights, bb @ weights
    mu_a = cv2.GaussianBlur(ya, (11, 11), 1.5)
    mu_b = cv2.GaussianBlur(yb, (11, 11), 1.5)
    var_a = np.maximum(0, cv2.GaussianBlur(ya*ya, (11, 11), 1.5)-mu_a*mu_a)
    var_b = np.maximum(0, cv2.GaussianBlur(yb*yb, (11, 11), 1.5)-mu_b*mu_b)
    covariance = cv2.GaussianBlur(ya*yb, (11, 11), 1.5)-mu_a*mu_b
    c1, c2 = (.01*255)**2, (.03*255)**2
    score = ((2*mu_a*mu_b+c1)*(2*covariance+c2))/((mu_a*mu_a+mu_b*mu_b+c1)*(var_a+var_b+c2))
    brightness_delta = float(yb.mean()-ya.mean())
    return {'comparison_region': region, 'rgb_mae_0_255': float(delta.mean()), 'rgb_mae_normalized': float(delta.mean()/255),
            'rgb_channel_mae': delta.mean(axis=(0, 1)).tolist(),
            'ssim_luma': float(score[5:-5, 5:-5].mean()),
            'mean_brightness_a_0_255': float(ya.mean()), 'mean_brightness_b_0_255': float(yb.mean()),
            'mean_brightness_delta_b_minus_a': brightness_delta,
            'mean_brightness_delta_absolute': abs(brightness_delta),
            'luma_mae_0_255': float(np.abs(yb-ya).mean())}


def contact(images, labels, path, cv2, np):
    tile_w, tile_h, header = 300, 540, 56
    canvas = np.full((tile_h+header, tile_w*len(images), 3), 18, np.uint8)
    for i, (im, label) in enumerate(zip(images, labels)):
        ratio = min(tile_w/im.shape[1], tile_h/im.shape[0])
        w, h = round(im.shape[1]*ratio), round(im.shape[0]*ratio)
        thumb = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)
        x, y = i*tile_w+(tile_w-w)//2, header+(tile_h-h)//2
        canvas[y:y+h, x:x+w] = thumb
        cv2.putText(canvas, label, (i*tile_w+8, 24), cv2.FONT_HERSHEY_SIMPLEX, .43, (230, 230, 230), 1, cv2.LINE_AA)
        cv2.putText(canvas, f'native {im.shape[1]} x {im.shape[0]} (contain)', (i*tile_w+8, 45), cv2.FONT_HERSHEY_SIMPLEX, .38, (170, 175, 185), 1, cv2.LINE_AA)
    require(cv2.imwrite(str(path), canvas, [cv2.IMWRITE_JPEG_QUALITY, 93]), f'Cannot save {path}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--available', action='store_true', help='Observe completed adjacent pairs even while other clips are missing')
    parser.add_argument('--output-dir', type=Path, help='New directory under this run/qa/; existing paths are never overwritten')
    args = parser.parse_args()
    paths = {identifier: RUN/'clips'/f'{identifier}.mp4' for identifier in IDS}
    missing = [identifier for identifier, path in paths.items() if not path.is_file()]
    pairs = [(a, b) for a, b in zip(IDS, IDS[1:]) if a not in missing and b not in missing]
    if (missing and not args.available) or not pairs:
        print(json.dumps({'status': 'waiting', 'missing_clips': missing,
                          'available_pairs': [f'{a}-{b}' for a, b in pairs],
                          'note': 'No source changed or evidence directory created. Use --available for ready adjacent pairs.'}, indent=2))
        return 2
    try:
        import cv2
        import numpy as np
    except ImportError as error:
        raise RuntimeError('Use /tmp/heptapod-local-video-venv/bin/python -s; this script needs cv2 and numpy') from error
    cv2.setNumThreads(2)
    used = sorted(set(identifier for pair in pairs for identifier in pair))
    specs_path = RUN/'specs.json'
    require(specs_path.is_file(), f'Missing input-boundary provenance specs: {specs_path}')
    specs_hash = sha(specs_path)
    specs = {item['id']: item for item in read(specs_path).get('clips', [])}
    records, dimensions = {}, None
    for identifier in used:
        path = paths[identifier]
        require(path.resolve().is_relative_to(RUN), f'{identifier}: clip points outside this mobile run')
        video = probe(path, COUNTS[identifier])
        shape = (video['width'], video['height'])
        if dimensions is None:
            dimensions = shape
        require(shape[0] == dimensions[0] and (shape == dimensions or (shape[0] == 1080 and {shape[1], dimensions[1]} == {1916, 1920})),
                f'{identifier}: {shape} differs beyond the documented 4px height variation; no resize permitted')
        clip_hash = sha(path)
        records[identifier] = {'path': str(path), 'sha256': clip_hash, 'video': video,
                               'provenance': clip_provenance(identifier, specs.get(identifier, {}), clip_hash)}
    output = args.output_dir or RUN/'qa'/'boundaries'/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
    output = output.resolve()
    require(output.is_relative_to((RUN/'qa').resolve()), 'Evidence output must be inside this mobile run/qa/')
    require(not output.exists(), f'Preserve existing evidence; choose a new output directory: {output}')
    output.mkdir(parents=True)
    extracted, decoded = {}, {}
    for identifier in used:
        extracted[identifier] = extract(paths[identifier], identifier, COUNTS[identifier], output)
        decoded[identifier] = {}
        for index, item in extracted[identifier].items():
            image = cv2.imread(item['path'], cv2.IMREAD_COLOR)
            native = records[identifier]['video']
            require(image is not None and (image.shape[1], image.shape[0]) == (native['width'], native['height']),
                    f'{identifier} frame {index}: PNG native dimensions changed')
            decoded[identifier][index] = image
    boundaries = []
    for previous, following in pairs:
        last = COUNTS[previous]-1
        cut = sum(COUNTS[IDS[j]]-int(j > 0) for j in range(IDS.index(previous)+1))
        a, b, c = decoded[previous][last], decoded[following][0], decoded[following][1]
        jpg = output/f'{previous}-{following}-contact.jpg'
        contact([a, b, c], [f'{previous} f{last} (last)', f'{following} f0 (reference)', f'{following} f1 (assembly)'], jpg, cv2, np)
        boundaries.append({'id': f'{previous}-{following}', 'manual_review_required': True,
                           'visual_verdict': 'not_reviewed', 'contact_sheet': str(jpg),
                           'assembled_previous_frame': cut-1, 'assembled_next_frame': cut,
                           'assembled_cut_time_seconds': cut/24,
                           'previous_last': extracted[previous][last],
                           'next_first': extracted[following][0], 'next_second_actual_assembly': extracted[following][1],
                           'last_to_first': metrics(a, b, cv2, np),
                           'actual_assembly_last_to_second': metrics(a, c, cv2, np),
                           'within_previous_penultimate_to_last': metrics(decoded[previous][last-1], a, cv2, np),
                           'within_next_first_to_second': metrics(b, c, cv2, np),
                           'input_boundary_provenance': {'previous_end': records[previous]['provenance']['end'],
                                                         'next_start': records[following]['provenance']['start']}})
        print(f'Observed {previous}->{following}; manual inspection still required', flush=True)
    require(sha(specs_path) == specs_hash, 'specs.json changed during observation; evidence is stale, rerun after binding completes')
    require(all(sha(paths[k]) == record['sha256'] for k, record in records.items()),
            'A clip changed during observation; do not use this evidence, rerun after completion')
    provenance_warnings = []
    for identifier, record in records.items():
        provenance = record['provenance']
        for field in ('output_matches_state_hash', 'current_spec_matches_request_contract'):
            if provenance[field] is False:
                provenance_warnings.append(f'{identifier}: {field}=false')
        for edge in ('start', 'end'):
            boundary = provenance[edge]
            if boundary.get('status') == 'missing_in_specs':
                provenance_warnings.append(f'{identifier} {edge}: missing in specs')
            if boundary.get('submitted_url_matches_upload_receipt') is False:
                provenance_warnings.append(f'{identifier} {edge}: submitted URL differs from image upload receipt')
            for field in ('image', 'source_video'):
                reference = boundary.get(field)
                if reference and (not reference['exists'] or reference['hash_matches'] is False):
                    provenance_warnings.append(f'{identifier} {edge} {field}: missing or hash mismatch')
    report = {'status': 'observed_all_boundaries' if len(pairs) == 7 else 'partial_observation',
              'manual_review_required': True, 'visual_verdict': 'not_reviewed',
              'missing_clips': missing, 'native_dimensions_by_clip': {k: [v['video']['width'], v['video']['height']] for k, v in records.items()},
              'assembly_padding_for_1080x1920': {'explicit_option': '--pad-native-height 1920',
                                                'needed_by_observed_inputs': any(v['video']['height'] == 1916 for v in records.values()),
                                                'default_assembler_remains_strict': True,
                                                'this_qa_script_applies_padding': False,
                                                'rule': '1080x1916 only: add2 black rows above and2 below. 1080x1920: no padding.'},
              'expected_dimensions_advisory': [1080, 1916], 'fps': 24,
              'specs': {'path': str(specs_path), 'sha256': specs_hash},
              'provenance_warnings': provenance_warnings,
              'metric_definition': {'input': 'ffmpeg native-size RGB24 lossless PNG; unequal1916/1920 heights use only their center overlap for metrics, explicitly excluding2+2 rows of the taller input; saved PNGs remain full-size',
                                    'mae': 'Mean absolute difference across RGB values in [0,255]',
                                    'brightness': '0.2126 R + 0.7152 G + 0.0722 B on gamma-coded RGB; luma proxy, not linear luminance',
                                    'ssim': 'Native-resolution luma proxy; Gaussian11x11 sigma1.5, K1=.01 K2=.03, data_range255, population covariance, discard5px border'},
              'interpretation': ['No metric threshold constitutes visual acceptance.',
                                 'Physical movement, natural occlusion and normal hard cuts may increase MAE or lower SSIM.',
                                 'A similar mean brightness or high SSIM does not rule out person replacement or local geometry jumps.',
                                 'Compare the actual last-to-frame1 assembly seam with both natural neighboring-frame baselines.',
                                 'Hash or submitted-URL mismatches in provenance must be reconciled independently.'],
              'clips': records, 'boundaries': boundaries, 'commands': COMMANDS,
              'source_video_files_modified': False, 'pc_video_frames_used': False}
    report_path = output/'report.json'
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(f'OBSERVATIONS: {report_path}')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f'FAILED: {error}', file=sys.stderr, flush=True)
        raise SystemExit(1)
