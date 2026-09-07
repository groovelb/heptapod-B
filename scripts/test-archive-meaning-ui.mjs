/** Browser-free integration checks: SSR/contracts, not pixels or real focus/scroll. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material/styles';
import { ARCHIVE_STORY_GLYPHS } from '../src/test-fixtures/archiveClient.js';
import { groupArchiveMeanings } from '../src/utils/heptapod/groupArchiveMeanings.js';
import { compareGlyphMeanings, interpretGlyphMeaning } from '../src/utils/heptapod/interpretGlyphMeaning.js';
import { relateGlyphs } from '../src/utils/heptapod/relateGlyphs.js';
import { archiveMeaningPath, parseArchiveMeaningSearch } from '../src/utils/heptapod/shareArchive.js';
import { isRenderableGlyphModel } from '../src/utils/heptapod/extractGlyphFeatures.js';
import { ARCHETYPE_CATALOG, ARCHETYPE_FAMILIES } from '../src/data/heptapodArchetypeCatalog.js';
import { getArchiveArchetypeSymbol } from '../src/data/archiveArchetypeSymbols.js';
import { buildArchiveArchetypeFeed } from '../src/utils/heptapod/buildArchiveArchetypeFeed.js';
import { glyphObservationMask } from '../src/utils/heptapod/glyphObservationMask.js';

const originalFetch = globalThis.fetch;
let requests = 0;
globalThis.fetch = () => { requests += 1; throw new Error('No network in meaning presentation tests.'); };
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let checks = 0;
const check = (fn) => { fn(); checks += 1; };
try {
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const { default: Summary } = await server.ssrLoadModule('/src/components/data-display/GlyphMeaningSummary.jsx');
  const { default: ClusterLink } = await server.ssrLoadModule('/src/components/data-display/GlyphClusterLink.jsx');
  const { default: Explorer, filterMeaningGlyphs } = await server.ssrLoadModule('/src/components/data-display/ArchiveMeaningExplorer.jsx');
  const { default: Pair } = await server.ssrLoadModule('/src/components/data-display/GlyphPairComparison.jsx');
  const { default: Preview } = await server.ssrLoadModule('/src/components/data-display/ResonancePreview.jsx');
  const { default: Depth } = await server.ssrLoadModule('/src/components/data-display/ArchiveDepthExplorer.jsx');
  const { default: Glyph } = await server.ssrLoadModule('/src/components/data-display/ArchiveGlyph.jsx');
  const { default: FamilySymbol } = await server.ssrLoadModule('/src/components/data-display/ArchiveFamilySymbol.jsx');
  const { default: Feed } = await server.ssrLoadModule('/src/components/data-display/ArchiveArchetypeFeed.jsx');
  const { default: Selected } = await server.ssrLoadModule('/src/components/data-display/ArchiveSelectedGlyph.jsx');
  const { default: LocaleProvider } = await server.ssrLoadModule('/src/i18n/LocaleProvider.jsx');
  const { localizeMessage } = await server.ssrLoadModule('/src/i18n/messages.js');
  const escaped = (text) => renderToStaticMarkup(createElement('span', null, text)).slice(6, -7);
  const render = (Component, props) => renderToStaticMarkup(createElement(ThemeProvider, { theme }, createElement(Component, props)));
  // Explicit synthetic fixtures cover the full catalog, not claims about public names.
  for (const archetype of Object.values(ARCHETYPE_CATALOG)) {
    const model = getArchiveArchetypeSymbol(archetype.id).model;
    const row = { id: `00000000-0000-0000-0000-${String(archetype.order + 1).padStart(12, '0')}`, is_public: true, model_data: model };
    const dto = groupArchiveMeanings([row]);
    const feedHtml = render(Feed, { feed: buildArchiveArchetypeFeed([row], dto) });
    const readingHtml = render(Summary, { interpretation: interpretGlyphMeaning(model), variant: 'reading' });
    const family = ARCHETYPE_FAMILIES[archetype.familyId];
    const depthHtml = render(Depth, { glyphs: [row], meanings: dto, filter: { base: archetype.familyId, modifiers: [], groupId: archetype.id, status: 'all' } });
    check(() => assert.ok(depthHtml.includes(family.story)));
    check(() => assert.ok(depthHtml.includes(archetype.composition)));
    check(() => assert.ok(depthHtml.indexOf(family.story) < depthHtml.indexOf(archetype.composition)));
    check(() => assert.ok(feedHtml.includes(archetype.composition)));
    const rootHtml = render(Depth, { glyphs: [row], meanings: dto });
    check(() => assert.ok(rootHtml.includes(family.reading)));
    check(() => assert.ok(rootHtml.includes(`data-family-introduction="${family.id}"`)));
    const membershipHtml = render(ClusterLink, { interpretation: interpretGlyphMeaning(model) });
    check(() => assert.ok(membershipHtml.includes(archetype.title)));
    check(() => assert.ok(membershipHtml.includes(`group=${encodeURIComponent(archetype.id)}`)));
    for (const [content, narrative] of [[feedHtml, archetype.reading], [readingHtml, archetype.story]]) {
      check(() => assert.ok(content.includes(archetype.title)));
      check(() => assert.ok(content.includes(narrative)));
    }
    check(() => assert.equal((feedHtml.match(/data-archive-member=/g) || []).length, 1));
    check(() => assert.equal((feedHtml.match(/data-archetype-section=/g) || []).length, 1));
    check(() => assert.ok(feedHtml.includes(`data-archetype-symbol="${archetype.id}"`)));
    check(() => assert.doesNotMatch(feedHtml, /role="tab"|data-archive-facets/));
    for (const locale of ['ko', 'en']) {
      for (const [Component, props] of [
        [Selected, { glyph: row, interpretation: interpretGlyphMeaning(model) }],
        [Summary, { interpretation: interpretGlyphMeaning(model), variant: 'reading' }],
      ]) {
        const html = renderToStaticMarkup(createElement(LocaleProvider, { initialMode: locale, syncDocument: false },
          createElement(ThemeProvider, { theme }, createElement(Component, props))));
        check(() => assert.ok(html.includes(escaped(localizeMessage(archetype.story, locale))), `${archetype.id}: ${locale} full story`));
        check(() => assert.ok(html.includes(escaped(localizeMessage(archetype.title, locale))), `${archetype.id}: ${locale} title`));
        for (const sentence of [family.story, archetype.composition, ...archetype.traits, ...archetype.moments,
          archetype.tension, archetype.question, archetype.distinction, archetype.motto, ...archetype.relations.map((relation) => relation.reading)]) {
          check(() => assert.ok(html.includes(escaped(localizeMessage(sentence, locale))), `${archetype.id}: ${locale} full JSON content`));
        }
        check(() => assert.ok(html.indexOf(escaped(localizeMessage(family.story, locale))) < html.indexOf(escaped(localizeMessage(archetype.composition, locale)))));

      }
    }
  }
  check(() => assert.doesNotMatch(render(ClusterLink, { interpretation: { status: 'partial' } }), /href=/));
  const emptyFeedHtml = render(Feed, { feed: buildArchiveArchetypeFeed([], groupArchiveMeanings([])) });
  check(() => assert.doesNotMatch(emptyFeedHtml, /data-archetype-section|data-archive-member|data-archetype-symbol/));
  const publicGlyphs = ARCHIVE_STORY_GLYPHS.filter((row) => row.is_public === true);
  const meanings = groupArchiveMeanings(publicGlyphs);
  const left = publicGlyphs[0];
  const right = publicGlyphs.find((row) => row.id !== left.id);
  const interpretation = interpretGlyphMeaning(left.model_data);
  const comparison = compareGlyphMeanings(left.model_data, right.model_data);
  const relations = relateGlyphs(left, right);
  const filter = { base: null, modifiers: [], groupId: null, status: 'all' };
  const pair = { leftGlyph: left, rightGlyph: right, relations, meaningComparison: comparison };

  check(() => assert.match(render(Summary, { interpretation }), /형태에서 읽은 의미/));
  check(() => assert.match(render(Summary, { interpretation }), /공식 번역/));
  check(() => assert.ok(render(Summary, { interpretation, compact: true }).includes(interpretation.title)));
  check(() => assert.match(render(Summary, { interpretation, onSelectObservation() {} }), /aria-pressed/));
  check(() => assert.match(render(Summary, { interpretation: interpretGlyphMeaning(null) }), /판독 미확인/));
  check(() => assert.match(render(Summary, { interpretation, compact: true, fg: '#ffffff' }), /rgba\(255, 255, 255, 0.8\)/));
  const partial = structuredClone(left.model_data);
  partial.inkLoads = [];
  check(() => assert.match(render(Summary, { interpretation: interpretGlyphMeaning(partial) }), /부분 판독/));

  const html = render(Explorer, { meanings, glyphs: publicGlyphs, filter, onFilterChange() {} });
  check(() => assert.match(html, /기본 의미 단일 선택/));
  check(() => assert.match(html, /추가 의미 모두 포함/));
  check(() => assert.match(html, /복합 의미군 정확히 선택/));
  check(() => assert.match(html, /현재 불러온 공개 표본/));
  const sharedGroup = meanings.groups.find((group) => group.memberIds.length > 1);
  check(() => assert.ok(sharedGroup, 'comparison fixture needs a multi-member meaning group'));
  const rootHtml = render(Depth, { meanings, glyphs: publicGlyphs });
  check(() => assert.match(rootHtml, /data-archive-depth="families"/));
  check(() => assert.match(rootHtml, /상위 표식군/));
  check(() => assert.match(rootHtml, /data-family-symbol/));
  check(() => assert.doesNotMatch(rootHtml, /data-sample-glyph/));
  check(() => assert.match(rootHtml, /기본 계열의 상징/));
  for (const familyId of ['arrival', 'reception', 'reciprocity']) {
    const symbolHtml = render(FamilySymbol, { familyId });
    check(() => assert.match(symbolHtml, new RegExp(`data-family-symbol="${familyId}"`)));
    check(() => assert.match(symbolHtml, /개인의 이름 표식이 아닙니다/));
  }
  check(() => assert.equal(render(FamilySymbol, { familyId: 'unknown' }), ''));
  const familyHtml = render(Depth, { meanings, glyphs: publicGlyphs, filter: { base: meanings.interpretations[sharedGroup.memberIds[0]].baseMeaning } });
  check(() => assert.match(familyHtml, /data-archive-member/));
  check(() => assert.match(familyHtml, /data-archetype-feed/));
  check(() => assert.match(familyHtml, /data-archetype-section/));
  check(() => assert.doesNotMatch(familyHtml, /data-archive-facets|data-archive-meta|role="tab"/));
  check(() => assert.doesNotMatch(familyHtml, /data-sample-glyph|data-cluster-id/));
  check(() => assert.doesNotMatch(familyHtml, /data-family-symbol/));
  check(() => assert.doesNotMatch(rootHtml, /기본 의미 단일 선택|판독 가능|형태 분류 v|현재 조건|<select|분석 보기/));
  const peopleHtml = render(Depth, { meanings, glyphs: publicGlyphs, filter: { groupId: sharedGroup.id }, onFocusGlyph() {} });
  check(() => assert.match(peopleHtml, /data-archive-depth="members"/));
  check(() => assert.match(peopleHtml, /의 표식 가까이 보기/));
  check(() => assert.doesNotMatch(peopleHtml, /data-cluster-id/));
  const focusedHtml = render(Depth, { meanings, glyphs: publicGlyphs, filter: { groupId: sharedGroup.id }, focusedId: sharedGroup.memberIds[0] });
  check(() => assert.match(focusedHtml, /data-archive-depth="glyph"/));
  // Detail replaces the visible list, but the hidden list retains its Canvas state.
  check(() => assert.match(focusedHtml, /data-archive-member/));
  check(() => assert.match(focusedHtml, /data-selected-glyph-detail/));
  check(() => assert.match(focusedHtml, /data-same-type-glyph/));
  check(() => assert.match(focusedHtml, /같은 의미가 나타나는 부분/));
  check(() => assert.match(focusedHtml, /data-archive-list-view="true" hidden="" inert=""/));
  check(() => assert.match(focusedHtml, /data-shared-meaning/));
  check(() => assert.doesNotMatch(focusedHtml, /role="dialog"/));
  check(() => assert.equal((focusedHtml.match(/data-archive-member=/g) || []).length, sharedGroup.memberIds.length));
  check(() => assert.match(render(Depth, { meanings, glyphs: publicGlyphs, focusedId: 'missing' }), /data-family-symbol/));
  check(() => assert.match(render(Glyph, { glyph: { ...left, model_data: null }, showName: true }), /아직 모습을 불러올 수 없어요/));
  check(() => assert.doesNotMatch(focusedHtml, /다음 표식|두 표식의 의미 비교/));
  // Timeline detail must not accidentally inherit the meaning sample's 200-row cap.
  const lateGlyph = { ...left, id: '00000000-0000-4000-8000-000000001999' };
  const longTimeline = [left, ...Array.from({ length: 201 }, (_, index) => ({ ...left,
    id: `00000000-0000-4000-8000-${String(1000 + index).padStart(12, '0')}`, model_data: null })), lateGlyph];
  const lateHtml = render(Depth, { glyphs: longTimeline, order: 'newest', focusedId: lateGlyph.id });
  check(() => assert.match(lateHtml, /data-selected-glyph-detail/));
  check(() => assert.equal((lateHtml.match(/data-same-type-glyph=/g) || []).length, 1));
  check(() => assert.match(lateHtml, new RegExp(`data-same-type-glyph="${left.id}"`)));
  check(() => assert.match(lateHtml, /data-shared-pattern-grid/));
  const originalModel = JSON.stringify(left.model_data);
  const observed = interpretation.observations[0].anchors;
  const mask = glyphObservationMask(left.model_data, observed);
  check(() => assert.match(mask, /radial-gradient\(circle at [\d.]+% [\d.]+%/));
  check(() => assert.doesNotMatch(mask, /NaN|undefined/));
  check(() => assert.notEqual(mask, glyphObservationMask(left.model_data, [{ ...observed[0], ang: observed[0].ang + 0.5 }]), 'Mask follows actual observation angles'));
  check(() => assert.equal(glyphObservationMask(left.model_data, []), 'linear-gradient(transparent, transparent)'));
  check(() => assert.equal(JSON.stringify(left.model_data), originalModel, 'Fragments never regenerate or modify stored geometry'));
  check(() => assert.doesNotMatch(html, /NaN|undefined|궁합|성격 유형/));
  check(() => assert.match(render(Explorer, { meanings, glyphs: publicGlyphs, filter, loading: true }), /갤러리는 계속/));
  check(() => assert.match(render(Explorer, { error: '다시 판독해 주세요.', onRetry() {} }), /role="alert"/));
  check(() => assert.match(render(Explorer, { meanings: groupArchiveMeanings([]), glyphs: [], filter }), /현재 공개 표본이 없어요/));
  check(() => assert.equal(filterMeaningGlyphs(publicGlyphs, meanings, filter).length, meanings.sampleSize));
  for (const group of meanings.groups) {
    const exact = { ...filter, groupId: group.id };
    check(() => assert.deepEqual(filterMeaningGlyphs(publicGlyphs, meanings, exact).map((row) => row.id).sort(), [...group.memberIds].sort()));
    const decoded = parseArchiveMeaningSearch(new URL(archiveMeaningPath(exact), 'https://example.test').search);
    check(() => assert.equal(decoded.filter.groupId, group.id));
  }
  for (const base of ['arrival', 'reception', 'reciprocity']) {
    const selected = filterMeaningGlyphs(publicGlyphs, meanings, { ...filter, base, modifiers: ['openness', 'trace'] });
    check(() => assert.ok(selected.every((row) => {
      const item = meanings.interpretations[row.id];
      return item.baseMeaning === base && item.modifiers.openness === true && item.modifiers.trace === true;
    })));
  }
  check(() => assert.deepEqual(filterMeaningGlyphs([{ ...left, is_public: false }], meanings, filter), []));
  check(() => assert.deepEqual(filterMeaningGlyphs([{ ...left, is_public: undefined }], meanings, filter), []));
  check(() => assert.equal(filterMeaningGlyphs([...publicGlyphs, left], meanings, filter).length, meanings.sampleSize));

  const meaningHtml = render(Pair, { ...pair, initialView: 'meaning', onShare() {} });
  check(() => assert.match(meaningHtml, /data-comparison-reading="meaning"/));
  check(() => assert.match(meaningHtml, /이 의미 비교 공유하기/));
  check(() => assert.doesNotMatch(meaningHtml, /전체 형태 점수|계산 근거 펼쳐보기/));
  check(() => assert.match(meaningHtml, /정밀하게 닮은 것은 아니에요/));
  check(() => assert.match(render(Pair, { ...pair, view: 'precision', initialView: 'meaning' }), /data-comparison-reading="precision"/));
  check(() => assert.match(render(Pair, { ...pair, view: 'meaning', initialView: 'precision' }), /data-comparison-reading="meaning"/));
  check(() => assert.doesNotMatch(render(Pair, { ...pair, meaningComparison: undefined }), /비교 읽기 방식/));
  check(() => assert.match(render(Pair, { ...pair, meaningComparison: compareGlyphMeanings(left.model_data, left.model_data), initialView: 'meaning' }), /같은 복합 의미/));
  check(() => assert.match(render(Pair, { ...pair, leftGlyph: { ...left, model_data: {} }, meaningComparison: compareGlyphMeanings({}, right.model_data), initialView: 'meaning' }), /의미를 아직 비교할 수 없어요/));
  check(() => assert.match(render(Pair, { ...pair, leftGlyph: { ...left, model_data: { bad: true } }, meaningComparison: undefined }), /표식 없음/));
  check(() => assert.equal(Boolean(isRenderableGlyphModel({ bad: true })), false));
  check(() => assert.equal(Boolean(isRenderableGlyphModel(left.model_data)), true));
  check(() => assert.ok(render(Preview, { primaryName: left.canonical_name, primaryModel: left.model_data }).includes(interpretation.title)));

  for (const path of ['templates/MyArchivePage', 'templates/GlyphDetailPage', 'templates/ArchiveComparePage',
    'data-display/ResonancePreview', 'data-display/ArchiveMeaningExplorer', 'data-display/GlyphMeaningSummary', 'data-display/GlyphPairComparison', 'data-display/ArchiveDepthExplorer', 'data-display/ArchiveSelectedGlyph', 'data-display/ArchiveArchetypeFeed', 'data-display/ArchiveGlyph', 'data-display/ArchiveFamilySymbol']) {
    const story = await server.ssrLoadModule(`/src/components/${path}.stories.jsx`);
    check(() => assert.ok(story.default.component));
  }
  const archiveSource = await readFile(new URL('../src/components/templates/MyArchivePage.jsx', import.meta.url), 'utf8');
  const depthSource = await readFile(new URL('../src/components/data-display/ArchiveDepthExplorer.jsx', import.meta.url), 'utf8');
  const selectedSource = await readFile(new URL('../src/components/data-display/ArchiveSelectedGlyph.jsx', import.meta.url), 'utf8');
  const glyphSource = await readFile(new URL('../src/components/data-display/ArchiveGlyph.jsx', import.meta.url), 'utf8');
  const detailSource = await readFile(new URL('../src/components/templates/GlyphDetailPage.jsx', import.meta.url), 'utf8');
  const compareSource = await readFile(new URL('../src/components/templates/ArchiveComparePage.jsx', import.meta.url), 'utf8');
  const previewSource = await readFile(new URL('../src/components/data-display/ResonancePreview.jsx', import.meta.url), 'utf8');
  check(() => assert.match(archiveSource, /useArchiveMeanings\(glyphs/));
  check(() => assert.match(archiveSource, /filterMeaningGlyphs\(glyphs, meanings, meaningFilter\)/));
  const feedSource = await readFile(new URL('../src/components/data-display/ArchiveArchetypeFeed.jsx', import.meta.url), 'utf8');
  check(() => assert.match(feedSource, /key=\{ glyph\.id \}/));
  check(() => assert.match(depthSource, /key=\{ timeline \? 'timeline' : scope\.scopeKey \}/));
  check(() => assert.doesNotMatch(depthSource, /<Dialog|다음 표식|비교/));
  check(() => assert.match(selectedSource, /data-selected-glyph-detail/));
  check(() => assert.match(selectedSource, /data-same-type-glyph/));
  check(() => assert.match(archiveSource, /useArchiveScroll\(viewPath, ready && !interpreting && !meaningError\)/));
  check(() => assert.match(glyphSource, /isRenderableGlyphModel\(glyph\.model_data\)/));
  check(() => assert.match(glyphSource, /<LogogramRendererCanvas model=\{ glyph\.model_data \} size=\{ canvasSize \} isActive=\{ visible \} \/>/));
  check(() => assert.doesNotMatch(archiveSource, /if \(!entered\)|<AnalysisOverlay/));
  check(() => assert.doesNotMatch(archiveSource, /<Drawer|observationOpen|useArchiveClusters|setObserving/));
  check(() => assert.doesNotMatch(depthSource, /partialCount|invalidCount|partialFilter|invalidFilter|tracesStillBeingRead/));
  check(() => assert.match(detailSource, /interpretGlyphMeaning\(glyph\.model_data\)/));
  check(() => assert.match(detailSource, /isRenderableGlyphModel\(glyph\?\.model_data\)/));
  check(() => assert.match(detailSource, /anchors=\{ selectedMeaningObservation\?\.anchors \}/));
  check(() => assert.match(compareSource, /compareGlyphMeanings\(left\.model_data, right\.model_data\)/));
  check(() => assert.match(compareSource, /view=\{ readingView \}/));
  check(() => assert.equal(parseArchiveMeaningSearch('?reading=meaning&mv=999').unsupportedVersion, true));
  check(() => assert.equal(parseArchiveMeaningSearch('?reading=meaning&mv=1').unsupportedVersion, false));
  check(() => assert.match(compareSource, /exportPairCard\(left, right, selectedShareReason, \{ reading: readingView/));
  check(() => assert.match(previewSource, /interpretGlyphMeaning\(primaryModel\)/));
  check(() => assert.equal(requests, 0));
  console.log(`Meaning presentation/integration: ${checks} checks passed; no browser or network.`);
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
