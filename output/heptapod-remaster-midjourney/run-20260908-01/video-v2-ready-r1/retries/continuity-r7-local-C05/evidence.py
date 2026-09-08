from pathlib import Path
import cv2,numpy as np,json,subprocess,hashlib
Q=Path(__file__).resolve().parent
cap=cv2.VideoCapture(str(Q/'C05.mp4'));n=0;pages=[];fullpages=[];means=[]
while True:
 ok,im=cap.read()
 if not ok:break
 k=n%40
 if not k:page=np.zeros((1100,1920,3),np.uint8)
 tile=cv2.resize(im[640:],(480,110));cv2.putText(tile,str(n),(3,17),0,.6,(0,0,255),1);page[k//4*110:(k//4+1)*110,k%4*480:(k%4+1)*480]=tile
 if k==39 or n==144:
  p=Q/f'crew-all-{n//40}.jpg';cv2.imwrite(str(p),page);pages.append(str(p))
 k2=n%30
 if not k2:fullpage=np.zeros((1296,1920,3),np.uint8)
 tile=cv2.resize(im,(384,216));cv2.putText(tile,str(n),(4,20),0,.6,(0,0,255),1);fullpage[k2//5*216:(k2//5+1)*216,k2%5*384:(k2%5+1)*384]=tile
 if k2==29 or n==144:
  p=Q/f'full-all-{n//30}.jpg';cv2.imwrite(str(p),fullpage);fullpages.append(str(p))
 if n%12==0:cv2.imwrite(str(Q/f'encoded-{n:03}.png'),im)
 means.append(float(im.mean()));n+=1
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(Q/'C05.mp4')]))
(Q/'technical.json').write_text(json.dumps({'path':str(Q/'C05.mp4'),'sha256':hashlib.sha256((Q/'C05.mp4').read_bytes()).hexdigest(),'decoded_frames':n,'min_mean_pixel':min(means),'crew_contact':pages,'full_contact':fullpages,'probe':probe},indent=2)+'\n')
print('decoded',n)
