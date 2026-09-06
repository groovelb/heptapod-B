/** Count real component RAF reservations and media calls in-memory. No browser. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const dom = new Window({ url: 'http://localhost/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
dom.document.write('<html><body><div id="root"></div></body></html>');
let rafRequests = 0; let frameId = 0; const frames = new Map();
const globals = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment, MutationObserver: dom.MutationObserver,
  getComputedStyle: dom.getComputedStyle.bind(dom), IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: (callback) => { rafRequests += 1; frames.set(++frameId, callback); return frameId; },
  cancelAnimationFrame: (id) => frames.delete(id),
  IntersectionObserver: class { constructor(cb) { this.cb = cb; } observe(target) { this.cb([{ target, isIntersecting: true }]); } disconnect() {} } };
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement: h, createRef, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true },
  environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root; let y = 0; let visibility = 'visible';
Object.defineProperty(dom, 'scrollY', { configurable: true, get: () => y });
Object.defineProperty(dom.document, 'visibilityState', { configurable: true, get: () => visibility });
dom.HTMLElement.prototype.getBoundingClientRect = () => ({ top: -y, left: 0, right: 390, bottom: 1000 - y, width: 390, height: 1000 });
const proto = dom.HTMLMediaElement.prototype;
for (const [key, value] of Object.entries({ duration: 50, readyState: 3, paused: true, seeking: false, ended: false, error: null })) {
  Object.defineProperty(proto, key, { configurable: true, get() { return this[`_${key}`] ?? value; }, set(v) { this[`_${key}`] = v; } });
}
Object.defineProperty(proto, 'currentTime', { configurable: true, get() { return this._time ?? 0; },
  set(value) { this._time = value; this.seeking = true; (this.seekWrites ??= []).push(value); } });
function settle(video) { video.seeking = false; video.dispatchEvent(new dom.Event('seeked')); }
proto.play = function () {
  this.paused = false; (this.playStarts ??= []).push(this.currentTime);
  if (this.queueMediaEvents) (this.pendingMediaEvents ??= []).push('playing');
  else this.dispatchEvent(new dom.Event('playing'));
  if (this.deferNextPlay) { this.deferNextPlay = false; return new Promise((_, reject) => { this.rejectPendingPlay = reject; }); }
  return Promise.resolve();
};
proto.pause = function () {
  this.paused = true; this.pauseCount = (this.pauseCount ?? 0) + 1;
  if (this.queueMediaEvents) (this.pendingMediaEvents ??= []).push('pause');
  else this.dispatchEvent(new dom.Event('pause'));
};
const emit = (target, name) => act(async () => target.dispatchEvent(new dom.Event(name)));
const flush = () => act(async () => { const queue = [...frames.values()]; frames.clear(); queue.forEach((fn) => fn(performance.now())); });
const scroll = async (time) => { y = time / 50 * 1000; await emit(dom, 'scroll'); await flush(); };
const show = async (state) => { visibility = state; await emit(document, 'visibilitychange'); };
let checks = 0; const check = (fn) => { fn(); checks += 1; };
try {
  const { default: VideoScrubbing } = await server.ssrLoadModule('/src/components/scroll/VideoScrubbing.jsx');
  for (const mobilePlayback of [false, true]) {
    let ended = 0; const states = []; const trackRef = createRef(); const requested = { current: false };
    const props = { src: '/test.mp4', containerRef: trackRef, mobilePlayback, playbackRequestedRef: requested,
      scrubFrameRate: 24, scrollRange: { start: 0, end: 1 }, onEnded: () => { ended += 1; }, onPlaybackStateChange: (state) => states.push(state) };
    root = createRoot(document.getElementById('root')); y = 0; visibility = 'visible';
    const render = (playToEnd = false, frameRate = 24) => act(async () => root.render(h('div', { ref: trackRef }, h(VideoScrubbing, { ...props, scrubFrameRate: frameRate ?? undefined, playToEnd }))));
    await render(); await flush(); const video = document.querySelector('video');
    await scroll(1.001); await act(async () => settle(video));
    const firstWrites = video.seekWrites.length;
    await scroll(1.038);
    check(() => assert.equal(video.seekWrites.length, firstWrites, 'Same CFR24 frame suppresses otherwise >0.033 seek'));
    check(() => assert.equal(video.currentTime, 1.001));
    await scroll(1.05);
    check(() => assert.equal(video.currentTime, 1.05, 'Next frame retains exact target; no quantization'));
    await act(async () => settle(video)); await scroll(0.99);
    check(() => assert.ok(Math.abs(video.currentTime - 0.99) < 1e-10, 'Reverse across a frame remains responsive'));
    await scroll(1.09); await scroll(1.14); await act(async () => settle(video));
    check(() => assert.ok(Math.abs(video.currentTime - 1.14) < 1e-10, 'Latest pending exact target wins'));
    await act(async () => settle(video)); await scroll(0);
    check(() => assert.equal(video.currentTime, 0));
    await act(async () => settle(video)); await scroll(50);
    check(() => assert.equal(video.currentTime, 50, 'Exact media boundary remains attainable'));
    await act(async () => settle(video)); await render(false, null); await flush();
    await scroll(1.001); await act(async () => settle(video)); await scroll(1.038);
    check(() => assert.equal(video.currentTime, 1.038, 'Default/general component preserves the original seek tolerance'));
    await act(async () => settle(video));

    const idleStarts = video.playStarts?.length ?? 0;
    await emit(dom, 'scroll');
    check(() => assert.equal(frames.size, 1));
    await show('hidden'); const hiddenRaf = rafRequests;
    check(() => assert.equal(frames.size, 0, 'Hide cancels an already queued scroll frame'));
    for (let i = 0; i < 20; i += 1) { await scroll(2 + i); await emit(dom, 'resize'); }
    check(() => assert.equal(rafRequests, hiddenRaf, 'Hidden scrolling/resize creates zero RAF reservations'));
    await show('visible'); await flush();
    check(() => assert.equal(video.playStarts?.length ?? 0, idleStarts, 'Foreground does not start previously idle scrubbing'));
    await act(async () => settle(video));
    requested.current = true; const requestRaf = rafRequests;
    await scroll(25); await emit(dom, 'resize');
    check(() => assert.equal(rafRequests, requestRaf, 'The synchronous playback request blocks RAF before React commit'));
    await render(true); await flush(); const activeRaf = rafRequests;
    for (let i = 0; i < 50; i += 1) { await scroll(25 + i / 100); await emit(dom, 'resize'); }
    check(() => assert.equal(rafRequests, activeRaf, '50 autoplay scroll/resize pairs create zero RAF reservations'));
    const actualTime = video.currentTime; const starts = video.playStarts.length;
    const errors = states.filter((s) => s === 'error').length;
    await show('hidden');
    check(() => assert.equal(video.paused, true));
    check(() => assert.equal(video.currentTime, actualTime));
    check(() => assert.equal(states.filter((s) => s === 'error').length, errors, 'Intentional hidden pause is not a playback error'));
    await show('visible');
    check(() => assert.equal(video.playStarts.length, starts + 1));
    check(() => assert.equal(video.playStarts.at(-1), actualTime, 'Foreground resumes the actual frame'));
    // Unlike synchronous stubs, the browser delivers media events from a task queue.
    video.queueMediaEvents = true;
    await act(async () => video.play()); // playing is queued, not delivered yet.
    await show('hidden'); // intentional pause queues pause after playing.
    const beforeStaleEvents = states.length;
    await emit(video, video.pendingMediaEvents.shift());
    check(() => assert.equal(states.length, beforeStaleEvents, 'Stale playing while hidden cannot clear the intentional-pause guard'));
    await show('visible'); // resumes, but both the old pause and new playing remain queued.
    await emit(video, video.pendingMediaEvents.shift());
    check(() => assert.equal(states.length, beforeStaleEvents, 'Stale pause after foreground resume cannot report an error'));
    await emit(video, video.pendingMediaEvents.shift());
    check(() => assert.equal(states.at(-1), 'playing'));
    check(() => assert.equal(video.pendingMediaEvents.length, 0));
    video.queueMediaEvents = false;
    const genuinePauseErrors = states.filter((s) => s === 'error').length;
    video.paused = true; await emit(video, 'pause'); const interruptedStarts = video.playStarts.length;
    check(() => assert.equal(states.filter((s) => s === 'error').length, genuinePauseErrors + 1, 'A genuine unexpected visible pause still reports an error'));
    await show('hidden'); await show('visible');
    check(() => assert.equal(video.playStarts.length, interruptedStarts, 'An already interrupted/paused video is not automatically restarted'));
    requested.current = false; await render(false); await flush(); await act(async () => settle(video));
    await scroll(30); requested.current = true; await render(true);
    const beforeHiddenSeek = video.playStarts.length;
    await show('hidden'); await act(async () => settle(video));
    check(() => assert.equal(video.playStarts.length, beforeHiddenSeek, 'Finishing an autoplay handoff seek while hidden cannot play'));
    video.deferNextPlay = true;
    await show('visible');
    check(() => assert.equal(video.playStarts.length, beforeHiddenSeek + 1, 'Foreground preserves the pending autoplay handoff intent'));
    check(() => assert.equal(video.playStarts.at(-1), 30));
    const beforeDeferredError = states.filter((s) => s === 'error').length;
    await show('hidden'); await show('visible');
    await act(async () => video.rejectPendingPlay(new Error('Abort from intentional background pause')));
    check(() => assert.equal(states.filter((s) => s === 'error').length, beforeDeferredError, 'A delayed rejection from an intentional pause cannot overwrite foreground playback'));
    check(() => assert.equal(video.paused, false));
    check(() => assert.equal(video.playStarts.at(-1), 30));
    video._time = video.duration; video.ended = false; await emit(video, 'ended');
    check(() => assert.equal(ended, 0));
    video.ended = true; await emit(video, 'ended');
    check(() => assert.equal(ended, 1));
    const finishedStarts = video.playStarts.length;
    await show('hidden'); await show('visible');
    check(() => assert.equal(video.playStarts.length, finishedStarts, 'An ended video is never restarted'));
    await act(async () => root.unmount()); root = null;
    const unmountedRaf = rafRequests;
    await show('hidden'); await show('visible'); await emit(dom, 'scroll'); await emit(dom, 'resize');
    await emit(video, 'seeked'); await emit(video, 'canplay');
    check(() => assert.equal(rafRequests, unmountedRaf));
    check(() => assert.equal(frames.size, 0));
    check(() => assert.equal(video.playStarts.length, finishedStarts));
  }
  console.log(`Video idle work: ${checks} checks passed; zero hidden/playback RAF reservations, exact CFR targets, intentional pause/resume, ended-only and cleanup (no browser).`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close(); await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
}
