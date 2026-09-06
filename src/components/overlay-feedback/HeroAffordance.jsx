import { motion, useTransform } from 'framer-motion';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useI18n } from '../../i18n/useI18n';
import { INK_LIGHT, INK_DARK } from '../kinetic-typography/scrub/inkMotion';
import { HERO_AUTOPLAY_FROM, HERO_VIDEO_DURATION } from '../../data/heptapodHeroStory';

const AUTOPLAY_CAP = HERO_AUTOPLAY_FROM / HERO_VIDEO_DURATION;
const LABELS = {
  loading: 'heroAffordance.loading',
  waiting: 'heroAffordance.waiting',
  playing: 'heroAffordance.playing',
  handoff: 'heroAffordance.playing',
  error: 'heroAffordance.error',
};

/** 스크롤·재생·로딩 중 현재 상태에 해당하는 안내 하나만 표시한다. */
export default function HeroAffordance({
  state, progress, loadProgress = 0, isMobile = false,
  reducedMotion = false, onRetry,
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const color = useTransform(progress, [0.9, 0.99], [INK_LIGHT, INK_DARK]);
  const playbackProgress = useTransform(progress, (p) => Math.max(0, Math.min(1, (p - AUTOPLAY_CAP) / (1 - AUTOPLAY_CAP))));

  const isScroll = state === 'scroll';
  const visible = state !== 'handoff';
  const label = isScroll
    ? t(isMobile ? 'heroAffordance.swipe' : 'heroAffordance.scroll')
    : t(LABELS[state]);
  const duration = reducedMotion ? 0 : theme.transitions.duration.short;

  return (
    <Box
      component={ motion.div }
      data-hero-affordance={ state }
      data-visible={ visible }
      aria-hidden={ !visible }
      style={ { color } }
      sx={ {
        position: 'fixed', zIndex: 3, left: '50%', transform: 'translateX(-50%)',
        bottom: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', md: 32 },
        width: { xs: 'calc(100% - 128px)', md: 320 }, maxWidth: 320,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25,
        textAlign: 'center', pointerEvents: 'none', opacity: visible ? 1 : 0,
        transition: theme.transitions.create('opacity', { duration }),
      } }
    >
      { isScroll && (
        <Box
          key={ visible ? 'idle' : 'moving' }
          component="svg" viewBox="0 0 24 24" aria-hidden="true"
          sx={ {
            width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 1.25,
            animation: !reducedMotion && visible ? 'hero-cue-nudge 1.1s ease-in-out 2' : 'none',
            '@keyframes hero-cue-nudge': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: `translateY(${isMobile ? -4 : 4}px)` },
            },
          } }
        >
          <path d={ isMobile ? 'M12 20V4m-5 5 5-5 5 5' : 'M12 4v16m-5-5 5 5 5-5' } />
        </Box>
      ) }
      { !isScroll && state !== 'error' && (
        <Box aria-hidden="true" sx={ { width: 96, height: 2, position: 'relative', overflow: 'hidden' } }>
          <Box sx={ { position: 'absolute', inset: 0, bgcolor: 'currentColor', opacity: 0.2 } } />
          <Box
            component={ motion.div }
            style={ { scaleX: state === 'loading' ? loadProgress : playbackProgress } }
            sx={ { height: '100%', bgcolor: 'currentColor', transformOrigin: 'left center' } }
          />
        </Box>
      ) }
      <Typography
        role="status" aria-live="polite" aria-atomic="true"
        sx={ { fontFamily: theme.typography?.custom?.mono?.fontFamily || 'monospace', fontSize: { xs: 11, md: 12 }, letterSpacing: '0.04em', lineHeight: 1.6 } }
      >{ label }</Typography>
      { state === 'error' && (
        <Button onClick={ onRetry } variant="outlined" size="small" sx={ { color: 'inherit', borderColor: 'currentColor', pointerEvents: 'auto', minHeight: 44 } }>
          { t('heroAffordance.retry') }
        </Button>
      ) }
    </Box>
  );
}
