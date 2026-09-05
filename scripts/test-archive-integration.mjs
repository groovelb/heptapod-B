import test from 'node:test';
import assert from 'node:assert/strict';
import { groupResonanceRows, glyphLabel } from '../src/utils/heptapod/resonanceView.js';
import { archiveSharePath, archiveShareUrl, shareArchive } from '../src/utils/heptapod/shareArchive.js';
import { prepareArchiveGlyph } from '../src/utils/heptapod/archiveGlyph.js';
import { relateGlyphs, RELATION_ALGORITHM_VERSION } from '../src/utils/heptapod/relateGlyphs.js';

const leftId = '11111111-1111-4111-8111-111111111111';
const rightId = '22222222-2222-4222-8222-222222222222';
const origin = 'https://archive.example';
const options = { origin, endpoint: '' };
const left = { id: leftId, canonical_name: 'louise' };
const right = { id: rightId, canonical_name: 'louis', is_interrogative: true };
const observations = [{ kind: 'branch', reason: '두 표식의 가지가 같은 방향으로 펼쳐집니다.', similarity: 0.94,
  anchorA: { ang: 1, clusterIndex: 0 }, anchorB: { ang: 1.1, clusterIndex: 1 } }];
const formEvidence = { basis: 'rendered-form', level: 'shared-motif', observations };
const formRow = (neighborGlyph, extra = {}) => ({ neighborGlyph, relation_type: 'FORM', score: 0.93,
  reasons: observations.map((item) => item.reason), score_components: { clusterScore: 1 },
  evidence: formEvidence, algorithm_version: RELATION_ALGORITHM_VERSION, ...extra });
const variantRow = (neighborGlyph, extra = {}) => ({ neighborGlyph, relation_type: 'VARIANT', score: 1,
  reasons: ['본체는 같고 바깥으로 뻗는 의문형 획만 다릅니다.'], evidence: { basis: 'rendered-variant' },
  algorithm_version: RELATION_ALGORITHM_VERSION, ...extra });

test('one neighbor retains measured morphology, source IDs and the actual model', () => {
  const model = { preserved: true };
  const neighborGlyph = { ...right, model_data: model };
  const groups = groupResonanceRows([
    formRow(neighborGlyph, { glyph_a_id: leftId, glyph_b_id: rightId, direction: 'reverse' }),
    variantRow(neighborGlyph),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].id, rightId);
  assert.equal(groups[0].model, model);
  assert.equal(groups[0].relations.length, 2);
  assert.equal(groups[0].relationType, 'FORM');
  assert.equal(groups[0].direction, 'reverse');
  assert.deepEqual(groups[0].evidence.observations, observations);
  assert.equal(groups[0].sourceId, leftId);
});

test('groups enforce privacy, SAME exclusion, filter and no fabricated padding', () => {
  const rows = [
    formRow({ ...right, is_public: false }),
    { neighborGlyph: left, relation_type: 'SAME' },
    variantRow(right),
  ];
  assert.equal(groupResonanceRows(rows).length, 1);
  assert.deepEqual(groupResonanceRows(rows, { types: ['FORM'] }), []);
  assert.deepEqual(groupResonanceRows(rows, { limit: 0 }), []);
});

test('available shape relation kinds alternate without fabricated padding', () => {
  const rows = ['FORM', 'FORM', 'FORM', 'VARIANT'].map((kind, index) => {
    const neighbor = { id: String(index), canonical_name: 'fixture' };
    return kind === 'FORM' ? formRow(neighbor, { score: 0.8 + index / 100 }) : variantRow(neighbor);
  });
  const selected = groupResonanceRows(rows, { limit: 3 });
  assert.equal(selected.length, 3);
  assert.deepEqual(new Set(selected.map((row) => row.relationType)), new Set(['FORM', 'VARIANT']));
});

test('legacy v2 and text-derived ECHO or CONTAINS never enter the morphology view', () => {
  const rows = [
    formRow(right, { algorithm_version: 2 }),
    formRow(right, { relation_type: 'ECHO', evidence: { basis: 'literal-text', sharedGraphemes: ['l'] } }),
    formRow(right, { relation_type: 'CONTAINS', evidence: { basis: 'literal-text' } }),
    formRow(right, { evidence: { basis: 'literal-text' } }),
    formRow(right, { relation_type: 'ECHO' }),
    variantRow(right, { evidence: { basis: 'encoder-variant' } }),
    formRow(right, { evidence: { basis: 'rendered-form', observations: [{ ...observations[0], kind: 'letter' }] } }),
    formRow(right, { evidence: { basis: 'rendered-form', observations: [{ ...observations[0], anchorA: { ang: NaN } }] } }),
  ];
  assert.deepEqual(groupResonanceRows(rows), []);
});

test('real domain results fit the page adapter with reasons and evidence intact', async () => {
  const asRow = async (name, id) => {
    const prepared = await prepareArchiveGlyph(name);
    return { id, canonical_name: prepared.canonicalName, is_interrogative: prepared.isInterrogative,
      encoder_version: prepared.encoderVersion, model_data: prepared.modelData, fingerprint: prepared.fingerprint };
  };
  const a = await asRow('Louise', leftId);
  const b = await asRow('Louise?', rightId);
  const results = relateGlyphs(a, b);
  const rows = results.map((relation) => ({ neighborGlyph: b, relation_type: relation.relationType,
    score: relation.score, score_components: relation.components, evidence: relation.evidence, reasons: relation.reasons,
    algorithm_version: relation.algorithmVersion, glyph_a_id: relation.sourceId, glyph_b_id: relation.targetId }));
  const [neighbor] = groupResonanceRows(rows);
  assert.equal(neighbor.relationType, 'VARIANT');
  assert.ok(neighbor.reasons.length);
  assert.equal(neighbor.model, b.model_data);
  assert.equal(neighbor.algorithmVersion, RELATION_ALGORITHM_VERSION);
  assert.equal(neighbor.evidence.basis, 'rendered-variant');
});

