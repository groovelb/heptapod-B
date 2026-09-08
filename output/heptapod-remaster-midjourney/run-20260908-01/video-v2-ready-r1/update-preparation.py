"""Refresh review selections and QA without changing public assets or approved clips."""
import hashlib,json,pathlib,shutil
R=pathlib.Path(__file__).resolve().parent
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p: json.loads(p.read_text())
write=lambda p,d:p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
m=read(R/'delivery-manifest.json')
rows={x['id']:x for x in m['clips']}
qa={}
decisions=read(R/'review-decisions.json').get('clips',{}) if (R/'review-decisions.json').is_file() else {}
for owner in ['A','C']:
 reports=[]
 for p in sorted((R/'qa'/owner).glob('C[0-9][0-9].json')):
  d=read(p)
  decision=decisions.get(d['id'],{})
  if decision.get('qa_path'):d=read(R/decision['qa_path'])
  d.update({k:v for k,v in decision.items() if k in ['delivery_approved','notes','motion_accepted_by_user']})
  reports.append(d);qa[d['id']]=d
 write(R/'qa'/f'{owner}.json',{'clips':reports})
for n in range(1,9):
 cid=f'C{n:02d}'
 if n in [6,8]:
  assert sha(pathlib.Path(rows[cid]['path']))==rows[cid]['sha256']
  continue
 source=R/('processed' if n == 7 else 'clips')
 source=source/(cid+'-continuous')/f'{cid}.mp4' if n == 7 else source/f'{cid}.mp4'
 decision=decisions.get(cid,{})
 if decision.get('source'):source=R/decision['source']
 if not source.is_file():continue
 target=R/'final-clips'/f'{cid}.mp4'
 if not target.is_file():shutil.copy2(source,target)
 assert sha(target)==sha(source),'Existing preparation copy differs: '+cid
 rows[cid]={'id':cid,'source':str(source),'path':str(target),'sha256':sha(target),'attempt':decision.get('attempt',1),'source_kind':decision.get('source_kind','generated'),'user_approved':False,'selection':'review_candidate','visual_qa':qa.get(cid,{}).get('delivery_approved'),'motion_accepted_by_user':decision.get('motion_accepted_by_user',False)}
m['clips']=[rows[c] for c in sorted(rows)]
m['pending']=[f'C{i:02d}' for i in range(1,9) if f'C{i:02d}' not in rows]
m['visual_issues']=[f"{c}: "+' '.join(d.get('notes',[])) for c,d in sorted(qa.items()) if d.get('delivery_approved') is False]
m['status']='review_ready' if not m['pending'] and (R/'staging'/'assembly-validation.json').is_file() else 'preparing'
m['public_replacement_performed']=False
write(R/'delivery-manifest.json',m)
print('Prepared',len(rows),'/ 8; pending:',m['pending'],'; visual issue clips:',[c for c,d in qa.items() if d.get('delivery_approved') is False])
