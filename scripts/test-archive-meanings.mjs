import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MEANING_VERSION, MORPHOLOGY_VERSION, MEANING_BASE_IDS, MEANING_MODIFIER_IDS,
  MEANING_CATALOG, meaningTitle,
} from '../src/data/heptapodMeaningCatalog.js';
import { buildArchiveModel } from '../src/utils/heptapod/archiveGlyph.js';
import { extractGlyphFeatures } from '../src/utils/heptapod/extractGlyphFeatures.js';
import { classifyGlyphMorphology } from '../src/utils/heptapod/classifyGlyphMorphology.js';
import { interpretGlyphMeaning, compareGlyphMeanings } from '../src/utils/heptapod/interpretGlyphMeaning.js';
import { groupArchiveMeanings, computeArchiveMeanings } from '../src/utils/heptapod/groupArchiveMeanings.js';

const rad = (degrees) => degrees * Math.PI / 180;
const uuid = (number) => `00000000-0000-0000-0000-${number.toString(16).padStart(12, '0')}`;
const clone = (value) => structuredClone(value);
const seed = buildArchiveModel('Louise');
const catalogIds = [...MEANING_BASE_IDS, ...MEANING_MODIFIER_IDS];

// Synthetic classification witnesses, NOT claims about encoder reachability.
function model({ angles = [0], directions = [1], open = false, peaks = 1 } = {}) {
  const result = clone(seed);
  result.clusters = angles.map((ang, index) => ({
    ...seed.clusters[0], ang: rad(ang), dirBias: directions[index] ?? directions[0],
  }));
  result.main = result.clusters[0] || null;
  result.gap = open ? { ang: rad(90), half: rad(2) } : null;
  result.inkLoads = Array.from({ length: peaks }, (_, index) => ({
    ang: index * Math.PI, width: 0.1, strength: 1,
  }));
  result.questionHook = null;
  return result;
}
const row = (number, modelData = model(), isPublic = true) => ({
  id: uuid(number), is_public: isPublic, name: `표시 이름 ${number}`, model_data: modelData,
});

function assertAnchors(interpretation, source) {
  const features = extractGlyphFeatures({ ...source, questionHook: null });
  assert.deepEqual(interpretation.observations.map((observation) => observation.meaningId), interpretation.meaningIds);
  for (const observation of interpretation.observations) {
    assert.ok(observation.anchors.length > 0);
    assert.equal(typeof observation.reason, 'string');
    for (const anchor of observation.anchors) {
      assert.ok(Number.isFinite(anchor.ang) && anchor.ang >= 0 && anchor.ang < Math.PI * 2);
      if (anchor.kind === 'branch') {
        assert.equal(anchor.ang, features.clusters[anchor.clusterIndex].ang);
      } else if (anchor.kind === 'opening') {
        assert.equal(anchor.ang, features.gap.ang);
        assert.equal(anchor.half, features.gap.half);
      } else {
        assert.equal(anchor.kind, 'ink');
        assert.ok(features.inkPeaks.some((peak) => peak.ang === anchor.ang));
      }
    }
  }
}

test('versioned catalog has six stable meanings and a canonical title order', () => {
  assert.equal(MEANING_VERSION, 1);
  assert.equal(MORPHOLOGY_VERSION, 1);
  assert.equal(catalogIds.length, 6);
  assert.deepEqual(Object.keys(MEANING_CATALOG), catalogIds);
  assert.equal(meaningTitle(['trace', 'arrival', 'trace', 'unknown', 'openness']), '도래 · 여백 · 잔향');
  assert.equal(meaningTitle([]), '미확인');
  assert.equal(meaningTitle(null), '미확인');
});

