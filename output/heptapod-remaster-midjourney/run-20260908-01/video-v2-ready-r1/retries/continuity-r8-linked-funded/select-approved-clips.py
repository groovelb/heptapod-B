"""Select only both approved linked clips; does not assemble or publish."""
from pathlib import Path
import hashlib, json, shutil

R = Path(__file__).resolve().parent
B = R.parents[1]
read = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
gates = {cid: read(R / f'qa/{cid}/root-gate.json') for cid in ['C04', 'C05']}
for cid, gate in gates.items():
    source = Path(gate['path']).resolve()
    assert source.is_relative_to(R)
    assert gate['delivery_approved'] is True and sha(source) == gate['sha256']
spec = read(R / 'spec-C05.json')['clips'][0]
assert spec['references'][0]['video_sha256'] == gates['C04']['sha256']
assert spec['references'][-1]['video_sha256'] == sha(B / 'final-clips/C06.mp4')
backup = read(B / 'history/before-linked-r8/backup-manifest.json')
for entry in backup:
    name = entry['path']
    if name.startswith('final-clips/') and Path(name).stem not in gates:
        assert sha(B / name) == entry['sha256'], f'Protected clip changed: {name}'
decisions = read(B / 'review-decisions.json')
for cid, gate in gates.items():
    source = Path(gate['path'])
    target = B / 'final-clips' / f'{cid}.mp4'
    shutil.copy2(source, target.with_suffix('.pending.mp4'))
    target.with_suffix('.pending.mp4').replace(target)
    assert sha(target) == gate['sha256']
    decisions['clips'][cid] = {
        'source': str(source.relative_to(B)),
        'qa_path': str((R / f'qa/{cid}/root-gate.json').relative_to(B)),
        'source_kind': 'v2_generated_local_composite' if cid == 'C04' else gate.get('source_kind', 'v2_generated_linked_frames'),
        'attempt': 8, 'delivery_approved': True,
        'notes': gate.get('delivery_notes', [gate['reason']]),
        'motion_accepted_by_user': False,
    }
(B / 'review-decisions.json').write_text(json.dumps(decisions, ensure_ascii=False, indent=2) + '\n')
print('Selected approved C04/C05; all other clip hashes preserved. No assembly/public writes.')
