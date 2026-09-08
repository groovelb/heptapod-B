/** Task-local durable Fal queue controller. Default is OFFLINE check, --run enables API.
 * Exactly 24 verified Vary > Subtle selected inputs are required even though only 15 feed videos.
 * Unknown submissions never auto-retry; known request IDs always resume polling.
 * Isolated retry: --only C02 --attempt 2 (add --run only when a global slot is free).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUN = path.dirname(HERE);
const WORKSPACE = path.resolve(RUN, '../../..');
const MODEL = 'fal-ai/kling-video/v3/pro/image-to-video';
const argv = process.argv.slice(2);
const doRun = argv.includes('--run');
function numericOption(name, fallback, min, max) {
  const index = argv.indexOf(name);
  const value = index < 0 ? fallback : Number(argv[index + 1]);
  if (!Number.isInteger(value) || value < min || value > max) throw Error(`Invalid ${name}: expected integer ${min}..${max}`);
  return value;
}
const concurrency = numericOption('--concurrency', 3, 1, 3);
const pollMs = numericOption('--poll-ms', 10000, 1000, 60000);
const timeoutMs = numericOption('--timeout-ms', 2700000, 60000, 14400000);
const stageIndex = argv.indexOf('--stage');
const stage = stageIndex < 0 ? 'pilot' : argv[stageIndex + 1];
if (!['pilot','rest','all','remaining'].includes(stage)) throw Error('Invalid stage');
const stageIds = stage === 'remaining' ? ['C02','C04','C07','C01','C03','C05'] : stage === 'pilot' ? ['C02','C06','C08'] : stage === 'rest' ? ['C01','C03','C04','C05','C07'] : specPlaceholder();
function specPlaceholder(){ return Array.from({length:8},(_,i)=>`C0${i+1}`); }
const hasAttempt = argv.includes('--attempt');
const hasOnly = argv.includes('--only');
if (hasAttempt !== hasOnly) throw Error('Isolated retries require both --only C01..C08 and --attempt 2 or higher');
const attemptNumber = hasAttempt ? numericOption('--attempt', 2, 2, 999) : 1;
const onlyClip = hasOnly ? argv[argv.indexOf('--only') + 1] : null;
if (hasOnly && !/^C0[1-8]$/.test(onlyClip || '')) throw Error('--only requires exactly one clip ID C01..C08');
const retryMode = attemptNumber >= 2;
const workDir = retryMode ? path.join(HERE, 'retries', `attempt-${attemptNumber}`) : HERE;
const knownOptions = new Set(['--run', '--check', '--concurrency', '--poll-ms', '--timeout-ms', '--only', '--attempt', '--stage']);
for (let i = 0; i < argv.length; i++) {
  if (!knownOptions.has(argv[i])) throw Error(`Unknown argument: ${argv[i]}`);
  if (['--concurrency', '--poll-ms', '--timeout-ms', '--only', '--attempt', '--stage'].includes(argv[i])) i++;
}
if (argv.includes('--check') && doRun) throw Error('Choose --check or --run, not both');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fileSha = file => sha(fs.readFileSync(file));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const specPath = path.join(HERE, 'specs.json');
const specBytes = fs.readFileSync(specPath);
const spec = JSON.parse(specBytes);
const specHash = sha(specBytes);
const stateDir = path.join(workDir, 'states');
// Each retry can apply a recorded, prompt-only delta without mutating frozen specs.
const overridePath = retryMode ? path.join(workDir, 'prompt-overrides', `${onlyClip}.json`) : null;
const override = overridePath && fs.existsSync(overridePath) ? read(overridePath) : null;
const overrideHash = override ? fileSha(overridePath) : null;
if (override) {
  if (override.id !== onlyClip || override.base_spec_sha256 !== specHash ||
      Object.keys(override.input_delta || {}).some(k => !['prompt','negative_prompt'].includes(k)) ||
      Object.values(override.input_delta || {}).some(v => typeof v !== 'string' || !v.trim()))
    throw Error('Retry override must be recorded nonempty prompt-only changes for this exact spec');
}

const scheduledClips = retryMode
  ? spec.clips.filter(clip => clip.id === onlyClip).map(clip => ({ ...clip, input_template: {...clip.input_template, ...(override?.input_delta || {})}, output: path.join(workDir, 'clips', `${clip.id}.mp4`) }))
  : spec.clips.filter(clip => stageIds.includes(clip.id)).sort((a,b) => stageIds.indexOf(a.id)-stageIds.indexOf(b.id));
let retrySource;
const now = () => new Date().toISOString();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let credentials;
let stopping = false;
let failed = false;
let fal;
const submitContext = new AsyncLocalStorage();

function cleanError(error) {
  let text = String(error?.message || error);
  if (credentials) text = text.split(credentials).join('[REDACTED]');
  return text.replace(/Authorization\s*:\s*[^\r\n]+/ig, 'Authorization: [REDACTED]');
}
function persist(file, object) {
  const temporary = `${file}.${process.pid}.tmp`;
  const handle = fs.openSync(temporary, 'w', 0o600);
  try { fs.writeFileSync(handle, JSON.stringify(object, null, 2) + '\n'); fs.fsyncSync(handle); }
  finally { fs.closeSync(handle); }
  fs.renameSync(temporary, file);
  const directory = fs.openSync(path.dirname(file), 'r');
  try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
}
function mimeOf(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  throw Error('Input bytes are not a PNG/JPEG');
}
function verifyAll24() {
  if (fileSha(specPath) !== specHash) throw Error('Prepared specs changed during execution');
  if (spec.workspace !== WORKSPACE || spec.run !== RUN || fileSha(spec.original_manifest) !== spec.original_manifest_sha256)
    throw Error('Workspace or original manifest differs from prepared spec');
  const expected = Array.from({ length: 8 }, (_, n) => ['IN', 'MID', 'OUT'].map(t => `F${String(n + 1).padStart(2, '0')}-${t}`)).flat();
  if (spec.all24_gate?.length !== 24 || new Set(spec.all24_gate.map(f => f.id)).size !== 24 || expected.some(id => !spec.all24_gate.some(f => f.id === id)))
    throw Error('ALL24 gate must contain each expected frame exactly once');
  if (spec.image_route !== 'vary_subtle') throw Error('Expected Vary > Subtle selected image route');
  if (fileSha(spec.variation_selection_manifest) !== spec.variation_selection_sha256 || fileSha(spec.parent_selection_manifest) !== spec.parent_selection_sha256)
    throw Error('Variation or original candidate selections changed after preparation');
  const selection = read(spec.variation_selection_manifest);
  const parents = read(spec.parent_selection_manifest);
  if (selection.status !== 'selected' || selection.frames?.length !== 24 || new Set(selection.frames.map(f => f.id)).size !== 24)
    throw Error('Vary > Subtle selection must contain all24 selected frames');
  for (const frame of spec.all24_gate) {
    const bytes = fs.readFileSync(frame.path);
    if (sha(bytes) !== frame.sha256 || bytes.length !== frame.bytes || mimeOf(bytes) !== frame.mime || fileSha(frame.downloaded_path) !== frame.sha256)
      throw Error(`${frame.id}: selected/downloaded image hash/bytes/MIME mismatch`);
    if (fileSha(frame.receipt_path) !== frame.receipt_sha256 || fileSha(frame.job_path) !== frame.job_sha256)
      throw Error(`${frame.id}: variation download/job receipt changed`);
    const receipt = read(frame.receipt_path), job = read(frame.job_path);
    const selected = selection.frames.find(f => f.id === frame.id);
    const parent = parents.frames.find(f => f.id === frame.id);
    if (!selected || !parent || selected.job_id !== frame.job_id || selected.selected_index !== frame.selected_index || selected.sha256 !== frame.sha256)
      throw Error(`${frame.id}: selected variation provenance mismatch`);
    if (job.id !== frame.id || job.status !== 'confirmed' || job.requested_action !== 'Vary > Subtle' || job.job_id !== frame.job_id || receipt.frame !== frame.id || receipt.job_id !== frame.job_id)
      throw Error(`${frame.id}: no confirmed Vary > Subtle output`);
    if (job.source_job_id !== parent.job_id || job.selected_index !== parent.selected_index || job.source_job_id !== frame.source_job_id || job.selected_index !== frame.source_selected_index)
      throw Error(`${frame.id}: variation parent candidate differs`);
    if (receipt.files?.length !== 4 || new Set(receipt.files.map(f => f.index)).size !== 4 || [0, 1, 2, 3].some(i => !receipt.files.some(f => f.index === i)))
      throw Error(`${frame.id}: missing one of four downloaded variation candidates`);
    const downloaded = receipt.files.find(f => f.index === frame.selected_index);
    if (downloaded.sha256 !== frame.sha256 || downloaded.bytes !== frame.bytes || downloaded.width !== frame.dimensions[0] || downloaded.height !== frame.dimensions[1])
      throw Error(`${frame.id}: selected variation download metadata mismatch`);
  }
  if (spec.clips?.length !== 8 || spec.clips.some((c, i) => c.id !== `C${String(i + 1).padStart(2, '0')}`))
    throw Error('Original eight-clip structure/order required');
  for (const clip of spec.clips) {
    if (clip.model !== MODEL || fileSha(clip.source_submission) !== clip.source_submission_sha256)
      throw Error(`${clip.id}: model or original submission changed`);
    const document = read(clip.source_submission);
    const original = document.submissions.find(s => s.id === clip.original_generation_id);
    if (!original) throw Error(`${clip.id}: original generation missing`);
    const template = Object.fromEntries(Object.entries(original.input).filter(([key]) => !['start_image_url', 'end_image_url'].includes(key)));
    const revision = spec.prompt_revision;
    if (!revision || fileSha(revision.path) !== revision.sha256 || fileSha(revision.baseline_path) !== revision.baseline_sha256) throw Error('Revision evidence changed');
    const proposal = read(revision.path).clips.find(c => c.id === clip.id);
    if (!proposal || JSON.stringify(template) !== JSON.stringify(proposal.original_input_template)) throw Error(`${clip.id}: original provenance mismatch`);
    if (JSON.stringify(clip.input_template) !== JSON.stringify(proposal.proposed_input_template)) throw Error(`${clip.id}: proposed prompt mismatch`);
    const unchanged = obj => Object.fromEntries(Object.entries(obj).filter(([key]) => !['prompt','negative_prompt'].includes(key)));
    if (JSON.stringify(unchanged(template)) !== JSON.stringify(unchanged(clip.input_template))) throw Error(`${clip.id}: nonprompt settings changed`);
    if (Boolean(clip.end) !== Boolean(original.input.end_image_url) || (clip.id === 'C08' && clip.end)) throw Error(`${clip.id}: endpoint method changed`);
    for (const input of [clip.start, clip.end].filter(Boolean)) {
      const gated = spec.all24_gate.find(f => f.id === input.id);
      if (!gated || JSON.stringify(gated) !== JSON.stringify(input)) throw Error(`${clip.id}: input outside verified ALL24 gate`);
    }
    const expectedId = `F${clip.id.slice(1)}-IN`;
    if (clip.start.id !== expectedId || (clip.end && clip.end.id !== expectedId.replace('-IN', '-OUT'))) throw Error(`${clip.id}: snapshot mapping changed`);
  }
}

function getState(clip) {
  const file = path.join(stateDir, `${clip.id}.json`);
  const state = fs.existsSync(file) ? read(file) : {
    id: clip.id, model: clip.model, spec_sha256: specHash, status: 'prepared', created_at: now(),
    ...(retryMode ? { attempt: attemptNumber, retry_of: retrySource, prompt_override_sha256: overrideHash } : {}),
  };
  if (retryMode && state.prompt_override_sha256 !== overrideHash) throw Error(`${clip.id}: retry prompt override changed after state creation`);
  if (override && fileSha(overridePath) !== overrideHash) throw Error('Retry override changed during execution');
  if (state.spec_sha256 !== specHash || state.model !== clip.model) throw Error(`${clip.id}: existing queue state belongs to different specs`);
  if (retryMode && (state.attempt !== attemptNumber || JSON.stringify(state.retry_of) !== JSON.stringify(retrySource)))
    throw Error(`${clip.id}: retry state belongs to another attempt or original request`);
  if (!state.request_id && ['submission_pending', 'submission_unknown'].includes(state.status))
    throw Error(`${clip.id}: previous submit may have reached Fal but no request ID was persisted; reconcile it manually, never resubmit automatically`);
  return { file, state };
}
async function uploadFrame(frame) {
  const bytes = fs.readFileSync(frame.path);
  if (sha(bytes) !== frame.sha256) throw Error(`${frame.id}: input changed before upload`);
  return fal.storage.upload(new File([bytes], path.basename(frame.path), { type: mimeOf(bytes) }));
}
function findVideo(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.video?.url) return value.video.url;
  if (typeof value.url === 'string' && (/\.(mp4|webm|mov)(\?|$)/i.test(value.url) || value.content_type?.startsWith('video/'))) return value.url;
  for (const item of Object.values(value)) {
    const found = Array.isArray(item) ? item.map(findVideo).find(Boolean) : findVideo(item);
    if (found) return found;
  }
  return null;
}
function probeVideo(file) {
  return JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_frames,time_base,start_time,duration:format=duration', '-of', 'json', file], { encoding: 'utf8', timeout: 60000 }));
}
async function runClip(clip) {
  const { file, state } = getState(clip);
  if (state.status === 'downloaded') {
    if (!fs.existsSync(clip.output) || fileSha(clip.output) !== state.output_sha256) throw Error(`${clip.id}: completed video missing or changed`);
    console.log(`${clip.id}: already downloaded ${state.request_id}`);
    return;
  }
  if (state.status === 'media_review_required') throw Error(`${clip.id}: downloaded video requires media review; no new submission`);
  try {
    if (!state.request_id) {
      if (stopping) return;
      verifyAll24();
      state.status = 'uploading'; persist(file, state);
      if (!state.start_image_url) { state.start_image_url = await uploadFrame(clip.start); persist(file, state); }
      if (clip.end && !state.end_image_url) { state.end_image_url = await uploadFrame(clip.end); persist(file, state); }
      if (stopping) { state.status = 'prepared'; persist(file, state); return; }
      verifyAll24();
      state.input = { ...clip.input_template, start_image_url: state.start_image_url };
      if (clip.end) state.input.end_image_url = state.end_image_url;
      state.status = 'submission_pending'; state.submit_started_at = now(); persist(file, state);
      // The SDK retries POST internally. Its configured fetch guard below permits
      // only one actual queue POST per submit call, including ambiguous failures.
      const queued = await submitContext.run({ posted: false }, () => fal.queue.submit(clip.model, { input: state.input, abortSignal: AbortSignal.timeout(90000) }));
      if (!queued.request_id) throw Error('Queue response lacks request_id');
      state.request_id = queued.request_id;
      state.queue_response = queued;
      state.status = 'queued'; state.submitted_at = now();
      persist(file, state); // Persist before logging, polling, or any other await.
      console.log(`${clip.id}: request_id=${state.request_id}`);
    }
    const deadline = Date.now() + timeoutMs;
    while (!state.result_data) {
      if (Date.now() >= deadline) throw Error('Polling timeout; request preserved for resume');
      const status = await fal.queue.status(clip.model, { requestId: state.request_id, logs: false, abortSignal: AbortSignal.timeout(60000) });
      const changed = state.queue_status !== status.status;
      state.queue_status = status.status; state.last_status = status; state.polled_at = now();
      state.status = 'polling'; persist(file, state);
      if (changed) console.log(`${clip.id}: ${status.status}`);
      if (status.status === 'COMPLETED') {
        const result = await fal.queue.result(clip.model, { requestId: state.request_id, abortSignal: AbortSignal.timeout(60000) });
        state.result_data = result.data; state.video_url = findVideo(result.data);
        if (!state.video_url) throw Error('Completed result has no downloadable video URL');
        state.status = 'result_ready'; persist(file, state); break;
      }
      if (!['IN_QUEUE', 'IN_PROGRESS'].includes(status.status)) throw Error(`Unexpected queue state: ${status.status}`);
      if (stopping) { state.status = 'paused_with_request_id'; persist(file, state); return; }
      await sleep(pollMs);
    }
    if (!state.video_url) state.video_url = findVideo(state.result_data);
    fs.mkdirSync(path.dirname(clip.output), { recursive: true });
    const partial = clip.output + '.part';
    const response = await fetch(state.video_url, { signal: AbortSignal.timeout(300000) });
    if (!response.ok || !response.body) throw Error(`Video download HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(partial, { mode: 0o600 }));
    const probe = probeVideo(partial);
    const video = probe.streams.find(s => s.codec_type === 'video');
    if (!video) throw Error('Downloaded file has no video stream');
    const hash = fileSha(partial);
    if (fs.existsSync(clip.output) && fileSha(clip.output) !== hash) throw Error('Refusing to overwrite different existing video');
    fs.renameSync(partial, clip.output);
    state.output = clip.output; state.output_sha256 = hash; state.probe = probe; state.downloaded_at = now();
    const mediaPass = video.r_frame_rate === '24/1' && video.avg_frame_rate === '24/1' && Number(video.nb_frames) === clip.expected_generated_frames;
    state.status = mediaPass ? 'downloaded' : 'media_review_required';
    state.generated_audio_policy = 'Do not use generated audio in delivery';
    persist(file, state);
    console.log(`${clip.id}: ${state.status} ${video.width}x${video.height}, ${video.nb_frames} frames`);
    if (!mediaPass) throw Error('Generated FPS/frame count differs from original contract; output retained for review');
  } catch (error) {
    state.error = cleanError(error); state.error_at = now();
    if (!state.request_id && state.status === 'submission_pending') state.status = 'submission_unknown';
    else if (state.request_id && state.status !== 'media_review_required') state.status = 'resumable_error';
    persist(file, state);
    throw Error(`${clip.id}: ${state.error}`);
  }
}

async function main() {
  verifyAll24();
  console.log(`ALL24 verified; ${spec.image_route}; approved revision prompts; unchanged original options; concurrency=${concurrency}`);
  if (retryMode) {
    if (scheduledClips.length !== 1) throw Error('Isolated retry must resolve exactly one original clip');
    const originalClip = spec.clips.find(clip => clip.id === onlyClip);
    const originalStatePath = path.join(HERE, 'states', `${onlyClip}.json`);
    const originalState = read(originalStatePath);
    if (originalState.id !== onlyClip || originalState.model !== originalClip.model || originalState.spec_sha256 !== specHash || !originalState.request_id)
      throw Error(`${onlyClip}: original request provenance is missing or differs from current specs`);
    if (!originalState.output_sha256 || !fs.existsSync(originalClip.output) || fileSha(originalClip.output) !== originalState.output_sha256)
      throw Error(`${onlyClip}: original video must remain present with its recorded SHA256`);
    retrySource = { attempt: 1, request_id: originalState.request_id, output: originalClip.output,
      output_sha256: originalState.output_sha256, state_path: originalStatePath };
    getState(scheduledClips[0]); // Reject ambiguous prior retry submissions even during offline checks.
    console.log(JSON.stringify({ mode: 'isolated_retry', clip: onlyClip, attempt: attemptNumber,
      state_dir: stateDir, output: scheduledClips[0].output, lock: path.join(HERE, 'queue.lock'),
      original_request_id: retrySource.request_id, original_output_sha256: retrySource.output_sha256,
      planned_prompt_unchanged: !override, original_nonprompt_options_unchanged: true, original_images_unchanged: true, prompt_override_sha256: overrideHash }));
  }
  if (!doRun) { console.log('Offline check only. No uploads, submissions, status calls, or downloads.'); return; }
  credentials = process.env.FAL_KEY || process.env.FAL_API_KEY || process.env.VITE_FA_AI;
  if (!credentials) throw Error('Missing FAL_KEY, FAL_API_KEY, or VITE_FA_AI');
  fs.mkdirSync(stateDir, { recursive: true });
  const lockPath = path.join(HERE, 'queue.lock');
  let lock;
  try { lock = fs.openSync(lockPath, 'wx', 0o600); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const prior = read(lockPath);
    let active = true;
    try { process.kill(prior.pid, 0); } catch (probe) { if (probe.code === 'ESRCH') active = false; }
    if (active) throw Error(`Another queue controller owns ${lockPath} (PID ${prior.pid})`);
    fs.unlinkSync(lockPath); lock = fs.openSync(lockPath, 'wx', 0o600);
  }
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, started_at: now() })); fs.fsyncSync(lock);
  let heartbeat;
  try {
    // Reject unresolved prior submissions before starting ANY new paid requests.
    for (const clip of scheduledClips) getState(clip);
    const require = createRequire(path.join(WORKSPACE, 'tmp/fal-runner/package.json'));
    ({ fal } = require('@fal-ai/client'));
    fal.config({ credentials, fetch: async (url, options = {}) => {
      const context = submitContext.getStore();
      const queuePost = new URL(String(url)).hostname === 'queue.fal.run' && String(options.method || 'GET').toUpperCase() === 'POST';
      if (context && queuePost) {
        if (context.posted) throw Error('SDK queue POST retry blocked after ambiguous first attempt');
        context.posted = true;
      }
      return fetch(url, options);
    } });
    process.on('SIGINT', () => { stopping = true; console.log('Stopping new submissions; preserving known requests.'); });
    process.on('SIGTERM', () => { stopping = true; console.log('Stopping new submissions; preserving known requests.'); });
    heartbeat = setInterval(() => console.log(`Queue controller active ${now()}; stopping=${stopping}`), 30000);
    // Resume known requests first so they count toward the maximum three jobs.
    const clips = [...scheduledClips].sort((a, b) => Number(Boolean(getState(b).state.request_id)) - Number(Boolean(getState(a).state.request_id)));
    let cursor = 0;
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (!stopping && cursor < clips.length) {
        const clip = clips[cursor++];
        try { await runClip(clip); }
        catch (error) { failed = true; stopping = true; console.error(cleanError(error)); }
      }
    }));
    if (failed || stopping) process.exitCode = 1;
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    fs.closeSync(lock);
    fs.unlinkSync(lockPath);
  }
}
main().catch(error => { console.error(cleanError(error)); process.exitCode = 1; });
