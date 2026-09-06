import { useI18n } from '../../i18n/useI18n.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LogogramRendererCanvas from '../motion/LogogramRendererCanvas';
import GlyphObservationOverlay from '../overlay-feedback/GlyphObservationOverlay';
import { isRenderableGlyphModel } from '../../utils/heptapod/extractGlyphFeatures';
import { glyphLabel } from '../../utils/heptapod/resonanceView';

/** Shared live glyph surface. Formation starts near the viewport; the renderer
 * owns its animation, visibility pause and reduced-motion static fallback.
 * Decorative cluster samples have no controls; people are real, labelled buttons.
 */
export default function ArchiveGlyph({ glyph, onSelect, showName = false, maxSize = 420, anchors = [], sx }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [canvasSize, setCanvasSize] = useState(0);
  const hasModel = useMemo(() => isRenderableGlyphModel(glyph.model_data), [glyph.model_data]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '160px' });
    const ro = new ResizeObserver(([entry]) => {
      setCanvasSize(Math.max(0, Math.floor(Math.min(entry.contentRect.width, maxSize))));
    });
    io.observe(element); ro.observe(element);
    return () => { io.disconnect(); ro.disconnect(); };
  }, [maxSize]);

  return (
    <Box component={ onSelect ? 'button' : 'div' } type={ onSelect ? 'button' : undefined }
      onClick={ onSelect ? () => onSelect(glyph.id) : undefined }
      aria-label={ onSelect ? t('archiveGlyph.viewSGlyphUpClose', { p0: glyphLabel(glyph) }) : undefined }
      sx={ {
        display: 'block', position: 'relative', width: '100%', minWidth: 0, p: 0,
        border: 0, background: 'transparent', color: 'custom.chamber.ink',
        cursor: onSelect ? 'pointer' : 'inherit',
        '&:focus-visible': { outline: '2px solid', outlineOffset: 4, outlineColor: 'custom.chamber.ink' },
        '&:hover .archive-person-name, &:focus-visible .archive-person-name': { opacity: 1, transform: 'translateY(-3px)' },
        ...sx,
      } }>
      <Box ref={ ref } aria-hidden="true" sx={ { width: '100%', aspectRatio: '1', display: 'grid', placeItems: 'center' } }>
        { visible && hasModel && canvasSize > 0 && (
          <Box sx={ { position: 'relative', width: canvasSize, height: canvasSize } }>
            <LogogramRendererCanvas model={ glyph.model_data } size={ canvasSize } isActive={ visible } />
            <GlyphObservationOverlay model={ glyph.model_data } anchors={ anchors } />
          </Box>
        ) }
        { !hasModel && <Typography variant="body2" sx={ { px: 2 } }>{ t('archiveGlyph.thisFormIsNotAvailableYet') }</Typography> }
      </Box>
      { showName && <Typography component="span" className="archive-person-name" sx={ {
        display: 'block', px: 1, fontFamily: "'Cinzel', 'Noto Serif KR', Georgia, serif",
        fontSize: { xs: 14, sm: 16 }, letterSpacing: '0.08em', textAlign: 'center', overflowWrap: 'anywhere',
        opacity: 0.8, transition: (theme) => theme.transitions.create(['opacity', 'transform']),
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none !important' },
      } }>{ glyphLabel(glyph) }</Typography> }
    </Box>
  );
}
