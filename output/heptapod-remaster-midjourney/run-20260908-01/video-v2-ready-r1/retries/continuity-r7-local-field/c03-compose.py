from pathlib import Path
import cv2,numpy as np,sys,subprocess,json,hashlib
import compose as base
O=Path(__file__).resolve().parent;B=O.parents[1];H,W=1080,1920
# Measured visible scissor pivots from this v2 C03 only. No historical/public footage.
K=np.array([60,70,84,96,108,120],np.float32)
# upper-left, upper-right, lower-left, lower-right pivots; beam width
P=np.array([[735,751,1140,754,710,921,1155,928,47],[720,795,1155,796,696,971,1172,979,50],[676,852,1207,854,670,1042,1210,1054,54],[634,914,1240,919,635,1104,1246,1120,59],[585,969,1290,974,596,1180,1290,1190,65],[536,1022,1330,1027,553,1250,1332,1260,72]],np.float32)
def support(n):
 p=np.array([np.interp(n,K,P[:,i]) for i in range(P.shape[1])]);ul,ur,ll,lr=p[:8].reshape(4,2);width=int(round(p[8]));m=np.zeros((H,W),np.uint8)
 # Two complete diagonal members and next lower pair continuing out of frame.
 for a,b in [(ul,lr),(ur,ll),(ll,ll+np.array([ur[0]-ll[0],ll[1]-ur[1]])),(lr,lr+np.array([ul[0]-lr[0],lr[1]-ul[1]]))]:cv2.line(m,tuple(a.astype(int)),tuple(b.astype(int)),255,width+5,cv2.LINE_AA)
 for q in [ul,ur,ll,lr]:cv2.circle(m,tuple(q.astype(int)),int(width*.58),255,-1,cv2.LINE_AA)
 return m.astype(np.float32)/255

def compose(im,mask,n):
 if n<70 or n>=108:return base.compose(im,mask,'C03',n)
 t=n/120;s=1.1+.12*t;dy=310*t*t
 bg=cv2.warpAffine(base.plate,np.float32([[s,0,960*(1-s)],[0,s,900*(1-s)+dy]]),(W,H),borderMode=cv2.BORDER_REFLECT_101)
 g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32);key=np.clip((105-g)/30,0,1);a=(mask/255)*key
 # Replace the broad dark-pixel rectangle with measured scissor member corridors.
 # Ramp over 8 rows to avoid introducing a horizontal matte seam.
 roi=support(n);mix=np.clip((base.Y-880)/8,0,1).astype(np.float32)
 corrected=np.maximum(a,key*roi)*roi
 a=a*(1-mix)+corrected*mix
 a=np.maximum(a,(base.Y<base.edge(im)[None,:]-1).astype(np.float32));a=cv2.GaussianBlur(a.astype(np.float32),(3,3),.45)
 return (im*a[:,:,None]+bg*(1-a[:,:,None])).clip(0,255).astype(np.uint8)

if __name__=='__main__':
 preview='--preview' in sys.argv;frames=[60,70,78,84,90,96,108,120];c=cv2.VideoCapture(str(B/'clips/C03.mp4'));enc=None
 if not preview:
  (O/'clips').mkdir(exist_ok=True);out=O/'clips/C03.mp4';enc=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s','1920x1080','-r','24','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-g','6','-keyint_min','6','-sc_threshold','0','-video_track_timescale','12288','-threads','2',str(out)],stdin=subprocess.PIPE)
 for n in (frames if preview else range(121)):
  if preview:c.set(1,n)
  ok,im=c.read();assert ok;mp=Path('/tmp/heptapod-sam2-field/C03')/f'{n:05}.png';mask=cv2.imread(str(mp),0);assert mask is not None
  result=compose(im,mask,n)
  if n in frames:cv2.imwrite(str(O/f'C03-fixed-{n}.jpg'),result)
  if enc:enc.stdin.write(result.tobytes())
 if enc:enc.stdin.close();assert enc.wait()==0;print(out,hashlib.sha256(out.read_bytes()).hexdigest())
