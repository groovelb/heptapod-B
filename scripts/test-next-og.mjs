import test from 'node:test';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { ARCHIVE_STORY_GLYPHS } from '../src/test-fixtures/archiveClient.js';
import { selectArchiveOg, generatePageMetadata, handleOgRequest } from '../src/lib/og/index.js';
import { renderSharePng, rasterizeShareGlyphs } from '../src/lib/og/png.js';
import { groupArchiveMeanings } from '../src/utils/heptapod/groupArchiveMeanings.js';
import { archiveDepthPath } from '../src/utils/heptapod/shareArchive.js';
import { composeOgCard, titleArtwork, renderLandingCard, OG_DESIGN_VERSION } from '../src/lib/og/card.js';
const rows = ARCHIVE_STORY_GLYPHS.filter((row) => row.is_public);

test('PNG uses exact stored particle geometry, deterministically, for individuals and groups', async () => {
  const models = rows.slice(0, 6).map((row) => row.model_data);
  const one = await renderSharePng([models[0]]);
  assert.deepEqual(one, await renderSharePng([structuredClone(models[0])]));
  assert.notDeepEqual(one, await renderSharePng([models[1]]));
  assert.deepEqual([...one.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  for (const count of [2, 3, 6]) {
    const pixels = rasterizeShareGlyphs(models.slice(0, count));
    assert.equal(pixels.length, 1200 * 630 * 4);
    const columns = count <= 2 ? count : 3;
    const height = 630 / Math.ceil(count / columns);
    for (let index = 0; index < count; index++) {
      let ink = 0;
      for (let y = Math.floor(index / columns) * height; y < (Math.floor(index / columns) + 1) * height; y++) {
        for (let x = index % columns * (1200 / columns); x < (index % columns + 1) * (1200 / columns); x++) {
          if (pixels[(y * 1200 + x) * 4] < 180) ink++;
        }
      }
      assert.ok(ink > 100, `glyph ${index} actually painted`);
    }
  }
});

test('group and focus use exact public membership and preserve stored models', () => {
  const meanings = groupArchiveMeanings(rows);
  for (const group of meanings.groups) {
    const path = archiveDepthPath({ groupId: group.id });
    const selected = selectArchiveOg(ARCHIVE_STORY_GLYPHS, path.split('?')[1]);
    assert.ok(selected.rows.length);
    assert.ok(selected.rows.length <= 3, 'Social cards keep at most three readable representatives');
    assert.ok(selected.rows.every((row) => group.memberIds.includes(row.id) && row.is_public));
    for (const row of selected.rows) assert.equal(row.model_data, rows.find((r) => r.id === row.id).model_data);
    const id = group.memberIds[0];
    assert.deepEqual(selectArchiveOg(rows, archiveDepthPath({ groupId: group.id }, id).split('?')[1]).rows.map((row) => row.id), [id]);
  }
  assert.throws(() => selectArchiveOg(rows, 'view=meaning&mv=999'));
  assert.throws(() => selectArchiveOg(rows, 'view=meaning&mv=1&glyph=bad'));
});

test('metadata and image recheck public visibility without caching', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://public.example';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key';
  let visible = true;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.cache, 'no-store');
    assert.equal(new URL(url).searchParams.get('is_public'), 'eq.true');
    return Response.json(visible ? [rows[0]] : [{ ...rows[0], is_public: false }], { headers: { 'content-range': '0-0/301' } });
  };
  try {
    const metadata = await generatePageMetadata({ kind: 'glyph', params: { id: rows[0].id }, origin: 'https://response.example' });
    assert.equal(metadata.alternates.canonical, `https://response.example/glyph/${rows[0].id}`);
    assert.ok(metadata.openGraph.images[0].url.includes('/api/og?'));
    const request = new Request(metadata.openGraph.images[0].url);
    const image = await handleOgRequest(request);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('Content-Type'), 'image/png');
    assert.ok(image.headers.get('Cache-Control').includes('no-store'));
    const head = await handleOgRequest(new Request(request.url, { method: 'HEAD' }));
    assert.equal(head.status, 200);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    const timeline = await generatePageMetadata({ kind: 'archive', searchParams: { view: 'meaning', mv: '1', order: 'oldest' }, origin: 'https://response.example' });
    assert.equal(timeline.description, '내 이름을 표식으로 바꾸고 유형을 확인해 보세요.');
    const canvas = await generatePageMetadata({ kind: 'canvas', searchParams: { name: 'private-input' }, origin: 'https://response.example' });
    assert.equal(canvas.alternates.canonical, 'https://response.example/canvas');
    assert.ok(!JSON.stringify(canvas).includes('private-input'));
    visible = false;
    assert.equal((await handleOgRequest(request)).status, 404);
    const hidden = await generatePageMetadata({ kind: 'glyph', params: { id: rows[0].id }, origin: 'https://response.example' });
    assert.equal(hidden.robots.index, false);
    assert.equal(hidden.alternates.canonical, `https://response.example/glyph/${rows[0].id}`);
    assert.equal(hidden.openGraph.images[0].width, 1200);
    assert.equal(hidden.openGraph.images[0].height, 630);
    assert.equal((await handleOgRequest(new Request('https://response.example/api/og?kind=glyph&id=invalid'))).status, 404);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  }
});

