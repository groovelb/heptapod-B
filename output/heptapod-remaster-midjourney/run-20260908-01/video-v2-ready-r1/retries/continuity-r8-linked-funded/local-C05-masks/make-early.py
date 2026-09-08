import os,time,json,argparse
os.environ['PYTORCH_ENABLE_MPS_FALLBACK']='1'
from pathlib import Path
import cv2,numpy as np,torch
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor
O=Path(__file__).resolve().parent;torch.set_num_threads(4);cv2.setNumThreads(2)
p=SAM2ImagePredictor(build_sam2('configs/sam2.1/sam2.1_hiera_t.yaml','/tmp/heptapod-sam2/sam2.1_hiera_tiny.pt',device='mps'));c=cv2.VideoCapture(str(O.parent/'clips/C05.mp4'))
# Actual visible trajectories: original outer pair moves inward; inner pair descends out of view; new outer pair enters at sides.
K=[1,6,12,18,24,30,36,42,44]
L=[[205,825],[205,825],[195,825],[295,815],[420,820],[480,800],[550,800],[600,785],[625,780]]
R=[[1700,825],[1700,825],[1730,825],[1680,825],[1550,825],[1460,800],[1410,800],[1360,780],[1330,780]]
def interp(n,arr):return np.array([np.interp(n,K,np.array(arr)[:,j]) for j in range(2)])
order=[1,24]+[n for n in range(2,45) if n!=24];records=[]
with torch.inference_mode():
 for n in order:
  c.set(1,n);ok,f=c.read();assert ok;p.set_image(cv2.cvtColor(f,cv2.COLOR_BGR2RGB));u=np.zeros((1080,1920),np.uint8);items=[]
  prompts=[(interp(n,L),280,100),(interp(n,R),280,100)]
  if n<=28:
   x=np.interp(n,[1,12,18,24,28],[660,760,800,750,715]);y=np.interp(n,[1,12,18,24,28],[925,960,1005,1060,1090]);prompts.append((np.array([x,min(y,1074)]),125,max(20,1080-y+80)))
  if n<=17:
   x=np.interp(n,[1,12,17],[1330,1440,1490]);y=np.interp(n,[1,12,17],[935,1010,1080]);prompts.append((np.array([x,min(y,1074)]),105,max(20,1080-y+55)))
  if n>=34:
   x=np.interp(n,[34,36,42,44],[-25,0,45,75]);prompts.append((np.array([max(x,3),790]),130,90))
  if n>=38:
   x=np.interp(n,[38,42,44],[1928,1840,1800]);prompts.append((np.array([min(x,1916),795]),135,95))
  for head,half,above in prompts:
   x,y=head;box=np.array([max(0,x-half),max(600,y-above),min(1920,x+half),1080]);pts=np.array([[x,y],[x,min(y+120,1073)]] + ([[max(3,x-100),min(y+230,1060)],[min(1916,x+95),min(y+220,1060)]] if half>=200 else []))
   m,sc,_=p.predict(point_coords=pts,point_labels=np.ones(len(pts)),box=box,multimask_output=False);a=m[0].astype(np.uint8);a[:int(box[1])]=0
   # Constrain any mistaken background selection to its observed body corridor.
   a[:,:max(0,int(box[0])-25)]=0;a[:,min(1920,int(box[2])+25):]=0
   cs,_=cv2.findContours(a,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE);filled=np.zeros_like(u);cv2.drawContours(filled,cs,-1,255,-1);u=np.maximum(u,filled);items.append({'head':head.tolist(),'box':box.tolist(),'score':float(sc[0]),'pixels':int((filled>0).sum())})
  cv2.imwrite(str(O/f'{n:05}.png'),u);over=f.copy();sel=u>0;over[sel]=(over[sel]*.5+np.array([0,0,255])*.5).astype(np.uint8);cv2.imwrite(str(O/f'{n:05}-early-overlay.jpg'),over);record={'frame':n,'purpose':'conservative visible-person erase union, no identities','objects':items};(O/f'{n:05}-early.json').write_text(json.dumps(record,indent=2));records.append(record);(O/'early-progress.json').write_text(json.dumps({'completed':len(records),'frames':[r['frame'] for r in records]},indent=2));print(n,flush=True)
print('DONE',flush=True)
