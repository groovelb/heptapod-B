/** Browser-free locale contracts and server-rendered application coverage. */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ThemeProvider } from '@mui/material/styles';
import { messages, createTranslator, sourceText, localizeMessage } from '../src/i18n/messages.js';
import { detectSystemLocale, readLanguageMode, saveLanguageMode, LOCALE_STORAGE_KEY } from '../src/i18n/locale.js';
import { ARCHIVE_STORY_GLYPHS } from '../src/test-fixtures/archiveClient.js';
import { interpretGlyphMeaning } from '../src/utils/heptapod/interpretGlyphMeaning.js';
import { shareArchive } from '../src/utils/heptapod/shareArchive.js';

let checks = 0;
const check = (run) => { run(); checks += 1; };
const placeholders = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
check(() => assert.deepEqual(Object.keys(messages.ko).sort(), Object.keys(messages.en).sort()));
for (const key of Object.keys(messages.ko)) {
  check(() => assert.deepEqual(placeholders(messages.ko[key]), placeholders(messages.en[key]), key));
  if (key !== 'locale.ko') check(() => assert.doesNotMatch(messages.en[key], /[가-힣]/, key));
}
for (const [navigator, expected] of [
  [{ languages: ['ko-KR', 'en-US'] }, 'ko'], [{ language: 'ko' }, 'ko'],
  [{ language: 'KO_kr' }, 'ko'], [{ languages: ['en-GB', 'ko-KR'] }, 'en'],
  [{ languages: ['fr-FR', 'ko-KR'] }, 'en'], [{ language: 'ja-JP' }, 'en'], [{}, 'en'],
]) check(() => assert.equal(detectSystemLocale(navigator), expected));
const values = new Map();
const storage = { localStorage: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) } };
check(() => assert.equal(readLanguageMode(storage), 'system'));
saveLanguageMode('en', storage);
check(() => assert.equal(readLanguageMode(storage), 'en'));
saveLanguageMode('ko', storage);
check(() => assert.equal(readLanguageMode(storage), 'ko'));
saveLanguageMode('system', storage);
check(() => assert.equal(readLanguageMode(storage), 'system'));
values.set(LOCALE_STORAGE_KEY, 'invalid');
check(() => assert.equal(readLanguageMode(storage), 'system'));
const blocked = { get localStorage() { throw new Error('blocked'); } };
check(() => assert.equal(readLanguageMode(blocked), 'system'));
check(() => assert.doesNotThrow(() => saveLanguageMode('en', blocked)));
const en = createTranslator('en');
const userName = '도래'; // A real name can be identical to a translated catalog label.
check(() => assert.equal(en.t('publishDialog.published', { p0: userName }), '“도래” published'));
const koNotice = sourceText('publishDialog.published', { p0: userName });
check(() => assert.equal(localizeMessage(koNotice, 'en'), '“도래” published'));
check(() => assert.equal(localizeMessage('Unknown server diagnostic', 'en'), 'Unknown server diagnostic'));
for (const glyph of ARCHIVE_STORY_GLYPHS.filter((glyph) => glyph.is_public)) {
  const interpretation = interpretGlyphMeaning(glyph.model_data);
  const before = JSON.stringify(interpretation);
  for (const text of [interpretation.title, interpretation.reading, ...interpretation.observations.map((observation) => observation.reason)]) {
    check(() => assert.doesNotMatch(en.localize(text), /[가-힣]/, text));
  }
  check(() => assert.equal(JSON.stringify(interpretation), before));
}
let shared;
const left = { ...ARCHIVE_STORY_GLYPHS.find((glyph) => glyph.is_public), canonical_name: userName, is_interrogative: false };
await shareArchive({ left }, { locale: 'en', origin: 'https://example.test', navigator: { share: async (data) => { shared = data; } } });
check(() => assert.match(shared.title, /도래/));
check(() => assert.equal(shared.text, 'Will your name connect too?'));

const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
try {
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const knownNames = [...new Set(ARCHIVE_STORY_GLYPHS.flatMap((glyph) => [glyph.canonical_name, glyph.display_name]).filter(Boolean))].sort((a, b) => b.length - a.length);
  const paths = [
    'data-display/ArchiveClusterExplorer', 'data-display/ArchiveDepthExplorer', 'data-display/ArchiveFamilySymbol', 'data-display/ArchiveArchetypeFeed',
    'data-display/ArchiveMeaningExplorer', 'data-display/GlyphMeaningSummary', 'data-display/GlyphPairComparison',
    'data-display/ResonanceList', 'data-display/ResonanceMap', 'data-display/ResonancePreview',
    'templates/MyArchivePage', 'templates/ArchiveComparePage',
    'templates/GlyphDetailPage', 'templates/ResonanceFieldPage',
  ];
  for (const path of paths) {
    const module = await server.ssrLoadModule(`/src/components/${path}.stories.jsx`);
    const meta = module.default;
    for (const variant of ['Default', 'Docs', 'InsideFamily', 'Reading', 'Partial', 'Selected', 'Empty', 'Loading']) {
      const story = module[variant];
      if (!story) continue;
      let element = createElement(story.render || meta.component, { ...meta.args, ...story.args });
      for (const decorate of [...(meta.decorators || []), ...(story.decorators || [])].reverse()) {
        const child = element;
        element = decorate(() => child, { parameters: { ...meta.parameters, ...story.parameters } });
      }
      const html = renderToStaticMarkup(createElement(LocaleProvider, { initialMode: 'en', syncDocument: false },
        createElement(ThemeProvider, { theme }, element)));
      let content = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
      const storyNames = [];
      const visited = new WeakSet();
      const collectNames = (value) => {
        if (!value || typeof value !== 'object' || visited.has(value)) return;
        visited.add(value);
        for (const [key, part] of Object.entries(value)) {
          if (/^(name|canonicalName|canonical_name|display_name|primaryName|centerName|neighborName|glyphName)$/.test(key) && typeof part === 'string') storyNames.push(part);
          else collectNames(part);
        }
      };
      collectNames(meta.args); collectNames(story.args);
      for (const name of [...knownNames, ...storyNames].sort((a, b) => b.length - a.length)) content = content.replaceAll(name, 'NAME');
      const hangul = content.match(/[^<>]*[가-힣][^<>]*/g);
      check(() => assert.equal(hangul, null, `${path}/${variant}: ${hangul?.join('\n')}`));
    }
  }
  const { MemoryRouter } = await import('react-router-dom');
  for (const path of ['templates/HeptapodEncoderPage', 'templates/HeptapodHeroIntro']) {
    const { default: Component } = await server.ssrLoadModule(`/src/components/${path}.jsx`);
    const html = renderToStaticMarkup(createElement(LocaleProvider, { initialMode: 'en', syncDocument: false },
      createElement(ThemeProvider, { theme }, createElement(MemoryRouter, null, createElement(Component)))));
    check(() => assert.doesNotMatch(html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, ''), /[가-힣]/, path));
  }
  const { GNB } = await server.ssrLoadModule('/src/components/navigation/GNB.jsx');
  for (const [locale, label] of [['ko', '언어'], ['en', 'Language']]) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { initialMode: locale }, createElement(ThemeProvider, { theme }, createElement(GNB))));
    check(() => assert.ok(html.includes(`aria-label="${label}"`)));
  }
  console.log(`Locale: ${checks} checks passed; bilingual catalogs, OS preferences, storage, name preservation, share copy and SSR views. No browser used.`);
} finally { await server.close(); }
