import { GLYPH_IMAGE_VERSION, GLYPH_IMAGE_SIZES, GLYPH_IMAGE_MIME, GLYPH_IMAGE_INK, glyphModelHash, glyphImagePath } from './contract.js';

export async function processGlyphImageJobs({ adapter, render, limit = 2, now = () => Date.now() }) {
  const jobs = await adapter.claim(Math.max(1, Math.min(4, limit)));
  const results = [];
  // Sequential rendering bounds CPU/memory in the background consumer.
  for (const job of jobs) {
    let hash;
    try {
      const glyph = await adapter.readGlyph(job.glyph_id);
      if (!glyph?.is_public) { results.push({ id: job.glyph_id, status: 'excluded' }); continue; }
      try { hash = await glyphModelHash(glyph.model_data); }
      catch { const error = new Error('Unsupported glyph model'); error.code = 'UNSUPPORTED_MODEL'; throw error; }
      const variants = {};
      for (const size of GLYPH_IMAGE_SIZES) {
        const image = await render(glyph.model_data, { size, ink: GLYPH_IMAGE_INK });
        if (!(image.bytes instanceof Uint8Array) || image.bytes.length === 0 || image.bytes.length > 3 * 1024 * 1024 || image.width !== size || image.height !== size || image.mimeType !== GLYPH_IMAGE_MIME || !/^[a-f0-9]{64}$/.test(image.checksum)) throw new Error('Invalid renderer output');
        const checksum = [...new Uint8Array(await crypto.subtle.digest('SHA-256', image.bytes))].map((n) => n.toString(16).padStart(2, '0')).join('');
        if (checksum !== image.checksum) throw new Error('Image checksum mismatch');
        const path = glyphImagePath(glyph.id, hash, size);
        await adapter.upload(path, image.bytes, image.mimeType);
        variants[size] = { path, width: size, height: size, mimeType: image.mimeType, checksum: image.checksum };
      }
      const current = await adapter.readGlyph(job.glyph_id);
      if (!current?.is_public || await glyphModelHash(current.model_data) !== hash) {
        // The transactional trigger clears/replaces this lease on mutation.
        results.push({ id: job.glyph_id, status: 'stale' }); continue;
      }
      const finished = await adapter.finish(job, { status: 'ready', model_hash: hash, renderer_version: GLYPH_IMAGE_VERSION, variants, error: null });
      results.push({ id: job.glyph_id, status: finished ? 'ready' : 'stale' });
    } catch (error) {
      const unsupported = ['UNSUPPORTED_MODEL', 'UNSUPPORTED_GLYPH_MODEL'].includes(error?.code) || error?.name === 'UnsupportedGlyphModelError';
      const terminal = unsupported || job.attempts >= 5;
      const status = unsupported ? 'unsupported' : terminal ? 'failed' : 'pending';
      // Persist a safe category, never arbitrary SDK/network error strings or model contents.
      const completed = await adapter.finish(job, { status, model_hash: hash || null, variants: {}, error: unsupported ? 'unsupported_model' : 'generation_failed',
        next_attempt_at: new Date(now() + Math.min(3600000, 15000 * 2 ** Math.min(job.attempts || 1, 8))).toISOString() });
      results.push({ id: job.glyph_id, status: completed ? status : 'stale' });
    }
  }
  return results;
}

/** Stable UUID keyset scan, independent of the archive UI's 200-row limit. */
export async function backfillGlyphImages({ adapter, apply = false, retryFailed = false, checkpoint = null, pageSize = 100, onCheckpoint = async () => {} }) {
  if (checkpoint && (checkpoint.version !== GLYPH_IMAGE_VERSION || checkpoint.apply !== apply)) throw new Error('Checkpoint mode/version mismatch');
  const state = checkpoint || { version: GLYPH_IMAGE_VERSION, apply, upperId: await adapter.upperId(), after: null, complete: false, counts: {}, results: [] };
  if (state.complete || !state.upperId) { state.complete = true; await onCheckpoint(state); return state; }
  for (;;) {
    const page = await adapter.scanGlyphs({ after: state.after, upperId: state.upperId, limit: Math.max(1, Math.min(500, pageSize)) });
    if (!page.length) break;
    for (const row of page) {
      let status;
      if (!row.is_public) status = 'excluded';
      else {
        const existing = await adapter.readJob(row.id);
        let hash;
        try { hash = await glyphModelHash(row.model_data); } catch { /* Worker records unsupported without changing original models. */ }
        if (hash && existing?.status === 'ready' && existing.model_hash === hash && existing.renderer_version === GLYPH_IMAGE_VERSION
          && GLYPH_IMAGE_SIZES.every((size) => {
            const variant = existing.variants?.[size];
            return variant?.path === glyphImagePath(row.id, hash, size) && variant.width === size && variant.height === size
              && variant.mimeType === GLYPH_IMAGE_MIME && /^[a-f0-9]{64}$/.test(variant.checksum);
          })) status = 'ready';
        else if (existing && ['pending', 'processing'].includes(existing.status)) status = existing.status;
        else if (existing && ['failed', 'unsupported'].includes(existing.status) && !retryFailed) status = existing.status;
        else status = apply ? (await adapter.enqueue(row, existing) ? 'queued' : 'concurrent_change') : 'would_queue';
      }
      state.results.push({ id: row.id, status }); state.counts[status] = (state.counts[status] || 0) + 1;
      state.after = row.id;
      await onCheckpoint(state);
    }
  }
  state.complete = true; await onCheckpoint(state); return state;
}
