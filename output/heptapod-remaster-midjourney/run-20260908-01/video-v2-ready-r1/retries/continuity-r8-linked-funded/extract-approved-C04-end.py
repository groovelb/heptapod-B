"""Extract the actual approved C04 endpoint; never approve or generate anything."""
from pathlib import Path
import cv2, hashlib, json

R = Path(__file__).resolve().parent
gate = json.loads((R / 'qa/C04/root-gate.json').read_text())
source = Path(gate['path']).resolve()
assert source.is_relative_to(R)
digest = hashlib.sha256(source.read_bytes()).hexdigest()
assert gate['delivery_approved'] is True and digest == gate['sha256']
cap = cv2.VideoCapture(str(source))
assert cap.get(cv2.CAP_PROP_FPS) == 24
count = 0
last = None
while True:
    ok, frame = cap.read()
    if not ok:
        break
    last = frame
    count += 1
cap.release()
assert count == 145 and last.shape == (1080, 1920, 3)
out = R / 'inputs/C05-start-from-approved-C04-last.png'
out.parent.mkdir(exist_ok=True)
assert not out.exists(), 'Existing endpoint must not be silently overwritten'
assert cv2.imwrite(str(out), last)
assert (cv2.imread(str(out)) == last).all()
record = {'id': 'C05-start-from-approved-C04-last', 'path': str(out),
          'sha256': hashlib.sha256(out.read_bytes()).hexdigest(),
          'video': str(source), 'video_sha256': digest, 'frame_index': 144,
          'width': 1920, 'height': 1080}
(R / 'inputs/C05-start-provenance.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record, indent=2))
