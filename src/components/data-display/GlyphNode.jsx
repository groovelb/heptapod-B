import { useI18n } from '../../i18n/useI18n.js';
import { useEffect, useRef } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import StaticGlyphImage from './StaticGlyphImage';
import { useStaticGlyphRendering } from './GlyphRenderScope';
import {
  generateParticles, makeSprites, paintStatic, SIZE0,
} from '../../utils/heptapod/logogramParticles';

// Saved models are immutable. Share actual geometry without retaining records.
const geometryCache = new WeakMap();
let spriteInk;
let sprites;

/**
 * GlyphNode — 모바일 이미지 / PC·개인 상세 정지 Canvas 표식.
 * @param {object} model - 저장되거나 로컬에서 생성한 실제 표식 모델
 * @param {string} glyphId - 공개 DB UUID. 미저장 모델에는 생략
 * @param {number} size - 표식 정방형 크기 (기본 64px)
 * @param {string} label - 이름. 긴 이름은 접근성 이름으로 전체 보존
 * @param {boolean} isSelected - 선택 상태
 * @param {function} onClick - 선택 동작. 제공하면 기본 키보드 동작이 있는 button 사용
 * @param {object} sx - 추가 MUI sx
 */
export default function GlyphNode({ model, glyphId, size = 64, label = '', isSelected = false, onClick, sx = {} }) {
  const { t } = useI18n();
  const isStatic = useStaticGlyphRendering();
  const canvasRef = useRef(null);
  const theme = useTheme();
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const resolvedSize = Math.max(32, Number(size) || 64);
  const hasModel = Boolean(model?.harmonics && model?.clusters && model?.pressure);

  useEffect(() => {
    if (isStatic) return undefined;
    const canvas = canvasRef.current;
    if (!canvas || !hasModel) return undefined;
    let drawn = false;
    const draw = () => {
      if (drawn) return;
      drawn = true;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(resolvedSize * dpr);
      canvas.height = Math.round(resolvedSize * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Large lists allocate geometry and stamp ink only as they approach view.
      if (!geometryCache.has(model)) geometryCache.set(model, generateParticles(model).particles);
      if (!sprites || spriteInk !== ink) { sprites = makeSprites(ink); spriteInk = ink; }
      const scale = resolvedSize * dpr / SIZE0;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, SIZE0, SIZE0);
      paintStatic(ctx, geometryCache.get(model), sprites);
    };
    if (typeof IntersectionObserver === 'undefined') { draw(); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { draw(); observer.disconnect(); }
    }, { rootMargin: '200px' });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [model, hasModel, resolvedSize, ink, isStatic]);

  const accessibleName = t('glyphNode.sGlyph', { p0: label || model?.meta?.name || t('glyphNode.name'), p1: hasModel ? '' : t('glyphNode.noDisplayData') });
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
      { hasModel && isStatic ? (
        <StaticGlyphImage model={ model } glyphId={ glyphId } size={ resolvedSize }
          alt={ onClick ? '' : accessibleName } sx={ { width: resolvedSize, height: resolvedSize, maxWidth: '100%' } } />
      ) : hasModel ? (
        <Box component="canvas" ref={ canvasRef } role={ onClick ? undefined : 'img' }
          aria-hidden={ onClick ? true : undefined } aria-label={ onClick ? undefined : accessibleName }
          sx={ { display: 'block', width: resolvedSize, height: resolvedSize, maxWidth: '100%' } }
        />
      ) : (
        <Box role="img" aria-label={ accessibleName } sx={ { width: resolvedSize, height: resolvedSize, display: 'grid', placeItems: 'center' } }>
          <Typography variant="caption">{ t('glyphNode.noGlyph') }</Typography>
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
