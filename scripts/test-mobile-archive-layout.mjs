/** CSSOM + SSR only: no browser engine, Canvas paint, network or automation. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
  const { default: Depth } = await server.ssrLoadModule('/src/components/data-display/ArchiveDepthExplorer.jsx');
  const meanings = groupArchiveMeanings(ARCHIVE_STORY_GLYPHS);
  const section = buildArchiveArchetypeFeed(ARCHIVE_STORY_GLYPHS, meanings).sections.find((entry) => entry.glyphs.length > 1);
  const fixtures = {
    root: { onOrderChange() {} },
    feed: { filter: { base: 'reciprocity' } },
    detail: { filter: { base: 'reciprocity' }, focusedId: section.glyphs[0].id },
  };
  // Captured before mobile overrides. Hash only active desktop CSS, with Emotion
  // class hashes normalized; mobile additions must not change a desktop rule.
  const desktopBefore = {
    'root:900': 'f2decd96c811fbad80b78b227adc8278aa0b948af6f1e1ab2193c7f7ae6ab323',
    'root:1440': 'f2decd96c811fbad80b78b227adc8278aa0b948af6f1e1ab2193c7f7ae6ab323',
    'feed:900': '0cfce68cdd01063fb97dd52cff52e2f2bb024d0bf9582ad69983ed38f46708ac',
    'feed:1440': '0cfce68cdd01063fb97dd52cff52e2f2bb024d0bf9582ad69983ed38f46708ac',
    'detail:900': '7f6b76d707b6cfb7eae58f58604cab4c5bf0a8fe36dfb30dd0e2975269104553',
    'detail:1440': '7f6b76d707b6cfb7eae58f58604cab4c5bf0a8fe36dfb30dd0e2975269104553',
  };
  const activeCSS = (rules) => [...rules].flatMap((rule) => {
    if (rule.type === 4) return dom.matchMedia(rule.conditionText).matches ? activeCSS(rule.cssRules) : [];
    return [rule.cssText.replace(/css-[a-z0-9]+/g, 'css-HASH')];
  });
  for (const [name, props] of Object.entries(fixtures)) {
    const html = renderToStaticMarkup(h(ThemeProvider, { theme }, h(Depth, { glyphs: ARCHIVE_STORY_GLYPHS, meanings, ...props })));
    dom.document.body.innerHTML = html;
    const styles = [...dom.document.querySelectorAll('style')];
    for (const width of [900, 1440]) {
      dom.happyDOM.setWindowSize({ width, height: 900 });
      const css = styles.flatMap((style) => activeCSS(style.sheet.cssRules)).join('\n');
      const digest = createHash('sha256').update(css).digest('hex');
      const key = `${name}:${width}`;
      assert.equal(digest, desktopBefore[key], `${key}: desktop CSS changed`); checks += 1;
    }
    for (const [width, height] of [[320, 568], [390, 844], [844, 390]]) {
      dom.happyDOM.setWindowSize({ width, height });
      if (name === 'root') {
        const portals = dom.document.querySelector('[data-archive-portal]').parentElement;
        assert.equal(dom.getComputedStyle(portals).gridTemplateColumns, 'repeat(2, minmax(0, 1fr))'); checks += 1;
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-cluster-title]')).whiteSpace, 'normal'); checks += 1;
      }
      if (name === 'feed' && width < 600) {
        assert.equal(dom.getComputedStyle(dom.document.querySelector('[data-archetype-section] header')).flexDirection, 'column'); checks += 1;
      }
    }
  }
  console.log(`Mobile Archive layout: ${checks} checks passed, including 6 pre-change desktop CSS invariants and mobile portrait/landscape rules (SSR/CSSOM only).`);
} finally {
  await server.close();
  await dom.happyDOM.abort();
}
