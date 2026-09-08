from pathlib import Path
import cv2,numpy as np,ast
O=Path(__file__).resolve().parent;B=O.parents[1];cv2.setNumThreads(2)
t=ast.parse((B/'retries/continuity-r5/field-worker/manual.py').read_text());ns={}
for n in t.body:
 if isinstance(n,ast.Assign) and any(ast.unparse(x).startswith('polys') for x in n.targets):exec(compile(ast.Module(body=[n],type_ignores=[]),'p','exec'),ns)
polys=ns['polys'];H,W=1080,1920;X=np.arange(W);Y=np.arange(H)[:,None]
def frame(n,cid='C02'):
 c=cv2.VideoCapture(str(B/'clips'/f'{cid}.mp4'));c.set(1,n);ok,im=c.read();c.release();assert ok;return im
def edge(im):
 g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);z=np.argmax(g>110,axis=0).astype(float);good=(z>5)&(z<1020)&((X<650)|(X>1280));return np.polyval(np.polyfit(X[good]/1920,z[good],4),X/1920)
src=frame(120);plate=src.copy();h=edge(src)
# Visible sky samples are smoothly extended under the hull, while original real field stays intact.
for y in range(1080):
 available=(y>h+10)&((X<720)|(X>1220))
 if available.sum()>20:
  ids=np.where(available)[0];row=np.stack([np.interp(X,ids,src[y,ids,k]) for k in range(3)],axis=1)
  plate[y,y<h+10]=row[y<h+10]
# Remove only the small occluded center of the lift. Sky uses adjoining sky; ground uses adjoining real grass.
mask=np.zeros((H,W),np.uint8);mask[748:1007,794:1104]=255
for y in range(748,927):
 left=np.median(plate[y,770:793],axis=0);right=np.median(plate[y,1105:1128],axis=0)
 for x in range(794,1104):plate[y,x]=left*(1-(x-794)/310)+right*((x-794)/310)
cv2.imwrite(str(O/'plate.jpg'),plate)
for n in [144,192]:
 im=frame(n);g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32);progress=(n-120)/72;s=1+.10*progress
 M=np.float32([[s,0,960*(1-s)],[0,s,900*(1-s)]])
 bg=cv2.warpAffine(plate,M,(W,H),borderMode=cv2.BORDER_REFLECT_101)
 h=edge(im);a=(Y<h[None,:]-1).astype(np.float32);parts=polys[n]
 for p in [parts['group'],*parts['scissors']]:
  m=np.zeros((H,W),np.uint8);cv2.fillPoly(m,[np.array(p,np.int32)],255)
  key=np.clip((125-g)/50,0,1);a=np.maximum(a,key*(m/255))
 m=np.zeros((H,W),np.uint8);cv2.fillPoly(m,[np.array(parts['base'],np.int32)],255);a=np.maximum(a,m/255)
 a=cv2.GaussianBlur(a.astype(np.float32),(3,3),.45)
 out=np.clip(im*a[:,:,None]+bg*(1-a[:,:,None]),0,255).astype(np.uint8)
 cv2.imwrite(str(O/f'test-{n}.jpg'),out)
