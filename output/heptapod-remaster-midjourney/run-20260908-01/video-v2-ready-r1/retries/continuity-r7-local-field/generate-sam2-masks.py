import os,time,json,sys
from pathlib import Path
import torch,cv2,numpy as np
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor
torch.set_num_threads(4);cv2.setNumThreads(2);O=Path('/tmp/heptapod-sam2-field');B=Path('/Users/ddd/Desktop/arrival/vibe-design-starterkit-v1.0/output/heptapod-remaster-midjourney/run-20260908-01/video-v2-ready-r1');cid=sys.argv[1];out=O/cid;out.mkdir(exist_ok=True);t=time.time();p=SAM2ImagePredictor(build_sam2('configs/sam2.1/sam2.1_hiera_t.yaml','/tmp/heptapod-sam2/sam2.1_hiera_tiny.pt',device='cpu'))
if cid=='C02':
 ks=[120,144,192];boxes=[[792,760,1105,1008],[760,650,1145,1005],[680,410,1250,1045]];points=[[[848,835],[920,835],[970,835],[1055,835],[950,900],[950,970],[900,936],[1000,939]],[[840,745],[918,745],[980,745],[1048,745],[950,835],[950,960],[900,880],[1000,905]],[[805,530],[905,530],[995,530],[1095,530],[950,655],[950,975],[950,755],[950,865]]];start,end=120,193
else:
 ks=[0,24,48,84,120];boxes=[[680,410,1250,1045],[620,365,1280,1080],[550,380,1330,1080],[455,490,1460,1080],[380,490,1540,1080]]
 points=[[[805,530],[905,530],[995,530],[1095,530],[950,655],[950,975]],[[780,540],[883,540],[998,540],[1100,540],[950,680],[950,1020]],[[747,580],[850,580],[1005,580],[1120,580],[950,780],[950,1000]],[[690,705],[850,705],[1035,705],[1190,705],[950,925],[870,1030]],[[650,790],[855,790],[1080,790],[1300,790],[950,1030],[800,960]]];start,end=0,121
boxes=np.array(boxes);points=np.array(points)
def lerp(values,n):
 lo=max(0,min(len(ks)-2,np.searchsorted(ks,n)-1));q=(n-ks[lo])/(ks[lo+1]-ks[lo]);return values[lo]*(1-q)+values[lo+1]*q
c=cv2.VideoCapture(str(B/'clips'/f'{cid}.mp4'));c.set(1,start)
for n in range(start,end):
 ok,im=c.read();assert ok
 if (out/f'{n:05}.png').exists():continue
 box=lerp(boxes,n);pts=lerp(points,n);neg=np.array([[max(0,box[0]-35),min(1030,box[1]+200)],[min(1919,box[2]+35),min(1030,box[1]+200)]])
 with torch.inference_mode():
  p.set_image(cv2.cvtColor(im,cv2.COLOR_BGR2RGB));m,s,_=p.predict(point_coords=np.vstack([pts,neg]),point_labels=np.r_[np.ones(len(pts)),[0,0]],box=box,multimask_output=False)
 mask=(m[0]>0).astype(np.uint8)*255;cv2.imwrite(str(out/f'{n:05}.png'),mask)
 if n%12==0 or n==end-1:
  v=im.copy();v[mask==0]=0;cv2.imwrite(str(out/f'{n:05}.jpg'),v);print(cid,n,round(time.time()-t,1),round(float(s[0]),3),flush=True)
 (out/'progress.json').write_text(json.dumps({'last_frame':n,'end':end-1,'seconds':time.time()-t}))