test('conditional morphology space has 44 classes with 1–2 focuses, 80 with 3; not encoder reachability', () => {
  const keysByCount = new Map();
  const arrangements = { 1: [[0]], 2: [[0, 60], [0, 180], [0, 120]],
    3: [[0, 30, 60], [0, 90, 180], [0, 120, 240]] };
  for (const count of [1, 2, 3]) {
    const keys = new Set();
    const directionSets = [Array(count).fill(1), Array(count).fill(-1)];
    if (count > 1) directionSets.push([1, ...Array(count - 1).fill(-1)]);
    for (const angles of arrangements[count]) for (const directions of directionSets) {
      for (const open of [false, true]) for (const peaks of [1, 2]) {
        const classified = classifyGlyphMorphology(model({ angles, directions, open, peaks }));
        assert.equal(classified.status, 'complete');
        assert.equal(classified.inkPeakCount, peaks);
        keys.add(classified.morphologyKey);
      }
    }
    keysByCount.set(count, keys);
  }
  assert.equal(keysByCount.get(1).size, 8);
  assert.equal(keysByCount.get(2).size, 36);
  assert.equal(keysByCount.get(3).size, 36);
  assert.equal(new Set([...keysByCount.get(1), ...keysByCount.get(2)]).size, 44);
  assert.equal(new Set([...keysByCount.values()].flatMap((set) => [...set])).size, 80);
});

test('conditional meaning space has exactly 24 stable composite keys and only observed groups', () => {
  const rows = [];
  const keys = new Set();
  for (const directions of [[1, 1], [-1, -1], [1, -1]]) {
    for (const simultaneous of [false, true]) for (const open of [false, true]) {
      for (const peaks of [1, 2]) {
        const source = model({ angles: simultaneous ? [0, 180] : [0, 60], directions, open, peaks });
        const meaning = interpretGlyphMeaning(source);
        assert.equal(meaning.modifiers.simultaneity, simultaneous);
        assert.equal(meaning.modifiers.openness, open);
        assert.equal(meaning.modifiers.trace, peaks === 2);
        assert.match(meaning.meaningKey, /^meaning-v1:(arrival|reception|reciprocity):/);
        assertAnchors(meaning, source);
        keys.add(meaning.meaningKey);
        rows.push(row(rows.length + 1, source));
      }
    }
  }
  assert.equal(keys.size, 24);
  const grouped = groupArchiveMeanings(rows);
  assert.equal(grouped.groups.length, 24);
  assert.ok(grouped.groups.every((group) => group.memberIds.length === 1));
  assert.equal(groupArchiveMeanings(rows.slice(0, 1)).groups.length, 1);
  assert.equal(groupArchiveMeanings([]).groups.length, 0);
});

test('circular arrangement uses the minimum covering arc and exact 90/150 degree boundaries', () => {
  const cases = [
    [[0], 'single', false], [[355, 5], 'near', false], [[0, 90], 'near', false],
    [[0, 90.00001], 'distributed', false], [[0, 149.99999], 'distributed', false],
    [[0, 150], 'opposed', true], [[0, 150.00001], 'opposed', true],
    [[0, 120, 240], 'distributed', false], [[0, 90, 180], 'opposed', true],
    [[-5, 5, 40], 'near', false], [[10, 160, 250], 'opposed', true],
  ];
  for (const [angles, arrangement, opposed] of cases) {
    const result = classifyGlyphMorphology(model({ angles }));
    assert.equal(result.arrangement, arrangement, JSON.stringify(angles));
    assert.equal(result.hasOpposedPair, opposed, JSON.stringify(angles));
  }
  const aroundZero = classifyGlyphMorphology(model({ angles: [355, 5] }));
  assert.ok(Math.abs(aroundZero.minimumCoveringArc - rad(10)) < 1e-12);
  const reversed = classifyGlyphMorphology(model({ angles: [5, 355] }));
  assert.equal(reversed.morphologyKey, aroundZero.morphologyKey);
});

