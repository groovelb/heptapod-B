import pathlib,json,hashlib,shutil
r=pathlib.Path(__file__).resolve().parent
rows={c['id']:c for n in ['A','B','C'] for c in json.loads((r/f'qa/{n}.json').read_text())['clips']}
clips=[];pending=[]
(r/'final-clips').mkdir(exist_ok=True)
for i in range(1,9):
 cid=f'C{i:02}';qa=rows.get(cid,{})
 if not qa.get('delivery_approved'):pending.append(cid);continue
 source=pathlib.Path(qa.get('path',str(r/f'clips/{cid}.mp4')))
 if not source.is_absolute():source=r.parents[3]/source
 sha=hashlib.sha256(source.read_bytes()).hexdigest()
 assert not qa.get('sha256') or qa['sha256']==sha
 attempt=qa.get('attempt',2 if '/attempt-2/' in str(source) else 3 if '/attempt-3/' in str(source) else 1)
 statepath=r/f'states/{cid}.json' if attempt==1 else r/f'retries/attempt-{attempt}/states/{cid}.json'
 state=json.loads(statepath.read_text());assert state['status']=='downloaded' and state['output_sha256']==sha
 target=r/f'final-clips/{cid}.mp4'
 if target.exists():assert hashlib.sha256(target.read_bytes()).hexdigest()==sha,'A previously accepted final clip differs'
 else:shutil.copyfile(source,target)
 clips.append({'id':cid,'attempt':attempt,'source':str(source),'path':str(target),'sha256':sha,'request_id':state['request_id']})
d={'status':'preparing' if pending else 'ready','clips':clips,'pending':pending}
(r/'delivery-manifest.json').write_text(json.dumps(d,indent=2)+'\n');print(json.dumps({'approved':len(clips),'pending':pending}))
