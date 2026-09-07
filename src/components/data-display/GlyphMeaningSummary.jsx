import { useI18n } from '../../i18n/useI18n.js';
import { sourceText as t } from '../../i18n/messages.js';
import { useId } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import GlyphObservationChips from '../input/GlyphObservationChips';
import Typography from '@mui/material/Typography';
import { MEANING_CATALOG } from '../../data/heptapodMeaningCatalog';
import { buildMeaningReading } from '../../utils/heptapod/buildMeaningReading';
import ArchetypeNarrative from './ArchetypeNarrative';
import ArchetypeMotto from './ArchetypeMotto';
import { getGlyphArchetype } from '../../data/heptapodArchetypeCatalog';

const STATUS_LABELS = { complete: t('glyphMeaningSummary.fullyRead'), partial: t('archiveMeaningExplorer.partiallyRead'), invalid: t('archiveMeaningExplorer.readingUnconfirmed') };

/** 실제 모델에서 계산된 의미 해석을 표시한다. 관측 선택과 탐색은 부모가 처리한다. */
export default function GlyphMeaningSummary({ interpretation, compact = false, variant = 'summary', selectedObservationIds = [], onToggleObservation, onExplore, fg, sx = {} }) {
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
    const selected = entries.filter((entry) => selectedObservationIds.includes(entry.id));
    return <Box component="section" aria-labelledby={ titleId } data-meaning-status={ status } data-meaning-reading data-reading-archetype={ archetype?.id } sx={ { color: ink, ...sx } }>
      <Typography sx={ { typography: 'editorialLabel', mb: theme.editorial.labelGap } }>{ t('meaningReading.eyebrow') }</Typography>
      <Typography id={ titleId } component="h2" sx={ { m: 0, typography: 'editorialTitle' } }>{ archetype ? localize(archetype.title) : title }</Typography>
      <ArchetypeMotto archetype={ archetype } />
      <GlyphObservationChips entries={ entries } selectedIds={ selectedObservationIds } onToggle={ onToggleObservation } fg={ ink } />
      <Box data-reading-detail tabIndex={ 0 } aria-live="polite" aria-atomic="true" data-lenis-prevent
        sx={ { height: (theme) => theme.editorial.readingViewport, overflowY: 'auto', overscrollBehavior: 'contain', pr: 0.5, pt: 1 } }>
        { archetype && <ArchetypeNarrative archetype={ archetype } showMotto={ false } variant={ selected.length ? 'compact' : 'full' } sx={ { mb: 2 } } /> }
        { invalid ? <Typography sx={ { typography: 'editorialBody' } }>{ t('glyphMeaningSummary.thereIsNotEnoughFormDataTo') }</Typography>
          : selected.length ? selected.map((entry) => <Box key={ entry.id } component="section" data-reading-selected={ entry.meaningId }
              sx={ { mt: theme.editorial.sectionGap, pt: theme.editorial.sectionPadding, ...theme.editorial.rule } }>
            <Typography component="h3" sx={ { typography: 'editorialLabel', mb: theme.editorial.labelGap } }>{ entry.label }</Typography>
            <Typography sx={ { typography: 'editorialLabel', mb: theme.editorial.labelGap } }>{ t(entry.meaningId === interpretation.baseMeaning ? 'meaningReading.base' : 'meaningReading.modifier') }</Typography>
            <Typography data-reading-definition sx={ { typography: 'editorialBody' } }>{ entry.definition }</Typography>
            <Typography sx={ { typography: 'editorialLabel', mt: theme.editorial.paragraphGap, mb: theme.editorial.labelGap } }>{ t('meaningReading.here') }</Typography>
            <Typography data-reading-evidence sx={ { typography: 'editorialBody' } }>{ entry.detail }</Typography>
            <Box component="ol" aria-label={ t('glyphMeaningSummary.formEvidenceForMeaning') } sx={ { listStyle: 'none', m: 0, p: 0, mt: 1, display: 'flex', flexWrap: 'wrap', columnGap: 1.5 } }>
              { entry.locations.map((location) => <Typography component="li" key={ location.number } sx={ { typography: 'editorialMeta' } }>{ location.text }</Typography>) }
            </Box>
          </Box>) : <>
            <Typography sx={ { typography: 'editorialBody' } }>{ archetype ? t('archetypeReading.invitation') : entries.length ? t('meaningReading.intro') : t('glyphMeaningSummary.noMeaningsConfirmedYet') }</Typography>
            { !archetype && entries.length > 0 && <Typography sx={ { mt: 2, typography: 'editorialBody' } }>{ t('meaningReading.individual') }</Typography> }
          </> }
      </Box>
      { status === 'partial' && <Typography role="status" sx={ { mt: 1, typography: 'editorialMeta' } }>{ t('meaningReading.partial') }</Typography> }
      <Typography sx={ { mt: 1.5, typography: 'editorialMeta', color: alpha(ink, 0.8) } }>{ t('meaningReading.disclaimer') }</Typography>
      { onExplore && !invalid && entries.length > 0 && <Button onClick={ () => onExplore(interpretation) } sx={ { ...actionSx, mt: 1.5 } }>{ t('glyphMeaningSummary.exploreGlyphsWithThisMeaning') }</Button> }
    </Box>;
  }
  return (
    <Box component="section" aria-labelledby={ titleId } data-meaning-status={ status } sx={ { color: ink, ...sx } }>
      <Typography id={ titleId } component={ compact ? 'p' : 'h2' } sx={ { m: 0, typography: compact ? 'editorialMeta' : 'editorialTitle' } }>{ localize(title) }</Typography>
      <Typography component="p" variant="editorialMeta" sx={ { display: 'block', mt: 0.5, color: alpha(ink, 0.8) } }>
        { localize(STATUS_LABELS[status] || STATUS_LABELS.invalid) }{ t('glyphMeaningSummary.meaningReadFromForm') }</Typography>
      { !compact && <>
        <Typography component="p" variant="editorialBody" sx={ { mt: 1.5 } }>
          { invalid ? t('glyphMeaningSummary.thereIsNotEnoughFormDataTo') : localize(interpretation.reading) || t('glyphMeaningSummary.exploreTheConfirmedFormObservationsBelow') }
        </Typography>
        { status === 'partial' && <Typography component="p" role="status" variant="editorialBody" sx={ { mt: 1 } }>{ t('glyphMeaningSummary.onlyConfirmedFeaturesHaveBeenReadUnknown') }</Typography> }
        { observations.length > 0 && <Box sx={ { mt: 2 } }>
          <Typography component="p" variant="editorialBody" sx={ { mb: 1 } }>{ t('glyphMeaningSummary.theFormBehindThisReading') }</Typography>
          <Box component="ol" aria-label={ t('glyphMeaningSummary.formEvidenceForMeaning') } sx={ { m: 0, pl: onToggleObservation ? 0 : 3, listStyle: onToggleObservation ? 'none' : 'decimal' } }>
            { observations.map((observation, index) => <Box component="li" key={ observation.id } sx={ { mb: 1 } }>
              { onToggleObservation ? <Button
                aria-pressed={ selectedObservationIds.includes(observation.id) }
                onClick={ () => onToggleObservation(observation) }
                variant={ selectedObservationIds.includes(observation.id) ? 'outlined' : 'text' }
                sx={ { ...actionSx, width: '100%', p: 1.5, display: 'block', textAlign: 'left', textTransform: 'none', borderRadius: 0 } }
              >
                <Typography component="span" variant="editorialBody" sx={ { display: 'block', fontWeight: 'fontWeightMedium' } }>{ index + 1 }. { localize(MEANING_CATALOG[observation.meaningId]?.label) || t('glyphMeaningSummary.formObservation') }</Typography>
                <Typography component="span" variant="editorialBody" sx={ { display: 'block', mt: 0.5 } }>{ localize(observation.reason) }</Typography>
              </Button> : <Typography component="p" variant="editorialBody">{ localize(observation.reason) }</Typography> }
            </Box>) }
          </Box>
          { onToggleObservation && <Typography component="p" variant="editorialMeta" sx={ { display: 'block' } }>{ t('glyphMeaningSummary.selectAnObservationToMarkThatPart') }</Typography> }
        </Box> }
        <Typography component="p" variant="editorialMeta" sx={ { display: 'block', mt: 2, color: alpha(ink, 0.8) } }>{ t('glyphMeaningSummary.thisIsTheProjectSInterpretationOf') }{ interpretation?.meaningVersion && t('glyphMeaningSummary.meaningRulesV', { p0: interpretation.meaningVersion }) }
          { interpretation?.morphologyVersion && t('glyphMeaningSummary.morphologyV', { p0: interpretation.morphologyVersion }) }
        </Typography>
        { onExplore && !invalid && interpretation?.meaningIds?.length > 0 && <Button variant="outlined" onClick={ () => onExplore(interpretation) } sx={ { ...actionSx, mt: 2 } }>{ t('glyphMeaningSummary.exploreGlyphsWithThisMeaning') }</Button> }
      </> }
    </Box>
  );
}