test('labels preserve questions without adding a second mark', () => {
  assert.equal(glyphLabel(right), 'louis?');
  assert.equal(glyphLabel({ ...right, canonical_name: 'louis?' }), 'louis?');
});

test('morphology filters select observations and lead with the selected part, without mutating rows', () => {
  const opening = { kind: 'opening', reason: '열린 구간의 방향과 폭이 닮았습니다.', similarity: 0.96,
    anchorA: { ang: 2, half: 0.05 }, anchorB: { ang: 2.1, half: 0.06 } };
  const row = formRow(right, { evidence: { ...formEvidence, observations: [...observations, opening] } });
  const [neighbor] = groupResonanceRows([row], { kinds: ['opening'] });
  assert.equal(neighbor.evidence.observations[0].kind, 'opening');
  assert.equal(neighbor.reasons[0], opening.reason);
  assert.equal(neighbor.relations[0].components.observations[0].kind, 'opening');
  assert.equal(row.evidence.observations[0].kind, 'branch');
  assert.deepEqual(groupResonanceRows([row], { kinds: ['ink'] }), []);
});

test('local motifs rank by their measured motif score, not by low unrelated whole-form scores', () => {
  const strongerMotif = formRow({ id: 'stronger', canonical_name: 'one' }, {
    score: 0.4, score_components: { motifScore: 0.99, wholeScore: 0.4 },
  });
  const weakerMotif = formRow({ id: 'weaker', canonical_name: 'two' }, {
    score: 0.8, score_components: { motifScore: 0.90, wholeScore: 0.8 },
  });
  assert.equal(groupResonanceRows([weakerMotif, strongerMotif], { limit: 1 })[0].id, 'stronger');
});

test('question observations do not masquerade as branch matches or become FORM on a stale API', () => {
  const question = { ...observations[0], kind: 'question', hookPresentA: false, hookPresentB: true };
  const row = variantRow(right, { evidence: { basis: 'rendered-variant', observations: [question] } });
  assert.deepEqual(groupResonanceRows([row], { kinds: ['branch'] }), []);
  assert.equal(groupResonanceRows([row], { types: ['VARIANT'] }).length, 1);
  assert.deepEqual(groupResonanceRows([formRow(right, { evidence: { ...formEvidence, observations: [question] } })]), []);
});

test('public routes contain IDs, never private input', () => {
  assert.equal(archiveSharePath(leftId), `/glyph/${leftId}`);
  assert.equal(archiveShareUrl(leftId, rightId, options), `${origin}/compare/${leftId}/${rightId}`);
  assert.throws(() => archiveSharePath('local', rightId));
  assert.throws(() => archiveSharePath(leftId, 'louise'));
});

test('rich links require safe endpoint configuration and default Supabase falls back', () => {
  const url = new URL(archiveShareUrl(leftId, rightId, { origin, endpoint: 'https://api.example/functions/v1/archive-share' }));
  assert.equal(url.searchParams.get('left'), leftId);
  assert.equal(url.searchParams.get('right'), rightId);
  assert.equal(archiveShareUrl(leftId, rightId, { origin, endpoint: 'https://test.supabase.co/functions/v1/archive-share' }), `${origin}/compare/${leftId}/${rightId}`);
  for (const endpoint of ['http://evil.example', 'ftp://localhost', 'https://user:pass@api.example', 'https://api.example?left=stale']) {
    assert.throws(() => archiveShareUrl(leftId, rightId, { origin, endpoint }));
  }
});

test('native sharing sends actual names and opaque pair URL', async () => {
  let sent;
  const navigator = { share: async (payload) => { sent = payload; } };
  assert.equal(await shareArchive({ left, right, reason: '같은 방향으로 펼쳐지는 가지' }, { ...options, navigator }), 'shared');
  assert.match(sent.title, /louis\?/);
  assert.equal(sent.text, '같은 방향으로 펼쳐지는 가지');
  assert.equal(sent.url, `${origin}/compare/${leftId}/${rightId}`);
});

test('cancel is not a failure and does not copy unexpectedly', async () => {
  let copied = false;
  const navigator = { share: async () => { throw Object.assign(new Error('cancel'), { name: 'AbortError' }); }, clipboard: { writeText: async () => { copied = true; } } };
  assert.equal(await shareArchive({ left }, { ...options, navigator }), 'cancelled');
  assert.equal(copied, false);
});

test('share failure uses awaited clipboard fallback; clipboard failure stays failure', async () => {
  let copied;
  const navigator = { share: async () => { throw new Error('unavailable'); }, clipboard: { writeText: async (value) => { copied = value; } } };
  assert.equal(await shareArchive({ left }, { ...options, navigator }), 'copied');
  assert.equal(copied, `${origin}/glyph/${leftId}`);
  await assert.rejects(shareArchive({ left }, { ...options, navigator: {} }));
  await assert.rejects(shareArchive({ left }, { ...options, navigator: { clipboard: { writeText: async () => { throw new Error('denied'); } } } }), /denied/);
});
