"""Assemble eight verified clips into staged web assets; never writes to public/.

Default input paths: final-clips/C01.mp4 through C08.mp4 beside this script.
Use --inputs PATH ... PATH (eight ordered paths) to override them.
References: scripts/build-hero-scrub.mjs and docs/heptapod-b-encoder/
07-scroll-scrub-sound-plan.md, plus the immutable rollback web files.
"""

import argparse
import hashlib
import json
import os
import pathlib
import subprocess
import sys
from fractions import Fraction


ROOT = pathlib.Path(__file__).resolve().parent
ROLLBACK = ROOT / "rollback" / "hero-scrub"
STAGING = ROOT / "staging"
COUNTS = [97, 193, 121, 145, 145, 145, 145, 145]
TOTAL = sum(COUNTS) - 7
FPS = Fraction(24, 1)
TIME_BASE = Fraction(1, 12288)
VARIANTS = {
    "1920": {"width": 1916, "height": 1080, "level": 40, "crf": 21},
    "960": {"width": 960, "height": 542, "level": 31, "crf": 23},
}
COMMANDS = []


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def run(command):
    command = [str(item) for item in command]
    COMMANDS.append(command)
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"Command failed ({result.returncode}): {command[0]}\n{result.stderr[-6000:]}")
    return result.stdout


def probe(path):
    return json.loads(run(["ffprobe", "-v", "error", "-count_frames",
                           "-show_streams", "-show_format", "-of", "json", path]))


def stream(data, kind):
    values = [item for item in data["streams"] if item["codec_type"] == kind]
    require(len(values) == 1, f"Expected exactly one {kind} stream; got {len(values)}")
    return values[0]


def video_frames(path):
    return json.loads(run([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_frames",
        "-show_entries", "frame=key_frame,best_effort_timestamp", "-of", "json", path,
    ]))["frames"]


def audio_packets(path):
    return json.loads(run([
        "ffprobe", "-v", "error", "-select_streams", "a:0", "-show_packets",
        "-show_data_hash", "sha256", "-show_entries",
        "packet=pts,dts,duration,size,data_hash,side_data_list", "-of", "json", path,
    ]))["packets"]


def validate_cadence(path, video, frames, count, start_zero=False):
    require(Fraction(video["r_frame_rate"]) == FPS, f"{path}: r_frame_rate is not 24fps")
    require(Fraction(video["avg_frame_rate"]) == FPS, f"{path}: avg_frame_rate is not 24fps")
    require(int(video["nb_read_frames"]) == count, f"{path}: decoded frame count is not {count}")
    if "nb_frames" in video:
        require(int(video["nb_frames"]) == count, f"{path}: declared frame count is not {count}")
    require(len(frames) == count, f"{path}: frame timestamp count is not {count}")
    tick = Fraction(video["time_base"])
    times = [Fraction(frame["best_effort_timestamp"]) * tick for frame in frames]
    require(all(b - a == 1 / FPS for a, b in zip(times, times[1:])),
            f"{path}: nonuniform frame timestamps; refusing to stretch or duplicate frames")
    if start_zero:
        require(times[0] == 0, f"{path}: video must start at zero")
    return [index for index, frame in enumerate(frames) if frame["key_frame"] == 1]


def inspect_reference(variant):
    path = ROLLBACK / f"hero-scrub-{variant}.mp4"
    require(path.is_file(), f"Missing rollback reference: {path}")
    data = probe(path)
    video, audio = stream(data, "video"), stream(data, "audio")
    expected = VARIANTS[variant]
    require(video["width"] == expected["width"] and video["height"] == expected["height"],
            f"Rollback dimensions differ from the original web contract: {path}")
    require(video["codec_name"] == "h264" and video["profile"] == "High" and
            video["level"] == expected["level"] and video["pix_fmt"] == "yuv420p",
            f"Rollback codec/profile/level/pixel format mismatch: {path}")
    require(Fraction(video["time_base"]) == TIME_BASE, f"Rollback time base mismatch: {path}")
    require(audio["codec_name"] == "aac", f"Rollback audio is not AAC: {path}")
    require(int(video["duration_ts"]) * TIME_BASE == Fraction(TOTAL, 24),
            f"Rollback video duration is not exactly 1129/24 seconds: {path}")
    require(Fraction(data["format"]["duration"]) == Fraction(4709, 100),
            f"Rollback container duration is not 47.09 seconds: {path}")
    require(video.get("sample_aspect_ratio") not in (None, "N/A", "0:1"),
            f"Missing rollback sample aspect ratio: {path}")
    frames = video_frames(path)
    keyframes = validate_cadence(path, video, frames, TOTAL, start_zero=True)
    require(keyframes == list(range(0, TOTAL, 6)), f"Rollback GOP is not exactly 6 frames: {path}")
    packets = audio_packets(path)
    require(packets and all("data_hash" in packet for packet in packets),
            f"Missing original audio packet hashes: {path}")
    return {"path": str(path), "sha256": digest(path), "probe": data,
            "keyframes": keyframes, "audio_packets": packets}


