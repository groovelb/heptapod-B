import cv2,json,pathlib
import numpy as np
R=pathlib.Path(__file__).resolve().parents[2]
paths=[R/'rollback/hero-scrub/hero-scrub-1920.mp4',R/'staging/hero-scrub-1920.mp4']
caps=[cv2.VideoCapture(str(p)) for p in paths]
frames=[(96,97),(288,289),(408,409),(552,553),(696,697),(840,841),(984,985)]
records=[]
for i,(a,b) in enumerate(frames,1):
 rows=[]
 for label,cap in zip(['current','prepared'],caps):
  tiles=[]
  for n in [a-12,a,b,b+12]:
   cap.set(cv2.CAP_PROP_POS_FRAMES,n);ok,f=cap.read();assert ok
   f=cv2.resize(f,(480,270));cv2.putText(f,f'{label} frame {n}',(8,20),cv2.FONT_HERSHEY_SIMPLEX,.55,(255,255,255),1)
   tiles.append(f)
  rows.append(np.hstack(tiles))
 path=R/f'qa/root/seam-{i}.jpg';cv2.imwrite(str(path),np.vstack(rows))
 records.append({'boundary':i,'frames':[a-12,a,b,b+12],'path':str(path)})
for c in caps:c.release()
(R/'qa/root/seam-samples.json').write_text(json.dumps(records,indent=2)+'\n')
print('7 seam comparison sheets saved')
