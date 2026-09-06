import { createTranslator, sourceText as t } from '../../i18n/messages.js';
import { generateParticles, makeSprites, paintStatic, SIZE0 } from './logogramParticles.js';
import { glyphLabel } from './resonanceView.js';
import { MEANING_VERSION, MEANING_BASE_IDS, MEANING_MODIFIER_IDS } from '../../data/heptapodMeaningCatalog.js';

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
export function archiveDepthPath(filter = {}, focusedId = null, { meta = null } = {}) {
  if (focusedId !== null && (typeof focusedId !== 'string' || !UUID.test(focusedId))) throw new Error(t('shareArchive.checkThePublicGlyphAddress'));
  if (meta !== null && !MEANING_MODIFIER_IDS.includes(meta)) throw new Error(t('shareArchive.checkTheMeaningFilters'));
  const path = archiveMeaningPath(filter);
  return `${path}${meta ? `&meta=${meta}` : ''}${focusedId ? `&glyph=${encodeURIComponent(focusedId)}` : ''}`;
}

export function parseArchiveDepthSearch(search = '') {
  const invalid = () => ({ filter: EMPTY_MEANING_FILTER(), focusedId: null, meta: null, unsupportedVersion: false, invalidLocation: true });
  if (typeof search !== 'string' || search.length > 4096) return invalid();
  const params = new URLSearchParams(search);
  const keys = ['view', 'mv', 'base', 'modifiers', 'group', 'status', 'glyph', 'meta'];
  if ([...params.keys()].some((key) => !keys.includes(key) || params.getAll(key).length !== 1)) return invalid();
  const focusedId = params.get('glyph');
  const meta = params.get('meta');
  if (focusedId !== null && !UUID.test(focusedId)) return invalid();
  if (meta !== null && !MEANING_MODIFIER_IDS.includes(meta)) return invalid();
  if (params.has('view') && !['meaning', 'precision'].includes(params.get('view'))) return invalid();
  if (!params.has('view') && ['base', 'modifiers', 'group', 'status', 'glyph', 'meta'].some((key) => params.has(key))) return invalid();
  try {
    meaningFilter({ base: params.get('base'), modifiers: params.has('modifiers') ? params.get('modifiers').split(',') : [],
      groupId: params.get('group'), status: params.get('status') ?? 'all' });
  } catch { return invalid(); }
  params.delete('glyph'); // The old filter parser intentionally rejects additional fields.
  params.delete('meta');
  if (params.get('view') === 'precision') {
    params.set('view', 'meaning'); // Drawer mode must not erase the underlying depth.
    if (!params.has('mv')) params.set('mv', String(MEANING_VERSION));
  }
  return { ...parseArchiveMeaningSearch(params.toString()), focusedId, meta, invalidLocation: false };
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

/** Optional edge endpoint serves OG metadata; app links also work without it. */
export function archiveShareUrl(leftId, rightId, options = {}) {
  const path = archiveSharePath(leftId, rightId);
  const origin = options.origin || globalThis.location?.origin;
  const isMeaning = shareReading(options);
  if (options.reading !== undefined) {
    // Existing OG redirects carry no reading selection; explicit views use app URLs.
    const url = new URL(path, origin);
    url.searchParams.set('reading', isMeaning ? 'meaning' : 'precision');
    if (isMeaning) url.searchParams.set('mv', String(MEANING_VERSION));
    return url.href;
  }
  const endpoint = options.endpoint ?? import.meta.env?.VITE_ARCHIVE_SHARE_URL;
  if (endpoint) {
    const url = new URL(endpoint);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) throw new Error(t('shareArchive.checkTheShareUrlConfiguration'));
    // Hosted Supabase shared domains rewrite HTML to text/plain. Keep a usable
    // app URL until an HTML-capable custom-domain endpoint is configured.
    if (/(^|\.)supabase\.(co|in)$/.test(url.hostname)) return new URL(path, origin).href;
    url.searchParams.set('left', leftId);
    if (rightId) url.searchParams.set('right', rightId);
    return url.href;
  }
  return new URL(path, origin).href;
}

export async function shareArchive({ left, right, reason }, options = {}) {
  const { t, localize } = createTranslator(options.locale || 'ko');
  if (left?.is_public === false || right?.is_public === false) throw new Error(t('shareArchive.onlyPublicGlyphsCanBeSharedBy'));
  const url = archiveShareUrl(left.id, right?.id, options);
  const isMeaning = shareReading(options);
  const title = isMeaning
    ? t('shareArchive.meaningReadFromForm', { p0: [left, right].filter(Boolean).map(glyphLabel).join(' · ') })
    : right ? t('shareArchive.compareTwoNames', { p0: glyphLabel(left), p1: glyphLabel(right) }) : t('share.glyphTitle', { p0: glyphLabel(left) });
  const nav = options.navigator || globalThis.navigator;
  if (nav?.share) {
    try {
      await nav.share({ title, text: localize(reason) || (isMeaning ? t('shareArchive.readTheGlyphSFormThroughThis') : t('shareArchive.willYourNameConnectToo')), url });
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled';
    }
  }
  if (!nav?.clipboard?.writeText) throw new Error(t('shareArchive.linksCannotBeCopiedOnThisDevice'));
  await nav.clipboard.writeText(url);
  return 'copied';
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
