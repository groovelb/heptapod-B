import os,time,json,hashlib,argparse
os.environ['PYTORCH_ENABLE_MPS_FALLBACK']='1'
from pathlib import Path
import cv2,numpy as np,torch
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor
ap=argparse.ArgumentParser();ap.add_argument('--frames',default='0,45,48,96,144');a=ap.parse_args();order=[int(x) for x in a.frames.split(',')];O=Path(__file__).resolve().parent;src=O.parent/'clips/C05.mp4';torch.set_num_threads(4);cv2.setNumThreads(2)
K=np.array([0,45,48,60,72,96,120,144]);heads=np.array([
[[210,820],[660,915],[1330,920],[1700,835]],[[90,770],[635,765],[1310,780],[1780,780]],[[130,770],[638,762],[1300,782],[1725,775]],[[265,755],[710,758],[1210,754],[1595,759]],[[356,740],[740,735],[1180,740],[1490,740]],[[475,720],[790,720],[1117,718],[1362,720]],[[530,708],[814,710],[1060,710],[1297,710]],[[549,700],[820,700],[1060,700],[1280,700]]],float)
# Explicit bboxes, left-to-right IDs within each frame (not a claim of raw temporal identity).
boxes=np.array([
[[0,725,440,1080],[420,810,845,1080],[1160,835,1460,1080],[1450,725,1920,1080]],
[[0,695,230,1080],[435,690,780,1080],[1140,705,1480,1080],[1610,700,1920,1080]],
[[0,700,250,1080],[435,690,790,1080],[1130,705,1480,1080],[1560,700,1890,1080]],
[[45,685,375,1080],[540,685,840,1080],[1070,685,1380,1080],[1450,685,1790,1080]],
[[175,680,460,1080],[590,675,860,1080],[1060,675,1340,1080],[1370,675,1660,1080]],
[[330,665,570,1080],[670,665,900,1080],[995,665,1230,1080],[1250,665,1480,1080]],
[[405,650,610,1080],[705,650,910,1080],[965,650,1170,1080],[1210,650,1405,1080]],
[[430,642,635,1080],[720,642,920,1080],[970,642,1170,1080],[1190,642,1385,1080]]],float)
p=SAM2ImagePredictor(build_sam2('configs/sam2.1/sam2.1_hiera_t.yaml','/tmp/heptapod-sam2/sam2.1_hiera_tiny.pt',device='mps'));c=cv2.VideoCapture(str(src));start=time.time();colors=np.array([[0,0,255],[0,255,0],[255,0,0],[0,255,255]],float);records=[]
with torch.inference_mode():
 for n in order:
  c.set(1,n);ok,f=c.read();assert ok;p.set_image(cv2.cvtColor(f,cv2.COLOR_BGR2RGB));comb=np.zeros(f.shape[:2],np.uint8);lab=np.zeros_like(comb);overlay=f.copy();items=[]
  for i in range(4):
   box=np.array([np.interp(n,K,boxes[:,i,j]) for j in range(4)]);head=np.array([np.interp(n,K,heads[:,i,j]) for j in range(2)]);pts=np.array([head,[head[0],min(head[1]+155,1030)],[max(box[0]+10,head[0]-35),min(head[1]+315,1055)],[max(box[0]+15,head[0]-30),min(head[1]+225,1040)]])
   masks,scores,_=p.predict(point_coords=pts,point_labels=np.ones(len(pts)),box=box,multimask_output=False);m=masks[0]>0;contours,_=cv2.findContours(m.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE);filled=np.zeros_like(comb);cv2.drawContours(filled,contours,-1,255,-1);m=filled>0;comb[m]=255;lab[m]=i+1;overlay[m]=(overlay[m]*.55+colors[i]*.45).astype(np.uint8);cv2.imwrite(str(O/f'{n:05}-id{i+1}.png'),filled);ys,xs=np.where(m);items.append({'id':i+1,'pixels':int(m.sum()),'score':float(scores[0]),'prompt_box':box.tolist(),'points':pts.tolist(),'mask_bbox':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]})
  cv2.imwrite(str(O/f'{n:05}.png'),comb);cv2.imwrite(str(O/f'{n:05}-labels.png'),lab)
  if n in [0,45,48,60,72,84,96,108,120,132,144]:cv2.imwrite(str(O/f'{n:05}-overlay.jpg'),overlay)
  record={'frame':n,'objects':items};records.append(record);(O/f'{n:05}.json').write_text(json.dumps(record,indent=2));(O/'progress.json').write_text(json.dumps({'source':str(src),'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'model':'official SAM2.1 hiera tiny','device':'mps','completed_this_run':len(records),'frames':records,'seconds':time.time()-start},indent=2));print(n,time.time()-start,flush=True)
print('DONE',flush=True)
