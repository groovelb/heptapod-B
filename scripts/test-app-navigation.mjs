/** App navigation integration in happy-dom. No browser, media or network. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
dom.document.write('<!doctype html><html><body><div id="root"></div></body></html>');
let width = 1200;
const media = new Map();
dom.matchMedia = (query) => {
  if (!media.has(query)) {
    const listeners = new Set();
    media.set(query, { media: query, get matches() {
      if (query.includes('prefers-reduced-motion')) return true;
      const max = /max-width:\s*([\d.]+)px/.exec(query);
      return max ? width <= Number(max[1]) : false;
    }, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn),
    addListener: (fn) => listeners.add(fn), removeListener: (fn) => listeners.delete(fn), listeners });
  }
  return media.get(query);
};
const globals = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment, MutationObserver: dom.MutationObserver,
  getComputedStyle: dom.getComputedStyle.bind(dom), requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
  cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom), IS_REACT_ACT_ENVIRONMENT: true };
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement: h, act, useState } = await import('react');
const { createRoot } = await import('react-dom/client');
const { createMemoryRouter, RouterProvider } = await import('react-router-dom');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
const root = createRoot(document.getElementById('root'));
let router;
let checks = 0;
const check = (run) => { run(); checks++; };
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 60)));
const click = async (el) => { assert.ok(el, 'Click target exists'); await act(async () => el.click()); await settle(); };
const navLink = (label) => [...document.querySelectorAll('nav a')].find((el) => el.textContent === label);
const menuButton = () => document.querySelector('button[aria-haspopup="dialog"]');
const resize = async (next) => {
  const before = new Map([...media].map(([key, value]) => [key, value.matches]));
  await act(async () => {
    width = next;
    for (const [key, value] of media) if (before.get(key) !== value.matches) for (const fn of value.listeners) fn({ matches: value.matches, media: key });
  });
  await settle();
};
try {
  const { default: AppGNB } = await server.ssrLoadModule('/src/components/navigation/AppGNB.jsx');
  const { default: Provider } = await server.ssrLoadModule('/src/routes/NavigationSessionProvider.jsx');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { LenisContext } = await server.ssrLoadModule('/src/utils/lenisContext.js');
  const { useNavigationSession } = await server.ssrLoadModule('/src/routes/navigationSession.js');
  let navigationSession;
  const lenis = { isStopped: false, stops: 0, starts: 0, stop() { this.isStopped = true; this.stops++; }, start() { this.isStopped = false; this.starts++; } };
  function Page() {
    navigationSession = useNavigationSession();
    const [soundOn, setSoundOn] = useState(false);
    return h(AppGNB, { soundOn, onToggleSound: () => setSoundOn((value) => !value) });
  }
  router = createMemoryRouter([{ path: '*', element: h(Page) }], { initialEntries: ['/canvas?name=Louise&v=2'] });
  await act(async () => root.render(h(LocaleProvider, { initialMode: 'ko', syncDocument: false },
    h(ThemeProvider, { theme }, h(Provider, null, h(LenisContext.Provider, { value: lenis }, h(RouterProvider, { router })))))));
  await settle();
  check(() => assert.equal(document.querySelectorAll('header').length, 1));
  check(() => assert.equal(getComputedStyle(document.querySelector('header')).position, 'fixed'));
  check(() => assert.equal(document.querySelectorAll('nav a').length, 3));
  check(() => assert.equal(navLink('Create').getAttribute('aria-current'), 'page'));
  check(() => assert.equal(menuButton(), null));
  const key = router.state.location.key;
  await click(navLink('Create'));
  check(() => assert.equal(router.state.location.key, key, 'Active Create does not remount/reset a name URL'));
  await click(document.querySelector('button[aria-pressed]'));
  check(() => assert.equal(document.querySelector('button[aria-pressed]').getAttribute('aria-pressed'), 'true'));
  await act(async () => router.navigate('/archive?group=echo'));
  await settle();
  await act(async () => router.navigate('/glyph/example'));
  await settle();
  check(() => assert.equal(navLink('Archive').getAttribute('aria-current'), 'page'));
  check(() => assert.equal(navLink('Archive').getAttribute('href'), '/archive', 'Archive menu always opens the root, never a remembered depth'));
  await act(async () => router.navigate(-1));
  await settle();
  check(() => assert.equal(router.state.location.search, '?group=echo', 'Browser Back retains the actual prior archive URL'));
  navigationSession.archiveScroll.set('/archive', 380);
  navigationSession.archiveScroll.set('/archive?group=echo', 570);
  const oldVisitPositions = navigationSession.archiveScroll;
  const modifiedClick = new dom.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, button: 0 });
  navLink('Archive').dispatchEvent(modifiedClick);
  check(() => assert.equal(navigationSession.archiveScroll, oldVisitPositions, 'Opening another tab does not reset this visit'));
  await click(navLink('Archive'));
  check(() => assert.equal(router.state.location.search, '', 'Archive menu also leaves the current archive depth for root'));
  check(() => assert.notEqual(navigationSession.archiveScroll, oldVisitPositions));
  oldVisitPositions.set('/archive', 999); // Outgoing effect cleanup must not restore the old root position.
  check(() => assert.equal(navigationSession.archiveScroll.size, 0, 'Fresh visit starts without stale positions'));
  const rootKey = router.state.location.key;
  await click(navLink('Archive'));
  check(() => assert.equal(router.state.location.key, rootKey, 'Active root link does not create duplicate history'));
  await click(navLink('Create'));
  check(() => assert.equal(router.state.location.search, '?name=Louise&v=2', 'Create resumes last URL session'));

  await resize(390);
  check(() => assert.equal(document.querySelector('nav'), null));
  check(() => assert.ok(document.querySelector('header button[aria-haspopup="menu"]'), 'Language remains in mobile header'));
  check(() => assert.ok(document.querySelector('header button[aria-pressed]'), 'Sound remains in mobile header'));
  await act(async () => menuButton().focus());
  await click(menuButton());
  check(() => assert.equal(document.querySelectorAll('[role="dialog"]').length, 1));
  check(() => assert.equal(document.querySelectorAll('nav a').length, 3));
  check(() => assert.equal(lenis.isStopped, true));
  check(() => assert.equal(document.body.style.overflow, 'hidden'));
  await click(navLink('Archive'));
  check(() => assert.equal(router.state.location.pathname, '/archive'));
  check(() => assert.equal(router.state.location.search, '', 'Mobile Archive entry also starts at root'));
  check(() => assert.equal(document.querySelector('[role="dialog"]'), null));
  check(() => assert.equal(lenis.isStopped, false));
  check(() => assert.equal(document.body.style.overflow, ''));
  check(() => assert.equal(document.activeElement, menuButton(), 'Focus returns to the menu trigger'));

  await click(menuButton());
  await act(async () => document.querySelector('[role="dialog"]').dispatchEvent(new dom.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await settle();
  check(() => assert.equal(document.querySelector('[role="dialog"]'), null));
  await click(menuButton());
  await resize(1200);
  check(() => assert.equal(document.querySelector('[role="dialog"]'), null));
  check(() => assert.equal(lenis.isStopped, false));
  await resize(390);
  check(() => assert.equal(document.querySelector('[role="dialog"]'), null, 'Returning to mobile does not reopen stale Drawer'));

  lenis.stop(); // The landing START gate already owns the stop.
  const starts = lenis.starts;
  await click(menuButton());
  await click(document.querySelector('[role="dialog"] button'));
  check(() => assert.equal(lenis.starts, starts, 'Closing Drawer preserves an existing START lock'));
  check(() => assert.equal(lenis.isStopped, true));
  lenis.start();
  await click(menuButton());
  await act(async () => router.navigate(-1));
  await settle();
  check(() => assert.equal(document.querySelector('[role="dialog"]'), null, 'Browser Back closes Drawer'));
  check(() => assert.equal(lenis.isStopped, false));
  await act(async () => router.navigate(1));
  await settle();
  check(() => assert.equal(document.querySelector('[role="dialog"]'), null, 'Forward must not resurrect the prior open state'));
  const { useArchiveScroll } = await server.ssrLoadModule('/src/routes/useArchiveScroll.js');
  const { NavigationSessionContext, createNavigationSession } = await server.ssrLoadModule('/src/routes/navigationSession.js');
  const scrollSession = createNavigationSession();
  scrollSession.archiveScroll.set('/archive', 380);
  const scrollCalls = [];
  const scrollLenis = { scrollTo(top) { scrollCalls.push(top); } };
  function ScrollPage({ scope, ready }) { useArchiveScroll(scope, ready); return null; }
  const renderScroll = async (props) => {
    await act(async () => root.render(h(NavigationSessionContext.Provider, { value: scrollSession },
      h(LenisContext.Provider, { value: scrollLenis }, h(ScrollPage, props)))));
    await settle();
  };
  await renderScroll({ scope: '/archive', ready: false });
  check(() => assert.equal(scrollCalls.length, 0, 'Do not restore against an empty loading feed'));
  await renderScroll({ scope: '/archive', ready: true });
  check(() => assert.equal(scrollCalls.at(-1), 380, 'Restore saved scroll after the feed is ready'));
  await act(async () => {
    Object.defineProperty(dom, 'scrollY', { configurable: true, value: 570 });
    dom.dispatchEvent(new dom.Event('scroll'));
  });
  check(() => assert.equal(scrollSession.archiveScroll.get('/archive'), 570));
  await renderScroll({ scope: '/archive', ready: true, focusedId: 'example' });
  check(() => assert.equal(scrollCalls.length, 1, 'Person focus does not reset background scroll'));
  await renderScroll({ scope: '/archive?group=echo', ready: true });
  check(() => assert.equal(scrollCalls.at(-1), 0, 'Unvisited scope starts at the top'));
  await renderScroll({ scope: '/archive', ready: true });
  check(() => assert.equal(scrollCalls.at(-1), 570, 'Returning to a scope restores its position'));
  const priorVisit = scrollSession.archiveScroll;
  scrollSession.archiveScroll = new Map();
  await renderScroll({ scope: '/archive', ready: true });
  check(() => assert.equal(scrollCalls.at(-1), 0, 'New Archive entry starts at top even when its canonical scope URL is unchanged'));
  check(() => assert.equal(priorVisit.get('/archive'), 570, 'Cleanup saves only to the prior visit'));
  console.log(`App navigation: ${checks} checks passed; desktop/mobile, active links, saved destinations, sound, Drawer, focus, scroll and Back (no browser).`);
} finally {
  await act(async () => root.unmount());
  router?.dispose();
  await server.close();
  await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
