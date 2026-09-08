import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useI18n } from '../../i18n/useI18n.js';
import { canonicalModelJson, glyphImageUrl } from '../../lib/glyphImages/contract.js';
import { AUTHORED_GLYPH_IMAGES_BY_MODEL } from '../../lib/glyphImages/authoredManifest.js';
import { staticGlyphImageCache } from '../../utils/staticGlyphImageCache.js';

// Covers two minute-spaced queue consumers without polling indefinitely.
const RETRY_DELAYS = [15000, 30000, 60000, 120000];

/** A public glyph starts with the same model rendered locally in a Worker.
 * The saved image replaces it only after decoding; neither path mounts Canvas.
 */
export default function StaticGlyphImage({ model, glyphId, size = 512, alt = '', sx }) {
  const imageSize = size <= 128 ? 256 : 512;
  const modelKey = useMemo(() => {
    try { return canonicalModelJson(model); } catch { return ''; }
  }, [model]);
  const descriptor = AUTHORED_GLYPH_IMAGES_BY_MODEL[modelKey]?.[imageSize];
  const publicUrl = glyphImageUrl(glyphId, imageSize);
  // A changed model starts a new surface; label-only changes reuse its preview.
  return <GlyphImageSurface key={ `${glyphId || ''}:${imageSize}:${modelKey}` }
    model={ model } imageSize={ imageSize } publicUrl={ publicUrl } directUrl={ publicUrl || descriptor?.src }
    alt={ alt } sx={ sx } />;
}

function GlyphImageSurface({ model, imageSize, publicUrl, directUrl, alt, sx }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const remoteRef = useRef(null);
  const [localSrc, setLocalSrc] = useState(null);
  const [localFailed, setLocalFailed] = useState(false);
  const [remoteFailed, setRemoteFailed] = useState(false);
  const [decodedSrc, setDecodedSrc] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const remoteSrc = publicUrl && attempt ? `${directUrl}&retry=${attempt}` : directUrl;
  const remoteReady = Boolean(remoteSrc && decodedSrc === remoteSrc && !remoteFailed);
  // A quick 256px preview is sufficient while the saved 512px image arrives.
  const localSize = publicUrl ? 256 : imageSize;

  useEffect(() => {
    if (!model || remoteReady || (directUrl && !publicUrl)) return undefined;
    let canceled = false; let lease;
    const generate = () => {
      if (lease || canceled) return;
      try {
        lease = staticGlyphImageCache.acquire(model, localSize);
        lease.promise.then((url) => { if (!canceled) setLocalSrc(url); })
          .catch(() => { if (!canceled) setLocalFailed(true); });
      } catch { if (!canceled) setLocalFailed(true); }
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { observer.disconnect(); generate(); }
    }, { rootMargin: '160px' });
    if (observer && ref.current) observer.observe(ref.current); else generate();
    return () => { canceled = true; observer?.disconnect(); lease?.release(); };
  }, [directUrl, publicUrl, model, localSize, remoteReady]);

  useEffect(() => {
    if (!remoteFailed || !publicUrl || attempt >= RETRY_DELAYS.length) return undefined;
    const timer = setTimeout(() => { setRemoteFailed(false); setAttempt((value) => value + 1); }, RETRY_DELAYS[attempt]);
    return () => clearTimeout(timer);
  }, [remoteFailed, publicUrl, attempt]);

  const receiveImage = async (event) => {
    const image = event.currentTarget;
    try {
      await image.decode?.();
      if (remoteRef.current === image) setDecodedSrc(remoteSrc);
    } catch { if (remoteRef.current === image) setRemoteFailed(true); }
  };
  const preview = !remoteReady && Boolean(localSrc);
  const unavailable = !remoteReady && !preview && (directUrl ? remoteFailed && (!publicUrl || localFailed) : localFailed);
  const state = remoteReady ? 'ready' : preview ? (publicUrl ? 'preview' : 'ready') : unavailable ? 'unavailable' : 'pending';
  return <Box ref={ ref } data-static-glyph-image data-image-state={ state }
    sx={ { position: 'relative', width: '100%', aspectRatio: '1', ...sx } }>
    { preview && <Box component="img" data-glyph-local-preview src={ localSrc }
      width={ localSize } height={ localSize } alt={ alt } decoding="async" draggable={ false }
      sx={ { display: 'block', width: '100%', height: '100%', objectFit: 'contain' } } /> }
    { directUrl && !remoteFailed && <Box component="img" data-glyph-saved-image ref={ remoteRef }
      key={ remoteSrc } src={ remoteSrc } width={ imageSize } height={ imageSize }
      alt={ remoteReady ? alt : '' } aria-hidden={ !remoteReady || undefined }
      loading="lazy" decoding="async" draggable={ false } onLoad={ receiveImage } onError={ () => setRemoteFailed(true) }
      sx={ { position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%', objectFit: 'contain', opacity: remoteReady ? 1 : 0 } } /> }
    { !remoteReady && !preview && <Box role={ alt ? 'img' : undefined } aria-label={ alt || undefined } aria-hidden={ alt ? undefined : true }
      sx={ { width: '100%', height: '100%', display: 'grid', placeItems: 'center' } }>
      { unavailable && <Typography variant="caption" sx={ { textAlign: 'center', px: 1 } }>{ t('archiveGlyph.thisFormIsNotAvailableYet') }</Typography> }
    </Box> }
  </Box>;
}
