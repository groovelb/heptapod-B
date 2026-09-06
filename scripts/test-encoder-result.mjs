/** In-memory DOM only: no browser engine, screenshot, network or real publication. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/', settings: {
  disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true,
} });
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
  requestAnimationFrame: dom.requestAnimationFrame.bind(dom), cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom),
  fetch: () => { requests += 1; throw new Error('No network allowed in encoder tests'); }, IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, useLocation } = await import('react-router-dom');
const { ThemeProvider } = await import('@mui/material/styles');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
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
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { I18nContext } = await server.ssrLoadModule('/src/i18n/useI18n.js');
  const { createTranslator } = await server.ssrLoadModule('/src/i18n/messages.js');
  const { createArchiveStoryClient, ARCHIVE_STORY_IDS } = await server.ssrLoadModule('/src/test-fixtures/archiveClient.js');
  const { buildArchiveModel } = await server.ssrLoadModule('/src/utils/heptapod/archiveGlyph.js');
  const ko = createTranslator('ko');
  const en = createTranslator('en');
  let currentPath;
  let locale = 'ko';
  function RouteProbe() { currentPath = useLocation().pathname; return null; }
  const tree = (element) => createElement(ThemeProvider, { theme },
    createElement(I18nContext.Provider, { value: { ...createTranslator(locale), languageMode: locale, setLanguageMode() {} } },
      createElement(MemoryRouter, null, createElement(RouteProbe), element)));
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
    const style = getComputedStyle(element);
    return Object.fromEntries(['position', 'top', 'right', 'width', 'height', 'display', 'grid-template-rows', 'margin', 'padding'].map((key) => [key, style.getPropertyValue(key)]));
  });
  const louise = buildArchiveModel('Louise');
  check(() => assert.equal(overlay().tagName, 'ASIDE'));
  check(() => assert.equal(metadata().tagName, 'DL'));
  check(() => assert.equal(overlay().querySelectorAll('button, a').length, 3, 'Only analysis, publish/share and archive remain'));
  check(() => assert.equal(overlay().querySelector('[data-meaning-status]'), null));
  check(() => assert.equal(overlay().querySelectorAll('a').length, 1));
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
  check(() => assert.equal(button(ko.t('publishDialog.viewInArchive'), dialog()), undefined));

  Object.defineProperty(dom.navigator, 'share', { configurable: true, value: undefined });
  Object.defineProperty(dom.navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Local share failure'); } } });
  await click(button(ko.t('encoderResult.share'), dialog()));
  check(() => assert.match(dialog().textContent, /Local share failure/));
  check(() => assert.equal(button(ko.t('publishDialog.publish'), dialog()), undefined));
  check(() => assert.equal(client.calls.filter((call) => call === 'archive-publish').length, 1));
  let copied;
  Object.defineProperty(dom.navigator, 'clipboard', { configurable: true, value: { writeText: async (url) => { copied = url; } } });
  await click(button(ko.t('encoderResult.share'), dialog()));
  check(() => assert.match(dialog().textContent, /링크를 복사했어요/));
  check(() => assert.ok(copied.endsWith(`/glyph/${ARCHIVE_STORY_IDS.left}`)));
  check(() => assert.doesNotMatch(copied, /Louise|name=/));
  await click(button(ko.t('publishDialog.close'), dialog()));
  check(() => assert.match(document.querySelector('[role="status"]').textContent, /링크를 복사했어요/));
  check(() => assert.equal(currentPath, '/'));

  locale = 'en';
  await act(async () => root.render(tree(page)));
  check(() => assert.equal(input().value, 'Louise'));
  check(() => assert.equal(actions().dataset.encoderPublished, 'true'));
  check(() => assert.ok(button(en.t('encoderResult.share'), actions())));
  check(() => assert.match(document.querySelector('[role="status"]').textContent, /Link copied/));
  const englishRows = readouts();
  const englishLayout = layoutStyles();
  await click(analysis());
  check(() => assert.deepEqual(readouts(), englishRows));
  check(() => assert.deepEqual(layoutStyles(), englishLayout));
  check(() => assert.equal(readouts()[en.t('heptapodEncoderPage.clusters')], en.t('heptapodEncoderPage.count', { p0: louise.clusters.length })));
  check(() => assert.doesNotMatch(overlay().textContent, /가시|덩어리|무게중심|가닥/));
  await click(analysis());
  check(() => assert.equal(input().value, 'Louise', 'Locale changes do not translate the name'));
  let sharePayload;
  Object.defineProperty(dom.navigator, 'share', { configurable: true, value: async (payload) => { sharePayload = payload; } });
  await click(button(en.t('encoderResult.share'), actions()));
  check(() => assert.match(document.querySelector('[role="status"]').textContent, /Glyph shared/));
  check(() => assert.ok(sharePayload.url.endsWith(`/glyph/${ARCHIVE_STORY_IDS.left}`)));
  Object.defineProperty(dom.navigator, 'share', { configurable: true, value: async () => { const error = new Error('Cancel'); error.name = 'AbortError'; throw error; } });
  await click(button(en.t('encoderResult.share'), actions()));
  check(() => assert.match(document.querySelector('[role="status"]').textContent, /Sharing cancelled/));
  check(() => assert.equal(client.calls.filter((call) => call === 'archive-publish').length, 1));

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

  // Same three controls on mobile; Analysis opens the existing detailed reading.
  await act(async () => dom.happyDOM.setViewport({ width: 390, height: 844 }));
  await mount(page);
  const mobileLayout = layoutStyles();
  check(() => assert.equal(overlay().querySelectorAll('button, a').length, 3));
  check(() => assert.equal(getComputedStyle(metadata()).height, '128px'));
  await click(analysis());
  check(() => assert.equal(analysis().getAttribute('aria-pressed'), 'true'));
  check(() => assert.match(dialog().textContent, /문자 단위 분할.*위치값 진법 합산.*정수 → 형태 파라미터/));
  check(() => assert.match(dialog().textContent, /형태를 거꾸로 읽으면 다시 "louise"/));
  check(() => assert.deepEqual(layoutStyles(), mobileLayout));
  await click(button(ko.t('heptapodEncoderPage.close'), dialog()));
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
  await click(button(ko.t('publishDialog.viewInArchive'), dialog()));
  check(() => assert.equal(viewed.glyphId, ARCHIVE_STORY_IDS.left));

  const source = await readFile(new URL('../src/components/templates/HeptapodEncoderPage.jsx', import.meta.url), 'utf8');
  check(() => assert.match(source, /data-encoder-overlay[\s\S]*?position: 'absolute',[\s\S]*?top: \{ xs: 84, md: 84 \},[\s\S]*?right: \{ xs: 16, md: 36 \}/));
  check(() => assert.match(source, /<LogogramRendererCanvas model=\{ model \}/));
  check(() => assert.match(source, /observer\.disconnect\(\)/));
  check(() => assert.doesNotMatch(source, /exportLogogramPng|handleSavePng/));
  check(() => assert.match(source, /<AnalysisOverlay[\s\S]*?isVisible=\{ analysisActive \}/));
  check(() => assert.match(source, /<GlyphCallouts model=\{ model \}/));
  check(() => assert.match(source, /disabled=\{ isForming \}/));
  check(() => assert.match(source, /<TypingPreview text=\{ name \}/));
  check(() => assert.match(source, /<ChildGrid/));
  check(() => assert.doesNotMatch(source, /ResonancePreview/));
  check(() => assert.doesNotMatch(source, /\bshowForm\b|\bformRows\b|\bpanelRows\b/));
  check(() => assert.equal(requests, 0));
  check(() => assert.equal(document.querySelector('script[src*="youtube"]'), null));
  console.log(`Encoder result: ${checks} checks passed; overlay metadata/analysis/raw data, SAVE removal, input/IME, publish consent, failure/retry, share intent/status/UUID, locale state, legacy V2 and dialog compatibility. In-memory DOM only.`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close();
  await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
