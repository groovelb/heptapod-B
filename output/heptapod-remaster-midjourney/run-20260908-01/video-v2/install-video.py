import pathlib,json,hashlib,shutil,os
r=pathlib.Path(__file__).resolve().parent
w=r.parents[3]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
v=json.loads((r/'staging/assembly-validation.json').read_text())
assert v['status']=='passed'
seams=json.loads((r/'qa/seams.json').read_text())
assert seams['delivery_approved'], 'Scene joins must be reviewed before replacement'
delivery=json.loads((r/'delivery-manifest.json').read_text())
assert delivery['status']=='ready' and len(delivery['clips'])==8
for c in delivery['clips']:
 item=next(i for i in v['inputs'] if i['id']==c['id'])
 assert item['sha256']==c['sha256'] and digest(pathlib.Path(c['path']))==c['sha256'], 'Assembly inputs must be the accepted clips'
qas=[json.loads((r/f'qa/{name}.json').read_text()) for name in ['A','B','C']]
clips=[c for q in qas for c in q['clips']]
assert len(clips)==8 and {c['id'] for c in clips}=={f'C{i:02}' for i in range(1,9)}
assert all(c.get('delivery_approved') for c in clips), 'All clips require visual QA acceptance before replacement'
changes=[]
for variant in ['1920','960']:
 target=w/f'public/heptapod-b-encoder/hero-scrub/hero-scrub-{variant}.mp4'
 source=r/f'staging/hero-scrub-{variant}.mp4'
 backup=r/f'rollback/hero-scrub/hero-scrub-{variant}.mp4'
 row=next(c for c in v['outputs'] if c['variant']==variant)
 assert digest(source)==row['sha256']
 assert digest(target)==digest(backup), 'Live original has changed; inspect before replacement'
 changes.append({'path':str(target),'before_sha256':digest(target),'after_sha256':digest(source),'backup':str(backup),'source':str(source)})
for c in changes:
 target=pathlib.Path(c['path']);temporary=target.with_suffix('.v2-pending.mp4');shutil.copyfile(c['source'],temporary);assert digest(temporary)==c['after_sha256'];os.replace(temporary,target)
previous=json.loads((r/'pre-replacement-hashes.json').read_text())
unchanged=[]
for c in previous:
 p=w/c['path']
 if str(p) in {x['path'] for x in changes}:continue
 unchanged.append({'path':c['path'],'unchanged':p.is_file() and digest(p)==c['sha256']})
report={'status':'installed','video_only_replacement':True,'changes':changes,'other_tracked_assets':unchanged,'all_other_tracked_assets_unchanged':all(x['unchanged'] for x in unchanged)}
(r/'installation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
