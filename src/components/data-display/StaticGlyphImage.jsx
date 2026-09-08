import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useI18n } from '../../i18n/useI18n.js';
import { canonicalModelJson, glyphImageUrl } from '../../lib/glyphImages/contract.js';
import { AUTHORED_GLYPH_IMAGES_BY_MODEL } from '../../lib/glyphImages/authoredManifest.js';
import { staticGlyphImageCache } from '../../utils/staticGlyphImageCache.js';

// Covers two minute-spaced queue consumers without polling indefinitely.
const RETRY_DELAYS = [15000, 30000, 60000, 120000];

/** Actual image surface; loading/failure never starts a Canvas fallback. */
export default function StaticGlyphImage({ model, glyphId, size = 512, alt = '', sx }) {
  const { t } = useI18n();
  const imageSize = size <= 128 ? 256 : 512;
  const ref = useRef(null);
  const [local, setLocal] = useState(null);
  const [failure, setFailure] = useState(null);
  const currentFailure = failure?.model === model && failure?.glyphId === glyphId && failure?.size === imageSize ? failure : null;
  const failed = Boolean(currentFailure?.failed);
  const attempt = currentFailure?.attempt || 0;
  const descriptor = useMemo(() => {
    try { return AUTHORED_GLYPH_IMAGES_BY_MODEL[canonicalModelJson(model)]?.[imageSize]; }
    catch { return null; }
  }, [model, imageSize]);
  const publicUrl = glyphImageUrl(glyphId, imageSize);
  const directUrl = publicUrl || descriptor?.src;
  const src = directUrl || (local?.model === model && local?.size === imageSize ? local.src : undefined);
  useEffect(() => {
    if (directUrl || !model) return undefined;
    let canceled = false; let lease;
    const generate = () => {
      if (lease || canceled) return;
      try {
        lease = staticGlyphImageCache.acquire(model, imageSize);
        lease.promise.then((url) => { if (!canceled) setLocal({ model, size: imageSize, src: url }); })
          .catch(() => { if (!canceled) setFailure({ model, glyphId, size: imageSize, failed: true, attempt }); });
      } catch { if (!canceled) setFailure({ model, glyphId, size: imageSize, failed: true, attempt }); }
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { observer.disconnect(); generate(); }
    }, { rootMargin: '160px' });
    if (observer && ref.current) observer.observe(ref.current); else generate();
    return () => { canceled = true; observer?.disconnect(); lease?.release(); };
  }, [directUrl, model, glyphId, imageSize, attempt]);
  useEffect(() => {
    if (!failed || !publicUrl || attempt >= RETRY_DELAYS.length) return undefined;
    const timer = setTimeout(() => { setFailure({ model, glyphId, size: imageSize, failed: false, attempt: attempt + 1 }); }, RETRY_DELAYS[attempt]);
    return () => clearTimeout(timer);
  }, [failed, publicUrl, attempt, model, glyphId, imageSize]);
  return <Box ref={ ref } data-static-glyph-image data-image-state={ failed ? 'unavailable' : src ? 'image' : 'pending' }
    sx={ { position: 'relative', width: '100%', aspectRatio: '1', ...sx } }>
    { src && !failed ? <Box component="img" key={ `${src}:${attempt}` } src={ publicUrl && attempt ? `${src}&retry=${attempt}` : src }
      width={ imageSize } height={ imageSize } alt={ alt } loading="lazy" decoding="async" draggable={ false }
      onError={ () => setFailure({ model, glyphId, size: imageSize, failed: true, attempt }) }
      sx={ { display: 'block', width: '100%', height: '100%', objectFit: 'contain' } } />
      : <Box role={ alt ? 'img' : undefined } aria-label={ alt || undefined } aria-hidden={ alt ? undefined : true }
        sx={ { width: '100%', height: '100%', display: 'grid', placeItems: 'center' } }>
        { failed && <Typography variant="caption" sx={ { textAlign: 'center', px: 1 } }>{ t('archiveGlyph.thisFormIsNotAvailableYet') }</Typography> }
      </Box> }
  </Box>;
}
