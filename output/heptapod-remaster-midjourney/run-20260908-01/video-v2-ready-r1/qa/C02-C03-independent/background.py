from pathlib import Path
import cv2,numpy as np
out=Path(__file__).resolve().parent;r=out.parent.parent;p=r/'retries/continuity-r7-local-field/clips/C02.mp4';c=cv2.VideoCapture(str(p));frames=[]
while True:
 ok,a=c.read()
 if not ok:break
 frames.append(a)
tiles=[]
for n,a in enumerate(frames):
 a=cv2.resize(a[820:1080],(480,65));a=cv2.copyMakeBorder(a,20,0,0,0,cv2.BORDER_CONSTANT);cv2.putText(a,f'f{n}',(5,15),cv2.FONT_HERSHEY_SIMPLEX,.45,(255,255,255),1);tiles.append(a)
for page in range(5):
 a=tiles[page*48:(page+1)*48]
 while len(a)%4:a.append(np.zeros_like(a[0]))
 cv2.imwrite(str(out/f'C02-background-all-{page}.jpg'),np.vstack([np.hstack(a[k:k+4]) for k in range(0,len(a),4)]))
a=[]
for n in [138,142,146,150,154,158,162,166]:
 im=frames[n][780:1060,800:1160].copy();im=cv2.copyMakeBorder(im,24,0,0,0,cv2.BORDER_CONSTANT);cv2.putText(im,f'C02 native f{n}',(5,16),cv2.FONT_HERSHEY_SIMPLEX,.5,(255,255,255),1);a.append(im)
cv2.imwrite(str(out/'C02-scissor-native.jpg'),np.vstack([np.hstack(a[k:k+4]) for k in range(0,8,4)]))
