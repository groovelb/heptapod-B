/** In-memory routing and URL contracts. No browser, real audio, network or publish. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { APP_PATHS, canvasEntry, legacyCanvasLocation } from '../src/routes/paths.js';

let checks = 0;
const check = (run) => { run(); checks += 1; };
check(() => assert.deepEqual(canvasEntry(), { initialName: '', initialEncoderVersion: 2 }));
check(() => assert.deepEqual(canvasEntry('?name=%20'), { initialName: '', initialEncoderVersion: 2 }));
check(() => assert.deepEqual(canvasEntry('?name=Louise'), { initialName: 'Louise', initialEncoderVersion: 1 }));
check(() => assert.deepEqual(canvasEntry('?name=%EB%AF%BC%EC%A4%80&v=2'), { initialName: '민준', initialEncoderVersion: 2 }));
check(() => assert.equal(legacyCanvasLocation({ search: '?create=0' }), null));
check(() => assert.equal(legacyCanvasLocation({ search: '?name=%20' }), null));
check(() => assert.deepEqual(legacyCanvasLocation({ search: '?create=1' }), { pathname: '/canvas', search: '', hash: '' }));
check(() => assert.deepEqual(legacyCanvasLocation({ search: '?name=Louise&v=2&create=1', hash: '#glyph' }), { pathname: '/canvas', search: '?name=Louise&v=2', hash: '#glyph' }));

const dom = new Window({ url: 'http://localhost/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
dom.document.write('<!doctype html><html><body><div id="root"></div></body></html>');
Object.defineProperty(dom.Element.prototype, 'animate', { configurable: true, value: undefined });
dom.HTMLCanvasElement.prototype.getContext = function getContext(type) {
  if (type !== '2d') return null;
  return new Proxy({ canvas: this, createRadialGradient: () => ({ addColorStop() {} }) }, {
    get: (target, key) => key in target ? target[key] : () => {},
  });
};
const nativeMatchMedia = dom.matchMedia.bind(dom);
dom.matchMedia = (query) => query.includes('prefers-reduced-motion')
  ? { matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  : nativeMatchMedia(query);
class Observer { observe() {} disconnect() {} }
let requests = 0;
const globals = { window: dom, document: dom.document, navigator: dom.navigator, location: dom.location,
  HTMLElement: dom.HTMLElement, Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment,
  MutationObserver: dom.MutationObserver, ResizeObserver: Observer, IntersectionObserver: Observer,
  getComputedStyle: dom.getComputedStyle.bind(dom), requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
  cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom), IS_REACT_ACT_ENVIRONMENT: true,
  fetch: () => { requests += 1; throw new Error('No network in route tests'); } };
const original = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { createMemoryRouter, RouterProvider } = await import('react-router-dom');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root;
let router;
const settle = async () => act(async () => new Promise((resolve) => setTimeout(resolve, 80)));
const input = () => document.querySelector('[data-encoder-result] input');
const result = () => document.querySelector('[data-encoder-result]');
try {
  const { LandingRoute, CanvasRoute } = await server.ssrLoadModule('/src/routes/EncoderRoutes.jsx');
  const { default: Archive } = await server.ssrLoadModule('/src/components/templates/MyArchivePage.jsx');
  const { default: NavigationSessionProvider } = await server.ssrLoadModule('/src/routes/NavigationSessionProvider.jsx');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { createArchiveStoryClient } = await server.ssrLoadModule('/src/test-fixtures/archiveClient.js');
  const client = createArchiveStoryClient();
  const mount = async (entry) => {
    if (root) await act(async () => root.unmount());
    router?.dispose();
    router = createMemoryRouter([
      { path: APP_PATHS.landing, element: createElement(LandingRoute) },
      { path: APP_PATHS.canvas, element: createElement(CanvasRoute, { client, audioActive: false }) },
      { path: APP_PATHS.archive, element: createElement(Archive, { client }) },
    ], { initialEntries: [entry] });
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(LocaleProvider, { initialMode: 'ko', syncDocument: false },
      createElement(ThemeProvider, { theme }, createElement(NavigationSessionProvider, null, createElement(RouterProvider, { router }))))));
    await settle();
  };
  await mount('/');
  check(() => assert.ok(document.querySelector('[data-hero-intro]')));
  check(() => assert.equal(result(), null, 'Landing does not hide/pre-mount Canvas'));
  check(() => assert.equal(document.documentElement.style.overflow, 'hidden'));
  await act(async () => document.querySelector('header a[href="/canvas"]').click());
  check(() => assert.equal(document.querySelector('video'), null));
  check(() => assert.equal(document.querySelector('#hero-scrub-track'), null));
  check(() => assert.equal(document.documentElement.style.overflow, '', 'Leaving the landing releases the scroll lock'));
  check(() => assert.ok(input()));
  check(() => assert.equal(input().value, ''));
  check(() => assert.equal(result().dataset.encoderVersion, '2'));

  for (const [url, name, version] of [
    ['/canvas', '', '2'], ['/canvas?name=%20', '', '2'], ['/canvas?name=Louise&v=2', 'Louise', '2'],
    ['/?name=Louise', 'Louise', '1'], ['/?name=민준&v=2#glyph', '민준', '2'], ['/?create=1', '', '2'],
  ]) {
    await mount(url);
    check(() => assert.equal(router.state.location.pathname, '/canvas'));
    check(() => assert.equal(input().value, name));
    check(() => assert.equal(result().dataset.encoderVersion, version));
    check(() => assert.equal(document.querySelector('[data-hero-intro]'), null));
    if (url.startsWith('/?')) check(() => assert.equal(router.state.historyAction, 'REPLACE'));
    if (url.includes('#glyph')) check(() => assert.equal(router.state.location.hash, '#glyph'));
  }
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input(), 'Louise');
    input().dispatchEvent(new dom.Event('input', { bubbles: true }));
  });
  await act(async () => input().dispatchEvent(new dom.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  check(() => assert.ok(document.querySelector('[data-encoder-overlay]')));
  check(() => assert.equal(document.querySelector('[data-encoder-overlay]').querySelectorAll('button:not([data-glyph-cluster-link]), a:not([data-glyph-cluster-link])').length, 3));
  check(() => assert.ok(document.querySelector('[data-encoder-overlay] [data-glyph-cluster-link]').getAttribute('href').includes('group=')));
  check(() => assert.equal(router.state.location.search, '', 'Local name input is not added to the URL'));
  const currentSession = result();
  await act(async () => router.navigate('/canvas?lang=en'));
  check(() => assert.equal(result(), currentSession, 'Unrelated query changes keep the current input/session'));
  check(() => assert.equal(input().value, 'Louise'));
  await act(async () => document.querySelector('a[href="/archive"]').click());
  await settle();
  check(() => assert.equal(router.state.location.pathname, '/archive'));
  check(() => assert.equal(result(), null));
  check(() => assert.ok(document.querySelector('[data-archive-depth]')));
  await act(async () => router.navigate(-1));
  check(() => assert.equal(router.state.location.pathname, '/canvas'));
  check(() => assert.equal(input().value, 'Louise', 'Canvas input survives leaving and browser Back'));
  check(() => assert.ok(document.querySelector('[data-encoder-overlay]'), 'Generated result is restored'));
  check(() => assert.equal(document.querySelector('[data-hero-intro]'), null));
  const analysisButton = () => document.querySelector('[data-encoder-overlay] button[aria-pressed]');
  await act(async () => analysisButton().click());
  check(() => assert.equal(analysisButton().getAttribute('aria-pressed'), 'true'));
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input(), 'Louise draft');
    input().dispatchEvent(new dom.Event('input', { bubbles: true }));
  });
  await act(async () => router.navigate('/archive'));
  await settle();
  check(() => assert.doesNotMatch(document.querySelector('header').textContent, /내 표식 남기기/));
  await act(async () => router.navigate('/canvas'));
  check(() => assert.equal(router.state.location.pathname, '/canvas'));
  check(() => assert.equal(router.state.location.search, ''));
  check(() => assert.equal(input().value, 'Louise draft', 'Unsubmitted draft is restored separately from the result'));
  check(() => assert.equal(analysisButton().getAttribute('aria-pressed'), 'true', 'Analysis choice survives navigation'));
  check(() => assert.equal(document.querySelector('video'), null));
  await act(async () => router.navigate('/canvas?name=Ian&v=2'));
  check(() => assert.equal(input().value, 'Ian', 'New URL entry replaces the encode session'));
  check(() => assert.equal(requests, 0));
  check(() => assert.ok(!client.calls.includes('archive-publish')));
  const routes = await readFile(new URL('../src/routes/AppRoutes.jsx', import.meta.url), 'utf8');
  for (const path of ['/glyph/:id', '/field/:id', '/compare/:leftId/:rightId?', '/me']) check(() => assert.ok(routes.includes(`path="${path}"`)));
  check(() => assert.match(routes, /path="\/me" element=\{ <Navigate to=\{ APP_PATHS\.archive \} replace \/>/));
  check(() => assert.doesNotMatch(routes, /MyResponsesPage/));
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  check(() => assert.match(app, /<AppRoutes \/>/));
  check(() => assert.doesNotMatch(app, /<HeptapodHeroIntro|<HeptapodEncoderPage/));
  console.log(`Canvas routes: ${checks} checks passed; independent entry, legacy redirects/version, input, Archive navigation/Back, scroll unlock and no network.`);
} finally {
  if (root) await act(async () => root.unmount());
  router?.dispose();
  await server.close();
  await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(original)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
