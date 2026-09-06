import { ARCHETYPE_CATALOG, getGlyphArchetype } from '../../data/heptapodArchetypeCatalog.js';
import { MEANING_VERSION, MORPHOLOGY_VERSION } from '../../data/heptapodMeaningCatalog.js';

const PUBLIC_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const compareIds = (a, b) => a.id.toLowerCase() < b.id.toLowerCase() ? -1
  : a.id.toLowerCase() > b.id.toLowerCase() ? 1 : 0;

/** Project an already-scoped public sample; never widen scope or reclassify.
 * Exact type membership is exclusive. Unknown/unsupported readings retain the
 * original glyph in the same scope without inventing an absence or a type.
 */
export function buildArchiveArchetypeFeed(glyphs, meanings) {
  const seen = new Set();
  const rows = (Array.isArray(glyphs) ? glyphs : []).filter((glyph) => {
    if (glyph?.is_public !== true || typeof glyph.id !== 'string' || !PUBLIC_ID.test(glyph.id)) return false;
    const id = glyph.id.toLowerCase();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).sort(compareIds);
  const supported = meanings?.meaningVersion === MEANING_VERSION
    && meanings?.morphologyVersion === MORPHOLOGY_VERSION;
  const interpretations = supported ? meanings.interpretations : null;
  const members = new Map();
  const untypedGlyphs = [];
  for (const glyph of rows) {
    const interpretation = interpretations && Object.hasOwn(interpretations, glyph.id)
      ? interpretations[glyph.id] : null;
    const archetype = getGlyphArchetype(interpretation);
    if (!archetype) untypedGlyphs.push(glyph);
    else {
      if (!members.has(archetype.id)) members.set(archetype.id, []);
      members.get(archetype.id).push(glyph);
    }
  }
  const sections = Object.values(ARCHETYPE_CATALOG)
    .sort((a, b) => a.order - b.order)
    .filter((archetype) => members.has(archetype.id))
    .map((archetype) => ({ id: archetype.id, archetype, glyphs: members.get(archetype.id) }));
  return { sections, untypedGlyphs,
    glyphs: [...sections.flatMap((section) => section.glyphs), ...untypedGlyphs] };
}

/** Real public rows in registration order, including unreadable/uncategorized models. */
export function buildArchiveTimeline(glyphs, order = 'newest') {
  const seen = new Set();
  const timestamp = (glyph) => {
    const value = Date.parse(glyph.created_at);
    return Number.isFinite(value) ? value : null;
  };
  const rows = (Array.isArray(glyphs) ? glyphs : []).filter((glyph) => {
    if (glyph?.is_public !== true || !PUBLIC_ID.test(glyph.id || '') || seen.has(glyph.id.toLowerCase())) return false;
    seen.add(glyph.id.toLowerCase());
    return true;
  }).sort((left, right) => {
    const a = timestamp(left), b = timestamp(right);
    if (a === null || b === null) return a === b ? compareIds(left, right) : a === null ? 1 : -1;
    return (order === 'oldest' ? a - b : b - a) || compareIds(left, right);
  });
  return { sections: [], untypedGlyphs: [], glyphs: rows, chronological: true };
}
