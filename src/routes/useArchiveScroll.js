import { useContext, useEffect } from 'react';
import { LenisContext } from '../utils/lenisContext';
import { useNavigationSession } from './navigationSession';

/** Restore only after the async feed exists; person dialogs keep the current scroll. */
export function useArchiveScroll(scopePath, ready) {
  const session = useNavigationSession();
  const lenis = useContext(LenisContext);
  useEffect(() => {
    if (!ready) return undefined;
    let restored = false;
    let top = session?.archiveScroll.get(scopePath) ?? 0;
    const frame = requestAnimationFrame(() => {
      if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
      else window.scrollTo(0, top);
      restored = true;
    });
    const save = () => {
      if (!restored) return;
      top = window.scrollY;
      session?.archiveScroll.set(scopePath, top);
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', save);
      if (restored) session?.archiveScroll.set(scopePath, top);
    };
  }, [scopePath, ready, lenis, session]);
}
