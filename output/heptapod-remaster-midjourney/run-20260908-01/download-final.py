"""Download an observed full-resolution Subtle upscale through Aside."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'final'
for name in ('stills', 'downloads', 'logs'):
    (OUT / name).mkdir(parents=True, exist_ok=True)

JS = r'''
const p=await openTab('https://www.midjourney.com/jobs/'+JOB+'?index=0');
let original;
for(let i=0;i<60;i++) {
 original=await p.evaluate(job=>{
  const images=[...document.querySelectorAll('img')].filter(e=>{
   const u=new URL(e.src);
   return u.pathname.startsWith('/'+job+'/') && /\/0_0\.(?:png|jpe?g)$/.test(u.pathname) && e.complete && e.naturalWidth>0;
  });
  const e=images.sort((a,b)=>b.naturalWidth-a.naturalWidth)[0];
  return e?{url:e.src,width:e.naturalWidth,height:e.naturalHeight}:null;
 },JOB);
 if(original)break;
 await sleep(500);
}
if(!original)throw Error('Upscale original not available yet');
const data=await p.evaluate(async url=>{
 const r=await fetch(url);if(!r.ok)throw Error('Download '+r.status);
 const b=await r.blob();return await new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=no;f.readAsDataURL(b)});
},original.url);
await fs.writeFile('upscaled.bin',Buffer.from(data.split(',')[1],'base64'));
console.log('FINAL_JSON '+JSON.stringify({...original,path:pwd+'/upscaled.bin'}));
'''


def download(frame_id):
    record_path = OUT / 'jobs' / f'{frame_id}.json'
    job = json.loads(record_path.read_text())
    if job['status'] != 'confirmed':
        raise ValueError('Upscale not confirmed: ' + frame_id)
    manifest = OUT / 'downloads' / f'{frame_id}.json'
    if manifest.exists():
        d = json.loads(manifest.read_text())
        if d['job_id'] == job['job_id'] and hashlib.sha256(Path(d['path']).read_bytes()).hexdigest() == d['sha256']:
            return frame_id + ' already downloaded'
        raise ValueError('Existing download differs: ' + frame_id)
    result = subprocess.run(['aside', 'repl', 'const JOB='+json.dumps(job['job_id'])+';\n'+JS], capture_output=True, text=True, timeout=100)
    (OUT / 'logs' / f'{frame_id}-download.log').write_text(result.stdout + result.stderr)
    lines = [line[len('FINAL_JSON '):] for line in result.stdout.splitlines() if line.startswith('FINAL_JSON ')]
    if len(lines) != 1:
        raise RuntimeError(frame_id + ' no full-resolution download; inspect log')
    d = json.loads(lines[0])
    source = Path(d['path'])
    with Image.open(source) as image:
        image.load()
        width, height = image.size
        extension = {'JPEG': '.jpg', 'PNG': '.png'}[image.format]
    if width < 2928 or height < 1648:
        raise ValueError(f'Unexpectedly small upscale {frame_id}: {width}x{height}')
    target = OUT / 'stills' / (frame_id + extension)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() != digest:
        raise ValueError('Refusing to overwrite ' + str(target))
    shutil.copyfile(source, target)
    d.update(id=frame_id, job_id=job['job_id'], source_job_id=job['source_job_id'], selected_index=job['selected_index'],
             path=str(target), width=width, height=height, sha256=digest, bytes=target.stat().st_size,
             action='Upscale > Subtle', local_resampling=False)
    manifest.write_text(json.dumps(d, indent=2))
    return f'{frame_id} {width}x{height} downloaded'


if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = {executor.submit(download, frame): frame for frame in sys.argv[1:]}
        for future in concurrent.futures.as_completed(futures):
            try:
                print(future.result(), flush=True)
            except Exception as error:
                print(futures[future], 'ERROR', str(error), flush=True)
