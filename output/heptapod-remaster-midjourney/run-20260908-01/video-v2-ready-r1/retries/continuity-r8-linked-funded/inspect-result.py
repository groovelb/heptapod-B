from pathlib import Path
import cv2,numpy as np,json,sys,hashlib
O=Path(__file__).resolve().parent;B=O.parents[1];cv2.setNumThreads(2);cid=sys.argv[1]
p=Path(sys.argv[2]).resolve() if len(sys.argv)>2 else O/'clips'/f'{cid}.mp4'
D=O/'qa'/(sys.argv[3] if len(sys.argv)>3 else cid+'-local' if len(sys.argv)>2 else cid);D.mkdir(parents=True,exist_ok=True)
def frames(p):
 c=cv2.VideoCapture(str(p));fps=c.get(cv2.CAP_PROP_FPS);a=[]
 while True:
  ok,im=c.read()
  if not ok:break
  a.append(im)
 c.release();return a,fps
def label(im,t,w=480):
 h=round(im.shape[0]*w/im.shape[1]);v=cv2.resize(im,(w,h));cv2.rectangle(v,(0,0),(w,26),(0,0,0),-1);cv2.putText(v,t,(6,19),cv2.FONT_HERSHEY_SIMPLEX,.5,(0,240,255),1,cv2.LINE_AA);return v
def sheet(a,name,cols=4):
 while len(a)%cols:a.append(np.zeros_like(a[0]))
 cv2.imwrite(str(D/name),np.concatenate([np.concatenate(a[i:i+cols],axis=1) for i in range(0,len(a),cols)],axis=0))
a,fps=frames(p);assert len(a)==145 and fps==24,(len(a),fps);assert a[0].shape[:2]==(1080,1920)
spec=json.loads((O/f'spec-{cid}.json').read_text())['clips'][0];refs=spec['references'];start=cv2.imread(refs[0]['path']);end=cv2.imread(refs[-1]['path']);endpoint={}
for side,im,ref in [('start',a[0],start),('end',a[-1],end)]:
 endpoint[side]={'mean_abs_bgr_difference':float(np.abs(im.astype(float)-ref).mean()),'p95_abs_bgr_difference':float(np.percentile(np.abs(im.astype(float)-ref),95))};sheet([label(ref,'exact supplied '+side,960),label(im,'generated '+side,960)],f'{side}-reference-pair.jpg',2)
for k in range(0,145,32):sheet([label(a[n],f'{cid} f{n} {n/24:.3f}s') for n in range(k,min(k+32,145))],f'all-{k//32}.jpg')
for n in [0,1,12,24,36,48,60,72,84,96,108,120,132,144]:cv2.imwrite(str(D/f'frame-{n:03}.jpg'),a[n])
prevpath=B/'final-clips/C03.mp4' if cid=='C04' else Path(json.loads((O/'qa/C04/root-gate.json').read_text())['path']);prev,_=frames(prevpath)
sheet([label(prev[n],f'previous f{n}') for n in [len(prev)-13,len(prev)-9,len(prev)-5,len(prev)-1]]+[label(a[n],f'{cid} f{n}') for n in [1,4,8,12]],'incoming-motion.jpg')
small=[cv2.cvtColor(cv2.resize(z,(960,540)),cv2.COLOR_BGR2GRAY).astype(float) for z in prev[-13:]+a[1:14]];ds=[float(np.abs(y-x).mean()) for x,y in zip(small,small[1:])];join=ds[12];median=float(np.median(ds[:12]+ds[13:]))
r={'id':cid,'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'decoded_frames':len(a),'fps':fps,'dimensions':[1920,1080],'endpoint_image_difference':endpoint,'incoming_join':{'source':str(prevpath),'previous_last_to_this_f1_luma_mad':join,'neighbor_median_luma_mad':median,'ratio':join/max(median,.001),'differences':ds},'delivery_approved':None,'note':'Metrics are diagnostics only. Human visual review of space, people, light and motion is required.'}
(D/'technical-and-seams.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
