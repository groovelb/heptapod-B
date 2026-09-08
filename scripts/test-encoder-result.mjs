/** In-memory DOM only: no browser engine, screenshot, network or real publication. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/', settings: {
  disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true,
} });
// State assertions use Motion's JS fallback; happy-dom's partial native animation
// implementation rejects its finished promise during otherwise valid teardown.
dom.Element.prototype.animate = undefined;
// Reduced motion lets the analysis controls be tested without a real rendering surface.
const matchMedia = dom.matchMedia.bind(dom);
dom.matchMedia = (query) => query === '(prefers-reduced-motion: reduce)'
  ? { matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  : matchMedia(query);
// Drawing calls are no-ops: this checks React state and real model data, not pixels.
dom.HTMLCanvasElement.prototype.getContext = function getContext(type) {
  if (type !== '2d') return null;
  return new Proxy({ canvas: this, createRadialGradient: () => ({ addColorStop() {} }) }, {
    get: (target, key) => key in target ? target[key] : () => {},
  });
};
dom.document.write('<!doctype html><html><body><div id="root"></div></body></html>');
let requests = 0;
const globals = {
  window: dom, document: dom.document, navigator: dom.navigator, location: dom.location,
  HTMLElement: dom.HTMLElement, Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment,
  MutationObserver: dom.MutationObserver, getComputedStyle: dom.getComputedStyle.bind(dom),
  IntersectionObserver: class { constructor(callback) { this.callback = callback; } observe(target) { this.callback([{ target, isIntersecting: true }]); } disconnect() {} },
  ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() { this.callback([{ contentRect: { width: dom.innerWidth, height: dom.innerHeight } }]); } disconnect() {} },
  requestAnimationFrame: dom.requestAnimationFrame.bind(dom), cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom),
  fetch: () => { requests += 1; throw new Error('No network allowed in encoder tests'); }, IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, useLocation, Routes, Route } = await import('react-router-dom');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react()], define: { 'import.meta.env.VITE_MUSIC_AUTOPLAY': '"false"' }, server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root;
let checks = 0;
const check = (run) => { run(); checks += 1; };
const click = async (element) => { assert.ok(element, 'Missing click target'); await act(async () => element.click()); };
const button = (label, scope = document) => [...scope.querySelectorAll('button')].find((item) => item.textContent.trim() === label);
const actions = () => document.querySelector('[data-encoder-actions]');
const dialog = () => document.querySelector('[role="dialog"]');
const input = () => document.querySelector('input:not([type="checkbox"])');
const setName = async (name) => {
  const element = input();
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.HTMLInputElement.prototype, 'value').set.call(element, name);
    element.dispatchEvent(new dom.Event('input', { bubbles: true }));
  });
};
const enter = async (options = {}) => act(async () => input().dispatchEvent(new dom.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, ...options })));

try {
  const { default: Encoder } = await server.ssrLoadModule('/src/components/templates/HeptapodEncoderPage.jsx');
  const { default: PublishDialog } = await server.ssrLoadModule('/src/components/overlay-feedback/PublishDialog.jsx');
  const { default: GlyphDetailPage } = await server.ssrLoadModule('/src/components/templates/GlyphDetailPage.jsx');
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { I18nContext } = await server.ssrLoadModule('/src/i18n/useI18n.js');
  const { createTranslator } = await server.ssrLoadModule('/src/i18n/messages.js');
  const { createArchiveStoryClient, ARCHIVE_STORY_IDS } = await server.ssrLoadModule('/src/test-fixtures/archiveClient.js');
  const { buildArchiveModel } = await server.ssrLoadModule('/src/utils/heptapod/archiveGlyph.js');
  const { interpretGlyphMeaning } = await server.ssrLoadModule('/src/utils/heptapod/interpretGlyphMeaning.js');
  const { getGlyphArchetype } = await server.ssrLoadModule('/src/data/heptapodArchetypeCatalog.js');
  const ko = createTranslator('ko');
  const en = createTranslator('en');
  let currentPath;
  let currentSearch;
  let initialPath = '/';
  let locale = 'ko';
  function RouteProbe() { const location = useLocation(); currentPath = location.pathname; currentSearch = location.search; return null; }
  const tree = (element) => createElement(ThemeProvider, { theme },
    createElement(I18nContext.Provider, { value: { ...createTranslator(locale), languageMode: locale, setLanguageMode() {} } },
      createElement(MemoryRouter, { initialEntries: [initialPath] }, createElement(RouteProbe), element)));
  const mount = async (element) => {
    if (root) await act(async () => root.unmount());
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(tree(element)));
  };
  const client = createArchiveStoryClient();
  const page = createElement(Encoder, { initialName: 'Louise', audioActive: false, client });
  await mount(page);
  check(() => assert.deepEqual(client.calls, [], 'No auth or publishing before consent'));
  check(() => assert.equal(actions().querySelectorAll('button').length, 1));
  check(() => assert.ok(document.querySelector('a[href="/archive"]')));
  check(() => assert.doesNotMatch(document.body.textContent, /SAVE/));
  const overlay = () => document.querySelector('[data-encoder-overlay]');
  const analysis = () => document.querySelector('[data-encoder-analysis]');
  const metadata = () => document.querySelector('[data-encoder-metadata]');
  const heading = () => document.querySelector('[data-encoder-metadata-heading]');
  const readouts = () => Object.fromEntries([...metadata().querySelectorAll('dt')].map((label) => [label.textContent, label.nextElementSibling.textContent]));
  const layoutStyles = () => [overlay(), heading(), metadata(), analysis(), actions()].map((element) => {
    if (!element) return null;
    const style = getComputedStyle(element);
    return Object.fromEntries(['position', 'top', 'right', 'width', 'height', 'display', 'grid-template-rows', 'margin', 'padding'].map((key) => [key, style.getPropertyValue(key)]));
  });
  const louise = buildArchiveModel('Louise');
  const louiseType = getGlyphArchetype(interpretGlyphMeaning(louise));
  check(() => assert.equal(overlay().tagName, 'ASIDE'));
  check(() => assert.equal(metadata().tagName, 'DL'));
  check(() => assert.equal(overlay().querySelectorAll('button, a').length, 3, 'Analysis, publish/share and archive without a cluster action'));
  check(() => assert.equal(overlay().querySelector('[data-meaning-status]'), null));
  check(() => assert.equal(overlay().querySelectorAll('a').length, 1));
  check(() => assert.equal(overlay().querySelector('[data-glyph-cluster-name]').textContent, louiseType.title));
  check(() => assert.equal(overlay().querySelector('[data-glyph-cluster-link]'), null));
  check(() => assert.equal(actions().closest('[data-encoder-overlay]'), overlay(), 'Actions stay in the upper-right overlay'));
  check(() => assert.equal(document.querySelector('[data-encoder-controls]').querySelector('[data-encoder-actions]'), null));
  check(() => assert.deepEqual(Object.keys(readouts()), ['덩어리', '가닥', '무게중심', '링']));
  check(() => assert.equal(readouts()['덩어리'], ko.t('heptapodEncoderPage.count', { p0: louise.clusters.length })));
  check(() => assert.equal(readouts()['가닥'], ko.t('encoder.strandCount', { count: louise.strands.length })));
  check(() => assert.equal(readouts()['무게중심'], '45°'));
  check(() => assert.equal(readouts()['링'], ko.t(louise.gap ? 'heptapodEncoderPage.gap' : 'heptapodEncoderPage.noGap')));
  check(() => assert.equal(getComputedStyle(metadata()).height, '128px'));
  check(() => assert.equal(getComputedStyle(metadata()).gridTemplateRows, 'repeat(4, 32px)'));
  const normalRows = readouts();
  const normalLayout = layoutStyles();
  const normalHeading = heading().textContent;
  const normalNodes = [...metadata().querySelectorAll('dt')];
  const originalActions = actions();
  check(() => assert.equal(analysis().getAttribute('aria-pressed'), 'false'));
  await click(analysis());
  check(() => assert.equal(analysis().getAttribute('aria-pressed'), 'true'));
  check(() => assert.deepEqual(readouts(), normalRows, 'Analysis does not replace summary rows with variable cluster details'));
  check(() => assert.equal(heading().textContent, normalHeading));
  check(() => assert.deepEqual(layoutStyles(), normalLayout, 'Analysis only changes colors, not panel geometry rules'));
  check(() => assert.ok(normalNodes.every((node, index) => node === metadata().querySelectorAll('dt')[index])));
  check(() => assert.equal(actions(), originalActions));
  check(() => assert.equal(dialog(), null));
  const mesh = document.querySelector('[data-encoder-meaning-anchors] .hb-edge');
  check(() => assert.ok(mesh, 'Green analysis lines remain visible'));
  check(() => assert.equal(mesh.parentElement.getAttribute('stroke'), '#3ad16b'));
  check(() => assert.ok(document.querySelector('[data-encoder-meaning-anchors] .hb-vtx'), 'Red analysis vertices remain visible'));
  check(() => assert.match(mesh.getAttribute('style'), /animation-delay/));
  const reading = () => document.querySelector('[data-meaning-reading]');
  const meaningButton = (id) => reading().querySelector(`[data-reading-meaning="${id}"]`);
  const detail = () => reading().querySelector('[data-reading-detail]');
  check(() => assert.equal(getComputedStyle(reading()).display, 'flex'));
  const leftColumn = document.querySelector('[data-encoder-left-column]');
  const rail = document.querySelector('[data-encoder-meaning-rail]');
  check(() => assert.equal(leftColumn.querySelector('header'), null));
  check(() => assert.equal(leftColumn.firstElementChild, rail, 'Reading starts without the removed page title'));
  check(() => assert.equal(getComputedStyle(leftColumn).flexDirection, 'column'));
  check(() => assert.equal(getComputedStyle(rail).position, '', 'The reading rail no longer overlaps the absolutely positioned page title'));
  check(() => assert.equal(getComputedStyle(rail).minHeight, '0'));

  check(() => assert.equal(getComputedStyle(document.querySelector('[data-encoder-meaning-rail]')).overflowY, '', 'Only the inner reading pane owns scrolling'));
  check(() => assert.equal(getComputedStyle(detail()).flexGrow, '1'));
  check(() => assert.equal(getComputedStyle(detail()).minHeight, '0'));
  check(() => assert.equal(getComputedStyle(detail()).backgroundColor, 'transparent'));
  check(() => assert.equal(getComputedStyle(detail()).scrollbarColor, `${theme.palette.text.secondary} transparent`));
  check(() => assert.equal(reading().querySelector('h2').textContent, louiseType.title));
  check(() => assert.equal(reading().dataset.readingArchetype, louiseType.id));
  check(() => assert.equal(detail().firstElementChild.tagName, 'BLOCKQUOTE', 'Quote starts directly below the fixed title'));
  check(() => assert.equal(getComputedStyle(analysis()).minHeight, `${theme.editorial.createCta.minHeight.md}px`));
  check(() => assert.equal(getComputedStyle(actions().querySelector('button')).minHeight, `${theme.editorial.createCta.minHeight.md}px`));
  check(() => assert.equal(reading().querySelectorAll('[data-narrative-field="motto"]').length, 1));
  check(() => assert.equal(reading().querySelector('[data-archetype-narrative]').textContent, louiseType.story));
  check(() => assert.doesNotMatch(reading().textContent, /NFD|정수 →|위치값|radix/));
  check(() => assert.equal(document.querySelector('[data-glyph-observations]'), null));
  const detailHeight = getComputedStyle(detail()).height;
  await act(async () => meaningButton('reciprocity').focus());
  await click(meaningButton('reciprocity'));
  check(() => assert.equal(document.activeElement, meaningButton('reciprocity'), 'Toggling a chip preserves keyboard focus'));
  check(() => assert.match(detail().textContent, /바깥을 향한 초점 1곳과 안쪽을 향한 초점 2곳/));
  check(() => assert.equal(document.querySelectorAll('[data-glyph-observations] g[data-kind="branch"]').length, louise.clusters.length));
  const centralCanvas = document.querySelector('[data-encoder-stage] canvas');
  await click(meaningButton('openness'));
  check(() => assert.equal(document.querySelector('[data-encoder-meaning-anchors] .hb-edge'), mesh, 'Meaning selection must not restart the scan animation'));
  check(() => assert.match(detail().textContent, /3시 방향/));
  check(() => assert.equal(document.querySelectorAll('[data-glyph-observations] g[data-kind="opening"]').length, 1));
  check(() => assert.equal(meaningButton('reciprocity').getAttribute('aria-pressed'), 'true', 'First chip stays on'));
  check(() => assert.equal(meaningButton('openness').getAttribute('aria-pressed'), 'true', 'Second chip is independently on'));
  check(() => assert.equal(meaningButton('openness').tagName, 'BUTTON'));
  check(() => assert.equal(meaningButton('openness').type, 'button'));
  check(() => assert.equal(document.querySelectorAll('[data-glyph-observations] g[data-kind="branch"]').length, louise.clusters.length));
  const numbers = [...document.querySelectorAll('[data-glyph-observations] [data-observation-index]')].map((node) => node.dataset.observationIndex);
  check(() => assert.equal(new Set(numbers).size, numbers.length, 'Combined marker numbers do not collide'));
  check(() => assert.equal(detail().querySelectorAll('[data-reading-selected]').length, 2));
  const describedNumbers = [...detail().querySelectorAll('[data-reading-selected] li')].map((node) => node.textContent.split(' · ')[0]);
  check(() => assert.deepEqual(describedNumbers, numbers, 'Text numbers correspond to all simultaneously visible markers'));
  check(() => assert.equal(document.querySelector('[data-encoder-stage] canvas'), centralCanvas, 'Selection does not remount the central glyph'));
  check(() => assert.equal(getComputedStyle(detail()).height, detailHeight));
  check(() => assert.deepEqual(layoutStyles(), normalLayout));
  await click(meaningButton('openness'));
  check(() => assert.equal(document.querySelector('[data-glyph-observations] g[data-kind="opening"]'), null));
  check(() => assert.equal(meaningButton('reciprocity').getAttribute('aria-pressed'), 'true'));
  check(() => assert.equal(document.querySelectorAll('[data-glyph-observations] g[data-kind="branch"]').length, louise.clusters.length));
  await click(meaningButton('reciprocity'));
  check(() => assert.equal(document.querySelector('[data-glyph-observations]'), null));
  await click(analysis());
  check(() => assert.deepEqual(readouts(), normalRows));
  check(() => assert.deepEqual(layoutStyles(), normalLayout));
  check(() => assert.equal(button(ko.t('resonancePreview.compareAnotherName'), overlay()), undefined));
  check(() => assert.equal(input().value, 'Louise'));
  check(() => assert.equal(input().getAttribute('enterkeyhint'), 'go'));

  await click(button(ko.t('heptapodEncoderPage.publishAndShare'), actions()));
  check(() => assert.match(dialog().textContent, /공유하려면 먼저/));
  check(() => assert.equal(button(ko.t('publishDialog.publish'), dialog()).disabled, true));
  await click(button(ko.t('publishDialog.cancel'), dialog()));
  check(() => assert.equal(input().value, 'Louise'));
  check(() => assert.deepEqual(client.calls, []));

  await click(button(ko.t('heptapodEncoderPage.publishAndShare'), actions()));
  await click(dialog().querySelector('input[type="checkbox"]'));
  const publishButton = button(ko.t('publishDialog.publish'), dialog());
  await act(async () => { publishButton.click(); publishButton.click(); });
  check(() => assert.equal(client.calls.filter((call) => call === 'archive-publish').length, 1));
  check(() => assert.match(dialog().textContent, /이제 링크를 공유/));
  check(() => assert.equal(actions().dataset.encoderPublished, 'true'));
  check(() => assert.ok(button(ko.t('encoderResult.share'), actions())));
  check(() => assert.equal(currentPath, '/', 'Publish remains on the encoder'));
  check(() => assert.ok(dialog().querySelector('[data-publish-open]')));
  const savedUrl = `http://localhost/glyph/${ARCHIVE_STORY_IDS.left}?lang=ko`;
  check(() => assert.equal(dialog().querySelector('#archive-published-url').value, savedUrl));
  check(() => assert.match(dialog().textContent, /다시 방문하려면 이 링크를 저장/));
  let nativeCopyCalls = 0;
  Object.defineProperty(dom.navigator, 'share', { configurable: true, value: async () => { nativeCopyCalls += 1; } });
  Object.defineProperty(dom.navigator, 'clipboard', { configurable: true, value: undefined });
  await click(dialog().querySelector('[data-publish-copy]'));
  const selectedUrl = dialog().querySelector('#archive-published-url');
  check(() => assert.equal(document.activeElement, selectedUrl));
  check(() => assert.equal(selectedUrl.selectionStart, 0));
  check(() => assert.equal(selectedUrl.selectionEnd, savedUrl.length));
  check(() => assert.match(dialog().querySelector('#archive-published-copy-status').textContent, /직접 복사/));
  let directlyCopied;
  Object.defineProperty(dom.navigator, 'clipboard', { configurable: true, value: { writeText: async (url) => { directlyCopied = url; } } });
  await click(dialog().querySelector('[data-publish-copy]'));
  check(() => assert.equal(directlyCopied, savedUrl));
  check(() => assert.equal(nativeCopyCalls, 0, 'Copy must not open native share even when it is available'));
  check(() => assert.equal(client.calls.filter((call) => call === 'archive-publish').length, 1));

  Object.defineProperty(dom.navigator, 'share', { configurable: true, value: undefined });
  let socialCopies = 0;
  Object.defineProperty(dom.navigator, 'clipboard', { configurable: true, value: { writeText: async () => { socialCopies += 1; } } });
  check(() => assert.deepEqual([...dialog().querySelectorAll('[data-social-network]')].map((node) => node.textContent), ['X', 'Threads', 'Facebook']));
  check(() => assert.equal(dialog().querySelector('[data-publish-native-share]'), null));
  check(() => assert.equal(socialCopies, 0));
  check(() => assert.equal(dialog().querySelector('[data-glyph-cluster-name]').textContent, louiseType.title));
  check(() => assert.equal(dialog().querySelector('[data-glyph-cluster-link]'), null, 'Create sharing does not add a cluster action'));
  check(() => assert.equal(new URL(dialog().querySelector('[data-social-network="x"]').href).searchParams.get('url'), savedUrl));
  check(() => assert.equal(button(ko.t('publishDialog.publish'), dialog()), undefined));
  check(() => assert.equal(client.calls.filter((call) => call === 'archive-publish').length, 1));
  let copied;
  Object.defineProperty(dom.navigator, 'clipboard', { configurable: true, value: { writeText: async (url) => { copied = url; } } });
  await click(dialog().querySelector('[data-publish-copy]'));
  check(() => assert.match(dialog().textContent, /링크를 복사했어요/));
  check(() => assert.ok(copied.endsWith(`/glyph/${ARCHIVE_STORY_IDS.left}?lang=ko`)));
  check(() => assert.doesNotMatch(copied, /Louise|name=/));
  await click(button(ko.t('publishDialog.close'), dialog()));
  check(() => assert.equal(document.querySelector('[role="status"]').textContent, ''));
  check(() => assert.equal(currentPath, '/'));

  locale = 'en';
  await act(async () => root.render(tree(page)));
  check(() => assert.equal(input().value, 'Louise'));
  check(() => assert.equal(actions().dataset.encoderPublished, 'true'));
  check(() => assert.ok(button(en.t('encoderResult.share'), actions())));
  check(() => assert.equal(document.querySelector('[role="status"]').textContent, ''));
  const englishRows = readouts();
  const englishLayout = layoutStyles();
  await click(analysis());
  check(() => assert.deepEqual(readouts(), englishRows));
  check(() => assert.deepEqual(layoutStyles(), englishLayout));
  check(() => assert.equal(readouts()[en.t('heptapodEncoderPage.clusters')], en.t('heptapodEncoderPage.count', { p0: louise.clusters.length })));
  check(() => assert.doesNotMatch(overlay().textContent, /가시|덩어리|무게중심|가닥/));
  await click(analysis());
  check(() => assert.equal(input().value, 'Louise', 'Locale changes do not translate the name'));
  let nativeShares = 0;
  Object.defineProperty(dom.navigator, 'share', { configurable: true, value: async () => { nativeShares += 1; throw new Error('OS share must not open'); } });
  await click(button(en.t('encoderResult.share'), actions()));
  check(() => assert.ok(dialog().querySelector('[data-publish-complete]')));
  check(() => assert.equal(dialog().querySelectorAll('[data-social-network]').length, 3));
  const socialX = new URL(dialog().querySelector('[data-social-network="x"]').href);
  check(() => assert.ok(socialX.searchParams.get('url').endsWith(`/glyph/${ARCHIVE_STORY_IDS.left}?lang=en`)));
  check(() => assert.equal(socialX.searchParams.get('text'), `Louise · ${en.localize(louiseType.title)}\n${en.localize(louiseType.reading)}`));
  check(() => assert.equal(dialog().querySelector('[data-publish-native-share]'), null));
  check(() => assert.equal(nativeShares, 0));
  check(() => assert.equal(client.calls.filter((call) => call === 'archive-publish').length, 1));
  await click(button(en.t('publishDialog.close'), dialog()));
  await click(document.querySelector('[data-encoder-public-link]'));
  check(() => assert.ok(dialog().querySelector('[data-publish-complete]')));
  check(() => assert.equal(dialog().querySelector('input[type="checkbox"]'), null));
  check(() => assert.equal(dialog().querySelector('#archive-published-url').value, savedUrl.replace('lang=ko', 'lang=en')));
  check(() => assert.equal(dialog().querySelectorAll('[data-social-network]').length, 3));
  check(() => assert.equal(nativeShares, 0));
  await click(button(en.t('publishDialog.close'), dialog()));

  await setName('민준');
  check(() => assert.equal(button(en.t('encoderResult.share'), actions()).disabled, true));
  await enter({ isComposing: true });
  check(() => assert.equal(actions().dataset.encoderPublished, 'true', 'IME confirmation does not encode early'));
  await enter();
  check(() => assert.equal(actions().dataset.encoderPublished, 'false'));
  check(() => assert.equal(button(en.t('heptapodEncoderPage.publishAndShare'), actions()).disabled, false));
  await setName(' ');
  await enter();
  check(() => assert.equal(button(en.t('heptapodEncoderPage.publishAndShare'), actions()).disabled, true));

  locale = 'ko';
  const failureClient = createArchiveStoryClient({ failures: { 'archive-publish': 'Local publication failure' } });
  await mount(createElement(Encoder, { initialName: 'Hannah', audioActive: false, client: failureClient }));
  await click(button(ko.t('heptapodEncoderPage.publishAndShare'), actions()));
  check(() => assert.match(dialog().textContent, /공유하려면 먼저/));
  await click(dialog().querySelector('input[type="checkbox"]'));
  await click(button(ko.t('publishDialog.publish'), dialog()));
  check(() => assert.match(dialog().textContent, /Local publication failure/));
  check(() => assert.equal(input().value, 'Hannah'));
  await click(button(ko.t('publishDialog.cancel'), dialog()));
  check(() => assert.equal(button(ko.t('heptapodEncoderPage.publishAndShare'), actions()).disabled, false));

  dom.location.href = 'http://localhost/?name=Louise';
  await mount(createElement(Encoder, { audioActive: false, client }));
  check(() => assert.equal(document.querySelector('[data-encoder-version]').dataset.encoderVersion, '1'));
  check(() => assert.equal(button(ko.t('encoderResult.share'), actions()), undefined));
  await click(button(ko.t('encoderResult.recreate'), actions()));
  check(() => assert.equal(document.querySelector('[data-encoder-version]').dataset.encoderVersion, '2'));
  check(() => assert.equal(button(ko.t('heptapodEncoderPage.publishAndShare'), actions()).disabled, false));

  // Different cluster counts, question forms and non-reversible models keep four rows.
  const clusterCounts = new Set();
  for (const sample of ['A', 'Louise?', 'Hannah', 'Alexandria Alexandria Alexandria']) {
    const sampleModel = buildArchiveModel(sample);
    clusterCounts.add(sampleModel.clusters.length);
    await mount(createElement(Encoder, { initialName: sample, audioActive: false, client }));
    const beforeRows = readouts();
    const beforeLayout = layoutStyles();
    check(() => assert.equal(Object.keys(beforeRows).length, 4));
    check(() => assert.equal(beforeRows['덩어리'], ko.t('heptapodEncoderPage.count', { p0: sampleModel.clusters.length })));
    check(() => assert.equal(getComputedStyle(metadata()).height, '128px'));
    await click(analysis());
    check(() => assert.deepEqual(readouts(), beforeRows));
    check(() => assert.deepEqual(layoutStyles(), beforeLayout));
  }
  check(() => assert.ok(clusterCounts.size > 1, 'Exercise variable cluster counts'));

  // Mobile shows only Analysis and publish/share; the detailed reading stays intact.
  await act(async () => dom.happyDOM.setViewport({ width: 390, height: 844 }));
  await mount(page);
  const mobileLayout = layoutStyles();
  check(() => assert.equal(overlay().querySelectorAll('button, a').length, 2));
  check(() => assert.equal(metadata(), null));
  check(() => assert.equal(heading(), null));
  check(() => assert.equal(overlay().querySelectorAll('a').length, 0));
  check(() => assert.equal(overlay().querySelector('[data-glyph-cluster-name]'), null));
  await click(analysis());
  check(() => assert.equal(analysis().getAttribute('aria-pressed'), 'true'));
  check(() => assert.equal(dialog(), null));
  const mobileReading = () => document.querySelector('[data-encoder-mobile-reading]');
  const mobileAnchors = () => document.querySelector('[data-encoder-meaning-anchors]');
  check(() => assert.match(mobileReading().textContent, /Archive의 공통 언어/));
  check(() => assert.equal(mobileReading().querySelector('[data-reading-archetype]').dataset.readingArchetype, louiseType.id));
  check(() => assert.ok(mobileAnchors().querySelector('.hb-edge')));
  check(() => assert.ok(mobileAnchors().querySelector('.hb-vtx')));
  await click(meaningButton('reciprocity'));
  check(() => assert.match(mobileReading().textContent, /바깥을 향한 초점 1곳과 안쪽을 향한 초점 2곳/));
  check(() => assert.equal(mobileAnchors().querySelectorAll('[data-kind="branch"]').length, 3));
  await click(meaningButton('openness'));
  check(() => assert.equal(mobileReading().querySelectorAll('[data-reading-meaning][aria-pressed="true"]').length, 2));
  check(() => assert.equal(mobileAnchors().querySelectorAll('[data-kind="branch"]').length, 3));
  check(() => assert.equal(mobileAnchors().querySelectorAll('[data-kind="opening"]').length, 1));
  await click(meaningButton('reciprocity'));
  check(() => assert.equal(mobileAnchors().querySelectorAll('[data-kind="branch"]').length, 0));
  check(() => assert.equal(mobileAnchors().querySelectorAll('[data-kind="opening"]').length, 1));
  check(() => assert.doesNotMatch(mobileReading().textContent, /문자 단위 분할|정수 → 형태/));
  check(() => assert.deepEqual(layoutStyles(), mobileLayout));
  await click(analysis());
  await act(async () => new Promise((resolve) => setTimeout(resolve, 250)));
  check(() => assert.equal(dialog(), null));
  check(() => assert.equal(analysis().getAttribute('aria-pressed'), 'false'));
  check(() => assert.deepEqual(layoutStyles(), mobileLayout));
  await act(async () => dom.happyDOM.setViewport({ width: 1024, height: 768 }));

  // Default dialog consumer still receives onPublished only on its view action.
  let viewed = null;
  await mount(createElement(PublishDialog, { open: true, onClose() {}, glyphName: 'Louise', model: buildArchiveModel('Louise'),
    onPublish: async () => ({ glyphId: ARCHIVE_STORY_IDS.left }), onPublished: (result) => { viewed = result; } }));
  await click(dialog().querySelector('input[type="checkbox"]'));
  await click(button(ko.t('publishDialog.publish'), dialog()));
  check(() => assert.equal(viewed, null));
  await click(dialog().querySelector('[data-publish-open]'));
  check(() => assert.equal(viewed.glyphId, ARCHIVE_STORY_IDS.left));

  await mount(createElement(PublishDialog, { open: true, onClose() {}, glyphName: 'Louise', completion: 'stay',
    publishedResult: { glyphId: ARCHIVE_STORY_IDS.left }, onPublish: () => { throw new Error('Reopening must not publish'); } }));
  await click(dialog().querySelector('[data-publish-open]'));
  check(() => assert.equal(currentPath, `/glyph/${ARCHIVE_STORY_IDS.left}`, 'Open page works even for the stay completion mode'));

  initialPath = `/glyph/${ARCHIVE_STORY_IDS.left}`;
  // Membership/routing do not need a drawing surface in the public detail page.
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  await mount(createElement(Routes, null,
    createElement(Route, { path: '/glyph/:id', element: createElement(GlyphDetailPage, { client: createArchiveStoryClient() }) }),
    createElement(Route, { path: '/archive', element: createElement('div', null, 'Archive destination') })));
  const waitForDetail = async (name = 'louise') => {
    for (let i = 0; i < 100 && document.querySelector('[data-selected-glyph-detail] h1')?.textContent !== name; i += 1) {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
    }
    assert.equal(document.querySelector('[data-selected-glyph-detail] h1')?.textContent, name);
  };
  await waitForDetail();
  const selectedDetail = () => document.querySelector('[data-selected-glyph-detail]');
  const detailChip = (id) => selectedDetail().querySelector(`[data-reading-meaning="${id}"]`);
  const snapshot = () => ({
    heading: selectedDetail().querySelector('[data-archive-detail-heading]').textContent,
    name: selectedDetail().querySelector('h1').textContent,
    reading: selectedDetail().querySelector('[data-archive-reading-column]').textContent,
    controls: selectedDetail().querySelector('[data-archive-figure-controls]').textContent,
    peers: [...selectedDetail().querySelectorAll('[data-same-type-glyph]')].map((node) => node.textContent).sort(),
    columns: getComputedStyle(selectedDetail().querySelector('[data-archive-detail-layout]')).gridTemplateColumns,
  });
  const publicSnapshot = snapshot();
  check(() => assert.equal(selectedDetail().querySelector('[data-archive-detail-heading] h2').textContent, louiseType.title));
  check(() => assert.equal(document.querySelector('[data-archive-list-view]'), null, 'Independent detail never mounts the hidden archive feed'));
  check(() => assert.ok(selectedDetail().querySelector('[data-archetype-narrative]')));
  await click(detailChip('reciprocity'));
  await click(detailChip('openness'));
  check(() => assert.equal(selectedDetail().querySelectorAll('[data-reading-meaning][aria-pressed="true"]').length, 2, 'Shared Archive controls support simultaneous observations'));
  check(() => assert.ok(selectedDetail().querySelector('[data-archive-sticky-figure] [data-glyph-observations] g[data-kind="branch"]')));
  check(() => assert.ok(selectedDetail().querySelector('[data-archive-sticky-figure] [data-glyph-observations] g[data-kind="opening"]')));
  await click(detailChip('reciprocity'));
  check(() => assert.equal(detailChip('openness').getAttribute('aria-pressed'), 'true'));
  check(() => assert.equal(selectedDetail().querySelector('[data-archive-sticky-figure] [data-glyph-observations] g[data-kind="branch"]'), null));
  const detailAnalysis = selectedDetail().querySelector('[data-selected-analysis-toggle]');
  await click(detailAnalysis);
  check(() => assert.equal(detailAnalysis.getAttribute('aria-pressed'), 'true'));
  check(() => assert.ok(selectedDetail().querySelector('[data-glyph-analysis="on"]')));
  await click(document.querySelector('[data-archive-navigation] button[title]'));
  check(() => assert.ok(dialog().querySelector('input').value.includes(`/glyph/${ARCHIVE_STORY_IDS.left}`), 'Standalone sharing retains the public glyph UUID'));
  await click(dialog().querySelector('[data-social-close]'));
  const peer = selectedDetail().querySelector('[data-same-type-glyph]');
  assert.ok(peer, 'Real same-type peer is available');
  const peerId = peer.dataset.sameTypeGlyph;
  const peerName = peer.querySelector('[data-glyph-centered-name]').textContent;
  await click(peer.querySelector('button'));
  await waitForDetail(peerName);
  check(() => assert.equal(currentPath, `/glyph/${peerId}`));
  check(() => assert.equal(selectedDetail().querySelector('[data-selected-analysis-toggle]').getAttribute('aria-pressed'), 'false', 'A new UUID resets analysis'));
  check(() => assert.equal(selectedDetail().querySelectorAll('[data-reading-meaning][aria-pressed="true"]').length, 0, 'A new UUID resets observation selection'));
  await click(document.querySelector('[data-archive-back]'));
  check(() => assert.equal(currentPath, '/archive'));

  // Compare the actual Archive route's detail against the independent public route.
  const { default: MyArchivePage } = await server.ssrLoadModule('/src/components/templates/MyArchivePage.jsx');
  const { archiveDepthPath } = await server.ssrLoadModule('/src/utils/heptapod/shareArchive.js');
  initialPath = archiveDepthPath({}, ARCHIVE_STORY_IDS.left);
  await mount(createElement(MyArchivePage, { client: createArchiveStoryClient(), musicAutoplay: false }));
  await waitForDetail();
  check(() => assert.deepEqual(snapshot(), publicSnapshot, 'Public detail and Archive detail share heading, name, narrative, controls, peers and grid columns'));

  initialPath = `/glyph/${ARCHIVE_STORY_IDS.left}?reading=meaning&mv=999`;
  await mount(createElement(Routes, null, createElement(Route, { path: '/glyph/:id', element: createElement(GlyphDetailPage, { client: createArchiveStoryClient() }) })));
  await waitForDetail();
  check(() => assert.ok(document.querySelector('[role="alert"]'), 'Unsupported meaning version keeps its notice'));
  check(() => assert.equal(selectedDetail().querySelectorAll('[data-reading-meaning]').length, 0, 'Unsupported meaning version never exposes current interpretation controls'));
  check(() => assert.equal(selectedDetail().querySelector('[data-archetype-narrative]'), null, 'Unsupported version does not silently use current narrative'));

  initialPath = `/glyph/${ARCHIVE_STORY_IDS.hidden}`;
  await mount(createElement(Routes, null, createElement(Route, { path: '/glyph/:id', element: createElement(GlyphDetailPage, { client: createArchiveStoryClient() }) })));
  for (let i = 0; i < 100 && !document.querySelector('main h1'); i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
  check(() => assert.equal(selectedDetail(), null, 'Private glyph cannot be exposed by the archive sample'));
  check(() => assert.equal(document.querySelector('main h1')?.textContent, ko.t('glyphDetailPage.signalNotFound')));

  const source = await readFile(new URL('../src/components/templates/HeptapodEncoderPage.jsx', import.meta.url), 'utf8');
  check(() => assert.match(source, /data-encoder-overlay[\s\S]*?position: 'absolute',[\s\S]*?top: \{ xs: 'calc\(120px \+ env\(safe-area-inset-top, 0px\)\)', md: 'calc\(100px \+ env\(safe-area-inset-top, 0px\)\)' \},[\s\S]*?right: \{ xs: 16, md: 36 \}/));
  check(() => assert.match(source, /<TierRenderer\s+model=\{ model \}/));
  check(() => assert.match(source, /observer\.disconnect\(\)/));
  check(() => assert.doesNotMatch(source, /exportLogogramPng|handleSavePng/));
  check(() => assert.match(source, /<GlyphObservationOverlay model=\{ model \}/));
  check(() => assert.match(source, /<AnalysisOverlay model=\{ model \}/));
  check(() => assert.match(source, /onScan=\{ \(info\) => audioRef.current\?\.scanBeeps/));
  check(() => assert.doesNotMatch(source, /GlyphCallouts|StepRow|StepCard|\binspect\b|rawData/));
  check(() => assert.match(source, /disabled=\{ isForming \}/));
  check(() => assert.match(source, /<TypingPreview text=\{ name \}/));
  check(() => assert.match(source, /<ChildGrid/));
  check(() => assert.doesNotMatch(source, /ResonancePreview/));
  check(() => assert.doesNotMatch(source, /\bshowForm\b|\bformRows\b|\bpanelRows\b/));
  check(() => assert.equal(requests, 0));
  check(() => assert.equal(document.querySelector('script[src*="youtube"]'), null));
  console.log(`Encoder result: ${checks} checks passed; fixed overlay, meaning selection and anchors, mobile reading, input/IME, publish consent, retry, UUID sharing, locale, legacy and dialog compatibility. In-memory DOM only.`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close();
  await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
