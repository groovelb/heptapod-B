import AppGNB from '../navigation/AppGNB';
import { useI18n } from '../../i18n/useI18n.js';
import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import ShareIcon from '@mui/icons-material/Share';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useGlyph } from '../../hooks/data/useGlyph';
import { useGlyphRelations } from '../../hooks/data/useGlyphRelations';
import LogogramRendererCanvas from '../motion/LogogramRendererCanvas';
import ResonanceList from '../data-display/ResonanceList';
import RelationInspector from '../overlay-feedback/RelationInspector';
import GlyphMeaningSummary from '../data-display/GlyphMeaningSummary';
import SocialShareDialog from '../overlay-feedback/SocialShareDialog';
import { buildMeaningReading } from '../../utils/heptapod/buildMeaningReading';
import GlyphClusterLink from '../data-display/GlyphClusterLink';
import GlyphObservationOverlay from '../overlay-feedback/GlyphObservationOverlay';
import { interpretGlyphMeaning } from '../../utils/heptapod/interpretGlyphMeaning';
import { isRenderableGlyphModel } from '../../utils/heptapod/extractGlyphFeatures';
import { groupResonanceRows, glyphLabel } from '../../utils/heptapod/resonanceView';
import { archiveShareData, parseArchiveMeaningSearch } from '../../utils/heptapod/shareArchive';
import { createAmbientAudio } from '../../utils/heptapod/ambientAudio';
import { createBackgroundMusic } from '../../utils/heptapod/backgroundMusic';

const SERIF_ALL = "'Cinzel', 'Noto Serif KR', 'Noto Serif SC', 'Fraunces', Georgia, serif";
const MONO = "'JetBrains Mono', 'IBM Plex Mono', monospace";
const INK = '#1c2226';
const MUSIC_AUTOPLAY = import.meta.env.VITE_MUSIC_AUTOPLAY !== 'false';

