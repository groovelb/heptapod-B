import { sourceText as t } from '../i18n/messages.js';
import {
  MEANING_VERSION, MORPHOLOGY_VERSION, MEANING_BASE_IDS, MEANING_MODIFIER_IDS,
} from './heptapodMeaningCatalog.js';

/** Authored interpretations of exact measured keys, not encoder reachability. */
export const ARCHETYPE_NARRATIVE_VERSION = 1;
const COMBINATIONS = Object.freeze([
  [], ['simultaneity'], ['openness'], ['trace'],
  ['simultaneity', 'openness'], ['simultaneity', 'trace'], ['openness', 'trace'],
  ['simultaneity', 'openness', 'trace'],
].map((ids) => Object.freeze(ids)));

export const ARCHETYPE_CATALOG = Object.freeze(Object.fromEntries(
  MEANING_BASE_IDS.flatMap((familyId, familyIndex) => COMBINATIONS.map((modifierIds, index) => {
    const combination = modifierIds.join('+') || 'none';
    const meaningKey = `meaning-v${MEANING_VERSION}:${familyId}:${combination}`;
    const prefix = `archetype.${familyId}.${combination}`;
    return [meaningKey, Object.freeze({
      id: meaningKey, meaningKey, meaningVersion: MEANING_VERSION,
      narrativeVersion: ARCHETYPE_NARRATIVE_VERSION, familyId, modifierIds,
      title: t(`${prefix}.title`), reading: t(`${prefix}.reading`),
      order: familyIndex * COMBINATIONS.length + index,
    })];
  })),
));

/** Only consume a complete, supported DTO. Never coerce unknowns to absence. */
export function getGlyphArchetype(interpretation) {
  if (!interpretation || interpretation.status !== 'complete'
    || interpretation.meaningVersion !== MEANING_VERSION
    || interpretation.morphologyVersion !== MORPHOLOGY_VERSION
    || !MEANING_BASE_IDS.includes(interpretation.baseMeaning)
    || !MEANING_MODIFIER_IDS.every((id) => typeof interpretation.modifiers?.[id] === 'boolean')) return null;
  const modifiers = MEANING_MODIFIER_IDS.filter((id) => interpretation.modifiers[id]);
  const key = `meaning-v${MEANING_VERSION}:${interpretation.baseMeaning}:${modifiers.join('+') || 'none'}`;
  return interpretation.meaningKey === key && Object.hasOwn(ARCHETYPE_CATALOG, key)
    ? ARCHETYPE_CATALOG[key] : null;
}
