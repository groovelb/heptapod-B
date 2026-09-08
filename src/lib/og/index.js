import { composeOgCard, OG_DESIGN_VERSION } from './card.js';
import { createTranslator, sourceText as t } from '../../i18n/messages.js';
import { MEANING_VERSION, MORPHOLOGY_VERSION } from '../../data/heptapodMeaningCatalog.js';
import { createHash } from 'node:crypto';
import { parseArchiveDepthSearch } from '../../utils/heptapod/shareArchive.js';
import { groupArchiveMeanings } from '../../utils/heptapod/groupArchiveMeanings.js';
import { buildArchiveDepthView, sampleClusterGlyphs } from '../../utils/heptapod/archiveDepthView.js';
import { buildArchiveArchetypeFeed, buildArchiveTimeline } from '../../utils/heptapod/buildArchiveArchetypeFeed.js';
import { shareLocale } from '../../i18n/shareLocale.js';
import { validateShareModel } from './png.js';

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const BRAND = t('app.title');
const COPY = {
  ko: { landing: '외계인 언어로 쓴 내 이름 유형', archive: '외계인 언어, 이름별 유형',
    personal: (name) => `${name}의 외계인 언어 유형`, group: (name) => `외계인 언어의 ${name} 유형`,
    compare: '우리 이름, 같은 외계인 유형일까?', description: '내 이름을 표식으로 바꾸고 유형을 확인해 보세요.',
    unavailable: '현재 공개된 표식을 확인해 주세요.' },
  en: { landing: 'Your Name in Alien Language', archive: 'Alien Language: Name Types',
    personal: (name) => `${name}’s Alien Language Type`, group: (name) => `Alien Language: ${name} Type`,
    compare: 'Do Our Names Share an Alien Type?', description: 'Turn your name into a glyph. Discover your type.',
    unavailable: 'Explore the glyphs currently shared publicly.' },
};
const DESCRIPTION = COPY.ko.description;
export const LANDING_IMAGE = `/og/landing-v${OG_DESIGN_VERSION}.png`;
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };

export function siteOrigin(origin) {
  const value = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    || origin || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) || 'http://localhost:3000';
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid site origin');
  return url.origin;
}

function queryString(searchParams) {
  if (searchParams instanceof URLSearchParams) return searchParams.toString();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    for (const item of Array.isArray(value) ? value : [value]) if (item != null) query.append(key, String(item));
  }
  return query.toString();
}

function pageQuery(kind, searchParams) {
  const params = new URLSearchParams(queryString(searchParams));
  const locale = shareLocale(params);
  params.delete('lang');
  const query = ['canvas', 'landing'].includes(kind) ? new URLSearchParams() : params;
  if (locale) query.set('lang', locale);
  return query.toString();
}

