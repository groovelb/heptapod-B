from pathlib import Path
import cv2,numpy as np,json
O=Path(__file__).resolve().parent;R=O.parents[2];cv2.setNumThreads(2)
def frame(n):
 c=cv2.VideoCapture(str(R/'clips/C02.mp4'));c.set(1,n);ok,im=c.read();assert ok;c.release();return im
W,H=1920,1080;X=np.arange(W);Y=np.arange(H)[:,None]
def hull_edge(im):
 g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);z=np.argmax(g>110,axis=0).astype(float);valid=(z>10)&(z<1000)&((X<650)|(X>1270));return np.polyval(np.polyfit(X[valid]/1920,z[valid],4),X/1920)
src=frame(120);plate=src.copy();edge=hull_edge(src)
# Hidden hull area: copy real same-row sky pixels, using available left/right exposed sky (no median/flat fill).
for y in range(350,970):
 ids=np.where(y>edge+5)[0]
 ids=ids[(ids<720)|(ids>1180)]
 if len(ids)>10:
  coords=np.linspace(0,len(ids)-1,W).astype(int);row=src[y,ids[coords]]
  mask=y<edge+5;plate[y,mask]=row[mask]
# Hidden central subject area: adjacent genuine field/sky texture, sampled before any source cases.
patch=src[750:967,1160:1370].copy();patch=cv2.resize(patch,(420,217))
mask=np.ones((217,420),np.uint8)*255
# Clone real texture with smooth boundary; keep original near cases below967.
plate=cv2.seamlessClone(patch,plate,mask,(950,858),cv2.NORMAL_CLONE)
cv2.imwrite(str(O/'manual-plate.jpg'),plate)
# Source silhouette polygons explicitly traced for the two test frames.
polys={144:{'group':[(772,822),(778,752),(809,749),(816,704),(828,683),(838,670),(850,670),(861,684),(869,710),(879,744),(887,747),(896,700),(906,681),(919,679),(931,696),(940,721),(945,744),(952,747),(960,698),(970,677),(984,677),(996,695),(1004,732),(1014,746),(1020,707),(1033,679),(1049,674),(1062,687),(1070,707),(1080,747),(1119,751),(1136,830),(1134,853),(1092,866),(820,867),(776,854)],'scissors':[[(817,850),(857,853),(1063,890),(1067,905),(1040,914),(814,870)],[(823,891),(1068,850),(1092,860),(1080,877),(850,916),(823,910)]],'base':[(804,918),(835,914),(839,910),(1057,910),(1081,921),(1094,963),(1080,990),(807,990),(792,968),(796,937)]},192:{'group':[(688,667),(706,525),(757,521),(766,470),(777,445),(790,429),(810,430),(829,447),(843,493),(850,521),(857,521),(866,472),(878,444),(898,436),(914,445),(928,470),(936,519),(950,519),(958,468),(970,440),(991,432),(1010,443),(1026,473),(1032,519),(1045,519),(1054,467),(1070,439),(1090,426),(1108,436),(1124,461),(1138,515),(1198,518),(1213,533),(1237,673),(1228,703),(1198,716),(735,717),(703,704)],'scissors':[[(739,697),(787,703),(1110,779),(1115,797),(1094,814),(761,727)],[(784,780),(1124,696),(1178,710),(1098,744),(807,817),(783,806)],[(786,807),(828,800),(1146,905),(1115,929),(1073,926),(786,823)],[(766,903),(1093,803),(1112,817),(1080,838),(819,929),(765,923)]],'base':[(724,909),(758,902),(793,903),(820,916),(1080,916),(1108,897),(1164,900),(1180,915),(1190,995),(1175,1026),(733,1033),(710,1008),(714,936)]}}
# Refine traced strut edges after native-size inspection.
polys[192]['scissors']=[[(790,707),(822,707),(1109,780),(1115,790),(1112,803),(1103,811),(1089,806),(795,726)],[(785,786),(1090,706),(1145,706),(1100,730),(800,811),(788,809),(781,799)],[(790,805),(810,807),(1110,900),(1129,915),(1095,921),(786,819)],[(765,900),(1095,806),(1108,816),(1083,830),(799,923),(765,916)]]
# Group underside follows the platform, without broad retained sky below it.
polys[192]['group'][-4:]=[(1220,697),(1192,708),(735,707),(704,695)]
polys[144]['group'][-4:]=[(1128,847),(1090,858),(823,858),(780,847)]
def compose(n):
 im=frame(n);t=(n-120)/72;s=1+2.6*(t*t*(3-2*t));M=np.float32([[s,0,960*(1-s)],[0,s,887-60*t-887*s]])
 bg=cv2.warpAffine(plate,M,(W,H),borderMode=cv2.BORDER_REPLICATE)
 # Manual hull contour, densely sampled from observed source curvature; central group joins hull.
 h=hull_edge(im);pts=[(0,0),(1919,0)]+[(int(x),int(h[x]-1)) for x in range(1919,-1,-16)]+[(0,int(h[0]-1))]
 a=np.zeros((H,W),np.uint8);cv2.fillPoly(a,[np.array(pts,np.int32)],255)
 p=polys[n]
 for polygon in [p['group'],*p['scissors'],p['base']]:cv2.fillPoly(a,[np.array(polygon,np.int32)],255)
 a=cv2.GaussianBlur(a,(3,3),.5)/255
 out=(im*a[:,:,None]+bg*(1-a[:,:,None])).clip(0,255).astype(np.uint8)
 cv2.imwrite(str(O/f'manual-{n}.jpg'),out);cv2.imwrite(str(O/f'manual-matte-{n}.jpg'),(a*255).astype(np.uint8))
for n in [144,192]:compose(n)
