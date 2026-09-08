from pathlib import Path
import cv2,numpy as np,subprocess,json
R=Path(__file__).resolve().parent;B=R.parents[1];out=R/'field-repair';out.mkdir(exist_ok=True);cv2.setNumThreads(2)
cap=cv2.VideoCapture(str(B/'clips/C02.mp4'));cap.set(cv2.CAP_PROP_POS_FRAMES,120);ok,original=cap.read();assert ok

def hull_edge(im):
 gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);bright=gray>110;edge=np.argmax(bright,axis=0).astype(float)
 x=np.arange(1920);valid=(edge>10)&(edge<1000)&((x<700)|(x>1250))
 return np.polyval(np.polyfit(x[valid]/1920,edge[valid],4),x/1920)
plate=original.copy();edge=hull_edge(original);yy=np.arange(1080)[:,None];hull=yy<edge[None,:]
removed=hull.copy();removed[744:965,785:1115]=True
for y in range(965):
 pixels=original[y,~removed[y]]
 if len(pixels)>20:color=np.median(pixels,axis=0)
 else:color=np.array([165,155,145])
 plate[y,removed[y]]=color
# Only soften the reconstructed hole, preserving the original visible background objects.
blur=cv2.GaussianBlur(plate,(0,0),3);plate[removed]=blur[removed]
keyframes=np.array([120,144,168,192]);boxes=np.array([[790,747,1110,1010],[770,610,1160,1050],[700,480,1200,1050],[690,405,1240,1050]])
def compose(im,scale,bbox):
 M=np.float32([[scale,0,960*(1-scale)],[0,scale,875*(1-scale)]])
 bg=cv2.warpAffine(plate,M,(1920,1080),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT101)
 ship=yy<hull_edge(im)[None,:];bg[ship]=im[ship]
 x1,y1,x2,y2=map(int,bbox);mx=(x1+x2)//2;w=x2-x1
 # Enclose the actual lift and people, tapering through the scissor stage away from the vehicles.
 vertices=np.array([[x1,y1],[x2,y1],[x2,int(y1+(y2-y1)*.48)],[mx+int(w*.30),int(y1+(y2-y1)*.72)],[x2-20,y2],[x1+20,y2],[mx-int(w*.30),int(y1+(y2-y1)*.72)],[x1,int(y1+(y2-y1)*.48)]],np.int32)
 mask=np.zeros((1080,1920),np.uint8);cv2.fillPoly(mask,[vertices],255)
 result=cv2.seamlessClone(im,bg,mask,((x1+x2)//2,(y1+y2)//2),cv2.NORMAL_CLONE)
 # Source hull geometry remains fixed to the source camera.
 result[ship]=im[ship]
 return result
for n in [120,132,144,168,192]:
 cap.set(cv2.CAP_PROP_POS_FRAMES,n);ok,im=cap.read();assert ok
 t=(n-120)/72;scale=1+.65*t*t*(3-2*t);box=[np.interp(n,keyframes,boxes[:,k]) for k in range(4)]
 cv2.imwrite(str(out/f'C02-{n}.jpg'),compose(im,scale,box))
print(out)
