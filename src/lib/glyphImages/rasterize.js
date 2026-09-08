import { generateParticles, SIZE0 } from '../../utils/heptapod/logogramParticles.js';
import { GLYPH_IMAGE_SIZES, GLYPH_IMAGE_INK, GLYPH_IMAGE_MIME, canonicalModelJson } from './contract.js';

const MAX_PARTICLES = 18000;
const RENDER_BUDGET_MS = 4000;
const SAMPLE_SCALE = 2;
const inRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

export class UnsupportedGlyphModelError extends Error {
  constructor(message = 'Unsupported glyph model') {
    super(message);
    this.name = 'UnsupportedGlyphModelError';
    this.code = 'UNSUPPORTED_GLYPH_MODEL';
  }
}

/** Validate actual stored geometry, never infer it from names or version labels.
 * Empty bounded lists are legitimate partial models (including the timeline ring).
 */
export function validateGlyphImageModel(model) {
  try {
    const json = canonicalModelJson(model);
    if (json.length > 65536) throw new Error('Model too large');
  } catch { throw new UnsupportedGlyphModelError(); }
  const list = (value, maximum, check) => Array.isArray(value) && value.length <= maximum && value.every(check);
  const angle = (value) => inRange(value, -32, 32);
  const harmonic = (value) => value && Number.isInteger(value.k) && inRange(value.k, 1, 8)
    && inRange(value.amp, 0, 2) && angle(value.phase);
  const valid = model?.meta && Number.isInteger(model.meta.hash) && inRange(model.meta.hash, 0, 4294967295)
    && model.ring && angle(model.ring.weightCenterAngle)
    && list(model.harmonics, 8, (h) => harmonic(h) && h.amp <= 0.1)
    && list(model.pressure, 8, harmonic)
    && list(model.strands, 5, (s) => s && inRange(s.off, -2, 2) && inRange(s.w, 0, 2)
      && inRange(s.a, 0, 1) && inRange(s.thin, 0, 1) && angle(s.wobPh))
    && list(model.clusters, 3, (c) => c && angle(c.ang) && inRange(c.I, 0, 2)
      && Number.isInteger(c.spikeN) && inRange(c.spikeN, 0, 13)
      && [-1, 1].includes(c.dirBias) && inRange(c.coneSpread, 0, 2))
    && (model.inkLoads === undefined || list(model.inkLoads, 4, (z) => z && angle(z.ang)
      && inRange(z.width, 0.001, 2) && inRange(z.strength, 0, 2)))
    && list(model.dropZones, 4, (z) => z && angle(z.ang) && inRange(z.width, 0.001, 2))
    && angle(model.spreadPh)
    && (!model.gap || (angle(model.gap.ang) && inRange(model.gap.half, 0, Math.PI)))
    && (!model.questionHook || (angle(model.questionHook.ang) && [-1, 1].includes(model.questionHook.curl)
      && inRange(model.questionHook.len, 0, 100)));
  if (!valid) throw new UnsupportedGlyphModelError();
  return model;
}

// Identical radial stops and sprite extent to makeSprites()/drawInkParticle().
function spriteAlpha(distance, soft) {
  if (distance >= 1) return 0;
  if (soft) return 0.9 * (1 - distance);
  if (distance <= 0.62) return 1 - distance * (0.05 / 0.62);
  if (distance <= 0.82) return 0.95 - (distance - 0.62) * 3;
  return 0.35 * (1 - distance) / 0.18;
}

/** Fixed 720-space framing preserves CSS fragment masks and ring centers.
 * No automatic tight crop, fit-to-particles, contrast boost, fonts, or Canvas.
 * Four subpixel samples preserve small ink particles at thumbnail resolutions.
 */
