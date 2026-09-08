from pathlib import Path
import cv2,numpy as np,json,hashlib,sys
out=Path(__file__).resolve().parent;r=out.parent.parent;p=r/'retries/continuity-r7-local-field/clips'/f'{sys.argv[1]}.mp4';c=cv2.VideoCapture(str(p));tiles=[];n=0
while True:
 ok,im=c.read()
 if not ok:break
 if sys.argv[1]=='C02':im=im[540:1080,480:1440]
 else:im=im[0:1080]
 im=cv2.resize(im,(480,270));im=cv2.copyMakeBorder(im,24,0,0,0,cv2.BORDER_CONSTANT);cv2.putText(im,f'{sys.argv[1]} f{n}',(8,17),cv2.FONT_HERSHEY_SIMPLEX,.5,(255,255,255),1);tiles.append(im);n+=1
for page in range((n+23)//24):
 a=tiles[page*24:(page+1)*24]
 while len(a)%4:a.append(np.zeros_like(a[0]))
 cv2.imwrite(str(out/f'{sys.argv[1]}-all-{page}.jpg'),np.vstack([np.hstack(a[k:k+4]) for k in range(0,len(a),4)]))
(out/f'{sys.argv[1]}-probe.json').write_text(json.dumps({'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'frames':n,'fps':c.get(cv2.CAP_PROP_FPS)},indent=2));print(n)
