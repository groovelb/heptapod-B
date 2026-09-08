from pathlib import Path
import cv2,numpy as np,json
cv2.setNumThreads(2)
Q=Path(__file__).resolve().parent;R=Q.parent;SRC=R/'clips/C04.mp4'
c=cv2.VideoCapture(str(SRC))
def frame(n):c.set(1,n);ok,im=c.read();assert ok;return im
ref=frame(120);cv2.imwrite(str(Q/'plate-120.png'),ref)
# Clean donor actors and apparatus before any geometric warp.
pm=R/'local-C04-masks/00120.png'
dmask=cv2.imread(str(pm),0) if pm.exists() else np.zeros((1080,1920),np.uint8)
if not pm.exists():
 for x0,y0,x1 in [(0,680,465),(430,740,920),(1050,785,1470),(1370,675,1919)]:cv2.rectangle(dmask,(x0,y0),(x1,1079),255,-1)
dmask=cv2.dilate(dmask,np.ones((25,25),np.uint8));dmask[920:]=255
small=cv2.resize(ref,(960,540));sm=cv2.resize(dmask,(960,540),interpolation=cv2.INTER_NEAREST)
clean=cv2.inpaint(small,sm,5,cv2.INPAINT_TELEA);clean=cv2.resize(clean,(1920,1080))
ref=np.where((dmask>0)[:,:,None],clean,ref)
ref[:5]=ref[5]
cv2.imwrite(str(Q/'plate-120-clean.png'),ref)
sift=cv2.SIFT_create(nfeatures=6000,contrastThreshold=.008,edgeThreshold=20)
gref=cv2.cvtColor(ref,cv2.COLOR_BGR2GRAY);rm=np.zeros_like(gref);rm[:650]=255;rm[:,800:1120]=0
kr,dr=sift.detectAndCompute(gref,rm)
params={84:(180,282,335),96:(494,750,895),104:(785,1010,1100)}
result=[]
for n,(top,ledge,bottom) in params.items():
 im=frame(n);cv2.imwrite(str(Q/f'source-{n:03}.png'),im);g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);tm=np.zeros_like(g);tm[:max(50,top-20)]=255;tm[:,800:1120]=0
 kt,dt=sift.detectAndCompute(g,tm);pairs=cv2.BFMatcher().knnMatch(dr,dt,k=2);good=[p[0] for p in pairs if len(p)==2 and p[0].distance<.7*p[1].distance]
 M=None;ins=None
 if len(good)>=6:
  src=np.float32([kr[p.queryIdx].pt for p in good]);dst=np.float32([kt[p.trainIdx].pt for p in good]);M,ins=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=4)
 if M is None or abs(np.linalg.det(M[:,:2])-1)>.6:M=np.array([[1.,0.,0.],[0.,1.,0.]])
 # Constrain registration to scale and measured lower/legitimate lamp center.
 scale=float(np.hypot(M[0,0],M[1,0]));scale=np.clip(scale,.88,1.02)
 def light_y(img):
  gg=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY);ms=(gg[:300,900:1030]>200).astype(np.uint8);cc,ll,ss,ct=cv2.connectedComponentsWithStats(ms,8);ys=[ct[i,1] for i in range(1,cc) if ss[i,4]>3];return max(ys) if ys else 120.
 M=np.array([[scale,0,960*(1-scale)],[0,scale,light_y(im)-scale*light_y(ref)]])
 warped=cv2.warpAffine(ref,M,(1920,1080),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
 # Preserve local background; union of black block and thin ledge only.
 mask=np.zeros((1080,1920),np.uint8)
 # Block includes its shadowed shoulder; ledge curves upward at the sides.
 cv2.rectangle(mask,(660,top-24),(1260,min(1079,ledge+30)),255,-1)
 pts=[]
 for x in range(0,1920,20):
  curve=ledge-55*((x-960)/960)**2;pts.append([x,curve-35])
 for x in range(1900,-1,-20):
  curve=ledge-55*((x-960)/960)**2;pts.append([x,curve+(bottom-ledge)+25])
 cv2.fillPoly(mask,[np.rint(pts).astype(np.int32)],255)
 # Extra upper light only (legitimate lower light remains in place).
 # The legitimate lower lamp is kept untouched; no donor light pixels used.
 cv2.rectangle(mask,(850,0),(1080,max(0,top-15)),0,-1)
 mask=cv2.GaussianBlur(mask,(51,51),10)
 xx=np.arange(1920);edge=np.clip(np.minimum(xx,1919-xx)/150,0,1)
 mask=(mask*edge[None,:]).astype(np.uint8)
 mask[940:]=0
 p=R/'local-C04-masks'/f'{n:05}.png'
 if p.exists():
  crew=cv2.imread(str(p),0);mask=(mask.astype(float)*(1-cv2.dilate(crew,np.ones((5,5),np.uint8))/255)).astype(np.uint8)
 # Scale patch to local valid wall mean near upper edge of damage.
 band=np.zeros_like(mask,bool);band[max(0,min(top-90,300)):max(1,min(top-35,355)),500:1420]=True;band &= g>7
 gains=np.clip((im[band].mean(0)+1)/(warped[band].mean(0)+1),.65,1.35) if band.sum()>100 else np.ones(3)
 # No gain on bright source or screen to avoid making a new light.
 warped=np.clip(warped.astype(float)*gains,0,255).astype(np.uint8)
 a=mask.astype(float)/255;out=(im*(1-a[:,:,None])+warped*a[:,:,None]).astype(np.uint8)
 # Remove only the extra top source point, preserving the lower real lamp.
 extra=np.zeros((1080,1920),np.uint8); eg=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
 yy,xx=np.indices(eg.shape);cand=(eg>155)&(yy<90)&(xx>900)&(xx<1030)
 if cand.any():
  ey,ex=np.where(cand);cy=int(np.mean(ey));cx=int(np.mean(ex))
  cv2.ellipse(extra,(cx,cy),(60,52),0,0,360,255,-1);extra=cv2.GaussianBlur(extra,(41,41),9)
  left=out[:,cx-85:cx-84].astype(float);right=out[:,cx+85:cx+86].astype(float);t=np.clip((np.arange(1920)-(cx-85))/170,0,1)
  fill=left*(1-t[None,:,None])+right*t[None,:,None];aa=extra.astype(float)/255
  out=(out*(1-aa[:,:,None])+fill*aa[:,:,None]).astype(np.uint8)
 cv2.imwrite(str(Q/f'trial-{n:03}.png'),out);cv2.imwrite(str(Q/f'patch-mask-{n:03}.png'),mask);cv2.imwrite(str(Q/f'warped-{n:03}.png'),warped)
 result.append({'frame':n,'matches':len(good),'inliers':int(ins.sum()) if ins is not None else 0,'matrix':M.tolist(),'gains':gains.tolist(),'crew_mask_ready':p.exists()})
(Q/'trial-registration.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
