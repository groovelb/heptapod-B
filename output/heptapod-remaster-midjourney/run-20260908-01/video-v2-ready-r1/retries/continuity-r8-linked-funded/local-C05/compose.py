from pathlib import Path
import cv2,numpy as np,json,sys,subprocess,hashlib
cv2.setNumThreads(2)
Q=Path(__file__).resolve().parent;R=Q.parent;M=R/'local-C05-masks';SRC=R/'clips/C05.mp4'
W,H=1920,1080
cap=cv2.VideoCapture(str(SRC));frames=[]
while True:
 ok,f=cap.read()
 if not ok:break
 frames.append(f)
assert len(frames)==145
def mask(n,k=None):
 p=M/(f'{n:05}.png' if k is None else f'{n:05}-id{k}.png')
 return cv2.imread(str(p),0) if p.exists() else None
def anchor(m):
 y,x=np.where(m>0);top=int(y.min());yy,xx=np.where(m[top:top+55]>0)
 return float(np.median(xx)),float(top)
starts=[(209,733,2.35),(648,821,2.25),(1340,845,1.75),(1682,738,2.25)]
base=[anchor(mask(60,k)) for k in range(1,5)]
gains=[]
flows=[];gridx,gridy=np.meshgrid(np.arange(W,dtype=np.float32),np.arange(H,dtype=np.float32))
for k,(sx,sy,ss) in enumerate(starts,1):
 ax,ay=base[k-1];mat=np.array([[ss,0,sx-ss*ax],[0,ss,sy-ss*ay]],np.float32)
 donor=cv2.warpAffine(frames[60],mat,(W,H));dm=cv2.warpAffine(mask(60,k),mat,(W,H))
 roi=(mask(0,k)>127)&(dm>127);roi[:int(sy)]=False;roi[int(sy)+180:]=False
 gains.append(np.clip(np.median((frames[0][roi].astype(float)+2)/(donor[roi]+2.),axis=0),.45,1.3))
 firstgray=cv2.cvtColor(frames[0],cv2.COLOR_BGR2GRAY)*(mask(0,k)>0)
 nextgray=cv2.cvtColor(donor,cv2.COLOR_BGR2GRAY)*(dm>127)
 f=cv2.calcOpticalFlowFarneback(cv2.resize(firstgray,(960,540)),cv2.resize(nextgray,(960,540)),None,.5,4,31,5,7,1.5,0)
 f=cv2.resize(f,(W,H))*2;f=np.clip(f,-36,36);f=cv2.GaussianBlur(f,(15,15),4);flows.append(f)
