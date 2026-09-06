import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArchiveModel } from '../src/utils/heptapod/archiveGlyph.js';
import { groupArchiveMeanings } from '../src/utils/heptapod/groupArchiveMeanings.js';
import { MEANING_VERSION, MORPHOLOGY_VERSION } from '../src/data/heptapodMeaningCatalog.js';
import { localArchiveMeaningProvider, createApiMeaningProvider, readArchiveMeanings } from '../src/lib/archiveMeanings.js';
import { archiveMeaningPath, parseArchiveMeaningSearch, archiveShareUrl, shareArchive, exportPairCard } from '../src/utils/heptapod/shareArchive.js';

const uuid = (index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const row = (index, name = 'Louise', extra = {}) => ({ id: uuid(index), canonical_name: name,
  is_public: true, model_data: buildArchiveModel(name), ...extra });
const rows = [row(1), row(2, 'Hannah'), row(3, '민준'), row(4, 'Louise?', { is_interrogative: true })];
const origin = 'https://archive.example';
const endpoint = 'https://share.archive.example/functions/v1/archive-share';
const emptyFilter = { base: null, modifiers: [], groupId: null, status: 'all' };

test('default meaning provider only computes supplied public rows, without network access', async () => {
  const fetcher = globalThis.fetch;
  let network = 0;
  globalThis.fetch = async () => { network += 1; throw new Error('unexpected network'); };
  try {
    const supplied = [...rows, row(5, 'Private', { is_public: false }), row(6, 'Local', { id: 'local-preview' }), rows[0]];
    const result = await readArchiveMeanings(supplied);
    assert.equal(result.computationMode, 'local');
    assert.equal(result.sampleSize, rows.length);
    assert.deepEqual(Object.keys(result.interpretations).sort(), rows.map((item) => item.id).sort());
    assert.deepEqual(await localArchiveMeaningProvider.getMeanings(supplied), groupArchiveMeanings(supplied));
    assert.equal(network, 0);
  } finally { globalThis.fetch = fetcher; }
});

test('explicit API sends only selected public UUIDs, versions and actual sample bounds', async () => {
  const supplied = Array.from({ length: 201 }, (_, index) => ({ ...rows[0], id: uuid(index + 1) }));
  supplied.splice(1, 0, { ...rows[0], is_public: false, id: uuid(900) }, { ...rows[0], id: 'private-local-id' }, supplied[0]);
  const expected = groupArchiveMeanings(supplied);
  let request;
  const controller = new AbortController();
  const provider = createApiMeaningProvider({ invoke: async (payload, signal) => { request = { payload, signal }; return structuredClone(expected); } });
  const result = await readArchiveMeanings(supplied, { provider, signal: controller.signal });
  assert.equal(result.computationMode, 'api');
  assert.equal(request.signal, controller.signal);
  assert.deepEqual(Object.keys(request.payload).sort(), ['glyphIds', 'meaningVersion', 'morphologyVersion', 'sampleAtLimit', 'sampleTruncated'].sort());
  assert.equal(request.payload.glyphIds.length, 200);
  assert.ok(!request.payload.glyphIds.includes(uuid(900)) && !request.payload.glyphIds.includes(uuid(201)));
  assert.equal(request.payload.sampleTruncated, true);
  assert.equal(request.payload.sampleAtLimit, true);
  assert.equal(request.payload.meaningVersion, MEANING_VERSION);
  assert.equal(request.payload.morphologyVersion, MORPHOLOGY_VERSION);
  assert.ok(!JSON.stringify(request.payload).includes('Louise'));
});

test('public first-occurrence selection precedes the 200 cap and ID sort', async () => {
  const supplied = [rows[2], { ...rows[0], model_data: {} }, rows[0], rows[1]];
  const result = await readArchiveMeanings(supplied);
  assert.equal(result.sampleSize, 3);
  assert.deepEqual(result.invalidIds, [rows[0].id]);
  assert.deepEqual(Object.keys(result.interpretations), [rows[0].id, rows[1].id, rows[2].id]);
});

test('empty and invalid-only samples are valid data states', async () => {
  const empty = await readArchiveMeanings([]);
  assert.equal(empty.sampleSize, 0);
  assert.equal(empty.groups.length, 0);
  assert.equal(empty.families.length, 6);
  const invalid = await readArchiveMeanings([{ ...rows[0], model_data: {} }]);
  assert.equal(invalid.analyzedCount, 0);
  assert.deepEqual(invalid.invalidIds, [rows[0].id]);
  assert.equal(invalid.groups.length, 0);
});

test('partial readings retain known families but never enter a complete meaning group', async () => {
  const partial = { ...rows[0], model_data: { ...rows[0].model_data, clusters: [] } };
  const expected = groupArchiveMeanings([partial]);
  const provider = createApiMeaningProvider({ invoke: async () => structuredClone(expected) });
  const result = await readArchiveMeanings([partial], { provider });
  assert.deepEqual(result.partialIds, [partial.id]);
  assert.equal(result.analyzedCount, 1);
  assert.equal(result.groups.length, 0);
  assert.equal(result.interpretations[partial.id].meaningKey, null);
  assert.ok(result.families.some((family) => family.memberIds.includes(partial.id)));
  const invented = structuredClone(expected);
  invented.groups = groupArchiveMeanings([rows[0]]).groups;
  await assert.rejects(readArchiveMeanings([partial], { provider: { getMeanings: async () => invented } }), /현재 공개 표본/);
});

test('API errors never silently return a local calculation', async () => {
  let calls = 0;
  const provider = createApiMeaningProvider({ invoke: async () => { calls += 1; throw new Error('meaning service offline'); } });
  await assert.rejects(readArchiveMeanings(rows, { provider }), /meaning service offline/);
  assert.equal(calls, 1);
});

test('incompatible or missing interpretation versions are rejected', async () => {
  const expected = groupArchiveMeanings(rows);
  for (const mutate of [
    (dto) => { dto.meaningVersion = MEANING_VERSION + 1; },
    (dto) => { dto.morphologyVersion = MORPHOLOGY_VERSION + 1; },
    (dto) => { delete dto.meaningVersion; },
  ]) {
    const dto = structuredClone(expected);
    mutate(dto);
    await assert.rejects(readArchiveMeanings(rows, { provider: { getMeanings: async () => dto } }), /버전/);
  }
});

test('external IDs, fabricated membership, duplicate groups and unsafe observations are rejected', async () => {
  const expected = groupArchiveMeanings(rows);
  assert.ok(expected.groups.length > 0);
  assert.ok(expected.interpretations[rows[0].id].observations.length > 0);
  const attacks = [
    (dto) => { dto.sampleSize += 1; },
    (dto) => { dto.analyzedCount = -1; },
    (dto) => { dto.sampleLimit = 500; },
    (dto) => { dto.sampleTruncated = !dto.sampleTruncated; },
    (dto) => { dto.sampleAtLimit = !dto.sampleAtLimit; },
    (dto) => { dto.interpretations[uuid(999)] = dto.interpretations[rows[0].id]; },
    (dto) => { delete dto.interpretations[rows[0].id]; },
    (dto) => { dto.groups[0].memberIds.push(uuid(999)); },
    (dto) => { dto.groups[0].memberIds.push(dto.groups[0].memberIds[0]); },
    (dto) => { dto.groups.push(structuredClone(dto.groups[0])); },
    (dto) => { dto.groups[0].meaningIds = ['unverified-personality']; },
    (dto) => { dto.families[0].memberIds = [uuid(999)]; },
    (dto) => { dto.families.pop(); },
    (dto) => { dto.morphologyGroups[0].memberIds = []; },
    (dto) => { dto.partialIds.push(rows[0].id); },
    (dto) => { dto.invalidIds.push(rows[0].id); },
    (dto) => { dto.interpretations[rows[0].id].modifiers.trace = 'unknown'; },
    (dto) => { dto.interpretations[rows[0].id].observations[0].anchors[0].ang = NaN; },
    (dto) => { dto.interpretations[rows[0].id].observations[0].anchors[0].half = Infinity; },
    (dto) => { dto.interpretations[rows[0].id].observations[0].anchors[0].clusterIndex = 1000; },
    (dto) => { dto.interpretations[rows[0].id].reading = 'A fabricated personality claim'; },
  ];
  for (const mutate of attacks) {
    const dto = structuredClone(expected);
    mutate(dto);
    await assert.rejects(readArchiveMeanings(rows, { provider: { getMeanings: async () => dto } }), /현재 공개 표본/);
  }
});

test('responses for another same-sized public sample cannot replace the current one', async () => {
  const other = rows.map((item, index) => ({ ...item, id: uuid(index + 20) }));
  await assert.rejects(readArchiveMeanings(rows, { provider: { getMeanings: async () => groupArchiveMeanings(other) } }), /현재 공개 표본/);
});

test('an injected transport cannot mutate the result after validation has completed', async () => {
  const remote = groupArchiveMeanings(rows);
  const provider = createApiMeaningProvider({ invoke: async () => remote });
  const result = await readArchiveMeanings(rows, { provider });
  remote.families[0].memberIds.push(uuid(999));
  assert.ok(!result.families[0].memberIds.includes(uuid(999)));
});

test('cancellation before work or after an API response prevents any late result', async () => {
  let calls = 0;
  const before = new AbortController();
  before.abort();
  const provider = createApiMeaningProvider({ invoke: async () => { calls += 1; return groupArchiveMeanings(rows); } });
  await assert.rejects(readArchiveMeanings(rows, { provider, signal: before.signal }), { name: 'AbortError' });
  assert.equal(calls, 0);
  const during = new AbortController();
  const aborting = createApiMeaningProvider({ invoke: async () => { during.abort(); return groupArchiveMeanings(rows); } });
  await assert.rejects(readArchiveMeanings(rows, { provider: aborting, signal: during.signal }), { name: 'AbortError' });
});

test('selection yields while skipping many private rows and aborts before API transmission', async () => {
  const controller = new AbortController();
  let calls = 0;
  const supplied = [...Array(10000).fill({ ...rows[0], is_public: false }), ...rows];
  const provider = createApiMeaningProvider({ invoke: async () => { calls += 1; return groupArchiveMeanings(supplied); } });
  const pending = readArchiveMeanings(supplied, { provider, signal: controller.signal });
  queueMicrotask(() => controller.abort());
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('meaning filter URLs round-trip only catalog IDs in fixed modifier order', () => {
  const filter = { base: 'arrival', modifiers: ['trace', 'openness'], groupId: 'meaning-v1:arrival:openness+trace', status: 'partial' };
  const path = archiveMeaningPath(filter);
  assert.ok(path.startsWith('/archive?view=meaning&mv=1'));
  const parsed = parseArchiveMeaningSearch(new URL(path, origin).search);
  assert.deepEqual(parsed, { filter: { ...filter, modifiers: ['openness', 'trace'] }, unsupportedVersion: false });
  assert.deepEqual(parseArchiveMeaningSearch(new URL(archiveMeaningPath(), origin).search), { filter: emptyFilter, unsupportedVersion: false });
  assert.throws(() => archiveMeaningPath({ name: 'private input' }));
});

test('unsafe filters, unknown enums and duplicate keys are rejected without retaining input', () => {
  for (const suffix of ['&name=private', '&base=personality', '&modifiers=trace,unknown', '&status=published',
    '&group=private-id', '&group=meaning-v1:arrival:trace+openness', '&base=arrival&base=reception', '&__proto__=x']) {
    assert.deepEqual(parseArchiveMeaningSearch(`?view=meaning&mv=1${suffix}`), { filter: emptyFilter, unsupportedVersion: false });
  }
  assert.deepEqual(parseArchiveMeaningSearch('?view=meaning&mv=9&base=arrival'), { filter: emptyFilter, unsupportedVersion: true });
  assert.deepEqual(parseArchiveMeaningSearch('?view=precision'), { filter: emptyFilter, unsupportedVersion: false });
  assert.throws(() => archiveMeaningPath({ modifiers: ['unknown'] }));
  assert.throws(() => archiveMeaningPath({ groupId: 'https://evil.example' }));
});

test('detail and pair reading links share the meaning version gate without becoming archive filters', () => {
  for (const search of ['?reading=meaning&mv=999', '?reading=meaning', '?view=meaning',
    '?reading=precision&mv=999', '?mv=999', '?reading=meaning&mv=1&mv=999', '?reading=meaning&mv=']) {
    assert.deepEqual(parseArchiveMeaningSearch(search), { filter: emptyFilter, unsupportedVersion: true }, search);
  }
  for (const search of ['', '?reading=meaning&mv=1', '?reading=meaning&mv=1&base=arrival',
    '?reading=precision', '?reading=precision&mv=1', '?view=precision', '?mv=1']) {
    assert.deepEqual(parseArchiveMeaningSearch(search), { filter: emptyFilter, unsupportedVersion: false }, search);
  }
});

test('meaning and explicit precision shares keep their view on public app UUID URLs', () => {
  const meaning = new URL(archiveShareUrl(rows[0].id, rows[1].id, { origin, endpoint, reading: 'meaning', meaningVersion: 1 }));
  assert.equal(meaning.origin, origin);
  assert.equal(meaning.pathname, `/compare/${rows[0].id}/${rows[1].id}`);
  assert.equal(meaning.searchParams.get('reading'), 'meaning');
  assert.equal(meaning.searchParams.get('mv'), '1');
  const precision = new URL(archiveShareUrl(rows[0].id, rows[1].id, { origin, endpoint, reading: 'precision' }));
  assert.equal(precision.origin, origin);
  assert.equal(precision.searchParams.get('reading'), 'precision');
  assert.equal(precision.searchParams.has('mv'), false);
  assert.equal(new URL(archiveShareUrl(rows[0].id, rows[1].id, { origin, endpoint })).origin, new URL(endpoint).origin);
  assert.throws(() => archiveShareUrl('private-local-id', rows[1].id, { origin, reading: 'meaning' }));
  assert.throws(() => archiveShareUrl(rows[0].id, rows[1].id, { origin, reading: 'meaning', meaningVersion: 9 }));
});

test('native meaning share describes a worldview reading and rejects hidden endpoints', async () => {
  let sent;
  const navigator = { share: async (payload) => { sent = payload; } };
  await shareArchive({ left: rows[0], right: rows[1] }, { origin, endpoint, reading: 'meaning', meaningVersion: 1, navigator });
  assert.match(sent.title, /형태에서 읽는 의미/);
  assert.match(sent.text, /세계관/);
  assert.equal(new URL(sent.url).searchParams.get('reading'), 'meaning');
  await assert.rejects(shareArchive({ left: { ...rows[0], is_public: false }, right: rows[1] }, { origin, reading: 'meaning', navigator }), /공개된/);
});

test('meaning pair image footer is distinct without changing existing export defaults', async () => {
  const previousDocument = globalThis.document;
  const previousTimeout = globalThis.setTimeout;
  const labels = [];
  const downloads = [];
  const context = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, save() {}, restore() {},
    translate() {}, scale() {}, drawImage() {}, fillText(text) { labels.push(text); } };
  globalThis.document = { fonts: { ready: Promise.resolve() }, createElement(tag) {
    if (tag === 'a') return { click() { downloads.push(this.download); } };
    return { getContext: () => context, toBlob(callback) { callback(new Blob(['fixture'], { type: 'image/png' })); } };
  } };
  globalThis.setTimeout = (callback) => { callback(); return 0; };
  try {
    // This assertion checks the English footer, independently from the app's
    // Korean default locale. Neither UI simplification nor sorting changes it.
    await exportPairCard(rows[0], rows[1], '', { reading: 'meaning', meaningVersion: 1, locale: 'en' });
    assert.ok(labels.includes('MEANING v1 · PROJECT WORLDVIEW READING'));
    assert.equal(downloads.at(-1), 'response-archive-meaning.png');
    labels.length = 0;
    await exportPairCard(rows[0], rows[1]);
    assert.ok(labels.includes('HEPTAPOD B · THE RESPONSE ARCHIVE'));
    assert.equal(downloads.at(-1), 'response-archive-comparison.png');
  } finally {
    globalThis.document = previousDocument;
    globalThis.setTimeout = previousTimeout;
  }
});
