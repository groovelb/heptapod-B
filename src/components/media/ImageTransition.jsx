import { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';

/**
 * 트랜지션 키프레임 정의
 */
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const slideInLeft = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

const slideOutLeft = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
`;

const slideInRight = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
`;

const slideOutRight = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
`;

const zoomIn = keyframes`
  from { transform: scale(1.2); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const zoomOut = keyframes`
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0.8); opacity: 0; }
`;

const revealLeft = keyframes`
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
`;

const revealRight = keyframes`
  from { clip-path: inset(0 0 0 100%); }
  to { clip-path: inset(0 0 0 0); }
`;

const flipIn = keyframes`
  from { transform: perspective(1000px) rotateY(-90deg); opacity: 0; }
  to { transform: perspective(1000px) rotateY(0); opacity: 1; }
`;

const flipOut = keyframes`
  from { transform: perspective(1000px) rotateY(0); opacity: 1; }
  to { transform: perspective(1000px) rotateY(90deg); opacity: 0; }
`;

/**
 * ImageTransition 컴포넌트
 *
 * 인덱스 기반 이미지 트랜지션 컴포넌트.
 * 다양한 트랜지션 효과(fade, slide, zoom, reveal, flip)를 지원한다.
 *
 * 동작 방식:
 * 1. activeIndex가 변경되면 이전 이미지와 새 이미지 간 트랜지션 실행
 * 2. 이전/다음 방향을 자동 감지하여 적절한 애니메이션 적용
 * 3. 트랜지션 완료 후 onTransitionEnd 콜백 호출
 *
 * Props:
 * @param {Array} images - 이미지 소스 배열 [{ src, alt }] 또는 string[] [Required]
 * @param {number} activeIndex - 현재 활성 이미지 인덱스 [Required]
 * @param {string} transition - 트랜지션 효과 ('fade' | 'slide' | 'zoom' | 'reveal' | 'flip') [Optional, 기본값: 'fade']
 * @param {number} duration - 트랜지션 지속 시간 (ms) [Optional, 기본값: 500]
 * @param {string} easing - CSS 이징 함수 [Optional, 기본값: 'ease-out']
 * @param {string} aspectRatio - 컨테이너 종횡비 [Optional, 기본값: '16/9']
 * @param {string} objectFit - 이미지 맞춤 방식 [Optional, 기본값: 'cover']
 * @param {function} onTransitionEnd - 트랜지션 완료 콜백 [Optional]
 * @param {object} sx - 추가 스타일 [Optional]
 *
 * Example usage:
 * <ImageTransition
 *   images={['img1.jpg', 'img2.jpg', 'img3.jpg']}
 *   activeIndex={currentIndex}
 *   transition="fade"
 *   duration={500}
 * />
 */
export function ImageTransition({
  images = [],
  activeIndex = 0,
  transition = 'fade',
  duration = 500,
  easing = 'ease-out',
  aspectRatio = '16/9',
  objectFit = 'cover',
  onTransitionEnd,
  sx,
  ...props
}) {
  const [displayedIndex, setDisplayedIndex] = useState(activeIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState('next'); // 'next' | 'prev'
  const prevIndexRef = useRef(activeIndex);

  /**
   * 이미지 데이터 정규화
   * string[] → [{ src, alt }] 형태로 변환
   */
  const normalizedImages = images.map((img, idx) => {
    if (typeof img === 'string') {
      return { src: img, alt: `Image ${idx + 1}` };
    }
    return img;
  });

  /**
   * activeIndex 변경 감지 및 트랜지션 시작
   */
  useEffect(() => {
    if (activeIndex !== prevIndexRef.current) {
      // 방향 결정 및 애니메이션 시작을 다음 프레임으로 지연
      const newDirection = activeIndex > prevIndexRef.current ? 'next' : 'prev';

      const startTimer = requestAnimationFrame(() => {
        setDirection(newDirection);
        setIsTransitioning(true);
      });

      // 트랜지션 완료 후 상태 업데이트
      const endTimer = setTimeout(() => {
        setDisplayedIndex(activeIndex);
        setIsTransitioning(false);
        prevIndexRef.current = activeIndex;
        onTransitionEnd?.();
      }, duration);

      return () => {
        cancelAnimationFrame(startTimer);
        clearTimeout(endTimer);
      };
    }
  }, [activeIndex, duration, onTransitionEnd]);

  /**
   * 트랜지션 타입에 따른 애니메이션 스타일 반환
   */
  const getAnimationStyles = (isEntering) => {
    const animationBase = {
      animationDuration: `${duration}ms`,
      animationTimingFunction: easing,
      animationFillMode: 'forwards',
    };

    switch (transition) {
      case 'slide':
        if (isEntering) {
          return {
            ...animationBase,
            animationName: `${direction === 'next' ? slideInLeft : slideInRight}`,
          };
        }
        return {
          ...animationBase,
          animationName: `${direction === 'next' ? slideOutLeft : slideOutRight}`,
        };

      case 'zoom':
        return {
          ...animationBase,
          animationName: `${isEntering ? zoomIn : zoomOut}`,
        };

      case 'reveal':
        if (isEntering) {
          return {
            ...animationBase,
            animationName: `${direction === 'next' ? revealLeft : revealRight}`,
          };
        }
        return {
          opacity: isTransitioning ? 1 : 0,
          transition: `opacity ${duration}ms ${easing}`,
        };

      case 'flip':
        return {
          ...animationBase,
          animationName: `${isEntering ? flipIn : flipOut}`,
        };

      case 'fade':
      default:
        return {
          ...animationBase,
          animationName: `${isEntering ? fadeIn : fadeOut}`,
        };
    }
  };

  /**
   * 현재 이미지와 다음 이미지
   */
  const currentImage = normalizedImages[displayedIndex];
  const nextImage = normalizedImages[activeIndex];

  if (!currentImage) return null;

  return (
    <Box
      sx={ {
        position: 'relative',
        width: '100%',
        aspectRatio,
        overflow: 'hidden',
        backgroundColor: 'grey.900',
        ...sx,
      } }
      { ...props }
    >
      {/* 현재 이미지 (트랜지션 중일 때 exit 애니메이션) */}
      <Box
        component="img"
        src={ currentImage.src }
        alt={ currentImage.alt }
        sx={ {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit,
          ...(isTransitioning && getAnimationStyles(false)),
        } }
      />

      {/* 다음 이미지 (트랜지션 중일 때 enter 애니메이션) */}
      { isTransitioning && nextImage && displayedIndex !== activeIndex && (
        <Box
          component="img"
          src={ nextImage.src }
          alt={ nextImage.alt }
          sx={ {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit,
            ...getAnimationStyles(true),
          } }
        />
      ) }
    </Box>
  );
}
