#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';
import { inflateSync } from 'node:zlib';
import { buildArchiveModel } from '../src/utils/heptapod/archiveGlyph.js';
import { relateGlyphs, RELATION_ALGORITHM_VERSION } from '../src/utils/heptapod/relateGlyphs.js';
import { generateParticles, SIZE0 } from '../src/utils/heptapod/logogramParticles.js';
import { createArchiveShareHandler, trustedShareUrl, trustedRichShareUrl } from '../supabase/functions/archive-share/handler.js';
import { createPublicGlyphReader } from '../supabase/functions/archive-share/reader.js';
import { renderSharePng, validateShareModel, SHARE_WIDTH, SHARE_HEIGHT } from '../supabase/functions/archive-share/png.js';

const LEFT = '11111111-1111-4111-8111-111111111111';
const RIGHT = '22222222-2222-4222-8222-222222222222';
const SITE = 'https://archive.example/';
const SHARE = 'https://share.archive.example/functions/v1/archive-share';
const record = (id, name) => ({
  id, canonical_name: name, is_interrogative: false,
  encoder_version: 2, is_public: true, model_data: buildArchiveModel(name),
});
const publicRecords = [record(LEFT, '민준'), record(RIGHT, '민수')];
const request = (query = `left=${LEFT}&right=${RIGHT}`, options) => new Request(`${SHARE}?${query}`, options);
function handler(records = publicRecords) {
  return createArchiveShareHandler({
    siteUrl: SITE, shareUrl: SHARE,
    readPublicGlyphs: async (ids) => records.filter((row) => ids.includes(row.id)),
  });
}
const attribute = (html, property) => html.match(new RegExp(`<meta property="${property}" content="([^"]*)">`))?.[1].replaceAll('&amp;', '&');

test('HTML explains actual stored shape even when public name labels differ', async () => {
  // A legacy record can preserve the same geometry under another display label.
  const records = publicRecords.map((row) => ({ ...row, model_data: publicRecords[0].model_data }));
  const actual = relateGlyphs(records[0], records[1]);
  const form = actual.find((relation) => relation.relationType === 'FORM');
  assert.equal(form.algorithmVersion, RELATION_ALGORITHM_VERSION);
  assert.equal(form.evidence.basis, 'rendered-form');
  assert.ok(form.evidence.observations.length > 0);
  const response = await handler(records)(request());
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const html = await response.text();
  assert.ok(html.includes('민준 · 민수'));
  assert.ok(form.evidence.observations.some((observation) => html.includes(observation.reason)));
  assert.ok(!html.includes('글자를 공유') && !html.includes('ECHO'));
  assert.ok(html.includes(`href="${SITE}compare/${LEFT}/${RIGHT}"`));
  for (const property of ['og:title', 'og:type', 'og:url', 'og:image']) assert.ok(attribute(html, property));
  assert.equal(attribute(html, 'og:type'), 'website');
  assert.ok(!html.includes('http-equiv="refresh"'));
});

test('changing labels alone never changes the geometry explanation in sharing', async () => {
  const originals = publicRecords.map((row) => ({ ...row, model_data: publicRecords[0].model_data }));
  const renamed = originals.map((row, index) => ({ ...row, canonical_name: index ? 'ZZZ' : 'AAA' }));
  const originalHtml = await (await handler(originals)(request())).text();
  const renamedHtml = await (await handler(renamed)(request())).text();
  assert.equal(attribute(originalHtml, 'og:description'), attribute(renamedHtml, 'og:description'));
  assert.notEqual(attribute(originalHtml, 'og:title'), attribute(renamedHtml, 'og:title'));
});

