from pathlib import Path
import cv2,numpy as np
O=Path(__file__).resolve().parent;R=O.parents[1];cap=cv2.VideoCapture(str(R/'clips/C02.mp4'));ims=[]
for n in range(193):
 ok,im=cap.read();assert ok
 a=cv2.resize(im[700:1080],(960,190));p=np.zeros((214,960,3),np.uint8);p[24:]=a;cv2.putText(p,f'frame {n}',(6,17),cv2.FONT_HERSHEY_SIMPLEX,.5,(255,255,255),1);ims.append(p)
 if n in [72,96,120,192]:cv2.imwrite(str(O/f'native-{n}.png'),im)
for start in range(0,193,24):
 subset=ims[start:start+24];subset+= [np.zeros_like(ims[0])]*((2-len(subset)%2)%2);sheet=np.concatenate([np.concatenate(subset[j:j+2],1) for j in range(0,len(subset),2)],0);cv2.imwrite(str(O/f'all-{start:03d}.jpg'),sheet)
c=cv2.VideoCapture(str(R.parents[1]/'final-clips/C03.mp4'));ok,im=c.read();assert ok;cv2.imwrite(str(O/'C03-start.png'),im)
