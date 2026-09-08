import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { renderSharePng } from './png.js';

export const OG_DESIGN_VERSION = 6;
const fonts = new Map();
const INK = '#142025';
const segments = new Intl.Segmenter('ko', { granularity: 'grapheme' });
const graphemes = (text) => [...segments.segment(String(text))].map((part) => part.segment);

async function cardFont(latin = false) {
  const file = latin ? 'Cinzel-Bold.ttf' : 'NotoSerifKR-Bold.otf';
  if (!fonts.has(file)) fonts.set(file, readFile(path.join(process.cwd(), 'public/og', file)).then((buffer) => (
    opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
  )));
  return fonts.get(file);
}

function splitLines(text, font, size, width, options) {
  const lines = []; let line = '';
  for (const part of graphemes(text)) {
    if (line && font.getAdvanceWidth(line + part, size, options) > width) {
      const space = line.lastIndexOf(' ');
      if (space > line.length / 2) {
        lines.push(line.slice(0, space).trim());
        line = line.slice(space + 1) + part;
      } else { lines.push(line.trim()); line = part.trimStart(); }
    } else line += part;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

/** Two readable lines at most; metadata retains the full literal name. Never shrink to microcopy. */
export async function titleArtwork(text, { size = 64, minSize = 52, width = 1056, color = INK, tracking = 0, halo = null } = {}) {
  const literal = graphemes(String(text || '').replace(/\s+/g, ' ').trim()).slice(0, 160).join('');
  const font = await cardFont(/^[\p{Script=Latin}\p{Number}\p{Punctuation}\p{Separator}]+$/u.test(literal));
  const options = { letterSpacing: tracking };
  let lines = splitLines(literal, font, size, width - 16, options);
  while (lines.length > 2 && size > minSize) { size -= 2; lines = splitLines(literal, font, size, width - 16, options); }
  if (lines.length > 2) {
    lines = lines.slice(0, 2);
    let tail = graphemes(lines[1]);
    while (tail.length && font.getAdvanceWidth(tail.join('') + '…', size, options) > width - 16) tail.pop();
    lines[1] = tail.join('').trimEnd() + '…';
  }
  const lineHeight = Math.ceil(size * 1.32);
  let height = 8;
  const paths = lines.map((line, index) => {
    const outline = font.getPath(line, 0, 0, size, options);
    const b = outline.getBoundingBox();
    height = Math.max(height, Math.ceil(index * lineHeight + b.y2 - b.y1 + 8));
    // Measure ink bounds, not advance width: ascenders and descenders cannot be clipped.
    return `<path d="${outline.toPathData(2)}" transform="translate(${(width - (b.x2 - b.x1)) / 2 - b.x1},${index * lineHeight + 4 - b.y1})" fill="${color}"${halo ? ` stroke="${halo}" stroke-width="6" stroke-linejoin="round" paint-order="stroke"` : ''}/>`;
  });
  return { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${paths.join('')}</svg>`),
    width, height, size, lines };
}

/** Center titles on the model's ring origin, retaining every visible particle. */
export async function composeOgCard(models, { cardTitle, cardTitles, title, kind } = {}) {
  if (!Array.isArray(models) || models.length < 1 || models.length > 3) throw new Error('OG cards support one to three readable glyphs');
  const gap = models.length > 2 ? 12 : 36;
  const areaWidth = models.length === 1 ? 680 : 1104;
  const slotWidth = (areaWidth - gap * (models.length - 1)) / models.length;
  const cells = models.map((_, index) => ({ x: (1200 - areaWidth) / 2 + index * (slotWidth + gap),
    y: 24, width: slotWidth, height: 582 }));
  const raster = await renderSharePng(models, { cells, inkContrast: 1.25, centerRings: true });
  const separate = kind === 'compare' && cardTitles?.length === models.length;
  const labels = separate ? cardTitles : [cardTitle || title || 'Heptapod B'];
  const pairedGroup = !separate && models.length === 2;
  const layers = await Promise.all(labels.map(async (label, index) => {
    const heading = await titleArtwork(label, { size: separate ? 64 : 72,
      width: separate || pairedGroup ? Math.floor(slotWidth - 16) : 1056, halo: '#d6e8ed' });
    const centerX = separate || pairedGroup ? cells[index].x + cells[index].width / 2 : 600;
    return { input: heading.input, left: Math.round(centerX - heading.width / 2), top: Math.round(315 - heading.height / 2) };
  }));
  return sharp(raster).composite(layers).png().toBuffer();
}

/** Place the plate's ring center at (600,315), fitting the entire source without cropping. */
export async function renderLandingCard({ treatment = 'light' } = {}) {
  const source = path.join(process.cwd(), 'public/heptapod-b-encoder/hero-pilot/hero-logogram-response-plate-fb1-v1.png');
  // The approved source's ring is at 264/630 of its height, above the photo midpoint.
  // Fit the longer lower half first, then extend the fog above and beside the whole plate.
  const ringY = 264 / 630;
  const height = Math.floor(315 / (1 - ringY));
  const { data, info } = await sharp(source).resize({ height }).png().toBuffer({ resolveWithObject: true });
  const left = Math.floor((1200 - info.width) / 2);
  const top = Math.round(315 - info.height * ringY);
  const background = await sharp(data).extend({ left, right: 1200 - info.width - left,
    top, bottom: 630 - info.height - top, extendWith: 'mirror' }).png().toBuffer();
  const white = treatment === 'light';
  const heading = await titleArtwork('HEPTAPOD B', { size: 112, minSize: 112, width: 1024, tracking: 0.035, color: white ? '#f0f4f3' : '#0c181e' });
  const scrim = white
    ? '<rect width="1200" height="630" fill="#09131b" opacity="0.38"/>'
    : '<defs><radialGradient id="fog"><stop stop-color="#e7f0f2" stop-opacity="0.72"/><stop offset="1" stop-color="#e7f0f2" stop-opacity="0"/></radialGradient></defs><ellipse cx="600" cy="315" rx="540" ry="160" fill="url(#fog)"/>';
  return sharp(background).composite([
    { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">${scrim}</svg>`) },
    { input: heading.input, left: (1200 - heading.width) / 2, top: Math.round(315 - heading.height / 2) },
  ]).png().toBuffer();
}
