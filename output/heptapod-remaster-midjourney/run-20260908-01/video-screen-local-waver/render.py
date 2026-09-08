"""Local video-only texture displacement. No generative model or source modification."""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import cv2,numpy as np,subprocess,json,hashlib,math
R=Path(__file__).resolve().parent
SOURCE=R.with_name('video-v2-prompt-r1')/'clips'
W,H,FPS,COUNT=1920,1080,24,145

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def mask_for(frame):
 gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
 binary=(cv2.GaussianBlur(gray,(5,5),0)>185).astype(np.uint8)*255
 contours,_=cv2.findContours(binary,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 contour=max((c for c in contours if cv2.contourArea(c)>150),key=cv2.contourArea)
 hull=cv2.convexHull(contour);mask=np.zeros((H,W),np.uint8);cv2.fillConvexPoly(mask,hull,255)
 dark=cv2.dilate((gray<145).astype(np.uint8),np.ones((9,9),np.uint8));mask[dark>0]=0
 distance=cv2.distanceTransform(mask,cv2.DIST_L2,5)
 x,y,w,h=cv2.boundingRect(hull)
 edge_guard=min(8,max(2,h*.04));feather=min(18,max(3,h*.06))
 alpha=np.clip((distance-edge_guard)/feather,0,1).astype(np.float32)
 alpha=alpha*alpha*(3-2*alpha)
 return alpha,(x,y,w,h)

def render(cid):
 cv2.setNumThreads(2)
 source=SOURCE/f'{cid}.mp4';cap=cv2.VideoCapture(str(source));assert cap.isOpened()
 assert int(cap.get(cv2.CAP_PROP_FRAME_COUNT))==COUNT
 for d in ['clips','masters','validation',f'masks/{cid}']: (R/d).mkdir(parents=True,exist_ok=True)
 master=R/f'masters/{cid}.nut';output=R/f'clips/{cid}.mp4'
 command=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{H}','-r','24','-i','pipe:0','-an','-c:v','ffv1','-level','3','-coder','1','-context','1','-g','1','-threads','2','-pix_fmt','bgr0','-f','nut',str(master)]
 encoder=subprocess.Popen(command,stdin=subprocess.PIPE)
 grid_y,grid_x=np.mgrid[:H,:W].astype(np.float32);rows=[]
 for n in range(COUNT):
  ok,frame=cap.read();assert ok and frame.shape==(H,W,3)
  alpha,(x,y,w,h)=mask_for(frame)
  # Smooth local warping of existing texture only, in coordinates following the screen.
  u=(grid_x-x)/max(w,1);v=(grid_y-y)/max(h,1);t=n/FPS
  amplitude=min(4.5,max(.25,4.5*(h/H)**.75))
  dx=amplitude*(.65*np.sin(2*np.pi*(v*2.1+u*.35+t*.14))+.35*np.sin(2*np.pi*(u*2.7-v*.6-t*.19)))
  dy=amplitude*.65*(.7*np.sin(2*np.pi*(u*1.8-v*.2-t*.13))+.3*np.cos(2*np.pi*(v*2.5+u*.8+t*.17)))
  # Protect the physical rim and foreground twice: sampling and blending both taper to zero.
  map_x=(grid_x+dx*alpha).astype(np.float32);map_y=(grid_y+dy*alpha).astype(np.float32)
  warped=cv2.remap(frame,map_x,map_y,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT_101)
  result=frame.copy();inside=alpha>0
  result[inside]=np.clip(np.rint(frame[inside].astype(np.float32)+(warped[inside].astype(np.float32)-frame[inside])*alpha[inside,None]),0,255).astype(np.uint8)
  delta=np.abs(result.astype(np.int16)-frame.astype(np.int16))
  assert not np.any(delta[~inside]),'Pixels outside screen mask changed'
  cv2.imwrite(str(R/f'masks/{cid}/{n:03}.png'),(inside.astype(np.uint8)*255),[cv2.IMWRITE_PNG_COMPRESSION,9])
  rows.append({'frame':n,'bounds':[x,y,w,h],'editable_pixels':int(inside.sum()),'changed_pixels':int(np.any(delta,axis=2).sum()),'outside_mask_max_difference':0,'inside_mean_abs_difference':float(delta[inside].mean()),'peak_displacement_px':amplitude})
  encoder.stdin.write(result.tobytes())
  if n in [0,72,144]:print(cid,'processed',n,flush=True)
 cap.release();encoder.stdin.close();assert encoder.wait()==0
 # Deliver a standard browser-compatible MP4; copy source audio without reencoding.
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(master),'-i',str(source),'-map','0:v:0','-map','1:a:0?','-c:v','libx264','-preset','fast','-crf','16','-profile:v','high','-pix_fmt','yuv420p','-r','24','-g','6','-keyint_min','6','-sc_threshold','0','-video_track_timescale','12288','-threads','2','-c:a','copy','-avoid_negative_ts','disabled','-movflags','+faststart',str(output)],check=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(output)]));video=next(x for x in probe['streams'] if x['codec_type']=='video');assert int(video['nb_frames'])==COUNT and video['r_frame_rate']=='24/1'
 report={'id':cid,'method':'deterministic local texture displacement only','source':str(source),'source_sha256':digest(source),'output':str(output),'output_sha256':digest(output),'lossless_master':str(master),'mask_policy':'tracked luminous screen interior; eroded physical rim; dilated dark-foreground exclusion','max_texture_displacement_px':4.5,'new_texture_generated':False,'brightness_or_color_grade_changed':False,'camera_or_timing_changed':False,'outside_mask_pixels_changed_before_delivery_encoding':0,'mp4_note':'MP4 reencoding may cause compression-level pixel differences outside the mask; lossless master preserves the edited RGB frames exactly.','video':video,'frames':rows,'visual_user_review_pending':True}
 (R/f'validation/{cid}.json').write_text(json.dumps(report,indent=2)+'\n')
 print(cid,'READY',str(output),flush=True)
 return cid

if __name__=='__main__':
 with ProcessPoolExecutor(max_workers=2) as pool:
  for cid in pool.map(render,['C06','C08']):print('Completed',cid,flush=True)
