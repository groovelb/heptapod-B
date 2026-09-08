"""Wait only for the already-submitted final clip, then assemble the review copy."""
import json,subprocess,time
from pathlib import Path
R=Path(__file__).resolve().parent
W=R.parents[2]
for attempt in range(90):
 p=R/'states/C06.json'
 s=json.loads(p.read_text()) if p.exists() else {}
 if s.get('status')=='downloaded':break
 if s.get('status') in ['rejected','submission_unknown','resumable_error','media_review_required']:
  raise SystemExit('Final generation requires review; no additional request submitted')
 time.sleep(10)
else:raise SystemExit('Final generation still pending. Existing request preserved.')
audio=W/'public/heptapod-b-encoder/hero-scrub-v2-topaz/hero-scrub-3832.mp4'
subprocess.run(['python3',str(R/'assemble.py'),'--pad-native-height','1920','--audio-reference',str(audio)],check=True)
p=R/'staging/assembly-validation.json'; report=json.loads(p.read_text())
report['visual_review']='User requested immediate assembly; review draft with known C07 railing issue'
report['release_approved']=False
report['known_issues']=[{'id':'C07','local_seconds':[2.833333,3.083333],'assembled_seconds':[37.833333,38.083333],'description':'Lift railing dissolves while all four people remain visible. Additional paid retry not performed.','evidence':'qa/C07-audit.json'}]
report['limitations']=[{'id':'C02','description':'Fourth person partly occluded while boarding; disappearance not confirmed. See qa/C02-audit.json.'},{'id':'C08','description':'Full screen coverage begins around5.33s of its6s, later than the4s prompt target.'}]
p.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
subprocess.run(['python3',str(R/'sync-status.py')],check=True)
print('FULL REVIEW READY: http://127.0.0.1:8767/video-review.html',flush=True)
