import { useState } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import GlyphNode from './GlyphNode';
import ResonanceList from './ResonanceList';
import { getMorphologyObservations, isMorphologyRelation, morphologyRelationLabel } from '../../utils/heptapod/resonanceView';

const LINES = {
  branch: { dash: undefined, label: '가지 구조' },
  opening: { dash: '8 5', label: '개구부' },
  ink: { dash: '2 4', label: '잉크 분포' },
  ring: { dash: '10 3 2 3', label: '링 윤곽' },
  question: { dash: '4 3 4 7', label: '질문의 변주' },
  variant: { dash: '4 3 4 7', label: '질문의 변주' },
};
const morphologyOf = (neighbor) => (neighbor.relations?.length ? neighbor.relations : [neighbor])
  .filter(isMorphologyRelation);
function observationOf(neighbor) {
  const relations = morphologyOf(neighbor);
  const form = relations.find((relation) => relation.relationType === 'FORM');
  const variant = relations.find((relation) => relation.relationType === 'VARIANT');
  const observation = getMorphologyObservations(form || variant)[0];
  return { kind: observation?.kind || (variant ? 'variant' : 'ring'),
    reason: observation?.reason || variant?.reasons?.[0] || '관측된 형태를 살펴보세요.',
    label: morphologyRelationLabel(form || variant) };
}

/**
 * ResonanceMap — 이웃 선택은 근거를 열고, 별도 버튼으로 중심을 옮기는 1-hop 지도.
 * @param {object} centerModel - 중심의 저장된 모델
 * @param {string} centerName - 중심 이름
 * @param {Array} relations - 이웃 ID별로 병합된 실제 관계 데이터
 * @param {function} onNodeSelect - 중심을 이동할 이웃 ID
 * @param {function} onInspect - 선택한 이웃 객체
 * @param {number} width - 최대 지도 너비 (기본 480px)
 * @param {number} height - 지도 비율 기준 높이 (기본 480px)
 * @param {object} sx - 추가 MUI sx
 */
