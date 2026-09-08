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
for (const [key, value] of Object.entries({ duration: NaN, readyState: 0, paused: true, seeking: false, ended: false, error: null })) {
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
  this.dispatchEvent(new dom.Event('emptied'));
  this.dispatchEvent(new dom.Event('loadstart'));
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emit = (target, name) => act(async () => target.dispatchEvent(new dom.Event(name)));
const scroll = (value) => act(async () => { y = value; dom.dispatchEvent(new dom.Event('scroll')); await pause(35); });
const metadata = (video) => act(async () => { video.duration = 50; video.readyState = 1; video.dispatchEvent(new dom.Event('loadedmetadata')); });
const ready = (video) => act(async () => { video.readyState = 3; video.dispatchEvent(new dom.Event('canplay')); });
const failAndLoad = (video) => act(async () => { video.error = { code: 2 }; video.dispatchEvent(new dom.Event('error')); video.load(); });
let checks = 0;
const check = (fn) => { fn(); checks += 1; };
try {
  const { default: VideoScrubbing } = await server.ssrLoadModule('/src/components/scroll/VideoScrubbing.jsx');
  for (const mobilePlayback of [false, true]) {
    let ended = 0;
    const progress = [];
    const trackRef = createRef();
    const requested = { current: false };
    const props = { src: '/test.mp4', containerRef: trackRef, mobilePlayback, playbackRequestedRef: requested,
      scrollRange: { start: 0, end: 1 }, onEnded: () => { ended += 1; }, onProgressChange: (p) => progress.push(p) };
    const render = (playToEnd = false) => act(async () => root.render(h('div', { ref: trackRef }, h(VideoScrubbing, { ...props, playToEnd }))));
    y = 0;
    root = createRoot(document.getElementById('root'));
    await render();
    const video = document.querySelector('video');
    await metadata(video); await ready(video);
    await scroll(200); // First ever seek, intentionally never receives seeked.
    check(() => assert.equal(video.currentTime, 10));
    await failAndLoad(video);
    await metadata(video); await ready(video);
    await scroll(300);
    check(() => assert.equal(video.currentTime, 15, `First-seek failure must release the seek gate after reload (mobile=${mobilePlayback})`));
    await act(async () => settle(video)); // This is now the last completed checkpoint.

    await scroll(400); // New seek to20 is aborted; checkpoint must remain15.
    await failAndLoad(video);
    await metadata(video);
    check(() => assert.equal(video.currentTime, 15, 'Reload restores completed position, not the interrupted target'));
    const restoringWrites = [...video.seekWrites];
    await scroll(600); // No scroll seek may replace the restoration seek.
    check(() => assert.deepEqual(video.seekWrites, restoringWrites, 'Restoration owns its seek until seeked'));
    await ready(video);
    await act(async () => settle(video));
    check(() => assert.equal(video.currentTime, 15, 'No stale pending target runs immediately after restoring'));
    await scroll(600);
    check(() => assert.equal(video.currentTime, 30));
    await scroll(700); await scroll(800);
    check(() => assert.equal(video.currentTime, 30, 'Normal seeks remain one-in-flight'));
    await act(async () => settle(video));
    check(() => assert.equal(video.currentTime, 40, 'Only the latest normal pending target follows seeked'));
    await act(async () => settle(video));

    await scroll(850);
    const beforePlay = video.currentTime;
    requested.current = true;
    await render(true);
    await scroll(950);
    check(() => assert.equal(video.currentTime, beforePlay, 'Autoplay request blocks later scroll seeks'));
    check(() => assert.equal(video.playStarts?.length ?? 0, 0, 'Autoplay waits for in-flight seek'));
    await act(async () => settle(video));
    check(() => assert.equal(video.playStarts.at(-1), beforePlay));
    // A/B source replacement while the final segment is playing restores its checkpoint.
    video._time = beforePlay + 1;
    await emit(video, 'timeupdate');
    const switchTime = video.currentTime;
    const playCount = video.playStarts.length;
    props.src = '/alternate.mp4';
    await render(true);
    video.duration = 50;
    await emit(video, 'loadedmetadata');
    check(() => assert.equal(video.currentTime, switchTime, 'Source toggle restores autoplay checkpoint'));
    check(() => assert.equal(video.playStarts.length, playCount, 'Replacement does not play from zero before restore'));
    await act(async () => settle(video));
    video.readyState = 3;
    await emit(video, 'canplay');
    check(() => assert.equal(video.playStarts.at(-1), switchTime));
    await emit(video, 'ended');
    check(() => assert.equal(ended, 0, 'Event without actual native ended never completes'));
    video._time = 50; video.ended = false;
    await emit(video, 'timeupdate');
    check(() => assert.equal(ended, 0, 'Last timecode without actual native ended never completes'));
    video.ended = true;
    await emit(video, 'ended');
    check(() => assert.equal(ended, 1));
    const writes = [...video.seekWrites];
    const callbacks = progress.length;
    const starts = video.playStarts.length;
    await act(async () => root.unmount()); root = null;
    await emit(video, 'seeked'); await emit(video, 'canplay'); await emit(video, 'ended');
    await emit(dom, 'pointerup'); await emit(document, 'visibilitychange'); await scroll(100);
    check(() => assert.deepEqual(video.seekWrites, writes));
    check(() => assert.equal(video.playStarts.length, starts));
    check(() => assert.equal(progress.length, callbacks));
    check(() => assert.equal(ended, 1));
    check(() => assert.equal(observers, 0));
  }
  console.log(`Video recovery: ${checks} checks passed; failed first seek, completed checkpoint restoration, pending target gate, autoplay, native-ended-only and cleanup in desktop/mobile modes (no browser).`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close();
  await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
