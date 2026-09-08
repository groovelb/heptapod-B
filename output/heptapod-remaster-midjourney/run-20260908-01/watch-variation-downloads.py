"""Download only confirmed, explicitly parent-mapped Vary > Subtle jobs.

Two read-only Aside download processes run in parallel. This watcher never clicks
generation controls, guesses job mappings, or modifies root-owned job records.
"""

import argparse
import concurrent.futures
import fcntl
import json
import os
import pathlib
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlparse


ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "variation"
EXPECTED = [f"F{index:02d}-{part}" for index in range(1, 9) for part in ("IN", "MID", "OUT")]
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")


def now():
    return datetime.now(timezone.utc).isoformat()


def emit(event, **fields):
    print(json.dumps({"at": now(), "event": event, **fields}, ensure_ascii=False), flush=True)


def job_record(path):
    try:
        job = json.loads(path.read_text())
    except (OSError, ValueError):
        return None  # A root-owned record may be between writes.
    if job.get("status") != "confirmed":
        return None
    frame, job_id, source_id = job.get("id"), job.get("job_id"), job.get("source_job_id")
    index = job.get("selected_index")
    if frame != path.stem or frame not in EXPECTED:
        raise ValueError(f"Unexpected frame identity: {path}")
    if job.get("requested_action") != "Vary > Subtle":
        raise ValueError(f"Not a confirmed Vary > Subtle action: {path}")
    if not isinstance(job_id, str) or not UUID.fullmatch(job_id):
        raise ValueError(f"Missing valid confirmed job UUID: {path}")
    if not isinstance(source_id, str) or not UUID.fullmatch(source_id) or source_id == job_id:
        raise ValueError(f"Missing distinct parent job UUID: {path}")
    if type(index) is not int or not 0 <= index < 4:
        raise ValueError(f"Missing explicit parent selection index: {path}")
    expected_url = f"https://www.midjourney.com/jobs/{source_id}?index={index}"
    if job.get("source_selection_url") != expected_url:
        raise ValueError(f"Parent selection URL does not match source job/index: {path}")
    observed = job.get("source_original_observed", {}).get("url", "")
    if urlparse(observed).path != f"/{source_id}/0_{index}.jpeg":
        raise ValueError(f"Observed original does not match explicit parent/index: {path}")
    expected_links = {f"/jobs/{job_id}?index={i}" for i in range(4)}
    if not expected_links.issubset(set(job.get("new_jobs", []))):
        raise ValueError(f"Four observed output links are not confirmed: {path}")
    return job


def attempt(frame, job_id, number):
    command = [sys.executable, "-B", str(ROOT / "download-variation.py"),
               f"{frame}={job_id}", "--workers", "1"]
    log = OUT / "download-watch-logs" / f"{frame}-attempt-{number:02d}.log"
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=300)
        log.write_text(result.stdout + result.stderr)
        if result.returncode:
            raise RuntimeError((result.stdout + result.stderr)[-1600:])
        receipt_path = OUT / "downloads" / f"{frame}.json"
        receipt = json.loads(receipt_path.read_text())
        if receipt.get("frame") != frame or receipt.get("job_id") != job_id:
            raise ValueError("Downloaded receipt identity does not match confirmed job")
        files = receipt.get("files", [])
        if len(files) != 4 or {item["index"] for item in files} != set(range(4)):
            raise ValueError("Downloaded receipt does not contain four original candidates")
        return {"frame": frame, "job_id": job_id, "receipt": str(receipt_path),
                "dimensions": [[item["width"], item["height"]] for item in files]}
    except subprocess.TimeoutExpired as error:
        log.write_text(f"Download subprocess timed out: {error}\n")
        raise RuntimeError(f"Download subprocess timed out; log: {log}") from error


