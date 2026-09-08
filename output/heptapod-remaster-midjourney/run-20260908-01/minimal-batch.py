"""Verified original-only Midjourney edit submissions through Aside UI.

Run with explicit frame IDs. UI submissions are serialized; Midjourney jobs may
render concurrently. An uncertain submission is never retried automatically.
"""
import argparse
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone

from PIL import Image, ImageChops, ImageStat

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "minimal"
TARGET = "35AB84B1A8AF61E25D843AD4D196A77A"
MARKER = "RESULT_JSON "

COMMON = r'''
const p = await attachBrowserTab(CONFIG.target);
const imageHash = u => {
  const match = String(u).match(/\/u\/[^/]+\/([a-f0-9]{64})(?:[_/?"')]|$)/i);
  if (!match) throw Error('Unrecognized uploaded-image URL: '+u);
  return match[1].toLowerCase();
};
const refsNow = async () => await p.evaluate(() => {
  const t=document.querySelector('textarea#desktop_input_bar');
  if(!t) throw Error('Prompt textarea not found');
  const c=t.parentElement.parentElement;
  return [...c.querySelectorAll('[style]')]
    .filter(e=>e.style.backgroundImage)
    .map(e=>({image:e.style.backgroundImage,role:e.parentElement.parentElement.parentElement.innerText}));
});
if(await p.locator('textarea#desktop_input_bar').inputValue())
  throw Error('Prompt is not empty; refusing to overwrite');
'''

UPLOAD = COMMON + r'''
if ((await refsNow()).length) throw Error('Composer already contains reference images');
const response = await fetch(CONFIG.source_url);
if(!response.ok) throw Error('Original source HTTP '+response.status);
await fs.writeFile(CONFIG.id+'.png',Buffer.from(await response.arrayBuffer()));
if(!(await p.locator('input[type=file]').count()))
  await p.locator('button[aria-label="Add Images"]').first().click();
const gallery = async () => await p.evaluate(() =>
  [...document.querySelectorAll('img[alt="image"]')].map(e=>e.src));
let stableSince=Date.now(), previous='', before=null;
const stableDeadline=Date.now()+20000;
while(Date.now()<stableDeadline) {
  const current=await gallery(), key=JSON.stringify(current);
  if(key!==previous) { previous=key; stableSince=Date.now(); }
  if(current.length && Date.now()-stableSince>=1200) { before=current; break; }
  await sleep(300);
}
if(!before) throw Error('Gallery did not populate and stabilize');
await p.getByText('Attach to prompt',{exact:true}).click();
// Snapshot again after switching mode; no upload is attempted against a moving list.
let modePrevious='', modeSince=Date.now();
const modeDeadline=Date.now()+12000;
while(Date.now()<modeDeadline) {
  const current=await gallery(), key=JSON.stringify(current);
  if(key!==modePrevious) {modePrevious=key; modeSince=Date.now();}
  if(current.length && Date.now()-modeSince>=1200) {before=current; break;}
  await sleep(300);
}
if(Date.now()>=modeDeadline) throw Error('Gallery unstable after reference mode selection');
await p.locator('input[type=file]').setInputFiles(CONFIG.id+'.png');
let added=null, selectionMethod=null, last=[];
const uploadDeadline=Date.now()+20000;
while(Date.now()<uploadDeadline) {
  last=await gallery();
  // Duplicate uploads can auto-attach their existing gallery image without
  // changing gallery order. Prefer this observed attachment over list position.
  const attached=await refsNow();
  if(attached.length>1) throw Error('Multiple references after upload; source ambiguous');
  if(attached.length===1) {
    if(!attached[0].role.includes('Attach to prompt'))
      throw Error('Auto-attached reference has incorrect role');
    if(attached[0].image.includes('blob:')) { await sleep(500); continue; }
    const attachedHash=imageHash(attached[0].image);
    const matching=last.filter(u=>{
      try {return imageHash(u)===attachedHash;} catch {return false;}
    });
    if(matching.length) {
      added=matching[0];selectionMethod='auto_attached_hash_matched_gallery_unverified';break;
    }
    await sleep(500);
    continue;
  }
  const fresh=last.filter(u=>!before.includes(u) && u.startsWith('https://cdn.midjourney.com/'));
  if(fresh.length>1) throw Error('Multiple new gallery images; source ambiguous');
  if(fresh.length===1) {added=fresh[0];selectionMethod='new_gallery_url';break;}
  await sleep(500);
}
if(!added) {
  // Duplicate uploads may reuse an existing URL. This is only a candidate;
  // Python must independently verify its pixels before selection/submission.
  if(!last.length) throw Error('No gallery image after upload');
  added=last[0];
  selectionMethod=before[0]===added?'duplicate_first_candidate_unverified':'reordered_first_candidate_unverified';
}
imageHash(added);
const data = await p.evaluate(async url => {
  const r=await fetch(url); if(!r.ok) throw Error('Thumbnail HTTP '+r.status);
  const blob=await r.blob();
  return await new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(Error('Thumbnail FileReader failed'));reader.readAsDataURL(blob);
  });
},added);
await fs.writeFile('thumb.png',Buffer.from(data.split(',')[1],'base64'));
console.log('RESULT_JSON '+JSON.stringify({id:CONFIG.id,source_url:CONFIG.source_url,
 source_local_path:pwd+'/'+CONFIG.id+'.png',source_original_path:CONFIG.source_absolute_path,
 thumb_local_path:pwd+'/thumb.png',uploaded_thumbnail:added,uploaded_hash:imageHash(added),
 selection_method:selectionMethod,before_gallery:before,refs_after_upload:await refsNow()}));
'''

