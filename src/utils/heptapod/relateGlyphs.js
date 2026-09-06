import { sourceText as t } from '../../i18n/messages.js';
/** v3 graph: transformed visual morphology only. Raw names are not inputs. */
import { extractGlyphFeatures } from './extractGlyphFeatures.js';
import { scoreFormRelation } from './scoreFormRelation.js';
import { buildRelationReasons } from './buildRelationReasons.js';
import { sameRenderedBody, normalizeAngle } from './morphology.js';

export const RELATION_ALGORITHM_VERSION = 3;

function hooksEqual(a, b) {
  if (!a || !b) return !a && !b;
  return a.ang === b.ang && a.curl === b.curl && a.len === b.len;
}

/** Only stored model_data and IDs are consulted. No names, spelling, tags,
 * encoder labels, cached feature vectors, semantic similarity, or name merging. */
export function relateGlyphs(a, b) {
  if (a?.id != null && a.id === b?.id) return [];
  if (!a?.model_data || !b?.model_data) throw new TypeError(t('relateGlyphs.storedGlyphsAreRequiredToCompareRelations'));
  const featuresA = extractGlyphFeatures(a.model_data);
  const featuresB = extractGlyphFeatures(b.model_data);
  const relation = (relationType, score, components, basis) => ({
    relationType, score, components,
    reasons: buildRelationReasons(relationType, components),
    evidence: { basis, ...components },
    algorithmVersion: RELATION_ALGORITHM_VERSION,
    directed: false, sourceId: a.id ?? null, targetId: b.id ?? null,
  });

  if (!hooksEqual(featuresA.questionHook, featuresB.questionHook)
    && sameRenderedBody(a.model_data, b.model_data)) {
    const hookA = featuresA.questionHook; const hookB = featuresB.questionHook;
    const anchor = (hook, other) => ({ ang: normalizeAngle((hook || other).ang) });
    const observations = [{
      kind: 'question',
      reason: t('relateGlyphs.theRingAndBranchBodiesMatchOnly'),
      similarity: 1,
      anchorA: anchor(hookA, hookB), anchorB: anchor(hookB, hookA),
      hookPresentA: Boolean(hookA), hookPresentB: Boolean(hookB),
    }];
    return [relation('VARIANT', 1, {
      level: 'whole-form', wholeScore: 1, bodyEqual: true, renderingSeedEqual: true, observations,
    }, 'rendered-variant')];
  }
  const form = scoreFormRelation(featuresA, featuresB);
  return form.pass ? [relation('FORM', form.score, form.components, 'rendered-form')] : [];
}
export default relateGlyphs;
