/** In-memory DOM only. No browser engine, pixels, network, or real publication. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/canvas', width: 390, height: 844,
  settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true } });
const originalMatchMedia = dom.matchMedia.bind(dom);
dom.matchMedia = (query) => query === '(prefers-reduced-motion: reduce)'
  ? { matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  : originalMatchMedia(query);
dom.HTMLCanvasElement.prototype.getContext = function getContext(type) {
  return type !== '2d' ? null : new Proxy({ canvas: this, createRadialGradient: () => ({ addColorStop() {} }) }, {
    get: (target, key) => key in target ? target[key] : () => {},
  });
};
const viewport = new dom.EventTarget();
Object.assign(viewport, { height: 844, offsetTop: 0, scale: 1 });
Object.defineProperty(dom, 'visualViewport', { configurable: true, value: viewport });
dom.document.write('<!doctype html><html><body><div id="root"></div></body></html>');
let requests = 0;
const globals = {
  window: dom, document: dom.document, navigator: dom.navigator, location: dom.location,
  HTMLElement: dom.HTMLElement, Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment,
  MutationObserver: dom.MutationObserver, getComputedStyle: dom.getComputedStyle.bind(dom),
  ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() { this.callback([{ contentRect: { width: dom.innerWidth, height: 280 } }]); } disconnect() {} },
  requestAnimationFrame: dom.requestAnimationFrame.bind(dom), cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom),
  fetch: () => { requests += 1; throw new Error('Mobile Canvas test forbids network'); }, IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react()], define: { 'import.meta.env.VITE_MUSIC_AUTOPLAY': '"false"' },
  server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true },
  environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root;
let checks = 0;
const check = (run) => { run(); checks += 1; };
const input = () => document.querySelector('[data-encoder-controls] input');
const enter = (options = {}) => act(async () => input().dispatchEvent(new dom.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...options })));
const setName = (value) => act(async () => {
  Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input(), value);
  input().dispatchEvent(new dom.Event('input', { bubbles: true }));
});
try {
  const { default: Encoder } = await server.ssrLoadModule('/src/components/templates/HeptapodEncoderPage.jsx');
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { I18nContext } = await server.ssrLoadModule('/src/i18n/useI18n.js');
  const { createTranslator } = await server.ssrLoadModule('/src/i18n/messages.js');
  const { createArchiveStoryClient } = await server.ssrLoadModule('/src/test-fixtures/archiveClient.js');
  const session = {};
  const mount = async () => {
    if (root) await act(async () => root.unmount());
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(ThemeProvider, { theme },
      createElement(I18nContext.Provider, { value: { ...createTranslator('ko'), languageMode: 'ko', setLanguageMode() {} } },
        createElement(MemoryRouter, { initialEntries: ['/canvas'] }, createElement(Encoder, {
          initialName: '', audioActive: false, client: createArchiveStoryClient(), session,
        }))))));
  };
  await mount();
  check(() => assert.notEqual(document.activeElement, input(), 'Mobile never auto-opens keyboard on mount'));
  check(() => assert.equal(input().getAttribute('enterkeyhint'), 'done'));
  check(() => assert.equal(document.querySelector('[data-encoder-controls]').tagName, 'FORM'));
  await act(async () => input().focus());
  await setName('서연');
  await enter({ isComposing: true });
  check(() => assert.equal(session.snapshot.encodedName, '', 'Composing Enter does not create a partial Hangul glyph'));
  check(() => assert.equal(document.activeElement, input()));
  await enter({ keyCode: 229 });
  check(() => assert.equal(session.snapshot.encodedName, '', 'IME keyCode fallback is guarded'));
  const safariCommit = new dom.KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true });
  await act(async () => input().dispatchEvent(safariCommit));
  check(() => assert.equal(safariCommit.defaultPrevented, true, 'Safari composition key cannot implicitly submit the form'));
  await act(async () => input().dispatchEvent(new dom.CompositionEvent('compositionstart', { bubbles: true })));
  await act(async () => document.querySelector('form').dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true })));
  check(() => assert.equal(session.snapshot.encodedName, '', 'Form submit also respects active IME composition'));
  await act(async () => input().dispatchEvent(new dom.CompositionEvent('compositionend', { bubbles: true })));
  await enter();
  check(() => assert.equal(session.snapshot.encodedName, '서연'));
  check(() => assert.notEqual(document.activeElement, input(), 'Valid mobile Enter dismisses keyboard via blur'));
  await act(async () => input().focus());
  await enter();
  check(() => assert.notEqual(document.activeElement, input(), 'Done on unchanged valid name also dismisses keyboard'));
  await act(async () => input().focus());
  await setName('   ');
  await enter();
  check(() => assert.equal(document.activeElement, input(), 'Blank input keeps keyboard available'));
  check(() => assert.equal(session.snapshot.encodedName, '서연'));
  await setName('a'.repeat(1000));
  await enter();
  check(() => assert.equal(document.activeElement, input(), 'Invalid input keeps focus'));
  check(() => assert.ok(session.snapshot.inputError));
  await setName('Louise');
  await act(async () => document.querySelector('form').dispatchEvent(new dom.Event('submit', { bubbles: true, cancelable: true })));
  check(() => assert.equal(session.snapshot.encodedName, 'Louise'));
  check(() => assert.notEqual(document.activeElement, input(), 'Keyboard form submission works without a keydown event'));
  const page = document.querySelector('[data-encoder-result]');
  check(() => assert.equal(getComputedStyle(page).height, 'auto', 'Mobile page is not locked to clipped 100vh'));
  check(() => assert.equal(getComputedStyle(document.querySelector('[data-encoder-controls]')).position, 'relative'));
  check(() => assert.equal(getComputedStyle(document.querySelector('[data-encoder-overlay]')).position, 'relative'));
  check(() => assert.equal(getComputedStyle(document.querySelector('[data-encoder-metadata]')).gridTemplateRows, 'repeat(2, 32px)'));
  let scrolled = 0;
  input().scrollIntoView = () => { scrolled += 1; };
  input().getBoundingClientRect = () => ({ top: 600, bottom: 644 });
  await act(async () => input().focus());
  viewport.height = 420;
  await act(async () => { viewport.dispatchEvent(new dom.Event('resize')); await new Promise((resolve) => setTimeout(resolve, 30)); });
  check(() => assert.equal(page.dataset.encoderKeyboard, 'open'));
  check(() => assert.equal(scrolled, 1, 'Covered input is brought into the visual viewport'));
  viewport.scale = 2;
  await act(async () => { viewport.dispatchEvent(new dom.Event('resize')); await new Promise((resolve) => setTimeout(resolve, 30)); });
  check(() => assert.equal(scrolled, 1, 'Pinch zoom is not mistaken for a keyboard scroll request'));
  viewport.scale = 1;
  await enter();
  await act(async () => document.querySelector('[data-encoder-analysis]').click());
  check(() => assert.ok(document.querySelector('[role="dialog"] .hb-edge'), 'Mobile analysis keeps the green mesh'));
  check(() => assert.ok(document.querySelector('[data-encoder-mobile-glyph]')));
  await act(async () => [...document.querySelectorAll('[role="dialog"] button')].find((item) => item.textContent === createTranslator('ko').t('heptapodEncoderPage.close')).click());
  dom.happyDOM.setWindowSize({ width: 844, height: 390 });
  await act(async () => dom.dispatchEvent(new dom.Event('resize')));
  check(() => assert.equal(getComputedStyle(page).height, 'auto', 'Landscape content remains scroll-reachable'));
  await act(async () => root.unmount()); root = null;
  check(() => assert.equal(page.dataset.encoderKeyboard, undefined, 'Viewport state is cleaned up'));
  dom.happyDOM.setWindowSize({ width: 1280, height: 900 });
  await mount();
  check(() => assert.equal(input().getAttribute('enterkeyhint'), 'go', 'Desktop keyboard hint is unchanged'));
  check(() => assert.equal(getComputedStyle(document.querySelector('[data-encoder-result]')).height, '900px', 'Desktop remains exactly 100vh'));
  check(() => assert.equal(getComputedStyle(document.querySelector('[data-encoder-overlay]')).position, 'absolute'));
  check(() => assert.equal(getComputedStyle(document.querySelector('[data-encoder-overlay]')).width, '320px'));
  check(() => assert.equal(getComputedStyle(document.querySelector('[data-encoder-metadata]')).gridTemplateRows, 'repeat(4, 32px)'));
  await act(async () => input().focus());
  await setName('Ian'); await enter();
  check(() => assert.equal(session.snapshot.encodedName, 'Ian'));
  check(() => assert.equal(document.activeElement, input(), 'Desktop Enter focus behavior remains unchanged'));
  check(() => assert.equal(requests, 0));
  console.log(`Mobile Canvas: ${checks} checks passed (IME, Done/Enter, form submit, viewport, landscape, analysis and PC invariants; in-memory DOM only).`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close(); await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
