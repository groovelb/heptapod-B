import {
  cloneElement,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import { LenisContext } from '../../utils/lenisContext';
import VideoScrubbing from '../scroll/VideoScrubbing';
import ScrubHud from '../scroll/ScrubHud';
import useScrubSoundEngine from '../scroll/useScrubSoundEngine';
import SoundFab from '../input/SoundFab';
import ScrubCaption from '../kinetic-typography/scrub/ScrubCaption';
import TitleDisperse from '../kinetic-typography/scrub/TitleDisperse';
import {
  HERO_SCRUB_TIMELINE,
  findClipIndex,
  mapTrackToVideo,
} from '../../data/heptapodScrubTimeline';
import {
  HERO_VIDEO_SRC,
  HERO_VIDEO_SRC_MOBILE,
  HERO_POSTER_SRC,
  HERO_AUDIO_BED_SRC,
  HERO_AUDIO_CLIP_BASE,
  HERO_HANDOFF_VH,
  HERO_MASTER_TITLE,
  HERO_START_LABEL,
  HERO_SKIP_LABEL,
  HERO_HEADLINE_FONT,
  HERO_STORY_BEATS,
} from '../../data/heptapodHeroStory';
import { EASE, INK_LIGHT } from '../kinetic-typography/scrub/inkMotion';

const TRACK_ID = 'hero-scrub-track';
const TEXT_LIGHT = INK_LIGHT;
const COPY_SHADOW = '0 1px 14px rgba(8,12,11,0.5)';

/** 타이틀이 완전히 흩어지는 스크롤 거리(뷰포트 높이 비율) — 작을수록 민감 */
const TITLE_DISPERSE_VH = 0.45;

/** 트랙 전체(0~1)가 스크럽 범위. 참조 고정(VideoScrubbing effect 재구독 방지). */
const SCROLL_RANGE = { start: 0, end: 1 };

/** 영상·포스터 공통 배치 — 고정 레이어 풀블리드 cover (데스크톱·모바일 동일) */
const MEDIA_FIT = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

/**
 * 인코더 핸드오프 게이팅 — 핸드오프 스페이서가 뷰포트로 진입하는 진행도(0=막 진입, 1=완전 덮음)에
 * 따라 캔버스 트랜지션을 단계 분산한다.
 *  - ENC_FADE: 캔버스 fade-in(opacity 0→1) 구간
 *  - ENC_DISPLAY: display:block 게이트(진입 시작) — 그 전엔 display:none으로 fog 정지(성능)
 *  - ENC_AUDIO: OST 시작(인코더가 충분히 덮을 때). 스크럽 사운드는 완주 시점에 이미 잦아든다
 *  - ENC_INTERACT: 입력(인코더 TextField 등) 상호작용 활성 (히스테리시스)
 *  - ENC_SETTLE: 배경 효과(fog) 가동 — 완전 진입 후에만 (히스테리시스)
 */
const ENC_FADE = [0, 0.45];
const ENC_DISPLAY_ENTER = 0.004;
const ENC_DISPLAY_EXIT = 0.001;
const ENC_AUDIO_ENTER = 0.55;
const ENC_AUDIO_EXIT = 0.45;
const ENC_INTERACT_ENTER = 0.92;
const ENC_INTERACT_EXIT = 0.85;
const ENC_SETTLE_ENTER = 0.99;
const ENC_SETTLE_EXIT = 0.95;

/** 2자리 zero-pad */
const pad = (value) => String(Math.max(0, value)).padStart(2, '0');

/**
 * BeatCounter (내부)
 *
 * 우하단 비트 카운터("01 — 06") + 얇은 진행바. 트랙 안에서 sticky 로 뷰포트 하단에 머문다.
 * 카운터는 ref.textContent 갱신, 진행바는 MotionValue scaleX 직결 — 리렌더 없음.
 *
 * @param {import('framer-motion').MotionValue<number>} progress - 영상 진행도 [Required]
 * @param {Array<object>} clips - 타임라인 클립 [Required]
 * @param {string} monoFont - 모노 폰트 스택 [Required]
 */
function BeatCounter({ progress, clips, monoFont, titleProgress }) {
  const hudOpacity = useTransform(titleProgress, [0.35, 0.7], [0, 1], { ease: EASE.in });
  const counterRef = useRef(null);
  const total = clips.length;
  const labelFor = (p) => `${pad(findClipIndex(clips, p) + 1)} — ${pad(total)}`;

  useMotionValueEvent(progress, 'change', (p) => {
    if (counterRef.current) counterRef.current.textContent = labelFor(p);
  });

  return (
    <ScrubHud
      align="right"
      bottomPx={ 72 }
      hasHeroGap={ false }
      sx={ { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, pointerEvents: 'none' } }
    >
      <Box component={ motion.div } style={ { opacity: hudOpacity } } sx={ { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 } }>
        <Box
          component="span"
          ref={ counterRef }
          sx={ {
            fontFamily: monoFont,
            fontSize: 'clamp(11px, 0.85vw, 13px)',
            letterSpacing: '0.16em',
            color: alpha(TEXT_LIGHT, 0.8),
            textShadow: COPY_SHADOW,
          } }
        >
          { labelFor(progress.get()) }
        </Box>
        <Box sx={ { width: { xs: 96, md: 140 }, height: '1px', backgroundColor: alpha(TEXT_LIGHT, 0.25), overflow: 'hidden' } }>
          <Box
            component={ motion.div }
            style={ { scaleX: progress } }
            sx={ { width: '100%', height: '100%', backgroundColor: TEXT_LIGHT, transformOrigin: 'left center' } }
          />
        </Box>
      </Box>
    </ScrubHud>
  );
}

/**
 * HeptapodHeroIntro 컴포넌트
 *
 * 스크롤 스크러빙 기반 히어로 인트로 (oneir ScrubSequence 계열 테크닉 이식).
 * - 영상: 고정(fixed) 풀스크린, **muted 스크럽** — currentTime 이 트랙 스크롤 위치에 결속(양방향).
 *   Lenis 감쇠 + 비트별 셀 가중치(heptapodHeroStory.cells)로 페이싱을 조절한다.
 * - START 필수: 누르기 전엔 스크롤 잠금(lenis.stop + html overflow hidden). 클릭이 곧 사운드 언락 제스처.
 *   누르면 잠금만 풀린다(자동 이동 없음). 타이틀은 스크롤 시작 즉시 글자별 패럴럭스로 흩어진다.
 * - 사운드: 비트별 샘플 클립 + 베드 루프 + 합성 드론을 Web Audio 로 스크롤 위치에 매핑
 *   (useScrubSoundEngine — 위치 결속·아이들 게이트·드리프트 보정·완주 무음). 우하단 SoundFab 토글.
 * - 카피: 트랙 좌표에 실배치된 캡션(애니메이션 없음, A/B/C 변주) + 하단 HUD 카운터.
 * - 핸드오프: 트랙 뒤 스페이서 진입 진행도로 고정 캔버스(인코더)가 제자리 fade-in.
 *   children 에 audioActive 주입 → 스크럽 사운드(인트로) / OST(인코더) 단계 분리.
 * - reducedMotion: 스크럽·Lenis 없이 자연 스크롤(정지 프레임) + START 게이트만 유지.
 *
 * 데이터: `src/data/heptapodHeroStory.js` · 타임라인: `src/data/heptapodScrubTimeline.js`
 * 기획: `docs/heptapod-b-encoder/07-scroll-scrub-sound-plan.md`
 *
 * Props:
 * @param {React.ReactNode} children - 인트로 끝에 이어질 인코더(라이브) [Required]
 *
 * Example usage:
 * <HeptapodHeroIntro><HeptapodEncoderPage /></HeptapodHeroIntro>
 */
function HeptapodHeroIntro({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const monoFont = theme.typography?.custom?.mono?.fontFamily || 'monospace';
  const lenis = useContext(LenisContext);
  const timeline = HERO_SCRUB_TIMELINE;

  const trackRef = useRef(null);
  const handoffRef = useRef(null);
  /** SKIP 이 잠금 해제 직후 실행할 스크롤 목표(element). START 는 목표를 두지 않는다 */
  const pendingScrollRef = useRef(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [started, setStarted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  const displayRef = useRef(false);
  const audioRef = useRef(false);
  const interactRef = useRef(false);
  const settledRef = useRef(false);
  const [canvasActive, setCanvasActive] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [canvasInteractive, setCanvasInteractive] = useState(false);
  const [canvasSettled, setCanvasSettled] = useState(false);

  /** 영상 진행도(0~1, 셀 가중치 매핑 후). 캡션·HUD·사운드가 구독 — 리렌더 없음 */
  const progress = useMotionValue(0);
  /** 핸드오프 스페이서 진입 진행도 — 고정 캔버스 fade 구동 */
  const encProgress = useMotionValue(0);
  const canvasOpacity = useTransform(encProgress, ENC_FADE, [0, 1]);
  /** 하단 스크림 — 영상 마지막 12% (화이트아웃) 에서 사라진다 */
  const scrimOpacity = useTransform(progress, [0.86, 0.97], [1, 0], { ease: EASE.out });
  /**
   * 타이틀 흩어짐 진행도 — 스크롤 0 → 뷰포트의 TITLE_DISPERSE_VH 만큼에서 0→1.
   * 셀 전체(100vh)가 아니라 짧은 거리에 매핑해 손을 대자마자 흩어지기 시작하고 빠르게 끝난다.
   */
  const titleProgress = useMotionValue(0);
  const controlsOpacity = useTransform(titleProgress, [0, 0.25], [1, 0], { ease: EASE.out });
  /** 트랙 스크롤 진행도(0~1, 셀 가중치 매핑 전) — 캡션 안무 시계(화면 통과 진행도)의 원천 */
  const trackProgress = useMotionValue(0);

  /**
   * 스크럽 사운드 엔진 — 클립(B0~B5)은 같은 타임라인에서 잘라낸 샘플이라
   * 엔진의 fraction × duration 이 곧 영상 시간. 매 렌더 새 참조라 ref 로 최신본을 잡는다.
   */
  const sound = useScrubSoundEngine(timeline.clips, {
    bedSrc: HERO_AUDIO_BED_SRC,
    clipBasePath: HERO_AUDIO_CLIP_BASE,
  });
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  });
  const handleSoundProgress = useCallback((p) => {
    soundRef.current.handleProgress(p);
  }, []);
  useMotionValueEvent(progress, 'change', handleSoundProgress);

  /** prefers-reduced-motion 감지 */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  /**
   * START 게이트 — 누르기 전엔 스크롤 잠금: Lenis(휠·터치) + html overflow(키보드·네이티브).
   * 해제 시 대기 중인 스크롤 목표(START=첫 비트, SKIP=핸드오프)로 이동한다.
   */
  useEffect(() => {
    const root = document.documentElement;
    if (!started) {
      lenis?.stop();
      const prev = root.style.overflow;
      root.style.overflow = 'hidden';
      return () => {
        root.style.overflow = prev;
      };
    }
    lenis?.start();
    const target = pendingScrollRef.current;
    pendingScrollRef.current = null;
    if (target == null) return undefined;
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.6, force: true });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: reducedMotion ? 'auto' : 'smooth' });
    } else {
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
    return undefined;
  }, [lenis, started, reducedMotion]);

  /**
   * 핸드오프 진입 진행도 — 스페이서의 실제 화면 top 을 매 스크롤마다 측정.
   * top = vh(뷰포트 하단)이면 0, top = 0(상단)이면 1. Lenis/네이티브 모두 실제 위치라 동기 보장.
   */
  useEffect(() => {
    const compute = () => {
      const vh = window.innerHeight || 1;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      titleProgress.set(Math.min(1, Math.max(0, scrollY / (vh * TITLE_DISPERSE_VH))));
      trackProgress.set(Math.min(1, Math.max(0, scrollY / (vh * timeline.scrubCells))));
      const el = handoffRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      encProgress.set(Math.min(1, Math.max(0, 1 - top / vh)));
    };
    compute();
    window.addEventListener('resize', compute);
    if (lenis) {
      lenis.on('scroll', compute);
      return () => {
        lenis.off('scroll', compute);
        window.removeEventListener('resize', compute);
      };
    }
    window.addEventListener('scroll', compute, { passive: true });
    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
  }, [lenis, encProgress, titleProgress, trackProgress, timeline.scrubCells]);

  /** 인코더 핸드오프 게이트 — 히스테리시스로 토글(리렌더 최소화) */
  useEffect(() => {
    const apply = (p) => {
      const gate = (ref, setter, enter, exit) => {
        let next = ref.current;
        if (!next && p >= enter) next = true;
        else if (next && p < exit) next = false;
        if (next !== ref.current) {
          ref.current = next;
          setter(next);
        }
      };
      gate(displayRef, setCanvasActive, ENC_DISPLAY_ENTER, ENC_DISPLAY_EXIT);
      gate(audioRef, setAudioOn, ENC_AUDIO_ENTER, ENC_AUDIO_EXIT);
      gate(interactRef, setCanvasInteractive, ENC_INTERACT_ENTER, ENC_INTERACT_EXIT);
      gate(settledRef, setCanvasSettled, ENC_SETTLE_ENTER, ENC_SETTLE_EXIT);
    };
    apply(encProgress.get());
    return encProgress.on('change', apply);
  }, [encProgress]);

  /* VideoScrubbing 콜백 — 참조 고정(effect 재구독 방지) */
  const mapProgress = useCallback((p) => mapTrackToVideo(timeline, p), [timeline]);
  const handleProgressChange = useCallback((p) => progress.set(p), [progress]);
  const handleVideoReady = useCallback(() => setVideoReady(true), []);
  const handleLoadProgress = useCallback(
    (fraction) => setLoadProgress((prev) => (fraction > prev ? fraction : prev)),
    [],
  );

  /** START — 클릭(=오디오 언락 제스처)에서 엔진 enable + 스크롤 잠금 해제만. 자동 이동 없음(스크롤은 사용자 손에) */
  const handleStart = useCallback(() => {
    if (soundOn) soundRef.current.enable();
    setStarted(true);
  }, [soundOn]);

  /** SKIP — 핸드오프(인코더)로 이동. 시작 전이면 잠금 해제와 함께 이동. */
  const handleSkip = useCallback(() => {
    const el = handoffRef.current;
    if (!started) {
      pendingScrollRef.current = el;
      setStarted(true);
      return;
    }
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.2, force: true });
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [lenis, started]);

  /** 사운드 토글 — 켤 때는 클릭 제스처 안이라 enable 가능 */
  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      const next = !on;
      const s = soundRef.current;
      if (next) {
        if (!s.isEnabled) s.enable();
      } else if (s.isEnabled) {
        s.disable();
      }
      return next;
    });
  }, []);

  const activeSrc = isMobile ? HERO_VIDEO_SRC_MOBILE : HERO_VIDEO_SRC;

  return (
    <Box sx={ { position: 'relative', backgroundColor: 'background.default' } }>
      {/* 고정 영상 레이어 (z0) — muted 스크럽. 트랙(trackRef) 스크롤 진행도 → 셀 가중치 매핑 → currentTime */}
      <Box sx={ { position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', backgroundColor: 'background.default' } }>
        <VideoScrubbing
          src={ activeSrc }
          containerRef={ trackRef }
          scrollRange={ SCROLL_RANGE }
          mapProgress={ mapProgress }
          onProgressChange={ handleProgressChange }
          onReady={ handleVideoReady }
          onLoadProgress={ handleLoadProgress }
          sx={ MEDIA_FIT }
        />
        {/* 포스터 — 브라우저 poster 대신 자체 오버레이(되감기 시 재출현 방지). 준비되면 1회 페이드아웃 */}
        <Box
          component="img"
          src={ HERO_POSTER_SRC }
          alt=""
          aria-hidden
          sx={ {
            ...MEDIA_FIT,
            zIndex: 1,
            opacity: videoReady ? 0 : 1,
            transition: 'opacity 500ms linear',
            pointerEvents: 'none',
          } }
        />
        {/* 하단 스크림 — 카피 가독성. 화이트아웃(B5 후반)에서는 안개를 어둡히지 않게 소거 */}
        <Box
          component={ motion.div }
          style={ { opacity: scrimOpacity } }
          sx={ {
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            background:
              'linear-gradient(to top, rgba(8,12,11,0.6) 0%, rgba(8,12,11,0.18) 30%, rgba(8,12,11,0) 55%)',
          } }
        />
      </Box>

      {/* 고정 캔버스 레이어 (z2) — 핸드오프 스페이서 진입 시 인코더가 **그 자리에서 fade-in**.
          자연 스크롤로 아래서 올라오지 않는다(position:fixed). fade 중엔 fog 정지(settled 에서만 가동). */}
      <Box
        component={ motion.div }
        style={ { opacity: canvasOpacity } }
        sx={ {
          position: 'fixed',
          inset: 0,
          zIndex: 2,
          display: canvasActive ? 'block' : 'none',
          pointerEvents: canvasInteractive ? 'auto' : 'none',
          '& *': {
            animationPlayState: canvasSettled ? 'running !important' : 'paused !important',
          },
        } }
      >
        { isValidElement(children)
          ? cloneElement(children, { audioActive: audioOn })
          : children }
      </Box>

      {/* SKIP (고정) — 인코더가 활성화되면 숨김 */}
      <Button
        onClick={ handleSkip }
        sx={ {
          position: 'fixed',
          top: { xs: '5vh', md: '7vh' },
          right: { xs: 16, md: 64 },
          zIndex: 3,
          minWidth: 0,
          fontFamily: monoFont,
          fontSize: 'clamp(11px, 0.85vw, 13px)',
          letterSpacing: '0.1em',
          color: alpha(TEXT_LIGHT, 0.7),
          textShadow: COPY_SHADOW,
          display: canvasInteractive ? 'none' : 'inline-flex',
          '&:hover': { color: TEXT_LIGHT, backgroundColor: 'transparent' },
        } }
      >
        { HERO_SKIP_LABEL }
      </Button>

      {/* 사운드 토글 — 우하단 고정. 인코더(OST) 단계에선 숨김 */}
      <SoundFab
        isEnabled={ soundOn }
        isLoading={ sound.isLoading }
        onToggle={ toggleSound }
        heroSelector={ `#${TRACK_ID}` }
        sx={ audioOn ? { visibility: 'hidden', pointerEvents: 'none' } : undefined }
      />

      {/* 스크롤 콘텐츠 (자연 흐름, 영상 위) */}
      <Box sx={ { position: 'relative', zIndex: 1 } }>
        {/* 스크럽 트랙 — 타이틀 셀 + 비트 셀(가중치). 이 요소의 스크롤 진행도가 영상을 스크럽한다.
            display:flow-root — 첫 in-flow 자식(HUD)의 mt:100dvh 가 트랙 밖으로 상쇄되어 콘텐츠 전체가
            한 화면 아래로 밀리는 것을 막는다(oneir 는 absolute 콘텐츠 레이어라 BFC 가 자동으로 생겼다). */}
        <Box
          id={ TRACK_ID }
          ref={ trackRef }
          sx={ {
            position: 'relative',
            display: 'flow-root',
            height: `${timeline.scrubCells * 100}vh`,
            pointerEvents: 'none',
          } }
        >
          {/* 타이틀 — 첫 뷰포트(100vh) 중앙. 정지 구간 없음: 첫 스크롤부터 영상이 스크럽되고 타이틀은 그 위에서 흩어진다. START(클릭=소리 활성화 + 잠금 해제) */}
          <Box
            sx={ {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              px: 3,
              pointerEvents: 'auto',
            } }
          >
            {/* 마스터 타이틀 — 셀을 떠날 때 글자마다 다른 패럴럭스 속도로 흐려지며 사라진다 */}
            <TitleDisperse
              text={ HERO_MASTER_TITLE }
              t={ titleProgress }
              reduced={ reducedMotion }
              sx={ {
                fontFamily: HERO_HEADLINE_FONT,
                fontWeight: 700,
                fontSize: 'clamp(32px, 6vw, 88px)',
                textTransform: 'lowercase',
                letterSpacing: '0.34em',
                color: TEXT_LIGHT,
                textShadow: COPY_SHADOW,
                textAlign: 'center',
              } }
            />
            <Box
              component={ motion.div }
              style={ { opacity: controlsOpacity } }
              sx={ { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 } }
            >
              { !started ? (
                <Button
                  onClick={ handleStart }
                  variant="outlined"
                  sx={ {
                    fontFamily: monoFont,
                    fontSize: 'clamp(12px, 1vw, 15px)',
                    letterSpacing: '0.3em',
                    color: TEXT_LIGHT,
                    borderColor: alpha(TEXT_LIGHT, 0.5),
                    borderRadius: 0,
                    px: 4,
                    py: 1.25,
                    textShadow: COPY_SHADOW,
                    '&:hover': { borderColor: TEXT_LIGHT, backgroundColor: alpha(TEXT_LIGHT, 0.08) },
                  } }
                >
                  { HERO_START_LABEL }
                </Button>
              ) : (
                <Typography
                  component="span"
                  sx={ {
                    fontFamily: monoFont,
                    fontSize: 'clamp(10px, 0.8vw, 13px)',
                    letterSpacing: '0.4em',
                    color: alpha(TEXT_LIGHT, 0.7),
                    textShadow: COPY_SHADOW,
                  } }
                >
                  SCROLL ↓
                </Typography>
              ) }
              {/* 영상 로딩바 — 준비되면 사라짐 */}
              <Box
                aria-hidden
                sx={ {
                  width: 'clamp(120px, 14vw, 200px)',
                  height: '1px',
                  backgroundColor: alpha(TEXT_LIGHT, 0.2),
                  opacity: videoReady ? 0 : 1,
                  transition: 'opacity 400ms linear',
                  overflow: 'hidden',
                } }
              >
                <Box
                  sx={ {
                    width: `${Math.round(loadProgress * 100)}%`,
                    height: '100%',
                    backgroundColor: alpha(TEXT_LIGHT, 0.8),
                    transition: 'width 200ms linear',
                  } }
                />
              </Box>
            </Box>
          </Box>

          {/* 비트 캡션 — 키네틱 변주(beat.kinetic), 트랙 좌표 실배치, 자연 스크롤 */}
          { timeline.clips.map((clip, i) => (
            <ScrubCaption
              key={ clip.id }
              beat={ HERO_STORY_BEATS[i] }
              clip={ clip }
              progress={ progress }
              trackProgress={ trackProgress }
              total={ timeline.total }
              scrubCells={ timeline.scrubCells }
              reduced={ reducedMotion }
            />
          )) }

          {/* HUD — 비트 카운터 + 진행바 (sticky, 타이틀 셀 제외) */}
          <BeatCounter progress={ progress } clips={ timeline.clips } monoFont={ monoFont } titleProgress={ titleProgress } />
        </Box>

        {/* 핸드오프 스페이서 — 빈 스크롤 거리. 스크럽 완주(마지막 프레임=화이트아웃) 뒤 이 구간이
            뷰포트로 들어오면 위의 고정 캔버스가 제자리에서 fade-in 한다. */}
        <Box ref={ handoffRef } sx={ { position: 'relative', minHeight: `${HERO_HANDOFF_VH}vh` } } />
      </Box>
    </Box>
  );
}

export default HeptapodHeroIntro;
