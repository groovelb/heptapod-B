import { useI18n } from '../../i18n/useI18n.js';
import { sourceText as t } from '../../i18n/messages.js';
import { useId, useState } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import { MEANING_BASE_IDS, MEANING_MODIFIER_IDS, MEANING_CATALOG } from '../../data/heptapodMeaningCatalog';
import { glyphLabel } from '../../utils/heptapod/resonanceView';
import { filterMeaningGlyphs } from '../../utils/heptapod/archiveDepthView';

const EMPTY_FILTER = { base: null, modifiers: [], groupId: null, status: 'all' };
const STATUSES = { all: t('archiveMeaningExplorer.allReadingStates'), partial: t('archiveMeaningExplorer.partiallyRead'), invalid: t('archiveMeaningExplorer.readingUnconfirmed') };

/** Kept for consumers of the earlier observation panel. */
// eslint-disable-next-line react-refresh/only-export-components
export { filterMeaningGlyphs };

/** 의미군 필터와 표본 범위의 순수 표시부. 계산·데이터 요청·갤러리 렌더는 부모가 담당한다.
 * @param {function} onCompare - 선택한 두 공개 구성원의 (leftId, rightId)로 의미 비교 이동
 */
export default function ArchiveMeaningExplorer({ meanings, glyphs = [], filter = EMPTY_FILTER, loading = false, error = null, onRetry, onFilterChange, onShare, onCompare }) {
  const { localize, t } = useI18n();
  const theme = useTheme();
  const titleId = useId();
  const comparisonId = useId();
  const [comparison, setComparison] = useState({ leftId: null, rightId: null });
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const current = { ...EMPTY_FILTER, ...filter, modifiers: filter?.modifiers || [] };
  const selectedGroup = meanings?.groups?.find((group) => group.id === current.groupId);
  const filtered = filterMeaningGlyphs(glyphs, meanings, current);
  const groupGlyphs = selectedGroup ? filterMeaningGlyphs(glyphs, meanings, { groupId: selectedGroup.id }) : [];
  const groupById = new Map(groupGlyphs.map((glyph) => [glyph.id, glyph]));
  const members = selectedGroup?.memberIds.map((id) => groupById.get(id)).filter(Boolean) || [];
  // Derive fallbacks from current membership; never retain an out-of-group ID.
  const leftId = groupById.has(comparison.leftId) ? comparison.leftId : members[0]?.id || '';
  const rightId = groupById.has(comparison.rightId) ? comparison.rightId : members.find((glyph) => glyph.id !== leftId)?.id || '';
  const canCompare = Boolean(leftId && rightId && leftId !== rightId);
  const actionSx = { minHeight: 44, color: ink, borderColor: alpha(ink, 0.35), '&:focus-visible': { outline: `2px solid ${ink}`, outlineOffset: 2 } };
  const update = (patch) => onFilterChange?.({ ...current, ...patch });
  const reset = () => onFilterChange?.({ ...EMPTY_FILTER, modifiers: [] });
  const familyCount = (id) => meanings?.families?.find((family) => family.id === id)?.memberIds.length || 0;
  const hasFilter = current.base || current.modifiers.length || current.groupId || current.status !== 'all';
  return (
    <Box component="section" aria-labelledby={ titleId } sx={ { py: 3, borderTop: '1px solid', borderColor: alpha(ink, 0.2), color: ink } }>
      <Typography component="h2" id={ titleId } sx={ { fontFamily: "'Cinzel', 'Noto Serif KR', Georgia, serif", fontSize: { xs: '1.2rem', md: '1.6rem' }, mb: 1 } }>{ t('archiveMeaningExplorer.meaningReadFromForm') }</Typography>
      <Typography variant="body2" sx={ { lineHeight: 1.8, mb: 2 } }>{ t('archiveMeaningExplorer.arrivalReceptionReciprocityExploreMeaningsReadFrom') }</Typography>
      { loading ? <Box role="status" sx={ { display: 'flex', alignItems: 'center', gap: 1.5, py: 2 } }><CircularProgress size={ 18 } color="inherit" /><Typography variant="body2">{ t('archiveMeaningExplorer.readingMeaningsInTheLoadedGlyphsYou') }</Typography></Box>
        : error ? <Box role="alert" sx={ { py: 2 } }><Typography variant="body2" sx={ { lineHeight: 1.8 } }>{ typeof error === 'string' ? localize(error) : localize(error.message) || t('archiveMeaningExplorer.theMeaningReadingCouldNotBeCompleted') }</Typography>{ onRetry && <Button onClick={ onRetry } sx={ actionSx }>{ t('archiveClusterExplorer.tryAgain') }</Button> }</Box>
          : !meanings ? <Typography role="status" variant="body2">{ t('archiveMeaningExplorer.noMeaningReadingsYet') }</Typography>
            : <>
              <Typography variant="caption" sx={ { display: 'block', mb: 1, lineHeight: 1.8 } }>{ t('archiveMeaningExplorer.currentPublicSample') }{ meanings.sampleSize }{ t('archiveMeaningExplorer.glyphsReadable') }{ meanings.analyzedCount }{ t('archiveMeaningExplorer.observedMeaningGroups') }{ meanings.groups.length }{ t('archiveMeaningExplorer.count') }{ t('archiveMeaningExplorer.meaningRulesVMorphologyV', { p0: meanings.meaningVersion, p1: meanings.morphologyVersion }) }
              </Typography>
              <Typography variant="caption" sx={ { display: 'block', mb: 2, lineHeight: 1.8 } }>
                { meanings.sampleTruncated ? t('archiveMeaningExplorer.onlyTheFirstLoadedRecordsWereRead', { p0: meanings.sampleLimit })
                  : meanings.sampleAtLimit ? t('archiveMeaningExplorer.theSampleLimitOfHasBeenReached', { p0: meanings.sampleLimit })
                    : t('archiveMeaningExplorer.theseResultsDescribeTheLoadedSampleNot') }
                { t('archiveMeaningExplorer.groupSizesMayChangeAsNewGlyphs') }
              </Typography>
              { meanings.sampleSize === 0 ? <Typography role="status" variant="body2" sx={ { py: 2 } }>{ t('archiveMeaningExplorer.thereAreNoPublicGlyphsInThis') }</Typography> : <>
                <Box role="group" aria-label={ t('archiveMeaningExplorer.selectOneBaseMeaning') } sx={ { mb: 2 } }>
                  <Typography variant="body2" sx={ { mb: 1 } }>{ t('archiveMeaningExplorer.baseMeaningSelectOne') }</Typography>
                  <Box sx={ { display: 'flex', flexWrap: 'wrap', gap: 1 } }>
                    <Button aria-pressed={ !current.base && !current.groupId } variant={ !current.base && !current.groupId ? 'outlined' : 'text' } onClick={ () => update({ base: null, groupId: null }) } sx={ actionSx }>{ t('archiveMeaningExplorer.allBaseMeanings') }</Button>
                    { MEANING_BASE_IDS.map((id) => <Button key={ id } aria-pressed={ current.base === id } variant={ current.base === id ? 'outlined' : 'text' }
                      onClick={ () => update({ base: current.base === id ? null : id, groupId: null }) } sx={ actionSx }>{ localize(MEANING_CATALOG[id].label) } { familyCount(id) }</Button>) }
                  </Box>
                  { current.base && <Typography variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ localize(MEANING_CATALOG[current.base]?.description) }</Typography> }
                </Box>
                <Box role="group" aria-label={ t('archiveMeaningExplorer.includeAllSelectedModifiers') } sx={ { mb: 2 } }>
                  <Typography variant="body2" sx={ { mb: 1 } }>{ t('archiveMeaningExplorer.additionalMeaningsIncludeAllSelected') }</Typography>
                  <Box sx={ { display: 'flex', flexWrap: 'wrap', gap: 1 } }>
                    { MEANING_MODIFIER_IDS.map((id) => <Button key={ id } aria-pressed={ current.modifiers.includes(id) } variant={ current.modifiers.includes(id) ? 'outlined' : 'text' }
                      onClick={ () => update({ groupId: null, modifiers: MEANING_MODIFIER_IDS.filter((value) => value === id ? !current.modifiers.includes(id) : current.modifiers.includes(value)) }) } sx={ actionSx }>{ localize(MEANING_CATALOG[id].label) } { familyCount(id) }</Button>) }
                  </Box>
                  <Typography variant="caption" sx={ { display: 'block', mt: 1, lineHeight: 1.8 } }>{ t('archiveMeaningExplorer.countsShowGlyphsWithEachConfirmedMeaning') }</Typography>
                </Box>
                <Box role="group" aria-label={ t('archiveMeaningExplorer.meaningReadingState') } sx={ { display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 } }>
                  { Object.entries(STATUSES).map(([id, label]) => <Button key={ id } aria-pressed={ current.status === id } variant={ current.status === id ? 'outlined' : 'text' }
                    onClick={ () => update({ status: id, groupId: null }) } sx={ actionSx }>{ localize(label) }{ id === 'partial' ? ` ${meanings.partialIds.length}` : id === 'invalid' ? ` ${meanings.invalidIds.length}` : '' }</Button>) }
                </Box>
                <Box component="details" open={ current.groupId ? true : undefined } sx={ { mb: 2, '& summary': { cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', fontSize: '0.9rem', textDecoration: 'underline' }, '& summary:focus-visible': { outline: `2px solid ${ink}`, outlineOffset: 2 } } }>
                  <Box component="summary">{ t('archiveMeaningExplorer.observedMeaningGroups2') }{ meanings.groups.length }{ t('archiveMeaningExplorer.toExplore') }</Box>
                  <Typography variant="caption" sx={ { display: 'block', my: 1, lineHeight: 1.8 } }>{ t('archiveMeaningExplorer.groupsContainFullyReadGlyphsWithExactly') }</Typography>
                  <Box role="group" aria-label={ t('archiveMeaningExplorer.selectAnExactMeaningGroup') } sx={ { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1 } }>
                    { meanings.groups.map((group) => <Button key={ group.id } aria-pressed={ current.groupId === group.id } variant="outlined"
                      onClick={ () => onFilterChange?.({ ...EMPTY_FILTER, modifiers: [], groupId: current.groupId === group.id ? null : group.id }) }
                      sx={ { ...actionSx, borderColor: current.groupId === group.id ? ink : alpha(ink, 0.2), bgcolor: current.groupId === group.id ? alpha(ink, 0.05) : 'transparent', p: 1.5, borderRadius: 0, display: 'block', textAlign: 'left', textTransform: 'none' } }>
                      <Typography component="span" variant="body2" sx={ { display: 'block' } }>{ localize(group.title) } · { group.memberIds.length }{ t('archiveMeaningExplorer.count') }</Typography>
                    </Button>) }
                  </Box>
                  { meanings.groups.length === 0 && <Typography variant="body2">{ t('archiveMeaningExplorer.noFullyReadMeaningGroupsYet') }</Typography> }
                </Box>
                { selectedGroup && <Box sx={ { mb: 2 } }>
                  <Typography variant="body2" sx={ { lineHeight: 1.8 } }>{ localize(selectedGroup.reading) }</Typography>
                  { members.length === 1 && <Typography role="status" variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ t('archiveMeaningExplorer.thisGroupHasOneGlyphInThe') }</Typography> }
                  { onCompare && members.length >= 2 && <Box role="group" aria-label={ t('archiveMeaningExplorer.chooseTwoGlyphsFromThisMeaningGroup') } sx={ { mt: 2 } }>
                    <Typography variant="body2" sx={ { mb: 2, lineHeight: 1.8 } }>{ t('archiveMeaningExplorer.chooseTwoGlyphsWithSharedMeaningAnd') }</Typography>
                    <Box sx={ { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 } }>
                      { [['left', t('archiveMeaningExplorer.leftGlyph'), leftId], ['right', t('archiveMeaningExplorer.rightGlyph'), rightId]].map(([side, label, value]) => <FormControl key={ side } fullWidth size="small"
                        sx={ { minWidth: 0, '& .MuiInputLabel-root': { color: ink }, '& .MuiOutlinedInput-root': { color: ink, minHeight: 44 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(ink, 0.4) }, '& .MuiSelect-icon': { color: ink } } }>
                        <InputLabel id={ `${comparisonId}-${side}-label` }>{ localize(label) }</InputLabel>
                        <Select id={ `${comparisonId}-${side}` } labelId={ `${comparisonId}-${side}-label` } label={ localize(label) } value={ value }
                          onChange={ (event) => setComparison({ leftId, rightId, [`${side}Id`]: event.target.value }) }
                          MenuProps={ { slotProps: { paper: { sx: { maxHeight: 320, color: ink, bgcolor: theme.palette.custom?.chamber?.fog || theme.palette.background.paper } } } } }>
                          { members.map((glyph) => <MenuItem key={ glyph.id } value={ glyph.id } sx={ { minHeight: 44, whiteSpace: 'normal', overflowWrap: 'anywhere' } }>{ glyph.display_name || glyphLabel(glyph) || t('archiveMeaningExplorer.nameNotRecorded') }</MenuItem>) }
                        </Select>
                      </FormControl>) }
                    </Box>
                    { !canCompare && <Typography role="status" variant="body2" sx={ { mt: 1 } }>{ t('archiveMeaningExplorer.chooseTwoDifferentGlyphs') }</Typography> }
                    <Button variant="outlined" disabled={ !canCompare } onClick={ () => { if (canCompare) onCompare(leftId, rightId); } } sx={ { ...actionSx, mt: 2 } }>{ t('archiveMeaningExplorer.compareTheMeaningsOfTwoGlyphs') }</Button>
                  </Box> }
                </Box> }
                <Box role="status" aria-live="polite" sx={ { borderTop: '1px solid', borderColor: alpha(ink, 0.2), pt: 2 } }>
                  <Typography variant="body2">{ t('archiveMeaningExplorer.glyphsMatchingTheseFilters') }{ filtered.length }{ t('archiveMeaningExplorer.count') }</Typography>
                  { filtered.length === 0 && <Typography variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ t('archiveMeaningExplorer.noGlyphsInTheCurrentSampleMatch') }</Typography> }
                  { current.status === 'partial' && <Typography variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ t('archiveMeaningExplorer.onlyConfirmedMeaningsAreShownUnknownFeatures') }</Typography> }
                  { current.status === 'invalid' && <Typography variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ t('archiveMeaningExplorer.theseGlyphsLackEnoughFormDataFor') }</Typography> }
                </Box>
                <Box sx={ { display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 } }>
                  { hasFilter && <Button onClick={ reset } sx={ actionSx }>{ t('archiveMeaningExplorer.resetFilters') }</Button> }
                  { onShare && <Button onClick={ () => onShare({ ...current, modifiers: [...current.modifiers] }) } sx={ actionSx }>{ t('archiveMeaningExplorer.shareTheseMeaningFilters') }</Button> }
                </Box>
              </> }
              <Typography variant="caption" sx={ { display: 'block', mt: 2, lineHeight: 1.8, color: alpha(ink, 0.8) } }>{ t('archiveMeaningExplorer.meaningsAreThisProjectSInterpretationsOf') }</Typography>
            </> }
    </Box>
  );
}
