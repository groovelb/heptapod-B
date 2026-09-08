/** In-memory DOM only: no browser engine, remote pages, or network. */
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new Window({ url: 'http://localhost/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
let languages = ['ko-KR', 'en-US'];
Object.defineProperty(dom.navigator, 'languages', { configurable: true, get: () => languages });
dom.document.write('<!doctype html><html><head><meta name="description"><meta property="og:title"><meta property="og:description"></head><body><div id="root"></div></body></html>');
const globals = { window: dom, document: dom.document, navigator: dom.navigator, HTMLElement: dom.HTMLElement,
  Element: dom.Element, Node: dom.Node, DocumentFragment: dom.DocumentFragment, MutationObserver: dom.MutationObserver,
  getComputedStyle: dom.getComputedStyle.bind(dom), requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
  cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom), IS_REACT_ACT_ENVIRONMENT: true };
const original = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement, useEffect, useState, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let root;
let checks = 0;
const check = (run) => { run(); checks += 1; };
try {
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { useI18n } = await server.ssrLoadModule('/src/i18n/useI18n.js');
  const { default: LanguageSwitcher } = await server.ssrLoadModule('/src/components/navigation/LanguageSwitcher.jsx');
  const { LOCALE_STORAGE_KEY } = await server.ssrLoadModule('/src/i18n/locale.js');
  let controls;
  let mounts = 0;
  function Probe() {
    const i18n = useI18n();
    const [name, setName] = useState('도래 Louise');
    useEffect(() => { mounts += 1; }, []);
    controls = { ...i18n, setName };
    return createElement('div', null,
      createElement(LanguageSwitcher),
      createElement('label', null, i18n.t('heptapodEncoderPage.nameToEncode'), createElement('input', { value: name, onChange: (event) => setName(event.target.value) })),
    );
  }
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(createElement(LocaleProvider, null, createElement(Probe))));
  check(() => assert.equal(controls.locale, 'ko'));
  check(() => assert.equal(document.documentElement.lang, 'ko'));
  check(() => assert.ok(document.querySelector('button[aria-label="언어"]')));
  check(() => assert.equal(window.localStorage.getItem(LOCALE_STORAGE_KEY), null));
  const languageButton = document.querySelector('button[aria-label="언어"]');
  languageButton.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 80, bottom: 44, width: 80, height: 44 });
  await act(async () => languageButton.click());
  check(() => assert.equal(document.querySelectorAll('[role="menuitemradio"]').length, 3));
  check(() => assert.equal(document.querySelector('[role="menuitemradio"][aria-checked="true"]').textContent, '시스템 설정'));
  await act(async () => document.querySelector('[role="menuitemradio"][lang="en"]').click());
  check(() => assert.equal(document.documentElement.lang, 'en'));
  check(() => assert.ok(document.querySelector('button[aria-label="Language"]')));
  check(() => assert.match(document.body.textContent, /Name to encode/));
  check(() => assert.equal(document.querySelector('input').value, '도래 Louise'));
  check(() => assert.equal(mounts, 1));
  check(() => assert.equal(window.localStorage.getItem(LOCALE_STORAGE_KEY), 'en'));
  check(() => assert.match(document.querySelector('meta[name="description"]').content, /^Encode your name/));
  languages = ['ko-KR'];
  await act(async () => window.dispatchEvent(new window.Event('languagechange')));
  check(() => assert.equal(controls.locale, 'en'));
  await act(async () => controls.setLanguageMode('system'));
  check(() => assert.equal(controls.locale, 'ko'));
  check(() => assert.equal(window.localStorage.getItem(LOCALE_STORAGE_KEY), null));
  languages = ['fr-FR'];
  await act(async () => window.dispatchEvent(new window.Event('languagechange')));
  check(() => assert.equal(controls.locale, 'en'));
  window.localStorage.setItem(LOCALE_STORAGE_KEY, 'ko');
  await act(async () => window.dispatchEvent(new window.StorageEvent('storage', { key: LOCALE_STORAGE_KEY, newValue: 'ko' })));
  check(() => assert.equal(controls.locale, 'ko'));
  await act(async () => controls.setLanguageMode('en'));
  await act(async () => root.unmount());
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(createElement(LocaleProvider, null, createElement(Probe))));
  check(() => assert.equal(controls.locale, 'en'));
  check(() => assert.equal(mounts, 2));
  const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
  await act(async () => controls.setLanguageMode('ko'));
  check(() => assert.equal(controls.locale, 'ko'));
  if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor);
  else delete window.localStorage;
  await act(async () => root.render(createElement(LocaleProvider, { urlLocale: 'en' }, createElement(Probe))));
  check(() => assert.equal(controls.locale, 'en'));
  check(() => assert.equal(mounts, 2));
  check(() => assert.equal(document.querySelector('input').value, '도래 Louise'));
  await act(async () => controls.setLanguageMode('ko'));
  check(() => assert.equal(controls.locale, 'ko'));
  await act(async () => root.render(createElement(LocaleProvider, { urlLocale: 'ko' }, createElement(Probe))));
  check(() => assert.equal(controls.locale, 'ko'));
  await act(async () => root.render(createElement(LocaleProvider, { urlLocale: 'en' }, createElement(Probe))));
  check(() => assert.equal(controls.locale, 'en'));
  check(() => assert.equal(mounts, 2));
  console.log(`Locale state: ${checks} checks passed; OS changes, saved preference, cross-tab updates, blocked storage, metadata and input preservation. In-memory DOM only.`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close();
  await dom.happyDOM.abort();
  for (const [key, descriptor] of Object.entries(original)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
