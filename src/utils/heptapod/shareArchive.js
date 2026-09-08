import { localizedShareUrl } from '../../i18n/shareLocale.js';
import { createTranslator, sourceText as t } from '../../i18n/messages.js';
import { generateParticles, makeSprites, paintStatic, SIZE0 } from './logogramParticles.js';
import { glyphLabel } from './resonanceView.js';
import { MEANING_VERSION, MEANING_BASE_IDS, MEANING_MODIFIER_IDS } from '../../data/heptapodMeaningCatalog.js';
import { getGlyphArchetype } from '../../data/heptapodArchetypeCatalog.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEANING_STATUSES = ['all', 'partial', 'invalid'];
const EMPTY_MEANING_FILTER = () => ({ base: null, modifiers: [], groupId: null, status: 'all' });

function orderedMeaningModifiers(modifiers) {
  if (!Array.isArray(modifiers) || modifiers.some((id) => !MEANING_MODIFIER_IDS.includes(id))) throw new Error(t('shareArchive.checkTheMeaningFilters'));
  return MEANING_MODIFIER_IDS.filter((id) => modifiers.includes(id));
}

function validMeaningGroup(id) {
  if (typeof id !== 'string' || id.length > 160) return false;
  const [version, base, suffix, extra] = id.split(':');
  if (extra !== undefined || version !== `meaning-v${MEANING_VERSION}` || !MEANING_BASE_IDS.includes(base)) return false;
  if (suffix === 'none') return true;
  if (!suffix) return false;
  const modifiers = suffix.split('+');
  return modifiers.every((value) => MEANING_MODIFIER_IDS.includes(value))
    && orderedMeaningModifiers(modifiers).join('+') === suffix;
}

function meaningFilter(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some((key) => !['base', 'modifiers', 'groupId', 'status'].includes(key))) throw new Error(t('shareArchive.checkTheMeaningFilters'));
  const { base = null, modifiers = [], groupId = null, status = 'all' } = input;
  if ((base !== null && !MEANING_BASE_IDS.includes(base)) || !MEANING_STATUSES.includes(status)
    || (groupId !== null && !validMeaningGroup(groupId))) throw new Error(t('shareArchive.checkTheMeaningFilters'));
  return { base, modifiers: orderedMeaningModifiers(modifiers), groupId, status };
}

/** Share only stable worldview filter IDs, never labels or names from private input. */
export function archiveMeaningPath(input = {}) {
  const filter = meaningFilter(input);
  const params = new URLSearchParams({ view: 'meaning', mv: String(MEANING_VERSION) });
  if (filter.base) params.set('base', filter.base);
  if (filter.modifiers.length) params.set('modifiers', filter.modifiers.join(','));
  if (filter.groupId) params.set('group', filter.groupId);
  if (filter.status !== 'all') params.set('status', filter.status);
  return `/archive?${params}`;
}

/** Invalid/unsafe searches are rejected to an empty filter without echoing their values. */
export function parseArchiveMeaningSearch(search = '') {
  const empty = (unsupportedVersion = false) => ({ filter: EMPTY_MEANING_FILTER(), unsupportedVersion });
  if (typeof search !== 'string' || search.length > 4096) return empty();
  const params = new URLSearchParams(search);
  params.delete('lang');
  const versions = params.getAll('mv');
  const meaningIntent = ['view', 'reading'].some((key) => params.getAll(key).includes('meaning'));
  // Detail/pair reading links use the same version gate as archive filters.
  // Explicit unsupported versions must never be silently read with today's rules.
  if (versions.some((version) => version !== String(MEANING_VERSION))
    || (meaningIntent && versions.length === 0)) return empty(true);
  if (params.get('view') !== 'meaning') return empty();
  const keys = ['view', 'mv', 'base', 'modifiers', 'group', 'status'];
  if ([...params.keys()].some((key) => !keys.includes(key) || params.getAll(key).length !== 1)) return empty();
  try {
    const filter = meaningFilter({ base: params.get('base'),
      modifiers: params.has('modifiers') ? params.get('modifiers').split(',') : [],
      groupId: params.get('group'), status: params.get('status') ?? 'all' });
    return { filter, unsupportedVersion: false };
  } catch { return empty(); }
}

/** `meta` changes presentation order only; legacy AND/group filters keep their scope. */
export function archiveDepthPath(filter = {}, focusedId = null, { meta = null, order = null } = {}) {
  if (focusedId !== null && (typeof focusedId !== 'string' || !UUID.test(focusedId))) throw new Error(t('shareArchive.checkThePublicGlyphAddress'));
  if (meta !== null && !MEANING_MODIFIER_IDS.includes(meta)) throw new Error(t('shareArchive.checkTheMeaningFilters'));
  if (order !== null && !['newest', 'oldest'].includes(order)) throw new Error(t('shareArchive.checkTheMeaningFilters'));
  const path = archiveMeaningPath(filter);
  return `${path}${meta ? `&meta=${meta}` : ''}${order ? `&order=${order}` : ''}${focusedId ? `&glyph=${encodeURIComponent(focusedId)}` : ''}`;
}

