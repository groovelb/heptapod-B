import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
const R=path.dirname(fileURLToPath(import.meta.url)),W=path.resolve(R,'../../../../../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=fs.readFileSync(path.join(R,'spec.json')),spec=JSON.parse(bytes),specSha=sha(bytes);
for(const d of ['states','clips'])fs.mkdirSync(path.join(R,d),{recursive:true});
const key=process.env.FAL_KEY||process.env.FAL_API_KEY||process.env.VITE_FA_AI;
if(!key)throw Error('Missing configured Fal credential');
const require=createRequire(path.join(W,'tmp/fal-runner/package.json'));
const {fal}=require('@fal-ai/client');const context=new AsyncLocalStorage();
fal.config({credentials:key,fetch:async(url,options={})=>{
 const ctx=context.getStore();
 if(ctx&&new URL(String(url)).hostname==='queue.fal.run'&&String(options.method||'GET').toUpperCase()==='POST'){
  if(ctx.posted)throw Error('Ambiguous submit: duplicate POST blocked');ctx.posted=true;
 }
 return fetch(url,options);
}});
const save=(file,d)=>{fs.writeFileSync(file+'.tmp',JSON.stringify(d,null,2)+'\n',{mode:0o600});fs.renameSync(file+'.tmp',file)};
const clean=e=>String(e?.message||e).split(key).join('[REDACTED]');
const only=process.argv[process.argv.indexOf('--only')+1];
if(!process.argv.includes('--only')||!['C02','C04','C05','C06'].includes(only))throw Error('Explicit one-clip --only required');
const scheduled=spec.clips.filter(c=>c.id===only);
let stopped=false,cursor=0;
const lock=path.join(R,'queue.lock');
if(fs.existsSync(lock)){const old=JSON.parse(fs.readFileSync(lock));let alive=true;try{process.kill(old.pid,0)}catch(e){if(e.code==='ESRCH')alive=false}if(alive)throw Error('Controller already active');fs.unlinkSync(lock)}
fs.writeFileSync(lock,JSON.stringify({pid:process.pid}),{flag:'wx',mode:0o600});
async function run(c){
 const file=path.join(R,'states',c.id+'.json'),out=path.join(R,'clips',c.id+'.mp4');
 const s=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{id:c.id,status:'prepared',spec_sha256:specSha};
 if(s.spec_sha256!==specSha)throw Error(c.id+': spec changed');
 if(['rejected_top_up','rejected_http403'].includes(s.status))throw Error(c.id+': recorded terminal TOP_UP rejection; restore account access before recording a new attempt');
 if(s.status==='downloaded'){if(sha(fs.readFileSync(out))!==s.output_sha256)throw Error('Output changed');return}
 if(!s.request_id&&['submission_pending','submission_unknown'].includes(s.status))throw Error('Unresolved submission; no resubmit');
 try{
  if(!s.request_id){
   // Reuse prior uploads only after verifying both local and remote bytes against v2 provenance.
   for(const f of c.references){
    if(sha(fs.readFileSync(f.path))!==f.sha256)throw Error('v2 reference changed: '+f.id);
    const response=await fetch(f.url,{signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw Error('Reference URL unavailable: '+response.status);
    if(sha(Buffer.from(await response.arrayBuffer()))!==f.sha256)throw Error('Remote reference mismatch: '+f.id);
   }
   s.input=c.input;s.status='submission_pending';save(file,s);
   const q=await context.run({posted:false},()=>fal.queue.submit(c.model,{input:c.input,abortSignal:AbortSignal.timeout(90000)}));
   if(!q.request_id)throw Error('No request ID');s.request_id=q.request_id;s.status='queued';s.submitted_at=new Date().toISOString();save(file,s);
   console.log(c.id,'submitted',s.request_id);
  }
  const deadline=Date.now()+2700000;let prev='';
  while(!s.result){
   if(Date.now()>deadline)throw Error('Polling deadline; resume existing request');
   const q=await fal.queue.status(c.model,{requestId:s.request_id,logs:false,abortSignal:AbortSignal.timeout(60000)});
   s.queue_status=q.status;s.polled_at=new Date().toISOString();save(file,s);
   if(q.status!==prev){console.log(c.id,q.status);prev=q.status}
   if(q.status==='COMPLETED'){s.result=(await fal.queue.result(c.model,{requestId:s.request_id})).data;s.status='completed';save(file,s);break}
   await new Promise(r=>setTimeout(r,10000));
  }
  const url=s.result.video?.url;if(!url)throw Error('Missing result video');
  const res=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!res.ok)throw Error('Download HTTP '+res.status);
  await pipeline(Readable.fromWeb(res.body),fs.createWriteStream(out+'.part'));fs.renameSync(out+'.part',out);
  s.output=out;s.output_sha256=sha(fs.readFileSync(out));s.status='downloaded';save(file,s);console.log(c.id,'DOWNLOADED',s.output_sha256);
 }catch(e){s.error=clean(e);s.error_details={http_status:e.status,body:e.body};s.status=e.status===403?'rejected_http403':s.request_id?'resumable_error':s.status==='submission_pending'?'submission_unknown':'pre_submit_error';save(file,s);throw e}
}
const hb=setInterval(()=>console.log('Generation active',new Date().toISOString()),30000);
try{
 await Promise.all(Array.from({length:1},async()=>{while(!stopped&&cursor<scheduled.length){const c=scheduled[cursor++];try{await run(c)}catch(e){console.error(c.id,clean(e));stopped=true;process.exitCode=1}}}));
}finally{clearInterval(hb);fs.unlinkSync(lock)}
