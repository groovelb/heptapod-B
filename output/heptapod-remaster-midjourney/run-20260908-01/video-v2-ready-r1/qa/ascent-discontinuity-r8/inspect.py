from pathlib import Path
import cv2,numpy as np,json,hashlib
O=Path(__file__).resolve().parent;B=O.parents[1];cv2.setNumThreads(2)
p=B/'staging/hero-scrub-1920.mp4';c=cv2.VideoCapture(str(p));frames={};metrics=[];prev=None;n=0
while True:
 ok,im=c.read()
 if not ok:break
 if 275<=n<=710:
  f=cv2.resize(im,(960,540));frames[n]=f
  g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
  if prev is not None:metrics.append({'frame':n,'seconds':n/24,'mad':float(np.abs(g-prev).mean()),'p95':float(np.percentile(np.abs(g-prev),95))})
  prev=g
 n+=1
c.release()
def sheet(ids,name,cols=4):
 tiles=[]
 for n in ids:
  f=cv2.resize(frames[n],(480,270));cv2.putText(f,f'{n/24:.3f}s  frame {n}',(8,22),cv2.FONT_HERSHEY_SIMPLEX,.6,(0,220,255),1,cv2.LINE_AA);tiles.append(f)
 while len(tiles)%cols:tiles.append(np.zeros_like(tiles[0]))
 cv2.imwrite(str(O/name),np.concatenate([np.concatenate(tiles[i:i+cols],axis=1) for i in range(0,len(tiles),cols)],axis=0))
sheet(list(range(288,697,12)),'ascent-overview.jpg')
for k in [289,409,553,697]:sheet(list(range(k-4,k+4)),f'boundary-{k}.jpg')
for lo,hi in [(448,500),(500,553)]:sheet(list(range(lo,hi,3)),f'C04-internal-{lo}.jpg')
(O/'frame-differences.json').write_text(json.dumps({'master_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'metrics':metrics,'top_changes':sorted(metrics,key=lambda x:-x['mad'])[:20]},indent=2)+'\n')
print(json.dumps(sorted(metrics,key=lambda x:-x['mad'])[:12]))
