import Box from '@mui/material/Box';
import { PLACEMENT } from './captionStyles';

/**
 * CaptionFrame 컴포넌트
 *
 * 캡션 하나를 스크럽 트랙 좌표에 실배치하는 프레임(애니메이션 없음, 자연 스크롤).
 * 비트 구간의 captionAt 지점(cellStart + cells × captionAt)을 지날 때 캡션 중심이 뷰포트 anchorY 에 오도록 top 을 계산한다.
 *
 * Props:
 * @param {object} clip - 타임라인 클립 (cellStart/cells) [Required]
 * @param {number} scrubCells - 트랙 셀 수 [Required]
 * @param {'left'|'right'|'center'} placement - 격자 구역 [Optional, 기본값: 'left']
 * @param {number} captionAt - 비트 안의 시점 0~1 [Optional, 기본값: 0.5]
 * @param {number} anchorY - 뷰포트 높이 비율 [Optional, 기본값: 0.5]
 * @param {React.ReactNode} children - 캡션 내용 [Required]
 */
function CaptionFrame({ clip, scrubCells, placement = 'left', captionAt = 0.5, anchorY = 0.5, children }) {
  const place = PLACEMENT[placement] || PLACEMENT.left;
  const topPercent = ((clip.cellStart + clip.cells * captionAt + anchorY) / scrubCells) * 100;
  return (
    <Box
      sx={ {
        position: 'absolute',
        top: `${topPercent}%`,
        left: place.left,
        right: place.right,
        width: place.width,
        px: { xs: 3, md: placement === 'center' ? 6 : 0 },
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: place.alignItems,
        textAlign: place.textAlign,
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
      } }
    >
      { children }
    </Box>
  );
}

export default CaptionFrame;
