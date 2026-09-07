/** In-memory DOM and simulated geometry only: no browser, network or Canvas paint. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/archive', width: 390, height: 844,
  settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, device: { prefersReducedMotion: 'reduce' } } });
dom.document.write('<html><body><div id="root"></div></body></html>');
Object.defineProperty(dom.Element.prototype, 'animate', { configurable: true, value: undefined });
let reducedMotion = true;
const matchMedia = dom.matchMedia.bind(dom);
dom.matchMedia = (query) => query.includes('prefers-reduced-motion') ? {
  get matches() { return reducedMotion; }, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
} : matchMedia(query);
let readingEnd = 2600;
let scroll = 0;
let topInset = 64;
let disconnected = 0;
const observed = [];
class Observer { observe() {} disconnect() {} }
class ResizeObserverStub {
  constructor(callback) { this.callback = callback; this.targets = []; observed.push(this); }
  observe(target) { this.targets.push(target); }
  disconnect() { disconnected += 1; }
}
const rect = (top, height, width = dom.innerWidth - 32) => ({ top, bottom: top + height, left: 16, right: 16 + width, width, height });
dom.HTMLElement.prototype.getBoundingClientRect = function () {
  if (this.hasAttribute('data-archive-observation-top')) return rect(topInset, 0, 0);
  if (this.hasAttribute('data-archive-sticky-figure')) return rect(300 - scroll, 500);
  if (this.hasAttribute('data-archive-reading-column')) return rect(808 - scroll, readingEnd - 808);
  if (this.hasAttribute('data-archive-navigation')) return rect(topInset, 48);
  if (this.hasAttribute('data-archive-observation')) return rect(topInset, this.dataset.archiveObservation === 'expanded' ? 500 : this.dataset.archiveObservation === 'compact' ? 64 : 52);
  return rect(0, 0);
};
Object.defineProperty(dom, 'scrollY', { configurable: true, get: () => scroll });
const explicitScrolls = [];
dom.scrollTo = (options) => { explicitScrolls.push(options); scroll = options.top; dom.dispatchEvent(new dom.Event('scroll')); };
const globals = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment,
  IntersectionObserver: Observer, ResizeObserver: ResizeObserverStub,
  getComputedStyle: dom.getComputedStyle.bind(dom), requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
  cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom), IS_REACT_ACT_ENVIRONMENT: true };
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('No network in mobile observation tests'); };
const { act, createElement: h } = await import('react');
const { createRoot } = await import('react-dom/client');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, appType: 'custom', logLevel: 'error' });
let root;
let checks = 0;
const check = (fn) => { fn(); checks += 1; };
const settle = () => act(async () => { return new Promise((resolve) => setTimeout(resolve, 50)); });
const scrollTo = async (top) => { scroll = top; await act(async () => dom.dispatchEvent(new dom.Event('scroll'))); await settle(); };
const resize = async (width, height) => { dom.happyDOM.setWindowSize({ width, height }); await act(async () => dom.dispatchEvent(new dom.Event('resize'))); await settle(); };
try {
  const { default: Depth } = await server.ssrLoadModule('/src/components/data-display/ArchiveDepthExplorer.jsx');
  const { default: story, OnePerson } = await server.ssrLoadModule('/src/components/data-display/ArchiveDepthExplorer.stories.jsx');
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { LenisContext } = await server.ssrLoadModule('/src/utils/lenisContext.js');
  let shares = 0;
  const focuses = [];
  const args = { ...story.args, ...OnePerson.args, onShare: () => { shares += 1; }, onFocusGlyph: (id) => focuses.push(id) };
  root = createRoot(document.getElementById('root'));
  const render = async (props = {}, driver = null, locale = 'ko') => {
    await act(async () => root.render(h(LocaleProvider, { key: locale, initialMode: locale, syncDocument: false },
      h(ThemeProvider, { theme }, h(LenisContext.Provider, { value: driver }, h(Depth, { ...args, ...props }))))));
    await settle();
  };
  await render();
  const panel = document.querySelector('[data-archive-observation]');
  const figure = document.querySelector('[data-archive-sticky-figure]');
  const reading = document.querySelector('[data-archive-reading-column]');
  const nav = document.querySelector('[data-archive-navigation]');
  const analysis = panel.querySelector('[data-selected-analysis-toggle]');
  const chips = panel.querySelector('[data-observation-chips]');
  const metadata = [...chips.querySelectorAll('button')];
  const glyph = panel.querySelector('[data-glyph-analysis]').parentElement;
  const mode = () => panel.dataset.archiveObservation;
  check(() => assert.equal(mode(), 'expanded'));
  check(() => assert.equal(getComputedStyle(analysis).gridColumn, '', 'Expanded analysis does not create implicit columns'));
  check(() => assert.equal(document.querySelectorAll('[data-selected-analysis-toggle]').length, 1));
  await act(async () => { analysis.click(); metadata[0].click(); metadata[1]?.click(); analysis.focus(); });
  await scrollTo(760);
  check(() => assert.equal(mode(), 'compact'));
  check(() => assert.equal(getComputedStyle(panel).position, 'fixed'));
  check(() => assert.equal(getComputedStyle(figure).height, '500px', 'Original footprint survives compacting'));
  check(() => assert.equal(figure.style.getPropertyValue('--archive-expanded-width'), '358px'));
  check(() => assert.equal(panel.style.getPropertyValue('--archive-observation-width'), '358px'));
  check(() => assert.equal(getComputedStyle(nav).visibility, 'hidden'));
  check(() => assert.equal(nav.hasAttribute('inert'), true));
  check(() => assert.equal(getComputedStyle(nav).minHeight, '48px', 'Navigation footprint does not change'));
  check(() => assert.equal(document.activeElement, panel.querySelector('[data-observation-expand]'), 'Focus leaves the hidden analysis controls'));
  check(() => assert.equal(panel.querySelector('[data-glyph-analysis]').parentElement, glyph, 'Same live glyph surface'));
  check(() => assert.equal(panel.querySelector('[data-selected-analysis-toggle]'), analysis));
  check(() => assert.equal(analysis.getAttribute('aria-pressed'), 'true'));
  check(() => assert.match(analysis.textContent, /분석하기.*ON/));
  check(() => assert.equal(metadata[0].getAttribute('aria-pressed'), 'true'));
  check(() => assert.equal(getComputedStyle(panel).backgroundColor, 'transparent', 'No sticky background'));
  check(() => assert.equal(getComputedStyle(panel.querySelector('[data-archive-figure-controls]')).display, 'none'));
  check(() => assert.equal(panel.querySelector('[data-archive-figure-controls]').hasAttribute('inert'), true));
  check(() => assert.equal(panel.querySelector('[data-glyph-analysis]').dataset.glyphAnalysis, 'off', 'Compact glyph has no analysis overlay'));
  check(() => assert.equal(explicitScrolls.length, 0, 'Compacting never scrolls the reader'));
  await act(async () => panel.querySelector('[data-observation-share]').click());
  check(() => assert.equal(shares, 1));
  await scrollTo(730);
  check(() => assert.equal(mode(), 'compact', 'Hysteresis prevents boundary flicker'));
  await scrollTo(715);
  check(() => assert.equal(mode(), 'expanded'));
  check(() => assert.equal(nav.hasAttribute('inert'), false));
  check(() => assert.equal(panel.querySelector('[data-glyph-analysis]').dataset.glyphAnalysis, 'on', 'Full glyph restores analysis'));
  check(() => assert.equal(metadata[0].getAttribute('aria-pressed'), 'true', 'Full glyph restores metadata selection'));
  await scrollTo(900);
  await act(async () => panel.querySelector('[data-observation-expand]').click());
  await settle();
  check(() => assert.equal(explicitScrolls.at(-1).top, 172));
  check(() => assert.equal(explicitScrolls.at(-1).behavior, 'instant', 'Return works with native touch and reduced motion'));
  check(() => assert.equal(mode(), 'expanded'));
  check(() => assert.equal(document.activeElement, figure));
  check(() => assert.equal(analysis.getAttribute('aria-pressed'), 'true'));
  await scrollTo(900);
  await resize(844, 360);
  check(() => assert.equal(mode(), 'minimal'));
  check(() => assert.equal(getComputedStyle(panel).display, 'grid'));
  check(() => assert.equal(getComputedStyle(nav).position, 'sticky'));
  check(() => assert.equal(getComputedStyle(nav).visibility, 'hidden'));
  check(() => assert.equal(getComputedStyle(panel.querySelector('[data-observation-expand]')).display, 'block'));
  check(() => assert.equal(analysis.getAttribute('aria-pressed'), 'true'));
  await resize(320, 568);
  check(() => assert.equal(mode(), 'compact'));
  check(() => assert.equal(panel.style.getPropertyValue('--archive-observation-width'), '288px'));
  check(() => assert.equal(figure.style.getPropertyValue('--archive-expanded-width'), '358px', 'Scaling retains the original Canvas resolution'));
  topInset = 130;
  await resize(320, 568);
  check(() => assert.equal(mode(), 'minimal', 'Safe area counts against the reading space budget'));
  topInset = 64;
  await resize(1440, 900);
  check(() => assert.equal(mode(), 'expanded'));
  check(() => assert.equal(getComputedStyle(figure).position, 'sticky', 'Desktop remains sticky in the left column'));
  check(() => assert.equal(getComputedStyle(nav).position, 'sticky'));
  await resize(390, 844);
  check(() => assert.equal(mode(), 'compact'));
  await act(async () => panel.querySelector('[data-observation-expand]').focus());
  await scrollTo(2475);
  check(() => assert.equal(mode(), 'expanded', 'Observation releases before the peer section'));
  check(() => assert.equal(document.activeElement, reading, 'Release does not strand keyboard focus offscreen'));
  await scrollTo(2460);
  check(() => assert.equal(mode(), 'expanded', 'End boundary also has hysteresis'));
  await scrollTo(900);
  await act(async () => panel.querySelector('[data-observation-back]').click());
  check(() => assert.equal(focuses.at(-1), null));
  await render({ focusedId: null });
  check(() => assert.equal(document.querySelector('[data-archive-observation]'), null));
  check(() => assert.equal(getComputedStyle(nav).visibility, 'visible'));
  check(() => assert.equal(nav.hasAttribute('inert'), false));
  const calls = [];
  await render({}, { scrollTo: (top, options) => { calls.push([top, options]); dom.scrollTo({ top }); } }, 'en');
  const restored = document.querySelector('[data-archive-observation]');
  check(() => assert.equal(restored.dataset.archiveObservation, 'compact', 'Restored URL scroll initializes directly in compact mode'));
  check(() => assert.match(restored.querySelector('[data-selected-analysis-toggle]').textContent, /Analyze.*OFF/));
  await act(async () => restored.querySelector('[data-observation-expand]').click());
  await settle();
  check(() => assert.deepEqual(calls.at(-1), [172, { immediate: true, force: true }]));
  // Exercise transition cancellation with a local animation stub (no browser).
  const animations = [];
  restored.animate = (keyframes, options) => {
    let finish;
    let reject;
    const finished = new Promise((resolve, fail) => { finish = resolve; reject = fail; });
    finished.catch(() => {});
    const animation = { keyframes, options, finished, finish, cancelled: false,
      cancel() { this.cancelled = true; reject(new Error('Cancelled')); } };
    animations.push(animation);
    return animation;
  };
  reducedMotion = false;
  await scrollTo(900);
  check(() => assert.equal(restored.dataset.archiveObservation, 'compact'));
  check(() => assert.equal(animations.at(-1).options.duration, theme.transitions.duration.short));
  check(() => assert.equal(animations.at(-1).keyframes[0].opacity, 0));
  await scrollTo(715);
  const cancelledExit = animations.at(-1);
  check(() => assert.equal(cancelledExit.options.fill, 'forwards'));
  check(() => assert.equal(restored.dataset.archiveObservation, 'compact', 'Fixed layout remains until exit fade finishes'));
  await scrollTo(900);
  check(() => assert.equal(cancelledExit.cancelled, true, 'Reverse scrolling cancels a pending exit'));
  await scrollTo(715);
  await act(async () => animations.at(-1).finish());
  check(() => assert.equal(restored.dataset.archiveObservation, 'expanded'));
  check(() => assert.equal(restored.querySelector('[data-archive-figure-controls]').hasAttribute('inert'), false));
  await scrollTo(900);
  await act(async () => restored.querySelector('[data-observation-expand]').click());
  await settle();
  check(() => assert.deepEqual(calls.at(-1), [172, { immediate: false, force: true }], 'Ordinary return uses smooth scrolling'));
  await act(async () => animations.at(-1).finish());
  reducedMotion = true;
  // A short/unconfirmed reading should never show an unrelated sticky observation.
  readingEnd = 820;
  await scrollTo(900);
  check(() => assert.equal(restored.dataset.archiveObservation, 'expanded'));
  const priorDisconnections = disconnected;
  await act(async () => root.unmount()); root = null;
  check(() => assert.ok(disconnected > priorDisconnections));
  await scrollTo(1000);
  console.log(`Mobile archive observation: ${checks} checks passed; state continuity, stable footprint, boundary hysteresis, short viewport, native/Lenis return, navigation and cleanup. Simulated DOM only.`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close();
  dom.happyDOM.abort();
  globalThis.fetch = originalFetch;
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
