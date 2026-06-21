import React, { useRef, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
// eslint-disable-next-line no-unused-vars
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';

/**
 * HorizontalScrollContainer - 가로 스크롤 컨테이너
 *
 * 세로 스크롤을 가로 이동으로 변환하는 순수 컨테이너입니다.
 * 주어진 콘텐츠만큼만 스크롤하고, 마지막 아이템이 화면에 완전히 들어오는 순간
 * 즉시 세로 스크롤로 전환됩니다.
 *
 * 동작 원리:
 * 1. 트랙의 실제 렌더링 너비(px)를 측정
 * 2. 가로 이동 거리 = 트랙 scrollWidth - 뷰포트 너비
 * 3. 세로 스크롤 영역 = 뷰포트 높이 + 가로 이동 거리 (px 단위 정확 매핑)
 * 4. scrollYProgress [0→1]을 가로 이동 [0→-distance px]에 선형 매핑
 *
 * Props:
 * @param {React.ReactNode} children - HorizontalScrollContainer.Slide로 감싼 슬라이드들 [Required]
 * @param {string} gap - 슬라이드 간 간격 (CSS 단위) [Optional, 기본값: '0px']
 * @param {string} padding - 좌우 패딩 (CSS 단위) [Optional, 기본값: '0px']
 * @param {string} backgroundColor - 배경색 [Optional, 기본값: 'transparent']
 * @param {function} onScrollProgress - 스크롤 진행도 콜백 (0-1) [Optional]
 *
 * Example usage:
 * <HorizontalScrollContainer gap="24px" padding="40px">
 *   <HorizontalScrollContainer.Slide>콘텐츠1</HorizontalScrollContainer.Slide>
 *   <HorizontalScrollContainer.Slide>콘텐츠2</HorizontalScrollContainer.Slide>
 *   <HorizontalScrollContainer.Slide>콘텐츠3</HorizontalScrollContainer.Slide>
 * </HorizontalScrollContainer>
 */
function HorizontalScrollContainer({
  children,
  gap = '0px',
  padding = '0px',
  backgroundColor = 'transparent',
  onScrollProgress,
}) {
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const [scrollDistance, setScrollDistance] = useState(0);

  // 실제 렌더링된 트랙 너비를 측정하여 정확한 스크롤 거리 계산 (px)
  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      const trackWidth = trackRef.current.scrollWidth;
      const viewportWidth = window.innerWidth;
      setScrollDistance(Math.max(0, trackWidth - viewportWidth));
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [children, gap, padding]);

  // 세로 스크롤 영역 높이 = 뷰포트 높이 + 가로 이동 거리 (px)
  // → scrollYProgress 1 도달 = 마지막 아이템 완전 노출 = 즉시 세로 스크롤 전환
  const containerHeight = window.innerHeight + scrollDistance;

  // 스크롤 진행도 추적
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // 스크롤 진행도 콜백 호출
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    onScrollProgress?.(v);
  });

  // 가로 이동 변환: 0px → -scrollDistance px
  const x = useTransform(
    scrollYProgress,
    [0, 1],
    [0, -scrollDistance]
  );

  return (
    <Box
      ref={ containerRef }
      component="section"
      sx={ {
        height: containerHeight,
        position: 'relative',
      } }
    >
      {/* Sticky 컨테이너 - 화면에 고정 */}
      <Box
        sx={ {
          position: 'sticky',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor,
        } }
      >
        {/* 가로 슬라이드 트랙 */}
        {/* width: max-content → flex 컨테이너가 콘텐츠 전체 + 양쪽 패딩만큼 확장되어
            overflow 시에도 paddingRight가 유지됨 */}
        <motion.div
          ref={ trackRef }
          style={ {
            x,
            display: 'flex',
            width: 'max-content',
            gap,
            alignItems: 'center',
            height: '100%',
            paddingLeft: padding,
            paddingRight: padding,
          } }
        >
          { children }
        </motion.div>
      </Box>
    </Box>
  );
}

/**
 * HorizontalScrollContainer.Slide - 슬라이드 아이템
 *
 * Props:
 * @param {React.ReactNode} children - 슬라이드 내부 콘텐츠 [Required]
 */
function Slide({ children }) {
  return (
    <Box
      sx={ {
        position: 'relative',
        width: 'fit-content',
        height: 'fit-content',
        flexShrink: 0,
      } }
    >
      { children }
    </Box>
  );
}

HorizontalScrollContainer.Slide = Slide;

export { HorizontalScrollContainer };
