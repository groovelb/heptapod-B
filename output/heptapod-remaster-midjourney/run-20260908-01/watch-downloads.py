import json, pathlib, subprocess, time
r=pathlib.Path(__file__).resolve().parent
end=time.time()+2400
tries={}
while time.time()<end:
    pairs=[]
    for p in sorted((r/'minimal/jobs').glob('*.json')):
        d=json.loads(p.read_text())
        if d.get('status')!='confirmed' or (r/'minimal/downloads'/p.name).exists(): continue
        if time.time()-p.stat().st_mtime<35 or tries.get(p.stem,0)>=3: continue
        pairs.append(p.stem+'='+d['job_id'])
    if pairs:
        batch=pairs[:2]
        for pair in batch: tries[pair.split('=')[0]]=tries.get(pair.split('=')[0],0)+1
        subprocess.run(['python3',str(r/'download-minimal.py'),*batch,'--workers','2'])
        subprocess.run(['python3',str(r/'build-minimal-review.py')])
    n=len(list((r/'minimal/downloads').glob('*.json')))
    if n>=22: print('ALL 22 BATCH FRAMES DOWNLOADED',flush=True); break
    time.sleep(5)
