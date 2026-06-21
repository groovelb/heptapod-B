import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';

/** 방향별 초기 transform offset 계산 */
function getTranslate(direction, distance) {
  switch (direction) {
    case 'up': return `translateY(${distance}px)`;
    case 'down': return `translateY(-${distance}px)`;
    case 'left': return `translateX(${distance}px)`;
    case 'right': return `translateX(-${distance}px)`;
    default: return 'none';
  }
}

/**
 * FadeTransition 컴포넌트
 *
 * 기본 opacity 전환 애니메이션.
 * 요소의 등장/퇴장 시 페이드 효과를 적용하며,
 * 선택적으로 슬라이드 방향을 조합할 수 있다.
 *
 * 동작 흐름:
 * 1. isIn이 true가 되면 opacity 0 → 1로 페이드 인된다
 * 2. direction이 설정되면 해당 방향에서 슬라이드하며 나타난다
 * 3. isIn이 false가 되면 역순으로 페이드 아웃된다
 * 4. isTriggerOnView가 true이면 요소가 뷰포트에 진입할 때 자동 트리거된다
 *
 * Props:
 * @param {React.ReactNode} children - 페이드 전환할 콘텐츠 [Required]
 * @param {boolean} isIn - 표시 여부 (true: 페이드 인, false: 페이드 아웃) [Optional, 기본값: true]
 * @param {number} duration - 전환 시간 (밀리초) [Optional, 기본값: 500]
 * @param {number} delay - 전환 지연 시간 (밀리초) [Optional, 기본값: 0]
 * @param {string} direction - 슬라이드 방향 ('none' | 'up' | 'down' | 'left' | 'right') [Optional, 기본값: 'none']
 * @param {number} distance - 슬라이드 이동 거리 (px) [Optional, 기본값: 24]
 * @param {boolean} isTriggerOnView - 뷰포트 진입 시 자동 트리거 여부 [Optional, 기본값: false]
 * @param {number} threshold - IntersectionObserver 감지 비율 (0~1) [Optional, 기본값: 0.1]
 * @param {string} easing - CSS 이징 함수 [Optional, 기본값: 'cubic-bezier(0.4, 0, 0.2, 1)']
 * @param {object} sx - MUI sx 스타일 [Optional]
 *
 * Example usage:
 * <FadeTransition>콘텐츠</FadeTransition>
 * <FadeTransition direction="up" duration={700} isTriggerOnView>카드</FadeTransition>
 */
function FadeTransition({
  children,
  isIn = true,
  duration = 500,
  delay = 0,
  direction = 'none',
  distance = 24,
  isTriggerOnView = false,
  threshold = 0.1,
  easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
  sx = {},
}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(!isTriggerOnView && isIn);

  /** IntersectionObserver 기반 뷰포트 진입 감지 */
  useEffect(() => {
    if (!isTriggerOnView) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isTriggerOnView, threshold]);

  /** isIn prop 변경에 따른 상태 동기화 */
  useEffect(() => {
    if (!isTriggerOnView) {
      setIsVisible(isIn);
    }
  }, [isIn, isTriggerOnView]);

  const isActive = isVisible;
  const transform = isActive ? 'none' : getTranslate(direction, distance);

  return (
    <Box
      ref={ ref }
      sx={ {
        opacity: isActive ? 1 : 0,
        transform,
        transition: `opacity ${duration}ms ${easing} ${delay}ms, transform ${duration}ms ${easing} ${delay}ms`,
        willChange: 'opacity, transform',
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          opacity: 1,
          transform: 'none',
        },
        ...sx,
      } }
    >
      { children }
    </Box>
  );
}

export default FadeTransition;
