import assert from 'node:assert/strict';
import { publishArchiveGlyph, unpublishArchiveGlyph, readGlyphRelations, readPublicGlyph, readArchiveGlyphs } from '../src/lib/archiveClient.js';
import { computePublicRelations } from '../supabase/functions/_shared/archive-relations.js';
import { readRequest, validGlyphId } from '../supabase/functions/_shared/archive-http.js';
import { prepareArchiveGlyph } from '../src/utils/heptapod/archiveGlyph.js';
import { RELATION_ALGORITHM_VERSION, relateGlyphs } from '../src/utils/heptapod/relateGlyphs.js';

let assertions = 0;
async function test(name, run) {
  await run();
  assertions += 1;
  console.log(`✓ ${name}`);
}

function publishingClient({ user = { id: 'owner' }, authError = null, invokeError = null } = {}) {
  const calls = [];
  return {
    calls,
    auth: {
      getSession: async () => { calls.push(['session']); return { data: { session: user ? { user } : null }, error: authError }; },
      signInAnonymously: async () => { calls.push(['anonymous']); return { data: { user: { id: 'new-owner' } } }; },
    },
    functions: {
      invoke: async (name, options) => {
        calls.push([name, options]);
        return { data: { glyphId: 'published', isNew: true, mappingStatus: 'on-demand' }, error: invokeError };
      },
    },
  };
}

await test('missing consent does not initialize auth or send the name', async () => {
  const client = publishingClient();
  await assert.rejects(() => publishArchiveGlyph(client, { displayName: 'Louise' }), /동의/);
  assert.equal(client.calls.length, 0);
});
await test('consented anonymous publication creates an owner before invoking the server', async () => {
  const client = publishingClient({ user: null });
  const result = await publishArchiveGlyph(client, { displayName: 'Louise', consented: true });
  assert.deepEqual(client.calls.map(([name]) => name), ['session', 'anonymous', 'archive-publish']);
  assert.equal(result.glyphId, 'published');
});
await test('existing owner session is reused; client model, fingerprint and owner are excluded', async () => {
  const client = publishingClient();
  await publishArchiveGlyph(client, { displayName: 'Louise', consented: true, userId: 'forged', modelData: { fake: true }, fingerprint: 'forged' });
  assert.deepEqual(client.calls[1][1].body, { displayName: 'Louise', contextTags: [], consented: true });
});
await test('session errors abort publication', async () => {
  const client = publishingClient({ authError: new Error('offline') });
  await assert.rejects(() => publishArchiveGlyph(client, { displayName: 'Louise', consented: true }), /offline/);
  assert.equal(client.calls.length, 1);
});
await test('server errors throw and preserve actionable message', async () => {
  const client = publishingClient({ invokeError: { message: 'HTTP failure', context: { json: async () => ({ error: { message: '저장 실패' } }) } } });
  await assert.rejects(() => publishArchiveGlyph(client, { displayName: 'Louise', consented: true }), /저장 실패/);
});
await test('withdrawal never creates a replacement anonymous owner', async () => {
  const client = publishingClient({ user: null });
  await assert.rejects(() => unpublishArchiveGlyph(client, 'id'), /세션/);
  assert.deepEqual(client.calls.map(([name]) => name), ['session']);
});
await test('relation endpoint failure is not returned as an empty neighbor list', async () => {
  const client = publishingClient({ invokeError: new Error('relation offline') });
  await assert.rejects(() => readGlyphRelations(client, 'id'), /relation offline/);
});

