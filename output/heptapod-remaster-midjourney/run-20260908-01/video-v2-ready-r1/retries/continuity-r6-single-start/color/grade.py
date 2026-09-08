from pathlib import Path
import cv2,numpy as np,json,hashlib,subprocess,sys
O=Path(__file__).resolve().parent;R=O.parents[2];cv2.setNumThreads(2)
def lab(a):return cv2.cvtColor(a.astype(np.float32)/255,cv2.COLOR_BGR2LAB)
def weight(a):
 L=a[:,:,0];return np.clip(L/16,0,1)*np.clip((80-L)/30,0,1)
regions=[[(40,400,150,600),(1770,400,1880,600),(720,910,1010,938)],[(360,350,480,600),(880,350,1050,600),(1450,350,1570,600)]]
a=[cv2.imread(str(O/'C04-0.png')),cv2.imread(str(O/'C04-144.png'))];b=[cv2.imread(str(O/'C03-120.png')),cv2.imread(str(O/'C05-0.png'))]
def pixels(a,boxes):return np.concatenate([a[y1:y2,x1:x2].reshape(-1,a.shape[-1]) for x1,y1,x2,y2 in boxes])
def transform(im,d):
 z=lab(im);z+=d[None,None,:]*weight(z)[:,:,None];return np.clip(np.rint(cv2.cvtColor(z,cv2.COLOR_LAB2BGR)*255),0,255).astype(np.uint8)
deltas=[];stats=[]
for i in range(2):
 al,bl=lab(a[i]),lab(b[i]);mask=np.zeros(al.shape[:2],bool)
 for x1,y1,x2,y2 in regions[i]:mask[y1:y2,x1:x2]=True
 diff=bl[mask]-al[mask];w=weight(al)[mask];d=np.median(diff/np.maximum(w[:,None],.1),axis=0);d=np.clip(d,[-8,-5,-5],[8,5,5]);deltas.append(d)
 corrected=transform(a[i],d);cv2.imwrite(str(O/f'C04-corrected-{i*144}.png'),corrected)
 before=np.mean(np.abs(al[mask]-bl[mask]),axis=0);after=np.mean(np.abs(lab(corrected)[mask]-bl[mask]),axis=0)
 stats.append({'rois_xyxy':regions[i],'delta_lab':d.tolist(),'paired_roi_mae_lab_before':before.tolist(),'paired_roi_mae_lab_after':after.tolist(),'source_mean_lab':al[mask].mean(0).tolist(),'target_mean_lab':bl[mask].mean(0).tolist()})
 for tag,im in [('source',a[i]),('candidate',corrected)]:
  # Both boundary frames side by side; fixed same-position ROI evidence retained above.
  pair=np.concatenate([cv2.resize(im,(960,540)),cv2.resize(b[i],(960,540))],axis=1);cv2.imwrite(str(O/f'boundary-{i}-{tag}.jpg'),pair)
(O/'fit.json').write_text(json.dumps({'method':'Fixed corresponding physical-region Lab correction, black/neutral highlight protected; no independent intensity masks','boundaries':stats,'deltas':np.array(deltas).tolist()},indent=2)+'\n')
print(json.dumps(stats))
if '--render' in sys.argv:
 src=R/'clips/C04.mp4';out=O/'C04.mp4';cap=cv2.VideoCapture(str(src));count=int(cap.get(7));assert count==145
 cmd=['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s','1920x1080','-r','24','-i','pipe:0','-i',str(src),'-map','0:v:0','-map','1:a:0?','-c:v','libx264','-crf','16','-preset','fast','-pix_fmt','yuv420p','-threads','2','-c:a','copy','-movflags','+faststart',str(out)]
 p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
 for n in range(count):
  ok,im=cap.read();assert ok;t=n/144;t=t*t*(3-2*t);d=deltas[0]*(1-t)+deltas[1]*t;p.stdin.write(transform(im,d).tobytes())
 p.stdin.close();assert p.wait()==0;cap.release();print('RENDERED',out)
