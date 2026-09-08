#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import sharp from 'sharp';
import { renderGlyphImage, rasterizeGlyphImage, validateGlyphImageModel, UnsupportedGlyphModelError } from '../src/lib/glyphImages/rasterize.js';
import { glyphModelHash, canonicalModelJson } from '../src/lib/glyphImages/contract.js';
import { AUTHORED_GLYPH_IMAGES, AUTHORED_GLYPH_IMAGES_BY_MODEL } from '../src/lib/glyphImages/authoredManifest.js';
import { buildArchiveModel } from '../src/utils/heptapod/archiveGlyph.js';
import { buildModel } from '../src/utils/heptapod/buildModel.js';
import { encode } from '../src/utils/heptapod/encode.js';
import { generateParticles, paintStatic } from '../src/utils/heptapod/logogramParticles.js';
import { ARCHIVE_FAMILY_SYMBOLS, ARCHIVE_TIMELINE_SYMBOL } from '../src/data/archiveFamilySymbols.js';

const output = resolve('output/mobile-static-glyphs');
await mkdir(output, { recursive: true });
const fixtures = [
  ['legacy-v1', buildModel(encode('Louise'))],
  ['korean-v2', buildArchiveModel('김민준')],
  ['question', buildArchiveModel('Louise?')],
  ['family-arrival', ARCHIVE_FAMILY_SYMBOLS.arrival.model],
  ['family-reception', ARCHIVE_FAMILY_SYMBOLS.reception.model],
  ['family-reciprocity', ARCHIVE_FAMILY_SYMBOLS.reciprocity.model],
  ['timeline', ARCHIVE_TIMELINE_SYMBOL.model_data],
  ['partial', { ...buildArchiveModel('partial'), clusters: [], inkLoads: [] }],
];
const measurements = [];

test('stored v1/v2, question, authored and partial models render deterministic transparent PNG without mutation', async () => {
  for (const [id, model] of fixtures) {
    const before = canonicalModelJson(model);
    for (const size of [256, 512]) {
      const started = performance.now();
      const image = await renderGlyphImage(model, { size });
      measurements.push({ id, size, bytes: image.bytes.length, milliseconds: Math.round(performance.now() - started) });
      assert.equal(image.width, size); assert.equal(image.height, size);
      assert.equal(image.mimeType, 'image/png');
      assert.match(image.checksum, /^[0-9a-f]{64}$/);
      assert.deepEqual(image.bytes, (await renderGlyphImage(model, { size })).bytes, id);
      const { data, info } = await sharp(image.bytes).raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.channels, 4); assert.equal(info.width, size);
      assert.equal(data[3], 0, 'transparent corner');
      assert.equal(data[(size * Math.floor(size / 2) + Math.floor(size / 2)) * 4 + 3], 0, 'transparent ring center');
      let alphaPixels = 0, translucent = 0;
      for (let offset = 0; offset < data.length; offset += 4) {
        if (!data[offset + 3]) continue;
        assert.deepEqual([...data.subarray(offset, offset + 3)], [28, 34, 38]);
        alphaPixels += 1;
        if (data[offset + 3] < 255) translucent += 1;
      }
      assert.ok(alphaPixels > size && alphaPixels < size * size / 3, 'ink preserves framing');
      assert.ok(translucent > size, 'fine alpha retained');
      await writeFile(resolve(output, `${id}-${size}.png`), image.bytes);
    }
    assert.equal(canonicalModelJson(model), before);
    const renamed = structuredClone(model);
    renamed.meta.name = '이름 변경 / renamed';
    assert.deepEqual((await renderGlyphImage(model)).bytes, (await renderGlyphImage(renamed)).bytes, 'metadata does not re-encode shape');
  }
  await writeFile(resolve(output, 'renderer-measurements.json'), `${JSON.stringify(measurements, null, 2)}\n`);
});