test('zero focuses/ink peaks are partial unknowns, not false values or fabricated observations', () => {
  const noFocus = interpretGlyphMeaning(model({ angles: [], open: true, peaks: 2 }));
  assert.equal(noFocus.status, 'partial');
  assert.equal(noFocus.baseMeaning, null);
  assert.equal(noFocus.modifiers.simultaneity, null);
  assert.equal(noFocus.meaningKey, null);
  assert.equal(noFocus.morphology.direction, null);
  assert.equal(noFocus.morphology.arrangement, null);
  assert.deepEqual(noFocus.meaningIds, ['openness', 'trace']);
  assert.ok(noFocus.observations.every((observation) => observation.anchors.every((anchor) => anchor.kind !== 'branch')));
  const noInk = interpretGlyphMeaning(model({ peaks: 0 }));
  assert.equal(noInk.status, 'partial');
  assert.equal(noInk.modifiers.trace, null);
  assert.equal(noInk.morphology.ink, null);
  assert.equal(noInk.morphology.inkPeakCount, 0);
  assert.equal(noInk.modifiers.simultaneity, false);
  assert.equal(noInk.modifiers.openness, false);
  assert.deepEqual(noInk.meaningIds, ['arrival']);
  const none = interpretGlyphMeaning(model({ angles: [], peaks: 0 }));
  assert.deepEqual(none.meaningIds, []);
  assert.deepEqual(none.observations, []);
  assert.equal(none.status, 'partial');
});

test('invalid models are safe states with no anchors, meanings or keys', () => {
  const malformed = model();
  malformed.clusters[0].ang = Number.NaN;
  const excessive = model();
  excessive.clusters = Array(4).fill(excessive.clusters[0]);
  const badGap = model();
  badGap.gap = { ang: 1, half: 0 };
  for (const source of [undefined, null, 12, '', [], {}, malformed, excessive, badGap]) {
    const result = interpretGlyphMeaning(source);
    assert.equal(result.status, 'invalid');
    assert.equal(result.meaningKey, null);
    assert.equal(result.baseMeaning, null);
    assert.deepEqual(result.modifiers, { simultaneity: null, openness: null, trace: null });
    assert.deepEqual(result.meaningIds, []);
    assert.deepEqual(result.observations, []);
  }
});

test('names, metadata labels, cached features, question hooks and unused branch types do not affect meaning', () => {
  const source = model({ angles: [0, 180], directions: [1, -1], open: true, peaks: 2 });
  const changed = clone(source);
  changed.meta.name = '전혀 다른 이름';
  changed.meta.canonicalName = 'different';
  changed.name = 'same letters are irrelevant';
  changed.tags = ['personality'];
  changed.feature_vector = { inkPeaks: [], direction: 'inward' };
  changed.contourLineage = { label: 'invented' };
  changed.clusters.forEach((cluster) => { cluster.type = 'not-rendered'; });
  changed.main = { ...changed.main, type: 'unknown' };
  changed.questionHook = { intentionally: 'invalid but not part of body reading' };
  assert.deepEqual(classifyGlyphMorphology(changed), classifyGlyphMorphology(source));
  assert.deepEqual(interpretGlyphMeaning(changed), interpretGlyphMeaning(source));
  for (const name of ['Louise', '이안', '明月']) {
    assert.deepEqual(interpretGlyphMeaning(buildArchiveModel(name)), interpretGlyphMeaning(buildArchiveModel(`${name}?`)));
  }
});

