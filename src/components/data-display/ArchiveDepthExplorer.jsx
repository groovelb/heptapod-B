import { useI18n } from '../../i18n/useI18n.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import Typography from '@mui/material/Typography';
import { buildArchiveDepthView, EMPTY_ARCHIVE_FILTER } from '../../utils/heptapod/archiveDepthView';
import { MEANING_CATALOG, MEANING_VERSION, MORPHOLOGY_VERSION } from '../../data/heptapodMeaningCatalog';
import { getArchiveFamilySymbol, ARCHIVE_TIMELINE_SYMBOL } from '../../data/archiveFamilySymbols';
import ArchiveGlyph from './ArchiveGlyph';
import ArchiveArchetypeFeed from './ArchiveArchetypeFeed';
import { glyphLabel } from '../../utils/heptapod/resonanceView.js';
import { interpretGlyphMeaning } from '../../utils/heptapod/interpretGlyphMeaning.js';
import { buildArchiveArchetypeFeed, buildArchiveTimeline } from '../../utils/heptapod/buildArchiveArchetypeFeed.js';
import { ARCHETYPE_CATALOG, getGlyphArchetype } from '../../data/heptapodArchetypeCatalog.js';
import ArchiveFamilySymbol from './ArchiveFamilySymbol';
import ArchiveSelectedGlyph from './ArchiveSelectedGlyph';

const SERIF = "'Cinzel', 'Noto Serif KR', Georgia, serif";
const MotionBox = motion.create(Box);
const DEPTH_VARIANTS = {
  enter: (direction) => ({ opacity: 0, scale: direction < 0 ? 1.12 : 0.86 }),
  present: { opacity: 1, scale: 1 },
  leave: (direction) => ({ opacity: 0, scale: direction < 0 ? 0.86 : 1.12 }),
};
const STILL_VARIANTS = { enter: { opacity: 1 }, present: { opacity: 1 }, leave: { opacity: 1 } };
const actionSx = { color: 'custom.chamber.ink', minHeight: 44, fontSize: 13, textTransform: 'none' };
const shareIconSx = {
  color: 'custom.chamber.ink', width: 44, height: 44, p: 1.25, borderRadius: 0, flexShrink: 0,
  '&:hover': { bgcolor: 'action.hover' },
  '&.Mui-focusVisible': { outline: '1px solid currentColor', outlineOffset: -2 },
};

function ClusterPortal({ node, onSelect }) {
  const { localize, t } = useI18n();
  const theme = useTheme();
  const familySymbol = getArchiveFamilySymbol(node.id);
  return (
    <Box component="button" type="button" onClick={ () => onSelect(node.filter) }
      aria-label={ node.kind === 'timeline' ? t('archiveTimeline.allByTime') : familySymbol ? t('archiveDepthExplorer.familySymbolMeetGlyphs', { p0: localize(node.title), p1: localize(familySymbol.cue), p2: node.glyphs.length })
        : t('archiveDepthExplorer.enterTheGroupGlyphs', { p0: localize(node.title), p1: node.glyphs.length }) }
      data-cluster-id={ node.id } data-archive-chronological={ node.kind === 'timeline' ? true : undefined }
      sx={ {
        position: 'relative', display: 'block', width: '100%', maxWidth: 390, mx: 'auto', p: 0, pb: 2,
        border: 0, background: 'transparent', color: 'custom.chamber.ink', cursor: 'pointer',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'custom.chamber.ink', outlineOffset: 4 },
        '&:hover .archive-cluster-cloud, &:focus-visible .archive-cluster-cloud': { transform: 'scale(1.07)' },
        '&:hover .archive-cluster-invite, &:focus-visible .archive-cluster-invite': { opacity: 1 },
      } }>
      <Box aria-hidden="true" className="archive-cluster-cloud" sx={ {
        position: 'relative', aspectRatio: '1', width: '100%',
        transition: (theme) => theme.transitions.create('transform', { duration: theme.transitions.duration.complex }),
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none !important' },
      } }>
        { familySymbol && <ArchiveFamilySymbol familyId={ node.id } /> }
        { node.kind === 'timeline' && <ArchiveGlyph glyph={ ARCHIVE_TIMELINE_SYMBOL } /> }
        <Typography component="span" data-cluster-title sx={ { position: 'absolute', top: '50%', left: '50%', width: 'max-content', transform: 'translate(-50%, -50%)',
          textAlign: 'center', fontFamily: SERIF, fontSize: ['family', 'timeline'].includes(node.kind) ? { xs: 19, md: 28 } : { xs: 15, md: 18 },
          letterSpacing: '0.06em', lineHeight: 1.6, whiteSpace: 'nowrap', pointerEvents: 'none',
          [theme.breakpoints.down('md')]: { width: '90%', whiteSpace: 'normal', overflowWrap: 'anywhere', fontSize: 'clamp(15px, 3.8vw, 22px)' },
        } }>{ localize(node.title) }</Typography>
      </Box>
      { (familySymbol || node.kind === 'timeline') && <Typography component="span" sx={ { display: 'block', mt: 1, fontSize: 13 } }>{ familySymbol ? localize(familySymbol.cue) : t('archiveTimeline.newest') }</Typography> }
      <Typography component="span" className="archive-cluster-invite" sx={ { display: 'block', mt: 0.5, fontSize: 12, opacity: 0.75 } }>
        { node.kind === 'timeline' ? t('archiveTimeline.allPublic') : `${node.glyphs.length}${t('archiveDepthExplorer.glyphsEnter')}` }</Typography>
    </Box>
  );
}

