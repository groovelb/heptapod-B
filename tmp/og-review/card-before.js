import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

let fontPromise;
function cardFont() {
  fontPromise ||= readFile(path.join(process.cwd(), 'public/og/NotoSerifKR-Regular.otf')).then((buffer) => (
    opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
  ));
  return fontPromise;
}

async function textLayer(text, size, top) {
  const font = await cardFont();
  let literal = [...String(text || '')].slice(0, 100).join('');
  // Literal public names become paths, never SVG markup or host-dependent fonts.
  while (font.getAdvanceWidth(literal, size) > 1104 && literal.length > 1) size -= 1;
  const outline = font.getPath(literal, 0, size, size).toPathData(2);
  const width = Math.ceil(font.getAdvanceWidth(literal, size)) + 4;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.ceil(size * 1.6)}"><path d="${outline}" fill="#1c2226"/></svg>`;
  return { input: Buffer.from(svg), left: Math.floor((1200 - width) / 2), top };
}

/** Bundled OFL font outlines make Linux production and local rendering identical. */
export async function composeOgCard(png, { title, description, landing = false } = {}) {
  const glyph = await sharp(png).resize(1200, 484, { fit: 'contain', background: '#d6e8ed' }).png().toBuffer();
  return sharp({ create: { width: 1200, height: 630, channels: 4, background: '#d6e8ed' } })
    .composite([{ input: glyph, left: 0, top: 80 },
      await textLayer(title, landing ? 32 : 28, 16),
      await textLayer(description || 'HEPTAPOD B · THE RESPONSE ARCHIVE', 16, 580)])
    .png().toBuffer();
}

export async function renderLandingCard() {
  const source = path.join(process.cwd(), 'public/heptapod-b-encoder/hero-pilot/hero-logogram-response-plate-fb1-v1.png');
  return composeOgCard(source, { title: 'HEPTAPOD B · THE RESPONSE ARCHIVE', description: '당신의 이름과도 연결될까요?', landing: true });
}
