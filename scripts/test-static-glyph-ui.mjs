/** In-memory DOM only: no browser, remote data or image requests. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createStaticGlyphImageCache } from '../src/utils/staticGlyphImageCache.js';
import { buildArchiveModel } from '../src/utils/heptapod/archiveGlyph.js';

const dom = new Window({ url: 'https://fixture.invalid/', width: 390, height: 844, settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, enableImageFileLoading: false } });
dom.document.body.innerHTML = '<div id="root"></div>';
let canvasCalls = 0; let workerCalls = 0;
const observers = [];
class Observer { constructor(callback) { this.callback = callback; observers.push(this); } observe(target) { this.target = target; } disconnect() { this.disconnected = true; } }
class ForbiddenWorker { constructor() { workerCalls += 1; throw new Error('Precomputed mobile forms must not generate images'); } }
dom.HTMLCanvasElement.prototype.getContext = () => { canvasCalls += 1; return null; };
const globals = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment, MutationObserver: dom.MutationObserver,
  getComputedStyle: dom.getComputedStyle.bind(dom), IntersectionObserver: Observer, ResizeObserver: Observer,
  requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  Worker: ForbiddenWorker, IS_REACT_ACT_ENVIRONMENT: true };
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement: h, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { renderToStaticMarkup } = await import('react-dom/server');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root; let checks = 0;
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks += 1; };
try {
  const { default: GlyphNode } = await server.ssrLoadModule('/src/components/data-display/GlyphNode.jsx');
  const { default: ArchiveGlyph } = await server.ssrLoadModule('/src/components/data-display/ArchiveGlyph.jsx');
  const { default: Scope } = await server.ssrLoadModule('/src/components/data-display/GlyphRenderScope.jsx');
  const { default: Detail } = await server.ssrLoadModule('/src/components/data-display/ArchiveSelectedGlyph.jsx');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { ARCHIVE_FAMILY_SYMBOLS, ARCHIVE_TIMELINE_SYMBOL } = await server.ssrLoadModule('/src/data/archiveFamilySymbols.js');
  const model = buildArchiveModel('Louise');
  const id = '11111111-1111-4111-8111-111111111111';
  const glyph = { id, model_data: model, canonical_name: '긴 이름을 포함한 Louise', display_name: '긴 이름을 포함한 Louise', is_public: true };
  const wrap = (child) => h(LocaleProvider, { syncDocument: false }, h(ThemeProvider, { theme }, child));
  root = createRoot(document.getElementById('root'));
  for (const width of [320, 390, 768, 899, 900, 1440]) {
    await act(async () => dom.happyDOM.setWindowSize({ width, height: 844 }));
    const list = h('div', null, h(ArchiveGlyph, { glyph, showName: true, onSelect() {} }),
      h(GlyphNode, { model, glyphId: id, label: glyph.display_name }),
      h(ArchiveGlyph, { glyph: ARCHIVE_FAMILY_SYMBOLS.arrival.surface }),
      h(ArchiveGlyph, { glyph: ARCHIVE_TIMELINE_SYMBOL }));
    await act(async () => root.render(wrap(list)));
    if (width < 900) {
      equal(document.querySelectorAll('canvas').length, 0, `${width}: no initial/live Canvas`);
      equal(document.querySelectorAll('img').length, 4, `${width}: public + authored + empty-cluster timeline are images`);
      equal(document.querySelectorAll('img[src^="/api/glyph-image/"]').length, 2, `${width}: DB UUID routes via access-checked API`);
      equal(document.querySelectorAll('img[src^="/glyph-symbols/"]').length, 2, `${width}: authored forms use static assets`);
      equal(document.querySelector('img').getAttribute('loading'), 'lazy', 'Image load is deferred');
      equal(document.querySelector('img').getAttribute('decoding'), 'async', 'Image decoding is async');
      equal(document.querySelector('[data-glyph-centered-name]').textContent, glyph.display_name, 'Name stays separate and complete');
      const html = renderToStaticMarkup(wrap(list));
      equal(html.includes('<canvas'), false, `${width}: SSR also excludes Canvas`);
    } else {
      equal(document.querySelectorAll('[data-static-glyph-image]').length, 0, `${width}: desktop preserves live branch`);
      equal(document.querySelectorAll('canvas').length, 1, `${width}: desktop GlyphNode retains its Canvas`);
    }
  }
  await act(async () => dom.happyDOM.setWindowSize({ width: 390, height: 844 }));
  await act(async () => root.render(wrap(h(Scope, { mode: 'live' }, h(GlyphNode, { model })))));
  equal(document.querySelectorAll('canvas').length, 1, 'Mobile personal detail scope retains Canvas');
  await act(async () => root.render(wrap(h(Detail, { glyph, interpretation: null, members: [] }))));
  equal(document.querySelectorAll('[data-selected-glyph-detail]').length, 1, 'Shared personal/archive detail renders');
  equal(document.querySelectorAll('[data-static-glyph-image]').length, 0, 'Entire shared detail uses live exception');
  await act(async () => root.render(wrap(h(ArchiveGlyph, { glyph, showName: true }))));
  equal(document.querySelectorAll('img').length, 1, 'Returning from detail restores image list');
  equal(canvasCalls, 0, 'Mobile list and offscreen live surfaces perform zero Canvas work');
  equal(workerCalls, 0, 'Precomputed DB and authored forms never start Worker');
  // Simulate image failure without network: no Canvas fallback, layout persists.
  await act(async () => document.querySelector('img').dispatchEvent(new dom.Event('error')));
  equal(document.querySelector('[data-image-state]').dataset.imageState, 'unavailable', 'Image failure is stable');
  equal(document.querySelectorAll('canvas').length, 0, 'Failure never silently restores Canvas');
  // Local models remain on this device. Work starts only near the viewport and
  // canonical duplicates share the worker result without any Canvas mounting.
  let localPosts = 0;
  globalThis.Worker = class {
    postMessage({ id }) { localPosts += 1; queueMicrotask(() => this.onmessage({ data: { id, bytes: new Uint8Array([1, 2]), mimeType: 'image/png' } })); }
    terminate() {}
  };
  const previousObserverCount = observers.length;
  const localList = (label) => h('div', null, ...Array.from({ length: 8 }, (_, key) => h(GlyphNode, { key, model, label })));
  await act(async () => root.render(wrap(localList('Local'))));
  equal(localPosts, 0, 'Offscreen unsaved models do not start Worker');
  await act(async () => {
    for (const observer of observers.slice(previousObserverCount)) observer.callback([{ target: observer.target, isIntersecting: true }]);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  equal(localPosts, 1, 'Eight same-model surfaces generate once in Worker');
  equal(document.querySelectorAll('img[src^="blob:"]').length, 8, 'Local models use actual Blob images');
  equal(canvasCalls, 0, 'Local mobile images never draw on the main thread');
  await act(async () => root.render(wrap(localList('Renamed'))));
  equal(localPosts, 1, 'Label updates reuse local image without work');
  // Simulate a server with no viewport. It chooses the static branch initially.
  delete globalThis.window;
  const serverHtml = renderToStaticMarkup(wrap(h(GlyphNode, { model, glyphId: id })));
  globalThis.window = dom;
  equal(serverHtml.includes('<canvas'), false, 'Unknown SSR viewport never mounts live Canvas');
  equal(serverHtml.includes('<img'), true, 'Unknown SSR viewport includes the public image');
  await act(async () => root.unmount()); root = null;

  let posts = 0; let starts = 0; let terminates = 0; const revoked = [];
  const cache = createStaticGlyphImageCache({ limit: 1, urls: {
    createObjectURL: () => `blob:test-${posts}`, revokeObjectURL: (url) => revoked.push(url),
  }, workerFactory: () => {
    starts += 1;
    return { postMessage({ id }) { posts += 1; queueMicrotask(() => this.onmessage({ data: { id, bytes: new Uint8Array([1, 2]), mimeType: 'image/png' } })); },
      terminate() { terminates += 1; } };
  } });
  const first = cache.acquire(model, 256); const duplicate = cache.acquire(structuredClone(model), 256);
  equal(await first.promise, await duplicate.promise, 'Equivalent canonical model shares a Blob');
  equal(posts, 1, 'Concurrent reuse generates only once');
  first.release(); duplicate.release();
  const retained = cache.acquire(model, 256); await retained.promise; retained.release();
  equal(starts, 1, 'Cached reuse starts no Worker');
  const changed = cache.acquire({ ...model, spreadPh: model.spreadPh + 0.1 }, 256); await changed.promise; changed.release();
  equal(posts, 2, 'Same meta.hash with different actual content generates separately');
  equal(revoked.length, 1, 'Bounded cache revokes unused least-recent image');
  cache.clear(); equal(revoked.length, 2, 'Cache clear revokes retained Blob URL');
  equal(terminates, starts, 'Idle workers terminate');
  const source = await readFile('src/utils/staticGlyphImageCache.js', 'utf8');
  equal(/import .*rasterize|import .*logogramParticles/.test(source), false, 'Main-thread cache never imports rendering engine');
  console.log(`Static glyph UI: ${checks} checks passed (in-memory DOM; no browser).`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close(); await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
