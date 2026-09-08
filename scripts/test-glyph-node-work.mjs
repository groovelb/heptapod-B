/** Real component effects with counted Canvas calls; no browser or network. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { buildArchiveModel } from '../src/utils/heptapod/archiveGlyph.js';

const dom = new Window({ settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
dom.document.body.innerHTML = '<div id="root"></div>';
const observers = [];
class Observer {
  constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
  observe(target) { this.target = target; }
  disconnect() { this.disconnected = true; }
  enter() { if (!this.disconnected) this.callback([{ target: this.target, isIntersecting: true }]); }
}
const globals = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment, MutationObserver: dom.MutationObserver,
  getComputedStyle: dom.getComputedStyle.bind(dom), IntersectionObserver: Observer, IS_REACT_ACT_ENVIRONMENT: true };
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
let spriteBuilds = 0;
dom.HTMLCanvasElement.prototype.getContext = function () {
  const canvas = this;
  return { setTransform() {}, clearRect() { canvas.clears = (canvas.clears || 0) + 1; },
    drawImage() { canvas.stamps = (canvas.stamps || 0) + 1; }, fillRect() {},
    createRadialGradient() { spriteBuilds += 1; return { addColorStop() {} }; } };
};
const { createElement: h, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root;
try {
  const { default: GlyphNode } = await server.ssrLoadModule('/src/components/data-display/GlyphNode.jsx');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { ThemeProvider } = await import('@mui/material/styles');
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const model = buildArchiveModel('Louise');
  root = createRoot(document.getElementById('root'));
  const render = (label = 'Louise') => act(async () => root.render(h(LocaleProvider, { syncDocument: false },
    h(ThemeProvider, { theme }, ...Array.from({ length: 12 }, (_, key) => h(GlyphNode, { key, model, label, size: 64 }))))));
  await render();
  const canvases = [...document.querySelectorAll('canvas')];
  assert.equal(canvases.length, 12, 'Offscreen nodes retain accessible, dimensioned Canvas placeholders');
  assert.equal(canvases.some((canvas) => canvas.stamps), false, 'Offscreen list does no ink drawing');
  assert.equal(spriteBuilds, 0, 'Offscreen list allocates no sprite surfaces');
  assert.equal(observers[0].options.rootMargin, '200px');
  await act(async () => observers[0].enter());
  assert.ok(canvases[0].stamps > 0, 'Entering viewport paints the real model');
  assert.equal(canvases[0].clears, 1);
  assert.equal(observers[0].disconnected, true, 'One-shot observer disconnects after drawing');
  assert.equal(spriteBuilds, 2, 'Only the two ink sprites are allocated');
  await act(async () => observers[1].enter());
  assert.equal(canvases[1].stamps, canvases[0].stamps, 'Same model retains identical drawing workload/output');
  assert.equal(spriteBuilds, 2, 'Other nodes reuse the ink sprites');
  await render('Updated accessible name');
  assert.equal(canvases[0].clears, 1, 'Label-only updates do not redraw ink');
  assert.equal(observers.length, 12, 'Label-only updates do not resubscribe');
  await act(async () => root.unmount()); root = null;
  assert.ok(observers.every((observer) => observer.disconnected), 'Unmount releases even unseen observers');
  for (const observer of observers) observer.enter();
  assert.equal(canvases.filter((canvas) => canvas.stamps).length, 2, 'No drawing after cleanup');
  console.log('GlyphNode: 14 checks passed; 12 offscreen nodes / zero draws, one-shot viewport drawing, shared sprites, stable labels and cleanup (no browser).');
} finally {
  if (root) await act(async () => root.unmount());
  await server.close(); await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
