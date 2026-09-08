import os,time,json,hashlib
os.environ['PYTORCH_ENABLE_MPS_FALLBACK']='1'
from pathlib import Path
import cv2,numpy as np,torch
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor
O=Path(__file__).resolve().parent;src=O.parent/'clips/C04.mp4';torch.set_num_threads(4);cv2.setNumThreads(2)
K=np.array([72,84,96,108,112]);B=np.array([
[[250,560,550,1080],[590,580,885,1080],[930,575,1230,1080],[1310,550,1630,1080]],
[[175,605,520,1080],[540,630,885,1080],[935,640,1280,1080],[1340,590,1725,1080]],
[[60,640,495,1080],[490,680,890,1080],[995,740,1360,1080],[1330,630,1785,1080]],
[[0,670,450,1080],[435,725,890,1080],[1090,785,1430,1080],[1320,670,1900,1080]],
[[0,680,440,1080],[420,735,890,1080],[1110,795,1450,1080],[1310,680,1920,1080]]],dtype=float)
heads=np.array([[[435,630],[750,655],[1080,647],[1455,620]],[[390,680],[740,700],[1095,713],[1505,661]],[[340,715],[720,755],[1180,810],[1520,715]],[[275,750],[680,810],[1275,850],[1580,752]],[[250,765],[674,830],[1300,860],[1600,770]]],float)
p=SAM2ImagePredictor(build_sam2('configs/sam2.1/sam2.1_hiera_t.yaml','/tmp/heptapod-sam2/sam2.1_hiera_tiny.pt',device='mps'));c=cv2.VideoCapture(str(src));records=[];start=time.time();colors=np.array([[0,0,255],[0,255,0],[255,0,0],[0,255,255]],float)
order=[84,96,104]+[n for n in range(72,113) if n not in [84,96,104]]
with torch.inference_mode():
 for n in order:
  c.set(1,n);ok,f=c.read();assert ok;p.set_image(cv2.cvtColor(f,cv2.COLOR_BGR2RGB));comb=np.zeros(f.shape[:2],np.uint8);overlay=f.copy();items=[]
  for i in range(4):
   box=np.array([np.interp(n,K,B[:,i,j]) for j in range(4)]);head=np.array([np.interp(n,K,heads[:,i,j]) for j in range(2)]);pts=np.array([head,[head[0],min(head[1]+180,1030)],[np.clip(head[0],box[0]+35,box[2]-35),1060]])
   pts=np.vstack([pts,[max(box[0]+30,head[0]-75) if i==0 else head[0],min(head[1]+220,1030)]])
   masks,scores,_=p.predict(point_coords=pts,point_labels=np.ones(len(pts)),box=box,multimask_output=False);m=masks[0]>0; contours,_=cv2.findContours(m.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE); filled=np.zeros_like(comb);cv2.drawContours(filled,contours,-1,255,-1);m=filled>0;comb[m]=255;overlay[m]=(overlay[m]*.55+colors[i]*.45).astype(np.uint8);items.append({'id':i+1,'pixels':int(m.sum()),'score':float(scores[0]),'box':box.tolist(),'points':pts.tolist()})
  cv2.imwrite(str(O/f'{n:05}.png'),comb)
  if n in [72,78,84,90,96,100,104,108,112]:cv2.imwrite(str(O/f'{n:05}-overlay.jpg'),overlay)
  records.append({'frame':n,'objects':items});(O/'progress.json').write_text(json.dumps({'source':str(src),'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'model':'official SAM2.1 hiera tiny','device':'mps','completed':len(records),'frames':records,'seconds':time.time()-start},indent=2));print(n,time.time()-start,flush=True)
print('DONE',flush=True)
