from pathlib import Path
import cv2,numpy as np,json,sys
p=Path(sys.argv[1]);out=Path(sys.argv[2]);c=cv2.VideoCapture(str(p));rows=[];n=0
while True:
 ok,im=c.read()
 if not ok:break
 if 65<=n<=144:
  g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);m=(g[:650,700:1220]>175).astype(np.uint8);count,lab,stats,centers=cv2.connectedComponentsWithStats(m,8);spots=[]
  for k in range(1,count):
   x,y,w,h,area=map(int,stats[k]);
   if area>=3:spots.append({'x':float(centers[k][0]+700),'y':float(centers[k][1]),'area':area,'box':[x+700,y,w,h]})
  rows.append({'frame':n,'spots':spots})
 n+=1
c.release();out.write_text(json.dumps({'source':str(p),'threshold':175,'region':[700,0,1220,650],'rows':rows},indent=2)+'\n');print('Multiple bright components:',[r['frame'] for r in rows if len(r['spots'])>1])
