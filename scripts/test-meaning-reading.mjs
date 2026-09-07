/** Shared storytelling contracts: actual model, shared catalog, no network. */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ThemeProvider } from '@mui/material/styles';
import { buildArchiveModel } from '../src/utils/heptapod/archiveGlyph.js';
import { interpretGlyphMeaning } from '../src/utils/heptapod/interpretGlyphMeaning.js';
import { buildMeaningReading } from '../src/utils/heptapod/buildMeaningReading.js';
import { MEANING_CATALOG } from '../src/data/heptapodMeaningCatalog.js';
import { ARCHIVE_STORY_GLYPHS } from '../src/test-fixtures/archiveClient.js';

let checks = 0;
const check = (run) => { run(); checks += 1; };
const models = ['Louise', '민준', 'Hannah', 'Ian', '서연', '도래', 'Alexandria Alexandria Alexandria'].map(buildArchiveModel);
const allIds = new Set();
for (const model of [...models, ...ARCHIVE_STORY_GLYPHS.map((glyph) => glyph.model_data)]) {
  const interpretation = interpretGlyphMeaning(model);
  const snapshot = JSON.stringify(interpretation);
  const entries = buildMeaningReading(interpretation);
  check(() => assert.deepEqual(entries.map((entry) => entry.meaningId), interpretation.meaningIds));
  for (const [index, entry] of entries.entries()) {
    allIds.add(entry.meaningId);
    check(() => assert.equal(entry.definition, MEANING_CATALOG[entry.meaningId].description));
    check(() => assert.equal(entry.label, MEANING_CATALOG[entry.meaningId].label));
    check(() => assert.deepEqual(entry.anchors.map(({ number: _number, ...anchor }) => anchor), interpretation.observations[index].anchors));
    check(() => assert.deepEqual(entry.locations.map((item) => item.number), entry.anchors.map((item) => item.number)));
  }
  check(() => assert.doesNotMatch(JSON.stringify(buildMeaningReading(interpretation, 'en').map(({ label, definition, detail, locations }) => ({ label, definition, detail, locations }))), /[가-힣]|NaN|undefined/));
  check(() => assert.equal(JSON.stringify(interpretation), snapshot, 'Presentation must not mutate the classification'));
}
check(() => assert.deepEqual([...allIds].sort(), Object.keys(MEANING_CATALOG).sort()));
const [louise, minjun, hannah] = models.map(interpretGlyphMeaning);
check(() => assert.equal(louise.meaningKey, minjun.meaningKey));
check(() => assert.notEqual(buildMeaningReading(louise)[0].detail, buildMeaningReading(minjun)[0].detail));
check(() => assert.notDeepEqual(buildMeaningReading(louise).find((item) => item.meaningId === 'openness').locations, buildMeaningReading(minjun).find((item) => item.meaningId === 'openness').locations));
check(() => assert.equal(hannah.status, 'partial'));
check(() => assert.equal(hannah.modifiers.trace, null));
check(() => assert.ok(!buildMeaningReading(hannah).some((item) => item.meaningId === 'trace')));
check(() => assert.equal(interpretGlyphMeaning(models[5]).baseMeaning, 'reception', 'The name 도래 must not imply the meaning 도래'));
check(() => assert.equal(models[6].meta.reversible, false));
check(() => assert.ok(buildMeaningReading(interpretGlyphMeaning(models[6])).length));
const renamed = { ...models[0], questionHook: { irrelevant: true }, meta: { ...models[0].meta, canonicalName: 'a different label', name: '도래' } };
check(() => assert.deepEqual(buildMeaningReading(interpretGlyphMeaning(renamed)), buildMeaningReading(louise)));
check(() => assert.deepEqual(buildMeaningReading(null), []));
check(() => assert.deepEqual(buildMeaningReading(interpretGlyphMeaning(null)), []));

const originalFetch = globalThis.fetch;
let requests = 0;
globalThis.fetch = () => { requests += 1; throw new Error('No network in reading tests'); };
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
try {
  const { default: Summary } = await server.ssrLoadModule('/src/components/data-display/GlyphMeaningSummary.jsx');
  const { default: Overlay } = await server.ssrLoadModule('/src/components/overlay-feedback/GlyphObservationOverlay.jsx');
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const render = (interpretation, selectedObservationId, locale = 'ko', readingTheme = theme) => renderToStaticMarkup(createElement(LocaleProvider, { initialMode: locale, syncDocument: false },
    createElement(ThemeProvider, { theme: readingTheme }, createElement(Summary, { interpretation, variant: 'reading', selectedObservationId, onSelectObservation() {} }))));
  for (const interpretation of [louise, minjun, hannah]) {
    for (const observation of interpretation.observations) {
      const html = render(interpretation, observation.id);
      check(() => assert.ok(html.includes(MEANING_CATALOG[observation.meaningId].description)));
      check(() => assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1));
      check(() => assert.ok(html.includes(`height:${theme.editorial.readingViewport}`)));
      check(() => assert.doesNotMatch(render(interpretation, observation.id, 'en'), /[가-힣]/));
    }
  }
  // A theme override must reach actual rendered reading CSS, without local sizes winning.
  const readingTheme = { ...theme,
    typography: { ...theme.typography, editorialBody: { ...theme.typography.editorialBody, fontSize: '1.375rem' } },
    editorial: { ...theme.editorial, readingViewport: '37rem', measure: '39rem' },
  };
  const overridden = render(louise, undefined, 'ko', readingTheme);
  check(() => assert.ok(overridden.includes('font-size:1.375rem'), 'Body size comes from the semantic theme role'));
  check(() => assert.ok(overridden.includes('height:37rem'), 'Reading viewport comes from the layout token'));
  check(() => assert.ok(overridden.includes('max-width:39rem'), 'Narrative measure comes from the layout token'));
  check(() => assert.match(render(hannah), /아직 읽지 못한 부분은/));
  check(() => assert.match(render(interpretGlyphMeaning(null)), /충분히 확인할 수 없어/));
  check(() => assert.doesNotMatch(render(interpretGlyphMeaning(null)), /data-reading-meaning=/));
  const overlayHtml = renderToStaticMarkup(createElement(Overlay, { model: models[0], anchors: louise.observations[0].anchors }));
  const points = [...overlayHtml.matchAll(/<text x="([^"]+)" y="([^"]+)"/g)].map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
  check(() => assert.equal(points.length, 3));
  for (let i = 0; i < points.length; i += 1) for (let j = i + 1; j < points.length; j += 1) {
    check(() => assert.ok(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) >= 8, 'Nearby-focus numbers remain distinct'));
  }
  check(() => assert.equal(requests, 0));
  console.log(`Meaning reading: ${checks} checks passed; shared terms, exact anchors, individual arrangements, partial/invalid/non-reversible, name independence, Korean and English. No browser used.`);
} finally {
  await server.close();
  globalThis.fetch = originalFetch;
}
