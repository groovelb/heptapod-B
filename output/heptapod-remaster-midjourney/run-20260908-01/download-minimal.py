"""Download confirmed Midjourney candidates through Aside's browser session.

Usage: python download-minimal.py [--workers 2] FRAME=JOB_ID [FRAME=JOB_ID ...]
Each worker owns an ephemeral tab. Image URLs come exclusively from its live DOM.
"""

import argparse
import concurrent.futures
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

from PIL import Image


ROOT = pathlib.Path(__file__).resolve().parent
MINIMAL = ROOT / "minimal"
MIN_WIDTH = 2000
MARKER = "DOWNLOAD_RESULT_JSON "

JS_TEMPLATE = r"""
const frame = __FRAME__;
const jobId = __JOB_ID__;
const p = await openTab('https://www.midjourney.com/jobs/' + jobId + '?index=0');
const files = [];
for (let index = 0; index < 4; index++) {
  if (index > 0) await p.goto('https://www.midjourney.com/jobs/' + jobId + '?index=' + index);
  let observed = null;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    observed = await p.evaluate(({jobId, index}) => {
      const candidates = [...document.querySelectorAll('img')].filter(img => {
        try {
          const url = new URL(img.src);
          return url.pathname.includes('/' + jobId + '/') &&
            url.pathname.endsWith('/0_' + index + '.jpeg') &&
            img.complete && img.naturalWidth > 0;
        } catch { return false; }
      }).sort((a, b) => b.naturalWidth - a.naturalWidth);
      const img = candidates[0];
      return img ? {src: img.src, width: img.naturalWidth, height: img.naturalHeight} : null;
    }, {jobId, index});
    if (observed) break;
    await sleep(500);
  }
  if (!observed) throw Error('Original JPEG missing after 20 seconds: ' + frame + ' index ' + index);
  const downloaded = await p.evaluate(async ({src}) => {
    const response = await fetch(src);
    if (!response.ok) throw Error('Image fetch failed: ' + response.status + ' ' + src);
    const blob = await response.blob();
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
    return {src, data};
  }, {src: observed.src});
  if (!downloaded.data.includes(';base64,')) throw Error('Expected base64 image data');
  const name = frame + '-' + jobId + '-' + index + '.jpg';
  await fs.writeFile(name, Buffer.from(downloaded.data.split(',')[1], 'base64'));
  files.push({index, path: pwd + '/' + name, src: downloaded.src,
    width: observed.width, height: observed.height});
}
console.log('DOWNLOAD_RESULT_JSON ' + JSON.stringify({frame, job_id: jobId, files}));
"""


def inspect_image(path):
    with Image.open(path) as image:
        image.load()
        width, height = image.size
        if image.format != "JPEG":
            raise ValueError(f"Expected original JPEG, got {image.format}: {path}")
    if width < MIN_WIDTH:
        raise ValueError(f"Original is too small: {width}x{height}; minimum width {MIN_WIDTH}: {path}")
    return {"width": width, "height": height,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "bytes": path.stat().st_size}


def download(pair):
    frame, job_id = pair
    manifest = MINIMAL / "downloads" / f"{frame}.json"
    if manifest.exists():
        existing = json.loads(manifest.read_text())
        if existing.get("job_id") != job_id:
            raise ValueError(f"Refusing to replace a different job manifest: {manifest}")
        files = existing.get("files", [])
        if len(files) == 4 and {file["index"] for file in files} == set(range(4)):
            for file in files:
                actual = inspect_image(pathlib.Path(file["path"]))
                if actual["sha256"] != file["sha256"]:
                    raise ValueError(f"Existing image hash mismatch: {file['path']}")
            return {"frame": frame, "status": "already_downloaded", "manifest": str(manifest)}
        raise ValueError(f"Existing manifest is incomplete; inspect before retrying: {manifest}")

    code = JS_TEMPLATE.replace("__FRAME__", json.dumps(frame)).replace("__JOB_ID__", json.dumps(job_id))
    result = subprocess.run(["aside", "repl", code], capture_output=True, text=True, timeout=240)
    log_path = MINIMAL / "downloads" / f"{frame}.log"
    log_path.write_text(result.stdout + result.stderr)
    lines = [line[len(MARKER):] for line in result.stdout.splitlines() if line.startswith(MARKER)]
    if result.returncode or len(lines) != 1:
        raise RuntimeError(f"Aside download failed for {frame}; see {log_path}: "
                           f"{(result.stdout + result.stderr)[-1200:]}")
    record = json.loads(lines[0])
    if record.get("job_id") != job_id or record.get("frame") != frame:
        raise ValueError(f"Unexpected download identity: {record}")
    files = record.get("files", [])
    if len(files) != 4 or {file["index"] for file in files} != set(range(4)):
        raise ValueError(f"Expected all four candidates for {frame}")

    # Verify every source before writing any final candidate.
    checked = [(file, inspect_image(pathlib.Path(file["path"]))) for file in files]
    saved = []
    for file, actual in checked:
        source = pathlib.Path(file["path"])
        target = MINIMAL / "stills" / f"{frame}-{file['index']}.jpg"
        if target.exists():
            if inspect_image(target)["sha256"] != actual["sha256"]:
                raise ValueError(f"Refusing to overwrite a different image: {target}")
        else:
            with tempfile.NamedTemporaryFile(dir=target.parent, prefix=f".{frame}-", delete=False) as tmp:
                temporary = pathlib.Path(tmp.name)
            try:
                shutil.copyfile(source, temporary)
                if inspect_image(temporary) != actual:
                    raise ValueError(f"Copied image verification failed: {target}")
                # Exclusive creation prevents overwriting another process's output.
                os.link(temporary, target)
            finally:
                temporary.unlink(missing_ok=True)
        saved.append({"index": file["index"], "path": str(target),
                      "source_path": str(source), "src": file["src"],
                      "dom_width": file["width"], "dom_height": file["height"], **actual})
    output = {"frame": frame, "job_id": job_id, "files": saved}
    with manifest.open("x") as stream:
        json.dump(output, stream, indent=2)
        stream.write("\n")
    return {"frame": frame, "status": "downloaded", "manifest": str(manifest),
            "dimensions": [[file["width"], file["height"]] for file in saved]}


def parse_pair(value):
    match = re.fullmatch(r"([A-Za-z0-9][A-Za-z0-9_-]*)=([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})", value)
    if not match:
        raise argparse.ArgumentTypeError("Use FRAME=JOB_ID with a safe frame name and a job UUID")
    return match.group(1), match.group(2).lower()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pairs", nargs="+", type=parse_pair, metavar="FRAME=JOB_ID")
    parser.add_argument("--workers", type=int, default=2, choices=range(1, 5))
    args = parser.parse_args()
    if len({frame for frame, _ in args.pairs}) != len(args.pairs):
        parser.error("Each frame may only appear once")
    (MINIMAL / "downloads").mkdir(parents=True, exist_ok=True)
    (MINIMAL / "stills").mkdir(parents=True, exist_ok=True)
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        pending = {pool.submit(download, pair): pair[0] for pair in args.pairs}
        for future in concurrent.futures.as_completed(pending):
            frame = pending[future]
            try:
                print(json.dumps(future.result()), flush=True)
            except Exception as error:
                failures.append(frame)
                print(json.dumps({"frame": frame, "status": "failed", "error": str(error)}),
                      file=sys.stderr, flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
