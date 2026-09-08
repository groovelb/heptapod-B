"""Finish v2-only repairs; never read prior landing frames as visual input."""
from pathlib import Path
import cv2,numpy as np,subprocess,json,hashlib,importlib.util,argparse
R=Path(__file__).resolve().parent;BASE=R.parents[1];RUN=BASE.parent
cv2.setNumThreads(2)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def frame(p,index):
 c=cv2.VideoCapture(str(p));n=int(c.get(cv2.CAP_PROP_FRAME_COUNT));c.set(cv2.CAP_PROP_POS_FRAMES,index if index>=0 else n+index);ok,a=c.read();c.release();assert ok,(p,index)
 return cv2.resize(a,(1920,1080))
def stats(a):
 small=cv2.resize(a,(480,270)).astype(np.float32);l=small.mean(2);pix=small[(l>15)&(l<180)]
 assert len(pix)>300
 return np.percentile(pix,[20,40,60,80],axis=0)
def fit(source,target):
 # Small additive corrections keep the neutral white screen neutral; channel gains tint highlights.
 return np.ones(3,dtype=np.float32),np.clip((target-source).mean(axis=0),-3,3).astype(np.float32)
def fog(src,tex):
 # Luminance mask selects the single screen, protecting its boundary and all dark foreground.
 grey=cv2.cvtColor(src,cv2.COLOR_BGR2GRAY);binary=(cv2.GaussianBlur(grey,(5,5),0)>185).astype(np.uint8)*255
 contours,_=cv2.findContours(binary,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 eligible=[c for c in contours if cv2.contourArea(c)>150]
 if not eligible:return src
 contour=max(eligible,key=cv2.contourArea);hull=cv2.convexHull(contour)
 mask=np.zeros(grey.shape,np.uint8);cv2.fillConvexPoly(mask,hull,255);mask[cv2.dilate((grey<145).astype(np.uint8),np.ones((9,9),np.uint8))>0]=0
 x,y,w,h=cv2.boundingRect(hull);distance=cv2.distanceTransform(mask,cv2.DIST_L2,5)
 a=np.clip((distance-min(8,max(2,h*.04)))/min(18,max(3,h*.06)),0,1);a=a*a*(3-2*a)
 texture=cv2.cvtColor(tex,cv2.COLOR_BGR2GRAY).astype(np.float32);texture=cv2.GaussianBlur(texture,(0,0),2)
 texture=np.clip((texture-texture.mean())/max(texture.std(),2),-2.4,2.4);layer=cv2.resize(texture,(w,h))
 local=src[y:y+h,x:x+w].astype(np.float32);weight=(a[y:y+h,x:x+w]>0).astype(np.float32);sigma=max(4,h*.09)
 illumination=cv2.GaussianBlur(local*weight[:,:,None],(0,0),sigma)/np.maximum(cv2.GaussianBlur(weight,(0,0),sigma)[:,:,None],1e-5)
 grain=local-cv2.GaussianBlur(local,(0,0),1);target=np.clip(illumination+layer[:,:,None]*14+grain*.35,0,255)
 alpha=a[y:y+h,x:x+w]*.9;out=src.copy();out[y:y+h,x:x+w]=np.clip(np.rint(local*(1-alpha[:,:,None])+target*alpha[:,:,None]),0,255).astype(np.uint8)
 return out

def main():
 sources={f'C{i:02d}':BASE/'final-clips'/f'C{i:02d}.mp4' for i in range(1,9)}
 sources['C05']=R/'local-C05/C05.mp4'
 assert all(p.is_file() for p in sources.values()),'Replacement clip not downloaded; do not substitute old footage'
 changed={'C04','C05'};endpoints={c:[stats(frame(p,0)),stats(frame(p,-1))] for c,p in sources.items()}
 desired={c:[v[0].copy(),v[1].copy()] for c,v in endpoints.items()}
 order=list(sources)
 for a,b in zip(order,order[1:]):
  if a not in changed and b not in changed:continue
  target=(endpoints[a][1]+endpoints[b][0])/2 if a in changed and b in changed else endpoints[b][0] if b not in changed else endpoints[a][1]
  if a in changed:desired[a][1]=target
  if b in changed:desired[b][0]=target
 outdir=R/'processed';outdir.mkdir(exist_ok=True);reports=[]
 for cid in sorted(changed):
  source=sources[cid];cap=cv2.VideoCapture(str(source));count=int(cap.get(cv2.CAP_PROP_FRAME_COUNT));assert count==(193 if cid=='C02' else 145)
  gs,bs=fit(endpoints[cid][0],desired[cid][0]);ge,be=fit(endpoints[cid][1],desired[cid][1])
  output=outdir/f'{cid}.mp4';fogcap=cv2.VideoCapture(str(RUN/'video-screen-fog-plate-r1/fog-plate.mp4')) if cid=='C06' else None
  command=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s','1920x1080','-r','24','-i','pipe:0','-i',str(source),'-map','0:v:0','-map','1:a:0?','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-g','6','-keyint_min','6','-sc_threshold','0','-video_track_timescale','12288','-threads','2','-c:a','copy','-movflags','+faststart',str(output)]
  enc=subprocess.Popen(command,stdin=subprocess.PIPE)
  for n in range(count):
   ok,im=cap.read();assert ok
   im=cv2.resize(im,(1920,1080))
   if fogcap is not None:
    okf,tex=fogcap.read();assert okf;im=fog(im,tex)
   t=n/(count-1);t=t*t*(3-2*t);gain=gs*(1-t)+ge*t;offset=bs*(1-t)+be*t
   # One spatially uniform, smooth color transform: no geometry remap or frame blending.
   light=im.mean(2).astype(np.float32);protect=np.minimum(np.clip(light/12,0,1),np.clip((245-light)/65,0,1));pixels=np.clip(np.rint(im.astype(np.float32)+offset*protect[:,:,None]),0,255).astype(np.uint8);enc.stdin.write(pixels.tobytes())
  cap.release();enc.stdin.close();assert enc.wait()==0
  if fogcap is not None:fogcap.release()
  reports.append({'id':cid,'source':str(source),'source_sha256':sha(source),'output':str(output),'sha256':sha(output),'frames':count,'color_gain_start_bgr':gs.tolist(),'color_gain_end_bgr':ge.tolist(),'color_offset_start_bgr':bs.tolist(),'color_offset_end_bgr':be.tolist(),'method':'smooth full-clip endpoint color matching, no geometry or time remap','approved_fog_reapplied':cid=='C06'})
  print(cid,'processed',flush=True)
 (R/'processing.json').write_text(json.dumps({'clips':reports,'unchanged_clips':['C01','C02','C03','C06','C07','C08'],'uses_prior_landing_visuals':False},indent=2)+'\n')
if __name__=='__main__':main()
