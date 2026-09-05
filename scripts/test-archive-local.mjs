import test from 'node:test';
import assert from 'node:assert/strict';
import { createArchiveStoryClient, ARCHIVE_STORY_GLYPHS as rows, ARCHIVE_STORY_IDS as ids } from '../src/test-fixtures/archiveClient.js';
import { readArchiveGlyphs, readGlyphRelations, readPublicGlyph, publishArchiveGlyph, unpublishArchiveGlyph } from '../src/lib/archiveClient.js';
import { createApiRelationProvider, createLocalRelationProvider, resolveArchiveRelationsMode } from '../src/lib/archiveRelations.js';
import { rememberArchiveSnapshot, getArchiveSnapshot, ARCHIVE_SNAPSHOT_TTL_MS } from '../src/lib/archiveSnapshot.js';
import { relateGlyphs, RELATION_ALGORITHM_VERSION } from '../src/utils/heptapod/relateGlyphs.js';

test('development defaults local, production defaults API, explicit mode and client injection remain stable', () => {
  assert.equal(resolveArchiveRelationsMode({ env: { DEV: true } }), 'local');
  assert.equal(resolveArchiveRelationsMode({ env: { DEV: false } }), 'api');
  assert.equal(resolveArchiveRelationsMode({ env: { DEV: true, VITE_ARCHIVE_RELATIONS_MODE: 'api' } }), 'api');
  assert.equal(resolveArchiveRelationsMode({ hasInjectedClient: true, env: { DEV: true } }), 'api');
  assert.equal(resolveArchiveRelationsMode({ mode: 'local', hasInjectedClient: true }), 'local');
  assert.throws(() => resolveArchiveRelationsMode({ mode: 'fallback' }), /local 또는 api/);
});

test('gallery-loaded public rows drive local relations without function calls or a second list query', async () => {
  const client = createArchiveStoryClient();
  const loaded = await readArchiveGlyphs(client);
  const result = await readGlyphRelations(client, ids.left, { mode: 'local' });
  assert.equal(result.computationMode, 'local');
  assert.equal(result.sampleSize, loaded.length - 1);
  assert.equal(client.calls.filter((call) => call === 'glyphs').length, 2); // gallery + fresh center
  assert.ok(!client.calls.some((call) => call.startsWith('archive-') || call === 'auth'));
  assert.ok(result.relations.length > 0);
  assert.ok(result.relations.every((row) => row.evidence_source === 'local-public-snapshot'));
  for (const relation of result.relations) {
    const saved = loaded.find((glyph) => glyph.id === relation.neighborGlyph.id);
    assert.equal(relation.neighborGlyph.model_data, saved.model_data);
    assert.ok(relation.reasons.length && relation.algorithm_version === RELATION_ALGORITHM_VERSION);
    assert.ok(['rendered-form', 'rendered-variant'].includes(relation.evidence.basis));
  }
});

test('a direct detail link bootstraps the same public archive then reuses it for another center', async () => {
  const client = createArchiveStoryClient();
  await readGlyphRelations(client, ids.left, { mode: 'local' });
  assert.equal(client.calls.filter((call) => call === 'glyphs').length, 2);
  const result = await readGlyphRelations(client, ids.right, { mode: 'local' });
  assert.equal(client.calls.filter((call) => call === 'glyphs').length, 3);
  assert.ok(result.relations.every((row) => row.neighborGlyph.id !== ids.right));
  assert.equal(client.calls.includes('archive-relations'), false);
});

