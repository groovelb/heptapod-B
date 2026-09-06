import { useI18n } from '../../i18n/useI18n.js';
import { sourceText as t } from '../../i18n/messages.js';
import { useId, useState } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import GlyphPairComparison from './GlyphPairComparison';
import { glyphLabel } from '../../utils/heptapod/resonanceView';

const KINDS = { 'whole-form': t('archiveClusterExplorer.wholeForm'), branch: t('archiveClusterExplorer.sharedBranches'), 'opening-ink': t('archiveClusterExplorer.openingsAndInk') };

/**
 * ArchiveClusterExplorer — 근거를 공유하는 중첩 군집의 선택·비교 표시부. 네트워크 없음.
 * @param {object} clusters - provider의 군집 DTO (아직 계산 전이면 null)
 * @param {Array} glyphs - 현재 공개 표본
 * @param {string} selectedId - null=전체, ungrouped=미소속, 또는 군집 ID
 * @param {function} onSelect - 갤러리 필터 변경
 * @param {boolean} loading - 군집 계산 중
 * @param {string} error - 군집 계산 실패
 * @param {function} onRetry - 계산 다시 시도
 * @param {function} onCompare - 공개 쌍의 비교/공유 화면으로 이동
 */
export default function ArchiveClusterExplorer({ clusters, glyphs = [], selectedId = null, onSelect, loading = false, error = null, onRetry, onCompare }) {
  const { localize, t } = useI18n();
  const theme = useTheme();
  const titleId = useId();
  const dialogTitleId = useId();
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const [showAll, setShowAll] = useState(false);
  const [compareId, setCompareId] = useState(null);
  const selected = clusters?.groups.find((group) => group.id === selectedId);
  const byId = new Map(glyphs.map((glyph) => [glyph.id, glyph]));
  const left = selected && byId.get(selected.members[0].glyphId);
  const comparison = selected?.members.find((member) => member.glyphId === compareId && member.relationToRepresentative);
  const right = comparison && byId.get(comparison.glyphId);
  const groupList = showAll ? clusters?.groups : clusters?.groups.slice(0, 8);
  const actionSx = { minHeight: 44, color: ink, borderColor: alpha(ink, 0.35) };
  const select = (id) => { setCompareId(null); onSelect?.(id); };
  return (
    <Box component="section" aria-labelledby={ titleId } sx={ { py: 3, borderTop: '1px solid', borderColor: alpha(ink, 0.2), color: ink } }>
      <Typography component="h2" id={ titleId } sx={ { fontFamily: "'Cinzel', 'Noto Serif KR', Georgia, serif", fontSize: { xs: '1.2rem', md: '1.6rem' }, mb: 1 } }>{ t('archiveClusterExplorer.differentNamesRecurringForms') }</Typography>
      <Typography variant="body2" sx={ { lineHeight: 1.8, mb: 2 } }>{ t('archiveClusterExplorer.findSharedStructuresInEncodedGlyphsA') }</Typography>
      { loading ? <Box role="status" sx={ { display: 'flex', gap: 1.5, alignItems: 'center', py: 2 } }><CircularProgress size={ 18 } color="inherit" /><Typography variant="body2">{ t('archiveClusterExplorer.comparingSharedFeaturesInPublicGlyphsYou') }</Typography></Box>
        : error ? <Alert severity="warning" action={ <Button color="inherit" onClick={ onRetry }>{ t('archiveClusterExplorer.tryAgain') }</Button> }>{ localize(error) }{ t('archiveClusterExplorer.youCanKeepBrowsingTheGallery') }</Alert>
          : clusters && <>
            <Typography variant="caption" sx={ { display: 'block', mb: 2, lineHeight: 1.8 } }>{ t('archiveClusterExplorer.inTheLoadedSample') }{ clusters.sampleSize }{ t('archiveClusterExplorer.comparisons') }{ clusters.groups.length }{ t('archiveClusterExplorer.clusters') }{ Object.values(clusters.memberships).filter((ids) => ids.length > 1).length }{ t('archiveClusterExplorer.glyphsInMultipleClusters') }{ clusters.invalidIds.length > 0 && t('archiveClusterExplorer.unreadableForms', { p0: clusters.invalidIds.length }) }
            </Typography>
            { (clusters.sampleTruncated || clusters.groupingTruncated) && <Alert severity="info" sx={ { mb: 2 } }>{ t('archiveClusterExplorer.onlySamplesAndClustersWithinTheCalculation') }</Alert> }
            <Box role="group" aria-label={ t('archiveClusterExplorer.archiveDisplayRange') } sx={ { display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 } }>
              <Button aria-pressed={ selectedId === null } variant={ selectedId === null ? 'outlined' : 'text' } onClick={ () => select(null) } sx={ actionSx }>{ t('archiveClusterExplorer.allGlyphs') }{ glyphs.length }</Button>
              <Button aria-pressed={ selectedId === 'ungrouped' } variant={ selectedId === 'ungrouped' ? 'outlined' : 'text' } onClick={ () => select('ungrouped') } sx={ actionSx }>{ t('archiveClusterExplorer.outsideCurrentClusters') }{ clusters.ungroupedIds.length }</Button>
            </Box>
            { clusters.groups.length === 0 ? <Typography role="status" variant="body2" sx={ { py: 2, lineHeight: 1.8 } }>{ t('archiveClusterExplorer.noClustersWithSharedFeaturesWereFound') }</Typography>
              : <Box role="group" aria-label={ t('archiveClusterExplorer.sharedFormClusters') } sx={ { display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1 } }>
                { groupList.map((group) => <Button key={ group.id } aria-pressed={ group.id === selectedId } onClick={ () => select(group.id) }
                  sx={ { ...actionSx, p: 2, border: '1px solid', borderColor: group.id === selectedId ? ink : alpha(ink, 0.2), borderRadius: 0, display: 'block', textAlign: 'left', textTransform: 'none', bgcolor: group.id === selectedId ? alpha(ink, 0.05) : 'transparent' } }>
                  <Typography component="span" variant="caption" sx={ { display: 'block', mb: 0.5 } }>{ localize(KINDS[group.kind]) } · { group.members.length }{ t('archiveClusterExplorer.glyphs') }</Typography>
                  <Typography component="span" sx={ { display: 'block', fontSize: '1rem', lineHeight: 1.6 } }>{ localize(group.title) }</Typography>
                  <Typography component="span" variant="body2" sx={ { display: 'block', mt: 1, overflowWrap: 'anywhere' } }>{ group.members.slice(0, 3).map((member) => glyphLabel(byId.get(member.glyphId))).join(' · ') }{ group.members.length > 3 ? t('archiveClusterExplorer.andMore', { p0: group.members.length - 3 }) : '' }</Typography>
                </Button>) }
              </Box> }
            { clusters.groups.length > 8 && <Button onClick={ () => setShowAll((value) => !value) } sx={ actionSx }>{ showAll ? t('archiveClusterExplorer.collapseClusters') : t('archiveClusterExplorer.showAllClusters', { p0: clusters.groups.length }) }</Button> }
            { selected && <Box role="status" sx={ { mt: 2, p: 2, borderLeft: '2px solid', borderColor: ink } }>
              <Typography variant="body2" sx={ { lineHeight: 1.8 } }>{ localize(selected.description) }</Typography>
              <Typography variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ selected.kind === 'whole-form' ? t('archiveClusterExplorer.theGlyphsBelowShareSimilaritiesAcrossTheir') : selected.kind === 'branch' ? t('archiveClusterExplorer.markerShowsTheBranchSharedByThis') : t('archiveClusterExplorer.markerShowsTheOpeningShowsTheSimilar') }{ t('archiveClusterExplorer.theseGroupsDoNotDescribeRelationshipsBetween') }</Typography>
              <Box sx={ { display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 } }>
                { selected.members.slice(1).map((member) => <Button key={ member.glyphId } onClick={ () => setCompareId(member.glyphId) } sx={ actionSx }>{ glyphLabel(left) } ↔ { glyphLabel(byId.get(member.glyphId)) }{ t('archiveClusterExplorer.comparison') }</Button>) }
              </Box>
            </Box> }
            { selectedId === 'ungrouped' && <Typography role="status" variant="body2" sx={ { mt: 2 } }>{ t('archiveClusterExplorer.thisGlyphIsOutsideTheCurrentClusters') }</Typography> }
          </> }
      <Dialog open={ Boolean(left && right) } onClose={ () => setCompareId(null) } fullWidth maxWidth="md" aria-labelledby={ dialogTitleId }>
        <DialogTitle id={ dialogTitleId }>{ t('archiveClusterExplorer.compareSharedClusterFeatures') }</DialogTitle>
        <DialogContent sx={ { p: 0 } }>{ left && right && <GlyphPairComparison key={ `${selected.id}:${right.id}` } leftGlyph={ left } rightGlyph={ right } relations={ [comparison.relationToRepresentative] } /> }</DialogContent>
        <DialogActions>
          { left && right && onCompare && <Button onClick={ () => onCompare(left.id, right.id) } sx={ actionSx }>{ t('archiveClusterExplorer.openComparisonAndSharing') }</Button> }
          <Button onClick={ () => setCompareId(null) } sx={ actionSx }>{ t('archiveClusterExplorer.close') }</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
