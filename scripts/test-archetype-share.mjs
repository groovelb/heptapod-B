/** Pure share contracts. No browser, network, publication or image generation. */
import assert from 'node:assert/strict';
import { ARCHETYPE_CATALOG, getGlyphArchetype } from '../src/data/heptapodArchetypeCatalog.js';
import { getArchiveArchetypeSymbol } from '../src/data/archiveArchetypeSymbols.js';
import { interpretGlyphMeaning } from '../src/utils/heptapod/interpretGlyphMeaning.js';
import { glyphArchetypeShareCopy, shareArchive } from '../src/utils/heptapod/shareArchive.js';
import { createTranslator } from '../src/i18n/messages.js';

let checks = 0;
const check = (run) => { run(); checks += 1; };
const origin = 'https://example.test';
// Name intentionally matches an authored title: never translate names.
const left = { id: '00000000-0000-4000-8000-000000000001', is_public: true, canonical_name: '첫 신호', display_name: '첫 신호' };
const right = { ...left, id: '00000000-0000-4000-8000-000000000002', canonical_name: 'Louise', display_name: 'Louise' };
for (const archetype of Object.values(ARCHETYPE_CATALOG)) {
  const interpretation = interpretGlyphMeaning(getArchiveArchetypeSymbol(archetype.id).model);
  for (const locale of ['ko', 'en']) {
    const { localize } = createTranslator(locale);
    let payload;
    const options = { origin, locale, navigator: { share: async (data) => { payload = data; } } };
    check(() => assert.equal(getGlyphArchetype(interpretation), archetype));
    const result = await shareArchive({ left, interpretation }, options);
    check(() => assert.equal(result, 'shared'));
    check(() => assert.equal(payload.title, `${left.display_name} · ${localize(archetype.title)}`));
    check(() => assert.equal(payload.text, localize(archetype.reading)));
    check(() => assert.equal(payload.url, `${origin}/glyph/${left.id}?lang=${locale}`));
    check(() => assert.deepEqual(glyphArchetypeShareCopy(left, interpretation, locale), { title: payload.title, text: payload.text }));
    await shareArchive({ left, interpretation }, { ...options, reading: 'meaning', meaningVersion: 1 });
    check(() => assert.equal(new URL(payload.url).search, `?reading=meaning&mv=1&lang=${locale}`));
    await shareArchive({ left, right, interpretation, reason: 'pair-only' }, options);
    check(() => assert.equal(payload.text, 'pair-only'));
    check(() => assert.equal(payload.url, `${origin}/compare/${left.id}/${right.id}?lang=${locale}`));
  }
}
const interpretation = interpretGlyphMeaning(getArchiveArchetypeSymbol('meaning-v1:arrival:none').model);
const invalidReadings = [null, { ...interpretation, status: 'partial', meaningKey: null },
  { ...interpretation, status: 'invalid' }, { ...interpretation, meaningVersion: 999 },
  { ...interpretation, morphologyVersion: 999 }, { ...interpretation, meaningKey: 'meaning-v1:arrival:trace' },
  { ...interpretation, modifiers: { ...interpretation.modifiers, trace: null } }];
for (const reading of invalidReadings) {
  check(() => assert.equal(glyphArchetypeShareCopy(left, reading), null));
  let payload;
  await shareArchive({ left, interpretation: reading, reason: 'ordinary-reading' },
    { origin, navigator: { share: async (value) => { payload = value; } } });
  check(() => assert.equal(payload.text, 'ordinary-reading'));
}
check(() => assert.equal(glyphArchetypeShareCopy({ ...left, is_public: false }, interpretation), null));
check(() => assert.equal(glyphArchetypeShareCopy({ ...left, id: 'local' }, interpretation), null));
await assert.rejects(() => shareArchive({ left: { ...left, is_public: false }, interpretation }, { origin }), /공개/); checks += 1;
let copied;
const clipboard = { writeText: async (url) => { copied = url; } };
const copiedResult = await shareArchive({ left, interpretation }, { origin, navigator: { clipboard } });
check(() => assert.equal(copiedResult, 'copied'));
check(() => assert.equal(copied, `${origin}/glyph/${left.id}`));
check(() => assert.doesNotMatch(copied, /name=|archetype|meaning-v1|첫/));
const cancelled = await shareArchive({ left, interpretation }, { origin, navigator: { share: async () => {
  throw Object.assign(new Error('cancelled'), { name: 'AbortError' });
}, clipboard: { writeText: () => { throw new Error('Cancellation must not copy'); } } } });
check(() => assert.equal(cancelled, 'cancelled'));
const fallback = await shareArchive({ left, interpretation }, { origin, navigator: { share: async () => { throw new Error('unavailable'); }, clipboard } });
check(() => assert.equal(fallback, 'copied'));
const endpoint = 'https://share.example.test/archive-share';
let endpointPayload;
await shareArchive({ left, interpretation }, { origin, endpoint, navigator: { share: async (value) => { endpointPayload = value; } } });
check(() => assert.equal(new URL(endpointPayload.url).searchParams.get('left'), left.id));
check(() => assert.equal(new URL(endpointPayload.url).searchParams.has('reading'), false));
console.log(`Archetype sharing: ${checks} checks passed; 24 bilingual single types, literal names, UUID/privacy, pair/OG compatibility and fallback.`);
