import React, { useRef } from 'react';
import Box from '@mui/material/Box';
// eslint-disable-next-line no-unused-vars
import { motion, useScroll, useTransform } from 'framer-motion';

/**
 * ScrollScaleContainer - 스크롤 연동 스케일 컨테이너
 *
 * 뷰포트에 노출된 비율에 따라 콘텐츠를 스케일하는 컨테이너입니다.
 * 외부 래퍼가 원본(최대) 사이즈를 유지하므로 주변 레이아웃에 영향을 주지 않습니다.
 *
 * 동작 원리:
 * 1. 외부 Box가 children의 원본 크기만큼 공간을 확보한다
 * 2. Framer Motion useScroll로 요소의 뷰포트 내 스크롤 진행도(0→1)를 추적한다
 * 3. useTransform으로 진행도를 scaleFrom→scaleTo 범위에 선형 매핑한다
 * 4. 내부 motion.div에 transform: scale()을 적용한다 (layout flow 무영향)
 * 5. 요소가 뷰포트에 진입하면 작은 상태에서 시작, 중앙에 도달하면 원본 크기
 *
 * Props:
 * @param {React.ReactNode} children - 내부 콘텐츠 [Required]
 * @param {number} scaleFrom - 최소 스케일 (뷰포트 밖) [Optional, 기본값: 0.85]
 * @param {number} scaleTo - 최대 스케일 (뷰포트 완전 노출) [Optional, 기본값: 1]
 * @param {string} transformOrigin - 스케일 기준점 [Optional, 기본값: 'center center']
 * @param {string[]} offset - Framer Motion useScroll offset 배열 [Optional, 기본값: ['start end', 'center center']]
 * @param {object} sx - 외부 컨테이너 추가 스타일 [Optional]
 *
 * Example usage:
 * <ScrollScaleContainer scaleFrom={0.8}>
 *   <Card>콘텐츠</Card>
 * </ScrollScaleContainer>
 */
function ScrollScaleContainer({
  children,
  scaleFrom = 0.85,
  scaleTo = 1,
  transformOrigin = 'center center',
  offset = ['start end', 'center center'],
  sx,
}) {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset,
  });

  const scale = useTransform(scrollYProgress, [0, 1], [scaleFrom, scaleTo]);

  return (
    <Box
      ref={ containerRef }
      sx={ {
        overflow: 'hidden',
        ...sx,
      } }
    >
      <motion.div
        style={ {
          scale,
          transformOrigin,
          width: '100%',
          height: '100%',
        } }
      >
        { children }
      </motion.div>
    </Box>
  );
}

export { ScrollScaleContainer };
