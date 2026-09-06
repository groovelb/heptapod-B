/** Node only. Synthetic shape edits below are test fixtures, never archive data. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { clusterArchiveGlyphs, computeArchiveClusters } from '../src/utils/heptapod/clusterArchiveGlyphs.js';
import { compareBranchMorphology, scoreFormRelation } from '../src/utils/heptapod/scoreFormRelation.js';
import { extractGlyphFeatures } from '../src/utils/heptapod/extractGlyphFeatures.js';
import { readArchiveClusters, createApiClusterProvider } from '../src/lib/archiveClusters.js';
import { readArchiveGlyphs } from '../src/lib/archiveClient.js';
import { ARCHIVE_STORY_GLYPHS, createArchiveStoryClient } from '../src/test-fixtures/archiveClient.js';

const fixture = (index, degrees = [0]) => {
  const row = structuredClone(ARCHIVE_STORY_GLYPHS[0]);
  row.id = `synthetic-${index}`;
  row.model_data.clusters = degrees.map((value) => ({ ...row.model_data.clusters[0], ang: value * Math.PI / 180,
    dirBias: 1, spikeN: 8, I: 0.8, coneSpread: 0.4 }));
  return row;
};
const branchGroups = (result) => result.groups.filter((group) => group.kind === 'branch');

test('real encoder fixtures produce an evidenced Louise/Hannah branch group', () => {
  const result = clusterArchiveGlyphs(ARCHIVE_STORY_GLYPHS);
  const group = branchGroups(result).find((item) => item.members.some((member) => member.glyphId === ARCHIVE_STORY_GLYPHS[1].id));
  assert.ok(group);
  assert.ok(group.members.some((member) => member.glyphId === ARCHIVE_STORY_GLYPHS[0].id));
  assert.ok(!group.members.some((member) => member.glyphId === ARCHIVE_STORY_GLYPHS[8].id));
});
test('A–B–C angular chain never becomes a three-member branch group', () => {
  const result = clusterArchiveGlyphs([fixture(1, [0]), fixture(2, [10]), fixture(3, [20])]);
  assert.equal(branchGroups(result).length, 2);
  assert.ok(branchGroups(result).every((group) => group.members.length === 2));
  assert.equal(result.memberships['synthetic-2'].filter((id) => id.includes('branch')).length, 2);
});
test('same kind but different features on the bridging glyph cannot be merged', () => {
  const groups = branchGroups(clusterArchiveGlyphs([fixture(1, [0]), fixture(2, [0, 180]), fixture(3, [180])]));
  assert.equal(groups.length, 2);
  assert.ok(groups.every((group) => group.members.length === 2));
});
test('a triangle of pairwise matches on different branches is not a common motif', () => {
  const groups = branchGroups(clusterArchiveGlyphs([fixture(1, [0, 180]), fixture(2, [0, 90]), fixture(3, [90, 180])]));
  assert.equal(groups.length, 3);
  assert.ok(groups.every((group) => group.members.length === 2));
});
test('a genuine shared branch forms one group of three', () => {
  const groups = branchGroups(clusterArchiveGlyphs([fixture(1, [0]), fixture(2, [5]), fixture(3, [10])]));
  assert.equal(groups.length, 1);
  assert.equal(groups[0].members.length, 3);
  assert.equal(groups[0].pairCount, 3);
});
test('circular angle seam is compared without bins', () => {
  assert.equal(branchGroups(clusterArchiveGlyphs([fixture(1, [355]), fixture(2, [5])])).length, 1);
});
test('all pairs and fixed branch anchors independently satisfy the original gate', () => {
  const rows = [fixture(1, [0, 180]), fixture(2, [5, 185]), fixture(3, [10, 190])];
  for (const group of branchGroups(clusterArchiveGlyphs(rows))) {
    for (let i = 0; i < group.members.length; i++) for (let j = i + 1; j < group.members.length; j++) {
      const a = group.members[i]; const b = group.members[j];
      const fa = extractGlyphFeatures(rows.find((row) => row.id === a.glyphId).model_data);
      const fb = extractGlyphFeatures(rows.find((row) => row.id === b.glyphId).model_data);
      assert.ok(compareBranchMorphology(fa.clusters[a.anchors[0].clusterIndex], fb.clusters[b.anchors[0].clusterIndex]).motif);
    }
  }
});
test('whole-form and local motif groups remain separate; overlapping membership is retained', () => {
  const rows = [fixture(1), fixture(2)];
  const result = clusterArchiveGlyphs(rows);
  assert.ok(result.groups.some((group) => group.kind === 'whole-form'));
  assert.ok(result.groups.some((group) => group.kind === 'branch'));
  assert.ok(result.memberships['synthetic-1'].length > 1);
  for (const group of result.groups.filter((item) => item.kind === 'whole-form')) {
    assert.equal(scoreFormRelation(...group.members.map((member) => extractGlyphFeatures(rows.find((row) => row.id === member.glyphId).model_data))).components.level, 'whole-form');
  }
});
test('renaming, raw spelling, contour labels and stored feature vectors never affect groups', () => {
  const rows = structuredClone(ARCHIVE_STORY_GLYPHS);
  const before = clusterArchiveGlyphs(rows);
  rows.forEach((row, i) => { row.canonical_name = `이름${i}`; row.display_name = '같은 철자'; row.contour_label = 'fake'; row.feature_vector = { fake: true }; });
  assert.deepEqual(clusterArchiveGlyphs(rows), before);
});
test('group IDs, representative and memberships are deterministic under input reorder', () => {
  assert.deepEqual(clusterArchiveGlyphs([...ARCHIVE_STORY_GLYPHS].reverse()), clusterArchiveGlyphs(ARCHIVE_STORY_GLYPHS));
});
test('private/duplicate/invalid rows are not phantom members or ungrouped valid glyphs', () => {
  const good = fixture(1); const hidden = { ...fixture(2), is_public: false }; const invalid = { ...fixture(3), model_data: {} };
  const result = clusterArchiveGlyphs([good, good, hidden, invalid]);
  assert.equal(result.sampleSize, 1);
  assert.deepEqual(result.invalidIds, [invalid.id]);
  assert.deepEqual(result.ungroupedIds, [good.id]);
  assert.deepEqual(result.groups, []);
});
test('plain rings with no distinct motif do not form a forced cluster', () => {
  const rows = [fixture(1, []), fixture(2, [])];
  rows.forEach((row) => { row.model_data.gap = null; row.model_data.pressure = []; row.model_data.inkLoads = []; });
  assert.deepEqual(clusterArchiveGlyphs(rows).groups, []);
});
test('representative proof is oriented to the displayed left/right models', () => {
  const result = clusterArchiveGlyphs([fixture(3, [10]), fixture(1, [0]), fixture(2, [5])]);
  for (const group of branchGroups(result)) for (const member of group.members.slice(1)) {
    const proof = member.relationToRepresentative;
    assert.equal(proof.sourceId, group.members[0].glyphId);
    assert.equal(proof.targetId, member.glyphId);
    assert.equal(proof.evidence.observations[0].anchorA.ang, group.members[0].anchors[0].ang);
    assert.equal(proof.evidence.observations[0].anchorB.ang, member.anchors[0].ang);
  }
});
test('empty input remains empty and serializable', () => {
  const result = clusterArchiveGlyphs([]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.deepEqual(result.groups, []);
});
test('cooperative async calculation equals the pure algorithm', async () => {
  let yields = 0;
  const result = await computeArchiveClusters(ARCHIVE_STORY_GLYPHS, { yieldWork: async () => { yields++; } });
  assert.ok(yields > 0);
  assert.deepEqual(result, clusterArchiveGlyphs(ARCHIVE_STORY_GLYPHS));
});
test('cancellation stops work between batches', async () => {
  const controller = new AbortController();
  await assert.rejects(computeArchiveClusters(ARCHIVE_STORY_GLYPHS, { signal: controller.signal, yieldWork: async () => controller.abort() }), { name: 'AbortError' });
});
test('default provider consumes already fetched rows without any extra client call', async () => {
  const client = createArchiveStoryClient();
  const rows = await readArchiveGlyphs(client);
  const calls = [...client.calls];
  const result = await readArchiveClusters(rows);
  assert.equal(result.computationMode, 'local');
  assert.deepEqual(client.calls, calls);
});
test('API adapter uses the same DTO and sends only public IDs/version', async () => {
  let payload;
  const expected = clusterArchiveGlyphs(ARCHIVE_STORY_GLYPHS);
  const provider = createApiClusterProvider({ invoke: async (body) => { payload = body; return expected; } });
  const result = await readArchiveClusters(ARCHIVE_STORY_GLYPHS, { provider });
  assert.deepEqual(Object.keys(payload).sort(), ['algorithmVersion', 'glyphIds']);
  assert.ok(!payload.glyphIds.includes(ARCHIVE_STORY_GLYPHS[7].id));
  assert.deepEqual(result.groups, expected.groups);
  assert.equal(result.computationMode, 'api');
});
test('stale/invalid/API-out-of-sample DTOs fail rather than fabricate local success', async () => {
  const result = clusterArchiveGlyphs(ARCHIVE_STORY_GLYPHS);
  for (const invalid of [null, { ...result, algorithmVersion: 0 }, { ...result, relationAlgorithmVersion: 2 },
    { ...result, groups: [{ id: 'fake', kind: 'branch', members: [{ glyphId: 'unknown' }, { glyphId: 'also-unknown' }] }] }]) {
    await assert.rejects(readArchiveClusters(ARCHIVE_STORY_GLYPHS, { provider: { getClusters: async () => invalid } }), /응답/);
  }
});
test('late API results are discarded after cancellation', async () => {
  const controller = new AbortController();
  await assert.rejects(readArchiveClusters([], { signal: controller.signal, provider: { getClusters: async () => { controller.abort(); return clusterArchiveGlyphs([]); } } }), { name: 'AbortError' });
});
test('sample limit is explicit and does not label unseen rows as independent', () => {
  const rows = Array.from({ length: 201 }, (_, index) => {
    const row = fixture(index, []);
    row.model_data.gap = null; row.model_data.pressure = []; row.model_data.inkLoads = [];
    return row;
  });
  const result = clusterArchiveGlyphs(rows);
  assert.equal(result.sampleSize, 200);
  assert.equal(result.comparedPairs, 19900);
  assert.equal(result.sampleTruncated, true);
  assert.ok(!result.ungroupedIds.includes(rows[200].id));
});
test('group count cap is reported, not hidden as proof of isolation', () => {
  const rows = Array.from({ length: 200 }, (_, index) => {
    const family = Math.floor(index / 2);
    const row = fixture(index, [(family % 12) * 30]);
    row.model_data.clusters[0].dirBias = Math.floor(family / 12) % 2 ? -1 : 1;
    row.model_data.clusters[0].spikeN = 6 + Math.floor(family / 24);
    return row;
  });
  const result = clusterArchiveGlyphs(rows);
  assert.equal(result.groups.length, 96);
  assert.equal(result.groupingTruncated, true);
});
test('invalid membership and orphan group references cannot reach the UI', async () => {
  const rows = ARCHIVE_STORY_GLYPHS;
  const result = clusterArchiveGlyphs(rows);
  const groupId = result.groups[0].id;
  const id = result.groups[0].members[0].glyphId;
  for (const invalid of [{ ...result, memberships: { ...result.memberships, [id]: [] } },
    { ...result, memberships: { ...result.memberships, [id]: [groupId, groupId] } },
    { ...result, ungroupedIds: [id] }, { ...result, groups: [null] }]) {
    await assert.rejects(readArchiveClusters(rows, { provider: { getClusters: async () => invalid } }), /응답/);
  }
});
