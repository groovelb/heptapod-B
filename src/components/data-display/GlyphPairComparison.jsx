import { useI18n } from '../../i18n/useI18n.js';
import { sourceText as t } from '../../i18n/messages.js';
import { useState } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import GlyphNode from './GlyphNode';
import GlyphMeaningSummary from './GlyphMeaningSummary';
import GlyphObservationOverlay from '../overlay-feedback/GlyphObservationOverlay';
import { MEANING_CATALOG } from '../../data/heptapodMeaningCatalog';
import { getMorphologyObservations, isMorphologyRelation, morphologyRelationLabel } from '../../utils/heptapod/resonanceView';
import { sameRenderedBody } from '../../utils/heptapod/morphology';
import { isRenderableGlyphModel } from '../../utils/heptapod/extractGlyphFeatures';

const OBSERVATION_LABELS = { branch: t('glyphPairComparison.branchStructure'), opening: t('glyphPairComparison.opening'), ink: t('glyphPairComparison.inkDistribution'), ring: t('glyphPairComparison.ringContour'), question: t('glyphPairComparison.questionVariant') };
const METRICS = {
  harmonicSim: t('glyphPairComparison.ringCurvature'), gapSim: t('glyphPairComparison.ringGap'), strandSim: t('glyphPairComparison.ringStrandCount'),
  inkScore: t('glyphPairComparison.pressureAndInkDistribution'), pressureSim: t('glyphPairComparison.pressureVariation'), inkLoadSim: t('glyphPairComparison.inkPooling'), dryBreakSim: t('glyphPairComparison.dryBrushDistribution'),
  ringScore: t('glyphPairComparison.overallRing'), clusterScore: t('glyphPairComparison.branchArrangement'),
  motifScore: t('glyphPairComparison.observedLocalStructures'),
};

function nameOf(glyph, unnamed) {
  return glyph?.display_name || (glyph?.canonical_name
    ? `${glyph.canonical_name}${glyph.is_interrogative && !glyph.canonical_name.endsWith('?') ? '?' : ''}`
    : glyph?.model_data?.meta?.name || unnamed);
}

