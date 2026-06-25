import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import VideoScrubbing from '../scroll/VideoScrubbing';
import {
  HERO_VIDEO_SRC,
  HERO_SCROLL_VH,
  HERO_SCROLL_VH_MOBILE,
  HERO_MASTER_TITLE,
  HERO_SKIP_LABEL,
  HERO_STORY_BEATS,
  HERO_COPY_BEATS,
} from '../../data/heptapodHeroStory';

/** 카피 비트 크로스페이드 패딩 (진행도 단위) */
const BEAT_PAD = 0.025;

/** 화이트아웃 구간(B6) — 흰 안개 위 가독성을 위해 잉크색으로 반전 */
const INK_COLOR = '#1c2226';
const FOG_COLOR = '#cfe2ea';
const TEXT_LIGHT = '#e8ecec';

/**
 * 영상 스크럽이 끝나는 진행도 — 이 지점에서 영상은 마지막 프레임에 도달하고,
 * 이후 구간(이 값→1.0)은 영상을 고정한 채 디졸브만 진행한다. 스크럽과 디졸브를
 * 분리해 영상 끝부분이 페이드 뒤로 가려져 "건너뛰는" 현상을 막는다.
 */
const VIDEO_SCRUB_FRACTION = 0.85;
/** 영상→캔버스 디졸브 구간 (진행도) — 영상은 이미 마지막 프레임에 고정된 상태 */
const VIDEO_FADE = [VIDEO_SCRUB_FRACTION, 0.99];
const CANVAS_FADE = [VIDEO_SCRUB_FRACTION + 0.01, 1.0];
/**
 * 캔버스 "도킹"(완전 진입) 히스테리시스 — **pointerEvents(상호작용)에만** 적용한다.
 * (opacity는 별도로 항상 progress를 따라 진입/탈출 대칭이다 — 도킹은 시각에 관여하지 않음.)
 * 단일 임계값이면 완전 진입 직후 미세 스크롤에 상호작용이 끊기는 knife-edge가 생긴다.
 * - 진입(DOCK_ENTER): 디졸브가 거의 끝난 0.995에서 캔버스 상호작용 활성
 * - 해제(DOCK_EXIT): 디졸브 구간을 모두 거슬러 올라가 스크럽 구간에 들어설 때(0.85)만
 * → 상호작용은 (1.0~0.85) 버퍼만큼 유지되어 미세 스크롤로 끊기지 않는다(시각 변화 없음).
 */
const DOCK_ENTER = 0.995;
const DOCK_EXIT = VIDEO_SCRUB_FRACTION;

/**
 * 단일 카피 비트 — 진행도(MotionValue) 구간에 맞춰 opacity/translateY 크로스페이드.
 * 하나의 useTransform 훅만 사용하기 위해 비트 단위 컴포넌트로 분리한다.
 *
 * Props:
 * @param {object} beat - 비트 데이터 ({ id, scroll, headline, body, isEmphasis }) [Required]
 * @param {import('framer-motion').MotionValue<number>} progress - 스크롤 진행도(0~1) [Required]
 * @param {string} serifFont - 헤드라인 serif 폰트 스택 [Required]
 */
function HeroBeat({ beat, progress, serifFont }) {
  const [start, end] = beat.scroll;
  const opacity = useTransform(
    progress,
    [start - BEAT_PAD, start + BEAT_PAD, end - BEAT_PAD, end + BEAT_PAD],
    [0, 1, 1, 0],
  );
  const y = useTransform(
    progress,
    [start - BEAT_PAD, start + BEAT_PAD],
    [12, 0],
  );

  const onLight = beat.id === 'B6';
  const color = onLight ? INK_COLOR : TEXT_LIGHT;

  return (
    <motion.div
      style={ {
        opacity,
        y,
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '42ch',
        willChange: 'opacity, transform',
        pointerEvents: 'none',
      } }
    >
      { beat.headline && (
        <Typography
          component="h2"
          sx={ {
            fontFamily: serifFont,
            fontWeight: beat.isEmphasis ? 400 : 300,
            fontStyle: beat.isEmphasis ? 'italic' : 'normal',
            fontSize: 'clamp(28px, 4vw, 64px)',
            lineHeight: 1.1,
            letterSpacing: '0.02em',
            color,
            m: 0,
            mb: 1.5,
          } }
        >
          { beat.headline }
        </Typography>
      ) }
      { beat.body && (
        <Typography
          component="p"
          sx={ {
            fontWeight: beat.isEmphasis ? 400 : 300,
            fontSize: 'clamp(14px, 1.6vw, 19px)',
            lineHeight: 1.7,
            letterSpacing: 0,
            color: onLight ? alpha(INK_COLOR, 0.85) : alpha(TEXT_LIGHT, 0.82),
            m: 0,
          } }
        >
          { beat.body }
        </Typography>
      ) }
    </motion.div>
  );
}

