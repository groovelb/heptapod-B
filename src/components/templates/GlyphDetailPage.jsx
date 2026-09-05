import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import ShareIcon from '@mui/icons-material/Share';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useGlyph } from '../../hooks/data/useGlyph';
import { useGlyphRelations } from '../../hooks/data/useGlyphRelations';
import LogogramRendererCanvas from '../motion/LogogramRendererCanvas';
import ResonanceList from '../data-display/ResonanceList';
import RelationInspector from '../overlay-feedback/RelationInspector';
import { groupResonanceRows, glyphLabel } from '../../utils/heptapod/resonanceView';
import { shareArchive } from '../../utils/heptapod/shareArchive';
import { createAmbientAudio } from '../../utils/heptapod/ambientAudio';
import { createBackgroundMusic } from '../../utils/heptapod/backgroundMusic';

const SERIF_ALL = "'Cinzel', 'Noto Serif KR', 'Noto Serif SC', 'Fraunces', Georgia, serif";
const MONO = "'JetBrains Mono', 'IBM Plex Mono', monospace";
const INK = '#1c2226';
const MUSIC_AUTOPLAY = import.meta.env.VITE_MUSIC_AUTOPLAY !== 'false';

const ResponsiveLogogram = ({ model, maxSize = 360, onFormationComplete }) => {
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
        <LogogramRendererCanvas
          model={ model }
          size={ size }
          isActive={ true }
          onFormationComplete={ onFormationComplete }
        />
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { glyph, loading, error, refetch } = useGlyph(id, { client });
  const { relations, loading: relLoading, error: relError, refetch: retryRelations, sampleSize, mappingStatus } = useGlyphRelations(id, { client });
  const [inspectedId, setInspectedId] = useState(null);
  const [shareNotice, setShareNotice] = useState('');
  const [shareError, setShareError] = useState('');
  const [sharing, setSharing] = useState(false);
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
    setSharing(true); setShareError(''); setShareNotice('');
    try {
      const result = await shareArchive({ left: glyph });
      if (result === 'copied') setShareNotice('공유 링크를 복사했습니다.');
    } catch (err) { setShareError(err.message); }
    finally { setSharing(false); }
  };

  if (loading) {
    return (
      <Box sx={ { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'custom.chamber.fog' } }>
        <CircularProgress sx={ { color: 'rgba(28,34,38,0.25)' } } />
      </Box>
    );
  }

  if (error || !glyph) {
    return (
      <Box sx={ { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'custom.chamber.fog', color: INK, gap: 2 } }>
        <Typography variant="h5" sx={ { fontFamily: SERIF_ALL, letterSpacing: '0.1em' } }>
          SIGNAL NOT FOUND
        </Typography>
        <Typography variant="body2" sx={ { color: 'rgba(28,34,38,0.45)' } }>
          {error ? '응답을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' : '이 응답은 존재하지 않거나 공개되지 않았습니다.'}
        </Typography>
        {error && <Button onClick={ refetch }>다시 시도</Button>}
        <Button component={ RouterLink } to="/" sx={ { color: 'rgba(28,34,38,0.5)', mt: 2 } }>
          돌아가기
        </Button>
      </Box>
    );
  }

  const model = glyph.model_data;
  const morphologySummary = Array.isArray(model?.clusters)
    ? `가지 ${model.clusters.length}곳 · ${model.gap?.half > 0 ? '열린 링' : '닫힌 링'}`
    : '형태 데이터 미확인';

  return (
    <Box sx={ { minHeight: '100vh', bgcolor: 'custom.chamber.fog', color: INK, px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, sm: 6 } } }>
      <Box sx={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, borderBottom: '1px solid rgba(28,34,38,0.1)', pb: 2 } }>
        <IconButton onClick={ () => navigate('/archive') } aria-label="공개 아카이브로" sx={ { color: 'rgba(28,34,38,0.7)' } }>
          <ArrowBackIcon />
        </IconButton>
        <Button
          onClick={ handleToggleMusic }
          variant="text"
          sx={ {
            fontFamily: MONO, fontSize: '0.52rem', letterSpacing: '0.22em',
            py: 0.4, px: 1, minWidth: 0, color: INK,
            opacity: isMusicOn ? 0.85 : 0.45,
            borderRadius: 0,
            border: `1px solid rgba(28,34,38,${isMusicOn ? 0.4 : 0.18})`,
            '&:hover': { opacity: 0.95, bgcolor: 'rgba(28,34,38,0.06)', borderColor: 'rgba(28,34,38,0.55)' },
          } }
        >
          { isMusicOn ? '❚❚ OST' : '► OST' }
        </Button>
      </Box>

      <Box sx={ { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, mb: 6 } }>
        {model && Object.keys(model).length > 0 && (
          <ResponsiveLogogram model={ model } maxSize={ 360 } onFormationComplete={ handleFormationComplete } />
        )}
        <Typography
          variant="h4"
          sx={ {
            fontFamily: SERIF_ALL,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textAlign: 'center',
            color: INK,
          } }
        >
          {glyphLabel(glyph)}
        </Typography>
      </Box>

      <Box sx={ { maxWidth: 480, mx: 'auto', mb: 6, border: '1px solid rgba(28,34,38,0.12)', borderRadius: 1, p: 2.5 } }>
        <Box sx={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 } }>
          {[
            ['FINGERPRINT', glyph.fingerprint ? `${glyph.fingerprint.slice(0, 16)}…` : '미기록'],
            ['ENCODER', `v${glyph.encoder_version}`],
            ['형태 관측', morphologySummary],
            ['CONTRIBUTORS', glyph.contribution_count ?? '미확인'],
          ].map(([label, value]) => (
            <Box key={ label } sx={ { py: 0.75 } }>
              <Typography variant="caption" sx={ { color: 'rgba(28,34,38,0.35)', fontFamily: MONO, fontSize: '0.65rem', letterSpacing: '0.1em' } }>
                {label}
              </Typography>
              <Typography variant="body2" sx={ { fontFamily: MONO, fontSize: '0.8rem', color: 'rgba(28,34,38,0.7)' } }>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={ { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mb: 2 } }>
        <Button component={ RouterLink } to={ `/compare/${id}` } sx={ { color: INK } }>내 이름을 표식으로 변환해 비교하기</Button>
        <IconButton onClick={ handleShare } disabled={ sharing } sx={ { color: 'rgba(28,34,38,0.7)', border: '1px solid rgba(28,34,38,0.12)' } } aria-label="공개 표식 공유">
          <ShareIcon />
        </IconButton>
      </Box>
      {shareNotice && <Alert severity="success" sx={ { maxWidth: 560, mx: 'auto', mb: 2 } }>{shareNotice}</Alert>}
      {shareError && <Alert severity="error" sx={ { maxWidth: 560, mx: 'auto', mb: 2 } }>{shareError}</Alert>}

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
          >
            형태 공명 지도 탐색 →
          </Button>
        </Box>
      )}

      <Box sx={ { maxWidth: 560, mx: 'auto' } }>
        <Typography
          variant="overline"
          sx={ { fontFamily: MONO, fontSize: '0.65rem', color: 'rgba(28,34,38,0.35)', letterSpacing: '0.15em', mb: 2, display: 'block' } }
        >
          이 표식에서 발견한 공명 {relLoading && '…'}
        </Typography>
        {!relLoading && !relError && <Typography variant="body2" sx={ { mb: 2, opacity: 0.7 } }>
          현재 비교한 공개 표식 {sampleSize || 0}개 기준입니다.{mappingStatus === 'partial-sample' && ' 일부 표식은 모델을 읽을 수 없어 제외했습니다.'} 실제 모델의 가지, 개구부, 잉크와 링에서 닮은 부위를 찾습니다.
        </Typography>}
        <ResonanceList
          centerName={ glyphLabel(glyph) }
          relations={ neighbors.slice(0, 3) }
          onNodeSelect={ handleNodeSelect }
          onInspect={ (neighbor) => setInspectedId(neighbor.id) }
          loading={ relLoading }
          error={ relError }
          onRetry={ retryRelations }
        />
        {!relLoading && !relError && neighbors.length === 0 && <Button component={ RouterLink } to={ `/compare/${id}` } sx={ { color: INK, mt: 2 } }>내 이름을 변환한 표식과 비교해 보세요</Button>}
      </Box>
      <RelationInspector open={ !!inspected } relation={ inspected ? { ...inspected, leftGlyph: glyph, nameA: glyphLabel(glyph), nameB: inspected.name } : null }
        onClose={ () => setInspectedId(null) } onExplore={ handleNodeSelect }
        onCompare={ (neighborId) => navigate(`/compare/${id}/${neighborId}`) } />
    </Box>
  );
};

export default GlyphDetailPage;
