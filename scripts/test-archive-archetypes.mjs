import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARCHETYPE_CATALOG, getGlyphArchetype } from '../src/data/heptapodArchetypeCatalog.js';
import { getArchiveArchetypeSymbol } from '../src/data/archiveArchetypeSymbols.js';
import { archetypeKo, archetypeEn } from '../src/i18n/locales/archetypes.js';
import { localizeMessage } from '../src/i18n/messages.js';
import { interpretGlyphMeaning } from '../src/utils/heptapod/interpretGlyphMeaning.js';
import { isRenderableGlyphModel } from '../src/utils/heptapod/extractGlyphFeatures.js';
import { groupArchiveMeanings } from '../src/utils/heptapod/groupArchiveMeanings.js';
import { buildArchiveArchetypeFeed } from '../src/utils/heptapod/buildArchiveArchetypeFeed.js';

const entries = Object.values(ARCHETYPE_CATALOG);
const uuid = (number) => `00000000-0000-0000-0000-${number.toString(16).padStart(12, '0')}`;
const row = (number, archetype = entries[0]) => ({
  id: uuid(number), is_public: true, name: `Name ${number}`,
  model_data: getArchiveArchetypeSymbol(archetype.meaningKey).model,
});
const key = (family, modifiers = 'none') => `meaning-v1:${family}:${modifiers}`;

test('24 exact catalog keys preserve approved titles, order and narrative version', () => {
  assert.equal(entries.length, 24);
  const titles = [
    '첫 신호', '시간의 전령', '문턱의 개척자', '흔적의 전달자', '먼 순간의 방문자', '기억의 전령', '여운을 남기는 방문자', '시간 너머의 전령',
    '고요한 그릇', '순간의 수집가', '열린 청자', '기억의 보관자', '시간을 맞는 문', '겹친 기억의 청자', '흔적을 품는 안식처', '시간을 품는 그릇',
    '마주한 목소리', '동시의 대화자', '경계의 가교', '메아리의 응답자', '순간을 잇는 문', '기억의 연결자', '경계를 건너는 메아리', '끝과 시작의 매개자',
  ];
  assert.deepEqual(entries.map((entry) => entry.title), titles);
  assert.equal(new Set(entries.map((entry) => entry.reading)).size, 24);
  for (const [index, entry] of entries.entries()) {
    assert.equal(entry.order, index);
    assert.equal(entry.id, entry.meaningKey);
    assert.equal(entry.meaningVersion, 1);
    assert.equal(entry.narrativeVersion, 3);
    assert.equal(entry.meaningKey, key(entry.familyId, entry.modifierIds.join('+') || 'none'));
    assert.ok(Object.isFrozen(entry) && Object.isFrozen(entry.modifierIds));
  }
  assert.ok(Object.isFrozen(ARCHETYPE_CATALOG));
});

test('24 authored symbols reread as their exact types and satisfy the existing renderer', () => {
  const modelStrings = new Set();
  for (const archetype of entries) {
    const symbol = getArchiveArchetypeSymbol(archetype.meaningKey);
    assert.equal(getArchiveArchetypeSymbol(archetype.meaningKey), symbol);
    assert.deepEqual(Object.keys(symbol), ['model']);
    assert.equal(isRenderableGlyphModel(symbol.model), true);
    const interpretation = interpretGlyphMeaning(symbol.model);
    assert.equal(interpretation.status, 'complete');
    assert.equal(interpretation.meaningKey, archetype.meaningKey);
    assert.equal(getGlyphArchetype(interpretation), archetype);
    assert.ok(Object.isFrozen(symbol) && Object.isFrozen(symbol.model.clusters));
    assert.equal(symbol.model.meta.kind, 'archetype-symbol');
    for (const forbidden of ['id', 'is_public', 'owner_id', 'name', 'canonicalName']) {
      assert.equal(forbidden in symbol, false);
      assert.equal(forbidden in symbol.model, false);
      assert.equal(forbidden in symbol.model.meta, false);
    }
    modelStrings.add(JSON.stringify(symbol.model));
  }
  assert.equal(modelStrings.size, 24);
  for (const unknown of [undefined, null, '', 'arrival', '__proto__', 'meaning-v2:arrival:none']) {
    assert.equal(getArchiveArchetypeSymbol(unknown), null);
  }
});

test('one type requires a complete supported interpretation with exact boolean composition', () => {
  const valid = interpretGlyphMeaning(row(1).model_data);
  assert.equal(getGlyphArchetype(valid), entries[0]);
  for (const patch of [
    { status: 'partial' }, { status: 'invalid' }, { status: undefined },
    { meaningVersion: 2 }, { meaningVersion: '1' }, { morphologyVersion: 2 }, { morphologyVersion: undefined },
    { baseMeaning: 'unknown' }, { baseMeaning: 'reception' },
    { meaningKey: null }, { meaningKey: 'meaning-v1:arrival:trace' },
    { modifiers: {} }, { modifiers: null },
    ...['simultaneity', 'openness', 'trace'].flatMap((id) => [null, undefined, 0, 1, 'false']
      .map((value) => ({ modifiers: { ...valid.modifiers, [id]: value } }))),
  ]) assert.equal(getGlyphArchetype({ ...valid, ...patch }), null, JSON.stringify(patch));
  for (const invalid of [null, undefined, [], {}, 0, '']) assert.equal(getGlyphArchetype(invalid), null);
});

