import { sourceText as t } from '../../i18n/messages.js';
import {
  MEANING_VERSION, MORPHOLOGY_VERSION, MEANING_BASE_IDS, MEANING_MODIFIER_IDS,
  MEANING_CATALOG, meaningTitle,
} from '../../data/heptapodMeaningCatalog.js';
import { classifyGlyphMorphology } from './classifyGlyphMorphology.js';

const BASE_BY_DIRECTION = { outward: 'arrival', inward: 'reception', mixed: 'reciprocity' };
const branchAnchor = (focus) => ({ kind: 'branch', ang: focus.ang, clusterIndex: focus.clusterIndex });

// Stable project-language composition: never include names, counts or exact angles.
function composeReading(base, modifiers) {
  if (!base) {
    if (modifiers.openness && modifiers.trace) return t('interpretGlyphMeaning.readAsAnOpenBoundaryWithTraces');
    if (modifiers.openness) return t('interpretGlyphMeaning.readAsLeavingSpaceForAnotherCurrent');
    if (modifiers.trace) return t('interpretGlyphMeaning.readAsLeavingTracesInSeveralPlaces');
    return t('interpretGlyphMeaning.noBaseOrAdditionalMeaningsHaveBeen');
  }
  const response = base === 'arrival'
    ? modifiers.openness ? t('interpretGlyphMeaning.aResponseReachingOutwardAcrossAnOpen') : t('interpretGlyphMeaning.aResponseReachingOutward')
    : base === 'reception'
      ? modifiers.openness ? t('interpretGlyphMeaning.aResponseLeavingRoomToReceiveOther') : t('interpretGlyphMeaning.aResponseReceivedInward')
      : modifiers.openness ? t('interpretGlyphMeaning.aResponseBothGivingAndReceivingAcross') : t('interpretGlyphMeaning.aResponseBothGivingAndReceiving');
  const context = [
    modifiers.simultaneity ? t('interpretGlyphMeaning.holdingDifferentMomentsTogether') : null,
    modifiers.trace ? t('interpretGlyphMeaning.leavingTracesInSeveralPlaces') : null,
  ].filter(Boolean).join(', ');
  return context ? t('meaning.readingWithContext', { p0: context, p1: response })
    : t('meaning.readingWithoutContext', { p0: response });
}

/** Project meaning is a reading of morphology, separate from precision relations. */
export function interpretGlyphMeaning(model) {
  const morphology = classifyGlyphMorphology(model);
  const status = morphology.status;
  const baseMeaning = BASE_BY_DIRECTION[morphology.direction] || null;
  const modifiers = {
    simultaneity: morphology.hasOpposedPair,
    openness: status === 'invalid' ? null : morphology.ring === 'open',
    trace: morphology.inkPeakCount == null || morphology.inkPeakCount === 0
      ? null : morphology.inkPeakCount >= 2,
  };
  const meaningIds = [...(baseMeaning ? [baseMeaning] : []),
    ...MEANING_MODIFIER_IDS.filter((id) => modifiers[id] === true)];
  const selectedModifiers = MEANING_MODIFIER_IDS.filter((id) => modifiers[id] === true);
  const meaningKey = status === 'complete'
    ? `meaning-v${MEANING_VERSION}:${baseMeaning}:${selectedModifiers.join('+') || 'none'}` : null;
  const observations = [];
  const add = (meaningId, reason, anchors) => observations.push({
    id: `meaning-v${MEANING_VERSION}:${meaningId}`, meaningId, reason, anchors,
  });
  if (baseMeaning) {
    const shape = baseMeaning === 'arrival' ? t('interpretGlyphMeaning.aFormWithAllFocusesFacingOutward')
      : baseMeaning === 'reception' ? t('interpretGlyphMeaning.aFormWithAllFocusesFacingInward')
        : t('interpretGlyphMeaning.aFormWithBothInwardAndOutward');
    add(baseMeaning, t('interpretGlyphMeaning.readAs2', { p0: shape, p1: MEANING_CATALOG[baseMeaning].label }),
      morphology.focuses.map(branchAnchor));
  }
  if (modifiers.simultaneity === true) {
    const degrees = Number((morphology.maxFocusDistance * 180 / Math.PI).toFixed(1));
    add('simultaneity', t('interpretGlyphMeaning.focusesAboutApartOnTheRingAre', { p0: degrees }),
      morphology.furthestPair.map((index) => branchAnchor(morphology.focuses.find((focus) => focus.clusterIndex === index))));
  }
  if (modifiers.openness === true) {
    add('openness', t('interpretGlyphMeaning.theOpenSectionOfTheRingIs'), [{ kind: 'opening', ...morphology.gap }]);
  }
  if (modifiers.trace === true) {
    add('trace', t('interpretGlyphMeaning.thePeaksInThePooledInkDistribution', { p0: morphology.inkPeakCount }),
      morphology.inkPeaks.map((peak) => ({ kind: 'ink', ang: peak.ang })));
  }
  const title = status === 'invalid' ? t('interpretGlyphMeaning.unreadable') : meaningTitle(meaningIds);
  const reading = status === 'invalid' ? t('interpretGlyphMeaning.thisGlyphSFormCannotBeRead')
    : composeReading(baseMeaning, modifiers);
  return {
    meaningVersion: MEANING_VERSION, morphologyVersion: MORPHOLOGY_VERSION,
    status, morphology, baseMeaning, modifiers, meaningIds, meaningKey, title, reading, observations,
  };
}

/** Shared interpretations retain independent anchors on both models. No scores. */
export function compareGlyphMeanings(leftModel, rightModel) {
  const left = interpretGlyphMeaning(leftModel);
  const right = interpretGlyphMeaning(rightModel);
  const sharedMeaningIds = [...MEANING_BASE_IDS, ...MEANING_MODIFIER_IDS]
    .filter((id) => left.meaningIds.includes(id) && right.meaningIds.includes(id));
  const observations = sharedMeaningIds.map((meaningId) => {
    const a = left.observations.find((observation) => observation.meaningId === meaningId);
    const b = right.observations.find((observation) => observation.meaningId === meaningId);
    return {
      id: `meaning-v${MEANING_VERSION}:shared:${meaningId}`, meaningId,
      reason: t('interpretGlyphMeaning.theFormsObservedInEachGlyphAre', { p0: MEANING_CATALOG[meaningId].label }),
      anchorsA: a.anchors.map((anchor) => ({ ...anchor })),
      anchorsB: b.anchors.map((anchor) => ({ ...anchor })),
    };
  });
  const exactMeaningMatch = left.status === 'complete' && right.status === 'complete'
    && left.meaningKey === right.meaningKey;
  const reason = left.status === 'invalid' || right.status === 'invalid'
    ? t('interpretGlyphMeaning.sharedMeaningsCannotBeConfirmedBecauseAt')
    : exactMeaningMatch ? t('interpretGlyphMeaning.bothGlyphsAreReadAsTheSame', { p0: meaningTitle(sharedMeaningIds) })
      : sharedMeaningIds.length ? t('interpretGlyphMeaning.theTwoGlyphsShareTheInterpretation', { p0: meaningTitle(sharedMeaningIds) })
        : t('interpretGlyphMeaning.noSharedMeaningsWereFoundInThe');
  return { left, right, sharedMeaningIds, exactMeaningMatch, observations, reason };
}
