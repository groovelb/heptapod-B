import { useEffect, useMemo, useRef } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  generateParticles, makeSprites, paintStatic, SIZE0,
} from '../../utils/heptapod/logogramParticles';

// Saved models are immutable. Share actual geometry without retaining records.
const geometryCache = new WeakMap();

/**
 * GlyphNode — 저장된 모델을 메인 Canvas와 같은 기하로 그리는 정적 표식.
 * @param {object} model - 저장되거나 로컬에서 생성한 실제 표식 모델
 * @param {number} size - 표식 정방형 크기 (기본 64px)
 * @param {string} label - 이름. 긴 이름은 접근성 이름으로 전체 보존
 * @param {boolean} isSelected - 선택 상태
 * @param {function} onClick - 선택 동작. 제공하면 기본 키보드 동작이 있는 button 사용
 * @param {object} sx - 추가 MUI sx
 */
export default function GlyphNode({ model, size = 64, label = '', isSelected = false, onClick, sx = {} }) {
  const canvasRef = useRef(null);
  const theme = useTheme();
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const resolvedSize = Math.max(32, Number(size) || 64);
  const particles = useMemo(() => {
    if (!model?.harmonics || !model?.clusters || !model?.pressure) return null;
    if (!geometryCache.has(model)) geometryCache.set(model, generateParticles(model).particles);
    return geometryCache.get(model);
  }, [model]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !particles) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(resolvedSize * dpr);
    canvas.height = Math.round(resolvedSize * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = resolvedSize * dpr / SIZE0;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, SIZE0, SIZE0);
    paintStatic(ctx, particles, makeSprites(ink));
  }, [particles, resolvedSize, ink]);

  const accessibleName = `${label || model?.meta?.name || '이름'}의 표식${particles ? '' : ' · 표시할 데이터 없음'}`;
  return (
    <Box component={ onClick ? 'button' : 'div' } type={ onClick ? 'button' : undefined }
      onClick={ onClick } aria-label={ onClick ? accessibleName : undefined }
      aria-pressed={ onClick ? isSelected : undefined } title={ label || undefined }
      sx={ {
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
        gap: 0.5, p: 0.5, m: 0, color: ink, bgcolor: 'transparent',
        border: '1px solid', borderColor: isSelected ? ink : 'transparent', borderRadius: 1,
        font: 'inherit', cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: alpha(ink, 0.05) } : {},
        '&:focus-visible': { outline: `2px solid ${ink}`, outlineOffset: 3 }, ...sx,
      } }
    >
      { particles ? (
        <Box component="canvas" ref={ canvasRef } role={ onClick ? undefined : 'img' }
          aria-hidden={ onClick ? true : undefined } aria-label={ onClick ? undefined : accessibleName }
          sx={ { display: 'block', width: resolvedSize, height: resolvedSize, maxWidth: '100%' } }
        />
      ) : (
        <Box role="img" aria-label={ accessibleName } sx={ { width: resolvedSize, height: resolvedSize, display: 'grid', placeItems: 'center' } }>
          <Typography variant="caption">표식 없음</Typography>
        </Box>
      ) }
      { label && (
        <Typography component="span" sx={ {
          fontFamily: "'Cinzel', 'Noto Serif KR', Georgia, serif", fontSize: '0.75rem',
          maxWidth: resolvedSize * 1.35, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', lineHeight: 1.5, color: 'inherit',
        } }>{ label }</Typography>
      ) }
    </Box>
  );
}
