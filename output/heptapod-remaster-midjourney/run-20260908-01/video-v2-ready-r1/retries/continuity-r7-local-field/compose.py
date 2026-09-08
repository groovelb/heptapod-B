from pathlib import Path
import cv2,numpy as np,sys,subprocess,json,hashlib
O=Path(__file__).resolve().parent;B=O.parents[1];H,W=1080,1920;X=np.arange(W);Y=np.arange(H)[:,None];cv2.setNumThreads(2)
plate=cv2.imread(str(O/'plate.jpg'));assert plate is not None

def edge(im):
 g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);z=np.argmax(g>110,axis=0).astype(float);good=(z>5)&(z<1075)&((X<500)|(X>1450));assert good.sum()>15
 return np.polyval(np.polyfit(X[good]/1920,z[good],4),X/1920)
def compose(im,mask,cid,n):
 if cid=='C02':t=max(0,(n-120)/72);s=1+.1*t;dy=0
 else:t=n/120;s=1.1+.12*t;dy=310*t*t
 M=np.float32([[s,0,960*(1-s)],[0,s,900*(1-s)+dy]])
 bg=cv2.warpAffine(plate,M,(W,H),borderMode=cv2.BORDER_REFLECT_101)
 g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32);key=np.clip((105-g)/30,0,1);a=(mask/255)*key
 if cid=='C02':
  deck=np.interp(n,[120,144,192],[912,851,672])
  a=np.where(Y>deck,(mask/255)*np.clip((65-g)/20,0,1),a)
 if cid=='C03' and n>=70:
  roi=((X[None,:]>400)&(X[None,:]<1520)&(Y>980)).astype(np.float32)
  a=np.maximum(a,key*roi)
 a=np.maximum(a,(Y<edge(im)[None,:]-1).astype(np.float32));a=cv2.GaussianBlur(a.astype(np.float32),(3,3),.45)
 out=(im*a[:,:,None]+bg*(1-a[:,:,None])).clip(0,255).astype(np.uint8)
 return out
if __name__=='__main__':
 cid=sys.argv[1];c=cv2.VideoCapture(str(B/'clips'/f'{cid}.mp4'));total=193 if cid=='C02' else 121
 preview='--preview' in sys.argv;frames=[120,144,192] if cid=='C02' else [0,24,48,84,120]
 enc=None
 if not preview:
  (O/'clips').mkdir(exist_ok=True);out=O/'clips'/f'{cid}.mp4'
  enc=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s','1920x1080','-r','24','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-g','6','-keyint_min','6','-sc_threshold','0','-video_track_timescale','12288','-threads','2',str(out)],stdin=subprocess.PIPE)
 for n in (frames if preview else range(total)):
  if preview:c.set(1,n)
  ok,im=c.read();assert ok
  if cid=='C02' and n<120:result=im
  else:
   mp=(O/'foreground-masks')/cid/f'{n:05}.png'
   if not mp.exists():mp=(O/'foreground-masks')/f'{n}-mask.png'
   mask=cv2.imread(str(mp),0);assert mask is not None,mp
   result=compose(im,mask,cid,n)
  if n in frames:cv2.imwrite(str(O/f'{cid}-{n}.jpg'),result)
  if enc:enc.stdin.write(result.tobytes())
 if enc:enc.stdin.close();assert enc.wait()==0;print('Rendered',out,flush=True)
