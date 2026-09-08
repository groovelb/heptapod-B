import { useCallback, useEffect, useRef } from 'react';
import { createAmbientAudio } from '../utils/heptapod/ambientAudio';

/** One sound controller per page. Simultaneous portals share one transition cue. */
export default function useGlyphFormationSound(enabled) {
  const audioRef = useRef(null);
  const lastStart = useRef(-Infinity);
  useEffect(() => {
    if (!enabled) return undefined;
    const audio = createAmbientAudio();
    audioRef.current = audio;
    const unlock = () => audio.setEnabled(true);
    unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    const visibility = () => audio.setEnabled(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      audio.dispose();
      audioRef.current = null;
      lastStart.current = -Infinity;
    };
  }, [enabled]);
  return useCallback(() => {
    if (!enabled || !audioRef.current || document.hidden) return;
    const now = performance.now();
    if (now - lastStart.current < 180) return;
    lastStart.current = now;
    audioRef.current.encodeStart({ requireRunning: true });
  }, [enabled]);
}
