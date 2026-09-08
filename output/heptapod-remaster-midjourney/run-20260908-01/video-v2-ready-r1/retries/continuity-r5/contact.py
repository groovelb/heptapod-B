from pathlib import Path
import cv2,numpy as np,sys,json
r=Path(__file__).resolve().parent;cid=sys.argv[1];p=r/'clips'/f'{cid}.mp4';out=r/'qa';out.mkdir(exist_ok=True)
c=cv2.VideoCapture(str(p));n=int(c.get(cv2.CAP_PROP_FRAME_COUNT));frames=[]
while True:
 ok,im=c.read()
 if not ok:break
 frames.append(im)
assert len(frames)==n and n==(193 if cid=='C02' else 145)
for kind in ['full','detail']:
 tiles=[]
 for i in range(0,n,6):
  im=frames[i]
  if kind=='detail':im=im[650:1080] if cid=='C02' else im[:550]
  im=cv2.resize(im,(480,270 if kind=='full' else 200));im=cv2.copyMakeBorder(im,26,0,0,0,cv2.BORDER_CONSTANT)
  cv2.putText(im,f'{cid} f{i} {i/24:.2f}s',(8,18),cv2.FONT_HERSHEY_SIMPLEX,.5,(255,255,255),1);tiles.append(im)
 for page in range((len(tiles)+11)//12):
  chunk=tiles[page*12:page*12+12]
  while len(chunk)%3:chunk.append(np.zeros_like(chunk[0]))
  sheet=np.vstack([np.hstack(chunk[j:j+3]) for j in range(0,len(chunk),3)])
  cv2.imwrite(str(out/f'{cid}-{kind}-{page}.jpg'),sheet)
print(cid,n,'frames; sheets at',out)