def validate_output(path, reference, variant):
    data = probe(path)
    video, audio = stream(data, "video"), stream(data, "audio")
    original_video = stream(reference["probe"], "video")
    original_audio = stream(reference["probe"], "audio")
    for field in ("codec_name", "profile", "level", "width", "height", "pix_fmt",
                  "sample_aspect_ratio", "display_aspect_ratio", "r_frame_rate",
                  "avg_frame_rate", "time_base", "start_pts", "duration_ts"):
        require(video.get(field) == original_video.get(field),
                f"{path}: video {field} differs: {video.get(field)} != {original_video.get(field)}")
    frames = video_frames(path)
    keyframes = validate_cadence(path, video, frames, TOTAL, start_zero=True)
    require(keyframes == reference["keyframes"], f"{path}: keyframe interval/positions changed")
    for field in ("codec_name", "profile", "sample_rate", "channels", "channel_layout",
                  "time_base", "start_pts", "duration_ts", "nb_frames"):
        require(audio.get(field) == original_audio.get(field),
                f"{path}: audio {field} changed: {audio.get(field)} != {original_audio.get(field)}")
    packets = audio_packets(path)
    if packets != reference["audio_packets"]:
        old = reference["audio_packets"]
        mismatch = next((i for i, (a, b) in enumerate(zip(old, packets)) if a != b), None)
        raise ValueError(f"{path}: AAC packet payload/timestamp/duration/skip metadata mismatch; "
                         f"packet {mismatch}, count {len(packets)} versus {len(old)}")
    require(Fraction(data["format"]["duration"]) == Fraction(reference["probe"]["format"]["duration"]),
            f"{path}: container duration changed")
    return {"variant": variant, "path": str(path), "sha256": digest(path),
            "bytes": path.stat().st_size, "video": video, "audio": audio,
            "keyframe_indices": keyframes, "audio_packet_count": len(packets),
            "audio_packets_sha256": hashlib.sha256(json.dumps(packets, sort_keys=True).encode()).hexdigest(),
            "audio_packets_identical": True, "audio_timestamps_identical": True,
            "frame_count": len(frames), "validation": "passed"}


def encoder_args(level, crf, threads):
    return ["-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
            "-profile:v", "high", "-level:v", level, "-g", "6", "-keyint_min", "6",
            "-sc_threshold", "0", "-pix_fmt", "yuv420p", "-video_track_timescale", "12288",
            "-fps_mode", "passthrough", "-enc_time_base:v", "1:24",
            "-threads", str(threads), "-movflags", "+faststart"]