export function rasterizeGlyphImage(model, { size = 512, ink = GLYPH_IMAGE_INK } = {}) {
  if (!GLYPH_IMAGE_SIZES.includes(size)) throw new RangeError('Unsupported glyph image size');
  if (typeof ink !== 'string' || !/^#[a-f\d]{6}$/i.test(ink)) throw new TypeError('Invalid glyph image ink');
  validateGlyphImageModel(model);
  const started = performance.now();
  const { particles } = generateParticles(model, true);
  if (particles.length > MAX_PARTICLES) throw new UnsupportedGlyphModelError('Glyph particle limit exceeded');
  const sampleSize = size * SAMPLE_SCALE;
  const scale = sampleSize / SIZE0;
  const alpha = new Float32Array(sampleSize * sampleSize);
  for (let index = 0; index < particles.length; index += 1) {
    if (index % 256 === 0 && performance.now() - started > RENDER_BUDGET_MS) throw new Error('Glyph render budget exceeded');
    const p = particles[index];
    if (p.kind === 'wisp') continue;
    if (![p.x, p.y, p.r, p.a].every(Number.isFinite) || p.r < 0 || p.r > 100 || p.a < 0 || p.a > 1) {
      throw new UnsupportedGlyphModelError('Invalid glyph particle');
    }
    if (!p.r || !p.a) continue;
    const x = p.x * scale, y = p.y * scale, radius = p.r * 1.25 * scale;
    const soft = p.kind === 'core' && p.r > 4.5;
    const minX = Math.max(0, Math.floor(x - radius)), maxX = Math.min(sampleSize - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius)), maxY = Math.min(sampleSize - 1, Math.ceil(y + radius));
    for (let py = minY; py <= maxY; py += 1) {
      for (let px = minX; px <= maxX; px += 1) {
        const a = spriteAlpha(Math.hypot(px + 0.5 - x, py + 0.5 - y) / radius, soft) * p.a;
        if (a <= 0) continue;
        const offset = py * sampleSize + px;
        alpha[offset] += a * (1 - alpha[offset]); // source-over on transparent background
      }
    }
  }
  const rgb = [1, 3, 5].map((index) => parseInt(ink.slice(index, index + 2), 16));
  const pixels = new Uint8Array(size * size * 4);
  let painted = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const a = y * SAMPLE_SCALE * sampleSize + x * SAMPLE_SCALE;
      const coverage = Math.round((alpha[a] + alpha[a + 1] + alpha[a + sampleSize] + alpha[a + sampleSize + 1]) * 255 / 4);
      if (!coverage) continue;
      const offset = (y * size + x) * 4;
      pixels.set(rgb, offset);
      pixels[offset + 3] = coverage;
      painted += 1;
    }
  }
  if (!painted) throw new UnsupportedGlyphModelError('Empty glyph geometry');
  return { pixels, width: size, height: size, particleCount: particles.length };
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function chunk(type, data) {
  const bytes = new Uint8Array(data.length + 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(data, 8);
  let crc = 0xffffffff;
  for (const byte of bytes.subarray(4, data.length + 8)) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  view.setUint32(data.length + 8, (crc ^ 0xffffffff) >>> 0);
  return bytes;
}

async function encodePng(pixels, width, height) {
  const stride = width * 4;
  const rows = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) rows.set(pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  const compressed = new Uint8Array(await new Response(
    new Blob([rows]).stream().pipeThrough(new CompressionStream('deflate')),
  ).arrayBuffer());
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width); view.setUint32(4, height);
  header[8] = 8; header[9] = 6;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
    chunk('IDAT', compressed), chunk('IEND', new Uint8Array())];
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}

/** Portable Node/Deno/browser-Worker renderer; no runtime-specific imports. */
export async function renderGlyphImage(model, options) {
  const { pixels, width, height } = rasterizeGlyphImage(model, options);
  const bytes = await encodePng(pixels, width, height);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const checksum = [...digest].map((n) => n.toString(16).padStart(2, '0')).join('');
  return { bytes, width, height, mimeType: GLYPH_IMAGE_MIME, checksum };
}
