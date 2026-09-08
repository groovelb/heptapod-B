from pathlib import Path
import cv2,numpy as np,json
cv2.setNumThreads(2)
Q=Path(__file__).resolve().parent
centers={72:[(435,720),(761,720),(1178,834),(1418,808)],96:[(470,682),(790,675),(1140,691),(1390,694)]}
for n in [72,96]:
 up=cv2.imread(str(Q/f'upper-{n}.png'));lo=cv2.imread(str(Q/f'lower-{n}.png'));H,W=up.shape[:2]
 yy,xx=np.indices((H,W),dtype=np.float32)
 ys=np.where(yy<=480,yy,480+160*(1-np.exp(-(yy-480)/160))).astype(np.float32)
 xs=960+(xx-960)*np.where(yy<=480,1,(ys-100)/np.maximum(yy-100,1))
 bg=cv2.remap(up,xs.astype(np.float32),ys,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
 cv2.imwrite(str(Q/f'background-{n}.png'),bg)
 mask=np.zeros((H,W),np.uint8)
 for cx,top in centers[n]:
  x0=max(0,cx-175);x1=min(W,cx+175);y0=max(0,top-12);roi=lo[y0:,x0:x1];h,w=roi.shape[:2];m=np.full((h,w),cv2.GC_PR_BGD,np.uint8)
  m[:3]=cv2.GC_BGD;m[:,:4]=cv2.GC_BGD;m[:,-4:]=cv2.GC_BGD
  c=cx-x0
  pts=np.array([[c-24,8],[c+24,8],[c+43,64],[c+45,85],[c+103,123],[c+139,215],[c+145,h-1],[c-140,h-1],[c-130,215],[c-92,119],[c-42,84],[c-40,43]],np.int32)
  cv2.fillPoly(m,[pts],cv2.GC_PR_FGD)
  cv2.ellipse(m,(c,42),(21,27),0,0,360,cv2.GC_FGD,-1)
  m[110:min(h,270),c-32:c+33]=cv2.GC_FGD
  cv2.grabCut(roi,m,None,np.zeros((1,65)),np.zeros((1,65)),4,cv2.GC_INIT_WITH_MASK)
  a=((m==cv2.GC_FGD)|(m==cv2.GC_PR_FGD)).astype(np.uint8)*255
  a=cv2.morphologyEx(a,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
  mask[y0:,x0:x1]=np.maximum(mask[y0:,x0:x1],a)
 # Thin rail-only lines retain source appearance without copying adjacent wall.
 if n==96:
  rails=[[(0,1039),(326,876),(1445,876),(1920,1063)],[(0,1079),(325,976),(1450,976),(1800,1079)],[(962,876),(962,1080)]]
  floor=np.array([[200,1080],[355,1048],[1540,1048],[1730,1080]])
 else:
  rails=[[(0,1070),(270,887),(1480,887),(1920,1070)],[(170,1080),(270,1010),(1480,1010),(1650,1080)],[(963,887),(963,1080)]]
  floor=np.array([[200,1080],[350,1055],[1550,1055],[1740,1080]])
 for rail in rails:cv2.polylines(mask,[np.array(rail,np.int32)],False,255,8,cv2.LINE_AA)
 cv2.fillPoly(mask,[floor.astype(np.int32)],255)
 # Existing central platform case, tightly bounded below crew.
 if n==96:cv2.fillPoly(mask,[np.array([[882,1004],[1020,1004],[1068,1080],[846,1080]])],255)
 else:cv2.fillPoly(mask,[np.array([[855,994],[1080,994],[1100,1080],[840,1080]])],255)
 alpha=cv2.GaussianBlur(mask,(3,3),0.55).astype(np.float32)/255
 comp=(lo*alpha[:,:,None]+bg*(1-alpha[:,:,None])).astype(np.uint8)
 cv2.imwrite(str(Q/f'mask-{n}.png'),mask);cv2.imwrite(str(Q/f'trial-{n}.png'),comp)
print('two frame trials ready')
