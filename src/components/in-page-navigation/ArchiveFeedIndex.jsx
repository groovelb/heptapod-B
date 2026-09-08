import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import { LenisContext } from '../../utils/lenisContext';
import { useI18n } from '../../i18n/useI18n';

/** In-page anchors only. Scroll position updates this index, never the glyph feed. */
export default function ArchiveFeedIndex({ items = [], sx }) {
  const { t } = useI18n();
  const theme = useTheme();
  const lenis = useContext(LenisContext);
  const navRef = useRef(null);
  const [activeId, setActiveId] = useState(null);
  const currentId = items.some((item) => item.id === activeId) ? activeId : items[0]?.id;
  const largest = Math.max(1, ...items.map((item) => item.count));
  const offset = useCallback(() => {
    const nav = navRef.current;
    const styles = nav ? getComputedStyle(nav) : null;
    const top = Number.parseFloat(styles?.top);
    const navigationHeight = Number.parseFloat(styles?.getPropertyValue('--archive-navigation-height')) || 0;
    const desktop = window.matchMedia(theme.breakpoints.up('md').replace('@media ', '')).matches;
    const navigationTop = Number.parseFloat((desktop ? theme.editorial.archivePage.navigationTop.md : theme.editorial.archivePage.navigationTop.xs).replace('calc(', ''));
    const indexHeight = desktop ? 0 : nav?.getBoundingClientRect().height || theme.editorial.archivePage.indexSize;
    return (Number.isFinite(top) ? top : navigationTop + navigationHeight) + indexHeight + Number.parseFloat(theme.spacing(theme.editorial.archivePage.indexClearance));
  }, [theme]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const surface = nav.parentElement;
    const update = () => surface.style.setProperty('--archive-index-height', `${Math.ceil(nav.getBoundingClientRect().height) || theme.editorial.archivePage.indexSize}px`);
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(nav);
    return () => { observer?.disconnect(); surface.style.removeProperty('--archive-index-height'); };
  }, [items.length, theme.editorial.archivePage.indexSize]);

  useEffect(() => {
    if (!items.length) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const targets = items.map((item) => ({ ...item, node: document.getElementById(item.targetId) })).filter((item) => item.node);
      let current = targets[0];
      for (const item of targets) {
        if (item.node.getBoundingClientRect().top <= offset() + 8) current = item;
      }
      // A short final chapter may never reach the top reading line.
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) current = targets.at(-1);
      if (current) setActiveId((previous) => previous === current.id ? previous : current.id);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    items.forEach((item) => {
      const node = document.getElementById(item.targetId);
      if (node) observer?.observe(node);
    });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [items, offset]);

  useEffect(() => {
    const reveal = () => {
      const nav = navRef.current;
      const link = nav?.querySelector('[aria-current="location"]');
      if (!link) return;
      const bounds = nav.getBoundingClientRect();
      const row = link.getBoundingClientRect();
      if (row.left < bounds.left) nav.scrollLeft += row.left - bounds.left;
      else if (row.right > bounds.right) nav.scrollLeft += row.right - bounds.right;
      if (row.top < bounds.top) nav.scrollTop += row.top - bounds.top;
      else if (row.bottom > bounds.bottom) nav.scrollTop += row.bottom - bounds.bottom;
    };
    reveal();
    window.addEventListener('resize', reveal);
    return () => window.removeEventListener('resize', reveal);
  }, [currentId]);

  const jump = (event, item) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const target = document.getElementById(item.targetId);
    if (!target) return;
    event.preventDefault();
    const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - offset());
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.focus({ preventScroll: true });
    if (lenis) lenis.scrollTo(top, { immediate: reduced });
    else window.scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' });
    setActiveId(item.id);
  };

  if (!items.length) return null;
  return <Box component="nav" ref={ navRef } aria-label={ t('archiveIndex.navigation') } data-archive-index data-lenis-prevent
    sx={ { position: 'sticky', alignSelf: 'start', minWidth: 0,
      top: { xs: `var(--archive-index-top, calc(${theme.editorial.archivePage.navigationTop.xs} + var(--archive-navigation-height, 0px)))`, md: `var(--archive-index-top, calc(${theme.editorial.archivePage.navigationTop.md} + var(--archive-navigation-height, 0px)))` },
      zIndex: theme.zIndex.appBar - 2,
      display: 'flex', flexDirection: { xs: 'row', md: 'column' }, alignItems: 'center',
      gap: theme.editorial.paragraphGap,
      maxHeight: { xs: 'none', md: 'calc(100svh - var(--archive-index-top, 128px) - 1rem)' },
      overflowX: { xs: 'auto', md: 'hidden' }, overflowY: { xs: 'hidden', md: 'auto' },
      overscrollBehavior: 'contain', scrollbarWidth: 'thin',
      bgcolor: 'transparent',
      color: 'custom.chamber.ink', width: { xs: '100%', md: theme.editorial.archivePage.indexSize }, ...sx } }>
    <Box component="ol" sx={ { display: 'flex', flexDirection: { xs: 'row', md: 'column' }, flexShrink: 0, listStyle: 'none', m: 0, p: 0 } }>
      { items.map((item, index) => <Box component="li" key={ item.id }>
        <Tooltip placement="right" describeChild title={ t('archiveIndex.hint', { title: item.label, count: item.count }) }
          slotProps={ { tooltip: { sx: { bgcolor: 'custom.chamber.ink', color: 'custom.chamber.fog', fontSize: 12, px: 1.5, py: 1, borderRadius: 0 } } } }>
        <Box component="a" href={ `#${item.targetId}` } onClick={ (event) => jump(event, item) }
          data-index-target={ item.id } aria-current={ currentId === item.id ? 'location' : undefined }
          aria-label={ t('archiveIndex.jump', { order: index + 1, title: item.label, count: item.count }) }
          sx={ { display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', textDecoration: 'none', width: theme.editorial.archivePage.indexSize, height: theme.editorial.archivePage.indexSize,
            '&:hover [data-index-circle]': { opacity: 1 }, '&:focus-visible': { outline: '1px solid currentColor', outlineOffset: -4, borderRadius: '50%' } } }>
          <Box component="span" aria-hidden data-index-circle sx={ {
            width: 8 + 10 * Math.sqrt(item.count / largest), height: 8 + 10 * Math.sqrt(item.count / largest), borderRadius: '50%',
            border: '1px solid currentColor', boxSizing: 'border-box',
            bgcolor: currentId === item.id ? 'currentColor' : 'transparent', opacity: currentId === item.id ? 1 : 0.45,
          } } />
        </Box>
        </Tooltip>
      </Box>) }
    </Box>
    <Typography aria-hidden sx={ { flexShrink: 0, maxWidth: { md: '100%' }, textAlign: 'center', typography: 'editorialMeta', fontVariantNumeric: 'tabular-nums', whiteSpace: { xs: 'nowrap', md: 'normal' } } }>
      { String(items.findIndex((item) => item.id === currentId) + 1).padStart(2, '0') } / { String(items.length).padStart(2, '0') }
    </Typography>
  </Box>;
}
