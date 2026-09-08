from pathlib import Path
import cv2,numpy as np,json,subprocess
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
keys=[75,78,84,90,96,98,100,102,104,106,108]
tops=[-25,48,180,320,494,565,655,735,785,900,1030]
ledges=[-5,82,282,505,750,840,935,1040,1130,1240,1340]
bots=[20,115,335,595,895,990,1090,1200,1300,1400,1500]
params={n:tuple(int(np.interp(n,keys,v)) for v in [tops,ledges,bots]) for n in range(145)}
(Q/'frames').mkdir(exist_ok=True);(Q/'masks').mkdir(exist_ok=True)
pipe=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pixel_format','bgr24','-video_size','1920x1080','-framerate','24','-i','-','-an','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p',str(Q/'C04-candidate.mp4')],stdin=subprocess.PIPE)
result=[]
for n,(top,ledge,bottom) in params.items():
 im=frame(n)
 if n<75 or n>136:
  pipe.stdin.write(im.tobytes());cv2.imwrite(str(Q/'frames'/f'{n:05}.jpg'),im,[cv2.IMWRITE_JPEG_QUALITY,95]);continue
 g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);tm=np.zeros_like(g);tm[:max(50,top-20)]=255;tm[:,800:1120]=0
 kt,dt=sift.detectAndCompute(g,tm);pairs=cv2.BFMatcher().knnMatch(dr,dt,k=2);good=[p[0] for p in pairs if len(p)==2 and p[0].distance<.7*p[1].distance]
 M=None;ins=None
 if len(good)>=6:
  src=np.float32([kr[p.queryIdx].pt for p in good]);dst=np.float32([kt[p.trainIdx].pt for p in good]);M,ins=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=4)
 if M is None or abs(np.linalg.det(M[:,:2])-1)>.6:M=np.array([[1.,0.,0.],[0.,1.,0.]])
 # Constrain registration to scale and measured lower/legitimate lamp center.
 scale=float(np.interp(n,[75,84,96,104,120],[.86,.88,.9315,.9557,1.]))
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
 # Spatial feather below moving ledge; this never blends whole frames in time.
 if n<92:
  ext=np.zeros_like(mask);ybase=min(1079,bottom)
  cv2.rectangle(ext,(0,max(0,ybase-35)),(1919,min(1079,ybase+145)),255,-1)
  ramp=np.clip((ybase+145-np.arange(1080))/180,0,1)
  ext=(ext*ramp[:,None]).astype(np.uint8);mask=np.maximum(mask,ext)
 mask=cv2.GaussianBlur(mask,(51,51),10)
 if n>108:mask[:]=0
 xx=np.arange(1920);edge=np.clip(np.minimum(xx,1919-xx)/150,0,1)
 mask=(mask*edge[None,:]).astype(np.uint8)
 mask[940:]=0
 p=R/'local-C04-masks'/f'{n:05}.png'
 if p.exists():
  crew=cv2.imread(str(p),0);mask=(mask.astype(float)*(1-cv2.dilate(crew,np.ones((5,5),np.uint8))/255)).astype(np.uint8)
 # Scale patch to local valid wall mean near upper edge of damage.
 band=np.zeros_like(mask,bool);band[max(0,min(top-90,300)):max(1,min(top-35,355)),500:1420]=True;band &= g>7
 gains=np.array([np.interp(n,[75,84,96,104],[.90,.91676,.98829,.99396]),np.interp(n,[75,84,96,104],[.915,.93042,.99617,.99833]),np.interp(n,[75,84,96,104],[.89,.90241,1.00160,.99817])])
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
 pipe.stdin.write(out.tobytes());cv2.imwrite(str(Q/'frames'/f'{n:05}.jpg'),out,[cv2.IMWRITE_JPEG_QUALITY,95]);cv2.imwrite(str(Q/'masks'/f'{n:05}.png'),mask)
 if n in [75,78,84,96,104,108,120,132]:cv2.imwrite(str(Q/f'candidate-{n:03}.png'),out)
 if n%12==0:print('rendered',n,flush=True)
 result.append({'frame':n,'matches':len(good),'inliers':int(ins.sum()) if ins is not None else 0,'matrix':M.tolist(),'gains':gains.tolist(),'crew_mask_ready':p.exists()})
pipe.stdin.close();assert pipe.wait()==0
(Q/'registration.json').write_text(json.dumps(result,indent=2)+'\n');print('145 frame candidate ready')