export function parseArchiveDepthSearch(search = '') {
  const invalid = () => ({ filter: EMPTY_MEANING_FILTER(), focusedId: null, meta: null, unsupportedVersion: false, invalidLocation: true });
  if (typeof search !== 'string' || search.length > 4096) return invalid();
  const params = new URLSearchParams(search);
  params.delete('lang');
  const keys = ['view', 'mv', 'base', 'modifiers', 'group', 'status', 'glyph', 'meta', 'order'];
  if ([...params.keys()].some((key) => !keys.includes(key) || params.getAll(key).length !== 1)) return invalid();
  const focusedId = params.get('glyph');
  const meta = params.get('meta');
  const order = params.get('order');
  if (order !== null && !['newest', 'oldest'].includes(order)) return invalid();
  if (focusedId !== null && !UUID.test(focusedId)) return invalid();
  if (meta !== null && !MEANING_MODIFIER_IDS.includes(meta)) return invalid();
  if (params.has('view') && !['meaning', 'precision'].includes(params.get('view'))) return invalid();
  if (!params.has('view') && ['base', 'modifiers', 'group', 'status', 'glyph', 'meta', 'order'].some((key) => params.has(key))) return invalid();
  try {
    meaningFilter({ base: params.get('base'), modifiers: params.has('modifiers') ? params.get('modifiers').split(',') : [],
      groupId: params.get('group'), status: params.get('status') ?? 'all' });
  } catch { return invalid(); }
  params.delete('glyph'); // The old filter parser intentionally rejects additional fields.
  params.delete('meta');
  params.delete('order');
  if (params.get('view') === 'precision') {
    params.set('view', 'meaning'); // Drawer mode must not erase the underlying depth.
    if (!params.has('mv')) params.set('mv', String(MEANING_VERSION));
  }
  return { ...parseArchiveMeaningSearch(params.toString()), focusedId, meta, order, invalidLocation: false };
}

function shareReading(options) {
  if (options.reading !== undefined && !['precision', 'meaning'].includes(options.reading)) throw new Error(t('shareArchive.checkTheReadingModeToShare'));
  if (options.reading === 'meaning' && (options.meaningVersion ?? MEANING_VERSION) !== MEANING_VERSION) {
    throw new Error(t('shareArchive.checkTheMeaningReadingVersionToShare'));
  }
  return options.reading === 'meaning';
}

export function archiveSharePath(leftId, rightId) {
  if (!UUID.test(leftId) || (rightId && !UUID.test(rightId))) throw new Error(t('shareArchive.onlyPublicGlyphsCanBeSharedBy'));
  return rightId ? `/compare/${leftId}/${rightId}` : `/glyph/${leftId}`;
}

/** Next.js app URLs serve OG metadata directly; explicit legacy endpoints remain supported. */
export function archiveShareUrl(leftId, rightId, options = {}) {
  const path = archiveSharePath(leftId, rightId);
  const origin = options.origin || globalThis.location?.origin;
  const isMeaning = shareReading(options);
  if (options.reading !== undefined) {
    // Existing OG redirects carry no reading selection; explicit views use app URLs.
    const url = new URL(path, origin);
    url.searchParams.set('reading', isMeaning ? 'meaning' : 'precision');
    if (isMeaning) url.searchParams.set('mv', String(MEANING_VERSION));
    return localizedShareUrl(url.href, options.locale);
  }
  const endpoint = options.endpoint;
  if (endpoint) {
    const url = new URL(endpoint);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) throw new Error(t('shareArchive.checkTheShareUrlConfiguration'));
    // Hosted Supabase shared domains rewrite HTML to text/plain. Keep a usable
    // app URL until an HTML-capable custom-domain endpoint is configured.
    if (/(^|\.)supabase\.(co|in)$/.test(url.hostname)) return localizedShareUrl(new URL(path, origin).href, options.locale);
    url.searchParams.set('left', leftId);
    if (rightId) url.searchParams.set('right', rightId);
    return localizedShareUrl(url.href, options.locale);
  }
  return localizedShareUrl(new URL(path, origin).href, options.locale);
}

/** Single public response copy. Names stay literal; only authored copy is localized.
 * This does not change URLs, encode models, or alter pair/OG contracts.
 */