def assemble(inputs, references, threads):
    require(len(inputs) == 8, "Exactly eight ordered clips are required")
    desktop = STAGING / ".desktop-video.mp4"
    mobile = STAGING / ".mobile-video.mp4"
    command = ["ffmpeg", "-hide_banner", "-v", "warning", "-y", "-filter_complex_threads", "2"]
    filters, input_records = [], []
    for index, (path, count) in enumerate(zip(inputs, COUNTS)):
        require(path.is_file(), f"Missing C{index + 1:02d}: {path}")
        data = probe(path)
        video = stream(data, "video")
        validate_cadence(path, video, video_frames(path), count)
        require(video.get("sample_aspect_ratio", "1:1") in ("1:1", "N/A"),
                f"{path}: non-square source pixels require an explicit fit decision")
        input_records.append({"id": f"C{index + 1:02d}", "path": str(path),
                              "sha256": digest(path), "frames": count,
                              "drop_first_frame": index > 0, "retained_frames": count - (index > 0),
                              "video": video})
        command += ["-threads", "2", "-i", str(path)]
        start = 0 if index == 0 else 1
        filters.append(
            f"[{index}:v:0]trim=start_frame={start}:end_frame={count},"
            "setpts=PTS-STARTPTS,scale=1916:1080:force_original_aspect_ratio=increase:"
            "force_divisible_by=2:flags=lanczos,crop=1916:1080,setsar=1,"
            f"format=yuv420p[v{index}]"
        )
    # Cadence has already been checked exactly; canonical ticks only remove concat rounding.
    desktop_sar = stream(references["1920"]["probe"], "video")["sample_aspect_ratio"].replace(":", "/")
    filters.append("".join(f"[v{i}]" for i in range(8)) +
                   "concat=n=8:v=1:a=0,settb=1/12288,setpts=N*512," +
                   f"setsar=ratio={desktop_sar}:max=1000000[outv]")
    command += ["-filter_complex", ";".join(filters), "-map", "[outv]", "-an"]
    command += encoder_args("4.0", 21, threads) + [desktop]
    print("Encoding desktop: 1129 frames, 1916x1080, GOP 6", flush=True)
    run(command)
    # Concat can leave the last encoded MP4 sample with zero duration.
    # Remux without reencoding to set its normal 1/24 duration before decoding
    # for the mobile variant; otherwise the MP4 edit list hides that last frame.
    normalized = STAGING / ".desktop-normalized.mp4"
    run(["ffmpeg", "-hide_banner", "-v", "warning", "-y", "-i", desktop,
         "-map", "0:v:0", "-c", "copy", "-video_track_timescale", "12288",
         "-movflags", "+faststart", normalized])
    os.replace(normalized, desktop)
    mobile_sar = stream(references["960"]["probe"], "video")["sample_aspect_ratio"].replace(":", "/")
    print("Encoding mobile: 960x542, original mobile SAR, GOP 6", flush=True)
    run(["ffmpeg", "-hide_banner", "-v", "warning", "-y", "-i", desktop,
         "-map", "0:v:0", "-an", "-vf",
         f"scale=960:542:flags=lanczos,setsar=ratio={mobile_sar}:max=1000000"] +
        encoder_args("3.1", 23, threads) + [mobile])
    reports, pending = [], []
    for variant, silent in (("1920", desktop), ("960", mobile)):
        temporary = STAGING / f".hero-scrub-{variant}.pending.mp4"
        reference = references[variant]
        print(f"Muxing {variant} with its own original AAC packets", flush=True)
        run(["ffmpeg", "-hide_banner", "-v", "warning", "-y", "-i", silent,
             "-i", reference["path"], "-map", "0:v:0", "-map", "1:a:0",
             "-c", "copy", "-video_track_timescale", "12288", "-avoid_negative_ts", "disabled",
             "-movflags", "+faststart", temporary])
        # No -shortest: the original AAC tail extends beyond the last video frame.
        reports.append(validate_output(temporary, reference, variant))
        pending.append((temporary, STAGING / f"hero-scrub-{variant}.mp4"))
    # Publish inside staging only, after BOTH variants pass all validation.
    for report, (temporary, final) in zip(reports, pending):
        os.replace(temporary, final)
        report["path"] = str(final)
    return {"inputs": input_records, "outputs": reports}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clips-dir", type=pathlib.Path, default=ROOT / "final-clips")
    parser.add_argument("--inputs", type=pathlib.Path, nargs=8, metavar="CLIP")
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--validate-only", action="store_true", help="Validate already staged MP4s")
    parser.add_argument("--references-only", action="store_true", help="Read-only checks of rollback contracts")
    args = parser.parse_args()
    require(args.threads > 0, "--threads must be positive")
    references = {variant: inspect_reference(variant) for variant in VARIANTS}
    if args.references_only:
        print(json.dumps({variant: {"path": item["path"], "sha256": item["sha256"],
                                   "sar": stream(item["probe"], "video")["sample_aspect_ratio"],
                                   "keyframes": len(item["keyframes"]),
                                   "audio_packets": len(item["audio_packets"])}
                          for variant, item in references.items()}, indent=2))
        return 0
    require(STAGING.resolve().parent == ROOT, "Staging must be directly inside this run; symlink redirection is forbidden")
    STAGING.mkdir(parents=True, exist_ok=True)
    try:
        if args.validate_only:
            report = {"outputs": [validate_output(STAGING / f"hero-scrub-{variant}.mp4", reference, variant)
                                  for variant, reference in references.items()]}
        else:
            inputs = args.inputs or [args.clips_dir / f"C{i:02d}.mp4" for i in range(1, 9)]
            report = assemble([path.resolve() for path in inputs], references, args.threads)
        report.update({"status": "passed", "total_frames": TOTAL,
                       "fps": str(FPS), "time_base": str(TIME_BASE),
                       "reference_sources": {variant: {"path": ref["path"], "sha256": ref["sha256"]}
                                             for variant, ref in references.items()},
                       "public_files_modified": False})
        report_path = STAGING / ("validation.json" if args.validate_only else "assembly-validation.json")
        report_path.write_text(json.dumps(report, indent=2) + "\n")
        print(f"PASS: {report_path}", flush=True)
    finally:
        (STAGING / "assembly-commands.json").write_text(json.dumps(COMMANDS, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"FAILED: {error}", file=sys.stderr, flush=True)
        sys.exit(1)
