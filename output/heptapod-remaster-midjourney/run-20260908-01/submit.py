"""Submit preserved still prompts through Aside's Midjourney browser UI."""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
frames = {f['id']: f for f in json.loads((ROOT / 'inputs.json').read_text())['frames']}
for frame_id in sys.argv[1:]:
    frame = frames[frame_id]
    code = '''
const p = await attachBrowserTab("35AB84B1A8AF61E25D843AD4D196A77A");
const f = FRAME;
const beforeJobs = await p.evaluate(() => [...document.querySelectorAll('a[href^="/jobs/"]')].map(e=>e.getAttribute('href')));
if (await p.locator('textarea#desktop_input_bar').inputValue()) throw Error('Prompt is not empty; refusing to overwrite');
const bytes = Buffer.from(await (await fetch('http://127.0.0.1:8769/sources/'+f.id+'.png')).arrayBuffer());
await fs.writeFile(f.id+'.png',bytes);
if (!(await p.locator('input[type=file]').count())) await p.locator('button[aria-label="Add Images"]').first().click();
await sleep(500);
await p.getByText('Image Prompts',{exact:true}).click();
const before = await p.evaluate(() => [...document.querySelectorAll('img[alt="image"]')].map(e=>e.src));
await p.locator('input[type=file]').setInputFiles(f.id+'.png');
let added;
for(let i=0;i<30;i++) {
  const imgs=await p.evaluate(()=>[...document.querySelectorAll('img[alt="image"]')].map(e=>e.src));
  added=imgs.find(u=>!before.includes(u) && u.startsWith('https://cdn.midjourney.com/'));
  if(added) break;
  await sleep(1000);
}
if(!added) throw Error('No newly uploaded image found; not submitting');
await sleep(500);
const already = await p.evaluate(()=>{const c=document.querySelector('textarea').parentElement.parentElement;return [...c.querySelectorAll('[style]')].some(e=>e.style.backgroundImage);});
if(!already) await p.locator('img[src='+JSON.stringify(added)+']').click();
await sleep(500);
const refs = await p.evaluate(()=>{const c=document.querySelector('textarea').parentElement.parentElement;return [...c.querySelectorAll('[style]')].filter(e=>e.style.backgroundImage).map(e=>({image:e.style.backgroundImage,role:e.parentElement.parentElement.parentElement.innerText}));});
if(refs.length!==1 || !refs[0].role.includes('Image Prompts')) throw Error('Reference count/role mismatch: '+JSON.stringify(refs));
await p.locator('textarea#desktop_input_bar').fill(f.midjourney_prompt_text);
await p.locator('textarea#desktop_input_bar').press('Enter');
await sleep(2000);
const afterJobs = await p.evaluate(() => [...document.querySelectorAll('a[href^="/jobs/"]')].map(e=>e.getAttribute('href')));
const text = await p.evaluate(()=>document.body.innerText);
console.log('RESULT_JSON '+JSON.stringify({id:f.id,uploaded_thumbnail:added,refs,new_jobs:afterJobs.filter(j=>!beforeJobs.includes(j)),prompt_cleared:!(await p.locator('textarea#desktop_input_bar').inputValue()),page_text:text,submitted_at:new Date().toISOString()}));
'''.replace('FRAME', json.dumps(frame, ensure_ascii=False))
    result = subprocess.run(['aside', 'repl', code], capture_output=True, text=True)
    (ROOT / 'logs').mkdir(exist_ok=True)
    (ROOT / 'logs' / f'{frame_id}.log').write_text(result.stdout + result.stderr)
    marker = next((line[len('RESULT_JSON '):] for line in result.stdout.splitlines() if line.startswith('RESULT_JSON ')), None)
    if not marker:
        print(frame_id, 'FAILED', (result.stdout + result.stderr)[-1600:], flush=True)
        sys.exit(1)
    record = json.loads(marker)
    (ROOT / 'jobs').mkdir(exist_ok=True)
    (ROOT / 'jobs' / f'{frame_id}.json').write_text(json.dumps(record, ensure_ascii=False, indent=2))
    print(frame_id, 'submitted', record['new_jobs'], flush=True)
    if not record['prompt_cleared'] or any(s in record['page_text'].lower() for s in ['queue is full', 'subscription required', 'failed to submit', 'you have reached']):
        print('Submission needs review; stopping batch', flush=True)
        sys.exit(1)