export default function ResonanceMap({ centerModel, centerName, relations = [], onNodeSelect, onInspect, width = 480, height = 480, sx = {} }) {
  const theme = useTheme();
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const fog = theme.palette.custom?.chamber?.fog || theme.palette.background.paper;
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const compact = mobile || width < 420;
  const [selectedId, setSelectedId] = useState(null);
  const [showList, setShowList] = useState(false);
  const neighbors = relations.filter((neighbor) => morphologyOf(neighbor).length > 0);
  const visible = neighbors.slice(0, compact ? 6 : 12);
  const selected = visible.find((neighbor) => neighbor.id === selectedId);
  const selectedObservation = selected ? observationOf(selected) : null;
  const legendKinds = [...new Set(visible.map((neighbor) => observationOf(neighbor).kind))];
  const nodeSize = compact ? 56 : 60;
  const positions = visible.map((_, index) => {
    const angle = index / visible.length * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + 38 * Math.cos(angle), y: 50 + 36 * Math.sin(angle) };
  });
  const inspect = (neighbor) => { setSelectedId(neighbor.id); onInspect?.(neighbor); };
  const actionSx = { color: ink, minHeight: 44, borderColor: alpha(ink, 0.35), fontSize: '0.8rem' };

  return (
    <Box sx={ { width, maxWidth: '100%', bgcolor: fog, color: ink, ...sx } }>
      <Box sx={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1.5, py: 1 } }>
        <Typography variant="body2">{ showList ? `${neighbors.length}개의 표식` : '표식을 선택해 공명하는 부위를 확인하세요.' }</Typography>
        <Button onClick={ () => setShowList((current) => !current) } aria-pressed={ showList } sx={ { ...actionSx, flexShrink: 0 } }>{ showList ? '지도로 보기' : '목록으로 보기' }</Button>
      </Box>
      { showList ? (
        <ResonanceList centerName={ centerName } relations={ neighbors } onInspect={ inspect } onNodeSelect={ onNodeSelect } />
      ) : (
        <>
          <Box role="group" aria-label={ `${centerName} 표식의 형태 공명 지도` } sx={ { position: 'relative', width: '100%', aspectRatio: `${width} / ${height}`, minHeight: 320 } }>
            <Box component="svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" sx={ { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' } }>
              { positions.map((position, index) => (
                <line key={ visible[index].id } x1="50" y1="50" x2={ position.x } y2={ position.y }
                  stroke={ ink } strokeOpacity={ selectedId === visible[index].id ? 0.7 : 0.25 }
                  strokeWidth={ selectedId === visible[index].id ? 1.5 : 1 }
                  data-kind={ observationOf(visible[index]).kind }
                  strokeDasharray={ LINES[observationOf(visible[index]).kind]?.dash } vectorEffect="non-scaling-stroke"
                />
              )) }
            </Box>
            { visible.map((neighbor, index) => (
              <Box key={ neighbor.id } sx={ { position: 'absolute', left: `${positions[index].x}%`, top: `${positions[index].y}%`, transform: 'translate(-50%, -50%)' } }>
                <GlyphNode model={ neighbor.model } label={ neighbor.name } size={ nodeSize } isSelected={ selectedId === neighbor.id } onClick={ () => inspect(neighbor) } sx={ { bgcolor: fog } } />
              </Box>
            )) }
            <Box sx={ { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' } }>
              <GlyphNode model={ centerModel } label={ centerName } size={ compact ? 80 : 96 } sx={ { bgcolor: fog } } />
              <Typography variant="caption" sx={ { display: 'block', color: alpha(ink, 0.8) } }>지금 살펴보는 표식</Typography>
            </Box>
          </Box>
          <Box aria-live="polite" sx={ { px: 2, pb: 2, borderTop: '1px solid', borderColor: alpha(ink, 0.15), pt: 1.5 } }>
            { selected ? (
              <>
                <Typography variant="caption" sx={ { display: 'block', mb: 0.5 } }>{ selectedObservation.label }</Typography>
                <Typography variant="body2" sx={ { lineHeight: 1.6 } }>{ selected.name } · { selectedObservation.reason }</Typography>
                <Box sx={ { display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 } }>
                  { onInspect && <Button variant="outlined" sx={ actionSx } onClick={ () => onInspect(selected) }>공명 부위 보기</Button> }
                  { onNodeSelect && <Button sx={ actionSx } onClick={ () => onNodeSelect(selected.id) }>이 표식에서 탐색</Button> }
                </Box>
              </>
            ) : <Typography variant="body2">{ visible.length ? `${visible.length}개의 표식을 지도에 표시했어요. 전체 공명은 목록에서 볼 수 있어요.` : '현재 살펴본 표식들에서는 설명할 수 있는 형태 공명을 찾지 못했어요.' }</Typography> }
          </Box>
          { legendKinds.length > 0 && <Box aria-label="관측 부위별 선 무늬" sx={ { px: 2, pb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 } }>
            { legendKinds.map((kind) => <Box key={ kind } sx={ { display: 'flex', alignItems: 'center', gap: 0.75 } }>
              <Box component="svg" width="36" height="12" aria-hidden="true"><line x1="0" y1="6" x2="36" y2="6" stroke={ ink } strokeDasharray={ LINES[kind]?.dash } /></Box>
              <Typography variant="caption">{ LINES[kind]?.label }</Typography>
            </Box>) }
          </Box> }
          <Typography variant="caption" sx={ { display: 'block', px: 2, pb: 2, color: alpha(ink, 0.8), lineHeight: 1.7 } }>선 무늬는 먼저 관측한 부위를 나타내요. 표식 사이의 거리는 유사도나 공명의 강도를 뜻하지 않아요.</Typography>
        </>
      ) }
    </Box>
  );
}