test('landing fallback is a real 1200×630 PNG and malformed group models are rejected', async () => {
  const dimensions = await sharp(await readFile(new URL('../public/og/landing.png', import.meta.url))).metadata();
  assert.equal(dimensions.width, 1200);
  assert.equal(dimensions.height, 630);
  assert.throws(() => selectArchiveOg([{ ...rows[0], model_data: { meta: {} } }]));
});

test('short and long names keep readable type, with no clipped accents or descenders', async () => {
  for (const name of ['김민준', 'Ågyp Élodie', 'Alexandria Catherine Montgomery-Wellington', '도래 · 동시성 · 개방성 · 흔적', '긴이름'.repeat(40)]) {
    const art = await titleArtwork(name, { halo: '#d6e8ed' });
    assert.ok(art.size >= 52, 'No unreadably small type');
    assert.ok(art.lines.length <= 2);
    const { data, info } = await sharp(art.input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let ink = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (!data[(y * info.width + x) * 4 + 3]) continue;
      ink++;
      assert.ok(x > 0 && x < info.width - 1 && y > 0 && y < info.height - 1, 'Every letter has clear bounds inside its image');
    }
    assert.ok(ink > 100);
  }
});

test('full glyph geometry fits its slot with clear margins, including ink and tendrils', () => {
  const cell = { x: 340, y: 24, width: 520, height: 480 };
  for (const row of rows) {
    const pixels = rasterizeShareGlyphs([row.model_data], { cells: [cell], inkContrast: 1.25, centerRings: true });
    let ink = 0;
    for (let y = 0; y < 630; y++) for (let x = 0; x < 1200; x++) {
      if (pixels[(y * 1200 + x) * 4] === 214) continue;
      ink++;
      assert.ok(x >= cell.x + 14 && x < cell.x + cell.width - 14 && y >= cell.y + 14 && y < cell.y + cell.height - 14);
    }
    assert.ok(ink > 1000, 'The glyph occupies meaningful image area');
  }
});

test('cards omit small captions; accepted landing asset matches its reproducible renderer', async () => {
  const models = [rows[0].model_data];
  const first = await composeOgCard(models, { cardTitle: '김민준', kind: 'glyph', description: 'hidden tiny caption' });
  assert.deepEqual(first, await composeOgCard(models, { cardTitle: '김민준', kind: 'glyph', description: 'another hidden caption' }));
  const accepted = await readFile(new URL(`../public/og/landing-v${OG_DESIGN_VERSION}.png`, import.meta.url));
  assert.deepEqual(accepted, await renderLandingCard());
  const metadata = await generatePageMetadata({ kind: 'landing', origin: 'https://response.example' });
  assert.ok(metadata.openGraph.images[0].url.endsWith(`/og/landing-v${OG_DESIGN_VERSION}.png`), 'New preview URL avoids reusing the old image cache key');
});