test('all bilingual narrative messages localize from the shared source strings', () => {
  assert.equal(Object.keys(archetypeKo).length, 369);
  assert.deepEqual(Object.keys(archetypeKo), Object.keys(archetypeEn));
  for (const [messageKey, ko] of Object.entries(archetypeKo)) {
    assert.equal(localizeMessage(ko, 'en'), archetypeEn[messageKey]);
    assert.ok(!/[가-힣]/.test(archetypeEn[messageKey]));
    assert.ok(!archetypeEn[messageKey].includes('—'));
  }
});

test('feed has only populated exact types, fixed ordering and original row references', () => {
  const rows = [row(30, entries[23]), row(12), row(5, entries[5]), row(3), row(20, entries[8])];
  const meanings = groupArchiveMeanings(rows);
  const before = JSON.stringify({ rows, meanings });
  const feed = buildArchiveArchetypeFeed(rows, meanings);
  assert.deepEqual(feed.sections.map((section) => section.archetype.order), [0, 5, 8, 23]);
  assert.deepEqual(feed.sections[0].glyphs.map((glyph) => glyph.id), [uuid(3), uuid(12)]);
  assert.deepEqual(feed.glyphs.map((glyph) => glyph.id), [uuid(3), uuid(12), uuid(5), uuid(20), uuid(30)]);
  assert.equal(feed.glyphs.length, rows.length);
  assert.equal(new Set(feed.glyphs.map((glyph) => glyph.id)).size, rows.length);
  assert.equal(feed.untypedGlyphs.length, 0);
  for (const glyph of feed.glyphs) assert.equal(rows.find((source) => source.id === glyph.id), glyph);
  assert.equal(JSON.stringify({ rows, meanings }), before);
  assert.deepEqual(buildArchiveArchetypeFeed([...rows].reverse(), meanings), feed);
});

test('projection preserves caller scope and rejects private, fake and duplicate rows', () => {
  const a = row(10);
  const b = row(11, entries[8]);
  const outside = row(12, entries[16]);
  const privateRow = { ...row(13), is_public: false };
  const fake = { ...row(14), id: 'archetype-symbol' };
  const dto = groupArchiveMeanings([a, b, outside]);
  const feed = buildArchiveArchetypeFeed([a, { ...a, name: 'Duplicate' }, { ...a, id: a.id.toUpperCase() }, b,
    privateRow, fake, null, getArchiveArchetypeSymbol(entries[0].meaningKey)], dto);
  assert.deepEqual(feed.glyphs, [a, b]);
  assert.equal(feed.glyphs.includes(outside), false);
  assert.equal(feed.sections.length, 2);
  assert.deepEqual(buildArchiveArchetypeFeed([], dto), { sections: [], untypedGlyphs: [], glyphs: [] });
});

test('partial, invalid, missing and future DTOs retain real untyped rows without false grouping', () => {
  const full = row(9);
  const partial = { ...row(4), model_data: { ...row(4).model_data, inkLoads: [] } };
  const invalid = { ...row(6), model_data: null };
  const missing = row(1);
  const rows = [full, partial, invalid, missing];
  const dto = groupArchiveMeanings([full, partial, invalid]);
  assert.equal(dto.interpretations[partial.id].status, 'partial');
  assert.equal(dto.interpretations[invalid.id].status, 'invalid');
  const feed = buildArchiveArchetypeFeed(rows, dto);
  assert.deepEqual(feed.sections[0].glyphs, [full]);
  assert.deepEqual(feed.untypedGlyphs, [missing, partial, invalid]);
  assert.deepEqual(feed.glyphs, [full, missing, partial, invalid]);
  for (const unsupported of [null, {}, { ...dto, meaningVersion: 2 }, { ...dto, morphologyVersion: 2 }]) {
    const unknownFeed = buildArchiveArchetypeFeed(rows, unsupported);
    assert.equal(unknownFeed.sections.length, 0);
    assert.deepEqual(unknownFeed.untypedGlyphs, [missing, partial, invalid, full]);
  }
  const future = { ...dto, interpretations: { ...dto.interpretations,
    [full.id]: { ...dto.interpretations[full.id], meaningVersion: 2 } } };
  assert.equal(buildArchiveArchetypeFeed(rows, future).sections.length, 0);
});

test('names cannot affect type or feed; projection never reads or re-encodes model data', () => {
  const original = row(1, entries[23]);
  const dto = groupArchiveMeanings([original]);
  const renamed = { ...original, name: 'Letters do not explain this shape' };
  const a = buildArchiveArchetypeFeed([original], dto);
  const b = buildArchiveArchetypeFeed([renamed], dto);
  assert.equal(a.sections[0].archetype, b.sections[0].archetype);
  assert.equal(b.glyphs[0], renamed);
  const renamedModel = { ...original.model_data, meta: { ...original.model_data.meta, name: 'Other name' } };
  assert.equal(getGlyphArchetype(interpretGlyphMeaning(renamedModel)), a.sections[0].archetype);
  const unreadable = { id: original.id, is_public: true,
    get model_data() { throw new Error('Projection must not classify'); },
    get name() { throw new Error('Projection must not interpret letters'); } };
  assert.equal(buildArchiveArchetypeFeed([unreadable], dto).sections[0].archetype, a.sections[0].archetype);
  const code = readFileSync(new URL('../src/utils/heptapod/buildArchiveArchetypeFeed.js', import.meta.url), 'utf8');
  assert.doesNotMatch(code, /import.*(?:interpretGlyphMeaning|classifyGlyphMorphology|archiveGlyph|reversible)/);
});
