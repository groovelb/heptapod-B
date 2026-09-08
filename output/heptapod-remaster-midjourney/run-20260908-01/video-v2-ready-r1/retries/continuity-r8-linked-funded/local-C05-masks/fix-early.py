import os,json
os.environ['PYTORCH_ENABLE_MPS_FALLBACK']='1'
from pathlib import Path
import numpy as np,cv2,torch
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor
O=Path(__file__).resolve().parent;torch.set_num_threads(4);cv2.setNumThreads(2);c=cv2.VideoCapture(str(O.parent/'clips/C05.mp4'));p=SAM2ImagePredictor(build_sam2('configs/sam2.1/sam2.1_hiera_t.yaml','/tmp/heptapod-sam2/sam2.1_hiera_tiny.pt',device='mps'))
with torch.inference_mode():
 for n in list(range(14,18))+list(range(25,29))+list(range(31,45)):
  c.set(1,n);_,f=c.read();u=cv2.imread(str(O/f'{n:05}.png'),0)
  if 14<=n<=17:
   # Removing the background rectangle left of the sinking right-inner head.
   u[1018:,1300:1430]=0
  if 25<=n<=28:
   u[:,610:860]=0
   if n<=27:
    top={25:1018,26:1038,27:1065}[n];cv2.ellipse(u,(747,top+52),(76,52),0,180,360,255,-1);u[top+52:,671:823]=255
  if n>=31:
   p.set_image(cv2.cvtColor(f,cv2.COLOR_BGR2RGB));extent=int(np.interp(n,[31,34,38,44],[25,90,180,285]))
   # Erase old incomplete side mask before replacing with current visible edge-person mask.
   u[:,:extent]=0;u[:,1920-extent:]=0
   for side in [0,1]:
    box=np.array([0,710,extent,1080]) if side==0 else np.array([1920-extent,710,1920,1080]);x=8 if side==0 else 1912
    pts=[[x,1038],[x,900]]
    if n>=35:pts.append([min(extent-10,45) if side==0 else max(1920-extent+10,1875),800])
    m,_,_=p.predict(point_coords=np.array(pts),point_labels=np.ones(len(pts)),box=box,multimask_output=False);a=m[0].astype(np.uint8);a[:715]=0;a[:,:int(box[0])]=0;a[:,int(box[2]):]=0;cs,_=cv2.findContours(a,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE);b=np.zeros_like(u);cv2.drawContours(b,cs,-1,255,-1);u=np.maximum(u,b)
  cv2.imwrite(str(O/f'{n:05}.png'),u);over=f.copy();sel=u>0;over[sel]=(over[sel]*.5+np.array([0,0,255])*.5).astype(np.uint8);cv2.imwrite(str(O/f'{n:05}-early-overlay.jpg'),over);print(n,flush=True)
