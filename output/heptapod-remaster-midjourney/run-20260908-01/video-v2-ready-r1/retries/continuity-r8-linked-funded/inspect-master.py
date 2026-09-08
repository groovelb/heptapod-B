"""Produce evidence for the assembled ascent, without auto-approving visuals."""
from pathlib import Path
import cv2, numpy as np, json, hashlib, sys

R = Path(__file__).resolve().parent
source = Path(sys.argv[1]).resolve()
out = R / 'qa/master'
out.mkdir(parents=True, exist_ok=True)
cv2.setNumThreads(2)
cap = cv2.VideoCapture(str(source))
frames, metrics = {}, []
previous = None
n = 0
while True:
    ok, image = cap.read()
    if not ok:
        break
    if 275 <= n <= 710:
        small = cv2.resize(image, (960, 540))
        frames[n] = small
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32)
        if previous is not None:
            metrics.append({'frame': n, 'seconds': n / 24,
                            'luma_mad': float(np.abs(gray - previous).mean())})
        previous = gray
    n += 1
cap.release()
assert n == 1129, n

def sheet(ids, name):
    tiles = []
    for i in ids:
        im = cv2.resize(frames[i], (480, 270))
        cv2.putText(im, f'{i / 24:.3f}s f{i}', (8, 22),
                    cv2.FONT_HERSHEY_SIMPLEX, .6, (0, 220, 255), 1, cv2.LINE_AA)
        tiles.append(im)
    while len(tiles) % 4:
        tiles.append(np.zeros_like(tiles[0]))
    cv2.imwrite(str(out / name), np.concatenate([
        np.concatenate(tiles[i:i+4], axis=1) for i in range(0, len(tiles), 4)
    ], axis=0))

for boundary in [289, 409, 553, 697]:
    sheet(list(range(boundary - 8, boundary + 8)), f'boundary-{boundary}.jpg')
for start in range(409, 697, 32):
    sheet(list(range(start, min(start + 32, 697))), f'ascent-{start}.jpg')
sheet(list(range(289, 709, 12)), 'overview.jpg')
report = {'path': str(source), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'frames': n, 'metrics': metrics, 'delivery_approved': None,
          'note': 'Manual geometry, people and color review required; no metric alone grants approval.'}
(out / 'measurements.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'sha256': report['sha256'], 'frames': n, 'evidence': str(out)}))
