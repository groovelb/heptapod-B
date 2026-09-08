/** In-memory DOM occlusion contracts. No browser, pixels or network. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/canvas', width: 390, height: 844,
  settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true } });
const matchMedia = dom.matchMedia.bind(dom);
dom.matchMedia = (query) => query === '(prefers-reduced-motion: reduce)'
  ? { matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  : matchMedia(query);
dom.HTMLCanvasElement.prototype.getContext = function getContext(type) {
  return type !== '2d' ? null : new Proxy({ canvas: this, createRadialGradient: () => ({ addColorStop() {} }) }, {
    get: (target, key) => key in target ? target[key] : () => {},
  });
};
dom.document.write('<!doctype html><html><body><div id="root"></div></body></html>');
const globals = {
  window: dom, document: dom.document, navigator: dom.navigator, location: dom.location,
  HTMLElement: dom.HTMLElement, Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment,
  MutationObserver: dom.MutationObserver, getComputedStyle: dom.getComputedStyle.bind(dom),
  ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() { this.callback([{ contentRect: { width: dom.innerWidth, height: 280 } }]); } disconnect() {} },
  requestAnimationFrame: dom.requestAnimationFrame.bind(dom), cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom),
  fetch: () => { throw new Error('Occlusion tests forbid network'); }, IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react(), {
  name: 'observe-renderer-pause-prop', enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('/motion/LogogramRendererCanvas.jsx')) return null;
    return code.replace('ref={ canvasRef }', 'ref={ canvasRef } data-test-renderer-paused={ typeof isPaused !== "undefined" && isPaused }');
  },
}], define: { 'import.meta.env.VITE_MUSIC_AUTOPLAY': '"false"' }, server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root;
let checks = 0;
const check = (run) => { run(); checks += 1; };
try {
  const { default: Encoder } = await server.ssrLoadModule('/src/components/templates/HeptapodEncoderPage.jsx');
  const { default: Chamber } = await server.ssrLoadModule('/src/components/motion/LogogramChamber.jsx');
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { I18nContext } = await server.ssrLoadModule('/src/i18n/useI18n.js');
  const { createTranslator } = await server.ssrLoadModule('/src/i18n/messages.js');
  const { createArchiveStoryClient } = await server.ssrLoadModule('/src/test-fixtures/archiveClient.js');
  const ko = createTranslator('ko');
  const tree = (child) => createElement(ThemeProvider, { theme }, createElement(I18nContext.Provider, {
    value: { ...ko, languageMode: 'ko', setLanguageMode() {} },
  }, createElement(MemoryRouter, { initialEntries: ['/canvas'] }, child)));
  root = createRoot(document.getElementById('root'));
  const render = (child) => act(async () => root.render(tree(child)));
  // CSS animations remain mounted with identical timing while only play-state changes.
  for (const isFullscreen of [true, false]) {
    await render(createElement(Chamber, { isFullscreen, isActive: true, diveKey: 1, isPaused: false }));
    const layers = [...document.querySelectorAll('.chamber-fog-layer')];
    const zooms = [...document.querySelectorAll('.chamber-fog-zoom')];
    const dive = document.querySelector('.chamber-fog-dive');
    const animated = [...layers, ...zooms, dive];
    check(() => assert.equal(layers.length, 6));
    check(() => assert.equal(zooms.length, 2));
    check(() => assert.ok(dive));
    const timing = animated.map((node) => {
      const css = getComputedStyle(node);
      return [css.animationName, css.animationDuration, css.animationDelay, css.filter, css.transformOrigin];
    });
    check(() => assert.ok(animated.every((node) => getComputedStyle(node).animationPlayState === 'running')));
    await render(createElement(Chamber, { isFullscreen, isActive: true, diveKey: 1, isPaused: true }));
    check(() => assert.ok(animated.every((node) => node.isConnected), 'Pause must not rebuild any fog layer or wrapper'));
    check(() => assert.deepEqual(animated.map((node) => [node.classList[1] || node.classList[0], getComputedStyle(node).animationPlayState]), animated.map((node) => [node.classList[1] || node.classList[0], 'paused']), 'Pause all drift, zoom and dive elements, not only the container'));
    check(() => assert.deepEqual(animated.map((node) => {
      const css = getComputedStyle(node);
      return [css.animationName, css.animationDuration, css.animationDelay, css.filter, css.transformOrigin];
    }), timing, 'Pause must not alter animation identity, timing, filter or geometry'));
    await render(createElement(Chamber, { isFullscreen, isActive: true, diveKey: 1, isPaused: false }));
    check(() => assert.ok(animated.every((node) => node.isConnected && getComputedStyle(node).animationPlayState === 'running')));
  }
  const encoder = createElement(Encoder, { initialName: 'Louise', audioActive: false, client: createArchiveStoryClient() });
  await render(encoder);
  const main = () => document.querySelector('[data-encoder-stage] canvas');
  const mainBefore = main();
  const chamberBefore = document.querySelector('[data-chamber-paused]');
  check(() => assert.equal(mainBefore.dataset.testRendererPaused, 'false'));
  await act(async () => document.querySelector('[data-encoder-analysis]').click());
  check(() => assert.equal(main(), mainBefore));
  check(() => assert.equal(main().dataset.testRendererPaused, 'false', 'Visible original mobile glyph must keep running beneath the overlay'));
  check(() => assert.equal(document.querySelector('[data-encoder-mobile-glyph]'), null, 'Analysis does not create a second canvas'));
  check(() => assert.equal(document.querySelector('[data-chamber-paused]'), chamberBefore));
  check(() => assert.equal(chamberBefore.dataset.chamberPaused, 'false'));
  check(() => assert.ok(document.querySelector('[data-encoder-meaning-anchors] .hb-edge'), 'Visible green analysis mesh remains'));
  check(() => assert.equal(document.querySelector('[role="dialog"]'), null));
  await act(async () => document.querySelector('[data-encoder-analysis]').click());
  check(() => assert.equal(main(), mainBefore, 'Closing retains the underlying Canvas element'));
  check(() => assert.equal(main().dataset.testRendererPaused, 'false'));
  check(() => assert.equal(chamberBefore.dataset.chamberPaused, 'false'));
  await act(async () => document.querySelector('[data-encoder-actions] button').click());
  check(() => assert.ok(document.querySelector('[role="dialog"]')));
  check(() => assert.equal(main().dataset.testRendererPaused, 'false', 'Translucent publication dialog does not pause visible background'));
  check(() => assert.equal(chamberBefore.dataset.chamberPaused, 'false'));
  await render(null);
  await act(async () => dom.happyDOM.setViewport({ width: 1280, height: 900 }));
  await render(encoder);
  await act(async () => document.querySelector('[data-encoder-analysis]').click());
  check(() => assert.equal(document.querySelector('[role="dialog"]'), null));
  check(() => assert.equal(main().dataset.testRendererPaused, 'false', 'Desktop analysis never occludes or pauses the main canvas'));
  check(() => assert.equal(document.querySelector('[data-chamber-paused]').dataset.chamberPaused, 'false'));
  check(() => assert.ok(document.querySelector('[data-encoder-meaning-anchors] .hb-edge')));
  console.log(`Render occlusion: ${checks} checks passed; nine fog animations support pause/resume, mobile/desktop overlay analysis preserves the original running glyph and fog. In-memory DOM only.`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close(); await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
