import AppGNB from '../navigation/AppGNB';
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { LenisContext } from '../../utils/lenisContext';
import VideoScrubbing from '../scroll/VideoScrubbing';
import ScrubHud from '../scroll/ScrubHud';
import useScrubSoundEngine from '../scroll/useScrubSoundEngine';
import HeroAffordance from '../overlay-feedback/HeroAffordance';
import ScrubCaption from '../kinetic-typography/scrub/ScrubCaption';
import TitleDisperse from '../kinetic-typography/scrub/TitleDisperse';
import {
  HERO_SCRUB_TIMELINE,
  HERO_MOBILE_SCRUB_TIMELINE,
  getMobileTrackProgress,
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
  HERO_HEADLINE_FONT,
  HERO_STORY_BEATS,
  HERO_AUTOPLAY_FROM,
  HERO_VIDEO_DURATION,
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

/** 영상 오토플레이 → 인코더 전환: 스크럽 상한(비디오 진행도) */
const AUTOPLAY_CAP = HERO_AUTOPLAY_FROM / HERO_VIDEO_DURATION;

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
 *   (useScrubSoundEngine — 위치 결속·아이들 게이트·드리프트 보정·완주 무음). 공통 GNB 사운드 아이콘 토글.
 * - 카피: 트랙 좌표에 실배치된 캡션(애니메이션 없음, A/B/C 변주) + 하단 HUD 카운터.
 * - 핸드오프: 실제 ended 이후 마지막 캡션과 안개 전환을 마치면 onComplete를 한 번 호출.
 *   라우터/인코더를 소유하지 않으며, 다음 페이지는 부모 라우트가 결정한다.
 * - reducedMotion: 장식 모션·스크럽은 줄이되 START 게이트와 마지막 영상 완주는 유지.
 *
 * 데이터: `src/data/heptapodHeroStory.js` · 타임라인: `src/data/heptapodScrubTimeline.js`
 * 기획: `docs/heptapod-b-encoder/07-scroll-scrub-sound-plan.md`
 *
 * Props:
 * @param {Function} onComplete - 실제 영상 완주·캡션 퇴장 후 완료 알림 [Required]
 *
 * Example usage:
 * <HeptapodHeroIntro onComplete={handleIntroComplete} />
 */
function HeptapodHeroIntro({ onComplete }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const monoFont = theme.typography?.custom?.mono?.fontFamily || 'monospace';
  const lenis = useContext(LenisContext);
  const timeline = isMobile ? HERO_MOBILE_SCRUB_TIMELINE : HERO_SCRUB_TIMELINE;

  const trackRef = useRef(null);
  const mediaRef = useRef(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [started, setStarted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [playbackState, setPlaybackState] = useState('loading');
  const [soundOn, setSoundOn] = useState(true);

  const playToEndRef = useRef(false);
  const videoEndedRef = useRef(false);
  const completionSentRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  const [playToEnd, setPlayToEnd] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  /** 영상 진행도(0~1, 셀 가중치 매핑 후). 캡션·HUD·사운드가 구독 — 리렌더 없음 */
  const progress = useMotionValue(0);
  const captionExitProgress = useMotionValue(0);
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
    return undefined;
  }, [lenis, started]);

  /**
   * Lenis/네이티브의 실제 스크롤 위치를 캡션·스크럽 트랙 진행도에 반영한다.
   */
  useEffect(() => {
    let metrics = { top: 0, height: 0 };
    const compute = () => {
      const vh = window.innerHeight || 1;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      if (isMobile) {
        const position = getMobileTrackProgress(scrollY, metrics, timeline.scrubCells);
        titleProgress.set(position.title);
        trackProgress.set(position.track);
        return;
      }
      titleProgress.set(Math.min(1, Math.max(0, scrollY / (vh * TITLE_DISPERSE_VH))));
      trackProgress.set(Math.min(1, Math.max(0, scrollY / (vh * timeline.scrubCells))));
    };
    const measure = () => {
      if (isMobile && trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        metrics = { top: rect.top + (window.scrollY || 0), height: rect.height };
      }
      compute();
    };
    measure();
    const observer = isMobile && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (trackRef.current) observer?.observe(trackRef.current);
    window.addEventListener('resize', measure);
    if (lenis) {
      lenis.on('scroll', compute);
      return () => {
        lenis.off('scroll', compute);
        window.removeEventListener('resize', measure);
        observer?.disconnect();
      };
    }
    window.addEventListener('scroll', compute, { passive: true });
    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [lenis, titleProgress, trackProgress, timeline.scrubCells, isMobile]);

  /** 스크럽 상한 도달 → 현재 프레임부터 완주. 재생 중 역스크롤로 취소하지 않는다. */
  useEffect(() => {
    const apply = (p) => {
      const reachedEnd = mapTrackToVideo(timeline, p) >= AUTOPLAY_CAP;
      if (started && !playToEndRef.current && !videoEndedRef.current && reachedEnd) {
        playToEndRef.current = true;
        setPlayToEnd(true);
      }
    };
    apply(trackProgress.get());
    return trackProgress.on('change', apply);
  }, [trackProgress, timeline, started]);

  /** Complete only after native playback ended and the final caption exits.
   * A route change owns the next screen; reverse scroll cannot revive this hero.
   */
  useEffect(() => {
    if (!videoEnded) return undefined;
    const complete = () => {
      if (completionSentRef.current) return;
      completionSentRef.current = true;
      onCompleteRef.current?.();
    };
    if (reducedMotion) {
      captionExitProgress.set(1);
      complete();
      return undefined;
    }
    const animation = animate(captionExitProgress, 1, { duration: 0.65, ease: 'linear', onComplete: complete });
    return () => animation.stop();
  }, [videoEnded, reducedMotion, captionExitProgress]);

  // Releasing the landing also releases its media, even when leaving mid-playback.
  useEffect(() => {
    const video = mediaRef.current;
    return () => video?.pause();
  }, []);

  /* VideoScrubbing 콜백 — 참조 고정(effect 재구독 방지) */
  const mapProgress = useCallback((p) => Math.min(mapTrackToVideo(timeline, p), AUTOPLAY_CAP), [timeline]);
  const handleProgressChange = useCallback((p) => progress.set(p), [progress]);
  const handleVideoReady = useCallback(() => setVideoReady(true), []);
  const handleVideoEnded = useCallback(() => {
    const video = mediaRef.current;
    if (videoEndedRef.current || !playToEndRef.current || !video?.ended || video.seeking
      || !Number.isFinite(video.duration) || !Number.isFinite(video.currentTime) || video.currentTime < video.duration - 0.05) return;
    videoEndedRef.current = true;
    setVideoEnded(true);
  }, []);
  const handleLoadProgress = useCallback(
    (fraction) => setLoadProgress((prev) => (fraction > prev ? fraction : prev)),
    [],
  );
  const handlePlaybackStateChange = useCallback((state) => {
    setPlaybackState(state);
    if (state === 'loading') {
      setLoadProgress(0);
    }
  }, []);
  const handleRetryVideo = useCallback(() => {
    const video = mediaRef.current;
    if (!video) return;
    if (!playToEndRef.current || video.error) video.load();
    if (playToEndRef.current) {
      setPlaybackState('waiting');
      video.play().catch(() => {
        if (playToEndRef.current) setPlaybackState('error');
      });
    } else {
      setPlaybackState('loading');
    }
  }, []);

  /** START — 클릭(=오디오 언락 제스처)에서 엔진 enable + 스크롤 잠금 해제만. 자동 이동 없음(스크롤은 사용자 손에) */
  const handleStart = useCallback(() => {
    if (!videoReady || playbackState === 'error' || playbackState === 'loading') return;
    if (soundOn) soundRef.current.enable();
    setStarted(true);
  }, [soundOn, videoReady, playbackState]);

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

  // 회전·리사이즈로 재생 중인 video를 다른 소스로 다시 로드하지 않는다.
  const [activeSrc] = useState(() => isMobile ? HERO_VIDEO_SRC_MOBILE : HERO_VIDEO_SRC);
  const affordanceState = videoEnded ? 'handoff'
    : playbackState === 'error' ? 'error'
      : !videoReady || playbackState === 'loading' ? 'loading'
        : playToEnd ? (playbackState === 'playing' ? 'playing' : 'waiting')
          : started ? 'scroll' : null;

  return (
    <Box data-hero-intro data-hero-profile={ isMobile ? 'mobile' : 'desktop' } sx={ {
      position: 'relative', backgroundColor: 'background.default',
      ...(isMobile ? {
        '--hero-cell-height': '100vh',
        '@supports (height: 1svh)': { '--hero-cell-height': '100svh' },
        '& [data-sticky-caption] > div': { height: 'var(--hero-cell-height)' },
      } : {}),
    } }>
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
          mediaRef={ mediaRef }
          onPlaybackStateChange={ handlePlaybackStateChange }
          playToEnd={ playToEnd }
          playbackRequestedRef={ playToEndRef }
          mobilePlayback={ isMobile }
          scrubFrameRate={ 24 }
          onEnded={ handleVideoEnded }
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

      {/* Outgoing fog match-cut only. No hidden Canvas or encoder effects here. */}
      <Box component={ motion.div } data-hero-handoff aria-hidden
        style={ { opacity: captionExitProgress } }
        sx={ { position: 'fixed', inset: 0, zIndex: 2, bgcolor: 'custom.chamber.fog', pointerEvents: 'none' } } />


      { (!videoEnded || playToEnd) && (
        <ScrubCaption
          beat={ HERO_STORY_BEATS.at(-1) }
          clip={ timeline.clips.at(-1) }
          progress={ progress }
          trackProgress={ trackProgress }
          total={ timeline.total }
          scrubCells={ timeline.scrubCells }
          reduced={ reducedMotion }
          sticky
          autoplay={ playToEnd }
          exitProgress={ captionExitProgress }
        />
      ) }
      { affordanceState && (
        <HeroAffordance
          state={ affordanceState }
          progress={ progress }
          loadProgress={ loadProgress }
          isMobile={ isMobile }
          reducedMotion={ reducedMotion }
          onRetry={ handleRetryVideo }
        />
      ) }
      <AppGNB overlay tone="dark" soundOn={ soundOn } soundLoading={ sound.isLoading }
        onToggleSound={ videoEnded ? undefined : toggleSound } />

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
            height: isMobile ? `calc(var(--hero-cell-height) * ${timeline.scrubCells})` : `${timeline.scrubCells * 100}vh`,
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
              height: isMobile ? 'var(--hero-cell-height)' : '100vh',
              ...(!isMobile ? { '@supports (height: 1dvh)': { height: '100dvh' } } : {}),
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
                fontSize: { xs: 'clamp(24px, 6vw, 40px)', md: 'clamp(32px, 6vw, 88px)' },
                textTransform: 'lowercase',
                letterSpacing: { xs: '0.18em', md: '0.34em' },
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
              { !started && (
                <Button
                  onClick={ handleStart }
                  disabled={ !videoReady || playbackState === 'error' || playbackState === 'loading' }
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
                    '&.Mui-disabled': { color: alpha(TEXT_LIGHT, 0.45), borderColor: alpha(TEXT_LIGHT, 0.2) },
                  } }
                >
                  { HERO_START_LABEL }
                </Button>
              ) }
            </Box>
          </Box>

          {/* 비트 캡션 — 키네틱 변주(beat.kinetic), 트랙 좌표 실배치, 자연 스크롤 */}
          { timeline.clips.slice(0, -1).map((clip, i) => (
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

        {/* 스크럽 끝까지 도달할 여유 거리. 전환은 이 위치가 아닌 실제 video ended가 결정한다. */}
        <Box sx={ { position: 'relative', minHeight: isMobile ? `calc(var(--hero-cell-height) * ${HERO_HANDOFF_VH / 100})` : `${HERO_HANDOFF_VH}vh` } } />
      </Box>
    </Box>
  );
}

export default HeptapodHeroIntro;