test('bounded validation rejects malformed and adversarial work before particle generation', async () => {
  const model = fixtures[0][1];
  const mutations = [null, {}, { ...model, harmonics: undefined },
    { ...model, clusters: Array(99).fill(model.clusters[0]) },
    { ...model, clusters: [{ ...model.clusters[0], spikeN: 1000000000 }] },
    { ...model, pressure: [{ k: 1, amp: Infinity, phase: 0 }] },
    { ...model, strands: Array(200).fill(model.strands[0]) },
    { ...model, questionHook: { ang: 0, len: 1e10, curl: 1 } },
    { ...model, dropZones: [{ ang: 0, width: 0 }] },
    { ...model, meta: { hash: -1 } },
    { ...model, strands: [], clusters: [] },
  ];
  const cyclic = structuredClone(model); cyclic.circular = cyclic; mutations.push(cyclic);
  for (const invalid of mutations) await assert.rejects(renderGlyphImage(invalid), UnsupportedGlyphModelError);
  await assert.rejects(renderGlyphImage(model, { size: 8192 }), RangeError);
  await assert.rejects(renderGlyphImage(model, { ink: 'url(secret)' }), TypeError);
  assert.equal(validateGlyphImageModel(ARCHIVE_TIMELINE_SYMBOL.model_data), ARCHIVE_TIMELINE_SYMBOL.model_data);
});

test('720-space Canvas draw contract matches raster coverage and fragment-mask coordinates', async () => {
  // Capture the existing production paintStatic draw calls, without any DOM/Canvas/browser.
  // A separate SVG radial-gradient raster is a geometry reference, not a browser screenshot.
  const model = ARCHIVE_FAMILY_SYMBOLS.arrival.model;
  const { particles } = generateParticles(model, true);
  const draws = [];
  const ctx = { globalAlpha: 1, drawImage(sprite, x, y, width, height) {
    draws.push({ sprite, x, y, width, height, alpha: this.globalAlpha });
  } };
  paintStatic(ctx, particles, { hard: 'hard', soft: 'soft' });
  assert.equal(draws.length, particles.filter((p) => p.kind !== 'wisp').length);
  const definitions = '<radialGradient id="hard"><stop offset="0" stop-color="#1c2226"/>'
    + '<stop offset="62%" stop-color="#1c2226" stop-opacity=".95"/><stop offset="82%" stop-color="#1c2226" stop-opacity=".35"/>'
    + '<stop offset="100%" stop-color="#1c2226" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="soft"><stop offset="0" stop-color="#1c2226" stop-opacity=".9"/>'
    + '<stop offset="50%" stop-color="#1c2226" stop-opacity=".45"/><stop offset="100%" stop-color="#1c2226" stop-opacity="0"/></radialGradient>';
  const circles = draws.map((d) => `<circle cx="${d.x + d.width / 2}" cy="${d.y + d.height / 2}" r="${d.width / 2}" opacity="${d.alpha}" fill="url(#${d.sprite})"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 720 720"><defs>${definitions}</defs>${circles}</svg>`;
  const reference = await sharp(Buffer.from(svg)).resize(512, 512).png().toBuffer();
  const actual = await renderGlyphImage(model);
  const referencePixels = await sharp(reference).raw().toBuffer();
  const { pixels } = rasterizeGlyphImage(model);
  let intersection = 0, union = 0, alphaError = 0;
  for (let i = 3; i < pixels.length; i += 4) {
    const a = pixels[i] > 20, b = referencePixels[i] > 20;
    if (a && b) intersection += 1;
    if (a || b) union += 1;
    alphaError += Math.abs(pixels[i] - referencePixels[i]);
  }
  const comparison = await sharp({ create: { width: 1024, height: 512, channels: 4, background: '#d6e8ed' } })
    .composite([{ input: reference, left: 0, top: 0 }, { input: actual.bytes, left: 512, top: 0 }]).png().toBuffer();
  await writeFile(resolve(output, 'canvas-contract-reference-left-static-right.png'), comparison);
  console.log(`Geometry reference: coverage IoU ${(intersection / union).toFixed(4)}, mean alpha error ${(alphaError / (512 * 512)).toFixed(4)}/255`);
  // Different raster engines antialias subpixel hairlines differently. Require
  // strong raw coverage plus 99% agreement within one output pixel, not bit identity.
  let covered = 0, matched = 0;
  for (let y = 1; y < 511; y += 1) for (let x = 1; x < 511; x += 1) {
    for (const [source, target] of [[pixels, referencePixels], [referencePixels, pixels]]) {
      if (source[(y * 512 + x) * 4 + 3] <= 20) continue;
      covered += 1;
      let nearby = false;
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        if (target[((y + dy) * 512 + x + dx) * 4 + 3] > 20) nearby = true;
      }
      if (nearby) matched += 1;
    }
  }
  assert.ok(intersection / union > 0.85, `coverage IoU ${intersection / union}`);
  assert.ok(matched / covered > 0.99, `one-pixel geometry agreement ${matched / covered}`);
  assert.ok(alphaError / (512 * 512) < 0.75, 'alpha average error under 0.75/255');
});

