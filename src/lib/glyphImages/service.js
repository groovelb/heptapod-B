import { GLYPH_ID_PATTERN, GLYPH_IMAGE_BUCKET, GLYPH_IMAGE_VERSION, GLYPH_IMAGE_SIZES, GLYPH_IMAGE_MIME, glyphModelHash, glyphImagePath } from './contract.js';

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
const IMAGE_LIMIT = 3 * 1024 * 1024;

/** Server-only credentials supplied by the caller; never expose this adapter to client components. */
export function createGlyphImageAdapter({ url, key, fetcher = fetch, publicOnly = false }) {
  if (!url || !key) throw new Error('Glyph image service is not configured');
  const base = new URL(url);
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Invalid service URL');
  async function request(path, { query, body, method = 'GET', headers = {}, raw = false } = {}) {
    const target = new URL(path, base);
    for (const [name, value] of Object.entries(query || {})) target.searchParams.set(name, String(value));
    const response = await fetcher(target, { method, cache: 'no-store', signal: AbortSignal.timeout(20000),
      headers: { apikey: key, Authorization: `Bearer ${key}`, ...(body && !raw ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(body ? { body: raw ? body : JSON.stringify(body) } : {}) });
    if (!response.ok) { const error = new Error(`Glyph image service request failed (${response.status})`); error.status = response.status; throw error; }
    if (raw || response.status === 204) return response;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  const rows = (table, query) => request(`/rest/v1/${table}`, { query });
  return {
    async readGlyph(id) { return (await rows('glyphs', { select: 'id,model_data,is_public', id: `eq.${id}`, is_public: 'eq.true', limit: 1 }))[0] || null; },
    async readImageRecord(id) {
      const job = (await rows('glyph_image_jobs', {
        select: 'glyph_id,status,model_hash,renderer_version,variants,updated_at,glyph:glyphs!inner(id,model_data,is_public)',
        glyph_id: `eq.${id}`, 'glyph.is_public': 'eq.true', limit: 1,
      }))[0] || null;
      return { job, glyph: job?.glyph || null };
    },
    async readJob(id) { return (await rows('glyph_image_jobs', { select: publicOnly ? 'glyph_id,status,model_hash,renderer_version,variants,updated_at' : '*', glyph_id: `eq.${id}`, limit: 1 }))[0] || null; },
    async upperId() { return (await rows('glyphs', { select: 'id', is_public: 'eq.true', order: 'id.desc', limit: 1 }))[0]?.id || null; },
    scanGlyphs({ after, upperId, limit = 100 }) { return rows('glyphs', { select: 'id,model_data,is_public', is_public: 'eq.true', order: 'id.asc', limit,
      ...(after ? { and: `(id.gt.${after},id.lte.${upperId})` } : { id: `lte.${upperId}` }) }); },
    async enqueue(row, existing = null) {
      const body = { glyph_id: row.id, status: 'pending', model_hash: null, renderer_version: GLYPH_IMAGE_VERSION, variants: {}, attempts: 0,
        lease_token: null, lease_until: null, next_attempt_at: new Date().toISOString(), error: null, updated_at: new Date().toISOString() };
      const result = await request('/rest/v1/glyph_image_jobs', existing
        ? { method: 'PATCH', query: { glyph_id: `eq.${row.id}`, updated_at: `eq.${existing.updated_at}`, status: `eq.${existing.status}` }, body, headers: { Prefer: 'return=representation' } }
        : { method: 'POST', body, headers: { Prefer: 'resolution=ignore-duplicates,return=representation' } });
      return Boolean(result?.length);
    },
    claim(limit = 2) { return request('/rest/v1/rpc/claim_glyph_image_jobs', { method: 'POST', body: { p_limit: Math.max(1, Math.min(4, limit)) } }); },
    async finish(job, patch) {
      const result = await request('/rest/v1/glyph_image_jobs', { method: 'PATCH', query: { glyph_id: `eq.${job.glyph_id}`, lease_token: `eq.${job.lease_token}`, status: 'eq.processing' },
        body: { ...patch, lease_token: null, lease_until: null, updated_at: new Date().toISOString() }, headers: { Prefer: 'return=representation' } });
      return Boolean(result?.length);
    },
    async upload(path, bytes, mimeType) { await request(`/storage/v1/object/${GLYPH_IMAGE_BUCKET}/${path}`, { method: 'POST', raw: true, body: bytes,
      headers: { 'Content-Type': mimeType, 'x-upsert': 'true', 'Cache-Control': '0' } }); },
    async download(path) {
      const response = await request(`/storage/v1/object/authenticated/${GLYPH_IMAGE_BUCKET}/${path}`, { raw: true });
      if (Number(response.headers.get('content-length')) > IMAGE_LIMIT) throw new Error('Image too large');
      const reader = response.body.getReader(); const chunks = []; let length = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length;
        if (length > IMAGE_LIMIT) { await reader.cancel(); throw new Error('Image too large'); } chunks.push(value); }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return bytes;
    },
  };
}

export function publicGlyphImageAdapter() {
  return createGlyphImageAdapter({ url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY, publicOnly: true });
}

/** No cached readiness or URL signing: visibility/model are checked again on every request. */
export async function getImageDescriptor(glyphId, { adapter = publicGlyphImageAdapter() } = {}) {
  if (!GLYPH_ID_PATTERN.test(glyphId || '')) return { status: 'unavailable' };
  let glyph; let job;
  if (adapter.readImageRecord) {
    ({ glyph, job } = await adapter.readImageRecord(glyphId));
    // A public row with no derived record is pending, including rollout windows.
    if (!job) glyph = await adapter.readGlyph(glyphId);
  } else [glyph, job] = await Promise.all([adapter.readGlyph(glyphId), adapter.readJob(glyphId)]);
  if (!glyph?.is_public) return { status: 'unavailable' };
  const modelHash = await glyphModelHash(glyph.model_data);
  if (!job || job.status !== 'ready' || job.model_hash !== modelHash || job.renderer_version !== GLYPH_IMAGE_VERSION) return { status: job?.status === 'unsupported' ? 'unsupported' : 'pending' };
  const variants = {};
  for (const size of GLYPH_IMAGE_SIZES) {
    const value = job.variants?.[size];
    if (!value || value.path !== glyphImagePath(glyphId, modelHash, size) || value.width !== size || value.height !== size || value.mimeType !== GLYPH_IMAGE_MIME || !/^[a-f0-9]{64}$/.test(value.checksum)) return { status: 'pending' };
    variants[size] = value;
  }
  return { status: 'ready', modelHash, rendererVersion: GLYPH_IMAGE_VERSION, variants };
}

export async function handleGlyphImageRequest(request, glyphId, { adapter } = {}) {
  try {
    const url = new URL(request.url); const size = Number(url.searchParams.get('size') || 512);
    if (!GLYPH_ID_PATTERN.test(glyphId || '') || !GLYPH_IMAGE_SIZES.includes(size)
      || (url.searchParams.has('v') && Number(url.searchParams.get('v')) !== GLYPH_IMAGE_VERSION)) return new Response('Not found', { status: 404, headers: NO_STORE });
    adapter ||= publicGlyphImageAdapter();
    const descriptor = await getImageDescriptor(glyphId, { adapter });
    if (descriptor.status !== 'ready') return new Response('Image unavailable', { status: descriptor.status === 'pending' ? 503 : 404,
      headers: { ...NO_STORE, ...(descriptor.status === 'pending' ? { 'Retry-After': '15' } : {}) } });
    const bytes = await adapter.download(descriptor.variants[size].path);
    const checksum = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((n) => n.toString(16).padStart(2, '0')).join('');
    if (checksum !== descriptor.variants[size].checksum) throw new Error('Image checksum mismatch');
    // Close the download-time revocation/model-update window before sending bytes.
    const current = await getImageDescriptor(glyphId, { adapter });
    if (current.status !== 'ready' || current.modelHash !== descriptor.modelHash) return new Response('Not found', { status: 404, headers: NO_STORE });
    return new Response(request.method === 'HEAD' ? null : bytes, { headers: { ...NO_STORE, 'Content-Type': GLYPH_IMAGE_MIME, 'Content-Length': String(bytes.length) } });
  } catch { return new Response('Image unavailable', { status: 503, headers: { ...NO_STORE, 'Retry-After': '15' } }); }
}