def atomic_status(value):
    temporary = OUT / ".download-watch-status.json.tmp"
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    os.replace(temporary, OUT / "download-watch-status.json")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=2, choices=(1, 2))
    parser.add_argument("--timeout-seconds", type=int, default=3600)
    parser.add_argument("--max-attempts", type=int, default=8)
    parser.add_argument("--minimum-age-seconds", type=int, default=25)
    parser.add_argument("--check", action="store_true", help="Inspect mappings only; no Aside calls")
    args = parser.parse_args()
    if min(args.timeout_seconds, args.max_attempts) < 1 or args.minimum_age_seconds < 0:
        parser.error("Timeout and attempts must be positive; minimum age must be nonnegative")
    if args.check:
        confirmed = [job for frame in EXPECTED
                     if (job := job_record(OUT / "jobs" / f"{frame}.json"))]
        emit("mapping_check", confirmed=len(confirmed), expected=24,
             frames=[job["id"] for job in confirmed], download_calls=0)
        return 0
    OUT.mkdir(exist_ok=True)
    (OUT / "download-watch-logs").mkdir(exist_ok=True)
    with (OUT / "download-watch.lock").open("a+") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("Another variation download watcher is already running")
        started = time.monotonic()
        done, attempts, retry_after, errors = {}, {}, {}, {}
        inflight = {}
        previous_summary = None
        last_progress = 0
        emit("watch_started", workers=args.workers, expected=24, pid=os.getpid())
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            while time.monotonic() - started < args.timeout_seconds:
                for future in list(inflight):
                    if not future.done():
                        continue
                    frame, job_id = inflight.pop(future)
                    try:
                        outcome = future.result()
                        done[frame] = job_id
                        errors.pop(frame, None)
                        emit("downloaded", **outcome, complete=len(done), expected=24)
                    except Exception as error:
                        errors[frame] = str(error)
                        retry_after[frame] = time.monotonic() + min(180, 20 * attempts[frame])
                        emit("download_retry", frame=frame, attempt=attempts[frame],
                             error=str(error), retry_read_only=True)
                confirmed = {}
                pause_path = OUT / "download-paused.json"
                paused = set(json.loads(pause_path.read_text()).get("frames", [])) if pause_path.is_file() else set()
                for frame in EXPECTED:
                    if frame in paused:
                        continue
                    path = OUT / "jobs" / f"{frame}.json"
                    job = job_record(path)
                    if job is not None:
                        confirmed[frame] = job
                mapped_ids = {}
                for frame, job in confirmed.items():
                    prior = mapped_ids.get(job["job_id"])
                    if prior is not None:
                        raise ValueError(f"Output job is mapped to two frames: {prior}, {frame}; {job['job_id']}")
                    mapped_ids[job["job_id"]] = frame
                active_frames = {frame for frame, _ in inflight.values()}
                for frame, job_id in done.items():
                    if frame in paused:
                        continue
                    if frame not in confirmed or confirmed[frame]["job_id"] != job_id:
                        raise ValueError(f"Confirmed job mapping changed after verified download: {frame}")
                for frame in EXPECTED:
                    if len(inflight) >= args.workers:
                        break
                    if frame in done or frame in active_frames or frame not in confirmed:
                        continue
                    if attempts.get(frame, 0) >= args.max_attempts or time.monotonic() < retry_after.get(frame, 0):
                        continue
                    path = OUT / "jobs" / f"{frame}.json"
                    if time.time() - path.stat().st_mtime < args.minimum_age_seconds:
                        continue
                    job_id = confirmed[frame]["job_id"]
                    attempts[frame] = attempts.get(frame, 0) + 1
                    future = pool.submit(attempt, frame, job_id, attempts[frame])
                    inflight[future] = (frame, job_id)
                    active_frames.add(frame)
                    emit("download_started", frame=frame, job_id=job_id, attempt=attempts[frame])
                status = {"at": now(), "status": "complete" if len(done) == 24 else "watching",
                          "expected": 24, "confirmed": len(confirmed), "downloaded": len(done),
                          "inflight": sorted(active_frames), "completed_jobs": done,
                          "paused_frames": sorted(paused),
                          "attempts": attempts, "errors": errors,
                          "mapping_policy": "Only root confirmed jobs with explicit observed parent and index"}
                atomic_status(status)
                summary = (len(confirmed), len(done), len(inflight))
                if summary != previous_summary or time.monotonic() - last_progress >= 30:
                    emit("progress", confirmed=summary[0], downloaded=summary[1], inflight=summary[2], expected=24)
                    previous_summary, last_progress = summary, time.monotonic()
                if len(done) == 24:
                    emit("all_downloaded", frames=24, candidates=96)
                    return 0
                exhausted = [frame for frame in confirmed if frame not in done and
                             frame not in active_frames and attempts.get(frame, 0) >= args.max_attempts]
                if exhausted and len(confirmed) == 24 and not inflight:
                    raise RuntimeError(f"Read-only download retries exhausted: {exhausted}")
                time.sleep(5)
        raise TimeoutError(f"Variation watch timed out: {len(done)}/24 frames downloaded")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        emit("watch_failed", error=str(error))
        sys.exit(1)
