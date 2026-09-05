export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export class ArchiveError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function validGlyphId(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function readRequest(request) {
  if (request.method !== 'POST') throw new ArchiveError('POST 요청이 필요합니다.', 405);
  if (Number(request.headers.get('content-length')) > 8192) throw new ArchiveError('요청이 너무 큽니다.', 413);
  const reader = request.body?.getReader();
  const chunks = [];
  let byteLength = 0;
  if (reader) {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        byteLength += value.byteLength;
        if (byteLength > 8192) {
          await reader.cancel().catch(() => {});
          throw new ArchiveError('요청이 너무 큽니다.', 413);
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  // Decode once after byte-bounded reading, preserving UTF-8 split across chunks.
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const raw = new TextDecoder().decode(bytes);
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new ArchiveError('JSON 요청을 확인해 주세요.'); }
}

export function errorResponse(error) {
  const status = error.status || 500;
  return jsonResponse({ error: { message: status < 500 ? error.message : '아카이브 요청을 처리하지 못했습니다. 다시 시도해 주세요.' } }, status);
}
