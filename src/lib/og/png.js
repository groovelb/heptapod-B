import { generateParticles, CX0, CY0 } from '../../utils/heptapod/logogramParticles.js';

export const SHARE_WIDTH = 1200;
export const SHARE_HEIGHT = 630;
const FOG = [214, 232, 237];
const INK = [28, 34, 38];
const MAX_PARTICLES = 18000;
const RENDER_BUDGET_MS = 4000;

function inRange(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/** Validate before any particle loops; historical JSON must not control unbounded work. */
export function validateShareModel(model) {
  let entries = 0;
  const ancestors = new Set();
  function bounded(value, depth = 0) {
    if (++entries > 3000 || depth > 9) throw new Error('Invalid stored model');
    if (value == null || typeof value === 'boolean') return;
    if (typeof value === 'string') {
      if (value.length > 512) throw new Error('Invalid stored model');
      return;
    }
    if (typeof value === 'number') {
      if (!inRange(value, -1e12, 1e12)) throw new Error('Invalid stored model');
      return;
    }
    if (typeof value !== 'object' || ancestors.has(value)) throw new Error('Invalid stored model');
    if (Array.isArray(value) && value.length > 256) throw new Error('Invalid stored model');
    ancestors.add(value);
    for (const key in value) {
      if (Object.hasOwn(value, key)) bounded(value[key], depth + 1);
    }
    ancestors.delete(value);
  }
  bounded(model);
  const list = (value, min, max, check) => Array.isArray(value)
    && value.length >= min && value.length <= max && value.every(check);
  const angle = (value) => inRange(value, -32, 32);
  const harmonic = (value) => value && Number.isInteger(value.k) && inRange(value.k, 1, 8)
    && inRange(value.amp, 0, 1) && angle(value.phase);
  const valid = model?.meta && inRange(model.meta.hash, 0, 4294967295)
    && model.ring && angle(model.ring.weightCenterAngle)
    && list(model.harmonics, 1, 3, (h) => harmonic(h) && h.amp <= 0.1)
    && list(model.pressure, 1, 3, harmonic)
    && list(model.strands, 3, 5, (s) => s && inRange(s.off, -2, 2)
      && inRange(s.w, 0, 2) && inRange(s.a, 0, 1) && inRange(s.thin, 0, 1) && angle(s.wobPh))
    && list(model.clusters, 1, 3, (c) => c && angle(c.ang) && inRange(c.I, 0, 2)
      && Number.isInteger(c.spikeN) && inRange(c.spikeN, 0, 13)
      && [-1, 1].includes(c.dirBias) && inRange(c.coneSpread, 0, 2)
      && ['blob', 'spike', 'wisp', 'hook'].includes(c.type))
    && list(model.dropZones, 0, 4, (z) => z && angle(z.ang) && inRange(z.width, 0.001, 2))
    && list(model.inkLoads, 0, 4, (z) => z && angle(z.ang)
      && inRange(z.width, 0.001, 2) && inRange(z.strength, 0, 2))
    && angle(model.spreadPh)
    && (!model.gap || (angle(model.gap.ang) && inRange(model.gap.half, 0, Math.PI)))
    && (!model.questionHook || (angle(model.questionHook.ang)
      && [-1, 1].includes(model.questionHook.curl) && inRange(model.questionHook.len, 0, 100)));
  if (!valid) throw new Error('Invalid stored model');
  return model;
}

// Same hard/soft radial alpha stops as makeSprites(), without Canvas or fonts.
function spriteAlpha(distance, soft) {
  if (distance >= 1) return 0;
  if (soft) return distance <= 0.5 ? 0.9 - distance * 0.9 : 0.9 * (1 - distance);
  if (distance <= 0.62) return 1 - distance * (0.05 / 0.62);
  if (distance <= 0.82) return 0.95 - (distance - 0.62) * 3;
  return 0.35 * (1 - distance) / 0.18;
}

/** Returns fixed-size RGBA pixels from actual generateParticles() positions. */
export function rasterizeShareGlyphs(models, { cells, inkContrast = 1, centerRings = false } = {}) {
  if (!Array.isArray(models) || models.length < 1 || models.length > 6) throw new Error('Invalid glyph count');
  if (!inRange(inkContrast, 1, 1.5)) throw new Error('Invalid ink contrast');
  for (const model of models) validateShareModel(model);
  const deadline = performance.now() + RENDER_BUDGET_MS;
  const pixels = new Uint8Array(SHARE_WIDTH * SHARE_HEIGHT * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = FOG[0]; pixels[i + 1] = FOG[1]; pixels[i + 2] = FOG[2]; pixels[i + 3] = 255;
  }
  const columns = models.length <= 2 ? models.length : 3;
  const rows = Math.ceil(models.length / columns);
  const cellWidth = SHARE_WIDTH / columns;
  const cellHeight = SHARE_HEIGHT / rows;
  if (cells && (cells.length !== models.length || cells.some((cell) => !cell
    || ![cell.x, cell.y, cell.width, cell.height].every(Number.isFinite)
    || cell.x < 0 || cell.y < 0 || cell.width < 40 || cell.height < 40
    || cell.x + cell.width > SHARE_WIDTH || cell.y + cell.height > SHARE_HEIGHT))) {
    throw new Error('Invalid glyph layout');
  }
  for (let index = 0; index < models.length; index += 1) {
    const { particles } = generateParticles(models[index], true);
    if (particles.length > MAX_PARTICLES || performance.now() > deadline) throw new Error('Render budget exceeded');
    // Preserve aspect ratio, including every particle's sprite radius; no cropped tendrils.
    let min = [Infinity, Infinity], max = [-Infinity, -Infinity];
    for (const p of particles) {
      if (p.kind === 'wisp') continue;
      if (![p.x, p.y, p.r, p.a].every(Number.isFinite) || p.r < 0 || p.r > 100 || p.a < 0 || p.a > 1) throw new Error('Invalid particle');
      if (!p.a || !p.r) continue;
      min = [Math.min(min[0], p.x - p.r * 1.25), Math.min(min[1], p.y - p.r * 1.25)];
      max = [Math.max(max[0], p.x + p.r * 1.25), Math.max(max[1], p.y + p.r * 1.25)];
    }
    if (![...min, ...max].every(Number.isFinite)) throw new Error('Empty glyph');
    if (centerRings) {
      const rx = Math.max(CX0 - min[0], max[0] - CX0);
      const ry = Math.max(CY0 - min[1], max[1] - CY0);
      min = [CX0 - rx, CY0 - ry]; max = [CX0 + rx, CY0 + ry];
    }
    const cell = cells?.[index] || { x: index % columns * cellWidth, y: Math.floor(index / columns) * cellHeight, width: cellWidth, height: cellHeight };
    const scale = Math.min((cell.width - 32) / (max[0] - min[0]), (cell.height - 32) / (max[1] - min[1]));
    const originX = cell.x + cell.width / 2 - (max[0] + min[0]) * scale / 2;
    const originY = cell.y + cell.height / 2 - (max[1] + min[1]) * scale / 2;
    for (let pi = 0; pi < particles.length; pi += 1) {
      if (pi % 256 === 0 && performance.now() > deadline) throw new Error('Render budget exceeded');
      const particle = particles[pi];
      if (particle.kind === 'wisp') continue;
      if (![particle.x, particle.y, particle.r, particle.a].every(Number.isFinite)
        || particle.r < 0 || particle.r > 100 || particle.a < 0 || particle.a > 1) {
        throw new Error('Invalid particle');
      }
      const x = originX + particle.x * scale;
      const y = originY + particle.y * scale;
      const radius = particle.r * 1.25 * scale;
      if (!radius) continue;
      const soft = particle.kind === 'core' && particle.r > 4.5;
      const minX = Math.max(0, Math.floor(x - radius));
      const maxX = Math.min(SHARE_WIDTH - 1, Math.ceil(x + radius));
      const minY = Math.max(0, Math.floor(y - radius));
      const maxY = Math.min(SHARE_HEIGHT - 1, Math.ceil(y + radius));
      for (let py = minY; py <= maxY; py += 1) {
        for (let px = minX; px <= maxX; px += 1) {
          const distance = Math.hypot(px + 0.5 - x, py + 0.5 - y) / radius;
          const alpha = Math.min(1, spriteAlpha(distance, soft) * particle.a * inkContrast);
          if (alpha <= 0) continue;
          const offset = (py * SHARE_WIDTH + px) * 4;
          for (let channel = 0; channel < 3; channel += 1) {
            pixels[offset + channel] = Math.round(pixels[offset + channel] * (1 - alpha) + INK[channel] * alpha);
          }
        }
      }
    }
  }
  return pixels;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const output = new Uint8Array(data.length + 12);
  const view = new DataView(output.buffer);
  view.setUint32(0, data.length);
  output.set(new TextEncoder().encode(type), 4);
  output.set(data, 8);
  view.setUint32(data.length + 8, crc32(output.subarray(4, data.length + 8)));
  return output;
}

/** PNG encoding uses Web APIs present in both Deno and Node; no native dependencies. */
export async function renderSharePng(models, options) {
  const pixels = rasterizeShareGlyphs(models, options);
  const stride = SHARE_WIDTH * 4;
  const scanlines = new Uint8Array((stride + 1) * SHARE_HEIGHT);
  for (let y = 0; y < SHARE_HEIGHT; y += 1) {
    // Filter 0: every row contains its actual RGBA pixel values.
    scanlines.set(pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const compressed = new Uint8Array(await new Response(
    new Blob([scanlines]).stream().pipeThrough(new CompressionStream('deflate')),
  ).arrayBuffer());
  const header = new Uint8Array(13);
  const dimensions = new DataView(header.buffer);
  dimensions.setUint32(0, SHARE_WIDTH);
  dimensions.setUint32(4, SHARE_HEIGHT);
  header[8] = 8; // Eight bits per RGBA channel.
  header[9] = 6; // PNG truecolour with alpha.
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', compressed), chunk('IEND', new Uint8Array())];
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}
