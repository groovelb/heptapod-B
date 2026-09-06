/** In-memory DOM, no browser, network or Canvas painting. Geometry is simulated. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/archive?view=meaning&mv=1&base=arrival' });
dom.document.write('<html><body><div id="root"></div></body></html>');
let disconnected = 0;
class Observer { observe() {} disconnect() { disconnected += 1; } }
const values = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  Element: dom.Element, Node: dom.Node, IntersectionObserver: Observer, ResizeObserver: Observer,
  getComputedStyle: dom.getComputedStyle.bind(dom), requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
  cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom), IS_REACT_ACT_ENVIRONMENT: true };
const originals = Object.fromEntries(Object.keys(values).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
const { act, createElement: h } = await import('react');
const { createRoot } = await import('react-dom/client');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, appType: 'custom', logLevel: 'error' });
let root;
let checks = 0;
const check = (fn) => { fn(); checks += 1; };
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 40)); });
try {
  const { default: Feed } = await server.ssrLoadModule('/src/components/data-display/ArchiveArchetypeFeed.jsx');
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { LenisContext } = await server.ssrLoadModule('/src/utils/lenisContext.js');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { default: story } = await server.ssrLoadModule('/src/components/data-display/ArchiveArchetypeFeed.stories.jsx');
  const feed = story.args.feed;
  const calls = [];
  const native = [];
  const lenis = { scrollTo: (...args) => calls.push(args) };
  dom.scrollTo = (...args) => native.push(args);
  Object.defineProperty(dom.document.documentElement, 'scrollHeight', { configurable: true, value: 10000 });
  root = createRoot(document.getElementById('root'));
  const render = async (data = feed, driver = lenis) => {
    await act(async () => root.render(h(LocaleProvider, { initialMode: 'ko', syncDocument: false },
      h(ThemeProvider, { theme }, h(LenisContext.Provider, { value: driver }, h(Feed, { feed: data }))))));
    await settle();
  };
  await render();
  const links = () => [...document.querySelectorAll('[data-index-target]')];
  const sections = [...document.querySelectorAll('[data-archetype-section]')];
  const glyphNodes = [...document.querySelectorAll('[data-archive-member]')];
  check(() => assert.equal(links().length, feed.sections.length + (feed.untypedGlyphs.length ? 1 : 0)));
  check(() => assert.equal(document.querySelectorAll('[data-index-circle]').length, links().length));
  check(() => assert.ok(document.querySelector('[data-archive-index]').textContent.includes(' / ')));
  check(() => assert.equal(getComputedStyle(document.querySelector('[data-archive-index]')).position, 'sticky'));
  for (const [index, section] of sections.entries()) {
    check(() => assert.equal(links()[index].dataset.indexTarget, feed.sections[index].id));
    check(() => assert.ok(links()[index].getAttribute('aria-label').includes(feed.sections[index].archetype.title)));
    check(() => assert.equal(links()[index].textContent, ''));
    check(() => assert.equal(getComputedStyle(links()[index].querySelector('[data-index-circle]')).borderRadius, '50%'));
    check(() => assert.equal(document.getElementById(links()[index].hash.slice(1)), section));
  }
  links().forEach((link, index) => {
    document.getElementById(link.hash.slice(1)).getBoundingClientRect = () => ({ top: 500 + index * 1000 - dom.scrollY, bottom: 1500 + index * 1000 - dom.scrollY });
  });
  const url = dom.location.href;
  await act(async () => links()[1].click());
  check(() => assert.equal(calls.length, 1));
  check(() => assert.ok(calls[0][0] > 1300 && calls[0][0] < 1500));
  check(() => assert.equal(calls[0][1].immediate, false));
  check(() => assert.equal(document.activeElement, sections[1]));
  check(() => assert.equal(dom.location.href, url));
  check(() => assert.ok(glyphNodes.every((node) => node.isConnected)));
  check(() => assert.equal(links()[1].getAttribute('aria-current'), 'location'));
  Object.defineProperty(dom, 'scrollY', { configurable: true, value: 1550 });
  await act(async () => dom.dispatchEvent(new dom.Event('scroll')));
  await settle();
  check(() => assert.equal(links()[1].getAttribute('aria-current'), 'location'));
  Object.defineProperty(dom, 'scrollY', { configurable: true, value: 9400 });
  await act(async () => dom.dispatchEvent(new dom.Event('scroll')));
  await settle();
  check(() => assert.equal(links().at(-1).getAttribute('aria-current'), 'location'));
  const match = dom.matchMedia.bind(dom);
  dom.matchMedia = (query) => query.includes('prefers-reduced-motion') ? { matches: true } : match(query);
  await act(async () => links()[0].click());
  check(() => assert.equal(calls.at(-1)[1].immediate, true));
  await render(feed, null);
  await act(async () => links()[0].click());
  check(() => assert.equal(native.at(-1)[0].behavior, 'instant'));
  const one = { ...feed, sections: [feed.sections[0]], untypedGlyphs: [], glyphs: feed.sections[0].glyphs };
  await render(one);
  check(() => assert.equal(links().length, 1));
  check(() => assert.equal(links()[0].getAttribute('aria-current'), 'location'));
  await render({ sections: [], glyphs: [], untypedGlyphs: [] });
  check(() => assert.equal(document.querySelector('[data-archive-index]'), null));
  check(() => assert.ok(disconnected > 0));
  console.log(`Archive feed index: ${checks} checks passed; order/counts, anchors, active scroll, same DOM/URL, Lenis/native/reduced motion, empty and cleanup. Simulated geometry only.`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close();
  dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