/**
 * HeptapodHeroIntro 컴포넌트
 *
 * 영상 스크러빙 기반 히어로 인트로. 스크롤로 외계 비행체 진입 영상(Shot 02→11)을
 * 프레임 스크럽하며 세계관 카피 비트(B0~B6)를 노출하고, 막바지에서 **영상을 fade-out,
 * 캔버스(children = 라이브 인코더)를 fade-in**하는 디졸브로 핸드오프한다(매치컷).
 * 위로 다시 스크롤하면 디졸브가 역전되고 영상이 역스크럽된다(왕복).
 *
 * - 영상 스크럽: 기존 `VideoScrubbing` 재사용 (scrollRange로 sticky 언더슈트 보정)
 * - opacity/디졸브: Framer MotionValue + useTransform (per-frame 리렌더 없음)
 * - 디졸브 opacity: 항상 progress를 따라 진입=탈출 대칭(어느 한쪽도 고정/급변 없음)
 * - 상호작용: 완전 진입(도킹) 시 캔버스 pointerEvents만 히스테리시스(진입 0.995 / 해제
 *   0.85)로 제어 — 미세 스크롤에 튕겨나가지 않게 하되 opacity엔 관여하지 않음(시각 불변)
 * - 접근성: prefers-reduced-motion 시 정지 안개 + 핵심 카피 + ENTER 오버레이로 대체
 *
 * 데이터: `src/data/heptapodHeroStory.js` / 기획: `docs/heptapod-b-encoder/06-hero-storyline.md`
 *
 * Props:
 * @param {React.ReactNode} children - 디졸브로 떠오를 캔버스(라이브 인코더) [Required]
 * @param {function} onEnter - SKIP/ENTER 시 호출 (보조 콜백) [Optional]
 *
 * Example usage:
 * <HeptapodHeroIntro><HeptapodEncoderPage /></HeptapodHeroIntro>
 */
