import { useRef, useEffect, useState } from 'react';
import Box from '@mui/material/Box';

/**
 * VideoScrubbing Component
 * 스크롤 위치에 따라 비디오를 프레임 단위로 재생(스크러빙)하는 컴포넌트입니다.
 *
 * @param {string} src - 비디오 소스 경로 [Required]
 * @param {React.RefObject} containerRef - 스크롤 추적용 컨테이너 요소 [Optional]
 * @param {Object} sx - MUI sx 스타일 [Optional]
 * @param {Object} scrollRange - 스크롤 범위 매핑 { start: 0, end: 1 } [Optional]
 * @param {function} onProgressChange - 진행도 변경 콜백 (progress: 0-1) [Optional]
 */
const VideoScrubbing = ({
  src,
  containerRef = null,
  sx = {},
  scrollRange = { start: 0, end: 1 },
  onProgressChange,
  ...props
}) => {
  const videoRef = useRef(null);
  const [isInView, setIsInView] = useState(false);

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

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isInView) return;

    let animationFrameId = null;
    let lastScrollTime = 0;
    const throttleDelay = 16; // ~60fps

    const updateVideoTime = () => {
      const now = Date.now();
      if (now - lastScrollTime < throttleDelay) {
        animationFrameId = requestAnimationFrame(updateVideoTime);
        return;
      }
      lastScrollTime = now;

      let progress = 0;

      if (containerRef && containerRef.current) {
        const container = containerRef.current;
        const containerHeight = container.offsetHeight;
        const containerOffsetTop = container.offsetTop;
        const scrollY = window.scrollY || window.pageYOffset;

        progress = (scrollY - containerOffsetTop) / containerHeight;
      } else {
        const videoHeight = video.offsetHeight;
        const videoOffsetTop = video.offsetTop;
        const scrollY = window.scrollY || window.pageYOffset;

        progress = (scrollY - videoOffsetTop) / videoHeight;
      }

      // Apply scroll range mapping
      const { start, end } = scrollRange;
      progress = (progress - start) / (end - start);

      // Clamp between 0 and 1
      progress = Math.max(0, Math.min(1, progress));

      // Callback
      if (onProgressChange) {
        onProgressChange(progress);
      }

      // Update video time
      if (video.duration) {
        const targetTime = video.duration * progress;
        if (Math.abs(video.currentTime - targetTime) > 0.033) {
          video.currentTime = targetTime;
        }
      }

      animationFrameId = requestAnimationFrame(updateVideoTime);
    };

    animationFrameId = requestAnimationFrame(updateVideoTime);

    const handleScroll = () => {
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(updateVideoTime);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isInView, containerRef, scrollRange, onProgressChange]);

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
        preload="auto"
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
        <source src={src} type="video/mp4" />
      </Box>
    </Box>
  );
};

export default VideoScrubbing;
