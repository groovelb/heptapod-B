from pathlib import Path
import cv2,numpy as np,json,hashlib
Q=Path(__file__).resolve().parent;SRC=Q.parent/'clips/C05.mp4';OLD=Q/'C05-candidate-final.mp4';OUT=Q/'C05-candidate-rail-continuous.mp4'
V=Q/'rail-qa';V.mkdir(exist_ok=True)
caps=[cv2.VideoCapture(str(p)) for p in [SRC,OLD,OUT]];records=[];frames=[]
for n in range(145):
 ims=[]
 for cap in caps:
  ok,im=cap.read();assert ok;ims.append(im)
 raw,old,new=ims;frames.append(new)
 d=np.abs(new.astype(np.int16)-old.astype(np.int16));e=np.abs(new.astype(np.int16)-raw.astype(np.int16));yy,xx=np.where(d.max(axis=2)>0)
 records.append({'frame':n,'changed_pixels_from_previous':len(yy),'changed_bbox':[int(xx.min()),int(yy.min()),int(xx.max()),int(yy.max())] if len(yy) else None,'above_y800_identical_to_previous':not d[:800].any(),'raw_upper600_exact':not e[:600].any(),'raw_full_exact':not e.any()})
for cap in caps:assert not cap.read()[0]
for start,end in [(48,80),(0,32),(112,145)]:
 count=end-start;rows=(count+3)//4;canvas=np.full((rows*136,1920,3),16,np.uint8)
 for i,n in enumerate(range(start,end)):
  y=i//4*136;x=i%4*480;canvas[y+24:y+136,x:x+480]=cv2.resize(frames[n][632:],(480,112));cv2.putText(canvas,f'f{n:03}',(x+8,y+18),0,.5,(220,220,220),1)
 cv2.imwrite(str(V/f'sequence-{start:03}-{end-1:03}.jpg'),canvas,[cv2.IMWRITE_JPEG_QUALITY,96])
for n in [0,1,12,24,48,52,60,63,64,65,66,72,80,96,120,144]:cv2.imwrite(str(V/f'frame-{n:03}.png'),frames[n])
report={'path':str(OUT),'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'frames':145,'fps':caps[2].get(cv2.CAP_PROP_FPS),'dimensions':[1920,1080],'source_endpoints_identical':records[0]['raw_full_exact'] and records[-1]['raw_full_exact'],'raw_upper600_all_identical':all(r['raw_upper600_exact'] for r in records),'prior_candidate_upper800_all_identical':all(r['above_y800_identical_to_previous'] for r in records),'records':records}
(V/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='records'},indent=2))
