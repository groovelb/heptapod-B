import assert from 'node:assert/strict';
import { glyphModelHash, glyphImagePath, GLYPH_IMAGE_VERSION } from '../src/lib/glyphImages/contract.js';
import { backfillGlyphImages, processGlyphImageJobs } from '../src/lib/glyphImages/jobs.js';
import { createGlyphImageAdapter, getImageDescriptor, handleGlyphImageRequest } from '../src/lib/glyphImages/service.js';
import { createGlyphImageWorkerHandler } from '../supabase/functions/archive-glyph-image-worker/handler.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const id = (index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const model = { version: 1, clusters: [], ring: { radius: 200 }, meta: { hash: 'untrusted' } };
const clone = (value) => structuredClone(value);
class MemoryAdapter {
  constructor(count = 1) {
    this.glyphs = new Map(Array.from({ length: count }, (_, index) => [id(index + 1), { id: id(index + 1), is_public: true, model_data: clone(model) }]));
    this.jobs = new Map(); this.images = new Map(); this.claims = 0; this.uploads = 0; this.tick = 0;
  }
  async readGlyph(key) { return this.glyphs.get(key)?.is_public ? clone(this.glyphs.get(key)) : null; }
  async readJob(key) { return clone(this.jobs.get(key) || null); }
  async upperId() { return [...this.glyphs.keys()].sort().at(-1) || null; }
  async scanGlyphs({ after, upperId, limit }) { return [...this.glyphs.values()].filter((row) => row.is_public && (!after || row.id > after) && row.id <= upperId).sort((a, b) => a.id.localeCompare(b.id)).slice(0, limit).map(clone); }
  async enqueue(row, existing) {
    if ((!existing && this.jobs.has(row.id)) || (existing && this.jobs.get(row.id)?.updated_at !== existing.updated_at)) return false;
    this.jobs.set(row.id, { glyph_id: row.id, status: 'pending', attempts: 0, variants: {}, updated_at: String(++this.tick) }); return true;
  }
  async claim(limit) {
    this.claims++; const jobs = [...this.jobs.values()].filter((job) => (job.status === 'pending' || job.status === 'processing' && job.expired) && job.attempts < 5).slice(0, limit);
    for (const job of jobs) { job.status = 'processing'; job.attempts++; job.lease_token = crypto.randomUUID(); job.expired = false; }
    return jobs.map(clone);
  }
  async finish(job, patch) {
    const current = this.jobs.get(job.glyph_id);
    if (!current || current.status !== 'processing' || current.lease_token !== job.lease_token) return false;
    Object.assign(current, clone(patch), { lease_token: null, updated_at: String(++this.tick) }); return true;
  }
  async upload(path, bytes) { this.uploads++; this.images.set(path, bytes); }
  async download(path) { if (!this.images.has(path)) throw new Error('Missing image'); return this.images.get(path); }
  change(key, patch) {
    Object.assign(this.glyphs.get(key), patch); this.jobs.delete(key);
    if (this.glyphs.get(key).is_public) this.jobs.set(key, { glyph_id: key, status: 'pending', attempts: 0, variants: {}, updated_at: String(++this.tick) });
  }
}
const digest = async (bytes) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((n) => n.toString(16).padStart(2, '0')).join('');
const stubBytes = new Uint8Array([137, 80, 78, 71]);
const stubChecksum = await digest(stubBytes);
const render = async (_, { size }) => ({ bytes: stubBytes, width: size, height: size, mimeType: 'image/png', checksum: stubChecksum });
const request = (key = id(1), suffix = '', method = 'GET') => new Request(`https://app.test/api/glyph-image/${key}${suffix}`, { method });

