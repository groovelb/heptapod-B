import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';

/**
 * VideoScrubbing Component
 * 스크롤 위치에 따라 비디오를 프레임 단위로 재생(스크러빙)하는 컴포넌트입니다.
 *
 * @param {string} src - 비디오 소스 경로 [Required]
 * @param {React.RefObject} containerRef - 스크롤 추적용 컨테이너 요소 [Optional]
 * @param {Object} sx - MUI sx 스타일 [Optional]
 * @param {Object} scrollRange - 스크롤 범위 매핑 { start: 0, end: 1 } [Optional]
 * @param {function} onProgressChange - 진행도 변경 콜백 (progress: 0-1) [Optional]
 * @param {function} mapProgress - 스크롤 진행도(0-1)를 비디오 진행도(0-1)로 재매핑 [Optional, 기본값: 선형]
 * @param {string} poster - 영상 로드 전 표시할 포스터 이미지 URL(첫 프레임) [Optional]
 * @param {function} onReady - 영상이 재생 가능(첫 프레임 확보)해지면 호출 [Optional]
 * @param {function} onLoadProgress - 버퍼 진행도 콜백 (fraction: 0-1) [Optional]
 */
const VideoScrubbing = ({
  src,
  containerRef = null,
  sx = {},
  scrollRange = { start: 0, end: 1 },
  onProgressChange,
  mapProgress,
  poster = '',
  onReady,
  onLoadProgress,
  ...props
}) => {
  const videoRef = useRef(null);
  const sourceRef = useRef(src);
  const layoutRef = useRef({ top: 0, height: 0 });
  const rafRef = useRef(0);
  const isRunningRef = useRef(false);
  // seek 게이팅 — 한 번에 하나의 seek만 진행하고, 최신 목표는 pending에 쌓아 따라잡는다
  const seekingRef = useRef(false);
  const pendingTimeRef = useRef(null);
  const [isInView, setIsInView] = useState(false);

  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Initialize video to frame 0 on load
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      video.currentTime = 0;
    };

    video.addEventListener('loadeddata', handleLoadedData);

    if (video.readyState >= 2) {
      video.currentTime = 0;
    }

    return () => video.removeEventListener('loadeddata', handleLoadedData);
  }, []);

  /**
   * iOS 대응 (iOS Chrome은 WebKit이라 Safari와 동일 제약).
   *
   * iOS는 `video.currentTime`만 바꾸는 스크럽 방식으로는 프레임을 렌더하지 않는다 —
   * 디코더가 **한 번 play()로 예열되기 전까지 첫 프레임에 멈춘다**(그래서 DOM 캡션만
   * 스크롤되고 영상은 안 움직이는 현상). 또 React의 `muted` prop은 DOM muted 프로퍼티를
   * 확실히 세팅하지 못하는데, iOS 인라인 재생은 muted가 필수다.
   *
   * 그래서 (1) muted를 프로퍼티로 직접 걸고 webkit-playsinline을 달고,
   * (2) 첫 사용자 제스처(터치/클릭 완료)에 play()→즉시 pause()로 디코더를 깨워
   * 이후 currentTime seek가 실제로 그려지게 한다.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');

    let primed = false;
    const prime = () => {
      if (primed) return;
      primed = true;
      const p = video.play();
      if (p && typeof p.then === 'function') {
        p.then(() => video.pause()).catch(() => {});
      } else {
        try {
          video.pause();
        } catch {
          /* 이미 일시정지 */
        }
      }
      detach();
    };
    // 제스처 "완료" 시점(iOS가 play()를 가장 잘 허용). 스크롤도 손 떼면 touchend가 뜬다.
    const events = ['touchend', 'pointerup', 'click'];
    const detach = () => events.forEach((e) => window.removeEventListener(e, prime));
    events.forEach((e) => window.addEventListener(e, prime));
    return detach;
  }, []);

  // 로드 진행도/준비 상태 보고 — 히어로 로딩 오버레이(포스터 + 로딩바)가 소비한다
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const reportProgress = () => {
      if (!onLoadProgress) return;
      const d = video.duration;
      const buffered = video.buffered;
      if (d && buffered.length) {
        onLoadProgress(Math.min(1, buffered.end(buffered.length - 1) / d));
      }
    };
    const reportReady = () => {
      onReady?.();
      reportProgress();
    };

    video.addEventListener('progress', reportProgress);
    video.addEventListener('loadeddata', reportProgress);
    video.addEventListener('canplay', reportReady);
    // 이미 재생 가능한 상태(캐시 등)면 즉시 보고
    if (video.readyState >= 3) reportReady();

    return () => {
      video.removeEventListener('progress', reportProgress);
      video.removeEventListener('loadeddata', reportProgress);
      video.removeEventListener('canplay', reportReady);
    };
  }, [onReady, onLoadProgress]);

  // 브라우저가 src를 바꾸어도 동일 <video> 인스턴스에서 재생이 꼬이지 않게 강제 리로드
  useEffect(() => {
    if (sourceRef.current === src) return undefined;
    sourceRef.current = src;
    const video = videoRef.current;
    if (!video) return undefined;
    video.pause();
    video.load();
    video.currentTime = 0;
    return undefined;
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  /**
   * seek 게이팅의 완결부 — seek가 끝나면(seeked) 그 사이 쌓인 최신 목표로 한 번 더 따라간다.
   * 이렇게 하면 매 프레임 currentTime을 덮어써 디코더를 thrash 하지 않고,
   * "진행 중인 seek 1개 + 대기 중인 최신 목표 1개"만 유지해 모바일에서도 부드럽게 수렴한다.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const onSeeked = () => {
      seekingRef.current = false;
      const target = pendingTimeRef.current;
      if (target == null || !video.duration) return;
      if (Math.abs(video.currentTime - target) > 0.033) {
        seekingRef.current = true;
        video.currentTime = target;
      }
    };
    video.addEventListener('seeked', onSeeked);
    return () => video.removeEventListener('seeked', onSeeked);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isInView || prefersReducedMotion) {
      isRunningRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      if (prefersReducedMotion) {
        video.pause();
      }
      return;
    }

    isRunningRef.current = true;

    const updateVideoTime = () => {
      rafRef.current = 0;

      const currentVideo = videoRef.current;
      if (!currentVideo || !isInView || prefersReducedMotion) {
        return;
      }

      let progress = 0;
      const { top, height } = layoutRef.current;
      const { start, end } = scrollRange;
      const scrollY = window.scrollY || window.pageYOffset;

      if (height > 0) {
        progress = (scrollY - top) / height;
      }

      progress = (progress - start) / (end - start);
      progress = Math.max(0, Math.min(1, progress));

      if (mapProgress) {
        progress = Math.max(0, Math.min(1, mapProgress(progress)));
      }

      if (onProgressChange) {
        onProgressChange(progress);
      }

      if (currentVideo.duration) {
        const targetTime = currentVideo.duration * progress;
        // 최신 목표는 항상 기록하고, 진행 중인 seek가 없을 때만 새 seek를 쏜다.
        // 나머지는 seeked 핸들러가 따라잡는다 → 매 프레임 seek로 디코더를 밀어붙이지 않는다.
        pendingTimeRef.current = targetTime;
        if (!seekingRef.current && Math.abs(currentVideo.currentTime - targetTime) > 0.033) {
          seekingRef.current = true;
          currentVideo.currentTime = targetTime;
        }
      }

      // 스스로 rAF를 재요청하지 않는다 — 스크롤이 있을 때만 onScroll이 프레임을 예약한다.
      // (영구 60fps 루프는 스크롤 안 할 때도 메인스레드를 물어 Lenis·seek·사운드와 경합)
    };

    const onScroll = () => {
      if (!isRunningRef.current || rafRef.current) return;
      rafRef.current = requestAnimationFrame(updateVideoTime);
    };

    const onResize = () => {
      const target = containerRef?.current ?? videoRef.current;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      layoutRef.current = {
        top: rect.top + scrollY,
        height: rect.height,
      };

      if (!isRunningRef.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateVideoTime);
    };

    onResize();
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(updateVideoTime);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      isRunningRef.current = false;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [containerRef, isInView, prefersReducedMotion, scrollRange, mapProgress, onProgressChange]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Video */}
      <Box
        component="video"
        ref={videoRef}
        muted
        playsInline
        poster={poster || undefined}
        preload={prefersReducedMotion ? 'metadata' : 'auto'}
        sx={{
          width: '100%',
          height: 'auto',
          display: 'block',
          position: 'relative',
          zIndex: 0,
          ...sx,
        }}
        {...props}
      >
        <source key={src} src={src} type="video/mp4" />
      </Box>
    </Box>
  );
};

export default VideoScrubbing;
