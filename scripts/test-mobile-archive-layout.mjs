/** CSSOM + SSR only: no browser engine, Canvas paint, network or automation. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material/styles';
import { ARCHIVE_STORY_GLYPHS } from '../src/test-fixtures/archiveClient.js';
import { groupArchiveMeanings } from '../src/utils/heptapod/groupArchiveMeanings.js';
import { buildArchiveArchetypeFeed } from '../src/utils/heptapod/buildArchiveArchetypeFeed.js';

const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, appType: 'custom', logLevel: 'error' });
const dom = new Window({ settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
let checks = 0;
try {
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { default: Depth } = await server.ssrLoadModule('/src/components/data-display/ArchiveDepthExplorer.jsx');
  const meanings = groupArchiveMeanings(ARCHIVE_STORY_GLYPHS);
  const section = buildArchiveArchetypeFeed(ARCHIVE_STORY_GLYPHS, meanings).sections.find((entry) => entry.glyphs.length > 1);
  const fixtures = {
    root: { onOrderChange() {} },
    feed: { filter: { base: 'reciprocity' } },
    detail: { filter: { base: 'reciprocity' }, focusedId: section.glyphs[0].id },
  };
  const resolvedSize = (rem) => `${parseFloat(rem) * parseFloat(dom.getComputedStyle(dom.document.documentElement).fontSize)}px`;
  // Check responsive reading roles, rather than freezing all desktop CSS.
  for (const locale of ['ko', 'en']) for (const [name, props] of Object.entries(fixtures)) {
    const html = renderToStaticMarkup(h(LocaleProvider, { initialMode: locale, syncDocument: false }, h(ThemeProvider, { theme }, h(Depth, { glyphs: ARCHIVE_STORY_GLYPHS, meanings, ...props }))));
    dom.document.body.innerHTML = html;
    for (const width of [900, 1440]) {
      dom.happyDOM.setWindowSize({ width, height: 900 });
      dom.document.body.innerHTML = html;
      const desktop = `@media (min-width:${theme.breakpoints.values.md}px)`;
      const navigation = dom.document.querySelector('[data-archive-navigation]');
      assert.equal(dom.getComputedStyle(navigation).display, name === 'root' ? 'none' : 'flex'); checks += 1;
      if (name === 'root') {
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-archive-page-heading]')).paddingTop, resolvedSize(theme.editorial.archivePage.rootInset.md)); checks += 1;
      }
      if (name === 'detail') {
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-selected-glyph-detail]')).paddingTop, resolvedSize(theme.editorial.archivePage.contentInset)); checks += 1;
        assert.equal(parseFloat(dom.getComputedStyle(dom.document.querySelector('[data-archive-reading-column]')).paddingTop) || 0, 0); checks += 1;
      }
      const title = dom.document.querySelector(name === 'root' ? 'h1' : name === 'feed' ? '[data-archetype-section] h2' : '[data-selected-glyph-detail] h2');
      const titleRole = name === 'root' ? 'editorialDisplay' : 'editorialTitle';
      assert.equal(dom.getComputedStyle(title).fontSize, resolvedSize(theme.typography[titleRole][desktop].fontSize), `${name}:${width}: heading consumes desktop role`); checks += 1;
      const body = dom.document.querySelector(name === 'root' ? '[data-family-reading]' : name === 'detail' ? '[data-selected-glyph-detail] [data-archetype-narrative]' : '[data-archetype-narrative]');
      assert.equal(dom.getComputedStyle(body).fontSize, resolvedSize(theme.typography.editorialBody[desktop].fontSize), `${name}:${width}: readable body size`); checks += 1;
      assert.equal(dom.getComputedStyle(body).lineHeight, String(theme.typography.editorialBody.lineHeight), `${name}:${width}: body leading`); checks += 1;
      if (name === 'detail') {
        const figure = dom.document.querySelector('[data-archive-sticky-figure]');
        const style = dom.getComputedStyle(figure);
        assert.equal(style.position, 'sticky'); checks += 1;
        assert.equal(style.alignSelf, 'start'); checks += 1;
        assert.equal(style.getPropertyValue('--archive-figure-top'), theme.editorial.archiveFigure.top.replace('var(--archive-navigation-height, 48px)', style.getPropertyValue('--archive-navigation-height') || '48px')); checks += 1;
        const button = figure.querySelector('[data-selected-analysis-toggle]');
        assert.ok(button, 'Analysis button stays below the glyph in the sticky column'); checks += 1;
        assert.equal(button.closest('[data-archive-sticky-figure]'), figure); checks += 1;
        assert.ok(figure.querySelector('[data-observation-chips]'), 'Metadata controls travel with the sticky glyph'); checks += 1;
        assert.ok(figure.querySelector('[data-glyph-centered-name]').compareDocumentPosition(button) & dom.Node.DOCUMENT_POSITION_FOLLOWING); checks += 1;
        assert.ok(figure.parentElement.contains(body), 'Sticky scope includes the full explanation'); checks += 1;
        assert.equal(figure.parentElement.querySelector('[data-same-type-glyph]'), null, 'Sticky stops before peer section'); checks += 1;
      }
    }
    for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390]]) {
      dom.happyDOM.setWindowSize({ width, height });
      dom.document.body.innerHTML = html;
      const body = dom.document.querySelector(name === 'root' ? '[data-family-reading]' : name === 'detail' ? '[data-selected-glyph-detail] [data-archetype-narrative]' : '[data-archetype-narrative]');
      assert.equal(dom.getComputedStyle(body).fontSize, resolvedSize(theme.typography.editorialBody.fontSize), `${name}:${width}: mobile body consumes semantic role`); checks += 1;
      if (name === 'root') {
        const portals = dom.document.querySelector('[data-archive-portal]').parentElement;
        assert.equal(dom.getComputedStyle(portals).gridTemplateColumns, 'repeat(3, minmax(0, 1fr))'); checks += 1;
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-cluster-title]')).whiteSpace, 'nowrap'); checks += 1;
      }
      if (name === 'detail') {
        const figure = dom.document.querySelector('[data-archive-sticky-figure]');
        assert.equal(dom.getComputedStyle(figure).position, 'static', 'One-column reading remains unobstructed'); checks += 1;
        assert.ok(figure.querySelector('[data-selected-analysis-toggle]')); checks += 1;
        const heading = dom.document.querySelector('[data-archive-detail-heading]');
        const reading = dom.document.querySelector('[data-archive-reading-column]');
        assert.ok(heading.compareDocumentPosition(figure) & dom.Node.DOCUMENT_POSITION_FOLLOWING, 'Mobile reading starts with title/quote before the large glyph'); checks += 1;
        assert.ok(figure.compareDocumentPosition(reading) & dom.Node.DOCUMENT_POSITION_FOLLOWING); checks += 1;
        const headerContent = [...heading.children].filter((node) => node.tagName !== 'STYLE');
        assert.equal(headerContent[headerContent.indexOf(heading.querySelector('h2')) + 1].tagName, 'BLOCKQUOTE', 'Quote immediately follows title'); checks += 1;
        assert.equal(dom.document.querySelectorAll('[data-selected-glyph-detail] blockquote').length, 1, 'No duplicate responsive quote'); checks += 1;
        for (const samples of dom.document.querySelectorAll('[data-shared-pattern-samples]')) {
          assert.equal(dom.getComputedStyle(samples).gridTemplateColumns, 'minmax(0, 1fr)', 'Comparison retains readable width'); checks += 1;
        }
      }
      if (name === 'feed') {
        const index = dom.document.querySelector('[data-archive-index]');
        assert.equal(dom.getComputedStyle(index.querySelector('ol')).flexDirection, 'row', 'Mobile index leaves full reading width'); checks += 1;
      }
    }
  }
  console.log(`Mobile Archive layout: ${checks} checks passed, bilingual semantic typography, heading order, comparison density and mobile portrait/landscape rules (SSR/CSSOM only).`);
} finally {
  await server.close();
  await dom.happyDOM.abort();
}