function tableClient(tables, { failedTable } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const filters = [];
      const criteria = [];
      let limit = Infinity;
      let single = false;
      const query = {
        select: () => query,
        eq: (key, value) => { criteria.push(key); filters.push((row) => row[key] === value); return query; },
        neq: (key, value) => { filters.push((row) => row[key] !== value); return query; },
        in: (key, values) => { filters.push((row) => values.includes(row[key])); return query; },
        ilike: () => { throw new Error('Morphology candidates must not use name-prefix matching'); },
        order: () => query,
        limit: (value) => { limit = value; return query; },
        maybeSingle: () => { single = true; return query; },
        abortSignal: () => query,
        then(resolve, reject) {
          calls.push({ table, limit, criteria });
          const rows = (tables[table] || []).filter((row) => filters.every((filter) => filter(row))).slice(0, limit);
          return Promise.resolve({ data: single ? rows[0] || null : rows, error: table === failedTable ? new Error('network') : null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}
async function glyph(id, name, isPublic = true) {
  const prepared = await prepareArchiveGlyph(name);
  return { id, canonical_name: prepared.canonicalName, encoder_version: prepared.encoderVersion,
    is_interrogative: prepared.isInterrogative, model_data: prepared.modelData,
    is_public: isPublic, contour_primary: prepared.contour.primary };
}
const centerId = '11111111-1111-4111-8111-111111111111';
const center = await glyph(centerId, 'Louise');
const variant = await glyph('22222222-2222-4222-8222-222222222222', 'Louise?');
const hidden = await glyph('33333333-3333-4333-8333-333333333333', 'Louis', false);

await test('public read filters hidden records and limits archive reads', async () => {
  const client = tableClient({ glyphs: [hidden, center, variant] });
  assert.equal(await readPublicGlyph(client, hidden.id), null);
  assert.equal((await readArchiveGlyphs(client, { limit: 99999 })).length, 2);
  assert.equal(client.calls.at(-1).limit, 200);
});
await test('relations use actual public models and rendered-variant evidence with sample basis', async () => {
  const client = tableClient({ glyphs: [center, variant, hidden], glyph_relations: [] });
  const result = await computePublicRelations(client, centerId);
  assert.equal(result.mappingStatus, 'current-sample');
  assert.equal(result.sampleSize, 1);
  assert.ok(result.relations.some((row) => row.relation_type === 'VARIANT'));
  assert.equal(result.relations.length, 1);
  assert.equal(result.relations[0].evidence.basis, 'rendered-variant');
  assert.equal(result.relations[0].algorithm_version, RELATION_ALGORITHM_VERSION);
  assert.ok(result.relations.every((row) => row.neighborGlyph.id === variant.id && row.evidence_source === 'current-sample'));
  assert.ok(result.relations.every((row) => row.evidence && row.reasons.length));
});
await test('no candidates means no invented connections', async () => {
  const result = await computePublicRelations(tableClient({ glyphs: [center], glyph_relations: [] }), centerId);
  assert.deepEqual(result.relations, []);
  assert.equal(result.sampleSize, 0);
});
await test('neighbor cap preserves a measured local motif and question variation among whole-form matches', async () => {
  const formOnly = Array.from({ length: 30 }, (_, index) => ({
    ...center,
    id: `form-neighbor-${index}`,
    canonical_name: `가${index}`,
  }));
  const motif = await glyph('44444444-4444-4444-8444-444444444444', 'Hannah');
  const result = await computePublicRelations(tableClient({ glyphs: [center, ...formOnly, motif, variant], glyph_relations: [] }), centerId);
  assert.equal(new Set(result.relations.map((row) => row.neighborGlyph.id)).size, 24);
  const variantEvidence = result.relations.filter((row) => row.neighborGlyph.id === variant.id);
  assert.equal(variantEvidence.length, 1);
  assert.ok(variantEvidence.some((row) => row.relation_type === 'VARIANT'));
  const motifEvidence = result.relations.find((row) => row.neighborGlyph.id === motif.id);
  assert.equal(motifEvidence.evidence.level, 'shared-motif');
  assert.ok(motifEvidence.score < 0.78);
  assert.deepEqual(motifEvidence.evidence, relateGlyphs(center, motif)[0].evidence);
  assert.ok(result.relations.filter((row) => row.relation_type === 'FORM').every((row) => row.evidence.observations.length > 0));
  assert.ok(result.relations.some((row) => row.evidence.level === 'whole-form'));
});
await test('candidate selection is name-independent and old ECHO rows only supply IDs for model recomputation', async () => {
  const legacy = { glyph_a_id: centerId, glyph_b_id: variant.id, relation_type: 'ECHO',
    score: 999, algorithm_version: 2, reasons: ['legacy letter explanation'] };
  const client = tableClient({ glyphs: [center, variant], glyph_relations: [legacy] });
  const result = await computePublicRelations(client, centerId);
  assert.deepEqual(result.candidateSources, ['recent-public', 'stored-neighbor-models']);
  assert.equal(result.sampleLimit, 300);
  assert.ok(client.calls.every((call) => !call.criteria.includes('canonical_name') && !call.criteria.includes('contour_primary')));
  assert.ok(result.relations.every((row) => row.algorithm_version === RELATION_ALGORITHM_VERSION
    && !['ECHO', 'CONTAINS'].includes(row.relation_type) && !row.reasons.includes('legacy letter explanation')));
  const expected = relateGlyphs(center, variant);
  assert.deepEqual(result.relations.map((row) => row.evidence), expected.map((relation) => relation.evidence));
});
await test('oversized legacy harmonic arrays and names are skipped before comparison', async () => {
  const oversized = { ...variant, model_data: { ...variant.model_data, harmonics: new Array(10000).fill(variant.model_data.harmonics[0]) } };
  const longName = { ...variant, id: 'long-name', canonical_name: 'x'.repeat(100000) };
  const result = await computePublicRelations(tableClient({ glyphs: [center, oversized, longName], glyph_relations: [] }), centerId);
  assert.equal(result.mappingStatus, 'partial-sample');
  assert.equal(result.skippedModels, 2);
  assert.deepEqual(result.relations, []);
});
await test('deep or oversized legacy model payloads and oversized center models fail within bounds', async () => {
  const largePayload = { ...variant, model_data: { ...variant.model_data, legacyText: 'x'.repeat(40000) } };
  let nested = {};
  for (let index = 0; index < 20; index += 1) nested = { nested };
  const deepPayload = { ...variant, id: 'deep-model', model_data: { ...variant.model_data, nested } };
  const result = await computePublicRelations(tableClient({ glyphs: [center, largePayload, deepPayload], glyph_relations: [] }), centerId);
  assert.equal(result.skippedModels, 2);
  const largeCenter = { ...center, model_data: { ...center.model_data, strands: new Array(10000).fill({}) } };
  await assert.rejects(() => computePublicRelations(tableClient({ glyphs: [largeCenter], glyph_relations: [] }), centerId), { status: 422 });
});
await test('invalid legacy model explicitly produces partial-sample metadata', async () => {
  const broken = { ...variant, model_data: {} };
  const result = await computePublicRelations(tableClient({ glyphs: [center, broken], glyph_relations: [] }), centerId);
  assert.equal(result.mappingStatus, 'partial-sample');
  assert.equal(result.skippedModels, 1);
});
await test('candidate data failure aborts instead of silently reducing evidence', async () => {
  const client = tableClient({ glyphs: [center, variant] }, { failedTable: 'glyph_relations' });
  await assert.rejects(() => computePublicRelations(client, centerId), /후보/);
});
await test('hidden centers cannot be explored', async () => {
  const client = tableClient({ glyphs: [hidden], glyph_relations: [] });
  await assert.rejects(() => computePublicRelations(client, hidden.id), /공개된/);
});
await test('request validation rejects malformed JSON and IDs', async () => {
  assert.equal(validGlyphId(centerId), true);
  assert.equal(validGlyphId('name,Louise'), false);
  await assert.rejects(() => readRequest(new Request('https://example.test', { method: 'POST', body: '[]' })), /JSON/);
  await assert.rejects(() => readRequest(new Request('https://example.test')), /POST/);
});

console.log(`Archive data: ${assertions} checks passed.`);