// Full scan, dry run, interrupted resume and idempotent repeated enqueue.
const scan = new MemoryAdapter(451);
const dry = await backfillGlyphImages({ adapter: scan, pageSize: 37 });
check(dry.results.length === 451 && dry.counts.would_queue === 451, 'keyset scan covers more than 200 rows');
check(scan.jobs.size === 0, 'dry run has no DB writes');
let saved;
await assert.rejects(backfillGlyphImages({ adapter: scan, apply: true, pageSize: 31, onCheckpoint: async (state) => { saved = clone(state); if (state.results.length === 123) throw new Error('Interrupted'); } }));
check(scan.jobs.size === 123 && saved.after === id(123), 'checkpoint commits after each completed row');
const resumed = await backfillGlyphImages({ adapter: scan, apply: true, checkpoint: saved, pageSize: 41 });
check(resumed.results.length === 451 && scan.jobs.size === 451, 'resume finishes complete target without duplicate rows');
const repeated = await backfillGlyphImages({ adapter: scan, apply: true });
check(repeated.counts.pending === 451, 'rerun preserves existing queued jobs');
await assert.rejects(backfillGlyphImages({ adapter: scan, apply: false, checkpoint: saved }));
checks++;

// Normal serving, new versions, current public visibility and pending policy.
const adapter = new MemoryAdapter();
await backfillGlyphImages({ adapter, apply: true });
const pending = await handleGlyphImageRequest(request(), id(1), { adapter });
check(pending.status === 503 && pending.headers.get('Retry-After') === '15', 'pending is retryable and never invokes renderer');
check((await processGlyphImageJobs({ adapter, render }))[0].status === 'ready', 'both sizes uploaded before ready');
check(adapter.uploads === 2 && adapter.jobs.get(id(1)).variants[256].path.endsWith('/256-1c2226.png'), 'variant path is deterministic');
const response = await handleGlyphImageRequest(request(), id(1), { adapter });
check(response.status === 200 && response.headers.get('Content-Type') === 'image/png', 'ready bytes served');
check(response.headers.get('Cache-Control').includes('private, no-store'), 'no unrevokable public HTTP cache');
check((await response.arrayBuffer()).byteLength === 4, 'image bytes delivered');
check((await handleGlyphImageRequest(request(id(1), '', 'HEAD'), id(1), { adapter })).body === null, 'HEAD has no body');
check((await handleGlyphImageRequest(request(id(1), '?v=0'), id(1), { adapter })).status === 404, 'obsolete renderer request denied');
check((await handleGlyphImageRequest(request(id(1), '?size=999'), id(1), { adapter })).status === 404, 'unsupported dimensions denied');
check((await getImageDescriptor(id(1), { adapter })).rendererVersion === GLYPH_IMAGE_VERSION, 'descriptor uses version contract');
const oldHash = await glyphModelHash(model);
check(oldHash !== await glyphModelHash({ ...model, ring: { radius: 201 } }), 'full content hash ignores collision-prone meta hash');
adapter.change(id(1), { is_public: false });
check((await handleGlyphImageRequest(request(), id(1), { adapter })).status === 404, 'existing URL denied after unpublish');
check(adapter.images.size === 2, 'private derived files do not require deletion to revoke access');

// Mid-render mutation invalidates lease and can never publish stale bytes.
for (const scenario of ['unpublish', 'change', 'lease']) {
  const racing = new MemoryAdapter(); await backfillGlyphImages({ adapter: racing, apply: true });
  let called = 0;
  const result = await processGlyphImageJobs({ adapter: racing, render: async (...args) => {
    if (++called === 2) {
      if (scenario === 'unpublish') racing.change(id(1), { is_public: false });
      if (scenario === 'change') racing.change(id(1), { model_data: { ...model, ring: { radius: 220 } } });
      if (scenario === 'lease') racing.jobs.get(id(1)).lease_token = crypto.randomUUID();
    }
    return render(...args);
  } });
  check(result[0].status === 'stale' && racing.jobs.get(id(1))?.status !== 'ready', `${scenario} during rendering prevents stale ready`);
}
// Mid-download revocation is checked after the storage read as well.
const downloading = new MemoryAdapter(); await backfillGlyphImages({ adapter: downloading, apply: true }); await processGlyphImageJobs({ adapter: downloading, render });
const download = downloading.download.bind(downloading);
downloading.download = async (path) => { const bytes = await download(path); downloading.change(id(1), { is_public: false }); return bytes; };
check((await handleGlyphImageRequest(request(), id(1), { adapter: downloading })).status === 404, 'revocation during download prevents response bytes');

