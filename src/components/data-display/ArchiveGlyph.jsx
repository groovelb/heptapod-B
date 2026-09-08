import { useI18n } from '../../i18n/useI18n.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import StaticGlyphImage from './StaticGlyphImage';
import { useStaticGlyphRendering } from './GlyphRenderScope';
import LogogramRendererCanvas from '../motion/LogogramRendererCanvas';
import GlyphObservationOverlay from '../overlay-feedback/GlyphObservationOverlay';
import AnalysisOverlay from '../overlay-feedback/AnalysisOverlay';
import { glyphObservationMask } from '../../utils/heptapod/glyphObservationMask';
import { isRenderableGlyphModel } from '../../utils/heptapod/extractGlyphFeatures';
import { glyphLabel } from '../../utils/heptapod/resonanceView';

/** Shared responsive glyph surface. Mobile lists use precomputed images; details
 * opt into the original live surface through GlyphRenderScope. Live formation
 * starts near the viewport; the renderer owns animation and visibility pause.
 * Decorative cluster samples have no controls; people are real, labelled buttons.
 */
export default function ArchiveGlyph({ glyph, onSelect, showName = false, nameComponent = 'span', maxSize = 420,
  anchors = [], analysis = false, fragmentAnchors = null, sx }) {
  const { t } = useI18n();
  const isStatic = useStaticGlyphRendering();
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [canvasSize, setCanvasSize] = useState(0);
  const hasModel = useMemo(() => isRenderableGlyphModel(glyph.model_data), [glyph.model_data]);
  const mask = useMemo(() => fragmentAnchors ? glyphObservationMask(glyph.model_data, fragmentAnchors) : 'none', [glyph.model_data, fragmentAnchors]);
  useEffect(() => {
    if (isStatic) return undefined;
    const element = ref.current;
    if (!element) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '160px' });
    const ro = new ResizeObserver(([entry]) => {
      // A hidden list reports zero width. Retain its Canvas and formation state
      // so returning from a detail does not recreate every person's glyph.
      if (entry.contentRect.width > 0) setCanvasSize(Math.max(1, Math.floor(Math.min(entry.contentRect.width, maxSize))));
    });
    io.observe(element); ro.observe(element);
    return () => { io.disconnect(); ro.disconnect(); };
  }, [maxSize, isStatic]);

  return (
    <Box component={ onSelect ? 'button' : 'div' } type={ onSelect ? 'button' : undefined }
      onClick={ onSelect ? () => onSelect(glyph.id) : undefined }
      aria-label={ onSelect ? t('archiveGlyph.viewSGlyphUpClose', { p0: glyphLabel(glyph) }) : undefined }
      sx={ {
        display: 'block', position: 'relative', width: '100%', maxWidth: maxSize, mx: 'auto', minWidth: 0, p: 0, containerType: 'inline-size',
        border: 0, background: 'transparent', color: 'custom.chamber.ink',
        cursor: onSelect ? 'pointer' : 'inherit',
        '&:focus-visible': { outline: '2px solid', outlineOffset: 4, outlineColor: 'custom.chamber.ink' },
        '&:hover .archive-person-name, &:focus-visible .archive-person-name': { opacity: 1 },
        ...sx,
      } }>
      <Box ref={ ref } aria-hidden="true" sx={ { position: 'relative', width: '100%', aspectRatio: '1', display: 'grid', placeItems: 'center' } }>
        { isStatic && hasModel && <Box data-glyph-fragment={ fragmentAnchors ? true : undefined } sx={ { width: '100%', aspectRatio: '1', maskImage: mask, WebkitMaskImage: mask } }>
          <StaticGlyphImage model={ glyph.model_data } glyphId={ glyph.is_local ? undefined : glyph.id } size={ maxSize } />
        </Box> }
        { !isStatic && visible && hasModel && canvasSize > 0 && (
          <Box data-glyph-fragment={ fragmentAnchors ? true : undefined } sx={ { position: 'relative', width: canvasSize, height: canvasSize, maskImage: mask, WebkitMaskImage: mask } }>
            <LogogramRendererCanvas model={ glyph.model_data } size={ canvasSize } isActive={ visible } />
          </Box>
        ) }
        { hasModel && <Box data-glyph-analysis={ analysis ? 'on' : 'off' } sx={ { position: 'absolute', inset: 0, pointerEvents: 'none', '& > span > svg': { width: '100%', height: '100%' } } }>
          { analysis && <AnalysisOverlay model={ glyph.model_data } size={ canvasSize || maxSize } showReadout={ false } showFrame={ false } showVertices={ false } /> }
          <GlyphObservationOverlay model={ glyph.model_data } anchors={ anchors } fg={ analysis ? '#159447' : undefined } />
        </Box> }
        { !hasModel && <Typography variant="body2" sx={ { px: 2 } }>{ t('archiveGlyph.thisFormIsNotAvailableYet') }</Typography> }
      </Box>
      { showName && <Typography component={ nameComponent } className="archive-person-name" data-glyph-centered-name sx={ {
        position: 'absolute', left: '22%', right: '22%', top: '50%', transform: 'translateY(-50%)', m: 0,
        display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden', fontFamily: "'Cinzel', 'Noto Serif KR', Georgia, serif", fontWeight: 400,
        fontSize: `clamp(12px, ${Math.max(4, Math.min(8, 96 / [...glyphLabel(glyph)].length))}cqw, 42px)`, lineHeight: 1.4, letterSpacing: '0.03em', textAlign: 'center', overflowWrap: 'anywhere', pointerEvents: 'none',
        opacity: 0.8, transition: (theme) => theme.transitions.create(['opacity', 'transform']),
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      } }>{ glyphLabel(glyph) }</Typography> }
    </Box>
  );
}