/** Bounded public-only snapshot. Matches the UI's newest 200-row analysis sample. */
export async function readPublicRows(ids = null, { fetcher = fetch, timeline = null } = {}) {
  if (ids && (!ids.length || ids.length > 6 || ids.some((id) => !UUID.test(id || '')))) throw new Error('Invalid public ID');
  const source = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!source || !key) throw new Error('Archive unavailable');
  const url = new URL('/rest/v1/glyphs', source);
  url.searchParams.set('select', 'id,canonical_name,encoder_version,model_data,is_public,created_at');
  url.searchParams.set('is_public', 'eq.true');
  url.searchParams.set('limit', String(ids ? ids.length : timeline ? 3 : 200));
  url.searchParams.set('order', timeline === 'oldest' ? 'created_at.asc,id.asc' : 'created_at.desc,id.desc');
  if (ids) url.searchParams.set('id', `in.(${ids.join(',')})`);
  const response = await fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(6000),
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json', ...(timeline ? { Prefer: 'count=exact' } : {}) } });
  if (!response.ok || !response.body) throw new Error('Archive unavailable');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 8 * 1024 * 1024) { await reader.cancel(); throw new Error('Archive response too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const value of chunks) { bytes.set(value, offset); offset += value.length; }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!Array.isArray(data) || data.length > (ids ? ids.length : 200)) throw new Error('Invalid public response');
  const rows = data.filter((row) => row?.is_public === true && UUID.test(row.id || '') && (!ids || ids.includes(row.id)));
  if (timeline) {
    const total = Number(response.headers.get('content-range')?.split('/')[1]);
    rows.totalCount = Number.isFinite(total) ? total : null;
  }
  return ids ? ids.map((id) => rows.find((row) => row.id === id)).filter(Boolean) : rows;
}

/** Scope first, then sample: no unrelated names or generated group geometry. */
export function selectArchiveOg(rows, search = '') {
  const state = parseArchiveDepthSearch(search);
  if (state.invalidLocation || state.unsupportedVersion) throw new Error('Invalid archive location');
  for (const row of rows) if (row?.is_public === true) validateShareModel(row.model_data);
  const meanings = groupArchiveMeanings(rows);
  const scene = buildArchiveDepthView(rows, meanings, state.filter, state.focusedId, state.meta);
  if (scene.missingFocus) throw new Error('Public glyph not in selected scope');
  const feed = state.order ? buildArchiveTimeline(scene.glyphs, state.order) : buildArchiveArchetypeFeed(scene.glyphs, meanings);
  return { title: scene.title, description: `최근 공개 표식 분석 범위에서 ${scene.glyphs.length}개 · ${scene.subtitle || '표식의 형태에서 읽는 의미'}`,
    cardTitle: scene.level === 'families' ? 'Archive' : scene.title,
    shareType: scene.focusedGlyph ? 'personal' : scene.level === 'families' ? 'archive' : 'group',
    cardKind: scene.focusedGlyph ? 'glyph' : 'archive',
    rows: scene.focusedGlyph ? [scene.focusedGlyph] : sampleClusterGlyphs(feed.glyphs, 3) };
}

function requestedPath(kind, params, searchParams) {
  let path = ['archive', 'canvas'].includes(kind) ? `/${kind}` : '/';
  if (['glyph', 'field'].includes(kind) && UUID.test(params.id || '')) path = `/${kind}/${params.id}`;
  if (kind === 'compare' && UUID.test(params.leftId || '') && (!params.rightId || UUID.test(params.rightId))) path = `/compare/${params.leftId}${params.rightId ? `/${params.rightId}` : ''}`;
  const query = pageQuery(kind, searchParams);
  return path + (query && query.length <= 4096 ? `?${query}` : '');
}

async function resolvePage({ kind, params = {}, searchParams = {} }, read = readPublicRows) {
  const query = pageQuery(kind, searchParams);
  if (query.length > 4096) throw new Error('Invalid query');
  const locale = shareLocale(query) || 'ko';
  const copy = COPY[locale];
  let path = '/'; let content = { title: BRAND, description: DESCRIPTION, rows: [] };
  if (kind === 'archive') {
    path = '/archive';
    const state = parseArchiveDepthSearch(query);
    if (state.invalidLocation || state.unsupportedVersion) throw new Error('Invalid archive location');
    if (state.order) {
      // Chronological UI deliberately ignores analysis filters and spans all public rows.
      const rows = await read(state.focusedId ? [state.focusedId] : null, { timeline: state.order });
      if (state.focusedId && rows.length !== 1) throw new Error('Public glyph unavailable');
      content = { rows, shareType: state.focusedId ? 'personal' : 'archive', title: state.focusedId ? rows[0].canonical_name : '공개 표식 — RESPONSE',
        cardTitle: state.focusedId ? rows[0].canonical_name : 'Archive', cardKind: state.focusedId ? 'glyph' : 'archive',
        description: state.focusedId ? DESCRIPTION : `${rows.totalCount ?? ''}${rows.totalCount != null ? '개의 ' : ''}공개 표식 · ${state.order === 'oldest' ? '처음부터' : '최근부터'}` };
    } else content = selectArchiveOg(await read(), query);
  } else if (['glyph', 'field', 'compare'].includes(kind)) {
    const ids = kind === 'compare' ? [params.leftId, params.rightId].filter(Boolean) : [params.id];
    if (!ids.length || ids.some((id) => !UUID.test(id || ''))) throw new Error('Invalid public ID');
    const rows = await read(ids);
    if (rows.length !== ids.length) throw new Error('Public glyph unavailable');
    for (const row of rows) validateShareModel(row.model_data);
    path = kind === 'compare' ? `/compare/${ids.join('/')}` : `/${kind}/${ids[0]}`;
    content = { rows, title: `${rows.map((row) => row.canonical_name || '표식').join(' · ')} — ${BRAND}`,
      cardTitles: rows.map((row) => row.canonical_name || '표식'),
      cardTitle: rows.map((row) => row.canonical_name || '표식').join(' · '),
      description: DESCRIPTION };
  } else if (kind !== 'landing') {
    path = kind === 'canvas' ? '/canvas' : '/';
  }
  for (const row of content.rows) validateShareModel(row.model_data);
  const personal = content.shareType === 'personal' || ['glyph', 'field'].includes(kind);
  const group = content.shareType === 'group';
  if (group) content.cardTitle = createTranslator(locale).localize(content.cardTitle);
  const title = personal ? copy.personal(content.rows[0]?.canonical_name || (locale === 'en' ? 'Glyph' : '표식'))
    : kind === 'compare' ? copy.compare : group ? copy.group(content.cardTitle)
    : kind === 'archive' ? copy.archive : copy.landing;
  return { ...content, title, description: copy.description, locale, path: path + (query ? `?${query}` : '') };
}

export async function generatePageMetadata({ kind = 'landing', params = {}, searchParams = {}, origin } = {}) {
  const base = siteOrigin(origin);
  const locale = shareLocale(queryString(searchParams)) || 'ko';
  let page; let unavailable = false;
  try { page = await resolvePage({ kind, params, searchParams }); }
  catch { unavailable = true; page = { title: COPY[locale].archive, description: COPY[locale].unavailable, path: requestedPath(kind, params, searchParams), rows: [] }; }
  let imageUrl = new URL(LANDING_IMAGE, base).href;
  if (page.rows.length) {
    const image = new URL('/api/og', base);
    image.searchParams.set('kind', kind);
    for (const key of ['id', 'leftId', 'rightId']) if (params[key]) image.searchParams.set(key, params[key]);
    const search = pageQuery(kind, searchParams); if (search) image.searchParams.set('query', search);
    image.searchParams.set('v', createHash('sha256').update(JSON.stringify(page.rows.map((row) => [row.id, row.encoder_version, row.model_data]))).update(JSON.stringify({ renderer: OG_DESIGN_VERSION, cardTitle: page.cardTitle, meaning: MEANING_VERSION, morphology: MORPHOLOGY_VERSION, kind, query: queryString(searchParams) })).digest('hex').slice(0, 16));
    imageUrl = image.href;
  }
  return { metadataBase: new URL(base), title: page.title, description: page.description,
    alternates: { canonical: new URL(page.path, base).href, languages: Object.fromEntries(['ko', 'en'].map((lang) => {
      const url = new URL(page.path, base); url.searchParams.set('lang', lang); return [lang, url.href];
    })) }, ...(unavailable ? { robots: { index: false, follow: false } } : {}),
    openGraph: { type: 'website', siteName: BRAND, locale: locale === 'en' ? 'en_US' : 'ko_KR', alternateLocale: [locale === 'en' ? 'ko_KR' : 'en_US'], title: page.title, description: page.description,
      url: new URL(page.path, base).href, images: [{ url: imageUrl, width: 1200, height: 630, type: 'image/png', alt: page.title }] },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description, images: [imageUrl] } };
}

/** Re-read every image request, including old versioned URLs after unpublishing. */
export async function handleOgRequest(request) {
  try {
    const url = new URL(request.url);
    const kind = url.searchParams.get('kind');
    if (!['archive', 'glyph', 'compare', 'field'].includes(kind)) return new Response('Not found', { status: 404, headers: NO_STORE });
    const page = await resolvePage({ kind, params: Object.fromEntries(['id', 'leftId', 'rightId'].map((key) => [key, url.searchParams.get(key)])),
      searchParams: new URLSearchParams(url.searchParams.get('query') || '') });
    if (!page.rows.length) return new Response('No public glyphs', { status: 404, headers: NO_STORE });
    const png = await composeOgCard(page.rows.map((row) => row.model_data), { ...page, kind: page.cardKind || kind });
    return new Response(request.method === 'HEAD' ? null : png, { headers: { ...NO_STORE, 'Content-Type': 'image/png' } });
  } catch { return new Response('Public image unavailable', { status: 404, headers: NO_STORE }); }
}
