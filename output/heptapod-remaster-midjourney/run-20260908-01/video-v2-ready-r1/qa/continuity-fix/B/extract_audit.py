import json,hashlib,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
root=Path.cwd();base=root/'output/heptapod-remaster-midjourney/run-20260908-01';out=base/'video-v2-ready-r1/qa/continuity-fix/B';source=base/'video-v2/rollback/hero-scrub/hero-scrub-1920.mp4'
cap=subprocess.Popen(['ffmpeg','-v','error','-i',str(source),'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE);frames={};n=0
while True:
 buf=cap.stdout.read(1916*1080*3)
 if len(buf)!=1916*1080*3:break
 a=Image.frombytes('RGB',(1916,1080),buf)
 if 96<=n<=288 or 552<=n<=696:frames[n]=a.copy()
 n+=1
for id,start,end in [('C02',96,288),('C05',552,696)]:
 # Every third frame, full frame 480px + crew crop 480px separately for quick broad review
 for typ in ['full','crew']:
  ids=list(range(start,end+1,3));ids += [end] if ids[-1]!=end else []
  for page in range((len(ids)+23)//24):
   sel=ids[page*24:(page+1)*24];sheet=Image.new('RGB',(1920,6*294),(15,15,15));d=ImageDraw.Draw(sheet)
   for j,i in enumerate(sel):
    im=frames[i].copy();
    if typ=='crew':im=im.crop((600,350,1380,1050))
    im.thumbnail((480,270));x=(j%4)*480;y=(j//4)*294;sheet.paste(im,(x,y+24));d.text((x+5,y+5),f'{id} assembled n{i} local {i-start} / {typ}',fill='white')
   sheet.save(out/f'{id}-{typ}-{page+1}.jpg',quality=88)
print('created',len(list(out.glob('*.jpg'))))
for page in range(3):
 ids=list(range(150,198))[page*16:(page+1)*16];sheet=Image.new('RGB',(1920,4*294),(15,15,15));d=ImageDraw.Draw(sheet)
 for j,i in enumerate(ids):
  im=frames[i].crop((600,590,1380,1080));im.thumbnail((480,270));x=j%4*480;y=j//4*294;sheet.paste(im,(x,y+24));d.text((x+5,y+5),f'C02 dense assembled n{i} source n{i-96}',fill='white')
 sheet.save(out/f'C02-dense-boarding-{page+1}.jpg',quality=90)
for typ,x in [('left',0),('center',480),('right',956)]:
 sheet=Image.new('RGB',(1920,3*324),(15,15,15));d=ImageDraw.Draw(sheet)
 for j,i in enumerate([168,180,192,204,216,228]):
  im=frames[i].crop((x,780,x+960,1080));a=j%2*960;b=j//2*324;sheet.paste(im,(a,b+24));d.text((a+5,b+5),f'C02 native {typ} n{i} / source {i-96}',fill='white')
 sheet.save(out/f'C02-objects-native-{typ}.jpg',quality=94)
