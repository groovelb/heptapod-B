import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = join(root, 'assets/heptapod-hero-v2');
const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
const output = join(root, manifest.output);
const digest = async (file) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
};

const existing = await stat(output).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
if (existing?.size === manifest.bytes && await digest(output) === manifest.sha256) {
  console.log('Hero v2: verified existing 4K video.');
} else {
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  const totalHash = createHash('sha256');
  let totalBytes = 0;
  async function* parts() {
    for (const part of manifest.parts) {
      const hash = createHash('sha256');
      let bytes = 0;
      for await (const chunk of createReadStream(join(directory, part.file))) {
        hash.update(chunk);
        totalHash.update(chunk);
        bytes += chunk.length;
        totalBytes += chunk.length;
        yield chunk;
      }
      if (bytes !== part.bytes || hash.digest('hex') !== part.sha256) {
        throw new Error(`Hero v2: corrupt storage part ${part.file}`);
      }
    }
  }
  try {
    await pipeline(parts(), createWriteStream(temporary, { flags: 'wx' }));
    if (totalBytes !== manifest.bytes || totalHash.digest('hex') !== manifest.sha256) {
      throw new Error('Hero v2: reconstructed video does not match the approved master');
    }
    await rename(temporary, output);
    console.log('Hero v2: restored identical 4K video from verified storage parts.');
  } finally {
    await rm(temporary, { force: true });
  }
}