/** Families open into type-based feeds. Detail replaces the visible feed while
 * its mounted glyphs retain formation state for return navigation.
 */
export default function ArchiveDepthExplorer({ glyphs = [], meanings, filter = EMPTY_ARCHIVE_FILTER,
  focusedId = null, onFilterChange, onFocusGlyph, onShare,
  order = null, onOrderChange }) {
  const { localize, t } = useI18n();
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const timeline = useMemo(() => order ? buildArchiveTimeline(glyphs, order) : null, [glyphs, order]);
  const scope = useMemo(() => {
    const grouped = buildArchiveDepthView(glyphs, meanings, timeline ? EMPTY_ARCHIVE_FILTER : filter);
    return timeline ? { ...grouped, level: 'members', nodes: [], glyphs: timeline.glyphs,
      scopeKey: `timeline:${order}`, title: t('archiveTimeline.title'), subtitle: '', parentFilter: EMPTY_ARCHIVE_FILTER } : grouped;
  }, [glyphs, meanings, filter, timeline, order, t]);
  const scene = useMemo(() => {
    if (!focusedId) return scope;
    if (!timeline) return buildArchiveDepthView(glyphs, meanings, filter, focusedId);
    const focusedGlyph = timeline.glyphs.find((glyph) => glyph.id === focusedId) || null;
    return { ...scope, level: 'glyph', focusedGlyph, missingFocus: !focusedGlyph, title: focusedGlyph ? glyphLabel(focusedGlyph) : '' };
  }, [glyphs, meanings, filter, focusedId, scope, timeline]);
  const feed = useMemo(() => timeline || buildArchiveArchetypeFeed(scope.glyphs, meanings), [timeline, scope.glyphs, meanings]);
  const selectedArchetype = ARCHETYPE_CATALOG[scope.selectedGroup?.id];
  const titleRef = useRef(null);
  const navigationRef = useRef(null);
  const previousFocus = useRef(focusedId);
  const lastScopeKey = useRef(scope.scopeKey);
  const [direction, setDirection] = useState(1);
  const transition = { duration: reducedMotion ? 0 : theme.transitions.duration.complex / 1000, ease: 'easeOut' };
  useEffect(() => {
    if (lastScopeKey.current !== scope.scopeKey) titleRef.current?.focus({ preventScroll: true });
    lastScopeKey.current = scope.scopeKey;
  }, [scope.scopeKey]);
  useEffect(() => {
    if (!focusedId && previousFocus.current) {
      const list = titleRef.current?.closest('[data-archive-list-view]');
      const member = [...(list?.querySelectorAll('[data-archive-member]') || [])]
        .find((node) => node.dataset.archiveMember === previousFocus.current);
      (member?.querySelector('button') || titleRef.current)?.focus({ preventScroll: true });
    }
    previousFocus.current = focusedId;
  }, [focusedId]);
  // Wrapped breadcrumbs can make the sticky bar taller on narrow screens.
  // Share its measured height with the feed's sticky index and anchor offsets.
  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return undefined;
    const surface = navigation.parentElement;
    const update = () => surface.style.setProperty('--archive-navigation-height', `${Math.max(48, Math.ceil(navigation.getBoundingClientRect().height))}px`);
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(navigation);
    return () => { observer?.disconnect(); surface.style.removeProperty('--archive-navigation-height'); };
  }, []);
  // Navigation handlers own direction; no per-frame React state.
  const enter = (next) => { setDirection(1); onFilterChange?.(next); };
  const back = (next) => { setDirection(-1); if (timeline && onOrderChange) onOrderChange(null); else onFilterChange?.(next); };
  const focus = (id) => onFocusGlyph?.(id);
  const hasFocus = Boolean(focusedId);
  // Timeline loads all public rows, not the meaning sample's first 200. Read the
  // same stored models/rules lazily, so later timeline entries retain their peers.
  const detailMeanings = useMemo(() => timeline && hasFocus ? {
    meaningVersion: MEANING_VERSION, morphologyVersion: MORPHOLOGY_VERSION,
    interpretations: Object.fromEntries(timeline.glyphs.map((glyph) => [glyph.id, interpretGlyphMeaning(glyph.model_data)])),
  } : meanings, [timeline, hasFocus, meanings]);
  const interpretation = detailMeanings?.interpretations?.[scene.focusedGlyph?.id];
  const typeFeed = useMemo(() => timeline && focusedId ? buildArchiveArchetypeFeed(timeline.glyphs, detailMeanings) : feed,
    [timeline, focusedId, detailMeanings, feed]);
  const root = scope.level === 'families';
  const portals = root && onOrderChange ? [...scope.nodes, { id: 'timeline', kind: 'timeline', title: t('archiveTimeline.allByTime') }] : scope.nodes;
  const selectedType = getGlyphArchetype(interpretation);
  const selectedMembers = selectedType ? (typeFeed.sections.find((section) => section.id === selectedType.id)?.glyphs || []) : [];
  const leaveDetail = () => focus(null);

  return (
    <Box component="section" aria-label={ t('archiveDepthExplorer.exploreGlyphGroupsInDepth') } data-archive-depth={ scene.level }
      onKeyDown={ (event) => { if (event.key === 'Escape' && (focusedId || !root)) { event.preventDefault(); if (focusedId) leaveDetail(); else back(scope.parentFilter); } } }
      sx={ { color: 'custom.chamber.ink', '--archive-navigation-height': '48px' } }>
      <Box component="nav" ref={ navigationRef } data-archive-navigation aria-label={ t('archiveDepthExplorer.yourPlaceInTheArchive') }
        sx={ { position: 'sticky', top: { xs: 'calc(64px + env(safe-area-inset-top, 0px))', md: 'calc(80px + env(safe-area-inset-top, 0px))' },
          zIndex: (theme) => theme.zIndex.appBar - 1, bgcolor: !root || focusedId ? 'custom.chamber.fog' : 'transparent',
          minHeight: 48, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' } }>
        { (focusedId || !root) && <Button data-archive-back sx={ actionSx } onClick={ focusedId ? leaveDetail : () => back(scope.parentFilter) }>← { t(focusedId ? 'archiveDepthExplorer.backToList' : 'archiveDepthExplorer.oneLayerOut') }</Button> }
        { !root && scope.selectedGroup && <Button sx={ actionSx } onClick={ () => back(EMPTY_ARCHIVE_FILTER) }>{ t('archiveDepthExplorer.all') }</Button> }
        { scope.base && scope.selectedGroup && <><Typography aria-hidden="true">/</Typography><Button sx={ actionSx } onClick={ () => back({ ...EMPTY_ARCHIVE_FILTER, base: scope.base }) }>{ localize(MEANING_CATALOG[scope.base].label) }</Button></> }
        { scope.selectedGroup && <Typography variant="caption" sx={ { overflowWrap: 'anywhere', py: 1 } }>/ { localize(selectedArchetype?.title || scope.selectedGroup.title) }</Typography> }
        { order && !focusedId && onOrderChange && <Button data-archive-order sx={ actionSx } onClick={ () => onOrderChange(order === 'newest' ? 'oldest' : 'newest') }
          aria-label={ t(order === 'newest' ? 'archiveTimeline.switchOldest' : 'archiveTimeline.switchNewest') }>
          { t(order === 'newest' ? 'archiveTimeline.newest' : 'archiveTimeline.oldest') } ↕
        </Button> }
        { (!root || focusedId) && onShare && <IconButton sx={ { ...shareIconSx, ml: 'auto' } } onClick={ onShare }
          aria-label={ t('archiveDepthExplorer.shareThisSpace') } title={ t('archiveDepthExplorer.shareThisSpace') }>
          <ShareOutlinedIcon sx={ { fontSize: 20 } } />
        </IconButton> }
      </Box>
      <Box data-archive-list-view hidden={ Boolean(focusedId) } inert={ Boolean(focusedId) } sx={ { display: focusedId ? 'none' : 'block' } }>
      <Box sx={ { textAlign: 'center', pt: { xs: 3, md: 4 }, pb: { xs: 1, md: 2 } } }>
        { root && <Typography sx={ { fontSize: 11, letterSpacing: '0.2em', mb: 1.5 } }>{ t('archiveDepthExplorer.baseFamilySymbol') }</Typography> }
        <Typography ref={ titleRef } tabIndex={ -1 } component="h1" sx={ {
          m: 0, fontFamily: SERIF, fontWeight: 400, fontSize: root ? { xs: 25, sm: 36, md: 44 } : { xs: 23, md: 34 },
          letterSpacing: '0.06em', overflowWrap: 'anywhere', lineHeight: 1.6,
          '&:focus': { outline: 'none' },
        } }>{ localize(selectedArchetype?.title || scope.title) }</Typography>
        { scope.subtitle && <Typography sx={ { mt: 1.5, fontSize: { xs: 13, md: 14 }, lineHeight: 1.8 } }>{ localize(scope.subtitle) }</Typography> }
      </Box>
      <AnimatePresence mode="wait" custom={ direction }>
        <MotionBox key={ timeline ? 'timeline' : scope.scopeKey } data-archive-scope={ scope.scopeKey } custom={ direction } variants={ reducedMotion ? STILL_VARIANTS : DEPTH_VARIANTS }
          initial="enter" animate="present" exit="leave" transition={ transition }
          sx={ { transformOrigin: '50% 32%', minHeight: root ? '50svh' : 300 } }>
          { portals.length > 0 && <Box role="group" aria-label={ t('archiveDepthExplorer.parentGlyphGroup') } sx={ {
            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            columnGap: { xs: 1, md: 3 }, rowGap: 3, maxWidth: 1200, mx: 'auto', pt: { xs: 2, md: 3 }, pb: 4,
            [theme.breakpoints.down('md')]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
          } }>{ portals.map((node) => <Box key={ node.id } data-archive-portal={ node.id } sx={ { minWidth: 0, ...(node.kind === 'timeline' ? { gridColumn: 2, gridRow: 2 } : {}) } }><ClusterPortal node={ node } onSelect={ node.kind === 'timeline' ? () => { setDirection(1); onOrderChange('newest'); } : enter } /></Box>) }</Box> }

          { !root && <ArchiveArchetypeFeed feed={ feed } onSelect={ focus } /> }

          { !portals.length && !scope.glyphs.length && <Typography role="status" sx={ { textAlign: 'center', py: 8 } }>{ t('archiveDepthExplorer.thereAreNoGlyphsHereYetFollow') }</Typography> }
          { !portals.length && scope.glyphs.length > 0 && root && <Typography role="status" sx={ { textAlign: 'center', py: 4 } }>{ t('archiveDepthExplorer.someResponsesHaveNotYetFormedA') }</Typography> }
        </MotionBox>
      </AnimatePresence>
      </Box>
      { scene.focusedGlyph && <ArchiveSelectedGlyph key={ scene.focusedGlyph.id } glyph={ scene.focusedGlyph }
        interpretation={ interpretation } interpretations={ detailMeanings?.interpretations } members={ selectedMembers } onSelect={ focus } /> }
      { focusedId && !scene.focusedGlyph && <Typography role="status" sx={ { textAlign: 'center', py: 8 } }>{ t('archiveDepthExplorer.glyphUnavailable') }</Typography> }
    </Box>
  );
}