test('confirmed shared readings retain each model’s actual independent anchors without precision scores', () => {
  const a = model({ angles: [0, 180], directions: [1, -1], open: true, peaks: 2 });
  const b = model({ angles: [30, 190, 310], directions: [-1, 1, 1], open: true, peaks: 2 });
  b.gap.ang = rad(70);
  b.inkLoads.forEach((load) => { load.ang += rad(30); });
  const beforeA = clone(a);
  const beforeB = clone(b);
  const comparison = compareGlyphMeanings(a, b);
  assert.equal(comparison.exactMeaningMatch, true);
  assert.notEqual(comparison.left.morphology.morphologyKey, comparison.right.morphology.morphologyKey);
  assert.deepEqual(comparison.sharedMeaningIds, ['reciprocity', 'simultaneity', 'openness', 'trace']);
  assert.equal(comparison.left.reading, comparison.right.reading);
  assertAnchors(comparison.left, a);
  assertAnchors(comparison.right, b);
  for (const observation of comparison.observations) {
    assert.notDeepEqual(observation.anchorsA, observation.anchorsB);
    assert.deepEqual(observation.anchorsA, comparison.left.observations.find((item) => item.meaningId === observation.meaningId).anchors);
    assert.deepEqual(observation.anchorsB, comparison.right.observations.find((item) => item.meaningId === observation.meaningId).anchors);
    assert.equal('score' in observation, false);
    assert.equal('type' in observation, false);
  }
  assert.equal('score' in comparison, false);
  assert.equal('relations' in comparison, false);
  const reversed = compareGlyphMeanings(b, a);
  assert.deepEqual(reversed.sharedMeaningIds, comparison.sharedMeaningIds);
  assert.equal(reversed.exactMeaningMatch, true);
  assert.deepEqual(reversed.observations[0].anchorsA, comparison.observations[0].anchorsB);
  assert.deepEqual(a, beforeA);
  assert.deepEqual(b, beforeB);
});

test('partial matching shares only confirmed meanings, never an exact composite or unknown modifier', () => {
  const partial = model({ peaks: 0 });
  const comparison = compareGlyphMeanings(partial, model());
  assert.equal(comparison.exactMeaningMatch, false);
  assert.deepEqual(comparison.sharedMeaningIds, ['arrival']);
  assert.equal(compareGlyphMeanings(partial, partial).exactMeaningMatch, false);
  const distinct = compareGlyphMeanings(model(), model({ directions: [-1] }));
  assert.deepEqual(distinct.sharedMeaningIds, []);
  assert.deepEqual(distinct.observations, []);
  const invalid = compareGlyphMeanings({}, model());
  assert.deepEqual(invalid.sharedMeaningIds, []);
  assert.deepEqual(invalid.observations, []);
  assert.equal(invalid.exactMeaningMatch, false);
});

test('public UUID sample is deduplicated before cap and sorting; invalid models stay counted', () => {
  const rows = [
    row(4, null), row(2, model({ peaks: 0 })), row(3), row(1), row(1, null), row(4),
    row(5, model(), false), { ...row(6), id: 'local-private-id' },
    { ...row(7), is_public: 'true' }, { ...row(8), id: '__proto__' },
  ];
  const result = groupArchiveMeanings(rows);
  assert.equal(result.sampleSize, 4);
  assert.equal(result.analyzedCount, 3);
  assert.equal(result.sampleLimit, 200);
  assert.equal(result.sampleTruncated, false);
  assert.equal(result.sampleAtLimit, false);
  assert.deepEqual(Object.keys(result.interpretations), [uuid(1), uuid(2), uuid(3), uuid(4)]);
  assert.deepEqual(result.partialIds, [uuid(2)]);
  assert.deepEqual(result.invalidIds, [uuid(4)]);
  assert.equal(result.groups.length, 1);
  assert.deepEqual(result.groups[0].memberIds, [uuid(1), uuid(3)]);
  assert.deepEqual(result.families.map((family) => family.id), catalogIds);
  assert.deepEqual(result.families.find((family) => family.id === 'arrival').memberIds, [uuid(1), uuid(2), uuid(3)]);
  assert.deepEqual(result.families.find((family) => family.id === 'trace').memberIds, []);
  assert.equal(result.morphologyGroups.length, 1);
  assert.deepEqual(result.morphologyGroups[0].memberIds, [uuid(1), uuid(3)]);
  assert.equal('meaningIds' in result.morphologyGroups[0], false);
});

