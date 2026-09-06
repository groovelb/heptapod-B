import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArchiveDepthView, EMPTY_ARCHIVE_FILTER, filterMeaningGlyphs, sampleClusterGlyphs } from '../src/utils/heptapod/archiveDepthView.js';
import { groupArchiveMeanings } from '../src/utils/heptapod/groupArchiveMeanings.js';
import { ARCHIVE_STORY_GLYPHS } from '../src/test-fixtures/archiveClient.js';
import { archiveDepthPath, parseArchiveDepthSearch } from '../src/utils/heptapod/shareArchive.js';

const glyphs = ARCHIVE_STORY_GLYPHS.filter((glyph) => glyph.is_public);
const meanings = groupArchiveMeanings(glyphs);
const baseFilter = EMPTY_ARCHIVE_FILTER;

test('entry shows only observed top-level families, never people or fabricated empty groups', () => {
  const root = buildArchiveDepthView(glyphs, meanings);
  assert.equal(root.level, 'families');
  assert.ok(root.nodes.length > 0 && root.nodes.length <= 3);
  assert.ok(root.nodes.every((node) => node.kind === 'family' && node.glyphs.length));
  for (const node of root.nodes) {
    assert.ok(node.glyphs.every((glyph) => meanings.interpretations[glyph.id].baseMeaning === node.id));
  }
  assert.deepEqual(buildArchiveDepthView([], groupArchiveMeanings([])).nodes, []);
});

test('families lead directly to their real members without a combination-group step', () => {
  const visitedMembers = new Set();
  for (const family of buildArchiveDepthView(glyphs, meanings).nodes) {
    const inside = buildArchiveDepthView(glyphs, meanings, family.filter);
    assert.equal(inside.level, 'members');
    assert.deepEqual(inside.parentFilter, baseFilter);
    assert.equal(inside.nodes.length, 0);
    assert.deepEqual(inside.glyphs.map((glyph) => glyph.id), family.glyphs.map((glyph) => glyph.id));
    for (const glyph of inside.glyphs) {
      visitedMembers.add(glyph.id);
      const focus = buildArchiveDepthView(glyphs, meanings, family.filter, glyph.id);
      assert.equal(focus.level, 'glyph');
      assert.equal(focus.focusedGlyph, glyph);
      assert.deepEqual(focus.parentFilter, family.filter);
    }
  }
  const classified = glyphs.filter((glyph) => meanings.interpretations[glyph.id].baseMeaning);
  assert.deepEqual([...visitedMembers].sort(), classified.map((glyph) => glyph.id).sort());
});

test('direct group links recover their family parent, even without a base in the URL', () => {
  const group = meanings.groups[0];
  const scene = buildArchiveDepthView(glyphs, meanings, { groupId: group.id });
  assert.equal(scene.level, 'members');
  assert.equal(scene.parentFilter.base, meanings.interpretations[group.memberIds[0]].baseMeaning);
});

test('AND and status links retain their scope at each deeper level', () => {
  const filter = { ...baseFilter, modifiers: ['openness', 'trace'] };
  const scene = buildArchiveDepthView(glyphs, meanings, filter);
  const allowed = new Set(filterMeaningGlyphs(glyphs, meanings, filter).map((glyph) => glyph.id));
  assert.equal(scene.level, 'members');
  assert.deepEqual(scene.nodes, []);
  assert.equal(scene.glyphs.length, allowed.size);
  for (const glyph of scene.glyphs) {
    const focus = buildArchiveDepthView(glyphs, meanings, filter, glyph.id);
    assert.deepEqual(focus.parentFilter.modifiers, filter.modifiers);
    assert.ok(focus.glyphs.every((member) => allowed.has(member.id)));
  }
});

test('legacy partial/invalid scopes keep original models without generating diagnostic portals', () => {
  const partialModel = structuredClone(glyphs[0].model_data);
  partialModel.inkLoads = [];
  const rows = [
    { ...glyphs[0], id: '00000000-0000-4000-8000-000000000901', model_data: partialModel },
    { ...glyphs[0], id: '00000000-0000-4000-8000-000000000902', model_data: null },
  ];
  const data = groupArchiveMeanings(rows);
  const scene = buildArchiveDepthView(rows, data);
  for (const key of ['partialCount', 'invalidCount', 'partialFilter', 'invalidFilter']) assert.equal(key in scene, false);
  assert.equal(data.groups.length, 0);
  assert.deepEqual(buildArchiveDepthView(rows, data, { status: 'partial' }).glyphs.map((glyph) => glyph.id), [rows[0].id]);
  assert.deepEqual(buildArchiveDepthView(rows, data, { status: 'invalid' }).glyphs.map((glyph) => glyph.id), [rows[1].id]);
});

