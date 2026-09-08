from pathlib import Path
import cv2,numpy as np,subprocess,json,hashlib
R=Path(__file__).resolve().parent;B=R.parents[1];O=R/'local-C05';O.mkdir(exist_ok=True);cv2.setNumThreads(2)
upper=R/'clips/C05.mp4';lower=B/'retries/attempt-2/clips/C05.mp4'
a=cv2.VideoCapture(str(upper));b=cv2.VideoCapture(str(lower))
output=O/'C05.mp4';cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s','1920x1080','-r','24','-i','pipe:0','-i',str(upper),'-map','0:v:0','-map','1:a:0?','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-g','6','-keyint_min','6','-sc_threshold','0','-video_track_timescale','12288','-threads','2','-c:a','copy',str(output)]
enc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for n in range(145):
 oa,top=a.read();ob,bot=b.read();assert oa and ob
 # Both takes share the same v2 IN/OUT photographs. Keep the clean continuous screen take above all researchers;
 # keep the previously reviewed continuously present four-person take below the empty wall band.
 y0=540; y1=650
 weight=np.clip((np.arange(1080,dtype=np.float32)-y0)/(y1-y0),0,1);weight=weight*weight*(3-2*weight)
 result=np.clip(np.rint(top.astype(np.float32)*(1-weight[:,None,None])+bot.astype(np.float32)*weight[:,None,None]),0,255).astype(np.uint8)
 if n in [0,12,24,48,72,96,120,144]:cv2.imwrite(str(O/f'{n}.jpg'),result)
 enc.stdin.write(result.tobytes())
enc.stdin.close();assert enc.wait()==0
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(O/'provenance.json').write_text(json.dumps({'output':str(output),'sha256':sha(output),'upper_source':str(upper),'upper_sha256':sha(upper),'lower_source':str(lower),'lower_sha256':sha(lower),'both_sources':'v2 F05-IN and F05-OUT selected photographs','prior_landing_footage_used':False,'screen_only_one_rectangle':True,'requires_visual_review':True},indent=2)+'\n')
print(output)