// Partial upload failure, retry and terminal unsupported records retain originals.
const retry = new MemoryAdapter(); const original = clone(retry.glyphs.get(id(1))); await backfillGlyphImages({ adapter: retry, apply: true });
const upload = retry.upload.bind(retry); let uploads = 0;
retry.upload = async (...args) => { if (++uploads === 2) throw new Error('Temporary storage failure'); return upload(...args); };
check((await processGlyphImageJobs({ adapter: retry, render }))[0].status === 'pending', 'partial upload is never ready');
check(retry.jobs.get(id(1)).variants && Object.keys(retry.jobs.get(id(1)).variants).length === 0, 'partial variants remain private');
check(Date.parse(retry.jobs.get(id(1)).next_attempt_at) > Date.now(), 'retry has bounded backoff');
check((await processGlyphImageJobs({ adapter: retry, render }))[0].status === 'ready' && retry.images.size === 2, 'retry upserts deterministic keys');
assert.deepEqual(retry.glyphs.get(id(1)), original); checks++;
const unsupported = new MemoryAdapter(); await backfillGlyphImages({ adapter: unsupported, apply: true });
const badRender = async () => { const error = new Error('Private model must not appear in DB'); error.code = 'UNSUPPORTED_MODEL'; throw error; };
check((await processGlyphImageJobs({ adapter: unsupported, render: badRender }))[0].status === 'unsupported', 'unsupported models terminate explicitly');
check(unsupported.jobs.get(id(1)).error === 'unsupported_model', 'safe error category omits model/error payload');
check((await backfillGlyphImages({ adapter: unsupported, apply: true })).counts.unsupported === 1, 'backfill does not retry unsupported indefinitely');
check((await backfillGlyphImages({ adapter: unsupported, apply: true, retryFailed: true })).counts.queued === 1, 'explicit retry resets terminal job');
unsupported.jobs.get(id(1)).attempts = 4;
check((await processGlyphImageJobs({ adapter: unsupported, render: async () => { throw new Error('Offline'); } }))[0].status === 'failed', 'fifth attempt is terminal');
const expired = new MemoryAdapter(); await backfillGlyphImages({ adapter: expired, apply: true }); await expired.claim(1); expired.jobs.get(id(1)).expired = true;
check((await processGlyphImageJobs({ adapter: expired, render }))[0].status === 'ready', 'expired lease can recover without original modification');

// Worker authentication is independent of any visitor, bounded and method restricted.
const workerDb = new MemoryAdapter(3); await backfillGlyphImages({ adapter: workerDb, apply: true });
const handler = createGlyphImageWorkerHandler({ secret: 'worker-secret-test', adapter: workerDb, render });
check((await handler(new Request('https://worker.test', { method: 'GET' }))).status === 405, 'worker is POST only');
check((await handler(new Request('https://worker.test', { method: 'POST' }))).status === 401 && workerDb.claims === 0, 'unauthorized requests never claim jobs');
check((await handler(new Request('https://worker.test', { method: 'POST', headers: { 'x-glyph-worker-secret': 'worker-secret-test' } }))).status === 200, 'scheduler secret authorized');
check([...workerDb.jobs.values()].filter((job) => job.status === 'ready').length === 2, 'scheduler processes max two per call');

