import AppGNB from '../navigation/AppGNB';
import { useArchiveScroll } from '../../routes/useArchiveScroll';
import { useI18n } from '../../i18n/useI18n.js';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import { useArchiveGlyphs } from '../../hooks/data/useArchiveGlyphs';
import { useArchiveMeanings } from '../../hooks/data/useArchiveMeanings';
import ArchiveDepthExplorer from '../data-display/ArchiveDepthExplorer';
import SocialShareDialog from '../overlay-feedback/SocialShareDialog';
import { filterMeaningGlyphs } from '../../utils/heptapod/archiveDepthView';
import { archiveDepthPath as depthPath, parseArchiveDepthSearch, glyphArchetypeShareCopy } from '../../utils/heptapod/shareArchive';
import LogogramChamber from '../motion/LogogramChamber';
import { createBackgroundMusic } from '../../utils/heptapod/backgroundMusic';
import { APP_PATHS } from '../../routes/paths';

const MUSIC_AUTOPLAY = import.meta.env.VITE_MUSIC_AUTOPLAY !== 'false';
const SERIF = "'Cinzel', 'Noto Serif KR', Georgia, serif";
const actionSx = { color: 'custom.chamber.ink', minHeight: 44, fontSize: 13, textTransform: 'none' };

/** Public archive, immediately visible. Projects the existing loaded local/API
 * snapshot into depth. Sound defaults on; formation and the single Lenis survive.
 */
