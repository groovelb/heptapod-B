import { MEANING_CATALOG } from '../../data/heptapodMeaningCatalog.js';
import { createTranslator } from '../../i18n/messages.js';

/** A presentation of the shared interpretation, never another classifier.
 * Accepts no name: changing a display name cannot change a reading or its anchors.
 * Clock positions are approximate labels; highlights retain exact renderer angles.
 */
export function buildMeaningReading(interpretation, locale = 'ko') {
  const { t, localize } = createTranslator(locale);
  if (!interpretation || interpretation.status === 'invalid') return [];
  const morphology = interpretation.morphology;
  if (!morphology) return [];
  const clock = (ang) => ((Math.round(ang * 6 / Math.PI) + 3) % 12 + 12) % 12 || 12;
  const focuses = morphology.focuses || [];
  const outward = focuses.filter((focus) => focus.dirBias === 1).length;
  const inward = focuses.filter((focus) => focus.dirBias === -1).length;
  return interpretation.observations.flatMap((observation) => {
    const term = MEANING_CATALOG[observation.meaningId];
    if (!term) return [];
    const anchors = observation.anchors.map((anchor, index) => ({ ...anchor, number: index + 1 }));
    let detail;
    switch (observation.meaningId) {
      case 'arrival': detail = t('meaningReading.outward', { count: outward }); break;
      case 'reception': detail = t('meaningReading.inward', { count: inward }); break;
      case 'reciprocity': detail = t('meaningReading.both', { outward, inward }); break;
      case 'simultaneity': detail = t('meaningReading.opposed'); break;
      case 'openness': detail = t('meaningReading.opening', { hour: clock(morphology.gap.ang) }); break;
      case 'trace': detail = t('meaningReading.ink', { count: morphology.inkPeakCount }); break;
      default: return [];
    }
    return [{ ...observation, anchors, label: localize(term.label), definition: localize(term.description), detail,
      locations: anchors.map((anchor) => {
        const focus = anchor.kind === 'branch' ? focuses.find((item) => item.clusterIndex === anchor.clusterIndex) : null;
        const direction = focus ? t(focus.dirBias === 1 ? 'meaningReading.outwardLabel' : 'meaningReading.inwardLabel') : '';
        return { number: anchor.number, text: t('meaningReading.location', { number: anchor.number, hour: clock(anchor.ang), direction }).trim() };
      }),
    }];
  });
}
