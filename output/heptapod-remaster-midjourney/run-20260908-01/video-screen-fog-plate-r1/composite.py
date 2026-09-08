"""Composite a generated fog layer inside the screen; never remap source pixels."""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import cv2,numpy as np,subprocess,json,hashlib,importlib.util
R=Path(__file__).resolve().parent;BASE=R.with_name('video-v2-prompt-r1')/'clips';OLD=R.with_name('video-screen-local-waver')
spec=importlib.util.spec_from_file_location('screenmask',OLD/'render.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
W,H,N=1920,1080,145

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def packets(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_packets','-show_data_hash','sha256','-show_entries','packet=pts,dts,duration,size,data_hash','-of','json',str(p)]))['packets']

def render(cid):
 cv2.setNumThreads(2)
 source=BASE/f'{cid}.mp4';cap=cv2.VideoCapture(str(source));fogcap=cv2.VideoCapture(str(R/'fog-plate.mp4'))
 assert cap.isOpened() and fogcap.isOpened();assert int(cap.get(cv2.CAP_PROP_FRAME_COUNT))==N;assert int(fogcap.get(cv2.CAP_PROP_FRAME_COUNT))==N
 for d in ['clips','masters','validation','samples']:(R/d).mkdir(exist_ok=True)
 master=R/f'masters/{cid}.nut';out=R/f'clips/{cid}.mp4'
 enc=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{H}','-r','24','-i','pipe:0','-an','-c:v','ffv1','-level','3','-coder','1','-context','1','-g','1','-threads','2','-pix_fmt','bgr0','-f','nut',str(master)],stdin=subprocess.PIPE)
 rows=[]
 for n in range(N):
  ok,src=cap.read();okf,fog=fogcap.read();assert ok and okf
  alpha,(x,y,w,h)=mod.mask_for(src)
  # Resize ONLY the new atmosphere into the tracked screen. Source geometry remains untouched.
  grey=cv2.cvtColor(fog,cv2.COLOR_BGR2GRAY).astype(np.float32);grey=cv2.GaussianBlur(grey,(0,0),2.0)
  grey=(grey-float(grey.mean()))/max(float(grey.std()),2.0);grey=np.clip(grey,-2.4,2.4)
  layer=cv2.resize(grey,(w,h),interpolation=cv2.INTER_LINEAR)
  local=src[y:y+h,x:x+w].astype(np.float32)
  weight=(alpha[y:y+h,x:x+w]>0).astype(np.float32)
  sigma=max(4,h*.09)
  denominator=cv2.GaussianBlur(weight,(0,0),sigma)
  illumination=cv2.GaussianBlur(local*weight[:,:,None],(0,0),sigma)/np.maximum(denominator[:,:,None],1e-5)
  grain=local-cv2.GaussianBlur(local,(0,0),1.0)
  target=np.clip(illumination+layer[:,:,None]*14.0+grain*.35,0,255)
  a=alpha[y:y+h,x:x+w]*.9
  result=src.copy();region=result[y:y+h,x:x+w]
  inside=a>0
  region[inside]=np.clip(np.rint(local[inside]*(1-a[inside,None])+target[inside]*a[inside,None]),0,255).astype(np.uint8)
  allowed=alpha>0;delta=np.abs(result.astype(np.int16)-src.astype(np.int16));assert not np.any(delta[~allowed])
  rows.append({'frame':n,'screen_bounds':[x,y,w,h],'changed_pixels':int(np.any(delta,axis=2).sum()),'outside_mask_max_difference':0,'source_coordinate_displacement':0,'inside_mean_abs_difference':float(delta[allowed].mean())})
  if n in [0,48,96,144]:
   cv2.imwrite(str(R/f'samples/{cid}-{n:03}-result.jpg'),result)
  enc.stdin.write(result.tobytes())
  if n in [0,72,144]:print(cid,'composited',n,flush=True)
 cap.release();fogcap.release();enc.stdin.close();assert enc.wait()==0
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(master),'-i',str(source),'-map','0:v:0','-map','1:a:0?','-c:v','libx264','-preset','fast','-crf','16','-profile:v','high','-pix_fmt','yuv420p','-r','24','-g','6','-keyint_min','6','-sc_threshold','0','-video_track_timescale','12288','-threads','2','-c:a','copy','-avoid_negative_ts','disabled','-movflags','+faststart',str(out)],check=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(out)]));v=next(s for s in probe['streams'] if s['codec_type']=='video');assert int(v['nb_frames'])==N and v['r_frame_rate']=='24/1';assert packets(source)==packets(out)
 record={'id':cid,'source':str(source),'source_sha256':sha(source),'fog_plate':str(R/'fog-plate.mp4'),'fog_plate_sha256':sha(R/'fog-plate.mp4'),'output':str(out),'output_sha256':sha(out),'method':'generated atmosphere layer composited within tracked screen interior','source_image_remapping':False,'source_camera_or_timing_changed':False,'audio_packets_and_timestamps_identical':True,'outside_mask_pixels_changed_before_encoding':0,'mp4_compression_note':'Standard H264 delivery introduces compression differences; lossless master retains the composed source-exterior pixels exactly.','video':v,'frames':rows,'user_review_pending':True}
 (R/f'validation/{cid}.json').write_text(json.dumps(record,indent=2)+'\n');print('READY',cid,str(out),flush=True)
 return cid

if __name__=='__main__':
 with ProcessPoolExecutor(max_workers=2) as pool:
  for cid in pool.map(render,['C06','C08']):print('Completed',cid,flush=True)
