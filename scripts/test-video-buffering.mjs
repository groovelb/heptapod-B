/** Deterministic media event-order regression in happy-dom; no browser or media network. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
dom.document.write('<html><body><div id="root"></div></body></html>');
let observers = 0;
const globals = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment, MutationObserver: dom.MutationObserver,
  getComputedStyle: dom.getComputedStyle.bind(dom), requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
  cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom), IS_REACT_ACT_ENVIRONMENT: true,
  IntersectionObserver: class { constructor(cb) { this.cb = cb; observers += 1; } observe(target) { this.cb([{ target, isIntersecting: true }]); } disconnect() { observers -= 1; } } };
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement: h, createRef, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root;
let y = 0;
Object.defineProperty(dom, 'scrollY', { configurable: true, get: () => y });
dom.HTMLElement.prototype.getBoundingClientRect = () => ({ top: -y, left: 0, right: 390, bottom: 1000 - y, width: 390, height: 1000 });
const proto = dom.HTMLMediaElement.prototype;
for (const [key, value] of Object.entries({ duration: NaN, readyState: 0, networkState: 2, paused: true, seeking: false, ended: false, error: null })) {
  Object.defineProperty(proto, key, { configurable: true, get() { return this[`_${key}`] ?? value; }, set(v) { this[`_${key}`] = v; } });
}
Object.defineProperty(proto, 'currentTime', { configurable: true,
  get() { return this._time ?? 0; },
  set(value) { this._time = value; this.seeking = true; (this.seekWrites ??= []).push(value); },
});
function settle(video) { video.seeking = false; video.dispatchEvent(new dom.Event('seeked')); }
proto.play = function () { this.paused = false; (this.playStarts ??= []).push(this.currentTime); return Promise.resolve(); };
proto.pause = function () { this.paused = true; };
proto.load = function () {
  this.readyState = 0; this.duration = NaN; this.error = null; this.ended = false;
  this._time = 0; this.seeking = false; this.paused = true;
  this._ranges = [];
  this.dispatchEvent(new dom.Event('emptied'));
  this.dispatchEvent(new dom.Event('loadstart'));
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emit = (target, name) => act(async () => target.dispatchEvent(new dom.Event(name)));
const scroll = (value) => act(async () => { y = value; dom.dispatchEvent(new dom.Event('scroll')); await pause(35); });
const metadata = (video) => act(async () => { video.duration = 50; video.readyState = 1; video.dispatchEvent(new dom.Event('loadedmetadata')); });
const ready = (video) => act(async () => { video.readyState = 3; video.dispatchEvent(new dom.Event('canplay')); });
let checks = 0;
const check = (fn) => { fn(); checks += 1; };
Object.defineProperty(proto, 'buffered', { configurable: true, get() {
  const ranges = this._ranges ?? [];
  return { length: ranges.length, start: (i) => ranges[i][0], end: (i) => ranges[i][1] };
} });
const buffer = (video, ranges, event = 'progress') => act(async () => {
  video._ranges = ranges;
  video.dispatchEvent(new dom.Event(event));
});
try {
  const { default: VideoScrubbing } = await server.ssrLoadModule('/src/components/scroll/VideoScrubbing.jsx');
  for (const mobilePlayback of [false, true]) {
    const states = [], fractions = [], progress = [];
    let readyCount = 0;
    const trackRef = createRef();
    const requested = { current: false };
    const props = { src: '/unchanged-4k.mp4', containerRef: trackRef, mobilePlayback,
      bufferAheadSeconds: 3, playbackBufferSeconds: 6, playbackRequestedRef: requested,
      scrollRange: { start: 0, end: 1 }, onReady: () => { readyCount += 1; },
      onLoadProgress: (p) => fractions.push(p), onProgressChange: (p) => progress.push(p),
      onPlaybackStateChange: (s) => states.push(s) };
    y = 0;
    root = createRoot(document.getElementById('root'));
    const render = (playToEnd = false) => act(async () => root.render(h('div', { ref: trackRef }, h(VideoScrubbing, { ...props, playToEnd }))));
    await render();
    const video = document.querySelector('video');
    await metadata(video); await ready(video);
    check(() => assert.equal(readyCount, 0, 'canplay alone cannot open START without a buffer'));
    await buffer(video, [[0, 1], [45, 50]]);
    check(() => assert.equal(readyCount, 0, 'Buffered tail cannot hide an initial gap'));
    check(() => assert.equal(fractions.at(-1), 1 / 3));
    await buffer(video, [[0, 3], [45, 50]]);
    check(() => assert.equal(readyCount, 1, 'progress alone unlocks once the startup window is buffered'));
    check(() => assert.equal(fractions.at(-1), 1));
    check(() => assert.equal(states.at(-1), 'ready'));
    await emit(video, 'canplay'); await emit(video, 'progress');
    check(() => assert.equal(readyCount, 1, 'Readiness is reported only once per load'));
    check(() => assert.equal(video.querySelector('source').getAttribute('src'), props.src));
    check(() => assert.equal(video.getAttribute('preload'), 'auto'));

    await scroll(200); await emit(video, 'seeking');
    check(() => assert.equal(video.currentTime, 10, 'Missing range still issues a seek to request bytes'));
    check(() => assert.equal(states.at(-1), 'waiting'));
    const writes = video.seekWrites.length;
    await scroll(300); await scroll(400);
    check(() => assert.equal(video.seekWrites.length, writes, 'Buffering cannot flood the decoder with seeks'));
    await act(async () => settle(video));
    check(() => assert.equal(video.currentTime, 20, 'Latest pending target wins'));
    await emit(video, 'canplay');
    check(() => assert.equal(states.at(-1), 'waiting', 'Intermediate canplay must not clear a pending seek'));
    await buffer(video, [[18, 25]]);
    await act(async () => settle(video));
    check(() => assert.equal(states.at(-1), 'ready'));
    check(() => assert.equal(progress.at(-1), 0.4));

    await scroll(840); await act(async () => settle(video));
    await buffer(video, [[42, 44], [47, 50]]);
    requested.current = true;
    await render(true);
    check(() => assert.equal(video.playStarts?.length ?? 0, 0, 'Tail autoplay waits for contiguous data'));
    check(() => assert.equal(states.at(-1), 'waiting'));
    await emit(video, 'canplay');
    check(() => assert.equal(video.playStarts?.length ?? 0, 0, 'canplay cannot bypass the tail gate'));
    await buffer(video, [[42, 48]]);
    check(() => assert.equal(video.playStarts.at(-1), 42));
    const starts = video.playStarts.length;
    await emit(video, 'canplay'); await emit(video, 'progress');
    check(() => assert.equal(video.playStarts.length, starts, 'Readiness events do not restart playing media'));
    await emit(video, 'playing');
    check(() => assert.equal(states.at(-1), 'playing'));
    await emit(video, 'waiting');
    check(() => assert.equal(states.at(-1), 'waiting'));
    await emit(video, 'playing');
    check(() => assert.equal(states.at(-1), 'playing'));

    // A/B reload must buffer around the last completed checkpoint, not time zero.
    props.src = '/alternate-4k.mp4';
    await render(true);
    check(() => assert.equal(states.at(-1), 'waiting'));
    check(() => assert.equal(fractions.at(-1), 0));
    await metadata(video); await ready(video);
    await buffer(video, [[0, 3]]);
    check(() => assert.equal(readyCount, 1));
    check(() => assert.equal(video.currentTime, 42));
    await buffer(video, [[42, 50]]);
    check(() => assert.equal(readyCount, 1, 'Decoded restored frame is required as well as data'));
    await act(async () => settle(video));
    check(() => assert.equal(readyCount, 2));
    check(() => assert.equal(video.playStarts.at(-1), 42));

    const reported = states.length;
    await act(async () => root.unmount()); root = null;
    for (const event of ['progress', 'canplay', 'seeking', 'seeked', 'suspend']) await emit(video, event);
    check(() => assert.equal(states.length, reported));
    check(() => assert.equal(observers, 0));
  }
  // Paused-preload policies must not trap Safari/data-saving users at START.
  const states = []; let readyCount = 0;
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(h(VideoScrubbing, { src: '/4k.mp4', bufferAheadSeconds: 3,
    onReady: () => { readyCount += 1; }, onPlaybackStateChange: (s) => states.push(s) })));
  const video = document.querySelector('video');
  await metadata(video); await ready(video); await buffer(video, [[0, 0.8]]);
  check(() => assert.equal(readyCount, 0));
  video.networkState = 1;
  await emit(video, 'suspend');
  check(() => assert.equal(readyCount, 1, 'Native idle preload with a playable frame permits the user gesture'));
  check(() => assert.equal(states.at(-1), 'ready'));
  await act(async () => root.unmount()); root = null;
  console.log(`Video buffering: ${checks} checks passed; contiguous startup/tail buffers, seek backpressure, source reload and preload-policy recovery (no browser).`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close();
  await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
