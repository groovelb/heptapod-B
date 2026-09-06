/** In-memory DOM only: no browser engine, remote pages, or network. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
let languages = ['ko-KR', 'en-US'];
Object.defineProperty(dom.navigator, 'languages', { configurable: true, get: () => languages });
dom.document.write('<!doctype html><html><head><meta name="description"><meta property="og:title"><meta property="og:description"></head><body><div id="root"></div></body></html>');
const globals = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment, MutationObserver: dom.MutationObserver,
  getComputedStyle: dom.getComputedStyle.bind(dom), requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
  cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom), IntersectionObserver: class { constructor(callback) { this.callback = callback; } observe(target) { this.callback([{ target, isIntersecting: true }]); } disconnect() {} }, IS_REACT_ACT_ENVIRONMENT: true };
const original = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { createMemoryRouter, RouterProvider } = await import('react-router-dom');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root;
let router;
let checks = 0;
const check = (run) => { run(); checks += 1; };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let scrollY = 0;
let reduced = false;
const nativeMatchMedia = window.matchMedia.bind(window);
window.matchMedia = (query) => query.includes('prefers-reduced-motion')
  ? { matches: reduced, media: query, addEventListener() {}, removeEventListener() {} }
  : nativeMatchMedia(query);
Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
window.HTMLElement.prototype.getBoundingClientRect = function () {
  const isTrack = this.id === 'hero-scrub-track';
  const isHandoff = this.previousElementSibling?.id === 'hero-scrub-track';
  const top = isTrack ? -scrollY : isHandoff ? 6400 - scrollY : 0;
  return { top, left: 0, right: 1200, bottom: top + (isTrack ? 6400 : 1000), width: 1200, height: isTrack ? 6400 : 1000 };
};
window.HTMLElement.prototype.scrollIntoView = function () {
  scrollY = 6400;
  window.dispatchEvent(new window.Event('scroll'));
};
const proto = window.HTMLMediaElement.prototype;
for (const [name, value] of Object.entries({ readyState: 0, duration: NaN, paused: true, error: null, ended: false, seeking: false })) {
  Object.defineProperty(proto, name, { configurable: true, get() { return this[`_${name}`] ?? value; }, set(v) { this[`_${name}`] = v; } });
}
Object.defineProperty(proto, 'currentTime', {
  configurable: true,
  get() { return this._currentTime ?? 0; },
  set(value) {
    (this.seekWrites ??= []).push(value);
    this._currentTime = value;
    this.seeking = true;
    if (!this.holdSeek) queueMicrotask(() => settleSeek(this));
  },
});
function settleSeek(video) {
  video.seeking = false;
  video.dispatchEvent(new window.Event('seeked'));
  if (video.wantsPlay && video.readyState >= 3) video.dispatchEvent(new window.Event('playing'));
}
proto.play = function () {
  (this.playStarts ??= []).push(this.currentTime);
  if (this.rejectPlay || this.error) return Promise.reject(new Error('Playback blocked'));
  this.wantsPlay = true;
  this.paused = false;
  if (this.readyState >= 3 && !this.seeking) this.dispatchEvent(new window.Event('playing'));
  return Promise.resolve();
};
proto.pause = function () { this.paused = true; this.wantsPlay = false; };
proto.load = function () {
  this.readyState = 0;
  this.error = null;
  this.ended = false;
  this._currentTime = 0;
  this.dispatchEvent(new window.Event('loadstart'));
};
const event = async (target, name) => act(async () => target.dispatchEvent(new window.Event(name)));
const scroll = async (y) => act(async () => { scrollY = y; window.dispatchEvent(new window.Event('scroll')); await pause(40); });
const cue = () => document.querySelector('[data-hero-affordance]');
const state = () => cue()?.dataset.heroAffordance;
const button = (text) => [...document.querySelectorAll('button')].find((el) => el.textContent.includes(text));
const encoder = () => document.querySelector('[data-encoder]');
const handoff = () => document.querySelector('[data-hero-handoff]');
const ready = async (video) => act(async () => {
  video.duration = 47.08;
  video.readyState = 3;
  for (const name of ['loadedmetadata', 'loadeddata', 'canplay']) video.dispatchEvent(new window.Event(name));
  if (video.wantsPlay && !video.seeking) video.dispatchEvent(new window.Event('playing'));
});
const advance = async (video, time) => act(async () => {
  video._currentTime = time;
  video.ended = false;
  video.dispatchEvent(new window.Event('timeupdate'));
  await pause(60);
});
const finish = async (video) => act(async () => {
  video._currentTime = video.duration;
  video.ended = true;
  video.dispatchEvent(new window.Event('timeupdate'));
  video.dispatchEvent(new window.Event('ended'));
});
try {
  const { LandingRoute } = await server.ssrLoadModule('/src/routes/EncoderRoutes.jsx');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { ThemeProvider } = await import('@mui/material/styles');
  const { defaultTheme } = await server.ssrLoadModule('/src/styles/themes/index.js');
  function Encoder() { return createElement('div', { 'data-encoder': true }, 'Encoder'); }
  async function mount() {
    if (root) await act(async () => root.unmount());
    router?.dispose();
    scrollY = 0;
    router = createMemoryRouter([
      { path: '/', element: createElement(LandingRoute) },
      { path: '/canvas', element: createElement(Encoder) },
      { path: '/before', element: createElement('div', null, 'Previous page') },
    ], { initialEntries: ['/before', '/'], initialIndex: 1 });
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(ThemeProvider, { theme: defaultTheme },
      createElement(LocaleProvider, null, createElement(RouterProvider, { router })))));
    return document.querySelector('video');
  }
  const start = async () => {
    await act(async () => document.querySelector('button[aria-pressed="true"]').click());
    await act(async () => button('START').click());
  };
  const finalCaption = () => document.querySelector('[data-sticky-caption="B5"]');
  const exitLetters = () => [...finalCaption().querySelectorAll('[data-exit-rank]')];
  const hasArrow = () => Boolean(cue()?.querySelector('svg'));
  let video = await mount();
  check(() => assert.equal(state(), 'loading'));
  check(() => assert.equal(hasArrow(), false));
  check(() => assert.equal(button('START').disabled, true));
  check(() => assert.equal(getComputedStyle(finalCaption().firstElementChild).position, 'sticky'));
  await ready(video);
  check(() => assert.equal(button('START').disabled, false));
  await start();
  await scroll(500);
  check(() => assert.equal(state(), 'scroll'));
  check(() => assert.equal(cue().dataset.visible, 'true'));
  check(() => assert.ok(hasArrow()));
  await scroll(5450);
  check(() => assert.equal(state(), 'scroll')); // Spacer visibility must not jump 37s -> 42s.
  check(() => assert.ok(video.currentTime > 37 && video.currentTime < 38));
  await scroll(5800);
  const beforeAutoplay = video.currentTime;
  const scrubWrites = [...video.seekWrites];
  await scroll(6000);
  check(() => assert.equal(state(), 'playing'));
  check(() => assert.equal(video.currentTime, beforeAutoplay));
  check(() => assert.deepEqual(video.seekWrites, scrubWrites));
  check(() => assert.equal(hasArrow(), false));
  check(() => assert.doesNotMatch(cue().textContent, /스크롤해 이어가세요|위로 밀어 이어가세요/));
  await advance(video, 43);
  await scroll(4000);
  await scroll(6600);
  check(() => assert.equal(state(), 'playing'));
  check(() => assert.equal(video.currentTime, 43));
  check(() => assert.deepEqual(video.seekWrites, scrubWrites));
  await event(video, 'waiting');
  check(() => assert.equal(state(), 'waiting'));
  check(() => assert.equal(hasArrow(), false));
  check(() => assert.doesNotMatch(cue().textContent, /스크롤해 이어가세요|위로 밀어 이어가세요/));
  await event(video, 'ended'); // Spurious/early ended never opens the encoder.
  check(() => assert.equal(encoder(), null, 'Canvas must not mount before playback completes'));
  await event(video, 'playing');
  await advance(video, 45);
  const src = video.querySelector('source').src;
  await event(window, 'resize');
  check(() => assert.equal(video.querySelector('source').src, src));
  check(() => assert.equal(video.currentTime, 45));
  // A media reload restores the last actual playback checkpoint, never 0 or 42.
  video.error = { code: 2 };
  await event(video, 'error');
  await act(async () => button('SKIP').click());
  check(() => assert.equal(state(), 'error'));
  check(() => assert.equal(encoder(), null, 'Canvas must not mount before playback completes'));
  await act(async () => button('다시 시도').click());
  check(() => assert.ok(['loading', 'waiting'].includes(state())));
  await ready(video);
  check(() => assert.equal(video.currentTime, 45));
  check(() => assert.equal(state(), 'playing'));
  await event(video, 'waiting');
  check(() => assert.equal(hasArrow(), false));
  check(() => assert.doesNotMatch(cue().textContent, /스크롤해 이어가세요|위로 밀어 이어가세요/));
  await event(video, 'playing');
  await advance(video, 46.8);
  check(() => assert.equal(finalCaption().querySelector('h2').style.opacity, '1'));
  const lastLine = finalCaption().querySelector('p[aria-label]');
  check(() => assert.equal(lastLine.textContent, lastLine.getAttribute('aria-label')));
  check(() => assert.ok(exitLetters().every((el) => el.style.opacity === '1')));
  await finish(video);
  check(() => assert.equal(state(), 'handoff'));
  check(() => assert.equal(cue().dataset.visible, 'false'));
  const fadeStartOpacity = Number(handoff().style.opacity);
  check(() => assert.ok(fadeStartOpacity < 1, `Outgoing fog must fade in, got opacity ${fadeStartOpacity}`));
  await act(async () => pause(210));
  check(() => assert.ok(Number(handoff().style.opacity) > fadeStartOpacity && Number(handoff().style.opacity) < 1));
  check(() => assert.ok(exitLetters().some((el) => Number(el.style.opacity) < 0.95)));
  await act(async () => pause(550));
  check(() => assert.equal(cue(), null));
  check(() => assert.equal(finalCaption(), null));
  check(() => assert.ok(encoder()));
  check(() => assert.equal(router.state.location.pathname, '/canvas'));
  check(() => assert.equal(router.state.historyAction, 'REPLACE'));
  check(() => assert.equal(document.querySelector('video'), null));
  check(() => assert.equal(video.paused, true, 'The landing releases its media'));
  const canvasLocation = router.state.location.key;
  await event(video, 'ended');
  await scroll(4000);
  check(() => assert.equal(router.state.location.key, canvasLocation, 'Repeated ended or reverse scroll cannot repeat the redirect'));
  check(() => assert.equal(document.querySelector('[data-hero-intro]'), null));
  await act(async () => router.navigate(-1));
  check(() => assert.equal(router.state.location.pathname, '/before', 'Auto redirect replaces the completed landing entry'));
  // SKIP during load still waits for native video completion.
  video = await mount();
  await act(async () => button('SKIP').click());
  check(() => assert.equal(encoder(), null, 'Canvas must not mount before playback completes'));
  await ready(video);
  check(() => assert.equal(state(), 'playing'));
  check(() => assert.equal(video.currentTime, 0));
  check(() => assert.equal(hasArrow(), false));
  check(() => assert.doesNotMatch(cue().textContent, /스크롤해 이어가세요|위로 밀어 이어가세요/));
  await advance(video, 10);
  await act(async () => button('SKIP').click());
  check(() => assert.equal(video.currentTime, 10));
  // Unexpected pause / a rejected retry cannot bypass completion.
  video.paused = true;
  await event(video, 'pause');
  check(() => assert.equal(state(), 'error'));
  video.rejectPlay = true;
  await act(async () => button('다시 시도').click());
  check(() => assert.equal(state(), 'error'));
  check(() => assert.equal(video.currentTime, 10));
  video.rejectPlay = false;
  await act(async () => button('다시 시도').click());
  check(() => assert.equal(state(), 'playing'));
  // Do not play over an in-flight seek, or consume its queued later target.
  video = await mount();
  await ready(video);
  await start();
  video.holdSeek = true;
  await scroll(5450);
  const pendingPosition = video.currentTime;
  await scroll(6000);
  check(() => assert.equal(state(), 'waiting'));
  check(() => assert.equal(video.currentTime, pendingPosition));
  await act(async () => settleSeek(video));
  check(() => assert.equal(state(), 'playing'));
  check(() => assert.equal(video.currentTime, pendingPosition));
  // Reduced motion disables decorative motion, not mandatory playback.
  reduced = true;
  video = await mount();
  video.duration = 47.08;
  video.readyState = 1;
  await event(video, 'loadedmetadata');
  check(() => assert.equal(button('START').disabled, true));
  await ready(video);
  await act(async () => button('SKIP').click());
  check(() => assert.equal(state(), 'playing'));
  check(() => assert.equal(encoder(), null, 'Canvas must not mount before playback completes'));
  await finish(video);
  await act(async () => pause(750));
  check(() => assert.equal(cue(), null));
  console.log(`Hero playback: ${checks} checks passed; exclusive status cue, continuous autoplay, seeks, reverse scroll, buffering, errors, reload, SKIP, reduced motion, outgoing fade, one-time /canvas replace and media cleanup (no browser).`);
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
