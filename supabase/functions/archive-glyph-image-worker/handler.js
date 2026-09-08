import { processGlyphImageJobs } from '../../../src/lib/glyphImages/jobs.js';

async function authorized(actual, expected) {
  if (!expected || !actual || actual.length > 512) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([actual, expected].map((value) => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const left = new Uint8Array(a); const right = new Uint8Array(b); let different = 0;
  for (let index = 0; index < left.length; index++) different |= left[index] ^ right[index];
  return different === 0;
}

export function createGlyphImageWorkerHandler({ secret, adapter, render }) {
  return async (request) => {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' };
    if (request.method !== 'POST') return new Response('{}', { status: 405, headers });
    if (!await authorized(request.headers.get('x-glyph-worker-secret'), secret)) return new Response('{}', { status: 401, headers });
    try {
      const results = await processGlyphImageJobs({ adapter, render, limit: 2 });
      return new Response(JSON.stringify({ results }), { headers });
    } catch { return new Response('{"error":"worker_failed"}', { status: 503, headers }); }
  };
}
