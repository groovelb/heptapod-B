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
  // Resolve both the rendered branch and CSS at each width (no browser engine).
  for (const locale of ['ko', 'en']) for (const [name, props] of Object.entries(fixtures)) {
    const renderAtWidth = () => {
      const viewportTheme = { ...theme, components: { ...theme.components, MuiUseMediaQuery: { defaultProps: {
        ssrMatchMedia: (query) => ({ matches: dom.matchMedia(query).matches }),
      } } } };
      dom.document.body.innerHTML = renderToStaticMarkup(h(LocaleProvider, { initialMode: locale, syncDocument: false },
        h(ThemeProvider, { theme: viewportTheme }, h(Depth, { glyphs: ARCHIVE_STORY_GLYPHS, meanings, ...props }))));
    };
    for (const width of [900, 1440]) {
      dom.happyDOM.setWindowSize({ width, height: 900 });
      renderAtWidth();
      const desktop = `@media (min-width:${theme.breakpoints.values.md}px)`;
      const navigation = dom.document.querySelector('[data-archive-navigation]');
      assert.equal(dom.getComputedStyle(navigation).display, name === 'root' ? 'none' : 'flex'); checks += 1;
      if (name === 'root') {
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-archive-page-heading]')).paddingTop, resolvedSize(theme.editorial.archivePage.rootInset.md)); checks += 1;
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-archive-home-list]')).gridTemplateColumns, 'repeat(3, minmax(0, 1fr))', 'Desktop preserves the original three columns'); checks += 1;
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-cluster-title]')).fontSize, resolvedSize(theme.typography.editorialPortalCompact[desktop].fontSize)); checks += 1;
        for (const portal of dom.document.querySelectorAll('[data-archive-portal]:not([data-archive-portal="timeline"])')) {
          const button = portal.querySelector('[data-cluster-id]');
          const cloud = button.querySelector('.archive-cluster-cloud');
          const label = portal.querySelector('[data-cluster-title]');
          const introduction = portal.querySelector('[data-family-introduction]');
          assert.equal(dom.getComputedStyle(button).display, 'block', 'Desktop portal must not inherit the mobile grid'); checks += 1;
          assert.equal(dom.getComputedStyle(button).maxWidth, resolvedSize(theme.editorial.archivePage.portalSize)); checks += 1;
          assert.equal(label.parentElement, cloud, 'Original desktop title remains inside the full-size symbol'); checks += 1;
          assert.equal(dom.getComputedStyle(label).position, 'absolute'); checks += 1;
          assert.equal(dom.getComputedStyle(label).transform, 'translate(-50%, -50%)'); checks += 1;
          assert.equal(introduction.parentElement, portal, 'Description and count are outside the symbol button in normal block flow'); checks += 1;
          assert.equal(dom.getComputedStyle(introduction).display, 'block'); checks += 1;
          assert.equal(portal.querySelector('[data-family-reading]').parentElement, introduction); checks += 1;
          assert.equal(portal.querySelector('[data-cluster-count]').parentElement, introduction); checks += 1;
          assert.equal(portal.querySelectorAll('[data-family-symbol]').length, 1, 'No hidden duplicate Canvas'); checks += 1;
        }
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-archive-page-heading]')).textAlign, 'center'); checks += 1;
        const timePortal = dom.document.querySelector('[data-archive-portal="timeline"]');
        assert.equal(dom.getComputedStyle(timePortal).gridColumn, '2', 'Desktop time symbol remains below the center family'); checks += 1;
        assert.ok(timePortal.querySelector('[data-archive-timeline-symbol]')); checks += 1;

        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-cluster-count]')).fontSize, resolvedSize(theme.typography.editorialMeta[desktop].fontSize)); checks += 1;
      }
      if (name === 'detail') {
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-selected-glyph-detail]')).paddingTop, resolvedSize(theme.editorial.archivePage.contentInset)); checks += 1;
        assert.equal(parseFloat(dom.getComputedStyle(dom.document.querySelector('[data-archive-reading-column]')).paddingTop) || 0, 0); checks += 1;
      }
      const title = dom.document.querySelector(name === 'root' ? 'h1' : name === 'feed' ? '[data-archetype-section] h2' : '[data-selected-glyph-detail] h2');
      const titleRole = name === 'root' ? 'editorialDisplay' : 'editorialTitle';
      assert.ok(Number(dom.getComputedStyle(title).fontWeight) >= 700, 'Page and section titles are bold'); checks += 1;
      assert.equal(dom.getComputedStyle(title).fontSize, resolvedSize(theme.typography[titleRole][desktop].fontSize), `${name}:${width}: heading consumes desktop role`); checks += 1;
      const body = dom.document.querySelector(name === 'root' ? '[data-family-reading]' : name === 'detail' ? '[data-selected-glyph-detail] [data-archetype-narrative]' : '[data-archetype-narrative]');
      const bodyRole = 'editorialBody';
      assert.equal(dom.getComputedStyle(body).fontSize, resolvedSize(theme.typography[bodyRole][desktop].fontSize), `${name}:${width}: readable body size`); checks += 1;
      assert.equal(dom.getComputedStyle(body).lineHeight, String(theme.typography[bodyRole].lineHeight), `${name}:${width}: body leading`); checks += 1;
      if (name === 'feed') {
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-archive-index]')).backgroundColor, 'transparent', 'Index bar has no background'); checks += 1;
      }
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
    for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390], [899, 900]]) {
      dom.happyDOM.setWindowSize({ width, height });
      renderAtWidth();
      const body = dom.document.querySelector(name === 'root' ? '[data-family-reading]' : name === 'detail' ? '[data-selected-glyph-detail] [data-archetype-narrative]' : '[data-archetype-narrative]');
      const bodyRole = name === 'root' ? 'editorialArchiveHomeCue' : 'editorialBody';
      assert.equal(dom.getComputedStyle(body).fontSize, resolvedSize(theme.typography[bodyRole].fontSize), `${name}:${width}: mobile body consumes semantic role`); checks += 1;
      if (name === 'root') {
        const portals = dom.document.querySelector('[data-archive-portal]').parentElement;
        assert.equal(dom.getComputedStyle(portals).gridTemplateColumns, 'repeat(2, minmax(0, 1fr))'); checks += 1;
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-cluster-title]')).fontSize, resolvedSize(theme.typography.editorialArchiveHomeLabel.fontSize)); checks += 1;
        const button = dom.document.querySelector('[data-cluster-id]');
        assert.equal(portals.querySelectorAll('[data-archive-portal]').length, 4, 'Three families plus time form a 2 by 2 grid'); checks += 1;
        assert.ok(portals.querySelector('[data-archive-chronological] [data-archive-timeline-symbol]'), 'Time entry restores the original ring'); checks += 1;
        for (const entry of portals.querySelectorAll('[data-archive-portal]')) {
          const cloud = entry.querySelector('.archive-cluster-cloud');
          const label = entry.querySelector('[data-cluster-title]');
          assert.equal(dom.getComputedStyle(entry.querySelector('button')).display, 'block'); checks += 1;
          assert.equal(dom.getComputedStyle(label).position || 'static', 'static'); checks += 1;
          assert.equal(dom.getComputedStyle(label).display, 'block'); checks += 1;
          assert.ok(!cloud.contains(label) && cloud.compareDocumentPosition(label) & dom.Node.DOCUMENT_POSITION_FOLLOWING, 'Text flows beneath the glyph'); checks += 1;
          assert.equal(dom.getComputedStyle(cloud).maxWidth, resolvedSize(theme.editorial.archiveHome.glyphMaxSize)); checks += 1;
        }
        assert.equal(dom.getComputedStyle(button).display, 'block', 'Mobile entries stack vertically, never side-by-side cards'); checks += 1;
        assert.ok(button.contains(body), 'Symbol and reading open the same family'); checks += 1;
        assert.equal(dom.document.querySelectorAll('[data-family-reading]').length, dom.document.querySelectorAll('[data-family-symbol]').length, 'One short cue per family'); checks += 1;
      }
      if (name === 'feed') {
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-archive-index]')).backgroundColor, 'transparent', 'Index bar has no background'); checks += 1;
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
        const heading = dom.document.querySelector('[data-archetype-section] header');
        assert.ok(Number(dom.getComputedStyle(heading.querySelector('h2')).fontWeight) >= 700); checks += 1;
        assert.ok(parseFloat(dom.getComputedStyle(heading.querySelector('p')).fontSize) <= parseFloat(dom.getComputedStyle(body).fontSize) * 1.25, 'Sans reading stays near body scale below the title'); checks += 1;
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
