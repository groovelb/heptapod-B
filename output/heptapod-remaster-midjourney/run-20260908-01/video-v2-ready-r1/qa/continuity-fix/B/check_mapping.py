import cv2,numpy as np,json,hashlib
from pathlib import Path
root=Path.cwd();b=root/'output/heptapod-remaster-midjourney/run-20260908-01';out=b/'video-v2-ready-r1/qa/continuity-fix/B';master=b/'video-v2/rollback/hero-scrub/hero-scrub-1920.mp4';spec=json.loads((b/'video-v2/specs.json').read_text());clips=spec['clips'];res={}
for id,offset,ns in [('C02',96,[1,48,96,144,192]),('C05',552,[1,36,72,108,144])]:
 row=next(x for x in clips if x['id']==id);p=Path(row['source_video']);a=cv2.VideoCapture(str(master));c=cv2.VideoCapture(str(p));matches=[]
 for n in ns:
  a.set(cv2.CAP_PROP_POS_FRAMES,offset+n);_,fa=a.read();c.set(cv2.CAP_PROP_POS_FRAMES,n);_,fc=c.read();matches.append({'assembled_frame':offset+n,'source_frame':n,'mean_absolute_rgb_error':float(np.abs(fa.astype(float)-fc.astype(float)).mean())})
 res[id]={'source_path':str(p),'source_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'source_frames':int(c.get(cv2.CAP_PROP_FRAME_COUNT)),'fps':c.get(cv2.CAP_PROP_FPS),'dimensions':[int(c.get(cv2.CAP_PROP_FRAME_WIDTH)),int(c.get(cv2.CAP_PROP_FRAME_HEIGHT))],'mapping':matches}
(out/'mapping.json').write_text(json.dumps(res,indent=2));print(json.dumps(res,indent=2))
