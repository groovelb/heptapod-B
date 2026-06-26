import {
  cloneElement,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import { LenisContext } from '../../utils/lenisContext';
import {
  HERO_VIDEO_SRC,
  HERO_MASTER_TITLE,
  HERO_SKIP_LABEL,
  HERO_STORY_BEATS,
} from '../../data/heptapodHeroStory';

/**
 * 활성 트리거 밴드 — 섹션(100vh)이 자연 스크롤로 뷰포트를 가득 채우는 순간(상단 정렬)에 활성.
 * 점프로 재배치하지 않고, 자연 스크롤이 콘텐츠를 화면 중앙에 데려다 놓은 **그 자리에서** 잠근다 →
 * 스크롤 연속성(유저가 직접 컨트롤한다는 단서) 유지 + 카피는 항상 중앙.
 * rootMargin 상단 2% 스트립: 섹션 top이 0~2%에 닿을 때 isIntersecting → 콘텐츠가 거의 정중앙.
 */
const ACTIVE_BAND = '0px 0px -98% 0px';

const INK_COLOR = '#1c2226';
const TEXT_LIGHT = '#e8ecec';

/**
 * 인코더 핸드오프 게이팅 — 인코더 섹션이 뷰포트로 진입하는 진행도(0=막 진입, 1=완전 덮음)에
 * 따라 캔버스 트랜지션을 단계 분산한다(이전 커밋의 캔버스 트랜지션을 자연 스크롤에 이식).
 *  - ENC_FADE: 캔버스 fade-in(opacity 0→1) 구간
 *  - ENC_DISPLAY: display:block 게이트(진입 시작) — 그 전엔 display:none으로 fog 정지(성능)
 *  - ENC_AUDIO: 영상 정지 + OST 시작(인코더가 충분히 덮을 때)
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

/**
 * HeptapodHeroIntro 컴포넌트
 *
 * 스테이지 세그먼트 재생 기반 스크롤리텔링 인트로(스크롤 잠금형, 제공자 중심 페이싱).
 * - 영상: 고정(fixed) 풀스크린 배경. 스크럽이 아니라 **세그먼트 단위로 소리와 함께 재생**.
 * - START 버튼: 누르는 즉시(=소리 활성화 제스처) 첫 세그먼트 재생. 그 전엔 스크롤 잠금.
 * - 각 스테이지(100vh 섹션): 중앙 밴드 진입(IO) 시 그 섹션으로 snap-정렬 + 세그먼트 재생 +
 *   **재생 중 스크롤 잠금(lenis.stop)** + 컨텐츠 opacity↓(잠김 메타포). 풀 재생 후(rVFC) 해제 →
 *   다음 스테이지로 스크롤(반복). START·IO가 triggerStage로 동일 처리.
 * - 핸드오프 끝: 고정 캔버스(인코더)가 제자리 fade-in(children에 audioActive 주입 →
 *   인트로=영상 음성 / 인코더=OST 단계 분리).
 * - reducedMotion: 잠금/자동재생 없이 자연 스크롤만.
 *
 * 데이터: `src/data/heptapodHeroStory.js` / 기획: `docs/heptapod-b-encoder/06-hero-storyline.md`
 *
 * Props:
 * @param {React.ReactNode} children - 인트로 끝에 이어질 인코더(라이브) [Required]
 *
 * Example usage:
 * <HeptapodHeroIntro><HeptapodEncoderPage /></HeptapodHeroIntro>
 */
function HeptapodHeroIntro({ children }) {
  const theme = useTheme();
  const serifFont =
    theme.typography?.custom?.serif?.fontFamily ||
    "'Fraunces', 'Newsreader', Georgia, serif";
  const monoFont = theme.typography?.custom?.mono?.fontFamily || 'monospace';

  const videoRef = useRef(null);
  const sectionRefs = useRef([]);
  const handoffRef = useRef(null);
  const activeStageRef = useRef(-1);
  const startedRef = useRef(false); // START 눌렀는지(IO 콜백용)
  const playingRef = useRef(false); // 세그먼트 재생 중(스크롤 잠금)
  const lastStageRef = useRef(-1); // 마지막 트리거된 스테이지(중복 방지)

  const lenis = useContext(LenisContext);
  const displayRef = useRef(false);
  const audioRef = useRef(false);
  const interactRef = useRef(false);
  const settledRef = useRef(false);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [started, setStarted] = useState(false); // START 눌러 시작됨(히어로 스크롤 잠금 해제)
  const [dimmed, setDimmed] = useState(false); // 세그먼트 재생 중 — 스크롤 잠금 + 컨텐츠 dim
  const [canvasActive, setCanvasActive] = useState(false); // display 게이트(렌더 on/off)
  const [audioOn, setAudioOn] = useState(false); // 영상 정지 + OST(audioActive)
  const [canvasInteractive, setCanvasInteractive] = useState(false); // 입력 상호작용
  const [canvasSettled, setCanvasSettled] = useState(false); // 배경 효과(fog) 가동

  // 핸드오프 스페이서 진입 진행도 — 0(막 진입) → 1(완전 덮음). **고정 캔버스의 제자리 fade를 구동.**
  // 캔버스 자체는 fixed라 절대 움직이지 않고, 이 빈 스페이서가 스크롤 거리만 제공한다.
  const { scrollYProgress: encProgress } = useScroll({
    target: handoffRef,
    offset: ['start end', 'start start'],
  });
  const canvasOpacity = useTransform(encProgress, ENC_FADE, [0, 1]);

  /** prefers-reduced-motion 감지 */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  /**
   * 스크롤 잠금/해제 — 히어로(미시작) 또는 세그먼트 재생 중(dimmed)이면 잠금(lenis.stop),
   * 그 외엔 해제(lenis.start). 재생 중 스크롤↔플레이백 교란 방지 + 제공자 중심 강제 페이싱.
   */
  useEffect(() => {
    if (reducedMotion || !lenis) return undefined;
    if (!started || dimmed) lenis.stop();
    else lenis.start();
    return undefined;
  }, [lenis, started, dimmed, reducedMotion]);

  /** 스테이지 세그먼트 재생 — 활성 스테이지의 [start,end]를 play() */
  const playSegment = useCallback(
    (idx) => {
      const v = videoRef.current;
      const seg = HERO_STORY_BEATS[idx]?.video;
      if (!v || reducedMotion || !seg) return;
      activeStageRef.current = idx;
      const [start, end] = seg;
      // 세그먼트 밖이면 시작점으로 이동(이어지는 정방향은 seek 없이 자연 연속)
      if (v.currentTime < start - 0.25 || v.currentTime > end + 0.05) {
        try {
          v.currentTime = start;
        } catch {
          /* 메타데이터 로드 전 — 무시 */
        }
      }
      // START 클릭으로 소리가 활성화돼 있으므로 unmuted 재생(playSegment는 START 이후에만 호출).
      // seek 직후 play()가 일시 거부되면 그 세그먼트가 무음이 되므로 짧게 재시도(간헐 무음 방지).
      v.muted = false;
      v.volume = 1;
      const tryPlay = (n) => {
        const pr = v.play();
        if (pr && pr.catch) {
          pr.catch(() => {
            if (n > 0) setTimeout(() => tryPlay(n - 1), 60);
          });
        }
      };
      tryPlay(2);
    },
    [reducedMotion],
  );

  /**
   * 스테이지 트리거 — 그 섹션으로 snap-정렬(카피를 항상 보이게) + 세그먼트 재생 + 잠금(dimmed).
   * START와 IO가 공유해 트리거 위치를 일관되게 한다. reducedMotion이면 잠금/재생 없이 스크롤만.
   */
  const triggerStage = useCallback(
    (idx, doScroll = false) => {
      const el = sectionRefs.current[idx];
      lastStageRef.current = idx;
      if (reducedMotion) {
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      playingRef.current = true;
      setDimmed(true); // 재생과 동시에 즉시 스크롤 잠금(규칙: 재생 중 스크롤 금지)
      playSegment(idx);
      // 평소(IO 트리거): 자연 스크롤이 이미 콘텐츠를 화면 중앙에 데려다 놓았으므로 **그 자리에서 잠금**
      // (점프 없음 → 스크롤 연속성/직접 컨트롤 단서 유지). START만 타이틀→첫 콘텐츠 이동이 필요해서
      // 잠긴 채 force로 **부드럽게** 스크롤(슬라이드 점프가 아니라 연속 이동).
      if (doScroll && el && lenis) lenis.scrollTo(el, { force: true });
    },
    [lenis, playSegment, reducedMotion],
  );

  /**
   * 스테이지 섹션 IO — 중앙 밴드 진입 시 트리거. START 후 + 재생 중 아님 + 새 스테이지일 때만.
   * 트리거 시 재생 잠금(dimmed) → 세그먼트 풀 재생 후 rVFC가 해제. (제공자 중심 강제 페이싱)
   */
  useEffect(() => {
    if (reducedMotion) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const idx = Number(e.target.dataset.stage);
          if (Number.isNaN(idx)) return;
          if (!startedRef.current || playingRef.current || idx === lastStageRef.current) return;
          triggerStage(idx);
        });
      },
      { rootMargin: ACTIVE_BAND, threshold: 0 },
    );
    sectionRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [triggerStage, reducedMotion]);

  /**
   * 인코더 핸드오프 게이트 — 진입 진행도(encProgress)로 캔버스 트랜지션을 단계 분산한다.
   * display(≈0) / 영상정지·OST(≈0.55) / 입력(≈0.92) / fog(≈0.99)를 히스테리시스로 토글(리렌더 최소화).
   */
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

  /** 인코더가 충분히 덮으면 영상 정지(가려진 채 재생 낭비 방지) */
  useEffect(() => {
    const v = videoRef.current;
    if (v && audioOn) v.pause();
  }, [audioOn]);

  /** 세그먼트 끝에서 정지 — requestVideoFrameCallback(없으면 rAF)로 프레임 정밀 */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || reducedMotion) return undefined;
    let cancelled = false;
    let handle = null;
    const useRvfc = typeof v.requestVideoFrameCallback === 'function';
    const tick = () => {
      if (cancelled) return;
      const seg = HERO_STORY_BEATS[activeStageRef.current]?.video;
      if (seg && !v.paused && v.currentTime >= seg[1] - 0.02) {
        v.pause();
        // 세그먼트 풀 재생 완료 → 스크롤 잠금 해제 + dim 해제(다음 스테이지로 스크롤 가능)
        if (playingRef.current) {
          playingRef.current = false;
          setDimmed(false);
        }
      }
      handle = useRvfc ? v.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
    };
    handle = useRvfc ? v.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (handle == null) return;
      if (useRvfc && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
    };
  }, [reducedMotion]);

  /**
   * START — 누르자마자 **첫 세그먼트 즉시 재생**(이 클릭이 브라우저 소리 활성화 제스처).
   * triggerStage(0)이 첫 스테이지로 snap + 재생 + 잠금까지 일괄 처리. 히어로 스크롤 잠금 해제.
   */
  const handleStart = useCallback(() => {
    startedRef.current = true;
    setStarted(true);
    triggerStage(0, true);
  }, [triggerStage]);

  /** SKIP — 잠금 해제 + 핸드오프(인코더)로 이동. 잠긴 상태에서도 확실히 동작하도록 상태 정리. */
  const handleSkip = useCallback(() => {
    startedRef.current = true;
    playingRef.current = false;
    setStarted(true);
    setDimmed(false);
    videoRef.current?.pause();
    const el = handoffRef.current;
    if (el) {
      if (lenis) {
        lenis.start();
        lenis.scrollTo(el, { force: true });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [lenis]);

  const copyShadow = '0 1px 14px rgba(8,12,11,0.5)';

  return (
    <Box sx={ { position: 'relative', backgroundColor: 'background.default' } }>
      {/* 고정 영상 배경 (스크럽 아님 — 세그먼트 재생) */}
      <Box sx={ { position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' } }>
        <Box
          component="video"
          ref={ videoRef }
          src={ HERO_VIDEO_SRC }
          playsInline
          preload="auto"
          sx={ {
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          } }
        />
        {/* 하단 스크림 — 카피 가독성 */}
        <Box
          sx={ {
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'linear-gradient(to top, rgba(8,12,11,0.6) 0%, rgba(8,12,11,0.18) 30%, rgba(8,12,11,0) 55%)',
          } }
        />
      </Box>

      {/* 고정 캔버스 레이어 (z2) — 인코더가 영상 마지막 세그먼트 끝 지점에서 **그 자리에서 fade-in**
          트랜지션. 절대 자연 스크롤로 아래서 올라오지 않는다(position:fixed). 핸드오프 스페이서
          진행도(encProgress)로 fade/게이팅을 구동. fade 중엔 fog 정지(settled에서만 가동). */}
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

      {/* SKIP (고정) */}
      <Button
        onClick={ handleSkip }
        sx={ {
          position: 'fixed',
          top: { xs: '5vh', md: '7vh' },
          right: { xs: 16, md: 64 },
          zIndex: 3,
          minWidth: 0,
          fontFamily: monoFont,
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          color: alpha(TEXT_LIGHT, 0.7),
          textShadow: copyShadow,
          '&:hover': { color: TEXT_LIGHT, backgroundColor: 'transparent' },
        } }
      >
        { HERO_SKIP_LABEL }
      </Button>

      {/* 스크롤 컨텐츠 (자연 흐름, 영상 위) — 재생 중(dimmed)엔 opacity↓로 "스크롤 잠김" 메타포 */}
      <Box
        sx={ {
          position: 'relative',
          zIndex: 1,
          opacity: dimmed ? 0.75 : 1,
          transition: 'opacity 300ms ease',
        } }
      >
        {/* 타이틀 섹션 — START 버튼(클릭=소리 활성화 + 히어로 스크롤 잠금 해제). 시작 전엔 스크롤 잠김. */}
        <Box
          sx={ {
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            px: 3,
          } }
        >
          <Typography
            component="p"
            sx={ {
              fontFamily: serifFont,
              fontWeight: 300,
              fontSize: 'clamp(22px, 4vw, 44px)',
              letterSpacing: '0.34em',
              color: TEXT_LIGHT,
              textShadow: copyShadow,
              m: 0,
            } }
          >
            { HERO_MASTER_TITLE }
          </Typography>
          { !started ? (
            <Button
              onClick={ handleStart }
              variant="outlined"
              sx={ {
                fontFamily: monoFont,
                fontSize: '0.8rem',
                letterSpacing: '0.3em',
                color: TEXT_LIGHT,
                borderColor: alpha(TEXT_LIGHT, 0.5),
                borderRadius: 0,
                px: 4,
                py: 1.25,
                textShadow: copyShadow,
                '&:hover': { borderColor: TEXT_LIGHT, backgroundColor: alpha(TEXT_LIGHT, 0.08) },
              } }
            >
              ▶ START
            </Button>
          ) : (
            <Typography
              component="span"
              sx={ {
                fontFamily: monoFont,
                fontSize: '0.66rem',
                letterSpacing: '0.4em',
                color: alpha(TEXT_LIGHT, 0.7),
                textShadow: copyShadow,
              } }
            >
              SCROLL ↓
            </Typography>
          ) }
        </Box>

        {/* 스테이지 섹션 — 각 진입 시 세그먼트 재생 */}
        { HERO_STORY_BEATS.map((beat, i) => {
          const onLight = beat.id === 'B6';
          const color = onLight ? INK_COLOR : TEXT_LIGHT;
          return (
            <Box
              key={ beat.id }
              data-stage={ i }
              ref={ (el) => { sectionRefs.current[i] = el; } }
              sx={ {
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                px: { xs: 3, md: 12 },
              } }
            >
              { (beat.headline || beat.body) && (
                <Box sx={ { maxWidth: '42ch' } }>
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
                        textShadow: onLight ? 'none' : copyShadow,
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
                        color: onLight ? alpha(INK_COLOR, 0.85) : alpha(TEXT_LIGHT, 0.85),
                        textShadow: onLight ? 'none' : copyShadow,
                        m: 0,
                      } }
                    >
                      { beat.body }
                    </Typography>
                  ) }
                </Box>
              ) }
            </Box>
          );
        }) }
      </Box>

      {/* 핸드오프 스페이서 — 빈 스크롤 거리만 제공. 마지막 스테이지(B6 whiteout) 다음 이 구간으로
          스크롤이 들어오면 위의 고정 캔버스가 제자리에서 fade-in 한다. 캔버스는 움직이지 않음. */}
      <Box ref={ handoffRef } sx={ { position: 'relative', zIndex: 1, minHeight: '120vh' } } />
    </Box>
  );
}

export default HeptapodHeroIntro;
