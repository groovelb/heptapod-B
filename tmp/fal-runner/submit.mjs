import fs from 'node:fs/promises';
import path from 'node:path';
import { fal } from '@fal-ai/client';

const [, , specPath] = process.argv;

if (!specPath) {
  console.error('Usage: node tmp/fal-submit-i2v.mjs <spec.json>');
  process.exit(1);
}

const key = process.env.FAL_KEY || process.env.FAL_API_KEY || process.env.VITE_FA_AI;

if (!key) {
  console.error('Missing FAL_KEY, FAL_API_KEY, or VITE_FA_AI.');
  process.exit(1);
}

fal.config({ credentials: key });

const workspace = process.cwd();
const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
const model = spec.model || 'fal-ai/kling-video/v3/pro/image-to-video';

async function uploadImage(localPath) {
  const abs = path.resolve(workspace, localPath);
  const data = await fs.readFile(abs);
  const file = new File([data], path.basename(localPath), { type: 'image/png' });
  return fal.storage.upload(file);
}

async function submitClip(clip) {
  const startImageUrl = await uploadImage(clip.start);
  const endImageUrl = clip.end ? await uploadImage(clip.end) : undefined;
  const input = {
    prompt: clip.prompt,
    start_image_url: startImageUrl,
    duration: clip.duration || spec.duration || '5',
    negative_prompt: clip.negative_prompt || spec.negative_prompt,
    cfg_scale: clip.cfg_scale ?? spec.cfg_scale,
  };

  if (endImageUrl) input.end_image_url = endImageUrl;
  if (clip.generate_audio !== undefined || spec.generate_audio !== undefined) {
    input.generate_audio = clip.generate_audio ?? spec.generate_audio;
  }

  let lastStatus = null;
  const result = await fal.subscribe(model, {
    input,
    logs: true,
    pollInterval: spec.poll_interval_ms || 10000,
    timeout: spec.timeout_ms || 1800000,
    onQueueUpdate: (status) => {
      lastStatus = status;
      const position = 'queue_position' in status ? ` position=${status.queue_position}` : '';
      console.log(`${clip.id}: ${status.status}${position}`);
    },
  });

  const videoUrl = findVideoUrl(result.data);
  let downloaded = false;

  if (videoUrl && clip.output) {
    const outPath = path.resolve(workspace, clip.output);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download ${clip.id}: ${response.status} ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outPath, buffer);
    downloaded = true;
  }

  return {
    id: clip.id,
    scene: clip.scene,
    part: clip.part,
    model,
    request_id: result.requestId,
    status: lastStatus?.status || 'COMPLETED',
    output: clip.output,
    downloaded,
    video_url: videoUrl || null,
    start: clip.start,
    end: clip.end || null,
    start_image_url: startImageUrl,
    end_image_url: endImageUrl || null,
    result_data: result.data,
    submitted_at: new Date().toISOString(),
  };
}

function findVideoUrl(value) {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.url === 'string' && /\.(mp4|webm|mov)(\?|$)/i.test(value.url)) {
    return value.url;
  }
  if (typeof value.url === 'string' && value.content_type?.startsWith?.('video/')) {
    return value.url;
  }
  if (value.video && typeof value.video.url === 'string') {
    return value.video.url;
  }
  for (const item of Object.values(value)) {
    if (Array.isArray(item)) {
      for (const child of item) {
        const found = findVideoUrl(child);
        if (found) return found;
      }
    } else if (item && typeof item === 'object') {
      const found = findVideoUrl(item);
      if (found) return found;
    }
  }
  return null;
}

const submissions = [];

for (const clip of spec.clips) {
  console.log(`Submitting ${clip.id}...`);
  submissions.push(await submitClip(clip));
}

if (spec.out) {
  const outPath = path.resolve(workspace, spec.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify({ model, submissions }, null, 2)}\n`);
  console.log(`Wrote ${spec.out}`);
}

console.log(JSON.stringify({ model, submissions }, null, 2));
