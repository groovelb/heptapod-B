from pathlib import Path
import cv2,numpy as np,json
r=Path(__file__).resolve().parent
for cid in ['C06','C08']:
 tiles=[];rows=[]
 for n in [0,24,48,72,96,120,144]:
  im=cv2.imread(str(r/f'{cid}-source-{n}.png'));gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);blur=cv2.GaussianBlur(gray,(5,5),0)
  binary=(blur>185).astype(np.uint8)*255
  contours,_=cv2.findContours(binary,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
  valid=[c for c in contours if cv2.contourArea(c)>150]
  c=max(valid,key=cv2.contourArea);hull=cv2.convexHull(c);mask=np.zeros_like(gray);cv2.fillConvexPoly(mask,hull,255)
  # Keep all dark foreground and its antialiased edge outside the editable surface.
  dark=cv2.dilate((gray<145).astype(np.uint8),np.ones((9,9),np.uint8));mask[dark>0]=0
  dist=cv2.distanceTransform(mask,cv2.DIST_L2,5);mask=(dist>8).astype(np.uint8)*255
  view=im.copy();view[mask>0]=(view[mask>0]*.65+np.array([70,180,90])*.35).astype(np.uint8)
  cv2.polylines(view,[hull],True,(0,0,255),2);x,y,w,h=cv2.boundingRect(hull);rows.append({'frame':n,'bounds':[x,y,w,h],'mask_pixels':int((mask>0).sum())})
  tile=cv2.resize(view,(640,360));cv2.putText(tile,f'{cid} {n} / screen mask',(8,24),cv2.FONT_HERSHEY_SIMPLEX,.6,(255,255,255),1);tiles.append(tile)
 sheet=np.zeros((4*360,1280,3),np.uint8)
 for i,t in enumerate(tiles):sheet[(i//2)*360:(i//2+1)*360,(i%2)*640:(i%2+1)*640]=t
 cv2.imwrite(str(r/f'{cid}-mask-check.jpg'),sheet)
 print(cid,json.dumps(rows))
