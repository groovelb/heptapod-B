from pathlib import Path
import cv2,numpy as np,json,hashlib
out=Path(__file__).resolve().parent;r=out.parents[3];run=out.parents[1];refs=json.loads((run/'input-provenance.json').read_text());ref=refs[0];src=Path(ref['video']);c=cv2.VideoCapture(str(src));frames=[]
for n in range(109,121):
 c.set(cv2.CAP_PROP_POS_FRAMES,n);ok,im=c.read();assert ok;frames.append(im)
assert hashlib.sha256(src.read_bytes()).hexdigest()==ref['video_sha256'];assert hashlib.sha256(Path(ref['path']).read_bytes()).hexdigest()==ref['sha256'];inp=cv2.imread(ref['path']);err=np.abs(frames[-1].astype(np.int16)-inp.astype(np.int16));print('inputpixelerror',err.mean(),err.max())
ts=[]
for n,im in zip(range(109,121),frames):
 a=cv2.resize(im,(640,360));a=cv2.copyMakeBorder(a,26,0,0,0,cv2.BORDER_CONSTANT);cv2.putText(a,f'C03 f{n} {n/24:.3f}s',(7,18),cv2.FONT_HERSHEY_SIMPLEX,.55,(255,255,255),1);ts.append(a)
cv2.imwrite(str(out/'C03-last12.jpg'),np.vstack([np.hstack(ts[k:k+3]) for k in range(0,12,3)]));cv2.imwrite(str(out/'C03-last-native.jpg'),frames[-1])
regions={'crew':[450,390,1420,920],'rail':[300,580,1600,1010],'aperture_rim':[40,0,1880,650]};motion={}
for name,(x1,y1,x2,y2) in regions.items():
 pair=[]
 for k in range(11):
  g=cv2.cvtColor(frames[k],cv2.COLOR_BGR2GRAY);g2=cv2.cvtColor(frames[k+1],cv2.COLOR_BGR2GRAY);m=np.zeros(g.shape,np.uint8);m[y1:y2,x1:x2]=255;pts=cv2.goodFeaturesToTrack(g,200,.03,12,mask=m);q,st,er=cv2.calcOpticalFlowPyrLK(g,g2,pts,None);d=(q-pts).reshape(-1,2);ok=st.reshape(-1).astype(bool)&(er.reshape(-1)<15);delta=d[ok];pair.append({'from_frame':109+k,'tracked':int(ok.sum()),'median_dx':float(np.median(delta[:,0])),'median_dy':float(np.median(delta[:,1])),'median_magnitude':float(np.median(np.linalg.norm(delta,axis=1)))})
 motion[name]={'roi':[x1,y1,x2,y2],'pairs':pair,'limitation':'ROI optical-flow summary contains mixed features; corroborates visual trajectory only, not camera calibration or automatic approval.'}
res={'source':ref,'source_fps':c.get(cv2.CAP_PROP_FPS),'source_frame_count':int(c.get(cv2.CAP_PROP_FRAME_COUNT)),'input_vs_decoded_last':{'mean_absolute_channel_error':float(err.mean()),'max_channel_error':int(err.max()),'pixel_equal':bool(not err.any())},'checked_frames':list(range(109,121)),'feature_motion':motion};(out/'C03-preflight-measurements.json').write_text(json.dumps(res,indent=2));print(json.dumps({k:[round(np.median([p['median_dx'] for p in v['pairs']]),3),round(np.median([p['median_dy'] for p in v['pairs']]),3)] for k,v in motion.items()}))