export default function MyArchivePage({ client, meaningProvider, musicAutoplay = MUSIC_AUTOPLAY }) {
  const { locale, t } = useI18n();
  const theme = useTheme();
  const navigate = useNavigate();
  const { search } = useLocation();
  const { filter: meaningFilter, focusedId, order, unsupportedVersion, invalidLocation } = useMemo(() => parseArchiveDepthSearch(search), [search]);
  // List and individual detail have independent, restorable scroll positions.
  const viewPath = useMemo(() => depthPath(meaningFilter, focusedId, { order }), [meaningFilter, focusedId, order]);
  const { glyphs, loading, error, refetch } = useArchiveGlyphs({ client, all: Boolean(order) });
  const ready = !loading && !error;
  const { meanings, loading: interpreting, error: meaningError, refetch: retryMeanings } = useArchiveMeanings(glyphs, { enabled: !order && ready && !unsupportedVersion && !invalidLocation, provider: meaningProvider });
  const [socialShare, setSocialShare] = useState(null);
  const musicRef = useRef(null);
  const [isMusicOn, setIsMusicOn] = useState(musicAutoplay);
  const visibleGlyphs = useMemo(() => order ? glyphs : filterMeaningGlyphs(glyphs, meanings, meaningFilter), [glyphs, meanings, meaningFilter, order]);
  const shareable = Boolean((order || meanings) && (!focusedId || visibleGlyphs.some((glyph) => glyph.id === focusedId)));

  useEffect(() => {
    const music = createBackgroundMusic();
    musicRef.current = music;
    return () => { music.dispose(); musicRef.current = null; };
  }, []);
  useEffect(() => {
    if (!isMusicOn) { musicRef.current?.pause(); return undefined; }
    musicRef.current?.play();
    const kick = () => {
      musicRef.current?.play();
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
  }, [isMusicOn]);
  const handleToggleMusic = () => {
    const next = !isMusicOn;
    setIsMusicOn(next);
    if (next) musicRef.current?.play();
    else musicRef.current?.pause();
  };
  useArchiveScroll(viewPath, ready && !interpreting && !meaningError);

  const changeMeaningFilter = (filter) => {
    setSocialShare(null);
    navigate(depthPath(filter)); // Push: browser Back retraces every layer.
  };
  const focusGlyph = (id) => {
    if (id !== null && !visibleGlyphs.some((glyph) => glyph.id === id)) return;
    setSocialShare(null);
    navigate(depthPath(meaningFilter, id, { order }));
  };
  const shareSpace = async () => {
    if (!shareable) return;
    setSocialShare(null);
    const url = new URL(depthPath(meaningFilter, focusedId, { order }), window.location.origin).href;
    const focusedGlyph = focusedId ? visibleGlyphs.find((glyph) => glyph.id === focusedId) : null;
    const copy = focusedGlyph && !unsupportedVersion
      ? glyphArchetypeShareCopy(focusedGlyph, meanings?.interpretations?.[focusedId], locale) : null;
    setSocialShare({ ...(copy || { title: t('myArchivePage.theResponseArchive'), text: t('myArchivePage.whichNamesWillYouMeetWithinThis') }), url });
  };

  return (
    <Box sx={ { position: 'relative', isolation: 'isolate', minHeight: '100svh', bgcolor: 'custom.chamber.fog', color: 'custom.chamber.ink', overflowX: 'clip' } }>
      <Box aria-hidden="true" sx={ { position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' } }><LogogramChamber isFullscreen /></Box>
      <AppGNB soundOn={ isMusicOn } onToggleSound={ handleToggleMusic } />

      <Box component="main" sx={ { px: { xs: 2, sm: 4, md: 6 }, pb: { xs: 3, md: 5 }, maxWidth: 1600, mx: 'auto', minHeight: 'calc(100svh - 100px)',
        [theme.breakpoints.down('md')]: { pl: 'max(16px, env(safe-area-inset-left, 0px))', pr: 'max(16px, env(safe-area-inset-right, 0px))', pb: 'max(24px, env(safe-area-inset-bottom, 0px))' },
      } }>
        { loading || (ready && !unsupportedVersion && interpreting) ? <Box role="status" sx={ { minHeight: '65svh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 } }>
          <CircularProgress color="inherit" size={ 18 } /><Typography sx={ { fontSize: 14 } }>{ t('myArchivePage.glyphsAreGatheringBeyondTheMist') }</Typography>
        </Box> : error || meaningError ? <Box role="alert" sx={ { textAlign: 'center', py: 12 } }>
          <Typography>{ t('myArchivePage.glyphsCannotBeLoadedRightNow') }</Typography><Button sx={ actionSx } onClick={ error ? refetch : retryMeanings }>{ t('myArchivePage.reload') }</Button>
        </Box> : unsupportedVersion ? <Box role="status" sx={ { textAlign: 'center', py: 12 } }>
          <Typography>{ t('myArchivePage.thisLinkSMeaningRulesAreNot') }</Typography><Button sx={ actionSx } onClick={ () => changeMeaningFilter({}) }>{ t('myArchivePage.enterTheCurrentArchive') }</Button>
        </Box> : invalidLocation ? <Box role="status" sx={ { textAlign: 'center', py: 12 } }>
          <Typography>{ t('myArchivePage.thisSpaceSAddressCouldNotBe') }</Typography><Button sx={ actionSx } onClick={ () => changeMeaningFilter({}) }>{ t('myArchivePage.returnToAllGlyphGroups') }</Button>
        </Box> : glyphs.length === 0 ? <Box role="status" sx={ { textAlign: 'center', py: 12 } }>
          <Typography sx={ { fontFamily: SERIF, fontSize: 26 } }>{ t('myArchivePage.waitingForTheFirstResponse') }</Typography>
          <Button sx={ { ...actionSx, mt: 3 } } onClick={ () => navigate(APP_PATHS.canvas) }>{ t('myArchivePage.startWithMyName') }</Button>
        </Box> : <ArchiveDepthExplorer order={ order } onOrderChange={ (next) => navigate(depthPath({}, null, { order: next })) } glyphs={ glyphs } meanings={ meanings } filter={ meaningFilter } focusedId={ focusedId }
          onFilterChange={ changeMeaningFilter } onFocusGlyph={ focusGlyph } onShare={ shareable ? shareSpace : undefined } /> }
      </Box>
      <SocialShareDialog payload={ socialShare } onClose={ () => setSocialShare(null) } />
    </Box>
  );
}
