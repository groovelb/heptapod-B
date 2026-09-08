from pathlib import Path
import cv2,numpy as np,json,hashlib
Q=Path(__file__).resolve().parent;R=Q.parent;OUT=Q/'C05-candidate-final.mp4'
cap=cv2.VideoCapture(str(OUT));src=cv2.VideoCapture(str(R/'clips/C05.mp4'));frames=[];audit=[]
for n in range(145):
 ok,im=cap.read();yes,raw=src.read();assert ok and yes
 frames.append(im);delta=np.abs(im.astype(np.int16)-raw.astype(np.int16))
 audit.append({'frame':n,'upper_600_max_error':int(delta[:600].max()),'full_mae':float(delta.mean()),'full_max_error':int(delta.max())})
assert not cap.read()[0]
for start in range(0,145,32):
 subset=frames[start:start+32];canvas=np.full((8*132,4*480,3),16,np.uint8)
 for i,im in enumerate(subset):
  yy=(i//4)*132;xx=(i%4)*480;canvas[yy+24:yy+132,xx:xx+480]=cv2.resize(im[648:],(480,108))
  cv2.putText(canvas,f'f{start+i:03}',(xx+8,yy+18),cv2.FONT_HERSHEY_SIMPLEX,.5,(230,230,230),1,cv2.LINE_AA)
 cv2.imwrite(str(Q/f'crew-all-{start//32}.jpg'),canvas,[cv2.IMWRITE_JPEG_QUALITY,95])
for n in [0,1,6,12,18,23,24,28,32,36,40,44,48,72,96,120,143,144]:cv2.imwrite(str(Q/f'final-{n:03}.png'),frames[n])
(Q/'validation.json').write_text(json.dumps({'path':str(OUT),'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'frames':len(frames),'fps':cap.get(cv2.CAP_PROP_FPS),'dimensions':[1920,1080],'source_endpoints_identical':audit[0]['full_max_error']==0 and audit[-1]['full_max_error']==0,'upper_wall_all_frames_identical':all(v['upper_600_max_error']==0 for v in audit),'audit':audit},indent=2)+'\n')
print((Q/'validation.json').read_text()[:500])
