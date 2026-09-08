"""Match endpoint wall exposure, preserving chroma and black. No generation."""
from pathlib import Path
import cv2, numpy as np, subprocess, json, hashlib, sys

R = Path(__file__).resolve().parent
source = Path(sys.argv[1]).resolve()
outdir = R / 'color-C05'
outdir.mkdir(exist_ok=True)
target = outdir / (sys.argv[2] if len(sys.argv) > 2 else 'C05.mp4')
assert target.resolve().parent == outdir.resolve()
assert not target.exists(), 'Do not overwrite a reviewed output'
W, H, N = 1920, 1080, 145
size = W * H * 3 // 2
decoded = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(source), '-f',
    'rawvideo', '-pix_fmt', 'yuv420p', '-'], capture_output=True, check=True).stdout
assert len(decoded) == N * size
frames = np.frombuffer(decoded, np.uint8).reshape(N, H * 3 // 2, W)
refs = json.loads((R / 'spec-C05.json').read_text())['clips'][0]['references']
gains = []
for index, ref in [(0, refs[0]), (144, refs[-1])]:
    yref = cv2.cvtColor(cv2.imread(ref['path']), cv2.COLOR_BGR2YUV_I420)[:H]
    expected = float(yref[200:600, 300:1600].mean())
    actual = float(frames[index, 200:600, 300:1600].mean())
    gains.append((expected - 16) / (actual - 16))
assert all(.85 < x < 1.2 for x in gains), gains
command = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'yuv420p',
    '-s', f'{W}x{H}', '-r', '24', '-i', '-', '-an', '-c:v', 'libx264', '-crf', '0',
    '-preset', 'fast', '-threads', '4', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(target)]
process = subprocess.Popen(command, stdin=subprocess.PIPE)
for i in range(N):
    frame = frames[i].copy()
    gain = gains[0] + (gains[1] - gains[0]) * i / (N - 1)
    frame[:H] = np.rint(np.clip(16 + (frame[:H].astype(np.float32) - 16) * gain, 16, 235)).astype(np.uint8)
    process.stdin.write(frame.tobytes())
process.stdin.close()
assert process.wait() == 0
report = {'path': str(target), 'source': str(source),
    'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    'endpoint_luma_gains': gains, 'chroma_preserved': True,
    'frames': N, 'fps': 24, 'delivery_approved': None,
    'note': 'Global exposure only, no geometry or timing edits. Visual gate still required.'}
target.with_suffix('.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
