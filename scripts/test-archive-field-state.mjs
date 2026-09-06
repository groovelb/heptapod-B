/** In-memory DOM only. No browser engine, automation, Canvas paint or network. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/archive', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
dom.document.write('<!doctype html><html><body><div id="root"></div></body></html>');
// happy-dom's partial WAAPI rejects cancellation; use Motion's JS fallback.
Object.defineProperty(dom.Element.prototype, 'animate', { configurable: true, value: undefined });
// Do not activate Canvas rendering; this test checks DOM identity and navigation.
class Observer { observe() {} disconnect() {} unobserve() {} }
const globals = { window: dom, document: dom.document, navigator: dom.navigator,
  HTMLElement: dom.HTMLElement, Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment,
  MutationObserver: dom.MutationObserver, IntersectionObserver: Observer, ResizeObserver: Observer,
  getComputedStyle: dom.getComputedStyle.bind(dom), requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
  cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom), IS_REACT_ACT_ENVIRONMENT: true };
const original = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const originalFetch = globalThis.fetch;
let requests = 0;
globalThis.fetch = () => { requests += 1; throw new Error('No network in field state tests'); };
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { createMemoryRouter, RouterProvider } = await import('react-router-dom');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root;
let router;
let checks = 0;
const check = (run) => { run(); checks += 1; };
const settle = async () => { for (let i = 0; i < 5; i += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); }); };
const buttons = () => [...document.querySelectorAll('button')];
try {
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { default: Page } = await server.ssrLoadModule('/src/components/templates/MyArchivePage.jsx');
  const { LenisContext } = await server.ssrLoadModule('/src/utils/lenisContext.js');
  const { createArchiveStoryClient, ARCHIVE_STORY_GLYPHS } = await server.ssrLoadModule('/src/test-fixtures/archiveClient.js');
  const { groupArchiveMeanings } = await server.ssrLoadModule('/src/utils/heptapod/groupArchiveMeanings.js');
  const { filterMeaningGlyphs } = await server.ssrLoadModule('/src/utils/heptapod/archiveDepthView.js');
  const { buildArchiveArchetypeFeed } = await server.ssrLoadModule('/src/utils/heptapod/buildArchiveArchetypeFeed.js');
  const { glyphArchetypeShareCopy } = await server.ssrLoadModule('/src/utils/heptapod/shareArchive.js');
  const publicGlyph = ARCHIVE_STORY_GLYPHS.find((glyph) => glyph.is_public);
  const partial = structuredClone(publicGlyph);
  partial.id = '00000000-0000-4000-8000-000000000901';
  partial.model_data.inkLoads = [];
  const invalid = { ...publicGlyph, id: '00000000-0000-4000-8000-000000000902', model_data: null };
  const rows = [...ARCHIVE_STORY_GLYPHS, partial, invalid];
  const meanings = groupArchiveMeanings(rows);
  const expectedFeed = buildArchiveArchetypeFeed(filterMeaningGlyphs(rows, meanings, { base: 'arrival' }), meanings);
  const client = createArchiveStoryClient({ glyphs: rows });
  const scrollCalls = [];
  const lenis = { scrollTo: (...args) => scrollCalls.push(args) };
  router = createMemoryRouter([{ path: '/archive', element: createElement(Page, { client }) }],
    { initialEntries: ['/archive?view=meaning&mv=1&base=arrival&meta=simultaneity'] });
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(createElement(LocaleProvider, { initialMode: 'ko', syncDocument: false },
    createElement(ThemeProvider, { theme }, createElement(LenisContext.Provider, { value: lenis }, createElement(RouterProvider, { router }))))));
  await settle();
  check(() => assert.ok(document.querySelector('[data-archive-depth="members"]'), document.body.textContent));
  check(() => assert.equal(document.querySelectorAll('[data-cluster-id]').length, 0));
  const people = () => buttons().filter((button) => button.getAttribute('aria-label')?.endsWith('의 표식 가까이 보기'));
  const before = people();
  check(() => assert.ok(before.length > 0));
  const first = before[0];
  const initialScrollCalls = scrollCalls.length;
  check(() => assert.equal(document.querySelector('[data-archive-facets], [data-archive-meta], [role="tab"]'), null));
  const members = () => [...document.querySelectorAll('[data-archetype-feed] [data-archive-member]')];
  check(() => assert.deepEqual(members().map((element) => element.dataset.archiveMember), expectedFeed.glyphs.map((glyph) => glyph.id), 'Legacy meta does not override fixed exact-type order'));
  const sections = [...document.querySelectorAll('[data-archetype-section]')];
  check(() => assert.deepEqual(sections.map((element) => element.dataset.archetypeSection), expectedFeed.sections.map((section) => section.id)));
  for (const [index, section] of sections.entries()) {
    check(() => assert.equal(section.querySelector('h2').textContent, expectedFeed.sections[index].archetype.title));
    check(() => assert.ok(section.querySelector('[data-archetype-symbol]')));
    check(() => assert.deepEqual([...section.querySelectorAll('[data-archive-member]')].map((element) => element.dataset.archiveMember), expectedFeed.sections[index].glyphs.map((glyph) => glyph.id)));
  }
  check(() => assert.equal(new Set(members().map((element) => element.dataset.archiveMember)).size, before.length));
  await act(async () => first.click());
  await settle();
  check(() => assert.ok(new URLSearchParams(router.state.location.search).get('glyph')));
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('meta'), null, 'New focus URLs no longer emit meta'));
  check(() => assert.ok(document.querySelector('[role="dialog"]'), 'focus uses a dialog'));
  check(() => assert.ok(before.every((element) => element.isConnected), 'underlying field survives focus'));
  check(() => assert.equal(scrollCalls.length, initialScrollCalls));
  const focusedId = new URLSearchParams(router.state.location.search).get('glyph');
  check(() => assert.equal(focusedId, expectedFeed.glyphs[0].id));
  let shared;
  Object.defineProperty(dom.navigator, 'share', { configurable: true, value: async (payload) => { shared = payload; } });
  const shareButton = [...document.querySelectorAll('[role="dialog"] button')].find((button) => button.getAttribute('aria-label')?.includes('공유'));
  await act(async () => shareButton.click());
  const expectedCopy = glyphArchetypeShareCopy(expectedFeed.glyphs[0], meanings.interpretations[focusedId], 'ko');
  check(() => assert.equal(shared.title, expectedCopy.title));
  check(() => assert.equal(shared.text, expectedCopy.text));
  check(() => assert.equal(new URL(shared.url).pathname, '/archive'));
  check(() => assert.equal(new URL(shared.url).searchParams.get('glyph'), focusedId));
  check(() => assert.equal(new URL(shared.url).searchParams.get('base'), 'arrival'));
  check(() => assert.equal(new URL(shared.url).searchParams.has('meta'), false));
  const readingDetails = document.querySelector('[role="dialog"] details');
  await act(async () => { readingDetails.open = true; readingDetails.dispatchEvent(new window.Event('toggle')); });
  const reading = document.querySelector('[role="dialog"] [data-meaning-reading]');
  check(() => assert.match(reading.textContent, /Archive의 공통 언어/));
  check(() => assert.equal(reading.dataset.readingArchetype, expectedFeed.sections[0].archetype.id));
  const readingMeaning = reading.querySelector('[data-reading-meaning]');
  const focusSearch = router.state.location.search;
  await act(async () => readingMeaning.click());
  check(() => assert.equal(readingMeaning.getAttribute('aria-pressed'), 'true'));
  check(() => assert.ok(reading.querySelector('[data-reading-definition]')));
  check(() => assert.ok(reading.querySelector('[data-reading-evidence]')));
  await act(async () => readingMeaning.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  check(() => assert.equal(router.state.location.search, focusSearch, 'Reading a meaning must not move to another person'));
  check(() => assert.equal(scrollCalls.length, initialScrollCalls, 'Reading a meaning keeps the field scroll'));
  check(() => assert.ok(before.every((element) => element.isConnected)));
  await act(async () => router.navigate(-1));
  await settle();
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('glyph'), null));
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('meta'), 'simultaneity'));
  check(() => assert.ok(before.every((element) => element.isConnected)));
  check(() => assert.equal(scrollCalls.length, initialScrollCalls, 'Back from a person keeps scroll'));
  await act(async () => first.click());
  await settle();
  const close = document.querySelector('button[aria-label="표식 닫기"]');
  check(() => assert.ok(close));
  await act(async () => close.click());
  await settle();
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('glyph'), null));
  check(() => assert.equal(scrollCalls.length, initialScrollCalls));
  // Arrow navigation follows the very same flattened type feed, not old ID order.
  if (expectedFeed.glyphs.length > 1) {
    await act(async () => first.click());
    await settle();
    const next = [...document.querySelectorAll('[role="dialog"] button')].find((button) => button.getAttribute('aria-label')?.startsWith('다음'));
    await act(async () => next.click());
    await settle();
    check(() => assert.equal(new URLSearchParams(router.state.location.search).get('glyph'), expectedFeed.glyphs[1].id));
    check(() => assert.ok(before.every((element) => element.isConnected)));
    check(() => assert.equal(scrollCalls.length, initialScrollCalls));
    await act(async () => document.querySelector('button[aria-label="표식 닫기"]').click());
    await settle();
  }
  await act(async () => first.click());
  await settle();
  await act(async () => document.querySelector('[role="dialog"]').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await settle();
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('glyph'), null, 'Escape closes the person without leaving the family'));
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('base'), 'arrival'));
  check(() => assert.equal(scrollCalls.length, initialScrollCalls));
  await act(async () => router.navigate('/archive?view=meaning&mv=1&base=reception'));
  await settle();
  check(() => assert.equal(scrollCalls.length, initialScrollCalls + 1, 'only a different scope resets scroll'));
  await act(async () => router.navigate('/archive?view=precision'));
  await settle();
  check(() => assert.ok(document.querySelector('[data-archive-depth="families"]')));
  check(() => assert.equal(document.querySelector('footer'), null));
  check(() => assert.equal(document.querySelector('[role="dialog"]'), null, 'Legacy observation URL cannot reopen the removed Drawer'));
  check(() => assert.doesNotMatch(document.body.textContent, /이 공간의 관측 기록|내가 남긴 응답|아직 읽고 있는 흔적|모습을 기다리는 응답/));
  check(() => assert.ok(!client.calls.some((key) => ['auth', 'glyph_contributions', 'archive-relations'].includes(key)), 'Archive must not load personal records or precision relations'));
  check(() => assert.equal(requests, 0));
  console.log(`Archive type feed: ${checks} checks passed; exact sections, legacy scope, same-type share, feed-ordered arrows, focus/Back preserve mounted members and scroll. In-memory DOM only.`);
} finally {
  if (root) await act(async () => root.unmount());
  router?.dispose();
  await server.close();
  await dom.happyDOM.abort();
  globalThis.fetch = originalFetch;
  for (const [key, descriptor] of Object.entries(original)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
