import pathlib,json,re,subprocess,concurrent.futures
r=pathlib.Path(__file__).resolve().parent
rows=[]
for p in sorted((r/'variation/jobs').glob('*.json')):
 d=json.loads(p.read_text())
 if d.get('status')=='confirmed':rows.append(d)
def check(d):
 expected=re.findall(r'button "(https://s.mj.run/[^"]+)',d['action_snapshot'])[-1]
 js="const p=await openTab("+json.dumps('https://www.midjourney.com/jobs/'+d['job_id']+'?index=0')+");await sleep(1200);console.log('AUDIT '+JSON.stringify({tree:(await snapshot(p)).tree}));"
 result=subprocess.run(['aside','repl',js],capture_output=True,text=True,timeout=35)
 (r/'variation/logs'/f"{d['id']}-lineage.log").write_text(result.stdout+result.stderr)
 match=[s[6:] for s in result.stdout.splitlines() if s.startswith('AUDIT ')]
 if len(match)!=1:return {'id':d['id'],'error':'snapshot missing'}
 tree=json.loads(match[0])['tree'];refs=re.findall(r'button "(https://s.mj.run/[^"]+)',tree)
 observed=refs[-1] if refs else None
 return {'id':d['id'],'job_id':d['job_id'],'expected_reference':expected,'observed_reference':observed,'pass':expected==observed,'observed_variation_label':bool(re.search(r'text: "Variation',tree))}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 results=[]
 for d in pool.map(check,rows):results.append(d);print(json.dumps(d),flush=True)
(r/'variation/lineage-audit.json').write_text(json.dumps({'frames':results,'all_pass':len(results)==24 and all(d.get('pass') for d in results)},indent=2)+'\n')
