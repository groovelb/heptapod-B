import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useArchiveGlyphs } from '../../hooks/data/useArchiveGlyphs';
import LogogramRendererCanvas from '../motion/LogogramRendererCanvas';
import { glyphLabel } from '../../utils/heptapod/resonanceView';
import AnalysisOverlay from '../overlay-feedback/AnalysisOverlay';
import { createAmbientAudio } from '../../utils/heptapod/ambientAudio';
import { createBackgroundMusic } from '../../utils/heptapod/backgroundMusic';

const SERIF_ALL = "'Cinzel', 'Noto Serif KR', 'Noto Serif SC', 'Fraunces', Georgia, serif";
const MONO = "'JetBrains Mono', 'IBM Plex Mono', monospace";
const INK = '#1c2226';
const MUSIC_AUTOPLAY = import.meta.env.VITE_MUSIC_AUTOPLAY !== 'false';

/**
 * LazyGlyphCard — 뷰포트 진입 시에만 로고그램 렌더, hover 시 분석 오버레이 표시
 *
 * @param {object} glyph - DB glyph row [Required]
 * @param {boolean} isHovered - 현재 hover된 카드인지 [Required]
 * @param {boolean} isDimmed - 다른 카드가 hover되어 흐려지는지 [Required]
 * @param {function} onHover - mouseenter 콜백 [Required]
 * @param {function} onHoverEnd - mouseleave 콜백 [Required]
 * @param {function} onToggle - click 토글 콜백 (모바일) [Required]
 * @param {function} onScan - AnalysisOverlay 스캔 콜백 [Optional]
 */
const LazyGlyphCard = ({ glyph, isHovered, isDimmed, onHover, onHoverEnd, onToggle, onScan, onExplore }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [canvasSize, setCanvasSize] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { rootMargin: '200px' },
    );
    io.observe(el);

    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setCanvasSize(Math.floor(Math.min(w, 400) * 0.7));
    });
    ro.observe(el);

    return () => { io.disconnect(); ro.disconnect(); };
  }, []);

  const hasModel = glyph.model_data && Object.keys(glyph.model_data).length > 0;
  const model = glyph.model_data;
  const morphologySummary = Array.isArray(model?.clusters)
    ? `가지 ${model.clusters.length}곳 · ${model.gap?.half > 0 ? '열린 링' : '닫힌 링'}`
    : '형태 데이터 미확인';

  return (
    <Box
      ref={ ref }
      sx={ {
        position: 'relative', zIndex: isHovered ? 20 : 0,
        borderBottom: '1px solid rgba(28,34,38,0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 3,
        pb: 2.5,
        cursor: 'default',
      } }
    >
      <Box sx={ {
        position: 'relative',
        zIndex: isHovered ? 20 : 0,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        aspectRatio: '1/1', width: '100%', mb: 1.5,
      } }>
        {/* 정중앙 25% hover 트리거 영역 */}
        <Box
          component="button"
          type="button"
          aria-label={ `${glyphLabel(glyph)} 표식 분석 ${isHovered ? '닫기' : '보기'}` }
          aria-expanded={ isHovered }
          onMouseEnter={ onHover }
          onMouseLeave={ onHoverEnd }
          onClick={ onToggle }
          sx={ {
            position: 'absolute',
            top: '25%', left: '25%',
            width: '50%', height: '50%',
            zIndex: 30,
            cursor: 'default',
            border: 0, background: 'transparent',
            '&:focus-visible': { outline: '2px solid', outlineColor: 'custom.chamber.ink' },
          } }
        />
        { visible && hasModel && canvasSize > 0 && (
          <Box sx={ {
            position: 'relative', width: canvasSize, height: canvasSize, display: 'inline-flex',
            opacity: isDimmed ? 0.1 : 1,
            transition: 'opacity 0.4s ease',
          } }>
            <LogogramRendererCanvas model={ glyph.model_data } size={ canvasSize } isActive={ visible } />
            { isHovered && (
              <AnalysisOverlay
                model={ glyph.model_data }
                size={ canvasSize }
                isVisible
                showFrame={ false }
                onScan={ onScan }
              />
            ) }
          </Box>
        ) }
        <Typography
          className="glyph-name"
          sx={ {
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: SERIF_ALL,
            fontWeight: 400,
            fontSize: { xs: '0.85rem', sm: '0.95rem' },
            letterSpacing: '0.1em',
            textAlign: 'center',
            color: INK,
            opacity: isDimmed ? 0.1 : 0.75,
            pointerEvents: 'none',
            textShadow: '0 0 8px rgba(214,232,237,0.9), 0 0 16px rgba(214,232,237,0.6)',
            maxWidth: '70%',
            lineHeight: 1.3,
            wordBreak: 'keep-all',
            transition: 'opacity 0.4s ease',
          } }
        >
          { glyphLabel(glyph) }
        </Typography>
      </Box>

      <Typography variant="caption" sx={ {
        color: 'rgba(28,34,38,0.35)',
        fontFamily: MONO,
        fontSize: '0.6rem',
        textAlign: 'center',
        letterSpacing: '0.08em',
      } }>
        { morphologySummary }
      </Typography>
      <Button onClick={ () => onExplore(glyph.id) } sx={ { color: INK, mt: 1, minHeight: 44, fontSize: '0.8rem' } }>
        닮은 표식 찾아보기 →
      </Button>
    </Box>
  );
};

