import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import GlyphNode from './GlyphNode';
import { getMorphologyObservations, isMorphologyRelation, morphologyRelationLabel } from '../../utils/heptapod/resonanceView';

const KINDS = { branch: '가지 구조', opening: '개구부', ink: '잉크 분포', ring: '링 윤곽', question: '질문 갈고리' };
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
  error, onRetry, emptyMessage = '현재 살펴본 표식들에서는 설명할 수 있는 형태 공명을 찾지 못했어요.', sx = {},
}) {
  const theme = useTheme();
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const fog = theme.palette.custom?.chamber?.fog || theme.palette.background.paper;
  const actionSx = { color: ink, borderColor: alpha(ink, 0.35), minHeight: 44, fontSize: '0.8rem' };
  const visible = relations.filter((neighbor) => morphologyOf(neighbor).length > 0);
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const needsServerUpdate = errorMessage === '형태 공명 서버를 업데이트한 뒤 다시 시도해 주세요.';
  return (
    <Box sx={ { color: ink, bgcolor: fog, border: '1px solid', borderColor: alpha(ink, 0.2), ...sx } }>
      <Box sx={ { px: 2, py: 2, borderBottom: '1px solid', borderColor: alpha(ink, 0.16) } }>
        <Typography component="h2" sx={ { fontSize: '1rem', fontWeight: 500 } }>{ centerName }의 표식과 공명하는 형태</Typography>
        { !loading && !error && <Typography variant="body2" sx={ { mt: 0.5, color: alpha(ink, 0.8) } }>{ visible.length }개의 표식 · 닮은 부위를 살펴보고 탐색을 이어가세요.</Typography> }
      </Box>
      { loading ? (
        <Box role="status" sx={ { p: 3, display: 'flex', alignItems: 'center', gap: 1.5 } }>
          <CircularProgress size={ 18 } color="inherit" /> <Typography variant="body2">변환된 표식의 형태를 비교하고 있어요.</Typography>
        </Box>
      ) : error ? (
        <Box role="alert" sx={ { p: 3 } }>
          <Typography variant="body2">{ needsServerUpdate ? errorMessage : '형태 관측을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }</Typography>
          { onRetry && <Button onClick={ onRetry } sx={ { ...actionSx, mt: 1 } }>다시 시도</Button> }
        </Box>
      ) : visible.length === 0 ? (
        <Typography role="status" variant="body2" sx={ { p: 3, lineHeight: 1.7 } }>{ emptyMessage }</Typography>
      ) : (
        <List disablePadding aria-label={ `${centerName}의 표식과 형태가 공명하는 표식` }>
          { visible.map((neighbor) => {
            const evidence = morphologyOf(neighbor);
            const form = evidence.find((item) => item.relationType === 'FORM');
            const observations = evidence.flatMap(getMorphologyObservations);
            const level = form ? form.evidence?.level || form.components?.level : 'variant';
            const levelLabel = morphologyRelationLabel(form || evidence[0]);
            const labels = [...new Set(observations.map((item) => KINDS[item.kind]).filter(Boolean))];
            const reason = observations[0]?.reason || evidence.find((item) => item.relationType === 'VARIANT')?.reasons?.[0];
            return (
              <ListItem key={ neighbor.id } disableGutters data-resonance-level={ level } sx={ {
                display: 'block', p: 2, borderBottom: '1px solid', borderColor: alpha(ink, 0.12), '&:last-child': { borderBottom: 0 },
              } }>
                <Box sx={ { display: 'flex', alignItems: 'center', gap: 1.5 } }>
                  <GlyphNode model={ neighbor.model } size={ 56 } />
                  <Box sx={ { flex: 1, minWidth: 0 } }>
                    <Typography sx={ { fontFamily: "'Cinzel', 'Noto Serif KR', Georgia, serif", overflowWrap: 'anywhere' } }>{ neighbor.name }</Typography>
                    <Typography variant="caption" sx={ { display: 'block', mt: 0.5, color: alpha(ink, 0.8) } }>{ [levelLabel, ...labels].join(' · ') }</Typography>
                    <Typography variant="body2" sx={ { mt: 0.75, lineHeight: 1.6 } }>{ reason || '기록된 형태 관측을 확인해 보세요.' }</Typography>
                  </Box>
                </Box>
                <Box sx={ { display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.25 } }>
                  { onInspect && <Button variant="outlined" onClick={ () => onInspect(neighbor) } aria-label={ `${neighbor.name} 표식과 공명하는 부위 보기` } sx={ actionSx }>공명 부위 보기{ observations.length > 1 ? ` · ${observations.length}곳` : '' }</Button> }
                  { onNodeSelect && <Button onClick={ () => onNodeSelect(neighbor.id) } aria-label={ `${neighbor.name}의 표식에서 탐색` } sx={ actionSx }>이 표식에서 탐색</Button> }
                </Box>
              </ListItem>
            );
          }) }
        </List>
      ) }
    </Box>
  );
}
