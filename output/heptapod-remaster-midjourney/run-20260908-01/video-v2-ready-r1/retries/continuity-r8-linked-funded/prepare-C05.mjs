import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const R=path.dirname(fileURLToPath(import.meta.url));const sha=b=>createHash('sha256').update(b).digest('hex');
const gate=JSON.parse(fs.readFileSync(path.join(R,'qa/C04/root-gate.json')));const source=path.resolve(gate.path);if(!source.startsWith(R+path.sep))throw Error('Approved C04 must belong to this revision');
if(gate.delivery_approved!==true||gate.sha256!==sha(fs.readFileSync(source)))throw Error('C04 has no matching root approval; C05 remains blocked');
const ref=JSON.parse(fs.readFileSync(path.join(R,'inputs/C05-start-provenance.json')));
if(ref.video_sha256!==gate.sha256||ref.frame_index!==144||sha(fs.readFileSync(ref.path))!==ref.sha256)throw Error('C05 start is not approved C04 actual last frame');
const template=JSON.parse(fs.readFileSync(path.join(R,'spec-C05.template.json')));const end=template.end_reference;
if(sha(fs.readFileSync(end.path))!==end.sha256||sha(fs.readFileSync(end.video))!==end.video_sha256)throw Error('Approved C06 endpoint changed');
const specPath=path.join(R,'spec-C05.json');if(fs.existsSync(specPath))throw Error('C05 spec exists; inspect it instead of overwriting');
for(const f of ['.env','.env.local'])if(fs.existsSync(f))process.loadEnvFile(f);
const key=process.env.FAL_KEY||process.env.FAL_API_KEY||process.env.VITE_FA_AI;if(!key)throw Error('Missing credential');
const require=createRequire(path.resolve('tmp/fal-runner/package.json'));const {fal}=require('@fal-ai/client');fal.config({credentials:key});
const saved=path.join(R,'inputs/C05-start-upload.json');let start;
if(fs.existsSync(saved)){start=JSON.parse(fs.readFileSync(saved));if(start.sha256!==ref.sha256)throw Error('Prior uploaded start differs');}
else{const url=await fal.storage.upload(new File([fs.readFileSync(ref.path)],path.basename(ref.path),{type:'image/png'}));start={...ref,url};fs.writeFileSync(saved,JSON.stringify(start,null,2)+'\n',{mode:0o600});}
const input={...template.input_template,start_image_url:start.url};
const spec={scope:'C05 continues actual approved C04 last frame, ending at exact approved C06 first frame',max_new_paid_requests:1,automatic_paid_retry:false,clips:[{id:'C05',model:template.model,references:[start,end],input,frames:145}]};
fs.writeFileSync(specPath,JSON.stringify(spec,null,2)+'\n',{mode:0o600,flag:'wx'});console.log('C05 exact shared-frame spec prepared. No generation request submitted.');
