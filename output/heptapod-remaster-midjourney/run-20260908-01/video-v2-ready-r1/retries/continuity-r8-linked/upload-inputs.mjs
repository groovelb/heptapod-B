import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const R=path.dirname(fileURLToPath(import.meta.url));
for(const f of ['.env','.env.local'])if(fs.existsSync(f))process.loadEnvFile(f);
const key=process.env.FAL_KEY||process.env.FAL_API_KEY||process.env.VITE_FA_AI;if(!key)throw Error('Missing credential');
const require=createRequire(path.resolve('tmp/fal-runner/package.json'));const {fal}=require('@fal-ai/client');fal.config({credentials:key});
const rows=JSON.parse(fs.readFileSync(path.join(R,'input-provenance.json')));const dest=path.join(R,'uploaded-inputs.json');const old=fs.existsSync(dest)?JSON.parse(fs.readFileSync(dest)):[];
for(const row of rows){
 if(old.some(r=>r.sha256===row.sha256))continue;
 const data=fs.readFileSync(row.path);if(createHash('sha256').update(data).digest('hex')!==row.sha256)throw Error('Input changed');
 const url=await fal.storage.upload(new File([data],path.basename(row.path),{type:'image/png'}));old.push({...row,url});fs.writeFileSync(dest,JSON.stringify(old,null,2)+'\n',{mode:0o600});console.log('Uploaded exact frame:',row.id);
}