/** 근거 문장을 먼저 표시하고 계산값은 요청할 때만 펼치는 공통 표시부. */
export function RelationEvidence({ relation }) {
  const { localize, t } = useI18n();
  const theme = useTheme();
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  if (!isMorphologyRelation(relation)) return null;
  const observations = getMorphologyObservations(relation);
  const reasons = observations.length ? observations.map((item) => item.reason) : relation.reasons || [];
  const components = relation.components || {};
  const metrics = Object.entries(METRICS).filter(([key]) => Number.isFinite(components[key]));
  return (
    <Box sx={ { py: 2, borderTop: '1px solid', borderColor: alpha(ink, 0.2) } }>
      <Typography component="h3" sx={ { fontSize: '1rem', fontWeight: 500, mb: 0.5 } }>{ localize(morphologyRelationLabel(relation)) }</Typography>
      <Typography variant="caption" sx={ { color: alpha(ink, 0.8) } }>{ t('glyphPairComparison.observedInTheStoredHeptapodBForm') }</Typography>
      { reasons.length ? reasons.map((reason) => (
        <Typography key={ reason } variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ localize(reason) }</Typography>
      )) : <Typography variant="body2" sx={ { mt: 1 } }>{ t('glyphPairComparison.theEvidenceForThisConnectionHasNot') }</Typography> }
      { (metrics.length > 0 || Number.isFinite(relation.score) || relation.algorithmVersion) && (
        <Box component="details" sx={ { mt: 1.5, '& summary': { cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', textDecoration: 'underline', fontSize: '0.8rem' }, '& summary:focus-visible': { outline: `2px solid ${ink}`, outlineOffset: 2 } } }>
          <Box component="summary">{ t('glyphPairComparison.showCalculationDetails') }</Box>
          <Box component="dl" sx={ { display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, m: 0, fontSize: '0.8rem', '& dd': { m: 0, fontVariantNumeric: 'tabular-nums' } } }>
            { Number.isFinite(relation.score) && <><Box component="dt">{ relation.relationType === 'VARIANT' ? t('glyphPairComparison.bodyMatch') : t('glyphPairComparison.wholeFormScore') }</Box><Box component="dd">{ relation.score.toFixed(3) }</Box></> }
            { metrics.map(([key, label]) => (
              <Box key={ key } sx={ { display: 'contents' } }><Box component="dt">{ localize(label) }</Box><Box component="dd">{ components[key].toFixed(3) }</Box></Box>
            )) }
          </Box>
          <Typography variant="caption" sx={ { mt: 1.5, display: 'block', lineHeight: 1.6, color: alpha(ink, 0.8) } }>{ t('glyphPairComparison.scoresShowHowCloselyEachObservedFeature') }{ relation.algorithmVersion ? t('glyphPairComparison.calculationRulesV', { p0: relation.algorithmVersion }) : '' }
          </Typography>
        </Box>
      ) }
    </Box>
  );
}

function GlyphFigure({ glyph, observations, activeObservation, side, onExplore, meaningAnchors, interpretation, invalidModel = false }) {
  const { t } = useI18n();
  const theme = useTheme();
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const model = glyph.model_data;
  const unavailableModel = invalidModel || !isRenderableGlyphModel(model);
  const name = nameOf(glyph, t('glyphPairComparison.unnamed'));
  const active = observations[activeObservation];
  const hookPresent = side === 'left' ? active?.hookPresentA : active?.hookPresentB;
  const anchors = meaningAnchors ?? (active ? [{ ...(side === 'left' ? active.anchorA : active.anchorB), kind: active.kind, number: activeObservation + 1 }] : []);
  return (
    <Box component="figure" sx={ { m: 0, minWidth: 0, textAlign: 'center' } }>
      <Box sx={ { position: 'relative', width: '100%', maxWidth: 248, mx: 'auto' } }>
        <GlyphNode model={ unavailableModel ? null : model } size={ 248 } sx={ { p: 0, border: 0, display: 'flex', width: '100%', '& canvas': { height: 'auto', aspectRatio: '1' },
          [theme.breakpoints.down('md')]: { '& [role="img"]:not(canvas)': { width: '100%', maxWidth: 248, height: 'auto', aspectRatio: '1' } } } } />
        { !unavailableModel && <GlyphObservationOverlay model={ model } anchors={ anchors } /> }
      </Box>
      <Typography component="figcaption" sx={ { fontFamily: "'Cinzel', 'Noto Serif KR', Georgia, serif", fontSize: { xs: '1rem', sm: '1.2rem' }, overflowWrap: 'anywhere', lineHeight: 1.8 } }>
        { name }
      </Typography>
      { meaningAnchors === undefined && active?.kind === 'question' && <Typography variant="caption" sx={ { display: 'block', mt: 1 } }>{ hookPresent ? t('glyphPairComparison.aQuestionHookAppearsAtTheMarked') : t('glyphPairComparison.thereIsNoQuestionHookAtThe') }</Typography> }
      { interpretation && <GlyphMeaningSummary interpretation={ interpretation } compact sx={ { mt: 1.5 } } /> }
      { onExplore && glyph.id && !glyph.is_local && glyph.id !== 'local' && !String(glyph.id).startsWith('local-') && (
        <Button onClick={ () => onExplore(glyph.id) } aria-label={ t('glyphPairComparison.exploreFrom', { p0: name }) } sx={ { mt: 1, minHeight: 44, color: ink, fontSize: '0.8rem' } }>{ t('glyphPairComparison.exploreFromThisGlyph') }</Button>
      ) }
    </Box>
  );
}

/**
 * GlyphPairComparison — 저장된 두 표식과 실제 계산 근거를 비교하는 순수 표시 컴포넌트.
 * @param {object} leftGlyph - 왼쪽 DB Glyph (model_data, canonical_name, id)
 * @param {object} rightGlyph - 오른쪽 DB Glyph
 * @param {Array} relations - relateGlyphs의 실제 결과
 * @param {object} meaningComparison - 별도 의미 비교 결과. 없으면 기존 정밀 비교만 표시
 * @param {string} initialView - 비제어 초기 보기: precision 또는 meaning
 * @param {string} view - 선택적 제어 보기. onViewChange와 함께 사용
 * @param {function} onViewChange - 선택한 reading 문자열
 * @param {function} onExplore - 탐색할 Glyph ID
 * @param {function} onShare - 현재 {reading, reason} 공유. 생략하면 공유 버튼을 표시하지 않음
 * @param {boolean} sharing - 공유 준비 중
 * @param {object} sx - 추가 MUI sx
 */
export default function GlyphPairComparison({ leftGlyph, rightGlyph, relations = [], meaningComparison, initialView = 'precision', view, onViewChange, onExplore, onShare, sharing = false, sx = {} }) {
  const { localize, t } = useI18n();
  const theme = useTheme();
  const [selectedObservation, setSelectedObservation] = useState(0);
  const [selectedMeaningObservation, setSelectedMeaningObservation] = useState(0);
  const [internalView, setInternalView] = useState(initialView);
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const fog = theme.palette.custom?.chamber?.fog || theme.palette.background.paper;
  if (!leftGlyph?.model_data || !rightGlyph?.model_data) return <Typography role="status">{ t('glyphPairComparison.twoGlyphsAreNeededForComparison') }</Typography>;

  let same = Boolean(leftGlyph.id && leftGlyph.id === rightGlyph.id);
  if (!same) {
    try {
      same = sameRenderedBody(leftGlyph.model_data, rightGlyph.model_data)
        && JSON.stringify(leftGlyph.model_data.questionHook ?? null) === JSON.stringify(rightGlyph.model_data.questionHook ?? null);
    } catch { same = false; } // An unreadable model is a presentation state, not a render failure.
  }
  const measuredRelations = relations.filter(isMorphologyRelation);
  const observations = measuredRelations.flatMap(getMorphologyObservations);
  const activeObservation = Math.min(selectedObservation, observations.length - 1);
  const firstReason = localize(observations[0]?.reason) || localize(measuredRelations[0]?.reasons?.[0]);
  const reading = meaningComparison && (view ?? internalView) === 'meaning' ? 'meaning' : 'precision';
  const meaningView = reading === 'meaning';
  const meaningInvalid = !meaningComparison?.left || !meaningComparison?.right
    || [meaningComparison.left.status, meaningComparison.right.status].includes('invalid');
  const meaningPartial = [meaningComparison?.left?.status, meaningComparison?.right?.status].includes('partial');
  const sharedMeaningIds = meaningComparison?.sharedMeaningIds || [];
  const meaningObservations = meaningInvalid ? [] : meaningComparison?.observations || [];
  const activeMeaningIndex = Math.min(selectedMeaningObservation, meaningObservations.length - 1);
  const activeMeaning = meaningObservations[activeMeaningIndex];
  const exactMeaning = !meaningInvalid && !meaningPartial && meaningComparison?.exactMeaningMatch;
  const meaningHeading = meaningInvalid ? t('glyphPairComparison.theMeaningsOfTheseGlyphsCannotBe')
    : exactMeaning ? t('glyphPairComparison.theseShareTheSameCombinedMeaning')
      : sharedMeaningIds.length ? t('glyphPairComparison.sharedMeaningsInDifferentForms') : t('glyphPairComparison.noSharedMeaningsConfirmed');
  const meaningReason = localize(meaningComparison?.reason) || (meaningInvalid ? t('glyphPairComparison.moreFormDataIsNeededToCompare')
    : sharedMeaningIds.length ? t('glyphPairComparison.onlyMeaningsConfirmedInBothFormsAre') : t('glyphPairComparison.noConfirmedMeaningsOverlapThisResultIs'));
  const selectedAnchors = (side) => (activeMeaning?.[side === 'left' ? 'anchorsA' : 'anchorsB'] || []).map((anchor, index) => ({ ...anchor, number: anchor.number ?? index + 1 }));
  const changeView = (next) => { if (view === undefined) setInternalView(next); onViewChange?.(next); };
  const shareReason = meaningView ? localize(activeMeaning?.reason) || meaningReason : localize(observations[activeObservation]?.reason) || firstReason
    || (same ? t('glyphPairComparison.youAreViewingTheSameFormAgain') : t('glyphPairComparison.noExplainableResonanceInFormWasFound'));
  return (
    <Box data-comparison-reading={ reading } sx={ { color: ink, bgcolor: fog, p: { xs: 2, sm: 3 }, ...sx } }>
      { meaningComparison && <Box role="group" aria-label={ t('glyphPairComparison.comparisonReadingMode') } sx={ { display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 } }>
        { [['meaning', t('glyphPairComparison.readMeanings')], ['precision', t('glyphPairComparison.comparePreciseForm')]].map(([value, label]) => <Button key={ value } aria-pressed={ reading === value }
          variant={ reading === value ? 'outlined' : 'text' } onClick={ () => changeView(value) }
          sx={ { minHeight: 44, color: ink, borderColor: alpha(ink, 0.4) } }>{ localize(label) }</Button>) }
      </Box> }
      <Typography component="h2" sx={ { fontSize: '1.2rem', fontWeight: 400, lineHeight: 1.6 } }>
        { meaningView ? meaningHeading : same ? t('glyphPairComparison.theseAreTheSameGlyph') : measuredRelations.length ? t('glyphPairComparison.resonanceDiscoveredAfterEncoding') : t('glyphPairComparison.exploreTheTwoGlyphsSideBySide') }
      </Typography>
      <Typography variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>
        { meaningView ? meaningReason : same ? t('glyphPairComparison.youAreViewingTheSameFormAgain') : firstReason || t('glyphPairComparison.noExplainableResonanceInFormWasFound') }
      </Typography>
      { meaningView && meaningPartial && !meaningInvalid && <Typography role="status" variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ t('glyphPairComparison.atLeastOneGlyphIsPartiallyRead') }</Typography> }
      <Box sx={ { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: { xs: 1, sm: 3 }, my: 3 } }>
        <GlyphFigure glyph={ leftGlyph } observations={ observations } activeObservation={ activeObservation } side="left" onExplore={ onExplore }
          meaningAnchors={ meaningView ? selectedAnchors('left') : undefined } interpretation={ meaningView ? meaningComparison.left : undefined } invalidModel={ meaningComparison?.left?.status === 'invalid' } />
        <GlyphFigure glyph={ rightGlyph } observations={ observations } activeObservation={ activeObservation } side="right" onExplore={ onExplore }
          meaningAnchors={ meaningView ? selectedAnchors('right') : undefined } interpretation={ meaningView ? meaningComparison.right : undefined } invalidModel={ meaningComparison?.right?.status === 'invalid' } />
      </Box>
      { meaningView ? <>
        { meaningObservations.length > 0 && <Box sx={ { mb: 2 } }>
          <Typography variant="body2" sx={ { mb: 1, lineHeight: 1.8 } }>{ t('glyphPairComparison.chooseASharedMeaningToMarkThe') }</Typography>
          <Box role="group" aria-label={ t('glyphPairComparison.formEvidenceForSharedMeanings') } sx={ { display: 'flex', gap: 1, flexWrap: 'wrap' } }>
            { meaningObservations.map((observation, index) => <Button key={ observation.id } color="inherit" variant={ activeMeaningIndex === index ? 'outlined' : 'text' }
              aria-pressed={ activeMeaningIndex === index } onClick={ () => setSelectedMeaningObservation(index) } sx={ { minHeight: 44 } }>{ localize(MEANING_CATALOG[observation.meaningId]?.label) || t('glyphMeaningSummary.formObservation') }</Button>) }
          </Box>
          <Typography role="status" variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ localize(activeMeaning?.reason) }</Typography>
          <Typography variant="caption" sx={ { display: 'block', mt: 1, lineHeight: 1.8 } }>{ t('glyphPairComparison.numbersMarkObservationsWithinEachGlyphThey') }</Typography>
        </Box> }
        <Typography variant="body2" sx={ { lineHeight: 1.8 } }>{ t('glyphPairComparison.sharedMeaningDoesNotImplyAPrecise') }</Typography>
        <Typography variant="caption" sx={ { display: 'block', mt: 1.5, lineHeight: 1.8, color: alpha(ink, 0.8) } }>{ t('glyphPairComparison.thisIsTheProjectSInterpretationOf') }{ meaningComparison.left?.meaningVersion && t('glyphMeaningSummary.meaningRulesV', { p0: meaningComparison.left.meaningVersion }) }
          { meaningComparison.left?.morphologyVersion && t('glyphMeaningSummary.morphologyV', { p0: meaningComparison.left.morphologyVersion }) }
        </Typography>
      </> : <>
      { observations.length > 0 && <Box sx={ { mb: 2 } }>
        <Typography variant="body2" sx={ { mb: 1, lineHeight: 1.7 } }>{ t('glyphPairComparison.inspectTheActualPartsOfEachGlyph') }</Typography>
        <Box role="group" aria-label={ t('glyphPairComparison.formObservationPoints') } sx={ { display: 'flex', gap: 1, flexWrap: 'wrap' } }>
          { observations.map((observation, index) => <Button key={ `${observation.kind}-${index}` }
            color="inherit" variant={ activeObservation === index ? 'outlined' : 'text' }
            aria-pressed={ activeObservation === index } onClick={ () => setSelectedObservation(index) }
            sx={ { minHeight: 44 } }>{ index + 1 }. { localize(OBSERVATION_LABELS[observation.kind]) }</Button>) }
        </Box>
        <Typography role="status" variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ localize(observations[activeObservation]?.reason) }</Typography>
      </Box> }
      { measuredRelations.some((relation) => relation.evidence?.level === 'shared-motif') && <Typography variant="body2" sx={ { mb: 2, lineHeight: 1.8 } }>{ t('glyphPairComparison.thisResonanceOccursInALocalStructure') }</Typography> }
      { measuredRelations.map((relation, index) => <RelationEvidence key={ `${relation.relationType}-${index}` } relation={ relation } />) }
      </> }
      { onShare && <Button variant="outlined" disabled={ sharing } onClick={ () => onShare({ reading, reason: shareReason }) } sx={ { mt: 2, color: ink, borderColor: alpha(ink, 0.4), minHeight: 44 } }>{ sharing ? t('glyphPairComparison.preparingToShare') : meaningView ? t('glyphPairComparison.shareThisMeaningComparison') : measuredRelations.length ? t('glyphPairComparison.shareThisConnection') : t('glyphPairComparison.shareThisComparison') }</Button> }
    </Box>
  );
}