SUBMIT = COMMON + r'''
let submitted=false, beforeJobs=[], refs=[], result={id:CONFIG.id,status:'not_submitted'};
try {
  refs=await refsNow();
  if(!refs.length) {
    await p.locator('img[src='+JSON.stringify(CONFIG.uploaded_thumbnail)+']').click();
    await sleep(500);
    refs=await refsNow();
  }
  if(refs.length!==1 || imageHash(refs[0].image)!==CONFIG.uploaded_hash ||
    !refs[0].role.includes('Attach to prompt'))
    throw Error('Reference count/hash/edit-role mismatch: '+JSON.stringify(refs));
  const top = async () => await p.evaluate(() => {
    const feed=document.querySelector('div.absolute.box-border.overflow-y-scroll');
    if(!feed) throw Error('Known virtual feed scroll container missing');
    feed.scrollTop=0;
  });
  const jobs = async () => await p.evaluate(() =>
    [...document.querySelectorAll('a[href^="/jobs/"]')].map(e=>e.getAttribute('href')));
  await top(); await sleep(500); await top(); await sleep(700);
  beforeJobs=await jobs();
  // Recheck immediately before entering text; no unrelated composer state is replaced.
  if(await p.locator('textarea#desktop_input_bar').inputValue()) throw Error('Prompt changed');
  refs=await refsNow();
  if(refs.length!==1 || imageHash(refs[0].image)!==CONFIG.uploaded_hash ||
     !refs[0].role.includes('Attach to prompt')) throw Error('Reference changed before submit');
  await p.locator('textarea#desktop_input_bar').fill(CONFIG.prompt);
  await p.locator('textarea#desktop_input_bar').press('Enter');
  submitted=true;
  const deadline=Date.now()+30000;
  let verified=[];
  while(Date.now()<deadline) {
    await top();
    const observed=await p.evaluate(({before,prompt}) => {
      const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
      const core=normalize(prompt.split(/\s+--/)[0]);
      const anchors=[...document.querySelectorAll('a[href^="/jobs/"]')];
      const groups={};
      for(const a of anchors) {
        const href=a.getAttribute('href');if(before.includes(href)) continue;
        const match=href.match(/^\/jobs\/([a-f0-9-]+)/i);if(!match) continue;
        const id=match[1];(groups[id] ||= []).push(a);
      }
      return Object.entries(groups).flatMap(([id,links])=>{
        const hrefs=[...new Set(links.map(a=>a.getAttribute('href')))];
        if(hrefs.length<4) return [];
        let e=links[0].parentElement;
        while(e && e!==document.body) {
          const same=[...e.querySelectorAll('a[href^="/jobs/'+id+'"]')];
          if(new Set(same.map(a=>a.getAttribute('href'))).size>=4) {
            const text=normalize(e.innerText).replace(/^\d+%\s*Complete\s*/, '').replace(/^(?:Submitting\.\.\.|Queued|Waiting to start)\s*/, '').replace(/^Edit\s*/, '');
            if(text.startsWith(core)) return [{job_id:id,new_jobs:hrefs,card_text:e.innerText}];
          }
          e=e.parentElement;
        }
        return [];
      });
    },{before:beforeJobs,prompt:CONFIG.prompt});
    if(observed.length>1) throw Error('Multiple new matching jobs; attribution ambiguous');
    if(observed.length===1) {verified=observed;break;}
    await sleep(500);
  }
  if(!verified.length) throw Error('No verified four-image job within 30 seconds');
  result={...result,...verified[0],status:'confirmed',refs,before_jobs:beforeJobs,
    prompt:CONFIG.prompt,uploaded_hash:CONFIG.uploaded_hash,
    prompt_cleared:!(await p.locator('textarea#desktop_input_bar').inputValue()),
    submitted_at:new Date().toISOString()};
} catch(error) {
  result={...result,status:submitted?'submission_uncertain':'not_submitted',
    error:String(error),refs,before_jobs:beforeJobs,prompt:CONFIG.prompt};
}
console.log('RESULT_JSON '+JSON.stringify(result));
'''


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def run_aside(frame_id, stage, code, config):
    source = 'const CONFIG = ' + json.dumps(config, ensure_ascii=False) + ';\n' + code
    log_path = OUT / 'logs' / f'{frame_id}-{stage}.log'
    try:
        result = subprocess.run(['aside', 'repl', source], capture_output=True,
                                text=True, timeout=90)
    except subprocess.TimeoutExpired as error:
        stdout = error.stdout or b''
        stderr = error.stderr or b''
        log_path.write_text((stdout.decode(errors='replace') if isinstance(stdout, bytes) else stdout)
                            + (stderr.decode(errors='replace') if isinstance(stderr, bytes) else stderr))
        raise RuntimeError(f'{stage} timed out; inspect {log_path}; do not retry a possible submission') from error
    log_path.write_text(result.stdout + result.stderr)
    clean = re.sub(r'\x1b\[[0-9;]*m', '', result.stdout)
    records = [line.split(MARKER, 1)[1] for line in clean.splitlines() if MARKER in line]
    if result.returncode or len(records) != 1:
        raise RuntimeError(f'{stage} did not return exactly one result; inspect {log_path}')
    return json.loads(records[0])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('frames', nargs='+', help='Explicit frame IDs, e.g. F01-IN F01-MID')
    parser.add_argument('--prompt-file', type=pathlib.Path)
    args = parser.parse_args()
    frames = {f['id']: f for f in json.loads((ROOT / 'inputs.json').read_text())['frames']}
    contract = json.loads((ROOT / 'pilots/contract.json').read_text())
    if args.prompt_file:
        contract['prompt'] = args.prompt_file.read_text().strip()
    if contract['reference_mode'] != 'Attach to prompt' or contract['reference_count'] != 1:
        raise RuntimeError('Contract must specify exactly one Attach to prompt reference')
    if any(frame_id not in frames for frame_id in args.frames):
        parser.error('Unknown frame ID')
    for name in ('logs', 'jobs', 'thumbs'):
        (OUT / name).mkdir(parents=True, exist_ok=True)
    # Exclusive composer ownership within this controller, including separate invocations.
    import fcntl
    with (OUT / 'composer.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise RuntimeError('Another minimal-batch controller owns the composer') from error
        for frame_id in args.frames:
            frame = frames[frame_id]
            record_path = OUT / 'jobs' / f'{frame_id}.json'
            if record_path.exists():
                prior = json.loads(record_path.read_text())
                if prior.get('status') == 'confirmed' and prior.get('job_id') and prior.get('prompt') == contract['prompt'] and prior.get('source_sha256') == frame['source_sha256']:
                    print(frame_id, 'already confirmed', prior['job_id'], flush=True)
                    continue
                raise RuntimeError(f'Existing unconfirmed or different-contract record requires review: {record_path}')
            original = pathlib.Path(frame['source_absolute_path'])
            if sha256(original) != frame['source_sha256']:
                raise RuntimeError(f'Original hash mismatch: {frame_id}')
            config = dict(target=TARGET, id=frame_id, prompt=contract['prompt'],
                          source_url=f'http://127.0.0.1:8769/sources/{frame_id}.png',
                          source_absolute_path=str(original))
            upload = run_aside(frame_id, 'upload', UPLOAD, config)
            if sha256(pathlib.Path(upload['source_local_path'])) != frame['source_sha256']:
                raise RuntimeError(f'Downloaded source hash mismatch: {frame_id}')
            thumb_path = OUT / 'thumbs' / f'{frame_id}.png'
            shutil.copyfile(upload['thumb_local_path'], thumb_path)
            with Image.open(original) as source, Image.open(thumb_path) as thumb:
                rgb = thumb.convert('RGB')
                resized = source.convert('RGB').resize(rgb.size, Image.Resampling.LANCZOS)
                mae = sum(ImageStat.Stat(ImageChops.difference(resized, rgb)).mean) / 3
                thumb_dimensions = list(rgb.size)
            record = dict(upload, status='reference_verified' if mae <= 3 else 'reference_mismatch',
                          source_sha256=frame['source_sha256'], prompt=contract['prompt'],
                          prompt_sha256=hashlib.sha256(contract['prompt'].encode()).hexdigest(),
                          thumbnail_path=str(thumb_path), thumbnail_sha256=sha256(thumb_path),
                          thumbnail_dimensions=thumb_dimensions, thumbnail_rgb_mae=mae,
                          thumbnail_max_rgb_mae=3, prepared_at=datetime.now(timezone.utc).isoformat())
            save(record_path, record)
            if mae > 3:
                raise RuntimeError(f'{frame_id} thumbnail mismatch MAE={mae:.4f}; no submission')
            print(frame_id, f'reference verified MAE={mae:.4f}', flush=True)
            config.update(uploaded_thumbnail=upload['uploaded_thumbnail'], uploaded_hash=upload['uploaded_hash'])
            record['status'] = 'submission_pending_verification'
            save(record_path, record)
            submitted = run_aside(frame_id, 'submit', SUBMIT, config)
            record.update(submitted)
            save(record_path, record)
            if record['status'] != 'confirmed':
                raise RuntimeError(f'{frame_id}: {record.get("error", record["status"])}; stop and review')
            print(frame_id, 'confirmed', record['job_id'], flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('STOP:', error, file=sys.stderr, flush=True)
        sys.exit(1)
