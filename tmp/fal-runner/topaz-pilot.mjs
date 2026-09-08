import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fal } from '@fal-ai/client';

const key = process.env.FAL_KEY || process.env.FAL_API_KEY || process.env.VITE_FA_AI;
if (!key) throw new Error('Missing fal credentials');
fal.config({ credentials: key });
const root = path.resolve('output/heptapod-remaster-v2/run-20260908-01');
const dest = path.join(root, 'upscale/topaz-pilot-01');
await fs.mkdir(dest, { recursive: true });
const endpoint = 'topaz/upscale/image/precision';
const settings = { model: 'High Fidelity V3', upscale_factor: 2, output_format: 'png', face_enhancement: false, subject_detection: 'All', crop_to_fill: false };

async function run(id) {
  const metadata = path.join(dest, `${id}.json`);
  let record;
  try { record = JSON.parse(await fs.readFile(metadata, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (record?.status === 'downloaded') { console.log(`${id}: already downloaded`); return; }
  if (!record?.request_id) {
    const source = path.join(root, `stills/master/${id}.png`);
    const bytes = await fs.readFile(source);
    const image_url = await fal.storage.upload(new File([bytes], `${id}.png`, { type: 'image/png' }));
    const input = { image_url, ...settings };
    const submitted = await fal.queue.submit(endpoint, { input });
    record = { id, endpoint, settings, source: path.relative(process.cwd(), source), source_sha256: crypto.createHash('sha256').update(bytes).digest('hex'), request_id: submitted.request_id, submitted_at: new Date().toISOString(), status: 'submitted' };
    await fs.writeFile(metadata, JSON.stringify(record, null, 2) + '\n');
    console.log(`${id}: submitted ${record.request_id}`);
  }
  let last;
  for (;;) {
    const status = await fal.queue.status(endpoint, { requestId: record.request_id, logs: false });
    if (status.status !== last) { console.log(`${id}: ${status.status}`); last = status.status; }
    if (status.status === 'COMPLETED') break;
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  const result = await fal.queue.result(endpoint, { requestId: record.request_id });
  record.result = result.data;
  record.status = 'completed';
  await fs.writeFile(metadata, JSON.stringify(record, null, 2) + '\n');
  const response = await fetch(result.data.image.url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const output = path.join(dest, `${id}-topaz-2x.png`);
  await fs.writeFile(output, bytes);
  Object.assign(record, { status: 'downloaded', output: path.relative(process.cwd(), output), output_sha256: crypto.createHash('sha256').update(bytes).digest('hex'), completed_at: new Date().toISOString() });
  await fs.writeFile(metadata, JSON.stringify(record, null, 2) + '\n');
  console.log(`${id}: saved ${bytes.length} bytes`);
}

const results = await Promise.allSettled(['F01-IN', 'F06-MID'].map(run));
for (let i = 0; i < results.length; i++) {
  if (results[i].status === 'rejected') { console.error(`Job ${i} failed: ${results[i].reason?.message}`); process.exitCode = 1; }
}
