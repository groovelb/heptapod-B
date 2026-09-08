from pathlib import Path
import cv2,numpy as np,subprocess,json,hashlib
cv2.setNumThreads(2)
Q=Path(__file__).resolve().parent;R=Q.parent;SRC=R/'clips/C04.mp4';OUT=Q/'C04-candidate-v2-native-yuv.mp4'
assert not OUT.exists(),'immutable candidate path exists'
cap=cv2.VideoCapture(str(SRC));cap.set(1,72);ok,f72=cap.read();assert ok
ref=cv2.imread(str(Q/'plate-120-clean.png'));assert ref is not None
# Only the upper duplicate point in donor; preserve its actual lower source lamp.
def remove_extra(im):
 g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);yy,xx=np.indices(g.shape);cand=(g>150)&(yy<85)&(xx>910)&(xx<1030)
 if not cand.any():return im
 ey,ex=np.where(cand);cy=int(np.mean(ey));cx=int(np.mean(ex));m=np.zeros(g.shape,np.uint8);cv2.ellipse(m,(cx,cy),(65,50),0,0,360,255,-1);m=cv2.GaussianBlur(m,(61,61),13).astype(float)/255
 left=im[:,cx-95:cx-94].astype(float);right=im[:,cx+95:cx+96].astype(float);t=np.clip((np.arange(1920)-(cx-95))/190,0,1);fill=left*(1-t[None,:,None])+right*t[None,:,None]
 return (im*(1-m[:,:,None])+fill*m[:,:,None]).astype(np.uint8)
ref=remove_extra(ref);ref[:5]=ref[5];cv2.imwrite(str(Q/'v2-fixed-wall.png'),ref)
refmean=ref[:550,100:1820].mean(axis=(0,1));lowmean=f72[:550,100:1820].mean(axis=(0,1));offset=lowmean-refmean*.085
masks={}
for p in (R/'local-C04-masks').glob('[0-9][0-9][0-9][0-9][0-9].png'):masks[int(p.stem)]=cv2.imread(str(p),0)
cap.set(1,0)
dec=subprocess.Popen(['ffmpeg','-v','error','-i',str(SRC),'-f','rawvideo','-pix_fmt','yuv420p','-'],stdout=subprocess.PIPE)
enc=subprocess.Popen(['ffmpeg','-v','error','-f','rawvideo','-pixel_format','yuv420p','-video_size','1920x1080','-framerate','24','-i','-','-an','-c:v','libx264','-preset','medium','-crf','0','-pix_fmt','yuv420p',str(OUT)],stdin=subprocess.PIPE)
(Q/'v2-frames').mkdir(exist_ok=True);(Q/'v2-masks').mkdir(exist_ok=True);records=[]
H,W=1080,1920;size=H*W*3//2
for n in range(145):
 raw=dec.stdout.read(size);assert len(raw)==size
 ok,im=cap.read();assert ok;out=im.copy();mask=np.zeros((H,W),np.float32)
 if 72<=n<=120:
  scale=float(np.interp(n,[72,84,96,104,120],[.85,.88,.9315,.9557,1.]));ly=float(np.interp(n,[72,84,96,104,120],[169,159,145,138,127]));M=np.array([[scale,0,960*(1-scale)],[0,scale,ly-127*scale]])
  plate=cv2.warpAffine(ref,M,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
  gain=float(np.interp(n,[72,75,78,84,90,96,100,120],[.085,.12,.18,.35,.60,.9,1.,1.]))
  lift=offset*max(0,1-(n-72)/28)
  plate=np.clip(plate.astype(float)*gain+lift,0,255)
  # Same wall across the full dark area; only its exposure changes.
  mask[:900]=1;mask[900:940]=np.linspace(1,0,40)[:,None]
  if n in masks:crew=masks[n]
  elif n<72:crew=masks[72]
  else:crew=np.maximum(masks[112],masks[120])
  protect=cv2.dilate(crew,np.ones((7,7),np.uint8)).astype(float)/255
  mask*=1-protect
  # Fade starts while both walls are near-black; return after source wall is clean.
  entry=float(np.interp(n,[72,73,74,75],[0,.25,.6,1]))
  back=float(np.interp(n,[108,120],[1,0]))
  weight=entry*back;mask*=weight
  out=np.clip(im*(1-mask[:,:,None])+plate*mask[:,:,None],0,255).astype(np.uint8)
  records.append({'frame':n,'background_gain':gain,'patch_weight':weight,'scale':scale,'lamp_y':ly})
 if 78<=n<=136:out=remove_extra(out)
 # Preserve original native YUV outside modified pixels, avoiding RGB roundtrip shifts.
 if np.array_equal(im,out):encoded=raw
 else:
  a=cv2.cvtColor(im,cv2.COLOR_BGR2YUV_I420).astype(np.int16);b=cv2.cvtColor(out,cv2.COLOR_BGR2YUV_I420).astype(np.int16)
  native=np.frombuffer(raw,np.uint8).reshape(H*3//2,W).astype(np.int16);encoded=np.clip(native+b-a,0,255).astype(np.uint8).tobytes()
 enc.stdin.write(encoded)
 cv2.imwrite(str(Q/'v2-frames'/f'{n:05}.jpg'),out,[cv2.IMWRITE_JPEG_QUALITY,96])
 if 72<=n<=120:cv2.imwrite(str(Q/'v2-masks'/f'{n:05}.png'),(mask*255).astype(np.uint8))
 if n in [72,75,78,84,90,96,104,108,120,136,144]:cv2.imwrite(str(Q/f'v2-{n:03}.png'),out)
 if n%24==0:print('rendered',n,flush=True)
enc.stdin.close();assert enc.wait()==0;assert dec.wait()==0
(Q/'v2-process.json').write_text(json.dumps({'source':str(SRC),'output':str(OUT),'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'method':'Fixed clean source wall with background-only exposure curve and foreground protection; native YUV difference compositing and lossless YUV encoding.','records':records},indent=2)+'\n')
print(OUT)
