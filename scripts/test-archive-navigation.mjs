import assert from 'node:assert/strict';
import test from 'node:test';
import { archiveDepthPath, archiveMeaningPath, parseArchiveDepthSearch, parseArchiveMeaningSearch } from '../src/utils/heptapod/shareArchive.js';
import { groupArchiveMeanings } from '../src/utils/heptapod/groupArchiveMeanings.js';
import { filterMeaningGlyphs } from '../src/utils/heptapod/archiveDepthView.js';
import { buildArchiveTimeline } from '../src/utils/heptapod/buildArchiveArchetypeFeed.js';
import { ARCHIVE_STORY_GLYPHS } from '../src/test-fixtures/archiveClient.js';

const meaningData = groupArchiveMeanings(ARCHIVE_STORY_GLYPHS);
const group = meaningData.groups[0];
const personId = group.memberIds[0];
const filters = [
  {}, { base: 'arrival' }, { groupId: group.id },
  { base: 'reception', modifiers: ['openness', 'trace'] }, { status: 'partial' }, { status: 'invalid' },
];
const query = (path) => new URL(path, 'https://example.test').search;

test('meta round-trips independently from exact/AND/status scope and focused public ID', () => {
  for (const filter of filters) for (const meta of [null, 'simultaneity', 'openness', 'trace']) {
    const original = parseArchiveMeaningSearch(query(archiveMeaningPath(filter))).filter;
    const parsed = parseArchiveDepthSearch(query(archiveDepthPath(filter, personId, { meta })));
    assert.equal(parsed.invalidLocation, false);
    assert.equal(parsed.unsupportedVersion, false);
    assert.deepEqual(parsed.filter, original);
    assert.equal(parsed.focusedId, personId);
    assert.equal(parsed.meta, meta);
    assert.deepEqual(filterMeaningGlyphs(ARCHIVE_STORY_GLYPHS, meaningData, parsed.filter),
      filterMeaningGlyphs(ARCHIVE_STORY_GLYPHS, meaningData, original));
  }
});

test('legacy URLs stay unchanged and never become a presentation sort', () => {
  for (const filter of filters) {
    assert.equal(archiveDepthPath(filter), archiveMeaningPath(filter));
    const parsed = parseArchiveDepthSearch(query(archiveDepthPath(filter)));
    assert.equal(parsed.meta, null);
    assert.equal(parsed.focusedId, null);
  }
});

test('clearing focus keeps sort while changing scopes can drop sort explicitly', () => {
  const filter = { base: 'arrival' };
  const focused = parseArchiveDepthSearch(query(archiveDepthPath(filter, personId, { meta: 'trace' })));
  const closed = parseArchiveDepthSearch(query(archiveDepthPath(focused.filter, null, { meta: focused.meta })));
  assert.equal(closed.focusedId, null);
  assert.equal(closed.meta, 'trace');
  assert.deepEqual(closed.filter, focused.filter);
  assert.equal(parseArchiveDepthSearch(query(archiveDepthPath({ base: 'reception' }))).meta, null);
});

test('observation drawer mode preserves meta and filter scope', () => {
  const path = archiveDepthPath({ groupId: group.id }, personId, { meta: 'openness' });
  const meaning = parseArchiveDepthSearch(query(path));
  const precision = parseArchiveDepthSearch(query(path.replace('view=meaning', 'view=precision')));
  assert.deepEqual(precision, meaning);
});

test('presentation state does not bypass meaning-version checks', () => {
  for (const search of ['?view=meaning&meta=trace', '?view=meaning&mv=999&meta=trace', '?view=precision&mv=999&meta=trace']) {
    assert.equal(parseArchiveDepthSearch(search).unsupportedVersion, true);
  }
});

test('invalid/duplicate meta parameters fail closed rather than broadening scope', () => {
  for (const suffix of ['meta=arrival', 'meta=', 'meta=trace&meta=openness', 'meta=openness%2Ctrace', 'meta=__proto__', 'meta=trace&unexpected=1']) {
    const parsed = parseArchiveDepthSearch(`?view=meaning&mv=1&base=arrival&${suffix}`);
    assert.equal(parsed.invalidLocation, true, suffix);
    assert.equal(parsed.meta, null);
    assert.equal(parsed.focusedId, null);
  }
  assert.equal(parseArchiveDepthSearch('?meta=trace').invalidLocation, true);
  assert.throws(() => archiveDepthPath({}, null, { meta: 'arrival' }));
  assert.throws(() => archiveDepthPath({}, 'private-name', { meta: 'trace' }));
});

test('chronological links preserve order on focus/close and reject invalid orders', () => {
  for (const order of ['newest', 'oldest']) {
    const path = archiveDepthPath({}, personId, { order });
    const parsed = parseArchiveDepthSearch(query(path));
    assert.equal(parsed.order, order);
    assert.equal(parsed.focusedId, personId);
    assert.equal(parsed.invalidLocation, false);
    assert.equal(parseArchiveDepthSearch(query(archiveDepthPath(parsed.filter, null, { order: parsed.order }))).order, order);
  }
  assert.equal(parseArchiveDepthSearch('?view=meaning&mv=1&order=wrong').invalidLocation, true);
  assert.equal(parseArchiveDepthSearch('?view=meaning&mv=1&order=newest&order=oldest').invalidLocation, true);
  assert.throws(() => archiveDepthPath({}, null, { order: 'wrong' }));
});

test('timeline orders real registration timestamps, places missing dates last and does not mutate rows', () => {
  const row = (number, date, is_public = true) => ({ id: `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`, created_at: date, is_public });
  const old = row(1, '2026-09-01T00:00:00Z'), recent = row(2, '2026-09-06T00:00:00Z');
  const unknown = row(3, null), tie = row(4, recent.created_at), hidden = row(5, '2026-09-07T00:00:00Z', false);
  const rows = [unknown, old, recent, hidden, tie, old];
  assert.deepEqual(buildArchiveTimeline(rows).glyphs, [recent, tie, old, unknown]);
  assert.deepEqual(buildArchiveTimeline(rows, 'oldest').glyphs, [old, recent, tie, unknown]);
  assert.deepEqual(rows, [unknown, old, recent, hidden, tie, old]);
});