function HeptapodHeroIntro({ children, onEnter }) {
  const theme = useTheme();
  const serifFont =
    theme.typography?.custom?.serif?.fontFamily ||
    "'Fraunces', 'Newsreader', Georgia, serif";
  const monoFont =
    theme.typography?.custom?.mono?.fontFamily || 'monospace';

  const containerRef = useRef(null);
  const dockedRef = useRef(false);
  // 디졸브/카피용 마스터 진행도 — 트랙 전 구간 0→1 (영상 스크럽과 독립).
  // 'start start'(컨테이너 상단=뷰포트 상단) → 'end end'(컨테이너 하단=뷰포트 하단).
  const { scrollYProgress: progress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const [reducedMotion, setReducedMotion] = useState(false);
  const [reducedDismissed, setReducedDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [docked, setDocked] = useState(false);

  /** prefers-reduced-motion 감지 */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  /** 모바일 분기 (컨테이너 높이·진행도 보정값 결정) */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  /**
   * 캔버스 도킹 토글 — 히스테리시스(진입 0.995 / 해제 0.85)로 완전 진입 후
   * 미세 스크롤에 상호작용이 끊기지 않게 한다. 임계값을 넘나들 때만 setState(리렌더 최소화).
   */
  useEffect(() => {
    const apply = (p) => {
      let next = dockedRef.current;
      if (!next && p >= DOCK_ENTER) next = true;
      else if (next && p < DOCK_EXIT) next = false;
      if (next !== dockedRef.current) {
        dockedRef.current = next;
        setDocked(next);
      }
    };
    apply(progress.get());
    return progress.on('change', apply);
  }, [progress]);

  /** SKIP/ENTER — 트랙 끝으로 스크롤해 디졸브를 완료한다(언마운트 없음, 왕복 유지) */
  const handleEnter = useCallback(() => {
    const el = containerRef.current;
    if (el && typeof window !== 'undefined') {
      const target = el.offsetTop + el.offsetHeight - window.innerHeight;
      window.scrollTo({ top: target, behavior: 'smooth' });
    }
    onEnter?.();
  }, [onEnter]);

  const scrollVh = isMobile ? HERO_SCROLL_VH_MOBILE : HERO_SCROLL_VH;
  // sticky 인너가 viewport(100vh)만큼 덜 이동하므로 끝에서 1에 닿도록 재매핑
  const scrollEnd = 1 - 100 / scrollVh;
  // 영상 스크럽은 트랙의 앞 VIDEO_SCRUB_FRACTION 구간에서 끝내고, 이후는 마지막
  // 프레임에 고정(VideoScrubbing이 progress>1을 clamp) → 디졸브 구간과 분리.
  const videoScrubEnd = scrollEnd * VIDEO_SCRUB_FRACTION;
  // scrollRange는 반드시 메모이즈한다. docked 토글로 re-render되어도 객체 동일성이
  // 유지되지 않으면 VideoScrubbing의 rAF effect가 teardown→재시작되어, 도킹 경계(0.85)를
  // 스크롤로 지날 때 currentTime이 밀렸다가 튀는("영상 갑툭튀") 갭이 생긴다.
  const scrollRange = useMemo(
    () => ({ start: 0, end: videoScrubEnd }),
    [videoScrubEnd],
  );

  // 디졸브 — 영상/오버레이 fade-out, 캔버스 fade-in
  const videoOpacity = useTransform(progress, VIDEO_FADE, [1, 0]);
  const canvasOpacity = useTransform(progress, CANVAS_FADE, [0, 1]);
  // 마스터 타이틀 — B0 직후 페이드 아웃
  const masterTitleOpacity = useTransform(progress, [0, 0.06, 0.1], [1, 1, 0]);
  // 스크롤 힌트 — 초반에만 노출
  const hintOpacity = useTransform(progress, [0, 0.05, 0.09], [0.6, 0.6, 0]);

  /** 접근성 폴백 — 캔버스 위에 정지 안개 오버레이 + 핵심 카피 + ENTER(오버레이 해제) */
  if (reducedMotion) {
    const thesis = HERO_STORY_BEATS.find((b) => b.isEmphasis) || HERO_STORY_BEATS[0];
    return (
      <Box sx={ { position: 'relative', minHeight: '100vh' } }>
        { children }
        { !reducedDismissed && (
          <Box
            sx={ {
              position: 'fixed',
              inset: 0,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              gap: 3,
              px: { xs: 3, md: 12 },
              py: { xs: 6, md: 10 },
              backgroundColor: FOG_COLOR,
            } }
          >
            <Typography
              component="p"
              sx={ {
                fontFamily: monoFont,
                fontSize: '0.7rem',
                letterSpacing: '0.3em',
                color: alpha(INK_COLOR, 0.6),
                m: 0,
              } }
            >
              { HERO_MASTER_TITLE }
            </Typography>
            <Box>
              <Typography
                component="h2"
                sx={ {
                  fontFamily: serifFont,
                  fontWeight: 400,
                  fontStyle: 'italic',
                  fontSize: 'clamp(28px, 4vw, 56px)',
                  lineHeight: 1.1,
                  color: INK_COLOR,
                  m: 0,
                  mb: 2,
                } }
              >
                { thesis.headline }
              </Typography>
              <Typography
                component="p"
                sx={ {
                  fontWeight: 400,
                  fontSize: 'clamp(14px, 1.6vw, 19px)',
                  lineHeight: 1.7,
                  color: alpha(INK_COLOR, 0.85),
                  maxWidth: '42ch',
                  m: 0,
                } }
              >
                { thesis.body }
              </Typography>
            </Box>
            <Button
              onClick={ () => setReducedDismissed(true) }
              variant="outlined"
              sx={ {
                alignSelf: 'flex-start',
                fontFamily: monoFont,
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                color: INK_COLOR,
                borderColor: alpha(INK_COLOR, 0.4),
                borderRadius: 0,
                px: 3,
                py: 1,
              } }
            >
              ENTER ENCODER →
            </Button>
          </Box>
        ) }
      </Box>
    );
  }

  return (
    <Box
      ref={ containerRef }
      sx={ {
        position: 'relative',
        height: `${scrollVh}vh`,
        backgroundColor: 'background.default',
        // 인코더 내부 변화로 브라우저가 스크롤 위치를 보정(scroll anchoring)하며 점핑하는 것을 차단
        overflowAnchor: 'none',
      } }
    >
      {/* 핀 고정 뷰포트 */}
      <Box
        sx={ {
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
        } }
      >
        {/* 캔버스 레이어 (디졸브로 떠오르는 라이브 인코더) — 뒤, fade-in.
            opacity는 항상 progress를 따라 진입/탈출 대칭. 상호작용만 docked로 제어. */}
        <Box
          component={ motion.div }
          style={ { opacity: canvasOpacity } }
          sx={ {
            position: 'absolute',
            inset: 0,
            pointerEvents: docked ? 'auto' : 'none',
          } }
        >
          { children }
        </Box>

        {/* 히어로 레이어 (영상 + 오버레이 UI) — 앞, fade-out.
            opacity는 항상 progress를 따라 대칭. 도킹 중엔 이벤트만 차단(시각 영향 없음). */}
        <Box
          component={ motion.div }
          style={ { opacity: videoOpacity } }
          sx={ {
            position: 'absolute',
            inset: 0,
            pointerEvents: docked ? 'none' : 'auto',
          } }
        >
          {/* L0 — 스크럽 영상 (풀블리드 cover) */}
          <VideoScrubbing
            src={ HERO_VIDEO_SRC }
            containerRef={ containerRef }
            scrollRange={ scrollRange }
            sx={ {
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
            } }
          />

          {/* L1 — 카피 가독성용 하단 스크림 (영상 톤 보존, 국소 그라데이션) */}
          <Box
            sx={ {
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(to top, rgba(8,12,11,0.55) 0%, rgba(8,12,11,0.15) 28%, rgba(8,12,11,0) 50%)',
            } }
          />

          {/* L2 — 마스터 타이틀 (좌상단) */}
          <Box
            component={ motion.div }
            style={ { opacity: masterTitleOpacity } }
            sx={ {
              position: 'absolute',
              top: { xs: '6vh', md: '8vh' },
              left: { xs: 24, md: 96 },
              pointerEvents: 'none',
            } }
          >
            <Typography
              component="p"
              sx={ {
                fontFamily: serifFont,
                fontWeight: 300,
                fontSize: 'clamp(16px, 2vw, 26px)',
                letterSpacing: '0.3em',
                color: TEXT_LIGHT,
                m: 0,
              } }
            >
              { HERO_MASTER_TITLE }
            </Typography>
          </Box>

          {/* L3 — 카피 비트 오버레이 (하단·좌측 정렬) */}
          <Box
            sx={ {
              position: 'absolute',
              left: { xs: 24, md: 96 },
              right: { xs: 24, md: 96 },
              bottom: { xs: '10vh', md: '14vh' },
              height: 'clamp(120px, 22vh, 220px)',
              pointerEvents: 'none',
            } }
          >
            { HERO_COPY_BEATS.map((beat) => (
              <HeroBeat
                key={ beat.id }
                beat={ beat }
                progress={ progress }
                serifFont={ serifFont }
              />
            )) }
          </Box>

          {/* L4 — 스크롤 힌트 (하단 중앙, 초반만) */}
          <Box
            component={ motion.div }
            style={ { opacity: hintOpacity } }
            sx={ {
              position: 'absolute',
              bottom: '4vh',
              left: 0,
              right: 0,
              textAlign: 'center',
              pointerEvents: 'none',
            } }
          >
            <Typography
              component="span"
              sx={ {
                fontFamily: monoFont,
                fontSize: '0.66rem',
                letterSpacing: '0.4em',
                color: alpha(TEXT_LIGHT, 0.7),
              } }
            >
              SCROLL ↓
            </Typography>
          </Box>

          {/* L5 — SKIP (우상단) */}
          <Button
            onClick={ handleEnter }
            sx={ {
              position: 'absolute',
              top: { xs: '5vh', md: '7vh' },
              right: { xs: 16, md: 64 },
              minWidth: 0,
              fontFamily: monoFont,
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              color: alpha(TEXT_LIGHT, 0.7),
              '&:hover': { color: TEXT_LIGHT, backgroundColor: 'transparent' },
            } }
          >
            { HERO_SKIP_LABEL }
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default HeptapodHeroIntro;