test('private, duplicate, unobserved and no-longer-in-group focused IDs never leak', () => {
  const root = buildArchiveDepthView([...glyphs, glyphs[0], { ...glyphs[0], is_public: false }], meanings);
  assert.equal(root.glyphs.length, glyphs.length);
  const privateFocus = buildArchiveDepthView([{ ...glyphs[0], is_public: false }], meanings, baseFilter, glyphs[0].id);
  assert.equal(privateFocus.focusedGlyph, null);
  assert.equal(privateFocus.missingFocus, true);
  const unknown = buildArchiveDepthView(glyphs, meanings, { groupId: 'not-observed' }, glyphs[0].id);
  assert.equal(unknown.focusedGlyph, null);
  assert.deepEqual(unknown.glyphs, []);
  const group = meanings.groups.find((item) => item.memberIds.length < glyphs.length);
  const outsider = glyphs.find((glyph) => !group.memberIds.includes(glyph.id));
  assert.equal(buildArchiveDepthView(glyphs, meanings, { groupId: group.id }, outsider.id).focusedGlyph, null);
});

test('cluster samples are bounded, deterministic, distinct, real object references', () => {
  const rows = Array.from({ length: 200 }, (_, index) => ({ id: String(index) }));
  for (const limit of [0, 1, 3, 5]) {
    const sample = sampleClusterGlyphs(rows, limit);
    assert.equal(sample.length, limit);
    assert.equal(new Set(sample).size, limit);
    assert.ok(sample.every((row) => rows.includes(row)));
    assert.deepEqual(sampleClusterGlyphs(rows, limit), sample);
  }
  assert.deepEqual(sampleClusterGlyphs([rows[0]]), [rows[0]]);
});

test('renaming people changes no family or group membership', () => {
  const renamed = glyphs.map((glyph) => ({ ...glyph, display_name: '다른 이름', canonical_name: '다른 이름' }));
  const project = (rows) => buildArchiveDepthView(rows, meanings).nodes.map((node) => [node.id, node.glyphs.map((glyph) => glyph.id)]);
  assert.deepEqual(project(renamed), project(glyphs));
});

test('full focus URL roundtrips the exact group/AND scope, including legacy precision queries', () => {
  const group = meanings.groups[0];
  const filter = { ...baseFilter, groupId: group.id };
  const focusedId = group.memberIds[0];
  const url = new URL(archiveDepthPath(filter, focusedId), 'https://example.test');
  for (const mode of ['meaning', 'precision']) {
    url.searchParams.set('view', mode);
    const decoded = parseArchiveDepthSearch(url.search);
    assert.equal(decoded.invalidLocation, false);
    assert.deepEqual(decoded.filter, filter);
    assert.equal(decoded.focusedId, focusedId);
    const scene = buildArchiveDepthView(glyphs, meanings, decoded.filter, decoded.focusedId);
    assert.equal(scene.focusedGlyph.id, focusedId);
    assert.deepEqual(scene.glyphs.map((glyph) => glyph.id).sort(), [...group.memberIds].sort());
    assert.deepEqual(scene.parentFilter, filter);
  }
  const andFilter = { ...baseFilter, base: 'arrival', modifiers: ['openness', 'trace'] };
  assert.deepEqual(parseArchiveDepthSearch(new URL(archiveDepthPath(andFilter), url).search).filter, andFilter);
});

test('invalid focus links cannot silently broaden a scope or bypass the meaning version gate', () => {
  for (const search of ['?view=meaning&mv=1&glyph=private-name', '?view=meaning&mv=1&base=not-a-base',
    `?view=meaning&mv=1&glyph=${glyphs[0].id}&glyph=${glyphs[1].id}`, '?view=meaning&mv=1&unknown=1',
    `?glyph=${glyphs[0].id}`]) assert.equal(parseArchiveDepthSearch(search).invalidLocation, true);
  assert.equal(parseArchiveDepthSearch(`?view=meaning&mv=999&glyph=${glyphs[0].id}`).unsupportedVersion, true);
  assert.equal(parseArchiveDepthSearch(`?view=precision&mv=999&glyph=${glyphs[0].id}`).unsupportedVersion, true);
  assert.equal(parseArchiveDepthSearch('?view=precision').unsupportedVersion, false);
  assert.throws(() => archiveDepthPath({}, 'private-name'));
});
