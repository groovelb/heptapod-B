from pathlib import Path
import cv2,numpy as np,json,hashlib,subprocess,sys
O=Path(__file__).resolve().parent;R=O.parents[2];cv2.setNumThreads(2)
def frame(clip,n):
 c=cv2.VideoCapture(str(R/'clips'/f'{clip}.mp4'));c.set(1,n);ok,im=c.read();c.release();assert ok;return im
W,H=1920,1080;Y=np.arange(H)[:,None];X=np.arange(W)
def edge(im):
 g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);z=np.argmax(g>110,axis=0).astype(float);valid=(z>10)&(z<1000)&((X<650)|(X>1270));return cv2.GaussianBlur(z.astype(np.float32)[None,:],(5,1),.8)[0]
src=frame('C02',120);plate=src.copy();hull=Y<edge(src)[None,:]
# Remove only foreground from the plate: reconstruct hidden sky horizontally from visible row samples.
for y in range(1080):
 good=~hull[y];good[740:1160]=False
 vals=src[y,good]
 if len(vals)>30:
  color=np.median(vals,axis=0)
 else: color=np.array([175,164,155])
 plate[y,hull[y]]=color
# Ground plate under original lift: inpaint compact subject hole; keep original nearby cases.
m=np.zeros((H,W),np.uint8);m[748:964,795:1100]=255
for y in range(735,966):
 left=np.median(plate[y,660:730],axis=0);right=np.median(plate[y,1180:1250],axis=0)
 for x in range(740,1160):
  q=(x-740)/420;plate[y,x]=left*(1-q)+right*q

cv2.imwrite(str(O/'plate.jpg'),plate)
keys=np.array([120,144,168,192]);boxes=np.array([[798,748,1102,1007],[773,655,1135,995],[724,525,1195,1018],[688,415,1248,1038]])
def compose(im,n):
 t=max(0,(n-120)/72);s=1+2.6*(t*t*(3-2*t));horizon=887-60*t
 M=np.float32([[s,0,960*(1-s)],[0,s,horizon-887*s]])
 bg=cv2.warpAffine(plate,M,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
 gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(float);he=edge(im);ship=Y<he[None,:]
 # Retain dark original silhouettes in a tightly bounded center region, including open rail/scissor holes.
 b=np.array([np.interp(n,keys,boxes[:,k]) for k in range(4)]).astype(int);x1,y1,x2,y2=b
 roi=np.zeros((H,W),np.float32);roi[y1:y2,x1:x2]=1
 rows=np.median(gray[:,np.r_[400:650,1270:1520]],axis=1)
 threshold=np.maximum(rows-20,24)
 alpha=(gray<threshold[:,None]).astype(np.float32)*roi
 alpha=cv2.dilate(alpha,np.ones((3,3),np.uint8))
 # Fully retain interior body/base cores; color key retains open holes, no rectangular background patch.
 alpha=np.maximum(alpha,ship.astype(float));alpha=cv2.GaussianBlur(alpha.astype(np.float32),(3,3),.45)
 result=(im*alpha[:,:,None]+bg*(1-alpha[:,:,None])).clip(0,255).astype(np.uint8)
 return result,alpha
if __name__=='__main__':
 for n in [120,132,144,168,192]:
  im=frame('C02',n);result,a=compose(im,n);cv2.imwrite(str(O/f'preview-{n}.jpg'),result);cv2.imwrite(str(O/f'matte-{n}.jpg'),(a*255).astype(np.uint8))
