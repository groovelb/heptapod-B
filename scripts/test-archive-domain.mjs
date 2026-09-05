#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildArchiveModel, prepareArchiveGlyph, ARCHIVE_ENCODER_VERSION } from '../src/utils/heptapod/archiveGlyph.js';
import { relateGlyphs, RELATION_ALGORITHM_VERSION } from '../src/utils/heptapod/relateGlyphs.js';
import { extractGlyphFeatures } from '../src/utils/heptapod/extractGlyphFeatures.js';
import { scoreFormRelation, MORPHOLOGY_THRESHOLDS } from '../src/utils/heptapod/scoreFormRelation.js';
import { buildRelationReasons } from '../src/utils/heptapod/buildRelationReasons.js';
import { buildModelReversible, decode } from '../src/utils/heptapod/reversibleModel.js';
import { encodeReversible } from '../src/utils/heptapod/reversibleCodec.js';
import { normalizeName } from '../src/utils/heptapod/normalizeName.js';
import { validateName } from '../src/utils/heptapod/validateName.js';
import { encode } from '../src/utils/heptapod/encode.js';
import { buildModel } from '../src/utils/heptapod/buildModel.js';
import { generateParticles } from '../src/utils/heptapod/logogramParticles.js';

function row(name, id = name, model = buildArchiveModel(name)) {
  const canonical = normalizeName(name);
  return {
    id, canonical_name: canonical.canonicalName,
    is_interrogative: canonical.isInterrogative, encoder_version: ARCHIVE_ENCODER_VERSION,
    model_data: model,
  };
}