test('Korean and English OG preserve names, archive scope, language URLs and image localization', async () => {
  const savedFetch = globalThis.fetch;
  const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const savedKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://public.example';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key';
  globalThis.fetch = async (value) => {
    const ids = new URL(value).searchParams.get('id');
    return Response.json(ids ? rows.filter((row) => ids.includes(row.id)) : rows);
  };
  try {
    const origin = 'https://response.example';
    const { archiveShareUrl, parseArchiveDepthSearch } = await import('../src/utils/heptapod/shareArchive.js');
    const group = groupArchiveMeanings(rows).groups[0];
    const search = archiveDepthPath({ groupId: group.id }).split('?')[1];
    assert.deepEqual(selectArchiveOg(rows, search + '&lang=en').rows, selectArchiveOg(rows, search).rows);
    assert.equal(parseArchiveDepthSearch(search + '&lang=en').invalidLocation, false);
    assert.equal(new URL(archiveShareUrl(rows[0].id, null, { origin, locale: 'en', reading: 'meaning' })).searchParams.get('lang'), 'en');
    const groupImages = [];
    for (const lang of ['ko', 'en']) {
      const landing = await generatePageMetadata({ origin, searchParams: { lang, name: 'private-name' } });
      assert.equal(landing.title, lang === 'ko' ? '외계인 언어로 쓴 내 이름 유형' : 'Your Name in Alien Language');
      assert.equal(landing.openGraph.locale, lang === 'ko' ? 'ko_KR' : 'en_US');
      assert.equal(landing.twitter.title, landing.openGraph.title);
      assert.equal(landing.twitter.description, landing.openGraph.description);
      assert.equal(landing.alternates.canonical, `${origin}/?lang=${lang}`);
      assert.ok(!JSON.stringify(landing).includes('private-name'));
      for (const kind of ['glyph', 'field', 'compare']) {
        const metadata = await generatePageMetadata({ kind, origin, params: { id: rows[0].id, leftId: rows[0].id, rightId: rows[1].id }, searchParams: { lang } });
        assert.ok(!metadata.robots, 'Valid localized public page is indexable');
        if (kind !== 'compare') assert.ok(metadata.title.includes(rows[0].canonical_name), 'Names stay literal');
        assert.equal(new URL(metadata.alternates.canonical).searchParams.get('lang'), lang);
      }
      const groupMeta = await generatePageMetadata({ kind: 'archive', origin, searchParams: new URLSearchParams(search + '&lang=' + lang) });
      assert.ok(!groupMeta.robots);
      assert.equal(new URL(groupMeta.openGraph.url).searchParams.get('group'), group.id);
      if (lang === 'en') assert.ok(!/[가-힣]/.test(groupMeta.title), groupMeta.title);
      const image = await handleOgRequest(new Request(groupMeta.openGraph.images[0].url));
      assert.equal(image.status, 200);
      groupImages.push(Buffer.from(await image.arrayBuffer()));
      const fallback = await generatePageMetadata({ kind: 'glyph', origin, params: { id: 'bad' }, searchParams: { lang } });
      assert.equal(fallback.robots.index, false);
      assert.equal(fallback.openGraph.locale, lang === 'ko' ? 'ko_KR' : 'en_US');
    }
    assert.notDeepEqual(groupImages[0], groupImages[1], 'Translated group name is painted into the image');
    const invalid = await generatePageMetadata({ origin, searchParams: { lang: ['en', 'ko'] } });
    assert.equal(invalid.openGraph.locale, 'ko_KR');
  } finally {
    globalThis.fetch = savedFetch;
    if (savedUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
    if (savedKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedKey;
  }
});
