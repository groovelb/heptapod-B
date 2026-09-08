/** In-memory DOM and actual local media metadata only; no browser automation. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
Object.defineProperty(dom.navigator, 'languages', { configurable: true, value: ['ko-KR'] });
dom.document.write('<html><body><div id="root"></div></body></html>');
const globals = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment, MutationObserver: dom.MutationObserver,
  getComputedStyle: dom.getComputedStyle.bind(dom), requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
  cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom), IS_REACT_ACT_ENVIRONMENT: true,
  IntersectionObserver: class { constructor(cb) { this.cb = cb; } observe(target) { this.cb([{ target, isIntersecting: true }]); } disconnect() {} } };
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement: h, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { createMemoryRouter, RouterProvider } = await import('react-router-dom');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root;
let router;
let y = 0;
let cellHeight = 700;
let viewportHeight = 780;
let width = 390;
const match = dom.matchMedia.bind(dom);
dom.matchMedia = (query) => /max-width:\s*899/.test(query)
  ? { matches: width < 900, media: query, addEventListener() {}, removeEventListener() {} }
  : match(query);
Object.defineProperty(dom, 'innerHeight', { configurable: true, get: () => viewportHeight });
Object.defineProperty(dom, 'innerWidth', { configurable: true, get: () => width });
Object.defineProperty(dom, 'scrollY', { configurable: true, get: () => y });
dom.HTMLElement.prototype.getBoundingClientRect = function () {
  const track = this.id === 'hero-scrub-track';
  return { top: track ? -y : 0, left: 0, right: width, bottom: 0, width, height: track ? cellHeight * 4.85 : cellHeight };
};
const proto = dom.HTMLMediaElement.prototype;
for (const [key, value] of Object.entries({ duration: 47.09, readyState: 0, paused: true, seeking: false, ended: false, error: null })) {
  Object.defineProperty(proto, key, { configurable: true, get() { return this[`_${key}`] ?? value; }, set(v) { this[`_${key}`] = v; } });
}
// These navigation scenarios use fully downloaded media; buffering is covered separately.
Object.defineProperty(proto, 'buffered', { configurable: true, get() {
  const end = Number.isFinite(this.duration) && this.readyState >= 3 ? this.duration : 0;
  return { length: end ? 1 : 0, start: () => 0, end: () => end };
} });
Object.defineProperty(proto, 'currentTime', { configurable: true,
  get() { return this._time ?? 0; },
  set(value) { this._time = value; this.seeking = true; (this.seekWrites ??= []).push(value); if (!this.holdSeek) queueMicrotask(() => settle(this)); },
});
function settle(video) { video.seeking = false; video.dispatchEvent(new dom.Event('seeked')); }
proto.play = function () {
  (this.playStarts ??= []).push(this.currentTime);
  if (this.rejectPlay) return Promise.reject(new Error('Mobile autoplay blocked'));
  this.paused = false;
  if (this.readyState >= 3 && !this.seeking) this.dispatchEvent(new dom.Event('playing'));
  return Promise.resolve();
};
proto.pause = function () { this.paused = true; };
proto.load = function () {
  this.readyState = 0; this.duration = NaN; this.error = null; this.ended = false;
  this._time = 0; this.seeking = false; this.paused = true;
  this.dispatchEvent(new dom.Event('emptied'));
  this.dispatchEvent(new dom.Event('loadstart'));
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emit = (target, name) => act(async () => target.dispatchEvent(new dom.Event(name)));
const scroll = (value) => act(async () => { y = value; dom.dispatchEvent(new dom.Event('scroll')); await pause(35); });
const state = () => document.querySelector('[data-hero-affordance]')?.dataset.heroAffordance;
let checks = 0;
const check = (fn) => { fn(); checks += 1; };
try {
  const { HERO_SCRUB_TIMELINE: desktop, HERO_MOBILE_SCRUB_TIMELINE: mobile, getMobileTrackProgress, mapTrackToVideo } = await server.ssrLoadModule('/src/data/heptapodScrubTimeline.js');
  check(() => assert.equal(desktop.scrubCells, 6.4));
  check(() => assert.ok(Math.abs(mobile.scrubCells - 4.85) < 1e-10));
  check(() => assert.deepEqual(desktop.clips.map((c) => c.cells), [0.8, 1.25, 1, 1.25, 0.9, 1.2]));
  check(() => assert.deepEqual(mobile.clips.map((c) => [c.startNorm, c.endNorm]), desktop.clips.map((c) => [c.startNorm, c.endNorm])));
  check(() => assert.equal(getMobileTrackProgress(210, { top: 0, height: 3395 }, 4.85).title, 1));
  const { LandingRoute } = await server.ssrLoadModule('/src/routes/EncoderRoutes.jsx');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { ThemeProvider } = await import('@mui/material/styles');
  const { defaultTheme } = await server.ssrLoadModule('/src/styles/themes/index.js');
  router = createMemoryRouter([{ path: '/', element: h(LandingRoute) }, { path: '/canvas', element: h('div', { 'data-canvas': true }) }], { initialEntries: ['/'] });
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(h(ThemeProvider, { theme: defaultTheme }, h(LocaleProvider, null, h(RouterProvider, { router })))));
  for (let attempt = 0; !document.querySelector('video') && attempt < 100; attempt += 1) {
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
  }
  const video = document.querySelector('video');
  check(() => assert.equal(document.querySelector('[data-hero-intro]').dataset.heroProfile, 'mobile'));
  check(() => assert.match(video.querySelector('source').src, /hero-scrub-1080x1920\.mp4$/));
  check(() => assert.equal(document.querySelector('[data-hero-intro]').dataset.heroVideoVersion, 'v2'));
  check(() => assert.match(video.querySelector('source').src, /hero-scrub-v2-mobile/));
  check(() => assert.match(document.querySelector('[data-hero-intro] img').src, /hero-scrub-v2-mobile\/hero-scrub-poster\.jpg$/));
  check(() => assert.equal(document.querySelector('[data-hero-video-toggle]'), null, 'Production hero has no comparison UI'));
  const hero = document.querySelector('[data-hero-intro]');
  check(() => assert.equal(getComputedStyle(hero).overflowX, 'clip', 'Caption transforms cannot widen the document or create a nested scroll container'));
  const finalCaption = document.querySelector('[data-sticky-caption] > div');
  check(() => assert.equal(getComputedStyle(finalCaption).position, 'sticky', 'Horizontal containment preserves the ending caption sticky positioning'));
  const instruments = [...hero.querySelectorAll('p')].filter((p) => p.textContent.startsWith('SHOT '));
  check(() => assert.equal(instruments.length, 2, 'Both the seed and ending readouts are covered'));
  for (const instrument of instruments) {
    check(() => assert.equal(getComputedStyle(instrument).whiteSpace, 'pre-wrap', 'Long instrument readouts may wrap on mobile'));
    check(() => assert.equal(getComputedStyle(instrument).maxWidth, '100%'));
  }
  check(() => assert.equal(getComputedStyle(finalCaption.firstElementChild).maxWidth, '100%', 'Final caption content is bounded by its padded frame'));
  video.readyState = 3;
  await emit(video, 'canplay');
  const start = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('START'));
  assert.ok(start, [...document.querySelectorAll('button')].map((b) => b.textContent).join(' | '));
  await act(async () => document.querySelector('button[aria-pressed="true"]').click());
  await act(async () => start.click());
  await scroll(2200);
  check(() => assert.ok(Math.abs(video.currentTime / video.duration - mapTrackToVideo(mobile, 2200 / 3395)) < 1e-8));
  const counter = document.querySelector('[data-hero-beat-counter]');
  check(() => assert.ok(counter));
  check(() => assert.equal(counter.closest('#hero-scrub-track'), null, 'Indicator is outside the ending scroll track'));
  check(() => assert.equal(getComputedStyle(counter.parentElement).position, 'fixed', 'Indicator stays anchored to the viewport'));
  const checkpoint = video.currentTime;
  check(() => assert.equal(document.querySelectorAll('video').length, 1));
  viewportHeight = 900; // Browser chrome changes, but stable svh track does not.
  await emit(dom, 'resize');
  await act(async () => pause(40));
  check(() => assert.equal(video.currentTime, checkpoint));
  check(() => assert.equal(state(), 'scroll'));
  cellHeight = 420; viewportHeight = 430; width = 820; y = 2200 / 700 * 420;
  await emit(dom, 'resize');
  await act(async () => pause(40));
  check(() => assert.ok(Math.abs(video.currentTime - checkpoint) < 1e-8, 'Rotation recomputes both clocks from the same track'));
  check(() => assert.match(video.querySelector('source').src, /hero-scrub-1080x1920\.mp4$/));
  video.holdSeek = true;
  await scroll(4.1 * cellHeight);
  const pendingFrame = video.currentTime;
  const writes = [...video.seekWrites];
  await scroll(4.6 * cellHeight);
  check(() => assert.equal(state(), 'waiting'));
  check(() => assert.equal(getComputedStyle(counter.parentElement).position, 'fixed', 'Last-section scrolling cannot release the indicator'));
  check(() => assert.deepEqual(video.seekWrites, writes, 'Autoplay never writes a later queued seek'));
  video.rejectPlay = true;
  await act(async () => settle(video));
  check(() => assert.equal(state(), 'error'));
  check(() => assert.equal(video.currentTime, pendingFrame));
  video.rejectPlay = false;
  await emit(video, 'canplay');
  check(() => assert.equal(state(), 'playing', 'Ready after seek can resume a rejected mobile playback'));
  check(() => assert.equal(video.playStarts.at(-1), pendingFrame));
  video.paused = true; video.rejectPlay = true;
  await emit(video, 'pause');
  await emit(dom, 'pointerup');
  check(() => assert.equal(state(), 'error'));
  video.rejectPlay = false;
  await emit(dom, 'pointerup');
  check(() => assert.equal(state(), 'playing', 'A subsequent touch gesture can recover autoplay permission'));
  await emit(video, 'ended');
  check(() => assert.equal(router.state.location.pathname, '/', 'An ended event alone cannot bypass the media'));
  video._time = video.duration; video.ended = false;
  await emit(video, 'timeupdate');
  check(() => assert.equal(router.state.location.pathname, '/', 'A last frame without native ended is not completion'));
  // WebKit can have native ended=true on foreground return before delivering its ended event.
  video.ended = true;
  await emit(document, 'visibilitychange');
  await act(async () => pause(800));
  check(() => assert.equal(router.state.location.pathname, '/canvas'));
  check(() => assert.equal(router.state.historyAction, 'REPLACE'));
  check(() => assert.ok(document.querySelector('[data-canvas]')));
  check(() => assert.equal(document.querySelector('video'), null));
  check(() => assert.equal(document.querySelector('[data-hero-beat-counter]'), null, 'Indicator leaves with the completed hero'));
  const key = router.state.location.key;
  await emit(video, 'ended');
  check(() => assert.equal(router.state.location.key, key));
  console.log(`Mobile hero: ${checks} checks passed; isolated timing, portrait video/poster, chrome/rotation clocks, seek/readiness/gesture recovery, actual-ended-only Canvas replace (no browser).`);
} finally {
  if (root) await act(async () => root.unmount());
  router?.dispose();
  await server.close();
  await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