test('local and API provider DTOs preserve exactly the same per-pair rendered morphology evidence', async () => {
  const client = createArchiveStoryClient();
  const local = await readGlyphRelations(client, ids.left, { mode: 'local' });
  const api = await readGlyphRelations(client, ids.left, { mode: 'api' });
  const comparable = (result) => result.relations.map((row) => ({
    neighbor: row.neighborGlyph.id, type: row.relation_type, score: row.score,
    components: row.score_components, evidence: row.evidence, reasons: row.reasons, direction: row.direction,
  })).sort((a, b) => `${a.neighbor}:${a.type}`.localeCompare(`${b.neighbor}:${b.type}`));
  assert.deepEqual(comparable(local), comparable(api));
  assert.equal(api.computationMode, 'api');
  assert.equal(client.calls.filter((call) => call === 'archive-relations').length, 1);
});

test('renaming stored labels does not change locally measured shape relations', async () => {
  const original = [rows[0], rows[1]];
  const renamed = original.map((row, index) => ({ ...row, canonical_name: index ? 'zzz' : 'aaa' }));
  const get = (glyphs) => createLocalRelationProvider({ readCenter: async () => glyphs[0],
    loadSnapshot: async () => ({ rows: glyphs }), yieldWork: async () => {} }).getRelations(ids.left);
  const evidence = (result) => result.relations.map((row) => ({ type: row.relation_type,
    score: row.score, evidence: row.evidence, reasons: row.reasons }));
  const originalResult = await get(original);
  assert.ok(originalResult.relations.length > 0);
  assert.deepEqual(evidence(originalResult), evidence(await get(renamed)));
});

test('outdated API computation is a visible version error, never a local fallback or empty result', async () => {
  let calls = 0;
  const provider = createApiRelationProvider({ invoke: async () => {
    calls += 1;
    return { relations: [], mappingStatus: 'current-sample', algorithmVersion: 2 };
  } });
  await assert.rejects(provider.getRelations(ids.left), /업데이트/);
  assert.equal(calls, 1);
});

test('API failure never silently falls back to local, even with a cached public snapshot', async () => {
  const client = createArchiveStoryClient({ failures: { 'archive-relations': 'server unavailable' } });
  await readArchiveGlyphs(client);
  await assert.rejects(readGlyphRelations(client, ids.left, { mode: 'api' }), /server unavailable/);
  assert.equal(client.calls.filter((call) => call === 'glyphs').length, 1);
  const local = await readGlyphRelations(client, ids.left, { mode: 'local' });
  assert.ok(local.relations.length > 0);
});

test('a replacement provider needs no Supabase client and receives the existing ID/signal contract', async () => {
  const controller = new AbortController();
  let received;
  const provider = { getRelations: async (id, options) => { received = { id, options }; return { relations: [], mappingStatus: 'current-sample' }; } };
  const result = await readGlyphRelations(null, ids.left, { provider, signal: controller.signal });
  assert.equal(received.id, ids.left);
  assert.equal(received.options.signal, controller.signal);
  assert.deepEqual(result.relations, []);
  await assert.rejects(readGlyphRelations(null, ids.left, { provider: { getRelations: async () => ({}) } }), /응답/);
});

test('snapshots exclude hidden rows, deduplicate IDs, expire, and isolate clients', () => {
  const client = {};
  rememberArchiveSnapshot(client, [...rows, rows[0]], { now: 1000 });
  const snapshot = getArchiveSnapshot(client, { now: 1001 });
  assert.deepEqual(snapshot.rows.map((row) => row.id).sort(), rows.filter((row) => row.is_public).map((row) => row.id).sort());
  assert.ok(snapshot.rows.every((row) => row.is_public));
  assert.equal(getArchiveSnapshot({}, { now: 1001 }), null);
  assert.equal(getArchiveSnapshot(client, { now: 1000 + ARCHIVE_SNAPSHOT_TTL_MS }), null);
});

test('a deliberately limited gallery query cannot masquerade as a complete archive', () => {
  const client = {};
  rememberArchiveSnapshot(client, rows.slice(0, 2), { limit: 2 });
  assert.equal(getArchiveSnapshot(client), null);
  rememberArchiveSnapshot(client, rows.slice(0, 1), { limit: 2 });
  assert.equal(getArchiveSnapshot(client).rows.length, 1);
});