test('all 28 authored symbols have both resolvable, fresh content-addressed assets', async () => {
  const manifest = JSON.parse(await readFile('public/glyph-symbols/v1/manifest.json', 'utf8'));
  assert.equal(Object.keys(manifest.symbols).length, 28);
  assert.equal(Object.keys(AUTHORED_GLYPH_IMAGES).length, 28);
  for (const [modelJson, descriptors] of Object.entries(AUTHORED_GLYPH_IMAGES_BY_MODEL)) {
    const hash = await glyphModelHash(JSON.parse(modelJson));
    assert.equal(descriptors, AUTHORED_GLYPH_IMAGES[hash]);
    for (const size of [256, 512]) {
      const expected = await renderGlyphImage(JSON.parse(modelJson), { size });
      const bytes = new Uint8Array(await readFile(`public${descriptors[size].src}`));
      assert.deepEqual(bytes, expected.bytes);
      assert.equal(descriptors[size].checksum, expected.checksum);
    }
  }
});

test('real Worker thread returns transferable PNG and recoverable errors with no Canvas', async () => {
  const workerUrl = new URL('../src/workers/staticGlyphImage.worker.js', import.meta.url).href;
  const bootstrap = `import { parentPort } from 'node:worker_threads';
globalThis.self = { addEventListener(type, handler) { parentPort.on('message', data => handler({data})); },
postMessage(data, transfer) { parentPort.postMessage(data, transfer); } };
await import(${JSON.stringify(workerUrl)}); parentPort.postMessage({ready:true});`;
  const worker = new Worker(new URL(`data:text/javascript,${encodeURIComponent(bootstrap)}`), { type: 'module' });
  const response = () => new Promise((resolveResponse, reject) => { worker.once('message', resolveResponse); worker.once('error', reject); });
  try {
    assert.deepEqual(await response(), { ready: true });
    let pending = response(); worker.postMessage({ id: 'valid', model: fixtures[0][1], size: 256 });
    const result = await pending;
    assert.equal(result.id, 'valid'); assert.ok(result.bytes instanceof Uint8Array); assert.equal(result.width, 256);
    assert.deepEqual(result.bytes, (await renderGlyphImage(fixtures[0][1], { size: 256 })).bytes);
    pending = response(); worker.postMessage({ id: 'bad', model: {} });
    assert.deepEqual(await pending, { id: 'bad', error: 'Unsupported glyph model' });
  } finally { await worker.terminate(); }
});


test('locally supplied archived DB models all validate and produce both sizes', async (context) => {
  let rows;
  try { rows = JSON.parse(await readFile(resolve(output, 'db-models.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') { context.skip('Local archived model fixture unavailable'); return; } throw error; }
  const results = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    for (const size of [256, 512]) {
      const started = performance.now();
      const rendered = await renderGlyphImage(row.model_data, { size });
      results.push({ index, encoderVersion: row.encoder_version, size, bytes: rendered.bytes.length,
        milliseconds: Math.round(performance.now() - started) });
    }
  }
  assert.equal(results.length, rows.length * 2);
  await writeFile(resolve(output, 'db-render-validation.json'), `${JSON.stringify(results, null, 2)}\n`);
  console.log(`Archived models: ${rows.length} models / ${results.length} PNGs; versions ${[...new Set(rows.map(r => r.encoder_version))].join(', ')}`);
});
