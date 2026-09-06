import AppGNB from '../navigation/AppGNB';
import { useArchiveScroll } from '../../routes/useArchiveScroll';
import { useI18n } from '../../i18n/useI18n.js';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import { useArchiveGlyphs } from '../../hooks/data/useArchiveGlyphs';
import { useArchiveMeanings } from '../../hooks/data/useArchiveMeanings';
import ArchiveDepthExplorer from '../data-display/ArchiveDepthExplorer';
import { filterMeaningGlyphs } from '../../utils/heptapod/archiveDepthView';
import { archiveDepthPath as depthPath, parseArchiveDepthSearch, glyphArchetypeShareCopy } from '../../utils/heptapod/shareArchive';
import LogogramChamber from '../motion/LogogramChamber';
import { createBackgroundMusic } from '../../utils/heptapod/backgroundMusic';
import { APP_PATHS } from '../../routes/paths';

const SERIF = "'Cinzel', 'Noto Serif KR', Georgia, serif";
const actionSx = { color: 'custom.chamber.ink', minHeight: 44, fontSize: 13, textTransform: 'none' };

/** Public archive, immediately visible. Projects the existing loaded local/API
 * snapshot into depth. Sound is opt-in; formation and the single Lenis survive.
 */
export default function MyArchivePage({ client, meaningProvider }) {
  const { locale, localize, t } = useI18n();
  const navigate = useNavigate();
  const { search } = useLocation();
  const { filter: meaningFilter, focusedId, unsupportedVersion, invalidLocation } = useMemo(() => parseArchiveDepthSearch(search), [search]);
  // The catalog orders the feed; person focus does not change its scope.
  const scopePath = useMemo(() => depthPath(meaningFilter), [meaningFilter]);
  const { glyphs, loading, error, refetch } = useArchiveGlyphs({ client });
  const ready = !loading && !error;
  const { meanings, loading: interpreting, error: meaningError, refetch: retryMeanings } = useArchiveMeanings(glyphs, { enabled: ready && !unsupportedVersion && !invalidLocation, provider: meaningProvider });
  const [shareNotice, setShareNotice] = useState('');
  const [shareError, setShareError] = useState('');
  const musicRef = useRef(null);
  const [isMusicOn, setIsMusicOn] = useState(false);
  const visibleGlyphs = useMemo(() => filterMeaningGlyphs(glyphs, meanings, meaningFilter), [glyphs, meanings, meaningFilter]);
  const shareable = Boolean(meanings && (!focusedId || visibleGlyphs.some((glyph) => glyph.id === focusedId)));

  useEffect(() => {
    const music = createBackgroundMusic();
    musicRef.current = music;
    return () => { music.dispose(); musicRef.current = null; };
  }, []);
  useArchiveScroll(scopePath, ready && !interpreting && !meaningError);

  const changeMeaningFilter = (filter) => {
    setShareNotice(''); setShareError('');
    navigate(depthPath(filter)); // Push: browser Back retraces every layer.
  };
  const focusGlyph = (id) => {
    if (id !== null && !visibleGlyphs.some((glyph) => glyph.id === id)) return;
    setShareNotice(''); setShareError('');
    navigate(depthPath(meaningFilter, id));
  };
  const shareSpace = async () => {
    if (!shareable) return;
    setShareNotice(''); setShareError('');
    const url = new URL(depthPath(meaningFilter, focusedId), window.location.origin).href;
    const focusedGlyph = focusedId ? visibleGlyphs.find((glyph) => glyph.id === focusedId) : null;
    const copy = focusedGlyph && !unsupportedVersion
      ? glyphArchetypeShareCopy(focusedGlyph, meanings.interpretations[focusedId], locale) : null;
    try {
      if (navigator.share) {
        try { await navigator.share({ ...(copy || { title: t('myArchivePage.theResponseArchive'), text: t('myArchivePage.whichNamesWillYouMeetWithinThis') }), url }); return; }
        catch (err) { if (err.name === 'AbortError') return; }
      }
      if (!navigator.clipboard?.writeText) throw new Error(t('myArchivePage.copyTheLinkFromTheAddressBar'));
      await navigator.clipboard.writeText(url);
      setShareNotice(t('myArchivePage.linkToThisSpaceCopied'));
    } catch (err) { setShareError(err.message || t('myArchivePage.thisLinkCannotBeSharedRightNow')); }
  };

  return (
    <Box sx={ { position: 'relative', isolation: 'isolate', minHeight: '100svh', bgcolor: 'custom.chamber.fog', color: 'custom.chamber.ink', overflowX: 'clip' } }>
      <Box aria-hidden="true" sx={ { position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' } }><LogogramChamber isFullscreen /></Box>
      <AppGNB soundOn={ isMusicOn } onToggleSound={ () => setIsMusicOn(musicRef.current?.toggle() ?? false) } />

      <Box component="main" sx={ { px: { xs: 2, sm: 4, md: 6 }, pb: { xs: 3, md: 5 }, maxWidth: 1600, mx: 'auto', minHeight: 'calc(100svh - 100px)' } }>
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
        </Box> : <ArchiveDepthExplorer glyphs={ glyphs } meanings={ meanings } filter={ meaningFilter } focusedId={ focusedId }
          shareNotice={ shareNotice } shareError={ shareError }
          onFilterChange={ changeMeaningFilter } onFocusGlyph={ focusGlyph } onShare={ shareable ? shareSpace : undefined }
          onInspectGlyph={ (id) => navigate(`/glyph/${id}?reading=meaning&mv=1`) }
          onCompare={ (leftId, rightId) => navigate(`/compare/${leftId}/${rightId}?reading=meaning&mv=1`) } /> }
        { shareNotice && <Typography role="status" sx={ { textAlign: 'center', py: 2, fontSize: 13 } }>{ localize(shareNotice) }</Typography> }
        { shareError && <Typography role="alert" sx={ { textAlign: 'center', py: 2, fontSize: 13 } }>{ localize(shareError) }</Typography> }
      </Box>
    </Box>
  );
}
