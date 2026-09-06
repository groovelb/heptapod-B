/** In-memory DOM only. No browser engine, automation, Canvas paint or network. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/archive', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, device: { prefersReducedMotion: 'reduce' } } });
const musicCalls = { play: 0, pause: 0, destroy: 0 };
// Local player stub: no external iframe, script, audio or network.
dom.YT = { Player: class {
  constructor(_container, { events }) { queueMicrotask(() => events.onReady()); }
  setVolume() {}
  playVideo() { musicCalls.play += 1; }
  pauseVideo() { musicCalls.pause += 1; }
  destroy() { musicCalls.destroy += 1; }
} };
dom.document.write('<!doctype html><html><body><div id="root"></div></body></html>');
// happy-dom's partial WAAPI rejects cancellation; use Motion's JS fallback.
Object.defineProperty(dom.Element.prototype, 'animate', { configurable: true, value: undefined });
// Do not activate Canvas rendering; this test checks DOM identity and navigation.
class Observer { observe() {} disconnect() {} unobserve() {} }
const resizeObservers = [];
class ResizeObserverStub extends Observer {
  constructor(callback) { super(); this.callback = callback; resizeObservers.push(this); }
  observe(target) { this.target = target; }
  disconnect() { this.disconnected = true; }
}
const globals = { window: dom, document: dom.document, navigator: dom.navigator,
  HTMLElement: dom.HTMLElement, Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment,
  MutationObserver: dom.MutationObserver, IntersectionObserver: Observer, ResizeObserver: ResizeObserverStub,
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
  const lenis = { scrollTo: (...args) => { scrollCalls.push(args); dom.scrollTo(0, args[0]); } };
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
  const soundButton = () => document.querySelector('header button[aria-pressed]');
  check(() => assert.equal(soundButton().getAttribute('aria-pressed'), 'true', 'Archive sound defaults on'));
  check(() => assert.ok(musicCalls.play > 0, 'Default on attempts real controller playback'));
  await act(async () => soundButton().click());
  await settle();
  check(() => assert.equal(soundButton().getAttribute('aria-pressed'), 'false'));
  check(() => assert.ok(musicCalls.pause > 0));
  const mutedPlays = musicCalls.play;
  await act(async () => window.dispatchEvent(new window.Event('pointerdown')));
  await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a' })));
  check(() => assert.equal(musicCalls.play, mutedPlays, 'Gestures do not restart explicitly muted audio'));
  await act(async () => soundButton().click());
  await settle();
  check(() => assert.equal(soundButton().getAttribute('aria-pressed'), 'true'));
  check(() => assert.ok(musicCalls.play > mutedPlays));
  const navigation = document.querySelector('[data-archive-navigation]');
  const navigationResize = resizeObservers.find((observer) => observer.target === navigation);
  check(() => assert.equal(getComputedStyle(navigation).position, 'sticky'));
  check(() => assert.equal(navigation.parentElement.style.getPropertyValue('--archive-navigation-height'), '48px'));
  navigation.getBoundingClientRect = () => ({ height: 96 });
  navigationResize.callback();
  check(() => assert.equal(navigation.parentElement.style.getPropertyValue('--archive-navigation-height'), '96px', 'Wrapped navigation updates the shared index/anchor clearance'));
  navigation.getBoundingClientRect = () => ({ height: 48 });
  navigationResize.callback();
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
  check(() => assert.ok(first.querySelector('[data-glyph-centered-name]'), 'Listing name belongs in the circle'));
  dom.scrollTo(0, 640);
  await act(async () => window.dispatchEvent(new window.Event('scroll')));
  await act(async () => first.click());
  await settle();
  check(() => assert.ok(new URLSearchParams(router.state.location.search).get('glyph')));
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('meta'), null, 'New focus URLs no longer emit meta'));
  check(() => assert.ok(document.querySelector('[data-selected-glyph-detail]'), 'focus reveals detail view'));
  check(() => assert.equal(document.querySelectorAll('[data-same-type-glyph]').length, expectedFeed.sections[0].glyphs.length - 1, 'Do not list the selected glyph as its own peer'));
  check(() => assert.match(document.querySelector('[data-selected-glyph-detail]').textContent, /이 유형의 다른 표식은 아직 없어요/));
  check(() => assert.equal(document.querySelector('[data-shared-pattern-grid]'), null, 'No invented shared fragments for a singleton'));
  check(() => assert.equal(document.querySelector('[data-archive-list-view]').hidden, true));
  check(() => assert.ok(document.querySelector('[data-archive-list-view]').hasAttribute('inert'), 'Hidden list cannot receive keyboard navigation'));
  check(() => assert.ok(document.querySelector('[data-selected-glyph-detail] h1[data-glyph-centered-name]')));
  check(() => assert.ok(before.every((element) => element.isConnected), 'underlying field survives focus'));
  check(() => assert.equal(scrollCalls.length, initialScrollCalls + 1));
  check(() => assert.equal(scrollCalls.at(-1)[0], 0, 'Detail begins at top'));
  const focusedId = new URLSearchParams(router.state.location.search).get('glyph');
  check(() => assert.equal(focusedId, expectedFeed.glyphs[0].id));
  let shared;
  Object.defineProperty(dom.navigator, 'share', { configurable: true, value: async (payload) => { shared = payload; } });
  const shareButton = [...document.querySelectorAll('button')].find((button) => button.getAttribute('aria-label')?.includes('공유'));
  await act(async () => shareButton.click());
  const expectedCopy = glyphArchetypeShareCopy(expectedFeed.glyphs[0], meanings.interpretations[focusedId], 'ko');
  check(() => assert.equal(shared.title, expectedCopy.title));
  check(() => assert.equal(shared.text, expectedCopy.text));
  check(() => assert.equal(new URL(shared.url).pathname, '/archive'));
  check(() => assert.equal(new URL(shared.url).searchParams.get('glyph'), focusedId));
  check(() => assert.equal(new URL(shared.url).searchParams.get('base'), 'arrival'));
  check(() => assert.equal(new URL(shared.url).searchParams.has('meta'), false));
  const analysisButton = [...document.querySelectorAll('[data-selected-glyph-detail] button')].find((button) => button.textContent.includes('분석'));
  await act(async () => analysisButton.click());
  check(() => assert.equal(analysisButton.getAttribute('aria-pressed'), 'true'));
  check(() => assert.ok(document.querySelector('[data-selected-glyph-detail] [data-glyph-analysis="on"] .hb-edge'), 'Analysis contains real green mesh edges'));
  const reading = document.querySelector('[data-selected-glyph-detail] [data-reading-archetype]');
  check(() => assert.match(reading.textContent, /Archive의 공통 언어/));
  check(() => assert.equal(reading.dataset.readingArchetype, expectedFeed.sections[0].archetype.id));
  const readingMeaning = reading.querySelector('[data-reading-meaning]');
  const focusSearch = router.state.location.search;
  await act(async () => readingMeaning.click());
  check(() => assert.equal(readingMeaning.getAttribute('aria-pressed'), 'true'));
  check(() => assert.ok(reading.querySelector('[data-reading-definition]')?.textContent));
  check(() => assert.ok(reading.querySelector('[data-reading-evidence]')?.textContent));
  check(() => assert.ok(document.querySelector('[data-selected-glyph-detail] [data-glyph-observations] [data-kind]'), 'Meaning selection highlights actual model coordinates'));
  const mesh = document.querySelector('[data-selected-glyph-detail] .hb-edge');
  await act(async () => readingMeaning.click());
  check(() => assert.equal(readingMeaning.getAttribute('aria-pressed'), 'false'));
  check(() => assert.equal(document.querySelector('[data-selected-glyph-detail] [data-glyph-observations]'), null));
  check(() => assert.equal(document.querySelector('[data-selected-glyph-detail] .hb-edge'), mesh, 'Selecting a meaning does not restart the scan'));
  await act(async () => readingMeaning.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  check(() => assert.equal(router.state.location.search, focusSearch, 'Reading a meaning must not move to another person'));
  check(() => assert.equal(scrollCalls.length, initialScrollCalls + 1, 'Reading a meaning keeps detail scroll'));
  await act(async () => analysisButton.click());
  check(() => assert.equal(analysisButton.getAttribute('aria-pressed'), 'false'));
  check(() => assert.equal(document.querySelector('[data-selected-glyph-detail] .hb-edge'), null));
  check(() => assert.ok(before.every((element) => element.isConnected)));
  await act(async () => router.navigate(-1));
  await settle();
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('glyph'), null));
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('meta'), 'simultaneity'));
  check(() => assert.ok(before.every((element) => element.isConnected)));
  check(() => assert.equal(scrollCalls.length, initialScrollCalls + 2, 'Back restores list scroll'));
  check(() => assert.equal(scrollCalls.at(-1)[0], 640));
  check(() => assert.equal(document.querySelector('[data-archive-list-view]').hidden, false));
  check(() => assert.equal(document.activeElement, first, 'Back restores keyboard focus to the selected member'));
  await act(async () => router.navigate('/archive?view=meaning&mv=1&base=arrival'));
  await settle();
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('glyph'), null));
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('base'), 'arrival'));
  check(() => assert.equal(document.querySelector('[data-selected-glyph-detail]'), null));
  await act(async () => router.navigate('/archive?view=meaning&mv=1&base=reception'));
  await settle();
  check(() => assert.equal(scrollCalls.length, initialScrollCalls + 3, 'Different scope starts its own scroll'));
  await act(async () => router.navigate('/archive?view=precision'));
  await settle();
  check(() => assert.ok(document.querySelector('[data-archive-depth="families"]')));
  check(() => assert.equal(document.querySelector('footer'), null));
  check(() => assert.equal(document.querySelector('[role="dialog"]'), null, 'Legacy observation URL cannot reopen the removed Drawer'));
  check(() => assert.doesNotMatch(document.body.textContent, /이 공간의 관측 기록|내가 남긴 응답|아직 읽고 있는 흔적|모습을 기다리는 응답/));
  check(() => assert.ok(!client.calls.some((key) => ['auth', 'glyph_contributions', 'archive-relations'].includes(key)), 'Archive must not load personal records or precision relations'));
  // Time is an equal circle portal, not a view tab.
  for (let i = 0; i < 20 && !document.querySelector('[data-cluster-id="timeline"]'); i += 1) await settle();
  const timelinePortal = document.querySelector('[data-cluster-id="timeline"]');
  check(() => assert.ok(timelinePortal?.querySelector('.archive-cluster-cloud [data-cluster-title]')));
  check(() => assert.ok(timelinePortal.parentElement.parentElement.querySelector('[data-cluster-id="arrival"]')));
  check(() => assert.equal(document.querySelector('[data-archive-grouped], [role="tablist"]'), null));
  // Whole-archive order includes unreadable models and survives focus and Back.
  await act(async () => document.querySelector('[data-archive-chronological]').click());
  for (let i = 0; i < 20 && !document.querySelector('[data-archive-timeline]'); i += 1) await settle();
  await settle();
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('order'), 'newest'));
  check(() => assert.equal(document.querySelector('[data-archive-chronological]'), null, 'The portal stays at the family level'));
  const { buildArchiveTimeline } = await server.ssrLoadModule('/src/utils/heptapod/buildArchiveArchetypeFeed.js');
  const chronologicalIds = () => [...document.querySelectorAll('[data-archive-timeline] [data-archive-member]')].map((node) => node.dataset.archiveMember);
  check(() => assert.deepEqual(chronologicalIds(), buildArchiveTimeline(rows).glyphs.map((row) => row.id)));
  check(() => assert.ok(chronologicalIds().includes(invalid.id), 'Uncategorized public glyphs remain visible'));
  check(() => assert.equal(document.querySelector('[data-archetype-section]'), null));
  await act(async () => document.querySelector('[data-archive-order]').click());
  await settle();
  check(() => assert.deepEqual(chronologicalIds(), buildArchiveTimeline(rows, 'oldest').glyphs.map((row) => row.id)));
  const timelineMembers = [...document.querySelectorAll('[data-archive-timeline] [data-archive-member]')];
  await act(async () => timelineMembers[0].querySelector('button').click());
  await settle();
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('order'), 'oldest'));
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('glyph'), timelineMembers[0].dataset.archiveMember));
  const timelineFocus = timelineMembers[0].dataset.archiveMember;
  const typeId = meanings.interpretations[timelineFocus].meaningKey;
  const expectedPeers = buildArchiveArchetypeFeed(rows, meanings).sections.find((section) => section.id === typeId).glyphs.filter((glyph) => glyph.id !== timelineFocus);
  check(() => assert.deepEqual([...document.querySelectorAll('[data-same-type-glyph]')].map((node) => node.dataset.sameTypeGlyph), expectedPeers.map((glyph) => glyph.id), 'Timeline detail uses exact-type peers too'));
  const sharedRows = [...document.querySelectorAll('[data-shared-meaning]')];
  check(() => assert.equal(sharedRows.length, meanings.interpretations[timelineFocus].observations.length));
  check(() => assert.ok(sharedRows.every((row) => row.querySelectorAll('[data-shared-pattern-glyph]').length === 3), 'Each meaning compares selected glyph and two real peers'));
  check(() => assert.ok([...document.querySelectorAll('[data-fragment-anchor-count]')].every((node) => Number(node.dataset.fragmentAnchorCount) > 0)));
  const nextPeer = document.querySelector('[data-same-type-glyph] button');
  await act(async () => nextPeer.click());
  await settle();
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('glyph'), expectedPeers[0].id));
  check(() => assert.equal(document.querySelector('[data-selected-analysis-toggle]').getAttribute('aria-pressed'), 'false'));
  await act(async () => router.navigate(-1));
  await settle();
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('glyph'), timelineFocus));
  await act(async () => router.navigate(-1));
  await settle();
  check(() => assert.equal(new URLSearchParams(router.state.location.search).get('order'), 'oldest'));
  await act(async () => document.querySelector('[data-archive-back]').click());
  for (let i = 0; i < 20 && !document.querySelector('[data-cluster-id="timeline"]'); i += 1) await settle();
  await settle();
  check(() => assert.equal(document.querySelector('[data-archive-timeline]'), null));
  check(() => assert.ok(document.querySelector('[data-cluster-title]').closest('.archive-cluster-cloud'), 'Cluster title is inside its circle'));
  check(() => assert.equal(requests, 0));
  console.log(`Archive type feed: ${checks} checks passed; centered names, separate detail, live analysis selection, exact-type peers/fragments, focus/Back restore list and scroll. In-memory DOM only.`);
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