test('real generated motif explains a shared branch while a spelling overlap alone explains no resonance', async () => {
  const motifPair = [record(LEFT, 'Louise'), record(RIGHT, 'Hannah')];
  const actual = relateGlyphs(...motifPair);
  assert.equal(actual[0].evidence.level, 'shared-motif');
  const motifHtml = await (await handler(motifPair)(request())).text();
  assert.ok(actual[0].evidence.observations.some((observation) => observation.kind === 'branch' && motifHtml.includes(observation.reason)));
  const spellingPair = [record(LEFT, '민준'), record(RIGHT, '민수')];
  assert.deepEqual(relateGlyphs(...spellingPair), []);
  const spellingHtml = await (await handler(spellingPair)(request())).text();
  assert.match(attribute(spellingHtml, 'og:description'), /형태 공명은 발견되지 않았습니다/);
  assert.ok(!spellingHtml.includes('글자를 공유'));
});

test('every shared URL contains only public IDs and the fixed PNG format flag', async () => {
  const response = await handler()(request());
  const html = await response.text();
  for (const property of ['og:url', 'og:image']) {
    const url = new URL(attribute(html, property));
    assert.equal(url.origin, new URL(SHARE).origin);
    assert.equal(url.searchParams.get('left'), LEFT);
    assert.equal(url.searchParams.get('right'), RIGHT);
    assert.deepEqual([...url.searchParams.keys()].sort(), property === 'og:image' ? ['format', 'left', 'right'] : ['left', 'right']);
    assert.ok(!url.href.includes(encodeURIComponent('민')));
  }
  const single = await (await handler()(request(`left=${LEFT}`))).text();
  assert.ok(single.includes(`href="${SITE}glyph/${LEFT}"`));
  assert.ok(!attribute(single, 'og:image').includes('right='));
});

test('the same UUID is described as an identical glyph rather than an absent relation', async () => {
  const response = await handler()(request(`left=${LEFT}&right=${LEFT}`));
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('같은 기록에 보존된 동일한 표식입니다.'));
  assert.ok(!html.includes('연결은 발견되지 않았습니다'));
  assert.ok(html.includes(`href="${SITE}glyph/${LEFT}"`));
  assert.equal(attribute(html, 'og:description'), '같은 기록에 보존된 동일한 표식입니다.');
});

test('rich-share configuration requires an explicit HTML-capable domain or local endpoint', () => {
  for (const shareUrl of [undefined, '', 'https://project.supabase.co/functions/v1/archive-share',
    'https://project.supabase.co./functions/v1/archive-share']) {
    assert.throws(() => createArchiveShareHandler({ siteUrl: SITE, shareUrl, readPublicGlyphs: async () => [] }));
  }
  for (const shareUrl of [SHARE, 'https://api.archive.example/functions/v1/archive-share',
    'http://localhost:54321/functions/v1/archive-share']) assert.ok(trustedRichShareUrl(shareUrl));
  // The separate public database reader may still use its standard Supabase URL.
  assert.ok(trustedShareUrl('https://project.supabase.co'));
});

