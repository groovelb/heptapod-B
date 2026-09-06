import test from 'node:test';
import assert from 'node:assert/strict';
import { ARCHIVE_FAMILY_SYMBOLS, getArchiveFamilySymbol } from '../src/data/archiveFamilySymbols.js';
import { MEANING_BASE_IDS } from '../src/data/heptapodMeaningCatalog.js';
import { isRenderableGlyphModel } from '../src/utils/heptapod/extractGlyphFeatures.js';
import { interpretGlyphMeaning } from '../src/utils/heptapod/interpretGlyphMeaning.js';
import { groupArchiveMeanings } from '../src/utils/heptapod/groupArchiveMeanings.js';
import { generateParticles, SIZE0 } from '../src/utils/heptapod/logogramParticles.js';

test('each authored symbol reads only as its intended base, not a modifier combination', () => {
  assert.deepEqual(Object.keys(ARCHIVE_FAMILY_SYMBOLS), MEANING_BASE_IDS);
  for (const id of MEANING_BASE_IDS) {
    const { model } = getArchiveFamilySymbol(id);
    assert.ok(isRenderableGlyphModel(model));
    const reading = interpretGlyphMeaning(model);
    assert.equal(reading.status, 'complete');
    assert.equal(reading.baseMeaning, id);
    assert.deepEqual(reading.meaningIds, [id]);
    assert.deepEqual(reading.modifiers, { simultaneity: false, openness: false, trace: false });
  }
});

test('only branch direction differs: texture, outline and focus positions are shared', () => {
  const models = MEANING_BASE_IDS.map((id) => structuredClone(getArchiveFamilySymbol(id).model));
  const normalize = (model) => ({ ...model, main: null, clusters: model.clusters.map((cluster) => ({ ...cluster, dirBias: 1 })) });
  assert.deepEqual(normalize(models[0]), normalize(models[1]));
  assert.deepEqual(normalize(models[0]), normalize(models[2]));
  assert.ok(models[0].clusters.every((cluster) => cluster.dirBias === 1));
  assert.ok(models[1].clusters.every((cluster) => cluster.dirBias === -1));
  assert.equal(new Set(models[2].clusters.map((cluster) => cluster.dirBias)).size, 2);
});

test('real shared particle geometry is finite, distinct, bounded and deterministic', () => {
  const fingerprints = [];
  for (const id of MEANING_BASE_IDS) {
    const model = getArchiveFamilySymbol(id).model;
    const built = generateParticles(model);
    const ink = built.particles.filter((particle) => particle.kind !== 'wisp');
    assert.ok(ink.length > 1000 && ink.length < 10000);
    assert.ok(ink.every((p) => [p.x, p.y, p.r, p.a].every(Number.isFinite)));
    assert.ok(ink.every((p) => p.x - p.r >= 0 && p.x + p.r <= SIZE0 && p.y - p.r >= 0 && p.y + p.r <= SIZE0));
    assert.deepEqual(generateParticles(model), built);
    assert.ok(built.totalMs > 0);
    assert.ok(generateParticles(model, true).particles.every((p) => p.t0 === 0 && p.dur === 1));
    fingerprints.push(JSON.stringify(ink.map((p) => [p.x, p.y])));
  }
  assert.equal(new Set(fingerprints).size, 3);
});

test('symbols have no public identity and cannot enter meaning groups or counts', () => {
  const surfaces = Object.values(ARCHIVE_FAMILY_SYMBOLS).map((symbol) => symbol.surface);
  for (const surface of surfaces) {
    assert.equal(surface.id, undefined);
    assert.equal(surface.is_public, undefined);
    assert.equal(surface.model_data.meta.name, undefined);
    assert.equal(surface.model_data.meta.kind, 'family-symbol');
    assert.ok(Object.isFrozen(surface.model_data.clusters[0]));
  }
  assert.equal(groupArchiveMeanings(surfaces).sampleSize, 0);
  assert.deepEqual(groupArchiveMeanings(surfaces).groups, []);
  assert.equal(getArchiveFamilySymbol('not-a-family'), null);
  assert.equal(getArchiveFamilySymbol('__proto__'), null);
});
