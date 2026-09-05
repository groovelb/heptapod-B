import { trustedShareUrl } from './handler.js';

const PUBLIC_COLUMNS = 'id,canonical_name,is_interrogative,encoder_version,model_data,is_public';
const MAX_RESPONSE_BYTES = 262144;

/** Public REST read with the platform anon key: no service-role access is needed. */
export function createPublicGlyphReader({ supabaseUrl, anonKey, fetcher = fetch }) {
  const origin = trustedShareUrl(supabaseUrl);
  if (!anonKey || typeof anonKey !== 'string') throw new Error('Missing public archive configuration');
  return async function readPublicGlyphs(ids) {
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 2
      || ids.some((id) => typeof id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))) {
      throw new Error('Invalid public glyph IDs');
    }
    const url = new URL('/rest/v1/glyphs', origin);
    url.searchParams.set('select', PUBLIC_COLUMNS);
    url.searchParams.set('id', `in.(${ids.join(',')})`);
    url.searchParams.set('is_public', 'eq.true');
    url.searchParams.set('limit', '2');
    const response = await fetcher(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok || !response.body) throw new Error('Public archive read failed');
    if (Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES) {
      await response.body.cancel();
      throw new Error('Public archive response exceeded limit');
    }
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('Public archive response exceeded limit');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const value of chunks) { bytes.set(value, offset); offset += value.length; }
    return JSON.parse(new TextDecoder().decode(bytes));
  };
}