test('hidden centers are rechecked and removed from the snapshot before any calculation', async () => {
  const client = createArchiveStoryClient();
  await readArchiveGlyphs(client);
  await assert.rejects(readGlyphRelations(client, ids.hidden, { mode: 'local' }), /공개된/);
  assert.equal(client.calls.includes('archive-relations'), false);
  await readPublicGlyph(client, ids.hidden);
  assert.ok(getArchiveSnapshot(client).rows.every((row) => row.id !== ids.hidden));
});

test('fresh public-detail responses evict withdrawn cached rows', async () => {
  const client = createArchiveStoryClient({ glyphs: rows.filter((glyph) => glyph.id !== ids.right) });
  rememberArchiveSnapshot(client, rows);
  assert.ok(getArchiveSnapshot(client).rows.some((glyph) => glyph.id === ids.right));
  assert.equal(await readPublicGlyph(client, ids.right), null);
  assert.ok(getArchiveSnapshot(client).rows.every((glyph) => glyph.id !== ids.right));
});

test('successful publication and withdrawal invalidate the public snapshot, without simulating writes', async () => {
  const client = createArchiveStoryClient();
  await readArchiveGlyphs(client);
  const result = await publishArchiveGlyph(client, { displayName: 'Louise', consented: true });
  assert.equal(getArchiveSnapshot(client), null);
  await readArchiveGlyphs(client);
  await unpublishArchiveGlyph(client, result.glyphId);
  assert.equal(getArchiveSnapshot(client), null);
  assert.ok(client.calls.includes('archive-publish') && client.calls.includes('archive-unpublish'));
});

test('read failures and zero candidates remain different outcomes', async () => {
  const broken = createArchiveStoryClient({ failures: { glyphs: 'read failed' } });
  await assert.rejects(readGlyphRelations(broken, ids.left, { mode: 'local' }), /read failed/);
  const alone = createArchiveStoryClient({ glyphs: [rows[0]] });
  const result = await readGlyphRelations(alone, ids.left, { mode: 'local' });
  assert.deepEqual(result.relations, []);
  assert.equal(result.sampleSize, 0);
  assert.equal(result.mappingStatus, 'current-sample');
});

test('bad legacy models are skipped and the stored valid models are never regenerated', async () => {
  const bad = { ...rows[2], model_data: { ...rows[2].model_data, harmonics: new Array(1000).fill({}) } };
  const client = createArchiveStoryClient({ glyphs: [rows[0], rows[1], bad] });
  const result = await readGlyphRelations(client, ids.left, { mode: 'local' });
  assert.equal(result.mappingStatus, 'partial-sample');
  assert.equal(result.skippedModels, 1);
  assert.equal(result.sampleSize, 2);
  assert.ok(result.relations.every((row) => row.neighborGlyph.model_data === rows[1].model_data));
  const actual = relateGlyphs(rows[0], rows[1]);
  assert.deepEqual(result.relations.map((row) => row.score), actual.map((row) => row.score));
});

test('cancellation stops reads before they start and calculation between UI work batches', async () => {
  const controller = new AbortController();
  controller.abort();
  const client = createArchiveStoryClient();
  await assert.rejects(readGlyphRelations(client, ids.left, { mode: 'local', signal: controller.signal }), { name: 'AbortError' });
  assert.equal(client.calls.length, 0);
  const mid = new AbortController();
  const provider = createLocalRelationProvider({ readCenter: async () => rows[0], loadSnapshot: async () => ({ rows }), yieldWork: async () => { mid.abort(); } });
  await assert.rejects(provider.getRelations(ids.left, { signal: mid.signal }), { name: 'AbortError' });
});

test('aborted public list reads never populate a reusable snapshot', async () => {
  const client = createArchiveStoryClient();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(readArchiveGlyphs(client, { signal: controller.signal }));
  assert.equal(getArchiveSnapshot(client), null);
});
