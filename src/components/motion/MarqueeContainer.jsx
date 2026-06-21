import * as React from 'react';
import { keyframes } from '@mui/material/styles';
import Box from '@mui/material/Box';

const scrollLeftKf = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

const scrollRightKf = keyframes`
  from { transform: translateX(-50%); }
  to { transform: translateX(0); }
`;

/**
 * MarqueeContainer 컴포넌트
 *
 * 무한 루프 수평 흐름 애니메이션 컨테이너.
 * 텍스트, 이미지, 카드 등 자식 요소를 연속으로 흐르게 한다.
 * CSS keyframes 기반 GPU 가속(translateX).
 *
 * 동작 흐름:
 * 1. 컨테이너 폭을 측정해 빈틈 없이 아이템을 반복 채운다
 * 2. translateX 애니메이션으로 무한 스크롤된다
 * 3. 복제된 요소로 끊김 없는 루프를 구현한다
 * 4. (선택) 호버 시 일시정지 / 스크롤 스크러빙 모드 전환
 *
 * Props:
 * @param {React.ReactNode} children - 마퀴 안에 표시할 콘텐츠 [Required]
 * @param {number} speed - 한 사이클 완료 시간 (초, 클수록 느림) [Optional, 기본값: 20]
 * @param {string} direction - 스크롤 방향 ('left' | 'right') [Optional, 기본값: 'left']
 * @param {boolean} isPauseOnHover - 호버 시 일시정지 여부 [Optional, 기본값: true]
 * @param {number} gap - 아이템 간 간격 (theme.spacing 단위) [Optional, 기본값: 4]
 * @param {boolean} isScrollScrub - 스크롤 스크러빙 모드 [Optional, 기본값: false]
 *
 * Example usage:
 * <MarqueeContainer speed={15} direction="left">
 *   <Chip label="React" />
 *   <Chip label="MUI" />
 * </MarqueeContainer>
 */
function MarqueeContainer({
  children,
  speed = 20,
  direction = 'left',
  isPauseOnHover = true,
  gap = 4,
  isScrollScrub = false,
}) {
  const containerRef = React.useRef(null);
  const measureRef = React.useRef(null);
  const trackRef = React.useRef(null);
  const [fillCount, setFillCount] = React.useState(1);

  const items = React.Children.toArray(children);
  const animation = direction === 'left' ? scrollLeftKf : scrollRightKf;

  /** 컨테이너 폭 대비 아이템 셋 반복 횟수 계산 */
  React.useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const calculate = () => {
      const containerW = container.offsetWidth;
      const setW = measure.scrollWidth;
      if (setW === 0) return;
      setFillCount(Math.max(1, Math.ceil(containerW / setW)));
    };

    calculate();
    const ro = new ResizeObserver(calculate);
    ro.observe(container);
    return () => ro.disconnect();
  }, [children, gap]);

  /** 스크롤 스크러빙: 엘리먼트의 뷰포트 통과 진행률로 translateX 제어 */
  React.useEffect(() => {
    if (!isScrollScrub) return;
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const onScroll = () => {
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.max(0, Math.min(1,
        (vh - rect.top) / (vh + rect.height)
      ));

      const halfWidth = track.scrollWidth / 2;
      const mult = direction === 'left' ? -1 : 1;
      const offset = (progress * halfWidth) % halfWidth;
      track.style.transform = `translateX(${mult * offset}px)`;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [isScrollScrub, direction, fillCount]);

  /** 아이템 셋 1벌 렌더링 (fillCount만큼 반복) */
  const renderHalf = (prefix) =>
    Array.from({ length: fillCount }, (_, rep) =>
      items.map((child, i) => (
        <Box key={ `${prefix}-${rep}-${i}` } sx={ { flexShrink: 0, mr: gap } }>
          { child }
        </Box>
      ))
    ).flat();

  return (
    <Box
      ref={ containerRef }
      sx={ {
        overflow: 'hidden',
        width: '100%',
        position: 'relative',
        ...(isPauseOnHover && !isScrollScrub && {
          '&:hover > [data-marquee-track]': {
            animationPlayState: 'paused',
          },
        }),
      } }
    >
      {/* 측정용 히든 엘리먼트: 아이템 1셋의 실제 폭 계산 */}
      <Box
        ref={ measureRef }
        aria-hidden="true"
        sx={ {
          display: 'flex',
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
        } }
      >
        { items.map((child, i) => (
          <Box key={ i } sx={ { flexShrink: 0, mr: gap } }>{ child }</Box>
        )) }
      </Box>

      {/* 트랙: 동일한 두 벌 → translateX(-50%)로 끊김 없는 루프 */}
      <Box
        ref={ trackRef }
        data-marquee-track=""
        sx={ {
          display: 'flex',
          alignItems: 'center',
          width: 'max-content',
          ...(!isScrollScrub && {
            animation: `${animation} ${speed}s linear infinite`,
          }),
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            transform: 'none !important',
          },
        } }
      >
        { renderHalf('a') }
        { renderHalf('b') }
      </Box>
    </Box>
  );
}

export default MarqueeContainer;
