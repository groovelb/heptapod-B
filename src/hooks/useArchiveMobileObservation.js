import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { LenisContext } from '../utils/lenisContext';

/** Keep the observation's DOM and original footprint; only its presentation moves.
 * Geometry uses the stationary figure and reading boundary, never the fixed panel.
 */
export default function useArchiveMobileObservation({ figureRef, panelRef, readingRef, topRef, navigationRef, onModeChange }) {
  const theme = useTheme();
  const lenis = useContext(LenisContext);
  const [mode, setMode] = useState('expanded');
  const currentMode = useRef('expanded');
  const tokens = theme.editorial.archiveObservation;
  const presentedMode = useRef('expanded');
  useEffect(() => () => onModeChange?.('expanded'), [onModeChange]);

  useEffect(() => {
    const figure = figureRef.current;
    const panel = panelRef.current;
    const reading = readingRef.current;
    const probe = topRef.current;
    if (!figure || !panel || !reading || !probe) return undefined;
    let frame = 0;
    let focusFrame = 0;
    let leaving = null;
    const media = window.matchMedia(theme.breakpoints.down('md').replace('@media ', ''));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const commitMode = (next) => {
      if (currentMode.current === next) return;
      const active = document.activeElement;
      const navigation = navigationRef?.current;
      if (next !== 'expanded' && (navigation?.contains(active) || panel.querySelector('[data-archive-figure-controls]')?.contains(active))) {
        // Move focus out of controls/navigation that are becoming hidden.
        const selector = navigation?.contains(active) && active.getAttribute('aria-label') === panel.querySelector('[data-observation-share]')?.getAttribute('aria-label')
          ? '[data-observation-share]' : '[data-observation-expand]';
        cancelAnimationFrame(focusFrame);
        focusFrame = requestAnimationFrame(() => panel.querySelector(selector)?.focus({ preventScroll: true }));
      } else if (next === 'expanded' && panel.contains(active)) {
        const target = reading.getBoundingClientRect().bottom <= probe.getBoundingClientRect().top + tokens.compactHeight ? reading : figure;
        target.focus({ preventScroll: true });
      }
      currentMode.current = next;
      setMode(next);
      onModeChange?.(next);
    };
    const cancelExit = () => { const animation = leaving; leaving = null; animation?.cancel(); };
    const changeMode = (next, immediate = false) => {
      if (next === currentMode.current) { cancelExit(); return; }
      if (next === 'expanded' && !immediate && !reducedMotion.matches && panel.animate) {
        if (leaving) return;
        const style = getComputedStyle(panel);
        const animation = panel.animate([
          { opacity: style.opacity || 1, transform: style.transform || 'none' },
          { opacity: 0, transform: `translateY(-${theme.spacing(tokens.gap)})` },
        ], { duration: theme.transitions.duration.shorter, easing: theme.transitions.easing.easeIn, fill: 'forwards' });
        leaving = animation;
        animation.finished.then(() => {
          if (leaving !== animation) return;
          leaving = null;
          commitMode(next);
          animation.cancel();
        }).catch(() => {});
      } else {
        cancelExit();
        commitMode(next);
      }
    };
    const update = () => {
      frame = 0;
      const box = figure.getBoundingClientRect();
      const top = probe.getBoundingClientRect().top;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const compactMode = top + tokens.compactHeight > viewportHeight * tokens.viewportFraction ? 'minimal' : 'compact';
      const dockHeight = compactMode === 'compact' ? tokens.compactHeight : tokens.minimalHeight;
      if (currentMode.current === 'expanded' && box.height > 0) {
        figure.style.setProperty('--archive-expanded-height', `${box.height}px`);
        figure.style.setProperty('--archive-expanded-width', `${box.width}px`);
      }
      const glyphSize = compactMode === 'minimal' ? tokens.minimalGlyphSize : tokens.glyphSize;
      const expandedWidth = parseFloat(figure.style.getPropertyValue('--archive-expanded-width'));
      if (expandedWidth > 0) figure.style.setProperty('--archive-glyph-scale', String(glyphSize / expandedWidth));
      panel.style.setProperty('--archive-observation-left', `${box.left}px`);
      panel.style.setProperty('--archive-observation-width', `${box.width}px`);
      const tolerance = currentMode.current === 'expanded' ? 0 : tokens.boundaryTolerance;
      const withinReading = reading.getBoundingClientRect().bottom > top + dockHeight
        + (currentMode.current === 'expanded' ? tokens.boundaryTolerance : 0);
      const active = media.matches && box.height > 0 && box.bottom <= top + tolerance && withinReading;
      changeMode(active ? compactMode : 'expanded', !media.matches);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    [figure, panel, reading].forEach((node) => observer?.observe(node));
    // Run after URL scroll restoration as well as on ordinary native touch scroll.
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    media.addEventListener('change', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(focusFrame);
      cancelExit();
      observer?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      media.removeEventListener('change', schedule);
    };
  }, [figureRef, panelRef, readingRef, topRef, navigationRef, onModeChange, theme, tokens]);

  useLayoutEffect(() => {
    if (presentedMode.current === mode) return undefined;
    presentedMode.current = mode;
    const panel = panelRef.current;
    if (!panel?.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const animation = panel.animate([
      { opacity: 0, transform: mode === 'expanded' ? 'none' : `translateY(-${theme.spacing(tokens.gap)})` },
      { opacity: 1, transform: 'none' },
    ], { duration: theme.transitions.duration.short, easing: theme.transitions.easing.easeOut });
    return () => animation.cancel();
  }, [mode, panelRef, theme, tokens]);

  const returnToFigure = () => {
    const figure = figureRef.current;
    if (!figure) return;
    const navigationHeight = navigationRef?.current?.getBoundingClientRect().height || theme.editorial.archivePage.navigationHeight;
    const top = Math.max(0, window.scrollY + figure.getBoundingClientRect().top
      - (topRef.current?.getBoundingClientRect().top || 0) - navigationHeight - tokens.boundaryTolerance);
    const immediate = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lenis) lenis.scrollTo(top, { immediate, force: true });
    else window.scrollTo({ top, behavior: immediate ? 'instant' : 'smooth' });
    figure.focus({ preventScroll: true });
  };
  return { mode, returnToFigure };
}
