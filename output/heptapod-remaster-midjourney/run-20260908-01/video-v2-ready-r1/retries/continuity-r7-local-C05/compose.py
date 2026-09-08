from pathlib import Path
import cv2,numpy as np,json,argparse,subprocess,hashlib,time
cv2.setNumThreads(2)
Q=Path(__file__).resolve().parent; B=Q.parent.parent
UP=B/'retries/continuity-r5/clips/C05.mp4'; LO=B/'retries/attempt-2/clips/C05.mp4'
KEY=np.array([0,24,48,72,96,120,144])
def interp(v,n):return float(np.interp(n,KEY,v))
def apparatus(n,lo,crew):
 m=np.zeros((1080,1920),np.uint8)
 xL=interp([325,346,352,362,380,397,414],n);xR=interp([1554,1540,1528,1515,1486,1460,1435],n)
 y1=interp([932,916,903,890,875,854,834],n);y2=interp([1041,1021,1010,995,976,948,927],n);y3=interp([1160,1140,1120,1100,1065,1035,1009],n)
 def line(p,w=12):cv2.polylines(m,[np.rint(p).astype(np.int32)],False,255,w,cv2.LINE_AA)
 line([[75,1080],[xL,y1],[xR,y1],[1800,1080]],16)
 line([[240,1080],[xL,y2],[xR,y2],[1620,1080]],10)
 for x in [xL,xR]:line([[x,y1],[x,y3]],14)
 xlpost=interp([215,220,235,240,248,270,300],n);xrpost=interp([1740,1730,1685,1650,1626,1589,1543],n)
 ylpost=1080+(y1-1080)*(xlpost-75)/(xL-75);yrpost=1080+(y1-1080)*(1800-xrpost)/(1800-xR)
 line([[xlpost,ylpost],[xlpost,1080]],19);line([[xrpost,yrpost],[xrpost,1080]],19)
 floor=np.array([[xL,y3],[xR,y3],[xR+120,1080],[xL-120,1080]],np.int32);cv2.fillPoly(m,[floor],255)
 # Center case visible silhouette, including changing hinged/open lid.
 case_y=interp([988,968,966,960,975,986,990],n)
 # Find actual dark support posts under top rail, using local contrast.
 gray=cv2.cvtColor(lo,cv2.COLOR_BGR2GRAY).astype(np.float32)
 ya=int(y1+14);yb=max(ya+8,int(min(y2-4,case_y-3)))
 profile=np.mean(gray[ya:yb],axis=0); smooth=cv2.GaussianBlur(profile[None,:],(81,1),0)[0]
 score=smooth-profile
 valid=(score>3)&(profile<18);valid[:600]=False;valid[1300:]=False
 valid[np.mean(crew[ya:yb]>0,axis=0)>.1]=False
 count,labels,stats,cents=cv2.connectedComponentsWithStats(valid[None,:].astype(np.uint8),8)
 for x,y,w,h,area in stats[1:]:
  if 4<=w<=28:line([[x+w/2,y1],[x+w/2,y3+3]],int(w+3))
 left=interp([876,876,869,884,913,923,924],n);right=interp([1250,1220,1210,1125,1095,1085,1075],n)
 cv2.fillPoly(m,[np.rint([[left,case_y],[right,case_y],[right+58,1080],[left-40,1080]]).astype(np.int32)],255)
 if n>=83:
  # Side cases emerge from behind crew as camera recedes.
  t=(n-83)/61
  for poly in [ [[365+185*t,1015-87*t],[605+40*t,1000-72*t],[625+25*t,1080],[350+170*t,1080]],[[1455-75*t,1018-65*t],[1530-95*t,1025-65*t],[1550-70*t,1080],[1420-50*t,1080]] ]:
   cv2.fillPoly(m,[np.rint(poly).astype(np.int32)],255)
 return m

def compose(n,up,lo,mask):
 yy,xx=np.indices((1080,1920),dtype=np.float32)
 ys=np.where(yy<=480,yy,480+160*(1-np.exp(-(yy-480)/160))).astype(np.float32)
 xs=960+(xx-960)*np.where(yy<=480,1,(ys-100)/np.maximum(yy-100,1))
 bg=cv2.remap(up,xs.astype(np.float32),ys,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
 # Keep narrow edge dilation for dark glove extremities and antialiasing.
 crew=cv2.dilate(mask,np.ones((3,3),np.uint8))
 m=np.maximum(crew,apparatus(n,lo,crew));a=cv2.GaussianBlur(m,(3,3),.55).astype(np.float32)/255
 out=(lo*a[:,:,None]+bg*(1-a[:,:,None])).astype(np.uint8)
 return out,m,bg

def main():
 p=argparse.ArgumentParser();p.add_argument('--frames',nargs='+',type=int,default=[96]);p.add_argument('--render',action='store_true');a=p.parse_args()
 u=cv2.VideoCapture(str(UP));l=cv2.VideoCapture(str(LO));wanted=range(145) if a.render else a.frames
 if a.render:
  out=Q/'C05.mp4';pipe=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s','1920x1080','-r','24','-i','-','-an','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p',str(out)],stdin=subprocess.PIPE)
 for n in wanted:
  u.set(1,n);l.set(1,n);ok,up=u.read();ok2,lo=l.read();assert ok and ok2
  mp=Q/'crew-masks'/f'{n:05}.png'
  if not mp.exists():mp=Path(f'/tmp/heptapod-sam2/C05-masks/{n:05}.png')
  if a.render:
   deadline=time.monotonic()+90
   while not mp.exists() and time.monotonic()<deadline:time.sleep(1)
  if not a.render and not mp.exists() and n==96:mp=Path('/tmp/heptapod-sam2/f96-mask.png')
  assert mp.exists(),f'mask not ready {n}'
  mask=cv2.imread(str(mp),0)
  while mask is None and a.render and time.monotonic()<deadline:
   time.sleep(1);mask=cv2.imread(str(mp),0)
  assert mask is not None
  im,m,bg=compose(n,up,lo,mask)
  if not a.render or n%12==0:
   cv2.imwrite(str(Q/f'preview-{n:03}.png'),im);cv2.imwrite(str(Q/f'mask-{n:03}.png'),m)
  if a.render:
   pipe.stdin.write(im.tobytes())
   if n%24==0:print('rendered',n,flush=True)
 if a.render:pipe.stdin.close();assert pipe.wait()==0
 print('completed',list(wanted))
if __name__=='__main__':main()
