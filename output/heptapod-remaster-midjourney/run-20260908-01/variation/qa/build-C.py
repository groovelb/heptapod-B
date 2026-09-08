from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
r=Path(__file__).resolve().parents[2]
ids=['F06-MID','F06-OUT','F07-IN','F07-MID','F07-OUT','F08-IN','F08-MID','F08-OUT']
for fid in ids:
    paths=[r/'sources'/f'{fid}.png',r/'minimal/selected'/f'{fid}.jpg']+[r/'variation/stills'/f'{fid}-{i}.jpg' for i in range(4)]
    if not all(p.exists() for p in paths):continue
    out=Image.new('RGB',(1400,1260),'#18202a');draw=ImageDraw.Draw(out)
    for n,p in enumerate(paths):
        x=(n%2)*700;y=(n//2)*420
        im=ImageOps.contain(Image.open(p).convert('RGB'),(700,394))
        out.paste(im,(x,y+26));draw.text((x+8,y+5),f'{fid} '+(['ORIGINAL','PRE VARY']+[f'VARIATION {i}' for i in range(4)])[n],fill='white')
    out.save(r/'variation/qa'/f'C-{fid}.jpg',quality=92)
    print(fid)
