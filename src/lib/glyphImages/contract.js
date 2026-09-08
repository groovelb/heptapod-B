/** Shared browser/Node/Deno contract. No credentials or runtime-specific imports. */
export const GLYPH_IMAGE_VERSION = 1;
export const GLYPH_IMAGE_SIZES = Object.freeze([256, 512]);
export const GLYPH_IMAGE_INK = '#1c2226';
export const GLYPH_IMAGE_BUCKET = 'glyph-images';
export const GLYPH_IMAGE_MIME = 'image/png';
export const GLYPH_IMAGE_STATES = Object.freeze(['pending', 'processing', 'ready', 'failed', 'unsupported']);
export const GLYPH_ID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function canonicalModelJson(value) {
  let entries = 0;
  const ancestors = new Set();
  function visit(item, depth) {
    if (++entries > 5000 || depth > 12) throw new Error('Invalid glyph model');
    if (item === null || typeof item === 'boolean' || typeof item === 'string') return item;
    if (typeof item === 'number' && Number.isFinite(item)) return item;
    if (!item || typeof item !== 'object' || ancestors.has(item)) throw new Error('Invalid glyph model');
    ancestors.add(item);
    const result = Array.isArray(item) ? item.map((entry) => visit(entry, depth + 1))
      : Object.fromEntries(Object.keys(item).sort().map((key) => [key, visit(item[key], depth + 1)]));
    ancestors.delete(item);
    return result;
  }
  return JSON.stringify(visit(value, 0));
}
export async function glyphModelHash(model) {
  const bytes = new TextEncoder().encode(canonicalModelJson(model));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((n) => n.toString(16).padStart(2, '0')).join('');
}
export function glyphImagePath(id, modelHash, size = 512) {
  if (!GLYPH_ID_PATTERN.test(id) || !/^[a-f0-9]{64}$/.test(modelHash) || !GLYPH_IMAGE_SIZES.includes(size)) throw new Error('Invalid image key');
  return `${id}/v${GLYPH_IMAGE_VERSION}/${modelHash}/${size}-1c2226.png`;
}
export function glyphImageUrl(id, size = 512) {
  if (!GLYPH_ID_PATTERN.test(id)) return null;
  return `/api/glyph-image/${id}?size=${GLYPH_IMAGE_SIZES.includes(size) ? size : 512}&v=${GLYPH_IMAGE_VERSION}`;
}
