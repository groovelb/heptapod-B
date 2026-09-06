import { sourceText as t } from '../../i18n/messages.js';
import { MEANING_BASE_IDS, MEANING_MODIFIER_IDS, MEANING_CATALOG, meaningTitle } from '../../data/heptapodMeaningCatalog.js';

export const EMPTY_ARCHIVE_FILTER = Object.freeze({ base: null, modifiers: [], groupId: null, status: 'all' });

/** Only the loaded, interpreted public snapshot may enter any archive scene. */
export function filterMeaningGlyphs(glyphs = [], meanings, filter = EMPTY_ARCHIVE_FILTER) {
  if (!meanings?.interpretations) return [];
  const { base = null, modifiers = [], groupId = null, status = 'all' } = filter || EMPTY_ARCHIVE_FILTER;
  const group = groupId ? meanings.groups?.find((item) => item.id === groupId) : null;
  if (groupId && !group) return [];
  const members = group ? new Set(group.memberIds) : null;
  const seen = new Set();
  return glyphs.filter((glyph) => {
    if (!glyph?.id || glyph.is_public !== true || seen.has(glyph.id)) return false;
    seen.add(glyph.id);
    const interpretation = meanings.interpretations[glyph.id];
    if (!interpretation || (status !== 'all' && interpretation.status !== status)) return false;
    if (members && !members.has(glyph.id)) return false;
    if (base && interpretation.baseMeaning !== base) return false;
    return modifiers.every((id) => interpretation.modifiers?.[id] === true);
  });
}

const INVITATIONS = {
  arrival: t('archiveDepthView.aTraceSpreadingOutward'),
  reception: t('archiveDepthView.aTraceHoldingSomethingWithin'),
  reciprocity: t('archiveDepthView.aTraceWhereInsideAndOutsideMeet'),
};

const compareIds = (left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0;

/** Multiple facets can include the same real glyph. Unknown is never absence. */
function buildMeaningFacets(members, interpretations) {
  return MEANING_MODIFIER_IDS.map((id) => {
    const memberIds = [];
    let knownCount = 0;
    for (const glyph of members) {
      const value = interpretations[glyph.id].modifiers?.[id];
      if (value === true) memberIds.push(glyph.id);
      if (value === true || value === false) knownCount += 1;
    }
    return { id, label: MEANING_CATALOG[id].label, memberIds,
      count: memberIds.length, total: members.length,
      knownCount, unknownCount: members.length - knownCount };
  });
}

/** A navigation projection, never a new classifier or a synthetic group glyph.
 * Families → people with overlapping meaning facets → one person.
 * Facets only reorder; legacy group/AND/status links retain their exact scope.
 * Unknown IDs stay empty and unknown readings never become negative evidence.
 */
export function buildArchiveDepthView(glyphs, meanings, filter = EMPTY_ARCHIVE_FILTER, focusedId = null, meta = null) {
  const current = { ...EMPTY_ARCHIVE_FILTER, ...filter, modifiers: filter?.modifiers || [] };
  const members = filterMeaningGlyphs(glyphs, meanings, current).sort(compareIds);
  const selectedMeta = MEANING_MODIFIER_IDS.includes(meta) ? meta : null;
  const facets = buildMeaningFacets(members, meanings?.interpretations || {});
  const orderedMembers = selectedMeta ? [...members].sort((left, right) => (
    Number(meanings.interpretations[right.id].modifiers?.[selectedMeta] === true)
    - Number(meanings.interpretations[left.id].modifiers?.[selectedMeta] === true)
  ) || compareIds(left, right)) : members;
  // Ordering and focus have independent state; sorting must not remount the scene.
  const scopeKey = JSON.stringify({ base: current.base, groupId: current.groupId,
    modifiers: [...new Set(current.modifiers)].sort(), status: current.status });
  const selectedGroup = meanings?.groups?.find((item) => item.id === current.groupId);
  const base = current.base || selectedGroup?.meaningIds.find((id) => MEANING_BASE_IDS.includes(id)) || null;
  const isRoot = !current.base && !current.groupId && !current.modifiers.length && current.status === 'all';
  const focusedGlyph = members.find((glyph) => glyph.id === focusedId) || null;
  const level = focusedId ? 'glyph' : isRoot ? 'families' : 'members';
  const nodes = [];
  if (level === 'families') {
    for (const id of MEANING_BASE_IDS) {
      const familyMembers = members.filter((glyph) => meanings.interpretations[glyph.id].baseMeaning === id);
      if (familyMembers.length) nodes.push({ id, kind: 'family', title: MEANING_CATALOG[id].label,
        caption: INVITATIONS[id], glyphs: familyMembers, filter: { ...EMPTY_ARCHIVE_FILTER, base: id } });
    }
  }
  const title = focusedId ? (focusedGlyph?.display_name || focusedGlyph?.canonical_name || t('archiveDepthView.response'))
    : current.groupId ? selectedGroup?.title || t('archiveDepthView.aDistantTrace')
      : base ? MEANING_CATALOG[base]?.label || t('archiveDepthView.aDistantTrace')
        : current.modifiers.length ? meaningTitle(current.modifiers) : t('archiveDepthView.whichTraceDrawsYouIn');
  const parentFilter = focusedId ? current : current.groupId
    ? { ...current, groupId: null, base }
    : current.status !== 'all' ? { ...current, status: 'all' } : EMPTY_ARCHIVE_FILTER;
  return {
    level, key: `${level}:${scopeKey}:${focusedId || ''}`, scopeKey, meta: selectedMeta, facets,
    title, subtitle: level === 'families' ? t('archiveDepthView.chooseAGlyphGroupToMeetThe')
      : level === 'members' ? INVITATIONS[base] || t('archiveDepthView.moveCloserToASingleGlyph') : '',
    base, selectedGroup, focusedGlyph, missingFocus: Boolean(focusedId && !focusedGlyph),
    glyphs: orderedMembers, nodes, parentFilter,
  };
}

/** Deterministic samples of real members, not duplicates or blended geometry. */
export function sampleClusterGlyphs(glyphs, limit = 5) {
  if (limit <= 0) return [];
  if (limit === 1) return glyphs.slice(0, 1);
  if (glyphs.length <= limit) return glyphs;
  return Array.from({ length: limit }, (_, index) => glyphs[Math.floor(index * (glyphs.length - 1) / (limit - 1))]);
}