test('sample limit metadata distinguishes exactly 200 from a truncated input and selects before ID sort', () => {
  const source = model();
  const rows = Array.from({ length: 201 }, (_, i) => row(201 - i, source));
  const exact = groupArchiveMeanings(rows.slice(0, 200));
  const extra = groupArchiveMeanings(rows);
  assert.equal(exact.sampleAtLimit, true);
  assert.equal(exact.sampleTruncated, false);
  assert.equal(extra.sampleAtLimit, true);
  assert.equal(extra.sampleTruncated, true);
  assert.equal(extra.sampleSize, 200);
  assert.equal(extra.interpretations[uuid(1)], undefined);
  assert.ok(extra.interpretations[uuid(201)]);
  assert.deepEqual(Object.keys(extra.interpretations), Object.keys(extra.interpretations).sort());
  assert.equal(groupArchiveMeanings([...rows.slice(0, 200), rows[0]]).sampleTruncated, false);
});

test('group identities, canonical readings and membership are stable and serializable', () => {
  const rows = [row(8), row(2, model({ angles: [10, 50] })),
    row(4, model({ angles: [0, 180], open: true, peaks: 2, directions: [-1] }))];
  const before = clone(rows);
  const result = groupArchiveMeanings(rows);
  assert.deepEqual(groupArchiveMeanings([...rows].reverse()), result);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.deepEqual(rows, before);
  const allMembers = result.groups.flatMap((group) => group.memberIds);
  assert.equal(allMembers.length, 3);
  assert.equal(new Set(allMembers).size, 3);
  const firstGroup = result.groups.find((group) => group.memberIds.includes(uuid(8)));
  assert.deepEqual(firstGroup.memberIds, [uuid(2), uuid(8)]);
  const added = groupArchiveMeanings([...rows, { ...row(9), name: 'renamed' }]);
  const expanded = added.groups.find((group) => group.id === firstGroup.id);
  assert.equal(expanded.reading, firstGroup.reading);
  assert.equal(expanded.title, firstGroup.title);
  assert.equal(expanded.memberIds.length, 3);
});

test('actual generated sample reports observed classes, never pads to 24/44/80', () => {
  const names = ['Louise', 'Abbott', 'Costello', 'Arrival', '이안', '서연', '안녕', 'A', 'B', 'C'];
  const result = groupArchiveMeanings(names.map((name, index) => row(index + 1, buildArchiveModel(name))));
  assert.equal(result.sampleSize, names.length);
  assert.ok(result.analyzedCount > 0);
  assert.ok(result.groups.length <= names.length);
  assert.ok(result.morphologyGroups.length <= names.length);
  assert.ok(result.groups.every((group) => group.memberIds.length > 0));
});

test('async local computation matches sync and aborts before and during cooperative work', async () => {
  const rows = Array.from({ length: 30 }, (_, index) => row(index + 1));
  assert.deepEqual(await computeArchiveMeanings(rows), groupArchiveMeanings(rows));
  assert.deepEqual(await computeArchiveMeanings([]), groupArchiveMeanings([]));
  const before = new AbortController();
  before.abort();
  await assert.rejects(computeArchiveMeanings(rows, { signal: before.signal }), { name: 'AbortError' });
  const during = new AbortController();
  const pending = computeArchiveMeanings(rows, { signal: during.signal });
  queueMicrotask(() => during.abort());
  await assert.rejects(pending, { name: 'AbortError' });
  // Input scanning also yields even if no row is eligible for interpretation.
  const privateOnly = new AbortController();
  const scanning = computeArchiveMeanings(Array(1000).fill(row(1, null, false)), { signal: privateOnly.signal });
  queueMicrotask(() => privateOnly.abort());
  await assert.rejects(scanning, { name: 'AbortError' });
  assert.throws(() => groupArchiveMeanings(null), TypeError);
  await assert.rejects(computeArchiveMeanings(null), TypeError);
});
