import { canonicalModelJson, GLYPH_IMAGE_INK, GLYPH_IMAGE_VERSION } from '../lib/glyphImages/contract.js';

/** Small reference-counted cache. Geometry and PNG work only run in one Worker.
 * Canonical content, never meta.hash, identifies immutable local models.
 */
export function createStaticGlyphImageCache({
  workerFactory = () => new Worker(new URL('../workers/staticGlyphImage.worker.js', import.meta.url), { type: 'module' }),
  urls = URL, limit = 32, maxPending = 32, timeoutMs = 30000,
} = {}) {
  const entries = new Map();
  const queue = [];
  let worker; let active; let serial = 0; let timer;
  const drop = (key, entry) => {
    if (entry.url) urls.revokeObjectURL(entry.url);
    entries.delete(key);
  };
  function trim() {
    const idle = [...entries].filter(([, entry]) => !entry.refs && entry.settled);
    while (idle.length > limit) { const [key, entry] = idle.shift(); drop(key, entry); }
  }
  function stopWorker() { clearTimeout(timer); worker?.terminate(); worker = undefined; }
  function settle(error, payload) {
    if (!active) return;
    clearTimeout(timer);
    const entry = active; active = undefined;
    entry.settled = true;
    if (error) { entry.reject(error); entries.delete(entry.key); }
    else {
      entry.url = urls.createObjectURL(new Blob([payload.bytes], { type: payload.mimeType }));
      entry.resolve(entry.url);
    }
    trim(); pump();
  }
  function pump() {
    if (active) return;
    while (queue.length && !queue[0].refs) {
      const entry = queue.shift(); entries.delete(entry.key); entry.reject(new Error('Glyph image released'));
    }
    active = queue.shift();
    if (!active) { stopWorker(); return; }
    try {
      if (!worker) {
        worker = workerFactory();
        worker.onmessage = ({ data }) => {
          if (!active || data.id !== active.id) return;
          settle(data.error ? new Error(data.error) : null, data);
        };
        worker.onerror = () => { stopWorker(); settle(new Error('Glyph image worker failed')); };
      }
      timer = setTimeout(() => { stopWorker(); settle(new Error('Glyph image timed out')); }, timeoutMs);
      worker.postMessage({ id: active.id, model: active.model, size: active.size, ink: GLYPH_IMAGE_INK });
    } catch (error) { stopWorker(); settle(error); }
  }
  return {
    acquire(model, size = 512) {
      const key = `${GLYPH_IMAGE_VERSION}:${size}:${canonicalModelJson(model)}`;
      let entry = entries.get(key);
      if (!entry) {
        for (const [oldKey, oldEntry] of entries) {
          if (entries.size < limit * 2) break;
          if (!oldEntry.refs && oldEntry.settled) drop(oldKey, oldEntry);
        }
        if (entries.size >= limit * 2 || queue.length + Number(Boolean(active)) >= maxPending) throw new Error('Glyph image queue full');
        entry = { key, model, size, id: ++serial, refs: 0, settled: false };
        entry.promise = new Promise((resolve, reject) => { entry.resolve = resolve; entry.reject = reject; });
        entries.set(key, entry); queue.push(entry);
      }
      entry.refs += 1;
      // Move touched content to the end for bounded least-recently-used retention.
      entries.delete(key); entries.set(key, entry);
      pump();
      let released = false;
      return { promise: entry.promise, release() {
        if (released) return; released = true; entry.refs -= 1; trim();
      } };
    },
    clear() {
      stopWorker();
      for (const [key, entry] of entries) { if (!entry.settled) entry.reject(new Error('Glyph image cache cleared')); drop(key, entry); }
      active = undefined; queue.length = 0;
    },
  };
}

export const staticGlyphImageCache = createStaticGlyphImageCache();
