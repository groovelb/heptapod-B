// Deterministic raster fallbacks from the small-size, simplified logogram vector.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url));
const raster = (size) => sharp(svg).resize(size, size).png().toBuffer();
await writeFile(new URL('../public/favicon-32.png', import.meta.url), await raster(32));
await writeFile(new URL('../public/apple-touch-icon.png', import.meta.url), await raster(180));
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(raster));
const header = Buffer.alloc(6 + images.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index]; header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(new URL('../public/favicon.ico', import.meta.url), Buffer.concat([header, ...images]));
console.log('Generated 16/32/48px ICO, 32px PNG, and 180px Apple touch icon.');