// Adapter query boundary: public projection, service claims, exact lease CAS and private object route.
const calls = [];
const rest = createGlyphImageAdapter({ url: 'https://db.test', key: 'not-a-real-key', publicOnly: true, fetcher: async (url, init) => {
  calls.push({ url: new URL(url), init }); return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
} });
await rest.readJob(id(1));
check(!calls.at(-1).url.searchParams.get('select').includes('lease') && !calls.at(-1).url.searchParams.get('select').includes('*'), 'anon projection excludes privileged lease/error columns');
await rest.finish({ glyph_id: id(1), lease_token: 'lease' }, { status: 'ready' });
check(calls.at(-1).url.searchParams.get('lease_token') === 'eq.lease' && calls.at(-1).url.searchParams.get('status') === 'eq.processing', 'finish compare-and-swap requires current lease and state');
await rest.readImageRecord(id(1));
check(calls.at(-1).url.searchParams.get('select').includes('glyph:glyphs!inner') && calls.at(-1).url.searchParams.get('glyph.is_public') === 'eq.true', 'one query joins current public model and allowed image state');
await rest.claim(999);
check(JSON.parse(calls.at(-1).init.body).p_limit === 4, 'adapter claim maximum enforced');
await rest.download(glyphImagePath(id(1), oldHash, 256));
check(calls.at(-1).url.pathname.includes('/object/authenticated/glyph-images/'), 'storage download uses private authenticated endpoint');
check(calls.every((call) => call.init.cache === 'no-store'), 'all server reads bypass stale fetch cache');
// Actual renderer integration: portable PNG through upload, descriptor and serving.
const { renderGlyphImage } = await import('../src/lib/glyphImages/rasterize.js');
const { ARCHIVE_TIMELINE_SYMBOL } = await import('../src/data/archiveFamilySymbols.js');
const actual = new MemoryAdapter(); actual.glyphs.get(id(1)).model_data = ARCHIVE_TIMELINE_SYMBOL.model_data;
await backfillGlyphImages({ adapter: actual, apply: true });
check((await processGlyphImageJobs({ adapter: actual, render: renderGlyphImage }))[0].status === 'ready', 'actual renderer completes both PNG variants');
for (const size of [256, 512]) {
  const result = await handleGlyphImageRequest(request(id(1), `?size=${size}`), id(1), { adapter: actual });
  const bytes = new Uint8Array(await result.arrayBuffer());
  check(result.status === 200 && bytes[0] === 137 && new TextDecoder().decode(bytes.slice(1, 4)) === 'PNG', `actual ${size} PNG served`);
  const view = new DataView(bytes.buffer);
  check(view.getUint32(16) === size && view.getUint32(20) === size && bytes[25] === 6, `actual ${size} transparent RGBA dimensions`);
  check(await digest(bytes) === actual.jobs.get(id(1)).variants[size].checksum, `actual ${size} checksum preserved`);
}
const corrupted = new MemoryAdapter(); await backfillGlyphImages({ adapter: corrupted, apply: true });
check((await processGlyphImageJobs({ adapter: corrupted, render: async (...args) => ({ ...await render(...args), checksum: 'a'.repeat(64) }) }))[0].status === 'pending', 'bad renderer checksum cannot become ready');
await processGlyphImageJobs({ adapter: corrupted, render });
corrupted.download = async () => new Uint8Array([0]);
check((await handleGlyphImageRequest(request(), id(1), { adapter: corrupted })).status === 503, 'stored corruption is not served as image');
const joined = new MemoryAdapter(); await backfillGlyphImages({ adapter: joined, apply: true }); await processGlyphImageJobs({ adapter: joined, render });
let joinedReads = 0;
joined.readImageRecord = async (key) => { joinedReads++; return { glyph: clone(joined.glyphs.get(key)), job: clone(joined.jobs.get(key)) }; };
joined.readGlyph = joined.readJob = async () => { throw new Error('Redundant query on ready path'); };
check((await handleGlyphImageRequest(request(), id(1), { adapter: joined })).status === 200 && joinedReads === 2, 'ready serving uses two fresh joined reads plus one download');
console.log(`Glyph image pipeline: ${checks} checks passed.`);
