/** Real React + Motion components in an in-memory DOM; no browser automation. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const dom = new Window({ url: 'http://localhost/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
dom.document.write('<html><body><div id="root"></div></body></html>');
const globals = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment, MutationObserver: dom.MutationObserver,
  getComputedStyle: dom.getComputedStyle.bind(dom), requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
  cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom), IS_REACT_ACT_ENVIRONMENT: true };
const originals = Object.fromEntries(Object.keys(globals).map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
for (const [k, value] of Object.entries(globals)) Object.defineProperty(globalThis, k, { configurable: true, writable: true, value });
const { createElement: h, act, StrictMode } = await import('react');
const { createRoot } = await import('react-dom/client');
const { motionValue } = await import('framer-motion');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
const errors = [];
const originalError = console.error;
console.error = (...args) => { errors.push(args.map(String).join(' ')); };
let root;
const wait = () => new Promise(resolve => setTimeout(resolve, 70));
try {
  const { default: ScrubCaption } = await server.ssrLoadModule('/src/components/kinetic-typography/scrub/ScrubCaption.jsx');
  const { defaultTheme } = await server.ssrLoadModule('/src/styles/themes/index.js');
  const beat = { id: 'B3', kinetic: 'scramble', headline: 'not translation, but encoding', body: '', shot: '07→09' };
  const track = motionValue(0.5), progress = motionValue(0.5);
  let clip = { id: 'B3', cellStart: 0, cells: 1, startNorm: 0, endNorm: 1 };
  root = createRoot(document.getElementById('root'));
  const render = reduced => act(async () => { root.render(h(StrictMode, null, h(ThemeProvider, { theme: defaultTheme },
    h(ScrubCaption, { beat, clip, trackProgress: track, progress, scrubCells: 1, total: 47.08, reduced })))); await wait(); });
  const headings = () => [...document.querySelectorAll('h2')].map(n => n.textContent);
  await render(false);
  // Recomputing a parent's derived MotionValue must not set child React state during render.
  clip = { ...clip, cellStart: -0.4 };
  await render(false);
  assert.ok(!errors.some(s => /Cannot update a component|while rendering a different component/.test(s)), errors.join('\n'));
  assert.equal(headings()[1], 'but encoding');
  assert.ok(!/[a-z]/i.test(headings()[0]), 'Late progress dissolves the left text');
  await act(async () => { track.set(0); await wait(); });
  const early = headings();
  assert.notDeepEqual(early, ['', '']);
  await act(async () => { track.set(0.5); await wait(); });
  assert.equal(headings()[1], 'but encoding');
  await act(async () => { track.set(0); await wait(); });
  assert.deepEqual(headings(), early, 'Reverse scroll returns to the same deterministic symbols');
  await render(true);
  assert.deepEqual(headings(), ['not translation,', 'but encoding']);
  await render(false);
  assert.deepEqual(headings(), early, 'Leaving reduced motion immediately samples current progress');
  await act(async () => { track.set(0.5); root.unmount(); await wait(); }); root = null;
  assert.ok(!errors.length, errors.join('\n'));
  console.log('Scramble caption: parent rerender, reverse scroll, reduced-motion toggle and queued unmount passed without React errors.');
} finally {
  if (root) await act(async () => root.unmount());
  console.error = originalError;
  await server.close();
  await dom.happyDOM.abort();
  for (const [k, descriptor] of Object.entries(originals)) { if (descriptor) Object.defineProperty(globalThis, k, descriptor); else delete globalThis[k]; }
}
