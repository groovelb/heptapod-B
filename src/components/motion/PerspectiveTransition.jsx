import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';

/**
 * PerspectiveTransition 컴포넌트
 *
 * 3D 원근 회전 전환 애니메이션.
 * 요소가 마치 뒤로 누워있다가 원래 모양으로 세워지는 효과를 적용한다.
 * CSS perspective + rotateX 기반으로 GPU 가속 속성만 사용.
 *
 * 동작 흐름:
 * 1. 초기 상태에서 요소가 rotateX로 뒤로 기울어져 있다 (opacity: 0)
 * 2. isIn이 true가 되면 rotateX(0deg)로 세워지며 나타난다
 * 3. transformOrigin이 회전 축(힌지)을 결정한다
 * 4. isTriggerOnView가 true이면 요소가 뷰포트에 진입할 때 자동 트리거된다
 *
 * Props:
 * @param {React.ReactNode} children - 전환할 콘텐츠 [Required]
 * @param {boolean} isIn - 표시 여부 (true: 세워짐, false: 누워있음) [Optional, 기본값: true]
 * @param {number} rotateFrom - 초기 회전 각도 (deg, 양수: 뒤로 눕힘) [Optional, 기본값: 60]
 * @param {string} transformOrigin - 회전 축 기준점 [Optional, 기본값: 'bottom center']
 * @param {number} perspective - 원근감 거리 (px, 낮을수록 과장) [Optional, 기본값: 800]
 * @param {number} duration - 전환 시간 (밀리초) [Optional, 기본값: 600]
 * @param {number} delay - 전환 지연 시간 (밀리초) [Optional, 기본값: 0]
 * @param {string} easing - CSS 이징 함수 [Optional, 기본값: 'cubic-bezier(0.16, 1, 0.3, 1)']
 * @param {boolean} isTriggerOnView - 뷰포트 진입 시 자동 트리거 여부 [Optional, 기본값: false]
 * @param {number} threshold - IntersectionObserver 감지 비율 (0~1) [Optional, 기본값: 0.1]
 * @param {object} sx - MUI sx 스타일 [Optional]
 *
 * Example usage:
 * <PerspectiveTransition isTriggerOnView>카드</PerspectiveTransition>
 * <PerspectiveTransition rotateFrom={-90} perspective={600} duration={800}>콘텐츠</PerspectiveTransition>
 */
function PerspectiveTransition({
  children,
  isIn = true,
  rotateFrom = 60,
  transformOrigin = 'bottom center',
  perspective = 800,
  duration = 600,
  delay = 0,
  easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
  isTriggerOnView = false,
  threshold = 0.1,
  sx = {},
}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

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

  /** 마운트 후 다음 프레임에서 상태 전환 → CSS transition 발동 */
  useEffect(() => {
    if (isTriggerOnView) return;
    const raf = requestAnimationFrame(() => {
      setIsVisible(isIn);
    });
    return () => cancelAnimationFrame(raf);
  }, [isIn, isTriggerOnView]);

  const isActive = isVisible;

  return (
    <Box
      ref={ ref }
      sx={ {
        perspective: `${perspective}px`,
        ...sx,
      } }
    >
      <Box
        sx={ {
          opacity: isActive ? 1 : 0,
          transform: isActive
            ? 'rotateX(0deg)'
            : `rotateX(${rotateFrom}deg)`,
          transformOrigin,
          transition: `opacity ${duration}ms ${easing} ${delay}ms, transform ${duration}ms ${easing} ${delay}ms`,
          willChange: 'opacity, transform',
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            opacity: 1,
            transform: 'none',
          },
        } }
      >
        { children }
      </Box>
    </Box>
  );
}

export default PerspectiveTransition;