test('stored text is escaped in body, title, description, and image attributes', async () => {
  const malicious = `<script>alert("x")</script> & 'A'`;
  const records = [{ ...record(LEFT, 'Louise'), canonical_name: malicious }];
  const html = await (await handler(records)(request(`left=${LEFT}`))).text();
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&quot;x&quot;'));
  assert.ok(html.includes('&amp; &#39;A&#39;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('alert("x")'));
});

test('invalid IDs, duplicate fields, unsupported formats, and raw-name input never read data', async () => {
  let reads = 0;
  const handle = createArchiveShareHandler({ siteUrl: SITE, shareUrl: SHARE, readPublicGlyphs: async () => { reads += 1; return publicRecords; } });
  for (const query of ['', 'left=Louise', `left=${LEFT}&right=unknown`, `left=${LEFT}&right=`,
    `left=${LEFT}&left=${RIGHT}`, `left=${LEFT}&format=svg`, `left=${LEFT}&name=private-name`,
    `left=${LEFT}&redirect=https://evil.example`]) {
    const response = await handle(request(query));
    assert.equal(response.status, 400, query);
    assert.ok(!(await response.text()).includes('private-name'));
  }
  assert.equal((await handle(request(`left=${LEFT}`, { method: 'POST' }))).status, 405);
  assert.equal(reads, 0);
});

test('either unavailable endpoint hides both names and all OG metadata on HTML, PNG and HEAD', async () => {
  for (const unavailableId of [LEFT, RIGHT]) {
    for (const mode of ['hidden', 'missing']) {
      const records = publicRecords.map((row) => row.id === unavailableId ? { ...row, is_public: false } : row)
        .filter((row) => mode !== 'missing' || row.id !== unavailableId);
      for (const format of ['html', 'png']) {
        for (const method of ['GET', 'HEAD']) {
          const response = await handler(records)(request(`left=${LEFT}&right=${RIGHT}&format=${format}`, { method }));
          assert.equal(response.status, 404);
          const body = await response.text();
          assert.ok(!body.includes('민준') && !body.includes('민수'));
          assert.ok(!body.includes('og:') && !body.includes('<img'));
          assert.notEqual(response.headers.get('content-type'), 'image/png');
          assert.match(response.headers.get('cache-control'), /no-store/);
        }
      }
    }
  }
});

test('withdrawal is rechecked when an image is fetched after the HTML preview', async () => {
  const records = publicRecords.map((row) => ({ ...row }));
  const handle = handler(records);
  assert.equal((await handle(request())).status, 200);
  records[1].is_public = false;
  const image = await handle(request(`left=${LEFT}&right=${RIGHT}&format=png`));
  assert.equal(image.status, 404);
  assert.ok(!(await image.text()).includes('민수'));
});

test('trusted config supplies all destinations, unaffected by request Host or user agent', async () => {
  const handle = handler();
  const ordinary = await (await handle(request())).text();
  const forged = await (await handle(new Request(`https://evil.example/share?left=${LEFT}&right=${RIGHT}`, {
    headers: { 'User-Agent': 'SocialPreviewBot', Host: 'evil.example', 'X-Forwarded-Host': 'evil.example' },
  }))).text();
  assert.equal(forged, ordinary);
  for (const value of ['http://archive.example', 'javascript:alert(1)', 'file:///tmp/share',
    'https://user:password@archive.example', 'https://archive.example/?next=evil', 'https://archive.example/#fragment',
    'http://localhost.evil.example']) assert.throws(() => trustedShareUrl(value));
  for (const value of ['https://archive.example', 'http://localhost:54321', 'http://127.0.0.1:5173', 'http://[::1]:5173']) {
    assert.ok(trustedShareUrl(value));
  }
});

function crc(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return (value ^ 0xffffffff) >>> 0;
}

function decodePng(png) {
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const data = [];
  let offset = 8;
  const types = [];
  while (offset < png.length) {
    const length = view.getUint32(offset);
    const type = new TextDecoder().decode(png.subarray(offset + 4, offset + 8));
    types.push(type);
    assert.equal(view.getUint32(offset + 8 + length), crc(png.subarray(offset + 4, offset + 8 + length)));
    if (type === 'IHDR') {
      assert.equal(view.getUint32(offset + 8), SHARE_WIDTH);
      assert.equal(view.getUint32(offset + 12), SHARE_HEIGHT);
      assert.equal(png[offset + 16], 8);
      assert.equal(png[offset + 17], 6);
    }
    if (type === 'IDAT') data.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  assert.deepEqual(types, ['IHDR', 'IDAT', 'IEND']);
  const raw = inflateSync(Buffer.concat(data));
  const stride = SHARE_WIDTH * 4 + 1;
  assert.equal(raw.length, stride * SHARE_HEIGHT);
  for (let y = 0; y < SHARE_HEIGHT; y += 1) assert.equal(raw[y * stride], 0);
  return (x, y) => [...raw.subarray(y * stride + x * 4 + 1, y * stride + x * 4 + 5)];
}

test('PNG has correct signature, dimensions, CRCs, RGBA data and measured glyph positions', async () => {
  const model = buildArchiveModel('Louise');
  const first = await renderSharePng([model]);
  const same = await renderSharePng([model]);
  const other = await renderSharePng([buildArchiveModel('김민준')]);
  assert.deepEqual(first, same);
  assert.notDeepEqual(first, other);
  const pixel = decodePng(first);
  assert.deepEqual(pixel(0, 0), [214, 232, 237, 255]);
  const scale = 580 / SIZE0;
  const { particles } = generateParticles(model, true);
  const cores = particles.filter((p) => p.kind === 'core' && p.r > 2 && p.a > 0.5).slice(0, 20);
  assert.ok(cores.length >= 10);
  for (const p of cores) {
    const x = Math.floor(600 - 580 / 2 + p.x * scale);
    const y = Math.floor(SHARE_HEIGHT / 2 - 580 / 2 + p.y * scale);
    const actual = pixel(x, y);
    assert.ok(actual[0] < 200, `measured particle at ${x},${y} contains ink`);
    assert.equal(actual[3], 255);
  }
});

test('PNG endpoint returns genuine two-model image data without names in the URL or bytes', async () => {
  const response = await handler()(request(`left=${LEFT}&right=${RIGHT}&format=png`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  const png = new Uint8Array(await response.arrayBuffer());
  decodePng(png);
  assert.deepEqual(png, await renderSharePng(publicRecords.map((r) => r.model_data)));
  const head = await handler()(request(`left=${LEFT}&format=png`, { method: 'HEAD' }));
  assert.equal(head.status, 200);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
});

test('malformed stored models fail before geometry loops, with no partial preview leak', async () => {
  const original = buildArchiveModel('Louise');
  for (const mutate of [
    (m) => { m.clusters[0].I = 1e9; },
    (m) => { m.clusters[0].spikeN = 1e9; },
    (m) => { m.strands = Array(1000).fill(m.strands[0]); },
    (m) => { m.harmonics[0].amp = NaN; },
    (m) => { m.questionHook = { ang: 1, curl: 1, len: 1e9 }; },
  ]) {
    const model = structuredClone(original);
    mutate(model);
    assert.throws(() => validateShareModel(model));
    const response = await handler([{ ...record(LEFT, 'Louise'), model_data: model }])(request(`left=${LEFT}`));
    assert.equal(response.status, 404);
    assert.ok(!(await response.text()).includes('Louise'));
  }
});

test('public reader filters both IDs and is_public, limits bytes, and propagates failures safely', async () => {
  let fetched = 0;
  const reader = createPublicGlyphReader({
    supabaseUrl: 'https://project.supabase.co', anonKey: 'test-public-key',
    fetcher: async (url, options) => {
      fetched += 1;
      assert.equal(url.pathname, '/rest/v1/glyphs');
      assert.equal(url.searchParams.get('is_public'), 'eq.true');
      assert.equal(url.searchParams.get('id'), `in.(${LEFT},${RIGHT})`);
      assert.equal(url.searchParams.get('limit'), '2');
      assert.ok(options.signal instanceof AbortSignal);
      return Response.json(publicRecords);
    },
  });
  assert.deepEqual(await reader([LEFT, RIGHT]), publicRecords);
  assert.equal(fetched, 1);
  await assert.rejects(reader(['not-an-id']));
  assert.equal(fetched, 1);
  const oversized = createPublicGlyphReader({ supabaseUrl: 'https://project.supabase.co', anonKey: 'test-public-key',
    fetcher: async () => new Response('x'.repeat(262145)) });
  await assert.rejects(oversized([LEFT]));
  const handle = createArchiveShareHandler({ siteUrl: SITE, shareUrl: SHARE, readPublicGlyphs: async () => { throw new Error('private database internals'); } });
  const failure = await handle(request());
  assert.equal(failure.status, 503);
  const body = await failure.text();
  assert.ok(!body.includes('private database internals') && !body.includes('og:'));
});
