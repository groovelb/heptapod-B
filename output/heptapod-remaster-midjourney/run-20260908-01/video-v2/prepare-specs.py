"""Build immutable original-prompt video specs after 24 Vary > Subtle selections verify.

No network calls. --check validates inputs without writing the specs.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
RUN = HERE.parent
WORKSPACE = RUN.parents[2]
ORIGINAL = WORKSPACE / 'docs/heptapod-b-encoder/remaster/still-remaster-manifest.json'
MODEL = 'fal-ai/kling-video/v3/pro/image-to-video'
FRAME_IDS = [f'F{n:02}-{part}' for n in range(1, 9) for part in ('IN', 'MID', 'OUT')]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text())


def verify_downloads():
    """Verify selected Vary > Subtle candidates against real job/download lineage."""
    selected_path = RUN / 'variation/selected-manifest.json'
    selection = read(selected_path)
    if selection.get('status') != 'selected':
        raise ValueError('Vary > Subtle selection is incomplete: variation/selected-manifest.json status must be selected')
    selected_frames = selection.get('frames', [])
    if len(selected_frames) != 24 or {f['id'] for f in selected_frames} != set(FRAME_IDS):
        raise ValueError('Vary > Subtle selection must contain exactly all 24 expected frames')
    by_id = {f['id']: f for f in selected_frames}
    parent_selection = read(RUN / 'selected-manifest.json')
    parents = {f['id']: f for f in parent_selection['frames']}
    verified = {}
    problems = []
    for frame_id in FRAME_IDS:
        receipt_path = RUN / 'variation/downloads' / f'{frame_id}.json'
        job_path = RUN / 'variation/jobs' / f'{frame_id}.json'
        try:
            receipt, job, selected = read(receipt_path), read(job_path), by_id[frame_id]
            if receipt['frame'] != frame_id or job['id'] != frame_id:
                raise ValueError('Receipt/frame ID mismatch')
            if job['status'] != 'confirmed' or job.get('requested_action') != 'Vary > Subtle':
                raise ValueError('No confirmed Vary > Subtle job')
            if receipt['job_id'] != job['job_id'] or selected['job_id'] != job['job_id']:
                raise ValueError('Variation selected/job/download IDs differ')
            parent = parents[frame_id]
            if job['source_job_id'] != parent['job_id'] or job['selected_index'] != parent['selected_index']:
                raise ValueError('Variation was not generated from the selected original candidate')
            files = receipt['files']
            if len(files) != 4 or {f['index'] for f in files} != {0, 1, 2, 3}:
                raise ValueError('Variation receipt must contain all four candidates')
            matches = [f for f in files if f['index'] == selected['selected_index']]
            if len(matches) != 1 or matches[0]['sha256'] != selected['sha256']:
                raise ValueError('Selected variation hash/index not in actual download receipt')
            downloaded = matches[0]
            image_path = Path(selected['path'])
            if not image_path.is_absolute():
                image_path = WORKSPACE / image_path
            image_path = image_path.resolve(strict=True)
            image_path.relative_to((RUN / 'variation').resolve())
            downloaded_path = Path(downloaded['path'])
            if not downloaded_path.is_absolute():
                downloaded_path = WORKSPACE / downloaded_path
            downloaded_path = downloaded_path.resolve(strict=True)
            downloaded_path.relative_to((RUN / 'variation/stills').resolve())
            if digest(image_path) != selected['sha256'] or digest(downloaded_path) != selected['sha256']:
                raise ValueError('Selected/downloaded image SHA256 mismatch')
            with Image.open(image_path) as image:
                dimensions = list(image.size)
                mime = {'JPEG': 'image/jpeg', 'PNG': 'image/png'}[image.format]
                image.verify()
            if dimensions != [downloaded['width'], downloaded['height']] or min(dimensions) < 1:
                raise ValueError('Actual image dimensions differ from receipt')
            if image_path.stat().st_size != downloaded['bytes']:
                raise ValueError('Actual image bytes differ from receipt')
            verified[frame_id] = {
                'id': frame_id, 'path': str(image_path), 'sha256': selected['sha256'],
                'dimensions': dimensions, 'mime': mime, 'bytes': downloaded['bytes'],
                'job_id': job['job_id'], 'source_job_id': job['source_job_id'],
                'source_selected_index': job['selected_index'],
                'selected_index': selected['selected_index'], 'action': 'Vary > Subtle',
                'downloaded_path': str(downloaded_path),
                'receipt_path': str(receipt_path), 'receipt_sha256': digest(receipt_path),
                'job_path': str(job_path), 'job_sha256': digest(job_path),
            }
        except (OSError, ValueError, KeyError) as error:
            problems.append(f'{frame_id}: {type(error).__name__}: {error}')
    if problems:
        raise ValueError('ALL24 Vary > Subtle gate incomplete; no specs written:\n' + '\n'.join(problems))
    return verified


def build_spec(verified):
    original = read(ORIGINAL)
    if [clip['id'] for clip in original['clips']] != [f'C{i:02}' for i in range(1, 9)]:
        raise ValueError('Original eight-clip order changed')
    clips = []
    for clip in original['clips']:
        cid = clip['id']
        number = int(cid[1:])
        submission_path = WORKSPACE / clip['source_submission']
        document = read(submission_path)
        matches = [s for s in document['submissions'] if s['id'] == clip['generation_id']]
        if len(matches) != 1:
            raise ValueError(f'{cid}: original generation ID not unique')
        submission = matches[0]
        model = submission.get('model', document.get('model'))
        if model != MODEL:
            raise ValueError(f'{cid}: original model changed')
        original_input = submission['input']
        if original_input['prompt'] != clip['motion_prompt_original'] or original_input['negative_prompt'] != clip['negative_prompt_original']:
            raise ValueError(f'{cid}: manifest prompt differs from actual submission')
        for key, value in clip['generation_settings_original'].items():
            if original_input.get(key) != value:
                raise ValueError(f'{cid}: original setting mismatch {key}')
        needs_end = cid != 'C08'
        if bool(original_input.get('end_image_url')) != needs_end:
            raise ValueError(f'{cid}: unexpected original endpoint method')
        template = {k: v for k, v in original_input.items() if k not in ('start_image_url', 'end_image_url')}
        start_id, end_id = f'F{number:02}-IN', f'F{number:02}-OUT' if needs_end else None
        nominal_start = [0, 4, 12, 17, 23, 29, 35, 41][number - 1]
        requested_duration = int(original_input['duration'])
        clips.append({
            'id': cid, 'model': model, 'original_generation_id': clip['generation_id'],
            'original_request_id': submission['request_id'],
            'source_submission': str(submission_path), 'source_submission_sha256': digest(submission_path),
            'source_video': str(WORKSPACE / clip['source_video']),
            'input_template': template, 'start_frame_id': start_id, 'end_frame_id': end_id,
            'start': verified[start_id], 'end': verified[end_id] if end_id else None,
            'nominal_start_seconds': nominal_start,
            'snapshot_start_pts': nominal_start + 4 / 24,
            'snapshot_end_pts': nominal_start + requested_duration - 3 / 24 if needs_end else None,
            'snapshot_note': 'Insets are new scene targets, not exact original boundary images; intermediate generated motion can differ.',
            'expected_generated_frames': requested_duration * 24 + 1,
            'assembly_local_start_frame': 0 if cid == 'C01' else 1,
            'assembly_local_end_frame_exclusive': requested_duration * 24 + 1,
            'output': str(HERE / 'clips' / f'{cid}.mp4'),
        })
    return {
        'version': 1, 'run': str(RUN), 'workspace': str(WORKSPACE),
        'original_manifest': str(ORIGINAL), 'original_manifest_sha256': digest(ORIGINAL),
        'all24_gate': list(verified.values()), 'clips': clips,
        'delivery_contract': {'frames': 1129, 'fps': 24, 'time_base': '1/12288', 'video_duration': '47.041667', 'web_audio_duration': '47.090000', 'desktop': [1916, 1080], 'mobile': [960, 542], 'gop': 6, 'audio_policy': 'Discard generated audio; copy each original web file AAC without reencoding. Preserve existing MP3 assets.'},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate only; write nothing')
    args = parser.parse_args()
    spec = build_spec(verify_downloads())
    spec['image_route'] = 'vary_subtle'
    selection_path = RUN / 'variation/selected-manifest.json'
    spec['variation_selection_manifest'] = str(selection_path)
    spec['variation_selection_sha256'] = digest(selection_path)
    parent_path = RUN / 'selected-manifest.json'
    spec['parent_selection_manifest'] = str(parent_path)
    spec['parent_selection_sha256'] = digest(parent_path)
    if args.check:
        print('ALL24 verified; all eight original prompts/settings verified; no files written')
        return
    target = HERE / 'specs.json'
    payload = json.dumps(spec, ensure_ascii=False, indent=2) + '\n'
    if target.exists() and target.read_text() != payload and any((HERE / 'states').glob('*.json')):
        raise ValueError('Specs changed after queue state exists; use a separate version or review state')
    temporary = target.with_suffix('.json.tmp')
    with temporary.open('w') as handle:
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())
    temporary.replace(target)
    print(f'Prepared {len(spec["clips"])} specs with ALL24 gate: {target}')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit(str(error))
