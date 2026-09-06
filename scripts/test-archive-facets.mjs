import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArchiveDepthView, EMPTY_ARCHIVE_FILTER, filterMeaningGlyphs } from '../src/utils/heptapod/archiveDepthView.js';
import { MEANING_MODIFIER_IDS } from '../src/data/heptapodMeaningCatalog.js';

// Supplied interpretations isolate this projection from name encoding/classification.
const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const row = (number, isPublic = true) => Object.freeze({
  id: id(number), is_public: isPublic, display_name: `Name ${number}`,
  model_data: Object.freeze({ fixture: number }),
});
const interpretation = (status, baseMeaning, simultaneity, openness, trace) => ({
  status, baseMeaning, modifiers: { simultaneity, openness, trace },
});
const rows = Object.freeze([row(4), row(1), row(6), row(3), row(5), row(2), row(7, false), row(8)]);
const meanings = {
  interpretations: {
    [id(1)]: interpretation('complete', 'arrival', true, true, true),
    [id(2)]: interpretation('complete', 'arrival', false, false, false),
    [id(3)]: interpretation('partial', 'arrival', null, true, null),
    [id(4)]: interpretation('partial', 'arrival', true, false, undefined),
    [id(5)]: interpretation('invalid', null, null, null, null),
    [id(6)]: interpretation('complete', 'reception', false, true, true),
    [id(7)]: interpretation('complete', 'arrival', true, true, true),
    // Row 8 is absent from the current interpreted snapshot and must stay out.
  },
  groups: [{ id: 'meaning-v1:arrival:simultaneity+openness+trace', title: 'Known exact group',
    meaningIds: ['arrival', ...MEANING_MODIFIER_IDS], memberIds: [id(1), id(7)] }],
};
const filter = { ...EMPTY_ARCHIVE_FILTER, base: 'arrival' };

test('one family exposes overlapping facets without duplicating or filtering real people', () => {
  const scene = buildArchiveDepthView([...rows, rows[0]], meanings, filter);
  assert.equal(scene.level, 'members');
  assert.deepEqual(scene.nodes, []);
  assert.deepEqual(scene.glyphs.map((glyph) => glyph.id), [id(1), id(2), id(3), id(4)]);
  assert.deepEqual(scene.facets.map((facet) => facet.id), MEANING_MODIFIER_IDS);
  assert.deepEqual(scene.facets.map(({ id: meaningId, memberIds, count, total, knownCount, unknownCount }) => (
    { id: meaningId, memberIds, count, total, knownCount, unknownCount }
  )), [
    { id: 'simultaneity', memberIds: [id(1), id(4)], count: 2, total: 4, knownCount: 3, unknownCount: 1 },
    { id: 'openness', memberIds: [id(1), id(3)], count: 2, total: 4, knownCount: 4, unknownCount: 0 },
    { id: 'trace', memberIds: [id(1)], count: 1, total: 4, knownCount: 2, unknownCount: 2 },
  ]);
  assert.ok(scene.facets.every((facet) => typeof facet.label === 'string' && facet.label.length));
  assert.equal(scene.facets.reduce((count, facet) => count + facet.count, 0), 5);
  assert.equal(new Set(scene.glyphs).size, 4);
});

test('facet sorting promotes matches, keeps absence and unknown, and preserves references and scene identity', () => {
  const originalOrder = [...rows];
  const plain = buildArchiveDepthView(rows, meanings, filter);
  const selected = buildArchiveDepthView(rows, meanings, filter, null, 'simultaneity');
  assert.equal(selected.meta, 'simultaneity');
  assert.deepEqual(selected.glyphs.map((glyph) => glyph.id), [id(1), id(4), id(2), id(3)]);
  assert.deepEqual(selected.facets, plain.facets);
  assert.equal(selected.scopeKey, plain.scopeKey);
  assert.equal(selected.key, plain.key);
  assert.deepEqual(new Set(selected.glyphs), new Set(plain.glyphs));
  assert.ok(selected.glyphs.every((glyph) => rows.includes(glyph)));
  assert.deepEqual(rows, originalOrder);
  assert.deepEqual(buildArchiveDepthView([...rows].reverse(), meanings, filter, null, 'simultaneity').glyphs,
    selected.glyphs);
  for (const meta of MEANING_MODIFIER_IDS) {
    const scene = buildArchiveDepthView(rows, meanings, filter, null, meta);
    const count = scene.facets.find((facet) => facet.id === meta).count;
    assert.ok(scene.glyphs.slice(0, count).every((glyph) => meanings.interpretations[glyph.id].modifiers[meta] === true));
    assert.ok(scene.glyphs.slice(count).every((glyph) => meanings.interpretations[glyph.id].modifiers[meta] !== true));
    assert.equal(scene.key, plain.key);
  }
});