test('canonical identity unifies NFC, case, and whitespace while preserving display spelling', async () => {
  const variants = await Promise.all([' Louise ', 'louise', 'LOUISE'].map(prepareArchiveGlyph));
  assert.equal(new Set(variants.map((g) => g.fingerprint)).size, 1);
  assert.match(variants[0].fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(variants[0].displayName, 'Louise');
  assert.equal(variants[1].displayName, 'louise');
  for (const variant of variants) assert.deepEqual(variant.modelData, variants[0].modelData);
  const composed = await prepareArchiveGlyph('김 민준');
  const decomposed = await prepareArchiveGlyph('  김  민준  '.normalize('NFD'));
  assert.equal(composed.fingerprint, decomposed.fingerprint);
  assert.deepEqual(composed.modelData, decomposed.modelData);
});

test('question state changes identity but leaves each mode’s body unchanged', async () => {
  for (const name of ['Louise', '김민준', '明月', 'Anne Marie']) {
    const plain = await prepareArchiveGlyph(name);
    const question = await prepareArchiveGlyph(`${name}?`);
    const fullWidth = await prepareArchiveGlyph(`${name}？`);
    assert.notEqual(plain.fingerprint, question.fingerprint);
    assert.equal(question.fingerprint, fullWidth.fingerprint);
    const { meta: plainMeta, questionHook: plainHook, ...plainBody } = plain.modelData;
    const { meta: questionMeta, questionHook: questionHook, ...questionBody } = question.modelData;
    assert.equal(plainHook, null);
    assert.ok(questionHook);
    assert.equal(plainMeta.encodingMode, questionMeta.encodingMode);
    assert.deepEqual(plainBody, questionBody);
  }
});

test('every supported canonical name labelled reversible roundtrips exactly', () => {
  for (const input of ['A', 'Z', '12', 'Louise', '민준', '하나', 'Kim?']) {
    const model = buildArchiveModel(input);
    const canonical = normalizeName(input);
    assert.equal(model.meta.encodingMode, 'reversible', input);
    assert.equal(model.meta.reversible, true);
    assert.equal(model.meta.overflow, false);
    assert.equal(decode(model).name, canonical.canonicalName + (canonical.isInterrogative ? '?' : ''));
  }
});

test('Unicode, punctuation, whitespace, and overflow are preserved in deterministic mode', async () => {
  for (const input of ['明月', 'さくら', '김민준', 'Zoë', 'İpek', 'Anne Marie', 'O’Neil', 'a'.repeat(64)]) {
    const model = buildArchiveModel(input);
    assert.equal(model.meta.encodingMode, 'deterministic', input);
    assert.equal(model.meta.reversible, false);
    assert.equal(model.meta.name, normalizeName(input).canonicalName);
    assert.deepEqual(model, buildArchiveModel(input));
  }
  assert.equal(buildArchiveModel('김민준').meta.fallbackReason, 'capacity-exceeded');
  assert.equal(buildArchiveModel('明月').meta.fallbackReason, 'unsupported-codec-characters');
  assert.equal(buildModelReversible('明月').meta.reversible, false);
  assert.equal(buildModelReversible('김민준').meta.reversible, false);
  assert.deepEqual(encodeReversible('明月').unsupportedCharacters, ['明', '月']);
  const unsupported = await Promise.all(['明月', '明日', 'a b', 'ab', 'Zoë', 'Zoe'].map(prepareArchiveGlyph));
  assert.equal(new Set(unsupported.map((g) => g.fingerprint)).size, unsupported.length);
});

test('validation reports failures rather than constructing an empty or truncated glyph', () => {
  for (const [name, code] of [['', 'EMPTY'], ['？？', 'EMPTY'], ['a'.repeat(65), 'TOO_LONG'], ['A😀', 'UNSUPPORTED_CHAR'], ['A\u0000', 'UNSUPPORTED_CHAR']]) {
    assert.equal(validateName(name).error.code, code);
    assert.throws(() => buildArchiveModel(name), (error) => error.code === code && error.message.length > 0);
  }
  assert.equal(validateName('İpek').valid, true);
  assert.equal(validateName('明月').valid, true);
});

function observedModel() {
  const model = buildArchiveModel('Louise');
  model.harmonics = [{ k: 1, amp: 0.012, phase: 0 }];
  model.ring.harmonics = model.harmonics;
  model.ring.weightCenterAngle = 2.34;
  model.pressure = [{ k: 1, amp: 0.5, phase: Math.PI / 2 }];
  model.inkLoads = [{ ang: Math.PI, width: 0.4, strength: 1.2 }];
  model.dropZones = [{ ang: 2, width: 0.08, strength: 0.8 }];
  model.gap = { ang: Math.PI * 1.5, half: 0.12 };
  model.clusters = [{ ...model.clusters[0], type: 'spike', spikeN: 9, dirBias: 1, ang: 0.6, I: 0.9, coneSpread: 0.9 }];
  model.main = model.clusters[0];
  model.questionHook = null;
  return model;
}
function opposite(model, { keepBranch = false, keepOpeningInk = false } = {}) {
  const result = structuredClone(model);
  result.harmonics = model.harmonics.map((h) => ({ ...h, phase: h.phase + Math.PI }));
  if (!keepBranch) result.clusters = model.clusters.map((c) => ({
    ...c, type: 'hook', spikeN: 6, dirBias: -c.dirBias, ang: c.ang + Math.PI,
  }));
  if (!keepOpeningInk) {
    result.pressure = model.pressure.map((h) => ({ ...h, phase: h.phase + Math.PI }));
    result.inkLoads = model.inkLoads.map((z) => ({ ...z, ang: z.ang + Math.PI }));
    result.dropZones = model.dropZones.map((z) => ({ ...z, ang: z.ang + Math.PI }));
    result.gap = model.gap && { ang: model.gap.ang + Math.PI, half: model.gap.half * 2 };
  }
  return result;
}
const form = (a, b) => scoreFormRelation(extractGlyphFeatures(a), extractGlyphFeatures(b));

test('FORM self-score is 1, symmetric and bounded across actual render modes', () => {
  const names = ['A', 'B', 'Ada', 'Ian', 'Louise', 'Louis', '민준', '민수', '김민준', '하나', '明月', 'Zoë', 'O’Neil', 'Anne Marie'];
  const features = names.map((name) => extractGlyphFeatures(buildArchiveModel(name)));
  features.push(extractGlyphFeatures(buildModel(encode('legacy Louise'))));
  for (const a of features) {
    assert.equal(scoreFormRelation(a, a).score, 1);
    for (const cluster of a.clusters) assert.equal(cluster.slot, cluster.slotIndex);
    for (const b of features) {
      const ab = scoreFormRelation(a, b);
      const ba = scoreFormRelation(b, a);
      assert.ok(Number.isFinite(ab.score) && ab.score >= 0 && ab.score <= 1);
      assert.ok(Math.abs(ab.score - ba.score) < 1e-10);
      assert.equal(ab.pass, ba.pass);
      assert.equal(ab.components.level, ba.components.level);
      for (const key of ['ringScore', 'clusterScore', 'harmonicSim', 'gapSim', 'inkScore', 'pressureSim', 'inkLoadSim', 'dryBreakSim', 'motifScore']) {
        assert.ok(ab.components[key] >= 0 && ab.components[key] <= 1);
      }
    }
  }
});

test('raw name, language, spelling, tags, version labels and metadata do not affect relations', () => {
  const model = observedModel();
  const a = row('Louise', 'a', model);
  const b = row('Hannah', 'b', opposite(model, { keepBranch: true }));
  const before = relateGlyphs(a, b);
  assert.equal(before[0].components.level, 'shared-motif');
  a.canonical_name = '아무 관련 없는 글자';
  b.canonical_name = 'ZZZ';
  a.encoder_version = 500;
  b.encoder_version = 1;
  a.is_interrogative = !a.is_interrogative;
  a.context_tags = ['friend'];
  a.model_data.meta.name = '이름은 관측 근거가 아니다';
  b.model_data.meta.canonicalName = 'not-evidence';
  assert.deepEqual(relateGlyphs(a, b), before);
  for (const glyph of [a, b]) {
    Object.defineProperty(glyph, 'canonical_name', { get() { throw new Error('name access forbidden'); } });
  }
  assert.deepEqual(relateGlyphs(a, b), before);
});

test('shared letters cannot connect genuinely different stored forms', () => {
  const model = observedModel();
  const different = opposite(model);
  assert.deepEqual(relateGlyphs(row('Louise', 'a', model), row('Louis', 'b', different)), []);
  assert.deepEqual(relateGlyphs(row('Louise', 'a', model), row('LOUISE', 'b', different)), []);
  assert.deepEqual(relateGlyphs(row('민준', 'a', model), row('민수', 'b', different)), []);
});

test('different writing systems connect when the stored morphology matches', () => {
  const model = observedModel();
  const related = structuredClone(model);
  related.clusters[0].ang += 0.01;
  related.harmonics[0].phase += 0.015;
  related.pressure[0].phase += 0.02;
  related.inkLoads[0].ang += 0.01;
  const relations = relateGlyphs(row('Louise', 'latin', model), row('明月', 'cjk', related));
  assert.equal(relations.length, 1);
  assert.equal(relations[0].relationType, 'FORM');
  assert.equal(relations[0].components.level, 'whole-form');
  assert.ok(relations[0].score >= MORPHOLOGY_THRESHOLDS.wholeScore);
});

test('harmonic phase/amplitude, opening width and branch direction affect the actual score', () => {
  const model = observedModel();
  const phase = structuredClone(model);
  phase.harmonics[0].phase += Math.PI;
  assert.ok(form(model, phase).components.harmonicSim < 1e-10);
  const amplitude = structuredClone(model);
  amplitude.harmonics[0].amp *= 0.2;
  assert.ok(form(model, amplitude).components.harmonicSim < 0.4);
  const gap = structuredClone(model);
  gap.gap.half *= 3;
  assert.ok(form(model, gap).components.gapSim < 0.8);
  assert.notEqual(form(model, gap).components.level, 'whole-form');
  const direction = structuredClone(model);
  direction.clusters[0].dirBias *= -1;
  assert.ok(form(model, direction).components.clusterScore < 1);
  assert.notEqual(form(model, direction).components.level, 'whole-form');
  assert.ok(!form(model, direction).components.observations.some((observation) => observation.kind === 'branch'));
  for (const changed of [phase, amplitude, gap, direction]) assert.ok(form(model, changed).score < 1);
});

test('branch assignment and harmonic frequency order are not shape features', () => {
  const model = buildArchiveModel('Louise');
  const reordered = structuredClone(model);
  reordered.clusters.reverse();
  reordered.harmonics.reverse();
  assert.equal(form(model, reordered).score, 1);
  assert.equal(form(model, reordered).components.level, 'whole-form');
});

test('a distinctive branch motif does not inflate low whole-form similarity', () => {
  const model = observedModel();
  const related = opposite(model, { keepBranch: true });
  const result = form(model, related);
  assert.equal(result.pass, true);
  assert.equal(result.components.level, 'shared-motif');
  assert.equal(result.components.motifKind, 'branch');
  assert.equal(result.components.motifScore, 1);
  assert.ok(result.score < 0.6);
  assert.equal(result.score, result.components.wholeScore);
  assert.equal(result.components.observations[0].kind, 'branch');
  assert.equal(result.components.observations[0].anchorA.clusterIndex, 0);
  assert.equal(result.components.observations[0].anchorB.clusterIndex, 0);
  assert.ok(!result.components.observations[0].reason.includes('전체'));
});

test('local branch thresholds use actual angles, exact spikes/direction and bounded shape differences', () => {
  const model = observedModel();
  const baseline = opposite(model, { keepBranch: true });
  const boundary = structuredClone(baseline);
  boundary.clusters[0].ang += MORPHOLOGY_THRESHOLDS.motifBranchAngle - 1e-7;
  assert.equal(form(model, boundary).pass, true);
  for (const change of [
    (m) => { m.clusters[0].ang += MORPHOLOGY_THRESHOLDS.motifBranchAngle + 1e-7; },
    (m) => { m.clusters[0].spikeN += 1; },
    (m) => { m.clusters[0].dirBias *= -1; },
    (m) => { m.clusters[0].I *= MORPHOLOGY_THRESHOLDS.motifIntensityRatio - 0.01; },
    (m) => { m.clusters[0].coneSpread += MORPHOLOGY_THRESHOLDS.motifConeDifference + 0.01; },
  ]) {
    const changed = structuredClone(baseline);
    change(changed);
    assert.equal(form(model, changed).pass, false);
  }
});

test('non-rendered branch type labels cannot alter particles, score, observations or VARIANT', () => {
  const model = observedModel();
  const related = opposite(model, { keepBranch: true });
  const a = row('A', 'a', model);
  const b = row('B', 'b', related);
  const before = relateGlyphs(a, b);
  const particles = generateParticles(related, true);
  related.clusters[0].type = 'hook';
  assert.deepEqual(generateParticles(related, true), particles);
  assert.deepEqual(relateGlyphs(a, b), before);
  assert.ok(before[0].components.matchedClusters.every((pair) => !('typeA' in pair) && !('typeB' in pair)));
  const withHook = structuredClone(model);
  withHook.questionHook = { ang: 1.2, curl: 1, len: 28 };
  const variantBefore = relateGlyphs(a, row('가', 'question', withHook));
  withHook.clusters[0].type = 'wisp';
  assert.deepEqual(relateGlyphs(a, row('가', 'question', withHook)), variantBefore);
  assert.equal(variantBefore[0].relationType, 'VARIANT');
});

test('opening plus a matching actual ink profile is an independent two-feature motif', () => {
  const model = observedModel();
  const related = opposite(model, { keepOpeningInk: true });
  const result = form(model, related);
  assert.equal(result.pass, true);
  assert.equal(result.components.level, 'shared-motif');
  assert.equal(result.components.motifKind, 'opening-ink');
  assert.deepEqual(result.components.observations.map((observation) => observation.kind), ['opening', 'ink']);
  assert.equal(result.components.inkScore, 1);
  assert.equal(result.components.observations[0].anchorA.half, model.gap.half);
  assert.equal(result.components.observations[1].profile, 'pressure');
  const noOpeningA = structuredClone(model); const noOpeningB = structuredClone(related);
  noOpeningA.gap = null; noOpeningB.gap = null;
  assert.equal(form(noOpeningA, noOpeningB).pass, false, 'a closed ring is not positive opening evidence');
  const broadOpening = structuredClone(related);
  broadOpening.gap.half /= 2;
  assert.equal(form(model, broadOpening).pass, false);
  const differentPressure = structuredClone(related);
  differentPressure.pressure[0].phase += Math.PI;
  assert.equal(form(model, differentPressure).pass, false, 'an opening without strong ink agreement cannot form this motif');
});

test('a generic circle or equal strand count cannot form an edge', () => {
  const model = observedModel();
  model.clusters = [];
  model.harmonics = [];
  model.pressure = [];
  model.inkLoads = [];
  model.dropZones = [];
  model.gap = null;
  model.main = null;
  const other = structuredClone(model);
  other.meta.hash += 1;
  const result = form(model, other);
  assert.equal(result.components.strandSim, 1);
  assert.equal(result.pass, false);
  assert.deepEqual(result.components.observations, []);
  assert.deepEqual(relateGlyphs(row('A', 'a', model), row('A', 'b', other)), []);
});

test('observations contain exact matching anchors and actual ring/pressure extrema', () => {
  const model = observedModel();
  const relation = relateGlyphs(row('A', 'a', model), row('가', 'b', structuredClone(model)))[0];
  assert.equal(relation.evidence.basis, 'rendered-form');
  assert.equal(relation.evidence.level, 'whole-form');
  assert.deepEqual(relation.reasons, relation.components.observations.map((observation) => observation.reason));
  assert.deepEqual(relation.evidence.observations, relation.components.observations);
  assert.deepEqual(relation.components.observations.map((o) => o.kind), ['branch', 'opening', 'ink', 'ring']);
  for (const observation of relation.components.observations) {
    assert.ok(observation.similarity >= 0 && observation.similarity <= 1);
    for (const anchor of [observation.anchorA, observation.anchorB]) {
      assert.ok(Number.isFinite(anchor.ang) && anchor.ang >= 0 && anchor.ang < Math.PI * 2);
    }
  }
  const ring = relation.components.observations.find((observation) => observation.kind === 'ring');
  assert.ok(Math.abs(ring.anchorA.ang - Math.PI / 2) < 1e-5);
  const ringDerivative = model.harmonics.reduce((sum, h) => sum + h.k * h.amp * Math.cos(h.k * ring.anchorA.ang + h.phase), 0);
  assert.ok(Math.abs(ringDerivative) < 1e-6);
  const ink = relation.components.observations.find((observation) => observation.kind === 'ink');
  const wrappedZero = Math.min(ink.anchorA.ang, Math.PI * 2 - ink.anchorA.ang);
  assert.ok(wrappedZero < 1e-5);
  assert.notEqual(ink.anchorA.ang, model.ring.weightCenterAngle, 'metadata quadrant is not measured ink density');
  assert.ok(ink.reason.includes('필압'));
});

test('VARIANT compares actual body and rendering seed, independent of source text and version labels', () => {
  const plain = row('Louise', 'plain');
  const question = row('Louise?', 'question');
  const result = relateGlyphs(plain, question);
  assert.equal(result.length, 1);
  assert.equal(result[0].relationType, 'VARIANT');
  assert.equal(result[0].evidence.basis, 'rendered-variant');
  assert.equal(result[0].components.level, 'whole-form');
  assert.equal(result[0].components.observations[0].kind, 'question');
  assert.equal(result[0].components.observations[0].hookPresentA, false);
  assert.equal(result[0].components.observations[0].hookPresentB, true);
  assert.deepEqual(result[0].reasons, result[0].components.observations.map((observation) => observation.reason));
  assert.ok(!result[0].reasons[0].includes('이름'));
  question.encoder_version = 500;
  question.canonical_name = '全く違う名前';
  assert.equal(relateGlyphs(plain, question)[0].relationType, 'VARIANT');
  question.model_data.meta.hash += 1;
  assert.ok(!relateGlyphs(plain, question).some((relation) => relation.relationType === 'VARIANT'));
  const changedBody = row('Louise?', 'changed');
  changedBody.model_data.strands[0].off += 0.01;
  assert.ok(!relateGlyphs(plain, changedBody).some((relation) => relation.relationType === 'VARIANT'));
  assert.deepEqual(relateGlyphs(plain, { ...question, id: plain.id }), [], 'the same public record excludes itself');
});

test('only FORM/VARIANT are returned and cached vectors or semantic copy cannot enter the graph', () => {
  const savedModel = buildModel(encode('historic rendering'));
  const a = row('Louise', 'a', savedModel);
  const b = row('Louis', 'b', structuredClone(savedModel));
  a.feature_vector = { harmonics: [], clusters: [], forged: true };
  b.feature_vector = null;
  a.context_tags = ['가족', '기억']; b.context_tags = ['가족', '기억'];
  const original = JSON.stringify([a, b]);
  const relations = relateGlyphs(a, b);
  assert.deepEqual(relations.map((relation) => relation.relationType), ['FORM']);
  assert.equal(relations[0].score, 1);
  assert.equal(relations[0].algorithmVersion, 3);
  assert.equal(RELATION_ALGORITHM_VERSION, 3);
  assert.equal(JSON.stringify([a, b]), original);
  for (const type of ['ECHO', 'CONTAINS', 'CONTEXT', 'SAME', 'UNKNOWN']) {
    assert.deepEqual(buildRelationReasons(type, { sharedGraphemes: ['민'], sharedTags: ['가족'] }), []);
  }
});

test('malformed numeric fields and unbounded model arrays fail before scoring', () => {
  for (const change of [
    (m) => { m.harmonics[0].phase = NaN; },
    (m) => { m.gap = { ang: 0, half: Infinity }; },
    (m) => { m.clusters[0].spikeN = 1000000; },
    (m) => { m.pressure = Array(1000).fill(m.pressure[0]); },
  ]) {
    const model = observedModel();
    change(model);
    assert.throws(() => extractGlyphFeatures(model), TypeError);
  }
  assert.throws(() => relateGlyphs({ id: 'bad', model_data: {} }, row('Louise')), TypeError);
});
