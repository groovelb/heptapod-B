import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import AppGNB from '../navigation/AppGNB';
import ArchiveDepthExplorer from '../data-display/ArchiveDepthExplorer';
import ArchiveSelectedGlyph from '../data-display/ArchiveSelectedGlyph';
import LogogramChamber from '../motion/LogogramChamber';
import SocialShareDialog from '../overlay-feedback/SocialShareDialog';
import { useI18n } from '../../i18n/useI18n';
import { useGlyph } from '../../hooks/data/useGlyph';
import { useArchiveGlyphs } from '../../hooks/data/useArchiveGlyphs';
import { useArchiveMeanings } from '../../hooks/data/useArchiveMeanings';
import { archiveShareData, archiveDepthPath, parseArchiveMeaningSearch } from '../../utils/heptapod/shareArchive';
import { createBackgroundMusic } from '../../utils/heptapod/backgroundMusic';
import { publicEnv } from '../../lib/publicEnv';

const actionSx = { color: 'custom.chamber.ink', minHeight: 44, typography: 'editorialAction', textTransform: 'none' };

/** /glyph/:id uses the Archive's actual detail view and reading tokens.
 * Only route ownership and the public UUID share destination differ.
 */
export default function GlyphDetailPage({ client }) {
  const { locale, localize, t } = useI18n();
  const theme = useTheme();
  const { id } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const { unsupportedVersion } = useMemo(() => parseArchiveMeaningSearch(search), [search]);
  const { glyph, loading, error, refetch } = useGlyph(id, { client });
  const archive = useArchiveGlyphs({ client });
  // Keep a direct UUID entry even when it falls outside the archive's recent sample.
  const glyphs = useMemo(() => glyph ? [glyph, ...archive.glyphs.filter((row) => row.id !== glyph.id)].slice(0, 200) : [], [glyph, archive.glyphs]);
  const { meanings, loading: interpreting, error: meaningError, refetch: retryMeanings } = useArchiveMeanings(glyphs, {
    enabled: Boolean(glyph) && !archive.loading && !unsupportedVersion,
  });
  const interpretation = meanings?.interpretations?.[glyph?.id];
  const [socialShare, setSocialShare] = useState(null);
  const [shareError, setShareError] = useState('');
  const musicRef = useRef(null);
  const [isMusicOn, setIsMusicOn] = useState(publicEnv.musicAutoplay);

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
  const toggleMusic = useCallback(() => setIsMusicOn((on) => !on), []);
  const back = () => navigate('/archive');
  const select = (nextId) => navigate(nextId ? `/glyph/${nextId}${search}` : '/archive');
  const share = () => {
    setShareError('');
    try {
      const hasMeaning = !unsupportedVersion && interpretation?.meaningIds.length > 0;
      setSocialShare(archiveShareData({ left: glyph, interpretation: hasMeaning ? interpretation : undefined,
        reason: hasMeaning ? t('glyphDetailPage.archiveInterpretationV1', { p0: localize(interpretation.title), p1: localize(interpretation.reading) }) : undefined },
      hasMeaning ? { locale, reading: 'meaning', meaningVersion: interpretation.meaningVersion } : { locale }));
    } catch (err) { setShareError(err.message); }
  };
  const busy = loading || (glyph && !unsupportedVersion && (archive.loading || interpreting));

  return <Box data-glyph-detail-page sx={ { position: 'relative', isolation: 'isolate', minHeight: '100svh', bgcolor: 'custom.chamber.fog', color: 'custom.chamber.ink', overflowX: 'clip' } }>
    <Box aria-hidden="true" sx={ { position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' } }><LogogramChamber isFullscreen /></Box>
    <AppGNB soundOn={ isMusicOn } onToggleSound={ toggleMusic } />
    <Box component="main" sx={ { px: theme.editorial.archivePage.gutter, pb: theme.editorial.archivePage.bottomInset,
      maxWidth: `calc(${theme.editorial.spread} + ${theme.spacing(theme.editorial.archivePage.gutter.md * 2)})`, mx: 'auto',
      minHeight: { xs: `calc(100svh - ${theme.editorial.archivePage.navigationTop.xs})`, md: `calc(100svh - ${theme.editorial.archivePage.navigationTop.md})` },
      [theme.breakpoints.down('md')]: {
        pl: { xs: `max(${theme.spacing(theme.editorial.archivePage.gutter.xs)}, env(safe-area-inset-left, 0px))`, sm: `max(${theme.spacing(theme.editorial.archivePage.gutter.sm)}, env(safe-area-inset-left, 0px))` },
        pr: { xs: `max(${theme.spacing(theme.editorial.archivePage.gutter.xs)}, env(safe-area-inset-right, 0px))`, sm: `max(${theme.spacing(theme.editorial.archivePage.gutter.sm)}, env(safe-area-inset-right, 0px))` },
        pb: `max(${theme.spacing(theme.editorial.archivePage.bottomInset.xs)}, env(safe-area-inset-bottom, 0px))`,
      },
    } }>
      { busy ? <Box role="status" sx={ { minHeight: '65svh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 } }>
        <CircularProgress color="inherit" size={ 18 } /><Typography sx={ { fontSize: 14 } }>{ t('myArchivePage.glyphsAreGatheringBeyondTheMist') }</Typography>
      </Box> : error || !glyph ? <Box role="status" sx={ { textAlign: 'center', py: 12 } }>
        <Typography component="h1" sx={ { typography: 'editorialTitle' } }>{ t('glyphDetailPage.signalNotFound') }</Typography>
        <Typography sx={ { typography: 'editorialBody', mt: 2 } }>{ t(error ? 'glyphDetailPage.theResponseCouldNotBeLoadedTry' : 'glyphDetailPage.thisResponseDoesNotExistOrIs') }</Typography>
        { error && <Button sx={ actionSx } onClick={ refetch }>{ t('archiveClusterExplorer.tryAgain') }</Button> }
        <Button sx={ actionSx } onClick={ back }>{ t('glyphDetailPage.goToPublicArchive') }</Button>
      </Box> : <>
        { archive.error && <Alert severity="info" action={ <Button onClick={ archive.refetch }>{ t('archiveClusterExplorer.tryAgain') }</Button> }>{ t('myArchivePage.glyphsCannotBeLoadedRightNow') }</Alert> }
        { meaningError ? <Alert severity="error" action={ <Button onClick={ retryMeanings }>{ t('archiveClusterExplorer.tryAgain') }</Button> }>{ localize(meaningError) }</Alert>
          : unsupportedVersion ? <>
            <Box sx={ { display: 'flex', justifyContent: 'space-between' } }>
              <Button sx={ actionSx } onClick={ back }>← { t('archiveDepthExplorer.backToList') }</Button>
              <Button sx={ actionSx } onClick={ share }>{ t('archiveDepthExplorer.shareThisSpace') }</Button>
            </Box>
            <Alert severity="info">{ t('glyphDetailPage.theMeaningRulesInThisLinkAre') }</Alert>
            <ArchiveSelectedGlyph key={ id } glyph={ glyph } onBack={ back } onShare={ share } />
          </> : <ArchiveDepthExplorer key={ id } detailOnly glyphs={ glyphs } meanings={ meanings } focusedId={ id }
            onFocusGlyph={ select } onFilterChange={ (filter) => navigate(archiveDepthPath(filter)) } onShare={ share } /> }
        <Box sx={ { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, pb: theme.editorial.archivePage.bottomInset } }>
          <Button component={ RouterLink } to={ `/compare/${id}` } sx={ actionSx }>{ t('glyphDetailPage.encodeMyNameAndCompare') }</Button>
          <Button component={ RouterLink } to={ `/field/${id}` } sx={ actionSx }>{ t('glyphDetailPage.exploreTheFormResonanceMap') }</Button>
        </Box>
        { shareError && <Alert severity="error">{ localize(shareError) }</Alert> }
      </> }
    </Box>
    <SocialShareDialog payload={ socialShare } onClose={ () => setSocialShare(null) } />
  </Box>;
}
