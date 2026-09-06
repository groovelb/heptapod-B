import { useI18n } from '../../i18n/useI18n.js';
import { sourceText as t } from '../../i18n/messages.js';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import GlyphNode from './GlyphNode';
import { getMorphologyObservations, isMorphologyRelation, morphologyRelationLabel } from '../../utils/heptapod/resonanceView';

const KINDS = { branch: t('glyphPairComparison.branchStructure'), opening: t('glyphPairComparison.opening'), ink: t('glyphPairComparison.inkDistribution'), ring: t('glyphPairComparison.ringContour'), question: t('resonanceList.questionHook') };
const morphologyOf = (neighbor) => (neighbor.relations?.length ? neighbor.relations : [neighbor])
  .filter(isMorphologyRelation);

/**
 * ResonanceList — 근거 선택과 중심 이동을 분리한 전체 이웃 목록.
 * @param {string} centerName - 중심 이름
 * @param {Array} relations - 이웃 ID별로 병합. 각 항목의 relations에 복수 근거를 담는다.
 * @param {function} onNodeSelect - 중심을 이동할 이웃 ID 전달
 * @param {function} onInspect - 설명할 이웃 객체 전달
 * @param {boolean} loading - 계산/조회 중
 * @param {string|Error} error - 실패 원인 (빈 관계와 구분)
 * @param {function} onRetry - 조회 재시도
 * @param {string} emptyMessage - 현재 조회 범위에 연결이 없을 때 설명
 * @param {object} sx - 추가 MUI sx
 */
export default function ResonanceList({
  centerName, relations = [], onNodeSelect, onInspect, loading = false,
  error, onRetry, emptyMessage = t('resonanceList.noExplainableResonanceInFormWasFound'), sx = {},
}) {
  const { localize, t } = useI18n();
  const theme = useTheme();
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const fog = theme.palette.custom?.chamber?.fog || theme.palette.background.paper;
  const actionSx = { color: ink, borderColor: alpha(ink, 0.35), minHeight: 44, fontSize: '0.8rem' };
  const visible = relations.filter((neighbor) => morphologyOf(neighbor).length > 0);
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const needsServerUpdate = localize(errorMessage) === t('resonanceList.updateTheFormResonanceServerAndTry');
  return (
    <Box sx={ { color: ink, bgcolor: fog, border: '1px solid', borderColor: alpha(ink, 0.2), ...sx } }>
      <Box sx={ { px: 2, py: 2, borderBottom: '1px solid', borderColor: alpha(ink, 0.16) } }>
        <Typography component="h2" sx={ { fontSize: '1rem', fontWeight: 500 } }>{ centerName }{ t('resonanceList.sGlyphResonatingForms') }</Typography>
        { !loading && !error && <Typography variant="body2" sx={ { mt: 0.5, color: alpha(ink, 0.8) } }>{ visible.length }{ t('resonanceList.glyphsInspectSimilarFeaturesAndKeepExploring') }</Typography> }
      </Box>
      { loading ? (
        <Box role="status" sx={ { p: 3, display: 'flex', alignItems: 'center', gap: 1.5 } }>
          <CircularProgress size={ 18 } color="inherit" /> <Typography variant="body2">{ t('resonanceList.comparingTheFormsOfEncodedGlyphs') }</Typography>
        </Box>
      ) : error ? (
        <Box role="alert" sx={ { p: 3 } }>
          <Typography variant="body2">{ needsServerUpdate ? localize(errorMessage) : t('resonanceList.formObservationsCouldNotBeLoadedTry') }</Typography>
          { onRetry && <Button onClick={ onRetry } sx={ { ...actionSx, mt: 1 } }>{ t('archiveClusterExplorer.tryAgain') }</Button> }
        </Box>
      ) : visible.length === 0 ? (
        <Typography role="status" variant="body2" sx={ { p: 3, lineHeight: 1.7 } }>{ localize(emptyMessage) }</Typography>
      ) : (
        <List disablePadding aria-label={ t('resonanceList.glyphsResonatingWithSForm', { p0: centerName }) }>
          { visible.map((neighbor) => {
            const evidence = morphologyOf(neighbor);
            const form = evidence.find((item) => item.relationType === 'FORM');
            const observations = evidence.flatMap(getMorphologyObservations);
            const level = form ? form.evidence?.level || form.components?.level : 'variant';
            const levelLabel = morphologyRelationLabel(form || evidence[0]);
            const labels = [...new Set(observations.map((item) => KINDS[item.kind]).filter(Boolean))];
            const reason = localize(observations[0]?.reason) || localize(evidence.find((item) => item.relationType === 'VARIANT')?.reasons?.[0]);
            return (
              <ListItem key={ neighbor.id } disableGutters data-resonance-level={ level } sx={ {
                display: 'block', p: 2, borderBottom: '1px solid', borderColor: alpha(ink, 0.12), '&:last-child': { borderBottom: 0 },
              } }>
                <Box sx={ { display: 'flex', alignItems: 'center', gap: 1.5 } }>
                  <GlyphNode model={ neighbor.model } size={ 56 } />
                  <Box sx={ { flex: 1, minWidth: 0 } }>
                    <Typography sx={ { fontFamily: "'Cinzel', 'Noto Serif KR', Georgia, serif", overflowWrap: 'anywhere' } }>{ neighbor.name }</Typography>
                    <Typography variant="caption" sx={ { display: 'block', mt: 0.5, color: alpha(ink, 0.8) } }>{ localize([levelLabel, ...labels].join(' · ')) }</Typography>
                    <Typography variant="body2" sx={ { mt: 0.75, lineHeight: 1.6 } }>{ reason || t('resonanceList.exploreTheRecordedFormObservations') }</Typography>
                  </Box>
                </Box>
                <Box sx={ { display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.25 } }>
                  { onInspect && <Button variant="outlined" onClick={ () => onInspect(neighbor) } aria-label={ t('resonanceList.viewResonatingFeaturesOfSGlyph', { p0: neighbor.name }) } sx={ actionSx }>{ t('resonanceList.viewResonatingFeatures') }{ observations.length > 1 ? t('resonanceList.points', { p0: observations.length }) : '' }</Button> }
                  { onNodeSelect && <Button onClick={ () => onNodeSelect(neighbor.id) } aria-label={ t('resonanceList.exploreFromSGlyph', { p0: neighbor.name }) } sx={ actionSx }>{ t('glyphPairComparison.exploreFromThisGlyph') }</Button> }
                </Box>
              </ListItem>
            );
          }) }
        </List>
      ) }
    </Box>
  );
}