def erase(im,n):
 m=mask(n)
 if m is None:
  m=np.zeros((H,W),np.uint8)
  if n<16:
   m=np.maximum(mask(0),np.roll(mask(0),min(120,n*7),axis=0));m[:700]=0
  elif n<32:
   for x0,y0,x1,y1 in [(100,725,590,1080),(590,900,860,1080),(1220,960,1470,1080),(1330,725,1870,1080)]:m[y0:y1,x0:x1]=255
  else:m[680:]=255
 m=cv2.dilate(m,np.ones((15,15),np.uint8))
 small=cv2.resize(im,(480,270),interpolation=cv2.INTER_AREA);ms=cv2.resize(m,(480,270),interpolation=cv2.INTER_NEAREST)
 clean=cv2.inpaint(small,ms,5,cv2.INPAINT_TELEA);clean=cv2.resize(clean,(W,H),interpolation=cv2.INTER_CUBIC)
 a=cv2.GaussianBlur(m,(15,15),3).astype(np.float32)/255
 out=im*(1-a[:,:,None])+clean*a[:,:,None]
 # Continue only observed railing strokes across person-removal holes.
 gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);edges=cv2.Canny(gray,12,28);edges[m>0]=0;edges[:830]=0
 lines=cv2.HoughLinesP(edges,1,np.pi/720,25,minLineLength=50,maxLineGap=8)
 ry=int(np.interp(n,[0,24,48,72,96,120,144],[920,910,900,885,866,849,831]))
 candidates={-1:[],1:[]}
 if lines is not None:
  for x1,y1,x2,y2 in lines.reshape(-1,4):
   if abs(x2-x1)<40:continue
   slope=(y2-y1)/(x2-x1);intercept=y1-slope*x1
   if -.85<slope<-.3 and max(x1,x2)<580 and min(y1,y2)>ry+20:candidates[-1].append((intercept,slope,(x1,y1,x2,y2)))
   if .3<slope<.85 and min(x1,x2)>1340 and min(y1,y2)>ry+20:candidates[1].append((intercept+slope*W,slope,(x1,y1,x2,y2)))
 layer=np.zeros_like(im);lm=np.zeros((H,W),np.uint8);corners=[250,1670]
 # The visible raw side rails share a smooth perspective trajectory.  Interpolate
 # their measured strokes through crew occlusion instead of switching on the
 # first frame where a Hough segment happens to exceed the detection threshold.
 ls=float(np.interp(n,[0,72,96,144],[-.60,-.624,-.657,-.736]));li=float(np.interp(n,[0,72,96,144],[1110,1110,1111,1138]))
 rs=float(np.interp(n,[0,72,96,144],[.60,.616,.645,.696]));ri=float(np.interp(n,[0,72,96,144],[1140,1161,1157,1172]))-rs*W
 candidates={-1:[(li,ls,(0,int(li),100,int(li+100*ls)))],1:[(ri+rs*W,rs,(1820,int(ri+1820*rs),1919,int(ri+1919*rs)))]}
 for side,items in candidates.items():
  if not items:continue
  _,slope,pts=min(items,key=lambda v:v[0]);x1,y1,x2,y2=pts;intercept=y1-slope*x1
  corner=int(np.clip((ry-intercept)/slope,100,1820));corners[0 if side<0 else 1]=corner
  color=tuple(float(v)*.85 for v in np.percentile(im[max(0,ry-2):ry+3,880:1100].reshape(-1,3),90,axis=0))
  p1=(0,int(intercept)) if side<0 else (corner,ry);p2=(corner,ry) if side<0 else (W-1,int(intercept+slope*(W-1)))
  cv2.line(layer,p1,p2,color,2,cv2.LINE_AA);cv2.line(lm,p1,p2,255,2,cv2.LINE_AA)
 # Rear horizontal stroke comes from an uncovered source patch, not the donor time.
 row=gray[max(0,ry-3):ry+4,850:1100].mean(axis=1);ry=ry-3+int(np.argmax(row))
 color=tuple(float(v) for v in np.percentile(im[ry,850:1100],70,axis=0))
 cv2.line(layer,(max(500,corners[0]),ry),(min(1400,corners[1]),ry),color,2,cv2.LINE_AA);cv2.line(lm,(max(500,corners[0]),ry),(min(1400,corners[1]),ry),255,2,cv2.LINE_AA)
 weight=(lm.astype(np.float32)/255)*a
 return out*(1-weight[:,:,None])+layer*weight[:,:,None]
def compose(n):
 im=frames[n]
 if n in (0,144):return im.copy()
 t=n/144.;d=int(round(60+84*t));out=erase(im,n)
 for k,(sx,sy,ss) in enumerate(starts,1):
  m=mask(d,k);ax,ay=anchor(m);bx,by=base[k-1]
  scale=ss**(1-t);tx=ax+(sx-bx)*(1-t);ty=ay+(sy-by)*(1-t)
  mat=np.array([[scale,0,tx-scale*ax],[0,scale,ty-scale*ay]],np.float32)
  fg=cv2.warpAffine(frames[d],mat,(W,H),flags=cv2.INTER_LINEAR)
  fg=fg.astype(np.float32)*(1+(gains[k-1]-1)*max(0,1-n/48))
  alpha=cv2.warpAffine(m,mat,(W,H),flags=cv2.INTER_LINEAR).astype(np.float32)/255
  if n<24:
   normalfg=fg;normalalpha=alpha
   blend=n/24.;blend=blend*blend*(3-2*blend)
   # Morph the moving actual start silhouette into the registered animated donor.
   # Both images travel on the same recession trajectory; no fixed hood overlay.
   initmat=np.array([[ss,0,sx-ss*ax],[0,ss,sy-ss*ay]],np.float32)
   df=cv2.warpAffine(frames[d],initmat,(W,H)).astype(np.float32)*(1+(gains[k-1]-1)*max(0,1-n/48))
   da=cv2.warpAffine(m,initmat,(W,H)).astype(np.float32)/255
   flow=flows[k-1]
   smx=gridx-flow[:,:,0]*blend;smy=gridy-flow[:,:,1]*blend
   dmx=gridx+flow[:,:,0]*(1-blend);dmy=gridy+flow[:,:,1]*(1-blend)
   sf=cv2.remap(frames[0].astype(np.float32),smx,smy,cv2.INTER_LINEAR)
   sa=cv2.remap(mask(0,k).astype(np.float32)/255,smx,smy,cv2.INTER_LINEAR)
   df=cv2.remap(df,dmx,dmy,cv2.INTER_LINEAR);da=cv2.remap(da,dmx,dmy,cv2.INTER_LINEAR)
   # The original lower body was outside frame; donor supplies newly revealed pixels.
   edge=np.clip((1080-gridy)/22,0,1);sw=(1-blend)*edge
   aa=sa*sw+da*(1-sw)
   pp=sf*(sa*sw)[:,:,None]+df*(da*(1-sw))[:,:,None]
   ratio=scale/ss;move=np.array([[ratio,0,tx-ratio*sx],[0,ratio,ty-ratio*sy]],np.float32)
   prem=cv2.warpAffine(pp,move,(W,H));alpha=cv2.warpAffine(aa,move,(W,H))
   fg=prem/np.maximum(alpha[:,:,None],.0001)
   bottom=ty+(H-sy)*ratio
   reveal=np.clip((gridy-(bottom-70))/65,0,1);reveal=reveal*reveal*(3-2*reveal)
   fg=fg*(1-reveal[:,:,None])+normalfg*reveal[:,:,None]
   alpha=alpha*(1-reveal)+normalalpha*reveal
  alpha=cv2.GaussianBlur(alpha,(3,3),.5)
  out=out*(1-alpha[:,:,None])+fg*alpha[:,:,None]
 return np.clip(out,0,255).astype(np.uint8)
