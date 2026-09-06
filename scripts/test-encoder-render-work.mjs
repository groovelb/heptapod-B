/** Count real model builds in an in-memory React DOM. No browser or network. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/canvas', width: 390, height: 844,
  settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true } });
const viewport = new dom.EventTarget();
Object.assign(viewport, { height: 844, offsetTop: 0, scale: 1 });
Object.defineProperty(dom, 'visualViewport', { configurable: true, value: viewport });
const matchMedia = dom.matchMedia.bind(dom);
dom.matchMedia = (query) => query === '(prefers-reduced-motion: reduce)'
  ? { matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  : matchMedia(query);
dom.HTMLCanvasElement.prototype.getContext = function getContext(type) {
  return type !== '2d' ? null : new Proxy({ canvas: this, createRadialGradient: () => ({ addColorStop() {} }) }, {
    get: (target, key) => key in target ? target[key] : () => {},
  });
};
dom.document.write('<!doctype html><html><body><div id="root"></div></body></html>');
const globals = {
  window: dom, document: dom.document, navigator: dom.navigator, location: dom.location,
  HTMLElement: dom.HTMLElement, Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment,
  MutationObserver: dom.MutationObserver, getComputedStyle: dom.getComputedStyle.bind(dom),
  ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() { this.callback([{ contentRect: { width: 390, height: 280 } }]); } disconnect() {} },
  requestAnimationFrame: dom.requestAnimationFrame.bind(dom), cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom),
  fetch: () => { throw new Error('No network in model work test'); }, IS_REACT_ACT_ENVIRONMENT: true, __encoderModelBuilds: [], __encoderRenderedModels: [],
};
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react(), {
  name: 'count-real-archive-model-builds', enforce: 'pre',
  transform(code, id) {
    if (id.endsWith('/motion/LogogramRendererCanvas.jsx')) return code.replace('const { t } = useI18n();',
      'globalThis.__encoderRenderedModels.push(model); const { t } = useI18n();');
    if (!id.endsWith('/utils/heptapod/archiveGlyph.js')) return null;
    return code.replace('export function buildArchiveModel(rawName) {',
      'export function buildArchiveModel(rawName) { globalThis.__encoderModelBuilds.push(rawName);');
  },
}], define: { 'import.meta.env.VITE_MUSIC_AUTOPLAY': '"false"' }, server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root;
const input = () => document.querySelector('[data-encoder-controls] input');
const enter = () => act(async () => input().dispatchEvent(new dom.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })));
const calls = () => globalThis.__encoderModelBuilds.splice(0);
const setName = (value) => act(async () => {
  Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(input(), value);
  input().dispatchEvent(new dom.Event('input', { bubbles: true }));
});
const baseline = process.argv.includes('--baseline');
try {
  const { default: Encoder } = await server.ssrLoadModule('/src/components/templates/HeptapodEncoderPage.jsx');
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { I18nContext } = await server.ssrLoadModule('/src/i18n/useI18n.js');
  const { createTranslator } = await server.ssrLoadModule('/src/i18n/messages.js');
  const { createArchiveStoryClient } = await server.ssrLoadModule('/src/test-fixtures/archiveClient.js');
  const { buildArchiveModel } = await server.ssrLoadModule('/src/utils/heptapod/archiveGlyph.js');
  const { validateName } = await server.ssrLoadModule('/src/utils/heptapod/validateName.js');
  const expectedModel = buildArchiveModel('LouiseX');
  // The lightweight validator has the exact error/canonical contract used by model creation.
  for (const value of ['LouiseX', '서연', 'Louise?', '  Louise  ', 'a'.repeat(65), '😀', '\u0000']) {
    const result = validateName(value);
    if (result.valid) assert.equal(buildArchiveModel(value).meta.canonicalName, result.canonical.canonicalName);
    else assert.throws(() => buildArchiveModel(value), (error) => error.message === result.error.message && error.code === result.error.code);
  }
  calls();
  const session = {};
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(createElement(ThemeProvider, { theme },
    createElement(I18nContext.Provider, { value: { ...createTranslator('ko'), languageMode: 'ko', setLanguageMode() {} } },
      createElement(MemoryRouter, { initialEntries: ['/canvas'] }, createElement(Encoder, {
        initialName: 'Louise', audioActive: false, client: createArchiveStoryClient(), session,
      }))))));
  const rootCalls = calls();
  assert.deepEqual(rootCalls, baseline ? ['Louise', ...'Louise'] : ['Louise'], 'Do not build hidden child glyphs at the root');
  await setName('LouiseX');
  const previewCalls = calls();
  assert.deepEqual(previewCalls, ['X']);
  const previewCanvas = document.querySelector('[data-encoder-controls] canvas');
  await act(async () => document.querySelector('header button[aria-pressed]').click());
  const parentCalls = calls();
  assert.deepEqual(parentCalls, baseline ? ['X'] : [], 'Unchanged preview retains its model across unrelated sound state');
  assert.equal(document.querySelector('[data-encoder-controls] canvas'), previewCanvas, 'Do not remount the preview on a parent state change');
  await setName('LouiseXX');
  assert.deepEqual(calls(), baseline ? ['X'] : [], 'Repeated last character reuses deterministic geometry');
  assert.notEqual(document.querySelector('[data-encoder-controls] canvas'), previewCanvas,
    'A real additional keystroke still restarts preview formation via its existing length key');
  await setName('LouiseX');
  assert.deepEqual(calls(), baseline ? ['X'] : []);
  await enter();
  const encodeCalls = calls();
  assert.deepEqual(encodeCalls, baseline ? ['LouiseX', 'LouiseX', ...'LouiseX'] : ['LouiseX'], 'Validate without a discarded full model and defer child models');
  assert.equal(session.snapshot.encodedName, 'LouiseX');
  assert.equal(session.snapshot.encoderVersion, expectedModel.meta.encoderVersion);
  assert.deepEqual(globalThis.__encoderRenderedModels.findLast((model) => model.meta.name === expectedModel.meta.name), expectedModel,
    'The renderer receives the full unmodified deterministic model, not just an equivalent label');
  assert.equal(document.querySelector('[data-encoder-stage] canvas').getAttribute('aria-label').includes(expectedModel.meta.name), true);
  await enter();
  const unchangedCalls = calls();
  assert.deepEqual(unchangedCalls, baseline ? ['LouiseX'] : [], 'Unchanged confirmation does not rebuild a model');
  let lateKeyboardScroll = 0;
  input().scrollIntoView = () => { lateKeyboardScroll += 1; };
  input().getBoundingClientRect = () => ({ top: 600, bottom: 644 });
  await act(async () => {
    input().focus();
    viewport.height = 420;
    viewport.dispatchEvent(new dom.Event('resize'));
    input().dispatchEvent(new dom.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    assert.notEqual(document.activeElement, input(), 'Valid Enter blurs synchronously before the pending keyboard frame');
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  assert.equal(lateKeyboardScroll, process.argv.includes('--viewport-baseline') ? 1 : 0,
    'A keyboard visibility frame queued before Enter must not scroll after input has blurred');
  calls();
  await act(async () => document.querySelector('[data-encoder-stage] [role="button"]').click());
  const drillCalls = calls();
  assert.deepEqual(drillCalls, baseline ? [] : [...'LouiseX'], 'Build exactly the visible child glyphs on first drill');
  assert.deepEqual([...document.querySelectorAll('[data-encoder-stage] canvas')].map((canvas) => canvas.getAttribute('aria-label')),
    [...'LouiseX'].map((name) => createTranslator('ko').t('logogramRendererCanvas.heptapodBLogogram', { p0: validateName(name).canonical.canonicalName })), 'Drilldown outputs retain canonical names and order');
  for (const name of 'LouiseX') {
    const expected = buildArchiveModel(name);
    assert.deepEqual(globalThis.__encoderRenderedModels.findLast((model) => model.meta.name === expected.meta.name), expected,
      'Every visible child has the original deterministic geometry');
  }
  console.log(`${baseline ? 'Baseline' : 'Optimized'} Canvas model builds: ${JSON.stringify({ root: rootCalls.length, preview: previewCalls.length, unrelatedParent: parentCalls.length, encode: encodeCalls.length, unchangedEnter: unchangedCalls.length, firstDrill: drillCalls.length, lateKeyboardScroll })}; canonical/error contracts and visible interactions passed.`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close(); await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
