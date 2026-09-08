from pathlib import Path
import cv2,numpy as np,json
Q=Path(__file__).resolve().parent;B=Q.parent.parent
sources={'C04-last':B/'retries/continuity-r6-single-start/color/C04.mp4','C05-first':Q/'C05.mp4','C05-last':Q/'C05.mp4','C06-first':B/'final-clips/C06.mp4'}
frames={};metrics={}
for k,p in sources.items():
 c=cv2.VideoCapture(str(p));n=int(c.get(cv2.CAP_PROP_FRAME_COUNT));idx=n-1 if 'last' in k else 0;c.set(1,idx);ok,im=c.read();assert ok;frames[k]=im;cv2.imwrite(str(Q/f'seam-{k}.png'),im)
 lab=cv2.cvtColor(im,cv2.COLOR_BGR2LAB).astype(float);g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);m=np.zeros(g.shape,bool);m[140:650,200:1720]=True;m &= (g<150)
 lo=np.zeros(g.shape,bool);lo[500:700,200:1720]=True;lo &= (g<150)
 screen=(g>170).astype(np.uint8);screen[400:]=0;cnt,labels,stats,cent=cv2.connectedComponentsWithStats(screen,8);areas=stats[1:,4];si=1+int(np.argmax(areas)) if len(areas) else None
 metrics[k]={'path':str(p),'frame':idx,'wall_Lab_encoded_mean':lab[m].mean(axis=0).tolist(),'lower_wall_Lab_encoded_mean':lab[lo].mean(axis=0).tolist(),'wall_BGR_mean':im[m].mean(axis=0).tolist(),'screen_bbox_xywh':stats[si,:4].tolist() if si else None,'screen_center_xy':cent[si].tolist() if si else None,'screen_area':int(stats[si,4]) if si else 0}
for a,b in [('C04-last','C05-first'),('C05-last','C06-first')]:cv2.imwrite(str(Q/f'seam-{a}--{b}.png'),np.concatenate([frames[a],frames[b]],axis=1))
(Q/'seam-metrics.json').write_text(json.dumps(metrics,indent=2)+'\n');print(json.dumps(metrics,indent=2))
