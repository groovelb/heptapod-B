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
const profile = resolveModelProfile(spec.profile || spec.model_profile, spec.model);
const model = spec.model || profile.model;

function resolveModelProfile(profileName, modelId) {
  const modelProfiles = {
    kling: {
      model: 'fal-ai/kling-video/v3/pro/image-to-video',
      startField: 'start_image_url',
      endField: 'end_image_url',
      defaultDuration: '5',
      allowedDurations: new Set(['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']),
      optionFields: ['negative_prompt', 'cfg_scale', 'generate_audio', 'shot_type'],
      requiresEndFrame: false,
    },
    'veo-fast': {
      model: 'fal-ai/veo3.1/fast/first-last-frame-to-video',
      startField: 'first_frame_url',
      endField: 'last_frame_url',
      defaultDuration: '6s',
      allowedDurations: new Set(['4s', '6s', '8s']),
      optionFields: ['generate_audio', 'aspect_ratio', 'resolution', 'seed', 'auto_fix', 'safety_tolerance'],
      defaults: {
        aspect_ratio: '16:9',
        resolution: '720p',
      },
      requiresEndFrame: true,
    },
    veo: {
      model: 'fal-ai/veo3.1/first-last-frame-to-video',
      startField: 'first_frame_url',
      endField: 'last_frame_url',
      defaultDuration: '6s',
      allowedDurations: new Set(['4s', '6s', '8s']),
      optionFields: ['generate_audio', 'aspect_ratio', 'resolution', 'seed', 'auto_fix', 'safety_tolerance'],
      defaults: {
        aspect_ratio: '16:9',
        resolution: '1080p',
      },
      requiresEndFrame: true,
    },
  };

  if (profileName && modelProfiles[profileName]) return modelProfiles[profileName];
  if (modelId?.includes('/veo3.1/fast/')) return modelProfiles['veo-fast'];
  if (modelId?.includes('/veo3.1/')) return modelProfiles.veo;
  if (modelId?.includes('/kling-video/')) return modelProfiles.kling;
  return modelProfiles.kling;
}

function normalizeDuration(rawDuration, activeProfile) {
  const value = String(rawDuration || activeProfile.defaultDuration);
  if (activeProfile.allowedDurations.has(value)) return value;

  if (activeProfile.startField === 'first_frame_url') {
    const normalized = value.endsWith('s') ? value : `${value}s`;
    if (activeProfile.allowedDurations.has(normalized)) return normalized;
    if (value === '5') return '6s';
  }

  throw new Error(`Unsupported duration "${value}" for ${model}.`);
}

function addProfileOptions(input, clip) {
  for (const field of profile.optionFields) {
    const value = clip[field] ?? spec[field] ?? profile.defaults?.[field];
    if (value !== undefined) input[field] = value;
  }
}

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
    duration: normalizeDuration(clip.duration ?? spec.duration, profile),
  };

  input[profile.startField] = startImageUrl;
  if (endImageUrl) {
    input[profile.endField] = endImageUrl;
  } else if (profile.requiresEndFrame) {
    throw new Error(`${model} requires an end frame for clip "${clip.id}".`);
  }
  addProfileOptions(input, clip);

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
    profile: spec.profile || spec.model_profile || null,
    input,
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
