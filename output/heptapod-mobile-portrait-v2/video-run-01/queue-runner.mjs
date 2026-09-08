// Mobile adaptation of the PC r8 durable queue. One initial request per clip, no rerolls.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {execFileSync} from 'node:child_process';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
const R=path.dirname(fileURLToPath(import.meta.url)), W=path.resolve(R,'../../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const save=(f,d)=>{const temp=f+'.tmp';const fd=fs.openSync(temp,'w',0o600);try{fs.writeFileSync(fd,JSON.stringify(d,null,2)+'\n');fs.fsyncSync(fd)}finally{fs.closeSync(fd)}fs.renameSync(temp,f)};
const args=process.argv.slice(2), live=args.includes('--run');
const ids=args.includes('--only')?args[args.indexOf('--only')+1].split(','):[];
if(!ids.length||ids.some(id=>!/^C0[1-8]$/.test(id))||new Set(ids).size!==ids.length)throw Error('Explicit --only C01,C02,... required');
const specPath=path.join(R,'specs.json'), spec=read(specPath);
const clips=ids.map(id=>spec.clips.find(c=>c.id===id));
function verify(c){
 if(!c||c.model!=='fal-ai/kling-video/v3/pro/image-to-video')throw Error('Unexpected model/spec');
 for(const f of [c.start,c.end].filter(Boolean))if(sha(fs.readFileSync(f.path))!==f.sha256)throw Error(c.id+': reference changed');
 if(c.input.generate_audio!==false||Number(c.input.duration)!==[4,8,5,6,6,6,6,6][Number(c.id.slice(1))-1])throw Error('Duration/audio contract mismatch');
}
clips.forEach(verify);
const recorded=[];
for(const dir of [path.join(R,'states'),...fs.existsSync(path.join(R,'retries'))?fs.readdirSync(path.join(R,'retries')).map(d=>path.join(R,'retries',d)):[]]){
 if(fs.existsSync(dir))for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.json')&&(dir.endsWith('states')||n==='state.json')))recorded.push(read(path.join(dir,name)));
}
const submitted=new Set(recorded.filter(s=>s.request_id).map(s=>s.request_id)).size;
const uncertain=recorded.filter(s=>!s.request_id&&['submission_pending','submission_unknown'].includes(s.status)).length;
const fresh=clips.filter(c=>!fs.existsSync(path.join(R,'states',c.id+'.json'))).length;
if(submitted+uncertain+fresh>(spec.max_total_requests||spec.max_initial_requests))throw Error('Recorded request budget would be exceeded');
if(!live){console.log(JSON.stringify({status:'offline_valid',clips:ids,seconds:clips.reduce((n,c)=>n+Number(c.input.duration),0),new_requests_at_most:ids.length,automatic_retry:false}));process.exit(0)}
for(const f of ['.env','.env.local'])if(fs.existsSync(path.join(W,f)))process.loadEnvFile(path.join(W,f));
const key=process.env.FAL_KEY||process.env.FAL_API_KEY||process.env.VITE_FA_AI;
if(!key)throw Error('Configured Fal credential missing');
const {fal}=createRequire(path.join(W,'tmp/fal-runner/package.json'))('@fal-ai/client');
const context=new AsyncLocalStorage();
fal.config({credentials:key,fetch:async(url,options={})=>{
 const ctx=context.getStore();
 if(ctx&&new URL(String(url)).hostname==='queue.fal.run'&&String(options.method||'GET').toUpperCase()==='POST'){
  if(ctx.posted)throw Error('Duplicate generation POST blocked');ctx.posted=true;
 }
 return fetch(url,options);
}});
for(const d of ['states','clips','uploads'])fs.mkdirSync(path.join(R,d),{recursive:true});
const lock=path.join(R,'queue.lock');
if(fs.existsSync(lock)){const old=read(lock);let alive=true;try{process.kill(old.pid,0)}catch(e){if(e.code==='ESRCH')alive=false}if(alive)throw Error('Queue controller already active');fs.unlinkSync(lock)}
fs.writeFileSync(lock,JSON.stringify({pid:process.pid,ids}),{flag:'wx',mode:0o600});
const clean=e=>String(e?.message||e).split(key).join('[REDACTED]');
const uploadCache=new Map();
async function upload(f){
 if(uploadCache.has(f.sha256))return uploadCache.get(f.sha256);
 const job=(async()=>{const cache=path.join(R,'uploads',f.sha256+'.json');if(fs.existsSync(cache))return read(cache).url;
  const bytes=fs.readFileSync(f.path);if(sha(bytes)!==f.sha256)throw Error('Input hash changed');
  const url=await fal.storage.upload(new File([bytes],path.basename(f.path),{type:'image/png'}));save(cache,{id:f.id,path:f.path,sha256:f.sha256,url});return url})();
 uploadCache.set(f.sha256,job);return job;
}
let stopped=false,cursor=0;
async function run(c){
 const file=path.join(R,'states',c.id+'.json'),out=path.join(R,'clips',c.id+'.mp4'),contract=sha(JSON.stringify(c));
 const s=fs.existsSync(file)?read(file):{id:c.id,status:'prepared',contract_sha256:contract};
 if(s.contract_sha256!==contract)throw Error(c.id+': frozen request spec changed');
 if(s.status==='downloaded'){if(sha(fs.readFileSync(out))!==s.output_sha256)throw Error('Completed output changed');console.log(c.id,'already downloaded');return}
 if(!s.request_id&&['submission_pending','submission_unknown','rejected'].includes(s.status))throw Error('Unresolved or rejected submission; automatic resubmit prohibited');
 try{
  if(!s.request_id){
   verify(c);s.status='uploading';save(file,s);
   s.input={...c.input,start_image_url:await upload(c.start)};
   if(c.end)s.input.end_image_url=await upload(c.end);
   if(stopped){s.status='prepared';save(file,s);return}
   verify(c);s.status='submission_pending';s.started_at=new Date().toISOString();save(file,s);
   const q=await context.run({posted:false},()=>fal.queue.submit(c.model,{input:s.input,abortSignal:AbortSignal.timeout(90000)}));
   if(!q.request_id)throw Error('Queue lacks request ID');
   s.request_id=q.request_id;s.queue_response=q;s.status='queued';s.submitted_at=new Date().toISOString();save(file,s);
   console.log(c.id,'submitted',s.request_id);
  }
  const deadline=Date.now()+3600000;let prev='';
  while(!s.result){
   if(Date.now()>deadline)throw Error('Polling deadline; resume the existing request ID');
   const q=await fal.queue.status(c.model,{requestId:s.request_id,logs:false,abortSignal:AbortSignal.timeout(60000)});
   s.queue_status=q.status;s.polled_at=new Date().toISOString();save(file,s);
   if(prev!==q.status){console.log(c.id,q.status);prev=q.status}
   if(q.status==='COMPLETED'){s.result=(await fal.queue.result(c.model,{requestId:s.request_id})).data;s.status='completed';save(file,s);break}
   await new Promise(r=>setTimeout(r,10000));
  }
  const url=s.result.video?.url;if(!url)throw Error('Missing result video URL');
  const res=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!res.ok)throw Error('Download HTTP '+res.status);
  await pipeline(Readable.fromWeb(res.body),fs.createWriteStream(out+'.part'));fs.renameSync(out+'.part',out);
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',out],{encoding:'utf8'}));
  s.output=out;s.output_sha256=sha(fs.readFileSync(out));s.probe=probe;s.status='downloaded';save(file,s);
  const v=probe.streams.find(v=>v.codec_type==='video');
  if(v.height<=v.width||Math.abs(v.width/v.height-9/16)>.004||v.r_frame_rate!=='24/1'||Number(v.nb_frames)!==Number(c.input.duration)*24+1){s.status='media_review_required';save(file,s);throw Error('Native portrait media contract mismatch; no resubmit')}
  console.log(c.id,'DOWNLOADED',v.width+'x'+v.height,v.nb_frames+' frames');
 }catch(e){s.error=clean(e);s.http_status=e.status;s.status=s.status==='media_review_required'?s.status:s.request_id?'resumable_error':s.status==='submission_pending'?(e.status>=400&&e.status<500?'rejected':'submission_unknown'):'pre_submit_error';save(file,s);throw e}
}
const sync=()=>{try{execFileSync('python3',[path.join(R,'sync-status.py')],{stdio:'ignore'})}catch{console.error('Status page sync pending')}};
const hb=setInterval(()=>{sync();console.log('Queue active',new Date().toISOString())},30000);
try{await Promise.all(Array.from({length:Math.min(2,clips.length)},async()=>{while(!stopped&&cursor<clips.length){const c=clips[cursor++];try{await run(c)}catch(e){stopped=true;console.error(c.id,clean(e));process.exitCode=1}}}))}
finally{clearInterval(hb);sync();fs.unlinkSync(lock)}