/**
 * MyArchivePage — 공개 아카이브 페이지
 *
 * URL: /archive
 * 로그인 불필요. 모든 공개 Glyph를 탐색.
 * 첫 진입 시 게이트 화면 → 클릭으로 사운드 시작 + 아카이브 진입.
 * 카드 hover 시 분석 오버레이 표시 + 화면 어둡게 + 나머지 페이드.
 *
 * Example usage:
 * <Route path="/archive" element={<MyArchivePage />} />
 */
const MyArchivePage = ({ client }) => {
  const navigate = useNavigate();
  const { glyphs, loading, error, refetch } = useArchiveGlyphs({ client });
  const [entered, setEntered] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const audioRef = useRef(null);
  const musicRef = useRef(null);
  const [isMusicOn, setIsMusicOn] = useState(MUSIC_AUTOPLAY);

  useEffect(() => {
    audioRef.current = createAmbientAudio();
    return () => { audioRef.current?.dispose(); audioRef.current = null; };
  }, []);

  useEffect(() => {
    const music = createBackgroundMusic();
    musicRef.current = music;
    return () => { music.dispose(); musicRef.current = null; };
  }, []);

  const handleEnter = useCallback(() => {
    audioRef.current?.dispose();
    audioRef.current = createAmbientAudio();
    audioRef.current.encodeStart();
    if (MUSIC_AUTOPLAY) musicRef.current?.play();
    setEntered(true);
  }, []);

  const handleToggleMusic = useCallback(() => {
    const on = musicRef.current?.toggle() ?? false;
    setIsMusicOn(on);
  }, []);

  const handleHover = useCallback((id) => {
    setHoveredId(id);
  }, []);

  const handleHoverEnd = useCallback(() => {
    setHoveredId(null);
  }, []);

  const handleToggle = useCallback((id) => {
    setHoveredId((prev) => (prev === id ? null : id));
  }, []);

  const handleScan = useCallback((info) => {
    audioRef.current?.scanBeeps(info.count, info);
  }, []);

  if (!entered) {
    return (
      <Box
        sx={ {
          minHeight: '100vh',
          bgcolor: 'custom.chamber.fog',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        } }
      >
        <Typography
          sx={ {
            fontFamily: SERIF_ALL,
            fontSize: { xs: '0.6rem', sm: '0.7rem' },
            letterSpacing: '0.5em',
            color: INK,
            opacity: 0.35,
            mb: 3,
          } }
        >
          THE RESPONSE
        </Typography>
        <Typography
          sx={ {
            fontFamily: SERIF_ALL,
            fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3rem' },
            fontWeight: 400,
            letterSpacing: '0.25em',
            color: INK,
            opacity: 0.9,
          } }
        >
          ARCHIVE
        </Typography>
        <Button onClick={ handleEnter } aria-label="공개 아카이브 입장" sx={ { color: INK, mt: 6, minHeight: 48 } }>표식의 공명 탐색하기 →</Button>
        { loading && (
          <CircularProgress size={ 16 } sx={ { color: 'rgba(28,34,38,0.15)', mt: 4 } } />
        ) }
      </Box>
    );
  }

  return (
    <Box sx={ { minHeight: '100vh', bgcolor: 'custom.chamber.fog', color: INK, px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, sm: 6 } } }>
      {/* 스크림 — hover 시 화면 어둡게 */}
      <Box
        onClick={ () => setHoveredId(null) }
        sx={ {
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(28,34,38,0.55)',
          zIndex: 10,
          opacity: hoveredId ? 1 : 0,
          pointerEvents: hoveredId ? 'auto' : 'none',
          transition: 'opacity 0.4s ease',
          '@media (hover: hover)': {
            pointerEvents: 'none',
          },
        } }
      />

      <Box sx={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, borderBottom: '1px solid rgba(28,34,38,0.1)', pb: 2, position: 'relative', zIndex: 15 } }>
        <Box sx={ { display: 'flex', alignItems: 'center' } }>
          <IconButton onClick={ () => navigate('/') } sx={ { color: 'rgba(28,34,38,0.4)' } }>
            <ArrowBackIcon />
          </IconButton>
          <Typography component="h1" variant="h5" sx={ { fontFamily: SERIF_ALL, fontSize: { xs: '0.9rem', sm: '1.4rem' }, letterSpacing: '0.12em', ml: 1, color: INK } }>
            THE RESPONSE ARCHIVE
          </Typography>
        </Box>
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

      <Box sx={ { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1, my: 2 } }>
        <Typography variant="body2" sx={ { color: 'rgba(28,34,38,0.7)' } }>
          { `최근 공개된 표식 ${glyphs.length}개 · 가지와 잉크, 열린 틈을 따라 닮은 형태를 발견하세요.` }
        </Typography>
        <Button onClick={ () => navigate('/me') } sx={ { color: INK } }>내가 남긴 응답</Button>
      </Box>

      { loading ? (
        <Box sx={ { display: 'flex', justifyContent: 'center', py: 8 } }>
          <CircularProgress sx={ { color: 'rgba(28,34,38,0.25)' } } />
        </Box>
      ) : error ? (
        <Alert severity="error" action={ <Button color="inherit" onClick={ refetch }>다시 시도</Button> }>{error.message || '공개 아카이브를 불러오지 못했습니다.'}</Alert>
      ) : glyphs.length === 0 ? (
        <Box sx={ { py: 8, textAlign: 'center' } }>
          <Typography variant="body2" sx={ { color: 'rgba(28,34,38,0.35)', fontFamily: MONO, fontSize: '0.75rem' } }>
            아직 아카이브에 게시된 Glyph가 없습니다.
          </Typography>
        </Box>
      ) : (
        <Box sx={ {
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          borderTop: '1px solid rgba(28,34,38,0.12)',
          '& > *': {
            borderRight: '1px solid rgba(28,34,38,0.12)',
          },
          '& > *:nth-of-type(2n)': {
            borderRight: { xs: 'none' },
          },
          '& > *:nth-of-type(3n)': {
            borderRight: { sm: 'none', md: '1px solid rgba(28,34,38,0.12)' },
          },
          '& > *:nth-of-type(4n)': {
            borderRight: { md: 'none' },
          },
        } }>
          { glyphs.map((glyph) => (
            <LazyGlyphCard
              key={ glyph.id }
              glyph={ glyph }
              isHovered={ glyph.id === hoveredId }
              isDimmed={ !!hoveredId && glyph.id !== hoveredId }
              onHover={ () => handleHover(glyph.id) }
              onHoverEnd={ handleHoverEnd }
              onToggle={ () => handleToggle(glyph.id) }
              onScan={ handleScan }
              onExplore={ (glyphId) => navigate(`/glyph/${glyphId}`) }
            />
          )) }
        </Box>
      ) }
    </Box>
  );
};

export default MyArchivePage;
