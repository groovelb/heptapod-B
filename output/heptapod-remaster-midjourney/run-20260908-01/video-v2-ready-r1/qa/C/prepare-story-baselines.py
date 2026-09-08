import json, subprocess, hashlib
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[2]
spec=json.loads((R/'specs.json').read_text())
frames=[1,24,48,72,96,120,144]
offsets={'C04':408,'C05':552,'C07':840}
clips=[c for c in spec['clips'] if c['id'] in offsets]
def extract(task):
 c,name,src,offset=task
 target=R/'qa/C'/c['id']/name;target.mkdir(parents=True,exist_ok=True)
 expr='+'.join('eq(n,%s)'%(offset+n) for n in frames)
 subprocess.run(['ffmpeg','-hide_banner','-v','error','-y','-threads','2','-i',str(src),'-vf',"select='%s',scale=640:360"%expr,'-fps_mode','passthrough',str(target/'sample-%02d.png')],check=True)
 return {'id':c['id'],'baseline':name,'path':str(src),'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'local_frames':frames,'source_frames':[offset+n for n in frames],'frame_files':[str(target/('sample-%02d.png'%(i+1))) for i in range(len(frames))]}
tasks=[]
for c in clips:
 tasks +=[(c,'historical',Path(c['source_video']),0),(c,'previous_generated',R.parent/'video-v2/clips'/(c['id']+'.mp4'),0),(c,'current_rollback',R/'rollback/hero-scrub/hero-scrub-1920.mp4',offsets[c['id']])]
with ThreadPoolExecutor(max_workers=3) as pool: records=list(pool.map(extract,tasks))
for c in clips:
 entries=[x for x in records if x['id']==c['id']]
 out=Image.new('RGB',(1440,len(frames)*294),(16,16,16));d=ImageDraw.Draw(out)
 for col,e in enumerate(entries):
  for i,(n,im) in enumerate(zip(frames,e['frame_files'])):
   out.paste(Image.open(im).resize((480,270)),(col*480,i*294+24))
   d.text((col*480+8,i*294+6),f"{c['id']} {e['baseline']} local {n} ({n/24:.2f}s)",fill='white')
 out.save(R/'qa/C'/c['id']/'story-baseline-comparison.jpg',quality=95)
o=Image.new('RGB',(1280,len(clips)*386),(16,16,16));d=ImageDraw.Draw(o)
for row,c in enumerate(clips):
 for col,key in enumerate(['start','end']):
  o.paste(Image.open(c[key]['path']).resize((640,360)),(col*640,row*386+26));d.text((col*640+8,row*386+6),c['id']+' '+key+' reference',fill='white')
o.save(R/'qa/C/story-reference-pairs.jpg',quality=95)
(R/'qa/C/story-baseline-records.json').write_text(json.dumps(records,indent=2)+'\n')
print('Prepared 3 comparisons + reference pairs; 63 extracted baseline frames')