if '--render' not in sys.argv:
 for n in [1,6,12,18,23,24,48,72,96,120,143]:
  out=compose(n);cv2.imwrite(str(Q/f'trial-{n:03}.png'),out);print(n,flush=True)
else:
 repair='--repair' in sys.argv
 OUT=Q/('C05-candidate-rail-continuous.mp4' if '--rail-fix' in sys.argv else ('C05-candidate-final.mp4' if repair else 'C05-candidate.mp4'));assert not OUT.exists()
 (Q/'frames').mkdir(exist_ok=True)
 dec=subprocess.Popen(['ffmpeg','-v','error','-i',str(SRC),'-f','rawvideo','-pix_fmt','yuv420p','-'],stdout=subprocess.PIPE)
 if repair:previous=subprocess.Popen(['ffmpeg','-v','error','-i',str(Q/'C05-candidate.mp4'),'-f','rawvideo','-pix_fmt','yuv420p','-'],stdout=subprocess.PIPE)
 enc=subprocess.Popen(['ffmpeg','-v','error','-f','rawvideo','-pixel_format','yuv420p','-video_size','1920x1080','-framerate','24','-i','-','-an','-c:v','libx264','-preset','medium','-crf','0','-pix_fmt','yuv420p',str(OUT)],stdin=subprocess.PIPE)
 for n,im in enumerate(frames):
  raw=dec.stdout.read(W*H*3//2);assert len(raw)==W*H*3//2
  if repair:
   old=previous.stdout.read(W*H*3//2);assert len(old)==W*H*3//2
   if not 25<=n<=44:
    enc.stdin.write(old)
    continue
  out=compose(n)
  if np.array_equal(im,out):encoded=raw
  else:
   a=cv2.cvtColor(im,cv2.COLOR_BGR2YUV_I420).astype(np.int16);b=cv2.cvtColor(out,cv2.COLOR_BGR2YUV_I420).astype(np.int16)
   native=np.frombuffer(raw,np.uint8).reshape(H*3//2,W).astype(np.int16);encoded=np.clip(native+b-a,0,255).astype(np.uint8).tobytes()
  enc.stdin.write(encoded);cv2.imwrite(str(Q/'frames'/f'{n:05}.jpg'),out,[cv2.IMWRITE_JPEG_QUALITY,95])
  if n%24==0:print('rendered',n,flush=True)
 enc.stdin.close();assert enc.wait()==0;assert dec.wait()==0
 if repair:assert previous.wait()==0
 (Q/('rail-fixed-process.json' if '--rail-fix' in sys.argv else ('final-process.json' if repair else 'process.json'))).write_text(json.dumps({'source':str(SRC),'output':str(OUT),'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'donor_range':[60,144],'frames':145,'fps':24,'delivery_approved':False},indent=2)+'\n')
 print(OUT,flush=True)
