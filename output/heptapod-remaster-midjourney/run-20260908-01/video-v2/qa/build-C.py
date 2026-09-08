from pathlib import Path
import json,subprocess,io
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parent.parent
s=json.loads((r/'specs.json').read_text())
for clip in s['clips'][6:]:
 new=Path(clip['output']);old=Path(clip['source_video'])
 if not new.exists():continue
 count=clip['expected_generated_frames'];inds=[0,round((count-1)*.25),round((count-1)*.5),round((count-1)*.75),count-1]
 out=Image.new('RGB',(1200,1830),'#18202a');draw=ImageDraw.Draw(out)
 for row,idx in enumerate(inds):
  for col,path in enumerate([old,new]):
   raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-vf',f'select=eq(n\\,{idx}),scale=600:-1','-frames:v','1','-f','image2pipe','-vcodec','mjpeg','-threads','1','-'])
   im=Image.open(io.BytesIO(raw));out.paste(im,(col*600,row*366+26));draw.text((col*600+6,row*366+6),f"{clip['id']} {'ORIGINAL' if col==0 else 'V2'} frame{idx}",fill='white')
 out.save(r/'qa'/f"C-{clip['id']}.jpg",quality=92);print(clip['id'])