export function glyphArchetypeShareCopy(glyph, interpretation, locale = 'ko') {
  if (!UUID.test(glyph?.id || '') || glyph?.is_public === false) return null;
  const archetype = getGlyphArchetype(interpretation);
  if (!archetype) return null;
  const { t, localize } = createTranslator(locale);
  return {
    title: t('archetypeShare.title', { name: glyphLabel(glyph), type: localize(archetype.title) }),
    text: localize(archetype.reading),
  };
}

/** Copy is an explicit action and never opens a native share sheet. */
export async function copyArchiveLink(url, options = {}) {
  const { t } = createTranslator(options.locale || 'ko');
  const nav = options.navigator || globalThis.navigator;
  if (!nav?.clipboard?.writeText) throw new Error(t('shareArchive.linksCannotBeCopiedOnThisDevice'));
  await nav.clipboard.writeText(url);
  return 'copied';
}

export function archiveShareData({ left, right, reason, interpretation }, options = {}) {
  const { t, localize } = createTranslator(options.locale || 'ko');
  if (left?.is_public === false || right?.is_public === false) throw new Error(t('shareArchive.onlyPublicGlyphsCanBeSharedBy'));
  const url = archiveShareUrl(left.id, right?.id, options);
  const isMeaning = shareReading(options);
  const archetypeCopy = !right ? glyphArchetypeShareCopy(left, interpretation, options.locale || 'ko') : null;
  const title = archetypeCopy?.title || (isMeaning
    ? t('shareArchive.meaningReadFromForm', { p0: [left, right].filter(Boolean).map(glyphLabel).join(' · ') })
    : right ? t('shareArchive.compareTwoNames', { p0: glyphLabel(left), p1: glyphLabel(right) }) : t('share.glyphTitle', { p0: glyphLabel(left) }));
  return { title, text: archetypeCopy?.text || localize(reason) || (isMeaning ? t('shareArchive.readTheGlyphSFormThroughThis') : t('shareArchive.willYourNameConnectToo')), url };
}

/** Opens a compose screen only; choosing a network never posts on the user's behalf. */
export function archiveSocialLinks(input, options = {}) {
  return socialShareLinks(archiveShareData(input, options));
}

/** The same social destinations for a public glyph, pair or Archive collection URL. */
export function socialShareLinks({ title, text, url }) {
  const caption = [title, text].filter(Boolean).join('\n');
  return [
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?${new URLSearchParams({ text: caption, url })}` },
    { id: 'threads', label: 'Threads', href: `https://www.threads.com/intent/post?${new URLSearchParams({ text: `${caption}\n${url}` })}` },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: url })}` },
  ];
}

export async function shareArchive(input, options = {}) {
  const payload = archiveShareData(input, options);
  const nav = options.navigator || globalThis.navigator;
  if (nav?.share) {
    try {
      await nav.share(payload);
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled';
      if (options.copyFallback === false) throw error;
    }
  }
  if (options.copyFallback === false) throw new Error(createTranslator(options.locale || 'ko').t('publishDialog.appsUnavailable'));
  return copyArchiveLink(payload.url, { ...options, navigator: nav });
}

/** Same final particles as the display renderer; no inferred or synthetic glyphs. */
export async function exportPairCard(left, right, reason = '', options = {}) {
  const { t, localize } = createTranslator(options.locale || 'ko');
  const isMeaning = shareReading(options);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(t('shareArchive.theImageCouldNotBeSaved'));
  await document.fonts?.ready;
  ctx.fillStyle = '#d6e8ed';
  ctx.fillRect(0, 0, 1200, 630);
  const sprites = makeSprites('#1c2226');
  for (const [index, glyph] of [left, right].entries()) {
    const { particles } = generateParticles(glyph.model_data, true);
    ctx.save();
    ctx.translate(90 + index * 600, 58);
    ctx.scale(420 / SIZE0, 420 / SIZE0);
    paintStatic(ctx, particles, sprites);
    ctx.restore();
    ctx.fillStyle = '#1c2226';
    ctx.textAlign = 'center';
    ctx.font = '32px "Noto Serif KR", Georgia, serif';
    ctx.fillText(glyphLabel(glyph), 300 + index * 600, 486, 500);
  }
  ctx.font = '20px "Noto Serif KR", sans-serif';
  ctx.fillText(localize(reason) || (isMeaning ? t('shareArchive.readMeaningFromTheFormsOfTwo') : t('shareArchive.observeTwoNamesSideBySide')), 600, 548, 1080);
  ctx.font = '14px monospace';
  ctx.fillText(isMeaning ? t('share.cardCaption', { p0: MEANING_VERSION }) : t('share.brand'), 600, 596);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error(t('shareArchive.theImageCouldNotBeCreatedTry'));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = isMeaning ? 'response-archive-meaning.png' : 'response-archive-comparison.png';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
