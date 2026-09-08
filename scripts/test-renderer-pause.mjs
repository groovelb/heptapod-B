/** Actual React effect lifecycle with a controlled clock/RAF, not a browser. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { buildArchiveModel } from '../src/utils/heptapod/archiveGlyph.js';

const dom = new Window({ settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
dom.document.write('<html><body><div id="root"></div></body></html>');
const frames = new Map();
const observers = new Set();
let nextFrame = 0;
let draws = 0;
let clears = 0;
let contexts = 0;
let reduced = false;
let hidden = false;
dom.matchMedia = (media) => ({ media, matches: media.includes('prefers-reduced-motion') && reduced,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
Object.defineProperty(dom.document, 'hidden', { configurable: true, get: () => hidden });
dom.HTMLCanvasElement.prototype.getContext = function () {
  if (!this._ctx) {
    contexts++;
    this._ctx = new Proxy({ canvas: this,
      clearRect: () => { clears++; }, drawImage: () => { draws++; },
      createRadialGradient: () => ({ addColorStop() {} }),
    }, { get: (target, key) => key in target ? target[key] : () => {} });
  }
  return this._ctx;
};
const globals = { window: dom, document: dom.document, navigator: dom.navigator,
  HTMLElement: dom.HTMLElement, Element: dom.Element, Node: dom.Node,
  getComputedStyle: dom.getComputedStyle.bind(dom), IS_REACT_ACT_ENVIRONMENT: true,
  __rendererClock: 1000, __rendererTicks: [],
  requestAnimationFrame: (cb) => { frames.set(++nextFrame, cb); return nextFrame; },
  cancelAnimationFrame: (id) => frames.delete(id),
  IntersectionObserver: class {
    constructor(cb) { this.cb = cb; observers.add(this); }
    observe() {}
    disconnect() { observers.delete(this); }
  },
};
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement: h, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ configFile: false, plugins: [react(), {
  name: 'renderer-clock-observation', enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('/motion/LogogramRendererCanvas.jsx')) return null;
    return code.replaceAll('performance.now()', 'globalThis.__rendererClock')
      .replace('paintVapor(vctx, vapor.puffs, t, vaporSprites.puff);',
        'globalThis.__rendererTicks.push(t); paintVapor(vctx, vapor.puffs, t, vaporSprites.puff);');
  },
}], server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true }, logLevel: 'error', appType: 'custom' });
let root;
let checks = 0;
const check = (run) => { run(); checks++; };
const clock = (ms) => { globalThis.__rendererClock += ms; };
const frame = (ms) => act(async () => {
  clock(ms);
  const queued = [...frames.values()]; frames.clear();
  for (const callback of queued) callback(globalThis.__rendererClock);
});
const intersect = (value) => act(async () => { for (const observer of observers) observer.cb([{ isIntersecting: value }]); });
const visibility = (value) => act(async () => { hidden = value; document.dispatchEvent(new dom.Event('visibilitychange')); });
try {
  const { default: Renderer } = await server.ssrLoadModule('/src/components/motion/LogogramRendererCanvas.jsx');
  const model = buildArchiveModel('Louise');
  let completed = 0;
  let started = 0;
  const props = { model, size: 300, onFormationStart: () => { started++; }, onFormationComplete: () => { completed++; } };
  const render = (extra = {}) => act(async () => root.render(h(Renderer, { ...props, ...extra })));
  root = createRoot(document.getElementById('root'));
  await render();
  const canvas = document.querySelector('canvas');
  check(() => assert.equal(frames.size, 1));
  check(() => assert.equal(started, 0, 'No sound before the first drawing frame'));
  await frame(500);
  check(() => assert.equal(started, 1));
  check(() => assert.equal(globalThis.__rendererTicks.at(-1), 500));
  const before = { draws, clears, contexts };
  await render({ isPaused: true });
  check(() => assert.equal(frames.size, 0));
  for (const ms of [60000, 240000, 300000]) await frame(ms);
  check(() => assert.deepEqual({ draws, clears, contexts }, before, '1/5/10 minute pause creates no draw/clear/allocation'));
  check(() => assert.equal(completed, 0));
  check(() => assert.equal(document.querySelector('canvas'), canvas));
  await render(); await frame(16);
  check(() => assert.equal(globalThis.__rendererTicks.at(-1), 516, 'Resume preserves elapsed formation time'));
  check(() => assert.equal(clears, before.clears + 1, 'Resume draws, but does not reinitialize/clear effect'));
  await intersect(false);
  await render({ isPaused: true }); await frame(5000); await render();
  check(() => assert.equal(frames.size, 0, 'Explicit resume cannot override offscreen pause'));
  await intersect(true); await frame(16);
  check(() => assert.equal(globalThis.__rendererTicks.at(-1), 532));
  await visibility(true); await render({ isPaused: true }); await frame(5000); await render();
  check(() => assert.equal(frames.size, 0, 'Explicit resume cannot override hidden document'));
  await visibility(false); await frame(2000);
  check(() => assert.equal(completed, 1));
  const completeContexts = contexts;
  for (let i = 0; i < 10; i++) { await render({ isPaused: true }); await frame(1000); await render(); await frame(16); }
  check(() => assert.equal(completed, 1, 'Pause/resume never repeats formation completion'));
  check(() => assert.equal(started, 1, 'Pause/resume never replays formation sound'));
  check(() => assert.equal(contexts, completeContexts, 'Repeated pause does not accumulate backing surfaces'));
  check(() => assert.equal(frames.size, 1));
  await act(async () => root.unmount()); root = null;
  check(() => assert.equal(frames.size, 0));
  check(() => assert.equal(observers.size, 0));
  const postUnmount = draws;
  await visibility(true); await visibility(false); await frame(100);
  check(() => assert.equal(draws, postUnmount));

  root = createRoot(document.getElementById('root'));
  await render({ isPaused: true });
  check(() => assert.equal(frames.size, 0));
  await frame(600000); await render(); await frame(16);
  check(() => assert.equal(globalThis.__rendererTicks.at(-1), 16, 'Initially paused mount starts at its first frame, not 10 minutes later'));
  await act(async () => root.unmount()); root = null;
  reduced = true;
  root = createRoot(document.getElementById('root'));
  await render({ isPaused: true });
  check(() => assert.equal(frames.size, 0));
  check(() => assert.equal(completed, 2, 'Reduced-motion static completion remains available'));
  console.log(`Renderer pause: ${checks} checks passed; clocks, 1/5/10min idle, zero hidden work, allocation stability, visibility composition, cleanup and reduced motion (no browser).`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close(); await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