test('unknown facet inputs normalize to no sort rather than broadening a scope', () => {
  const plain = buildArchiveDepthView(rows, meanings, filter);
  for (const meta of ['arrival', 'unknown', '__proto__', '', ['trace'], {}, 1]) {
    const scene = buildArchiveDepthView(rows, meanings, filter, null, meta);
    assert.equal(scene.meta, null);
    assert.deepEqual(scene.glyphs, plain.glyphs);
    assert.equal(scene.key, plain.key);
  }
});

test('facet totals use the exact legacy group/AND/status scope and ignore focus and sort', () => {
  const scopes = [filter,
    { ...filter, groupId: meanings.groups[0].id },
    { ...filter, modifiers: ['simultaneity', 'openness'] },
    { ...filter, status: 'partial' },
    { ...EMPTY_ARCHIVE_FILTER, status: 'invalid' },
    { ...filter, groupId: 'not-observed' },
  ];
  for (const scopedFilter of scopes) {
    const allowed = filterMeaningGlyphs(rows, meanings, scopedFilter);
    const plain = buildArchiveDepthView(rows, meanings, scopedFilter);
    assert.equal(plain.level, 'members');
    assert.deepEqual(new Set(plain.glyphs), new Set(allowed));
    for (const facet of plain.facets) assert.equal(facet.total, allowed.length);
    for (const meta of MEANING_MODIFIER_IDS) {
      const sorted = buildArchiveDepthView(rows, meanings, scopedFilter, null, meta);
      assert.deepEqual(sorted.facets, plain.facets);
      assert.equal(sorted.scopeKey, plain.scopeKey);
      for (const focused of rows) {
        const focus = buildArchiveDepthView(rows, meanings, scopedFilter, focused.id, meta);
        assert.equal(focus.focusedGlyph, allowed.find((glyph) => glyph.id === focused.id) || null);
        assert.deepEqual(focus.facets, plain.facets);
        assert.equal(focus.scopeKey, plain.scopeKey);
        assert.deepEqual(focus.parentFilter, scopedFilter);
      }
    }
  }
});

test('scope identity canonicalizes duplicate AND attributes and separates real navigation changes', () => {
  const first = buildArchiveDepthView(rows, meanings, { ...filter, modifiers: ['trace', 'openness', 'trace'] });
  const second = buildArchiveDepthView(rows, meanings, { ...filter, modifiers: ['openness', 'trace'] }, null, 'trace');
  assert.equal(first.scopeKey, second.scopeKey);
  assert.equal(first.key, second.key);
  assert.deepEqual(first.glyphs, second.glyphs);
  assert.notEqual(first.scopeKey, buildArchiveDepthView(rows, meanings, filter).scopeKey);
  const focused = buildArchiveDepthView(rows, meanings, filter, id(1), 'trace');
  const base = buildArchiveDepthView(rows, meanings, filter);
  assert.equal(focused.scopeKey, base.scopeKey);
  assert.notEqual(focused.key, base.key);
});

test('root only projects observed families; legacy status scopes keep actual readings without extra portal data', () => {
  const root = buildArchiveDepthView(rows, meanings);
  assert.deepEqual(root.nodes.map((node) => node.id), ['arrival', 'reception']);
  for (const key of ['partialCount', 'invalidCount', 'partialFilter', 'invalidFilter']) assert.equal(key in root, false);
  assert.equal(root.facets[0].unknownCount, 2);
  assert.deepEqual(buildArchiveDepthView(rows, meanings, { status: 'invalid' }).glyphs.map((glyph) => glyph.id), [id(5)]);
  assert.deepEqual(buildArchiveDepthView(rows, meanings, { status: 'partial' }).glyphs.map((glyph) => glyph.id), [id(3), id(4)]);
  const empty = buildArchiveDepthView([], null);
  assert.equal(empty.level, 'families');
  assert.deepEqual(empty.nodes, []);
  assert.ok(empty.facets.every((facet) => facet.total === 0 && facet.count === 0 && facet.unknownCount === 0));
  assert.deepEqual(buildArchiveDepthView(rows, meanings, { base: 'not-a-base' }).glyphs, []);
});

test('renaming cannot change facet membership or ordering and projection does not encode models', () => {
  const renamed = rows.map((glyph) => ({ ...glyph, display_name: '다른 이름', canonical_name: '다른 이름',
    // Model access would throw if the projection started recomputing interpretation.
    get model_data() { throw new Error('Projection must consume supplied interpretations'); },
  }));
  for (const meta of [null, ...MEANING_MODIFIER_IDS]) {
    const original = buildArchiveDepthView(rows, meanings, filter, null, meta);
    const updated = buildArchiveDepthView(renamed, meanings, filter, null, meta);
    assert.deepEqual(updated.facets, original.facets);
    assert.deepEqual(updated.glyphs.map((glyph) => glyph.id), original.glyphs.map((glyph) => glyph.id));
    assert.equal(updated.key, original.key);
  }
});
