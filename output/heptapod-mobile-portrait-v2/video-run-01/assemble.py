"""Assemble only this run's eight native portrait clips into staging/.

No resize, crop, grading, interpolation, stabilization, blending, or PC video
inputs. --pad-native-height 1920 explicitly permits 1080x1916 content inside a
1080x1920 canvas with two black rows above and below; the default stays strict.
Only C02..C08 frame zero is removed. Re-encoding uses H.264 CRF 18 by
default; native dimensions, SAR, pixel format, and declared color tags stay fixed.
Optional --audio-reference reads only its audio stream and copies AAC packets.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from fractions import Fraction

ROOT = Path(__file__).resolve().parent
COUNTS = [97, 193, 121, 145, 145, 145, 145, 145]
TOTAL = sum(COUNTS) - 7
FPS = Fraction(24)
TIME_BASE = Fraction(1, 12288)
COLOR_FIELDS = ('color_range', 'color_space', 'color_transfer', 'color_primaries')
COMMANDS = []


def require(condition, message):
    if not condition:
        raise ValueError(message)


def run(command):
    command = list(map(str, command))
    COMMANDS.append(command)
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f'{command[0]} failed ({result.returncode}):\n{result.stderr[-5000:]}')
    return result.stdout


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()


def probe(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-count_frames',
                           '-show_streams', '-show_format', '-of', 'json', path]))


def single_stream(data, kind):
    matches = [v for v in data.get('streams', []) if v.get('codec_type') == kind]
    require(len(matches) == 1, f'Expected one {kind} stream, found {len(matches)}')
    return matches[0]


def frames(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
                           '-show_frames', '-show_entries',
                           'frame=key_frame,best_effort_timestamp', '-of', 'json', path]))['frames']


def known(value):
    return None if value in (None, 'unknown', 'unspecified', 'N/A') else value


def sar(video):
    value = video.get('sample_aspect_ratio')
    return Fraction(value.replace(':', '/')) if value not in (None, 'N/A', '0:1') else Fraction(1)


def cadence(path, video, samples, count, zero=False):
    for field in ('r_frame_rate', 'avg_frame_rate'):
        require(Fraction(video[field]) == FPS, f'{path}: {field}={video[field]}, expected 24/1; no retiming allowed')
    require(int(video.get('nb_read_frames', -1)) == count,
            f'{path}: decoded {video.get("nb_read_frames")} frames; expected {count}')
    if video.get('nb_frames') not in (None, 'N/A'):
        require(int(video['nb_frames']) == count, f'{path}: declared frame count differs from {count}')
    require(len(samples) == count, f'{path}: timestamp count differs from {count}')
    tick = Fraction(video['time_base'])
    timestamps = [Fraction(v['best_effort_timestamp']) * tick for v in samples]
    require(all(b - a == 1 / FPS for a, b in zip(timestamps, timestamps[1:])),
            f'{path}: nonuniform timestamps; refusing dropped, repeated, or stretched frames')
    if zero:
        require(timestamps[0] == 0, f'{path}: output must start at zero')
    return [i for i, sample in enumerate(samples) if sample.get('key_frame') == 1]


def native_padding(width, height, requested_height):
    if requested_height is not None:
        require(requested_height == 1920 and width == 1080 and height in (1916, 1920),
                f'--pad-native-height 1920 permits only 1080x1916 or 1080x1920; got {width}x{height}')
    extra = requested_height-height if requested_height else 0
    return {'requested_height': requested_height, 'applied': bool(extra),
            'source_dimensions': [width, height], 'output_dimensions': [width, height+extra],
            'top': extra//2, 'bottom': extra//2, 'left': 0, 'right': 0,
            'fill': 'black' if extra else None, 'content_resized': False,
            'content_color_adjusted': False}


def inspect_inputs(clips_dir, pad_native_height=None):
    clips_dir = clips_dir.resolve()
    require(clips_dir.is_relative_to(ROOT), 'Input directory must be inside this mobile run; PC footage is forbidden')
    paths = [clips_dir / f'C{i:02}.mp4' for i in range(1, 9)]
    missing = [str(path) for path in paths if not path.is_file()]
    require(not missing, 'Mobile clips are not ready:\n' + '\n'.join(missing))
    records, reference = [], None
    for i, (path, count) in enumerate(zip(paths, COUNTS)):
        require(path.resolve().is_relative_to(ROOT), f'{path}: symlink points outside the mobile run')
        data = probe(path)
        video = single_stream(data, 'video')
        require(video['width'] < video['height'], f'{path}: expected native portrait video, got {video["width"]}x{video["height"]}')
        require(video['width'] % 2 == video['height'] % 2 == 0, f'{path}: odd dimensions need an explicit encoding decision; no resize is permitted')
        require(video['pix_fmt'] in ('yuv420p', 'yuv420p10le', 'yuv422p', 'yuv422p10le', 'yuv444p', 'yuv444p10le'),
                f'{path}: native pixel format {video["pix_fmt"]} is unsupported by this H.264 path; no conversion performed')
        require(video.get('field_order', 'progressive') in ('progressive', 'unknown'), f'{path}: interlaced input is not supported')
        rotation = [v.get('rotation', 0) for v in video.get('side_data_list', [])]
        require(not any(rotation) and video.get('tags', {}).get('rotate', '0') == '0', f'{path}: rotation metadata requires explicit review')
        cadence(path, video, frames(path), count)
        spec = {field: video[field] for field in ('width', 'height', 'pix_fmt')}
        padding = native_padding(video['width'], video['height'], pad_native_height)
        spec['height'] = padding['output_dimensions'][1]
        spec['sar'] = str(sar(video))
        spec.update({field: known(video.get(field)) for field in COLOR_FIELDS})
        if reference is None:
            reference = spec
        require(spec == reference, f'{path}: native dimensions/SAR/pixel format/color tags differ from C01. Refusing automatic fit or color conversion.\n{spec}\n{reference}')
        records.append({'id': f'C{i+1:02}', 'path': str(path), 'sha256': digest(path),
                        'frames': count, 'drop_first_frame': i > 0,
                        'retained_frames': count - (i > 0), 'video': video,
                        'native_padding': padding})
    return records, reference


def audio_packets(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'a:0',
                           '-show_packets', '-show_data_hash', 'sha256', '-show_entries',
                           'packet=pts,dts,duration,size,data_hash,side_data_list', '-of', 'json', path]))['packets']


def inspect_audio(path):
    require(path.is_file(), f'Audio reference missing: {path}')
    # Deliberately select only audio: no PC video frame is decoded or assembled.
    data = json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'a',
                           '-show_streams', '-of', 'json', path]))
    audio = single_stream(data, 'audio')
    require(audio['codec_name'] == 'aac', 'Original audio must be AAC for packet-identical MP4 muxing')
    packets = audio_packets(path)
    require(packets and all('data_hash' in v for v in packets), 'Audio reference has no complete packet hashes')
    return {'path': str(path.resolve()), 'sha256': digest(path), 'stream': audio, 'packets': packets}


def validate(path, spec, audio=None):
    data = probe(path)
    video = single_stream(data, 'video')
    require(video['codec_name'] == 'h264', 'Output codec is not H.264')
    for field in ('width', 'height', 'pix_fmt'):
        require(video[field] == spec[field], f'Output changed native {field}: {video[field]} != {spec[field]}')
    require(str(sar(video)) == spec['sar'], 'Output changed sample aspect ratio')
    for field in COLOR_FIELDS:
        require(known(video.get(field)) == spec[field], f'Output changed {field}: {video.get(field)} != {spec[field]}')
    require(Fraction(video['time_base']) == TIME_BASE, 'Output time base is not 1/12288')
    require(Fraction(video['duration_ts']) * TIME_BASE == Fraction(TOTAL, 24), 'Output video duration is not exactly 1129/24 seconds')
    keyframes = cadence(path, video, frames(path), TOTAL, zero=True)
    require(keyframes == list(range(0, TOTAL, 6)), 'Output GOP is not exactly six frames')
    audio_check = None
    if audio:
        actual = single_stream(data, 'audio')
        for field in ('codec_name', 'profile', 'sample_rate', 'channels', 'channel_layout', 'time_base', 'start_pts', 'duration_ts', 'nb_frames'):
            require(actual.get(field) == audio['stream'].get(field), f'Audio {field} changed during muxing')
        require(audio_packets(path) == audio['packets'], 'AAC payload/timestamps/durations/skip metadata changed')
        audio_check = {'reference': audio['path'], 'reference_sha256': audio['sha256'],
                       'packets_identical': True, 'timestamps_identical': True,
                       'packet_count': len(audio['packets'])}
    else:
        require(not any(v['codec_type'] == 'audio' for v in data['streams']), 'Unexpected audio in silent assembly')
    return {'path': str(path), 'sha256': digest(path), 'bytes': path.stat().st_size,
            'video': video, 'frame_count': TOTAL, 'duration_seconds': float(Fraction(TOTAL, 24)),
            'container_duration_seconds': float(data['format']['duration']),
            'keyframe_indices': keyframes, 'audio': audio_check, 'validation': 'passed'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--clips-dir', type=Path, default=ROOT / 'clips')
    parser.add_argument('--audio-reference', type=Path, help='Optional original AAC or file containing AAC; only audio is mapped')
    parser.add_argument('--threads', type=int, default=4)
    parser.add_argument('--crf', type=int, default=18, help='H.264 compression only; 0 is lossless but may not play in browsers')
    parser.add_argument('--pad-native-height', type=int, choices=[1920], help='Explicitly add only 2 black rows above/below 1080x1916 inputs; 1080x1920 unchanged; default strictly identical dimensions')
    parser.add_argument('--check-only', action='store_true', help='Read-only input and optional audio checks; no output files')
    parser.add_argument('--validate-only', action='store_true', help='Read-only validation of the staged output against current inputs')
    args = parser.parse_args()
    require(args.threads > 0 and 0 <= args.crf <= 51, 'Invalid --threads or --crf')
    records, spec = inspect_inputs(args.clips_dir, args.pad_native_height)
    audio = inspect_audio(args.audio_reference) if args.audio_reference else None
    staging = ROOT / 'staging'
    require(staging.resolve().parent == ROOT, 'Staging must remain directly inside the mobile run')
    final = staging / 'hero-portrait-raw.mp4'
    if args.check_only:
        print(json.dumps({'status': 'inputs_passed', 'inputs': records, 'native_spec': spec,
                          'total_frames': TOTAL, 'duration_seconds': TOTAL / 24,
                          'audio_requested': bool(audio), 'pad_native_height_requested': args.pad_native_height}, indent=2))
        return 0
    if args.validate_only:
        require(final.is_file(), f'Staged output missing: {final}')
        print(json.dumps(validate(final, spec, audio), indent=2))
        return 0
    require(not final.exists(), f'Output already exists; preserve it and use a new run instead: {final}')
    staging.mkdir(parents=True, exist_ok=True)
    pending = staging / '.portrait-encode.pending.mp4'
    normalized = staging / '.portrait-normalized.pending.mp4'
    muxed = staging / '.portrait-audio.pending.mp4'
    filters = []
    command = ['ffmpeg', '-hide_banner', '-v', 'warning', '-n', '-filter_complex_threads', '2']
    for i, record in enumerate(records):
        command += ['-noautorotate', '-threads', '2', '-i', record['path']]
        padding = record['native_padding']
        pad_filter = ',pad=width=1080:height=1920:x=0:y=2:color=black' if padding['applied'] else ''
        filters.append(f'[{i}:v:0]trim=start_frame={int(i>0)}:end_frame={COUNTS[i]},setpts=PTS-STARTPTS{pad_filter}[v{i}]')
    # All native timestamps were validated first. Canonical ticks remove concat
    # rounding only; there is no fps filter or dropped/duplicated output frame.
    filters.append(''.join(f'[v{i}]' for i in range(8)) + 'concat=n=8:v=1:a=0,settb=1/12288,setpts=N*512[out]')
    command += ['-filter_complex', ';'.join(filters), '-map', '[out]', '-an', '-map_metadata', '-1',
                '-c:v', 'libx264', '-preset', 'medium', '-crf', args.crf,
                '-pix_fmt', spec['pix_fmt'], '-g', '6', '-keyint_min', '6', '-sc_threshold', '0',
                '-video_track_timescale', '12288', '-fps_mode', 'passthrough', '-enc_time_base:v', '1:24',
                '-threads', args.threads, '-movflags', '+faststart']
    for field in COLOR_FIELDS:
        if spec[field] is not None:
            command += ['-' + field.replace('color_space', 'colorspace').replace('color_transfer', 'color_trc'), spec[field]]
    command += [pending]
    try:
        print(f'Encoding {TOTAL} native portrait frames at {spec["width"]}x{spec["height"]}, 24fps', flush=True)
        run(command)
        # A concat MP4 may report a zero-duration final sample. Copy-remux fixes
        # that duration without changing image bytes, before final decode checks.
        run(['ffmpeg', '-v', 'warning', '-n', '-i', pending, '-map', '0:v:0', '-c', 'copy',
             '-video_track_timescale', '12288', '-movflags', '+faststart', normalized])
        staged = normalized
        if audio:
            run(['ffmpeg', '-v', 'warning', '-n', '-i', normalized, '-i', audio['path'],
                 '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-video_track_timescale', '12288',
                 '-avoid_negative_ts', 'disabled', '-movflags', '+faststart', muxed])
            staged = muxed  # No -shortest: preserve the complete original AAC tail.
        output = validate(staged, spec, audio)
        require(all(digest(Path(v['path'])) == v['sha256'] for v in records), 'An input changed during assembly; output not promoted')
        os.replace(staged, final)
        output['path'] = str(final)
        report = {'status': 'passed', 'visual_review': 'pending', 'inputs': records, 'native_spec': spec,
                  'outputs': [output], 'total_frames': TOTAL, 'fps': '24/1', 'time_base': '1/12288',
                  'drop_rule': 'Keep all C01; remove only first frame of C02..C08',
                  'image_filters': ['pad=1080:1920:0:2:black'] if any(v['native_padding']['applied'] for v in records) else [],
                  'pad_native_height_requested': args.pad_native_height,
                  'native_padding': {v['id']: v['native_padding'] for v in records},
                  'content_geometry_preserved': True, 'content_color_filters': [],
                  'encoding_pixel_lossless': args.crf == 0,
                  'crf': args.crf, 'public_files_modified': False,
                  'pc_video_frames_used': False, 'landing_applied': False}
        (staging / 'assembly-validation.json').write_text(json.dumps(report, indent=2) + '\n')
        print(f'PASS: {final}', flush=True)
    finally:
        (staging / 'assembly-commands.json').write_text(json.dumps(COMMANDS, indent=2) + '\n')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f'FAILED: {error}', file=sys.stderr, flush=True)
        raise SystemExit(1)
