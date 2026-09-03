import Box from '@mui/material/Box';
import { motion, useTransform } from 'framer-motion';
import { bodySx, headlineSx } from './captionStyles';
import { EASE, INK_LIGHT, useInkReveal } from './inkMotion';

/**
 * RotateCaption (B4 · Perspective Inverts)
 *
 * 헤드라인이 벽면 사인처럼 세로(−90°, 아래→위 읽기)로 서 있다가, 카메라의 중력 재정향과 함께 f 0.2→0.8 에서 0° 로 눕는다.
 * 화면 중앙 정렬. 회전 피벗은 텍스트 하단 중앙 — 세로로 설 때 피벗 위아래로 절반씩 뻗어 뷰포트 안에 머문다.
 * 눕는 동안 자간·크기 불변. 본문과 바닥선(1px)은 회전이 끝난 뒤에만.
 * 짧은 비트(0.9셀)라 회전 하나로 끝낸다. 2줄로 강제해(9ch) 세로일 때 뷰포트 위로 넘치지 않게 한다.
 *
 * Props:
 * @param {import('framer-motion').MotionValue<number>} f [Required]
 * @param {object} beat [Required]
 * @param {boolean} reduced
 */
function RotateCaption({ f, beat, reduced = false }) {
  const rotate = useTransform(f, [0.2, 0.8], [-90, 0], { ease: EASE.move });
  const headInk = useInkReveal(f, { enter: [0, 0.2], reduced });
  const bodyInk = useInkReveal(f, { enter: [0.78, 0.92], exit: [0.94, 1], reduced });
  const lineScale = useTransform(f, [0.8, 0.95], [0, 1], { ease: EASE.in });

  return (
    <Box sx={ { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' } }>
      <Box
        component={ motion.h2 }
        style={ reduced ? headInk : { ...headInk, rotate, transformOrigin: 'center bottom' } }
        sx={ {
          ...headlineSx({ onLight: beat.onLight, size: 'clamp(32px, 4.4vw, 72px)', maxWidth: '9ch' }),
          textAlign: 'center',
        } }
      >
        { beat.headline }
      </Box>
      {/* 바닥선 — 회전이 끝나면 좌→우로 그어진다 */}
      <Box
        component={ motion.div }
        aria-hidden
        style={ reduced ? undefined : { scaleX: lineScale } }
        sx={ {
          width: 'min(48vw, 20ch)',
          height: '1px',
          mt: 1.5,
          backgroundColor: INK_LIGHT,
          opacity: 0.6,
          transformOrigin: 'center center',
        } }
      />
      <Box component={ motion.p } style={ bodyInk } sx={ { ...bodySx({ onLight: beat.onLight, maxWidth: '28em' }), mt: 2, textAlign: 'center' } }>
        { beat.body }
      </Box>
    </Box>
  );
}

export default RotateCaption;
