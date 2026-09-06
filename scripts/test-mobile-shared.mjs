/** In-memory DOM regression checks only. No browser automation or remote calls. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
dom.document.write('<!doctype html><html><body><div id="root"></div></body></html>');
let width = 390;
const media = new Map();
dom.matchMedia = (query) => {
  if (!media.has(query)) {
    const listeners = new Set();
    media.set(query, { media: query, get matches() {
      const max = /max-width:\s*([\d.]+)px/.exec(query);
      return max ? width <= Number(max[1]) : false;
    }, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn),
    addListener: (fn) => listeners.add(fn), removeListener: (fn) => listeners.delete(fn), listeners });
  }
  return media.get(query);
};
const globals = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment, MutationObserver: dom.MutationObserver,
  getComputedStyle: dom.getComputedStyle.bind(dom), requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
  cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom), IS_REACT_ACT_ENVIRONMENT: true };
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement: h, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { createMemoryRouter, RouterProvider } = await import('react-router-dom');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
const root = createRoot(document.getElementById('root'));
let router;
let checks = 0;
const check = (run) => { run(); checks++; };
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 40)));
const resize = async (next) => {
  await act(async () => {
    width = next;
    for (const entry of media.values()) for (const fn of entry.listeners) fn({ matches: entry.matches, media: entry.media });
  });
};
try {
  const { default: Page } = await server.ssrLoadModule('/src/components/templates/ArchiveComparePage.jsx');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { createArchiveStoryClient, ARCHIVE_STORY_IDS } = await server.ssrLoadModule('/src/test-fixtures/archiveClient.js');
  router = createMemoryRouter([{ path: '/compare/:leftId/:rightId?', element: h(Page, { client: createArchiveStoryClient() }) }],
    { initialEntries: [`/compare/${ARCHIVE_STORY_IDS.left}`] });
  await act(async () => root.render(h(LocaleProvider, { initialMode: 'en', syncDocument: false },
    h(ThemeProvider, { theme }, h(RouterProvider, { router })))));
  await settle();
  const input = document.querySelector('form input');
  const form = document.querySelector('form');
  check(() => assert.ok(input && form, 'Comparison invitation input is available'));
  const enterName = async (value) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new dom.Event('input', { bubbles: true }));
      input.focus();
    });
  };
  const submit = () => act(async () => form.dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true })));
  await enterName('Louise');
  await submit();
  check(() => assert.notEqual(document.activeElement, input, 'Successful mobile submission blurs the name input'));
  check(() => assert.ok(document.querySelector('[data-comparison-reading]'), 'Successful submit creates comparison'));
  await enterName('');
  await submit();
  check(() => assert.equal(document.activeElement, input, 'Invalid mobile input stays focused for correction'));
  check(() => assert.equal(input.getAttribute('aria-invalid'), 'true', 'Invalid input retains validation feedback'));
  await enterName('Hannah');
  const composingEnter = new dom.KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: true, bubbles: true, cancelable: true });
  await act(async () => input.dispatchEvent(composingEnter));
  check(() => assert.equal(composingEnter.defaultPrevented, true, 'IME confirmation Enter does not prematurely submit'));
  check(() => assert.equal(document.activeElement, input, 'IME Enter does not dismiss keyboard'));
  await resize(1200);
  await enterName('Ian');
  await submit();
  check(() => assert.equal(document.activeElement, input, 'Desktop successful submit preserves previous focus behavior'));
  const compareSource = await readFile('src/components/templates/ArchiveComparePage.jsx', 'utf8');
  check(() => assert.match(compareSource, /if \(isMobile\) event\.currentTarget\.querySelector\('input'\)\?\.blur\(\)/));
  check(() => assert.match(compareSource, /\[theme\.breakpoints\.down\('md'\)\]: \{ flexDirection: 'column'/));
  const pairSource = await readFile('src/components/data-display/GlyphPairComparison.jsx', 'utf8');
  check(() => assert.match(pairSource, /\[theme\.breakpoints\.down\('md'\)\]: \{ '& \[role="img"\]:not\(canvas\)'/,
    'Only the invalid placeholder receives the mobile sizing override'));
  const publishSource = await readFile('src/components/overlay-feedback/PublishDialog.jsx', 'utf8');
  check(() => assert.match(publishSource, /\[theme\.breakpoints\.down\('md'\)\]: \{\s+m: '12px', width: 'calc\(100% - 24px\)'/));
  check(() => assert.match(publishSource, /maxHeight: 'calc\(100dvh - 24px - env\(safe-area-inset-top, 0px\) - env\(safe-area-inset-bottom, 0px\)\)'/));
  const navSource = await readFile('src/components/navigation/AppGNB.jsx', 'utf8');
  check(() => assert.match(navSource, /\[theme\.breakpoints\.down\('md'\)\]: \{ pl: 'max\(16px, env\(safe-area-inset-left, 0px\)\)'/));
  const detailSource = await readFile('src/components/templates/GlyphDetailPage.jsx', 'utf8');
  check(() => assert.match(detailSource, /gridTemplateColumns: '1fr 1fr', gap: 1,\s+\[theme\.breakpoints\.down\('md'\)\]: \{ gridTemplateColumns: 'minmax\(0, 1fr\) minmax\(0, 1fr\)'/));
  console.log(`Mobile shared: ${checks} checks passed; mobile success/invalid/IME, unchanged desktop focus, mobile-only style contracts. In-memory DOM, not browser rendering.`);
} finally {
  await act(async () => root.unmount());
  router?.dispose();
  await server.close();
  await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
