/**
 * Reproducible, browser-free archive presentation checks.
 * Run: node scripts/test-archive-ui.mjs
 * SSR proves markup/module contracts, not Canvas pixels, focus, or IME behavior.
 * configFile:false deliberately avoids the repository's Playwright test config.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material/styles';
import { createArchiveStoryClient, ARCHIVE_STORY_GLYPHS, ARCHIVE_STORY_IDS } from '../src/test-fixtures/archiveClient.js';
import { readArchiveGlyphs, readPublicGlyph, readGlyphRelations, publishArchiveGlyph, unpublishArchiveGlyph } from '../src/lib/archiveClient.js';
import { relateGlyphs } from '../src/utils/heptapod/relateGlyphs.js';
import { getMorphologyObservations, groupResonanceRows } from '../src/utils/heptapod/resonanceView.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const originalFetch = globalThis.fetch;
let networkCalls = 0;
globalThis.fetch = () => { networkCalls += 1; throw new Error('Network access is forbidden in archive UI checks.'); };
const server = await createServer({ root, configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true }, environments: { ssr: { optimizeDeps: { noDiscovery: true } } }, appType: 'custom', logLevel: 'error' });
let checks = 0;
const check = (run) => { run(); checks += 1; };

try {
  const { default: theme } = await server.ssrLoadModule('/src/styles/themes/default.js');
  const modules = {};
  const componentPaths = [
    'data-display/GlyphNode', 'data-display/ResonanceList', 'data-display/ResonanceMap',
    'data-display/GlyphPairComparison', 'data-display/ResonancePreview', 'overlay-feedback/RelationInspector',
    'data-display/ArchiveClusterExplorer', 'overlay-feedback/GlyphObservationOverlay',
  ];
  const pagePaths = [
    'templates/MyArchivePage', 'templates/GlyphDetailPage', 'templates/ResonanceFieldPage',
    'templates/ArchiveComparePage', 'overlay-feedback/PublishDialog',
  ];
  for (const path of [...componentPaths, ...pagePaths]) modules[path.split('/')[1]] = await server.ssrLoadModule(`/src/components/${path}.stories.jsx`);
  const markup = (tree) => renderToStaticMarkup(createElement(ThemeProvider, { theme }, tree));
  const render = (name, overrides = {}) => {
    const story = modules[name].default;
    return markup(createElement(story.component, { ...story.args, ...overrides }));
  };
  const leftGlyph = ARCHIVE_STORY_GLYPHS.find((glyph) => glyph.id === ARCHIVE_STORY_IDS.left);
  const rightGlyph = ARCHIVE_STORY_GLYPHS.find((glyph) => glyph.id === ARCHIVE_STORY_IDS.right);
  const unrelatedGlyph = ARCHIVE_STORY_GLYPHS.find((glyph) => glyph.id === ARCHIVE_STORY_IDS.unrelated);
  const pairRelations = relateGlyphs(leftGlyph, rightGlyph);
  const renderPair = (overrides = {}) => render('GlyphPairComparison', { leftGlyph, rightGlyph, relations: pairRelations, ...overrides });
  const observed = pairRelations.flatMap(getMorphologyObservations);

  check(() => assert.match(render('GlyphNode'), /<canvas/));
  check(() => assert.match(render('GlyphNode', { model: null }), /표식 없음/));
  check(() => assert.match(render('ResonanceList', { onInspect() {}, onNodeSelect() {} }), /공명 부위 보기/));
  check(() => assert.match(render('ResonanceList', { loading: true }), /role="status"/));
  check(() => assert.match(render('ResonanceList', { error: 'failed', onRetry() {} }), /role="alert"/));
  check(() => assert.match(render('ResonanceList', { error: '형태 공명 서버를 업데이트한 뒤 다시 시도해 주세요.' }), /서버를 업데이트/));
  check(() => assert.match(render('ResonanceList', { relations: [] }), /현재 살펴본 표식들/));
  const realNeighbors = modules.ResonanceMap.default.args.relations;
  check(() => assert.equal((render('ResonanceMap').match(/<canvas/g) || []).length, Math.min(12, realNeighbors.length) + 1));
  check(() => assert.equal((render('ResonanceMap', { width: 320, height: 360 }).match(/<canvas/g) || []).length, Math.min(6, realNeighbors.length) + 1));
  // Isolated capacity fixture: intentionally repeated real model/measurement,
  // synthetic IDs only. This is NOT archive data or a Storybook discovery demo.
  const limitFixture = Array.from({ length: 20 }, (_, index) => ({
    id: `synthetic-limit-${index}`, name: 'Capacity fixture', model: rightGlyph.model_data,
    ...pairRelations[0], relations: pairRelations,
  }));
  check(() => assert.equal((render('ResonanceMap', { relations: limitFixture }).match(/<canvas/g) || []).length, 13));
  check(() => assert.equal((render('ResonanceMap', { relations: limitFixture, width: 320, height: 360 }).match(/<canvas/g) || []).length, 7));
  check(() => assert.match(render('ResonanceMap'), /목록으로 보기/));
  check(() => assert.match(renderPair({ onShare() {} }), /이 (?:연결|공명) 공유하기/));
  check(() => assert.doesNotMatch(renderPair({ onShare: undefined }), /이 (?:연결|공명) 공유하기/));
  check(() => assert.doesNotMatch(renderPair(), /<mark\b|함께 쓰인 글자|겹치는 글자/));
  check(() => assert.match(renderPair({ rightGlyph: unrelatedGlyph, relations: relateGlyphs(leftGlyph, unrelatedGlyph) }), /현재 기준에서는 설명할 수 있는 형태 공명을 찾지 못했어요/));
  check(() => assert.match(renderPair({ rightGlyph: leftGlyph, relations: [] }), /동일한 표식이에요/));
  check(() => assert.match(renderPair(), /같은 번호/));
  check(() => assert.doesNotMatch(renderPair(), /NaN/));
  check(() => assert.ok(observed.length > 0 && renderPair().includes(observed[0].reason)));
  check(() => assert.equal((renderPair().match(new RegExp(`data-kind="${observed[0].kind}"`, 'g')) || []).length, 2));
  check(() => assert.match(renderPair(), /aria-label="형태 관측 지점"/));
  check(() => assert.match(renderPair(), /일부 구조/));
  check(() => assert.equal((renderPair({ onExplore() {} }).match(/이 표식에서 탐색/g) || []).length, 2));
  check(() => assert.equal((renderPair({ onExplore() {}, rightGlyph: { ...rightGlyph, id: 'local' } }).match(/이 표식에서 탐색/g) || []).length, 1));
  check(() => assert.equal((renderPair({ onExplore() {}, leftGlyph: { ...leftGlyph, is_local: true }, rightGlyph: { ...rightGlyph, id: 'local-secondary' } }).match(/이 표식에서 탐색/g) || []).length, 0));
  check(() => assert.match(render('ResonancePreview'), /비교하기/));
  render('RelationInspector'); // Portal content is intentionally absent from SSR.
  check(() => assert.match(render('ArchiveClusterExplorer'), /공통 형태 군집/));
  check(() => assert.match(render('ArchiveClusterExplorer'), /현재 군집 미소속/));
  check(() => assert.match(render('ArchiveClusterExplorer'), /표식 중복 소속/));
  check(() => assert.match(render('ArchiveClusterExplorer', modules.ArchiveClusterExplorer.Selected.args), /①은 이 군집이 공유하는 가지/));
  check(() => assert.match(render('ArchiveClusterExplorer', modules.ArchiveClusterExplorer.Selected.args), /aria-pressed="true"/));
  check(() => assert.match(render('ArchiveClusterExplorer', { selectedId: 'ungrouped' }), /새로운 표식이 쌓이면/));
  check(() => assert.match(render('ArchiveClusterExplorer', modules.ArchiveClusterExplorer.Empty.args), /군집을 찾지 못했어요/));
  check(() => assert.match(render('ArchiveClusterExplorer', modules.ArchiveClusterExplorer.Loading.args), /갤러리는 계속 볼 수/));
  check(() => assert.match(render('ArchiveClusterExplorer', modules.ArchiveClusterExplorer.Error.args), /role="alert"/));
  check(() => assert.doesNotMatch(render('ArchiveClusterExplorer'), /NaN|undefined|철자|글자 공유/));
  check(() => assert.match(render('GlyphObservationOverlay'), /data-kind="branch"/));
  check(() => assert.match(render('GlyphObservationOverlay'), /data-observation-index="1"/));
  check(() => assert.doesNotMatch(render('GlyphObservationOverlay'), /NaN/));
  check(() => assert.equal(render('GlyphObservationOverlay', { anchors: [] }), ''));
  const clusteredSource = await readFile(new URL('../src/components/templates/MyArchivePage.jsx', import.meta.url), 'utf8');
  const depthSource = await readFile(new URL('../src/components/data-display/ArchiveDepthExplorer.jsx', import.meta.url), 'utf8');
  const glyphSurfaceSource = await readFile(new URL('../src/components/data-display/ArchiveGlyph.jsx', import.meta.url), 'utf8');
  check(() => assert.doesNotMatch(clusteredSource, /ArchiveClusterExplorer|ArchiveMeaningExplorer|useArchiveClusters|clusterProvider|Drawer|observing|navigate\('\/me'\)/));
  check(() => assert.match(clusteredSource, /<ArchiveDepthExplorer/));
  check(() => assert.match(glyphSurfaceSource, /<LogogramRendererCanvas/));
  check(() => assert.match(depthSource, /<ArchiveArchetypeFeed/));
  check(() => assert.match(depthSource, /buildArchiveArchetypeFeed\(scope\.glyphs, meanings\)/));

  // Page hooks intentionally render their initial loading state during SSR.
  // Their fully resolved states are provided by the same in-memory client below.
  for (const path of pagePaths) {
    const name = path.split('/')[1];
    const story = modules[name].default;
    let tree = createElement(story.component, story.args);
    for (const decorate of [...(story.decorators || [])].reverse()) {
      const child = tree;
      tree = decorate(() => child, { parameters: story.parameters || {} });
    }
    const html = markup(tree);
    check(() => assert.doesNotMatch(html, /NaN|undefined의/));
    if (name === 'ArchiveComparePage') check(() => assert.match(html, /공개된 표식을 불러오는 중/));
  }

  const client = createArchiveStoryClient();
  const publicGlyphs = await readArchiveGlyphs(client);
  check(() => assert.equal(publicGlyphs.length, ARCHIVE_STORY_GLYPHS.filter((glyph) => glyph.is_public).length));
  check(() => assert.ok(publicGlyphs.every((glyph) => glyph.is_public)));
  const hidden = await readPublicGlyph(client, ARCHIVE_STORY_IDS.hidden);
  check(() => assert.equal(hidden, null));
  const mapped = await readGlyphRelations(client, ARCHIVE_STORY_IDS.left);
  check(() => assert.ok(mapped.relations.some((row) => row.relation_type === 'FORM' && row.evidence.basis === 'rendered-form')));
  check(() => assert.deepEqual(mapped.relations.filter((row) => row.neighborGlyph.id === ARCHIVE_STORY_IDS.variant).map((row) => row.relation_type), ['VARIANT']));
  check(() => assert.ok(mapped.relations.every((row) => row.neighborGlyph.is_public && row.evidence && row.reasons.length)));
  check(() => assert.ok(mapped.relations.every((row) => ['FORM', 'VARIANT'].includes(row.relation_type))));
  check(() => assert.deepEqual(relateGlyphs(
    { ...leftGlyph, canonical_name: 'identical-label', display_name: 'identical-label' },
    { ...rightGlyph, canonical_name: 'identical-label', display_name: 'identical-label' },
  ), pairRelations));
  const projected = groupResonanceRows(mapped.relations, { kinds: ['branch'] });
  check(() => assert.ok(projected.length && projected.every((neighbor) => getMorphologyObservations(neighbor)[0].kind === 'branch')));
  check(() => assert.ok(render('ResonanceList', { relations: projected }).includes(getMorphologyObservations(projected[0])[0].reason)));
  check(() => assert.match(render('ResonanceMap', { relations: projected }), /data-kind="branch"/));
  const stale = { ...projected[0], relationType: 'ECHO', relations: [{ relationType: 'ECHO', algorithmVersion: 2, evidence: { basis: 'literal-text' }, reasons: ['alphabet-only-sentinel'] }] };
  check(() => assert.doesNotMatch(render('ResonanceList', { relations: [stale] }), /alphabet-only-sentinel/));
  check(() => assert.doesNotMatch(render('ResonanceMap', { relations: [stale] }), /alphabet-only-sentinel/));
  check(() => assert.doesNotMatch(renderPair({ relations: stale.relations }), /alphabet-only-sentinel|<mark\b/));
  const fieldSource = await readFile(new URL('../src/components/templates/ResonanceFieldPage.jsx', import.meta.url), 'utf8');
  check(() => assert.doesNotMatch(fieldSource, /ECHO|CONTAINS|겹치는 글자|포함된 이름/));
  for (const name of ['MyArchivePage', 'GlyphDetailPage']) {
    const source = await readFile(new URL(`../src/components/templates/${name}.jsx`, import.meta.url), 'utf8');
    // Prevent the retired, non-rendered lineage classification from returning
    // to the primary archive metadata. SSR page hooks initially show loading.
    check(() => assert.doesNotMatch(source, /contour_label|['"]CONTOUR['"]/));
  }

  const errorClient = createArchiveStoryClient({ failures: { 'archive-relations': '연결 실패' } });
  await assert.rejects(() => readGlyphRelations(errorClient, ARCHIVE_STORY_IDS.left), /연결 실패/); checks += 1;
  const noNeighbors = createArchiveStoryClient({ glyphs: ARCHIVE_STORY_GLYPHS.filter((glyph) => [ARCHIVE_STORY_IDS.left, ARCHIVE_STORY_IDS.unrelated].includes(glyph.id)) });
  const empty = await readGlyphRelations(noNeighbors, ARCHIVE_STORY_IDS.left);
  check(() => assert.deepEqual(empty.relations, []));

  const controller = new AbortController();
  const pendingClient = createArchiveStoryClient({ pending: ['glyphs'] });
  const pendingRead = readArchiveGlyphs(pendingClient, { signal: controller.signal });
  controller.abort();
  await assert.rejects(() => pendingRead, /cancelled/); checks += 1;

  const publishClient = createArchiveStoryClient({ user: null, contributions: [] });
  const published = await publishArchiveGlyph(publishClient, { displayName: 'Louise', consented: true });
  check(() => assert.equal(published.glyphId, ARCHIVE_STORY_IDS.left));
  const own = await publishClient.from('glyph_contributions').select('*').is('withdrawn_at', null);
  check(() => assert.equal(own.data.length, 1));
  await unpublishArchiveGlyph(publishClient, published.glyphId);
  const withdrawn = await publishClient.from('glyph_contributions').select('*').is('withdrawn_at', null);
  check(() => assert.equal(withdrawn.data.length, 0));
  const failedPublish = createArchiveStoryClient({ failures: { 'archive-publish': '저장 실패' } });
  await assert.rejects(() => publishArchiveGlyph(failedPublish, { displayName: 'Louise', consented: true }), /저장 실패/); checks += 1;

  const successResult = await modules.PublishDialog.SuccessFlow.args.onPublish({ consented: true });
  check(() => assert.equal(successResult.glyphId, ARCHIVE_STORY_IDS.left));
  await assert.rejects(() => modules.PublishDialog.FailureFlow.args.onPublish({ consented: true }), /저장을 완료하지 못했습니다/); checks += 1;
  check(() => assert.equal(networkCalls, 0));
  console.log(`Archive UI: ${checks} checks passed; ${Object.keys(modules).length} story modules loaded; no browser or network. Canvas pixels, focus and IME need separately authorized browser checks.`);
} finally {
  await server.close();
  globalThis.fetch = originalFetch;
}
