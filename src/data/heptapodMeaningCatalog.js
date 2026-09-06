import { sourceText as t } from '../i18n/messages.js';
/** Project interpretations of observed morphology, not translations or traits. */
export const MEANING_VERSION = 1;
export const MORPHOLOGY_VERSION = 1;
export const MEANING_BASE_IDS = Object.freeze(['arrival', 'reception', 'reciprocity']);
export const MEANING_MODIFIER_IDS = Object.freeze(['simultaneity', 'openness', 'trace']);

export const MEANING_CATALOG = Object.freeze({
  arrival: Object.freeze({
    id: 'arrival', label: t('heptapodMeaningCatalog.arrival'),
    description: t('heptapodMeaningCatalog.outwardFacingFocusesAreReadAsA'),
  }),
  reception: Object.freeze({
    id: 'reception', label: t('heptapodMeaningCatalog.reception'),
    description: t('heptapodMeaningCatalog.inwardFacingFocusesAreReadAsReceiving'),
  }),
  reciprocity: Object.freeze({
    id: 'reciprocity', label: t('heptapodMeaningCatalog.reciprocity'),
    description: t('heptapodMeaningCatalog.inwardAndOutwardFocusesTogetherAreRead'),
  }),
  simultaneity: Object.freeze({
    id: 'simultaneity', label: t('heptapodMeaningCatalog.simultaneity'),
    description: t('heptapodMeaningCatalog.distantOpposingFocusesAreReadAsDifferent'),
  }),
  openness: Object.freeze({
    id: 'openness', label: t('heptapodMeaningCatalog.openness'),
    description: t('heptapodMeaningCatalog.anOpenSectionOfTheRingIs'),
  }),
  trace: Object.freeze({
    id: 'trace', label: t('heptapodMeaningCatalog.trace'),
    description: t('heptapodMeaningCatalog.multiplePeaksOfPooledInkAreRead'),
  }),
});

/** Stable catalog order, independent of caller ordering and duplicate IDs. */
export function meaningTitle(ids = []) {
  const selected = new Set(Array.isArray(ids) ? ids : []);
  const labels = [...MEANING_BASE_IDS, ...MEANING_MODIFIER_IDS]
    .filter((id) => selected.has(id)).map((id) => MEANING_CATALOG[id].label);
  return labels.length ? labels.join(' · ') : t('glyphDetailPage.unconfirmed');
}