const ResponsiveLogogram = ({ model, maxSize = 360, onFormationComplete, anchors = [] }) => {
  const containerRef = useRef(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize(Math.floor(Math.min(entry.contentRect.width * 0.85, maxSize)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxSize]);

  return (
    <Box ref={ containerRef } sx={ { width: '100%', maxWidth: 420, display: 'flex', justifyContent: 'center', py: 3 } }>
      { size > 0 && (
        <Box sx={ { position: 'relative', width: size, height: size } }>
        <LogogramRendererCanvas
          model={ model }
          size={ size }
          isActive={ true }
          onFormationComplete={ onFormationComplete }
        />
        <GlyphObservationOverlay model={ model } anchors={ anchors } />
        </Box>
      ) }
    </Box>
  );
};

/**
 * GlyphDetailPage — 공개 Glyph 상세 페이지
 *
 * URL: /glyph/:id
 *
 * Example usage:
 * <Route path="/glyph/:id" element={<GlyphDetailPage />} />
 */
const GlyphDetailPage = ({ client }) => {
  const { locale, localize, t } = useI18n();
  const theme = useTheme();
  const mobileViewport = { [theme.breakpoints.down('md')]: { minHeight: '100dvh', pb: 'max(32px, env(safe-area-inset-bottom, 0px))', overflowWrap: 'anywhere' } };
  const { id } = useParams();
  const navigate = useNavigate();
  const { search } = useLocation();
  const { unsupportedVersion } = useMemo(() => parseArchiveMeaningSearch(search), [search]);
  const { glyph, loading, error, refetch } = useGlyph(id, { client });
  const { relations, loading: relLoading, error: relError, refetch: retryRelations, sampleSize, mappingStatus } = useGlyphRelations(id, { client });
  const [inspectedId, setInspectedId] = useState(null);
  const [socialShare, setSocialShare] = useState(null);
  const [shareError, setShareError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [meaningSelection, setMeaningSelection] = useState(null);
  const interpretation = useMemo(() => glyph?.model_data ? interpretGlyphMeaning(glyph.model_data) : null, [glyph?.model_data]);
  const canRenderModel = useMemo(() => isRenderableGlyphModel(glyph?.model_data), [glyph?.model_data]);
  const selectedMeaningIds = !unsupportedVersion && meaningSelection && meaningSelection.glyphId === glyph?.id ? meaningSelection.ids : [];
  const selectedMeaningAnchors = buildMeaningReading(interpretation).filter((entry) => selectedMeaningIds.includes(entry.id)).flatMap((entry) => entry.anchors);
  const neighbors = useMemo(() => groupResonanceRows(relations), [relations]);
  const inspected = neighbors.find((neighbor) => neighbor.id === inspectedId);
  const audioRef = useRef(null);
  const musicRef = useRef(null);
  const [isMusicOn, setIsMusicOn] = useState(MUSIC_AUTOPLAY);
  const soundFiredRef = useRef(false);

  useEffect(() => {
    audioRef.current = createAmbientAudio();
    return () => { audioRef.current?.dispose(); audioRef.current = null; };
  }, []);

  useEffect(() => {
    const music = createBackgroundMusic();
    musicRef.current = music;
    return () => { music.dispose(); musicRef.current = null; };
  }, []);

  useEffect(() => {
    if (!MUSIC_AUTOPLAY) return undefined;
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
  }, []);

  const handleToggleMusic = useCallback(() => {
    const on = musicRef.current?.toggle() ?? false;
    setIsMusicOn(on);
  }, []);

  const handleFormationComplete = useCallback(() => {
    if (!soundFiredRef.current) {
      soundFiredRef.current = true;
      audioRef.current?.formationComplete();
    }
  }, []);

  useEffect(() => {
    if (glyph && !soundFiredRef.current) {
      audioRef.current?.encodeStart();
    }
  }, [glyph]);

  const handleNodeSelect = useCallback((neighborId) => navigate(`/field/${neighborId}`), [navigate]);

  const handleShare = async () => {
    setSharing(true); setShareError('');
    try {
      const hasMeaning = !unsupportedVersion && interpretation?.meaningIds.length > 0;
      const payload = archiveShareData({ left: glyph, interpretation: hasMeaning ? interpretation : undefined,
        reason: hasMeaning ? t('glyphDetailPage.archiveInterpretationV1', { p0: localize(interpretation.title), p1: localize(interpretation.reading) }) : undefined },
        hasMeaning ? { locale, reading: 'meaning', meaningVersion: interpretation.meaningVersion } : { locale });
      setSocialShare(payload);
    } catch (err) { setShareError(err.message); }
    finally { setSharing(false); }
  };

  if (loading) {
    return (
      <Box sx={ { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'custom.chamber.fog', ...mobileViewport } }>
        <AppGNB overlay />
        <CircularProgress sx={ { color: 'rgba(28,34,38,0.25)' } } />
      </Box>
    );
  }

  if (error || !glyph) {
    return (
      <Box sx={ { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'custom.chamber.fog', color: INK, gap: 2, ...mobileViewport } }>
        <AppGNB overlay />
        <Typography variant="h5" sx={ { fontFamily: SERIF_ALL, letterSpacing: '0.1em' } }>{ t('glyphDetailPage.signalNotFound') }</Typography>
        <Typography variant="body2" sx={ { color: 'rgba(28,34,38,0.45)' } }>
          {error ? t('glyphDetailPage.theResponseCouldNotBeLoadedTry') : t('glyphDetailPage.thisResponseDoesNotExistOrIs')}
        </Typography>
        {error && <Button onClick={ refetch }>{ t('archiveClusterExplorer.tryAgain') }</Button>}
        <Button component={ RouterLink } to="/" sx={ { color: 'rgba(28,34,38,0.5)', mt: 2 } }>{ t('glyphDetailPage.goBack') }</Button>
      </Box>
    );
  }

  const model = glyph.model_data;
  const morphologySummary = Array.isArray(model?.clusters)
    ? t('glyphDetailPage.branches', { p0: model.clusters.length, p1: model.gap?.half > 0 ? t('glyphDetailPage.openRing') : t('glyphDetailPage.closedRing') })
    : t('glyphDetailPage.formDataUnconfirmed');

  return (
    <Box sx={ { minHeight: '100vh', bgcolor: 'custom.chamber.fog', color: INK, px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, sm: 6 }, ...mobileViewport } }>
      <AppGNB soundOn={ isMusicOn } onToggleSound={ handleToggleMusic } />
      <Box sx={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, borderBottom: '1px solid rgba(28,34,38,0.1)', pb: 2 } }>
        <IconButton onClick={ () => navigate('/archive') } aria-label={ t('glyphDetailPage.goToPublicArchive') } sx={ { color: 'rgba(28,34,38,0.7)' } }>
          <ArrowBackIcon />
        </IconButton>
      </Box>

      <Box sx={ { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, mb: 6 } }>
        {canRenderModel && (
          <ResponsiveLogogram model={ model } maxSize={ 360 } onFormationComplete={ handleFormationComplete } anchors={ selectedMeaningAnchors } />
        )}
        {!canRenderModel && <Typography role="status">{ t('glyphDetailPage.theGlyphCouldNotBeDrawnBecause') }</Typography>}
        <Typography
          variant="h4"
          sx={ {
            fontFamily: SERIF_ALL,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textAlign: 'center',
            color: INK,
            [theme.breakpoints.down('md')]: { maxWidth: '100%', minWidth: 0, overflowWrap: 'anywhere' },
          } }
        >
          {glyphLabel(glyph)}
        </Typography>
      </Box>

      {!unsupportedVersion && <GlyphClusterLink interpretation={ interpretation } sx={ { maxWidth: 640, mx: 'auto', mb: 3 } } />}

      { unsupportedVersion ? <Alert severity="info" sx={ { maxWidth: 640, mx: 'auto', mb: 4 } }>{ t('glyphDetailPage.theMeaningRulesInThisLinkAre') }</Alert>
        : interpretation && <GlyphMeaningSummary interpretation={ interpretation } variant="reading" selectedObservationIds={ selectedMeaningIds }
          onToggleObservation={ (entry) => setMeaningSelection((previous) => {
            const ids = previous?.glyphId === glyph.id ? previous.ids : [];
            return { glyphId: glyph.id, ids: ids.includes(entry.id) ? ids.filter((id) => id !== entry.id) : [...ids, entry.id] };
          }) }
          sx={ { maxWidth: 640, mx: 'auto', mb: 5 } } /> }

      <Box sx={ { maxWidth: 480, mx: 'auto', mb: 6, border: '1px solid rgba(28,34,38,0.12)', borderRadius: 1, p: 2.5 } }>
        <Box sx={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
          [theme.breakpoints.down('md')]: { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', '& > *': { minWidth: 0, overflowWrap: 'anywhere' } } } }>
          {[
            [t('glyphDetailPage.fingerprint'), glyph.fingerprint ? `${glyph.fingerprint.slice(0, 16)}…` : t('glyphDetailPage.notRecorded')],
            [t('glyphDetailPage.encoder'), `v${glyph.encoder_version}`],
            [t('glyphMeaningSummary.formObservation'), morphologySummary],
            [t('glyphDetailPage.contributors'), glyph.contribution_count ?? t('glyphDetailPage.unconfirmed')],
          ].map(([label, value]) => (
            <Box key={ label } sx={ { py: 0.75 } }>
              <Typography variant="caption" sx={ { color: 'rgba(28,34,38,0.35)', fontFamily: MONO, fontSize: '0.65rem', letterSpacing: '0.1em' } }>
                {localize(label)}
              </Typography>
              <Typography variant="body2" sx={ { fontFamily: MONO, fontSize: '0.8rem', color: 'rgba(28,34,38,0.7)' } }>
                {localize(value)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={ { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mb: 2 } }>
        <Button component={ RouterLink } to={ `/compare/${id}` } sx={ { color: INK } }>{ t('glyphDetailPage.encodeMyNameAndCompare') }</Button>
        <IconButton onClick={ handleShare } disabled={ sharing } sx={ { color: 'rgba(28,34,38,0.7)', border: '1px solid rgba(28,34,38,0.12)' } } aria-label={ t('glyphDetailPage.sharePublicGlyph') }>
          <ShareIcon />
        </IconButton>
      </Box>
      {shareError && <Alert severity="error" sx={ { maxWidth: 560, mx: 'auto', mb: 2 } }>{localize(shareError)}</Alert>}

      {neighbors.length > 0 && (
        <Box sx={ { textAlign: 'center', mb: 4 } }>
          <Button
            component={ RouterLink }
            to={ `/field/${id}` }
            sx={ {
              color: 'rgba(28,34,38,0.55)',
              fontFamily: MONO,
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              borderBottom: '1px solid rgba(28,34,38,0.2)',
              borderRadius: 0,
              '&:hover': { borderColor: 'rgba(28,34,38,0.5)' },
            } }
          >{ t('glyphDetailPage.exploreTheFormResonanceMap') }</Button>
        </Box>
      )}

      <Box sx={ { maxWidth: 560, mx: 'auto' } }>
        <Typography
          variant="overline"
          sx={ { fontFamily: MONO, fontSize: '0.65rem', color: 'rgba(28,34,38,0.35)', letterSpacing: '0.15em', mb: 2, display: 'block' } }
        >{ t('glyphDetailPage.resonanceFoundInThisGlyph') }{relLoading && '…'}
        </Typography>
        {!relLoading && !relError && <Typography variant="body2" sx={ { mb: 2, opacity: 0.7 } }>{ t('glyphDetailPage.basedOn') }{sampleSize || 0}{ t('glyphDetailPage.publicGlyphsCompared') }{mappingStatus === 'partial-sample' && t('glyphDetailPage.someGlyphsWereExcludedBecauseTheirModels')}{ t('glyphDetailPage.similarFeaturesAreFoundInActualBranches') }</Typography>}
        <ResonanceList
          centerName={ glyphLabel(glyph) }
          relations={ neighbors.slice(0, 3) }
          onNodeSelect={ handleNodeSelect }
          onInspect={ (neighbor) => setInspectedId(neighbor.id) }
          loading={ relLoading }
          error={ relError }
          onRetry={ retryRelations }
        />
        {!relLoading && !relError && neighbors.length === 0 && <Button component={ RouterLink } to={ `/compare/${id}` } sx={ { color: INK, mt: 2 } }>{ t('glyphDetailPage.compareWithAGlyphOfYourName') }</Button>}
      </Box>
      <SocialShareDialog payload={ socialShare } onClose={ () => setSocialShare(null) } />
      <RelationInspector open={ !!inspected } relation={ inspected ? { ...inspected, leftGlyph: glyph, nameA: glyphLabel(glyph), nameB: inspected.name } : null }
        onClose={ () => setInspectedId(null) } onExplore={ handleNodeSelect }
        onCompare={ (neighborId) => navigate(`/compare/${id}/${neighborId}`) } />
    </Box>
  );
};

export default GlyphDetailPage;
