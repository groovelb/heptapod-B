import { useContext, useEffect, useRef } from 'react';
import { LenisContext } from '../utils/lenisContext';
import { useNavigationSession } from './navigationSession';

/** Restore each list/detail URL only after its asynchronous data is ready. */
export function useArchiveScroll(scopePath, ready) {
  const session = useNavigationSession();
  const lenis = useContext(LenisContext);
  const localPositions = useRef(new Map());
  useEffect(() => {
    if (!ready) return undefined;
    let restored = false;
    const positions = session?.archiveScroll || localPositions.current;
    let top = positions.get(scopePath) ?? 0;
    const frame = requestAnimationFrame(() => {
      if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
      else window.scrollTo(0, top);
      restored = true;
    });
    const save = () => {
      if (!restored) return;
      top = window.scrollY;
      positions.set(scopePath, top);
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', save);
      if (restored) positions.set(scopePath, top);
    };
  }, [scopePath, ready, lenis, session]);
}
