import { useI18n } from '../../i18n/useI18n.js';
import { sourceText as t } from '../../i18n/messages.js';
import { useId } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { MEANING_CATALOG } from '../../data/heptapodMeaningCatalog';
import { buildMeaningReading } from '../../utils/heptapod/buildMeaningReading';
import { getGlyphArchetype } from '../../data/heptapodArchetypeCatalog';

const STATUS_LABELS = { complete: t('glyphMeaningSummary.fullyRead'), partial: t('archiveMeaningExplorer.partiallyRead'), invalid: t('archiveMeaningExplorer.readingUnconfirmed') };

/** 실제 모델에서 계산된 의미 해석을 표시한다. 관측 선택과 탐색은 부모가 처리한다. */
export default function GlyphMeaningSummary({ interpretation, compact = false, variant = 'summary', selectedObservationId = null, onSelectObservation, onExplore, fg, sx = {} }) {
  const { locale, localize, t } = useI18n();
  const theme = useTheme();
  const titleId = useId();
  const ink = fg || theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const status = interpretation?.status || 'invalid';
  const invalid = status === 'invalid';
  const observations = invalid ? [] : interpretation?.observations || [];
  const title = invalid ? t('glyphMeaningSummary.thisMeaningCannotBeReadYet') : localize(interpretation.title) || t('glyphMeaningSummary.noMeaningsConfirmedYet');
  const actionSx = { minHeight: 44, color: ink, borderColor: alpha(ink, 0.35), '&:focus-visible': { outline: `2px solid ${ink}`, outlineOffset: 2 } };
  if (variant === 'reading' && !compact) {
    const archetype = getGlyphArchetype(interpretation);
    const entries = buildMeaningReading(interpretation, locale);
    const selected = entries.find((entry) => entry.id === selectedObservationId);
    return <Box component="section" aria-labelledby={ titleId } data-meaning-status={ status } data-meaning-reading data-reading-archetype={ archetype?.id } sx={ { color: ink, ...sx } }>
      <Typography sx={ { fontSize: 11, letterSpacing: '0.12em', mb: 1 } }>{ t('meaningReading.eyebrow') }</Typography>
      <Typography id={ titleId } component="h2" sx={ { m: 0, fontSize: 21, fontWeight: 400, lineHeight: 1.6 } }>{ archetype ? localize(archetype.title) : title }</Typography>
      { entries.length > 0 && <Box role="group" aria-label={ t('meaningReading.choose') } sx={ { display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5, mb: 1 } }>
        { entries.map((entry) => <Button key={ entry.id } data-reading-meaning={ entry.meaningId }
          aria-pressed={ selected?.id === entry.id }
          onClick={ () => onSelectObservation?.(selected?.id === entry.id ? null : entry) }
          sx={ { ...actionSx, minWidth: 0, px: 1, borderRadius: 0, fontSize: 14, textTransform: 'none', borderBottom: '1px solid', borderColor: selected?.id === entry.id ? ink : 'transparent' } }>
          { entry.label }
        </Button>) }
      </Box> }
      <Box data-reading-detail aria-live="polite" aria-atomic="true" data-lenis-prevent
        sx={ { height: 280, overflowY: 'auto', overscrollBehavior: 'contain', pr: 0.5, pt: 1 } }>
        { archetype && <Typography data-archetype-narrative sx={ { fontSize: 14, lineHeight: 1.85, mb: 2 } }>{ localize(archetype.reading) }</Typography> }
        { invalid ? <Typography sx={ { fontSize: 14, lineHeight: 1.8 } }>{ t('glyphMeaningSummary.thereIsNotEnoughFormDataTo') }</Typography>
          : selected ? <>
            <Typography sx={ { fontSize: 11, mb: 0.75 } }>{ t(selected.meaningId === interpretation.baseMeaning ? 'meaningReading.base' : 'meaningReading.modifier') }</Typography>
            <Typography data-reading-definition sx={ { fontSize: 14, lineHeight: 1.85 } }>{ selected.definition }</Typography>
            <Typography sx={ { fontSize: 11, mt: 2, mb: 0.75 } }>{ t('meaningReading.here') }</Typography>
            <Typography data-reading-evidence sx={ { fontSize: 14, lineHeight: 1.85 } }>{ selected.detail }</Typography>
            <Box component="ol" aria-label={ t('glyphMeaningSummary.formEvidenceForMeaning') } sx={ { listStyle: 'none', m: 0, p: 0, mt: 1, display: 'flex', flexWrap: 'wrap', columnGap: 1.5 } }>
              { selected.locations.map((location) => <Typography component="li" key={ location.number } sx={ { fontSize: 11, lineHeight: 1.8 } }>{ location.text }</Typography>) }
            </Box>
          </> : <>
            <Typography sx={ { fontSize: 14, lineHeight: 1.85 } }>{ archetype ? t('archetypeReading.invitation') : entries.length ? t('meaningReading.intro') : t('glyphMeaningSummary.noMeaningsConfirmedYet') }</Typography>
            { !archetype && entries.length > 0 && <Typography sx={ { mt: 2, fontSize: 13, lineHeight: 1.85 } }>{ t('meaningReading.individual') }</Typography> }
          </> }
      </Box>
      { status === 'partial' && <Typography role="status" sx={ { mt: 1, fontSize: 12, lineHeight: 1.8 } }>{ t('meaningReading.partial') }</Typography> }
      <Typography sx={ { mt: 1.5, fontSize: 11, lineHeight: 1.8, color: alpha(ink, 0.8) } }>{ t('meaningReading.disclaimer') }</Typography>
      { onExplore && !invalid && entries.length > 0 && <Button onClick={ () => onExplore(interpretation) } sx={ { ...actionSx, mt: 1.5 } }>{ t('glyphMeaningSummary.exploreGlyphsWithThisMeaning') }</Button> }
    </Box>;
  }
  return (
    <Box component="section" aria-labelledby={ titleId } data-meaning-status={ status } sx={ { color: ink, ...sx } }>
      <Typography id={ titleId } component={ compact ? 'p' : 'h2' } sx={ { m: 0, fontSize: compact ? '0.9rem' : '1.2rem', fontWeight: 400, lineHeight: 1.7 } }>{ localize(title) }</Typography>
      <Typography variant="caption" sx={ { display: 'block', mt: 0.5, lineHeight: 1.8, color: alpha(ink, 0.8) } }>
        { localize(STATUS_LABELS[status] || STATUS_LABELS.invalid) }{ t('glyphMeaningSummary.meaningReadFromForm') }</Typography>
      { !compact && <>
        <Typography variant="body2" sx={ { mt: 1.5, lineHeight: 1.8 } }>
          { invalid ? t('glyphMeaningSummary.thereIsNotEnoughFormDataTo') : localize(interpretation.reading) || t('glyphMeaningSummary.exploreTheConfirmedFormObservationsBelow') }
        </Typography>
        { status === 'partial' && <Typography role="status" variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ t('glyphMeaningSummary.onlyConfirmedFeaturesHaveBeenReadUnknown') }</Typography> }
        { observations.length > 0 && <Box sx={ { mt: 2 } }>
          <Typography variant="body2" sx={ { mb: 1 } }>{ t('glyphMeaningSummary.theFormBehindThisReading') }</Typography>
          <Box component="ol" aria-label={ t('glyphMeaningSummary.formEvidenceForMeaning') } sx={ { m: 0, pl: onSelectObservation ? 0 : 3, listStyle: onSelectObservation ? 'none' : 'decimal' } }>
            { observations.map((observation, index) => <Box component="li" key={ observation.id } sx={ { mb: 1 } }>
              { onSelectObservation ? <Button
                aria-pressed={ selectedObservationId === observation.id }
                onClick={ () => onSelectObservation(selectedObservationId === observation.id ? null : observation) }
                variant={ selectedObservationId === observation.id ? 'outlined' : 'text' }
                sx={ { ...actionSx, width: '100%', p: 1.5, display: 'block', textAlign: 'left', textTransform: 'none', borderRadius: 0 } }
              >
                <Typography component="span" variant="body2" sx={ { display: 'block', fontWeight: 500 } }>{ index + 1 }. { localize(MEANING_CATALOG[observation.meaningId]?.label) || t('glyphMeaningSummary.formObservation') }</Typography>
                <Typography component="span" variant="body2" sx={ { display: 'block', mt: 0.5, lineHeight: 1.8 } }>{ localize(observation.reason) }</Typography>
              </Button> : <Typography variant="body2" sx={ { lineHeight: 1.8 } }>{ localize(observation.reason) }</Typography> }
            </Box>) }
          </Box>
          { onSelectObservation && <Typography variant="caption" sx={ { display: 'block', lineHeight: 1.8 } }>{ t('glyphMeaningSummary.selectAnObservationToMarkThatPart') }</Typography> }
        </Box> }
        <Typography variant="caption" sx={ { display: 'block', mt: 2, lineHeight: 1.8, color: alpha(ink, 0.8) } }>{ t('glyphMeaningSummary.thisIsTheProjectSInterpretationOf') }{ interpretation?.meaningVersion && t('glyphMeaningSummary.meaningRulesV', { p0: interpretation.meaningVersion }) }
          { interpretation?.morphologyVersion && t('glyphMeaningSummary.morphologyV', { p0: interpretation.morphologyVersion }) }
        </Typography>
        { onExplore && !invalid && interpretation?.meaningIds?.length > 0 && <Button variant="outlined" onClick={ () => onExplore(interpretation) } sx={ { ...actionSx, mt: 2 } }>{ t('glyphMeaningSummary.exploreGlyphsWithThisMeaning') }</Button> }
      </> }
    </Box>
  );
}
