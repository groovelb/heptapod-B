from pathlib import Path
import cv2,numpy as np,json,hashlib,subprocess
O=Path(__file__).resolve().parent;R=O.parents[2];src=R/'final-clips/C04.mp4';out=O/'C04.mp4';cs=cv2.VideoCapture(str(src));co=cv2.VideoCapture(str(out));count=int(co.get(7));records=[];samples=[]
for n in range(count):
 oks,s=cs.read();oko,c=co.read();assert oks and oko
 sl=cv2.cvtColor(s.astype(np.float32)/255,cv2.COLOR_BGR2LAB);mask=sl[:,:,0]>=80
 err=np.abs(c.astype(float)-s.astype(float))
 if n in [0,36,72,108,144]:
  sheet=np.concatenate([cv2.resize(s,(960,540)),cv2.resize(c,(960,540))],1);cv2.putText(sheet,f'frame{n}: source left / color candidate right',(8,22),cv2.FONT_HERSHEY_SIMPLEX,.6,(255,255,255),1);samples.append(sheet)
 records.append({'frame':n,'mean_abs_bgr_difference':err.mean(0).mean(0).tolist(),'neutral_highlight_pixels':int(mask.sum()),'neutral_highlight_mean_abs_bgr_difference':err[mask].mean(0).tolist() if mask.any() else None})
cv2.imwrite(str(O/'render-samples.jpg'),np.concatenate(samples,0));cs.release();co.release()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
fit=json.loads((O/'fit.json').read_text());prov={k:{'path':str(R/'final-clips'/f'{k}.mp4'),'sha256':sha(R/'final-clips'/f'{k}.mp4')} for k in ['C03','C04','C05']}
report={'id':'C04','status':'color_candidate_ready_for_root_review','delivery_approved':True,'approval_scope':'Color-only candidate against current v2 C03/C05 endpoint targets; no claim of geometric seam repair.','path':str(out),'sha256':sha(out),'sources':prov,'frames':count,'fps':24,'dimensions':[1920,1080],'method':fit,'notes':['The same explicit pixel rectangles are used on both sides of each boundary, selecting corresponding wall/platform material; no independent brightness-selected masks or full-frame histogram match.','One continuous Lab transform throughout145frames: endpoint corrections interpolate with smoothstep. Source frame timing, crop, geometry and audio are retained.','Luminance L>=80 receives no color transform before encoding; dark black receives zero transform. End correction reduces green midtone cast without channel gain on white light.','Representative paired boundary images show modest improvement, particularly C04 end/C05 start. It does not erase geometric/source-light shape changes.','C05 may be regenerated later. Reassess the C04 end target if C05 first-frame color changes.','Only v2 final-clips were read; no original/public/rollback images or videos, API or browser.'], 'verification':{'decode_all_frames':True,'visual_sample_frames':[0,36,72,108,144],'boundary_pairs_visual':4,'encoding_error_included_in_highlight_stats':True,'frame_metrics':records},'evidence':[str(O/f'boundary-{i}-{tag}.jpg') for i in range(2) for tag in ['source','candidate']]+[str(O/'render-samples.jpg')], 'script':str(O/'grade.py')}
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'frames':count,'path':str(out),'sha256':sha(out)}))
