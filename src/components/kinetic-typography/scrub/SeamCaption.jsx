import Box from '@mui/material/Box';
import { motion, useMotionTemplate, useTransform } from 'framer-motion';
import { bodySx, headlineSx } from './captionStyles';
import { EASE, ENTER, INK_LIGHT, ORDER, useInkReveal } from './inkMotion';
import InkLetters from './InkLetters';

/**
 * SeamCaption (B0 · They Arrived)
 *
 * 가로 1px 잉크 선(이음새)이 그어진 뒤 위·아래로 벌어지며 헤드라인이 드러난다 — 개구부가 열리는 물리.
 * 헤드라인을 두 벌 겹쳐 위쪽 벌은 seam 위로, 아래쪽 벌은 seam 아래로 clip-path 가 열린다.
 * 글자 스태거는 중앙→양끝(균열이 퍼지듯). 본문은 f>0.45 부터 잉크 번짐 등장.
 *
 * Props:
 * @param {import('framer-motion').MotionValue<number>} f - 비트 로컬 진행도 [Required]
 * @param {object} beat - 비트 데이터 [Required]
 * @param {boolean} reduced
 */
function SeamCaption({ f, beat, reduced = false }) {
  // seam 열림: 0 → 50 (% of headline height)
  const open = useTransform(f, ENTER, [0, 50], { ease: EASE.move });
  const inset = useTransform(open, (v) => 50 - v);
  const topClip = useMotionTemplate`inset(${inset}% 0 50% 0)`;
  const bottomClip = useMotionTemplate`inset(50% 0 ${inset}% 0)`;
  const seamScale = useTransform(f, [0, 0.12], [0, 1], { ease: EASE.in });
  const seamOpacity = useTransform(f, [0.3, 0.5], [1, 0], { ease: EASE.out });
  // 블록 퇴장(흩어짐)만 — 등장은 글자·clip 이 맡는다
  const exit = useInkReveal(f, { enter: [0, 0.01], reduced });
  const bodyInk = useInkReveal(f, { enter: [0.45, 0.75], reduced });

  const head = headlineSx({ onLight: beat.onLight });
  const letters = (
    <InkLetters f={ f } text={ beat.headline } order={ ORDER.centerOut } enter={ ENTER } reduced={ reduced } />
  );

  return (
    <Box component={ motion.div } style={ exit } sx={ { display: 'flex', flexDirection: 'column', alignItems: 'inherit' } }>
      <Box sx={ { position: 'relative' } }>
        {/* 위쪽 벌 — seam 위로 열림 */}
        <Box component={ motion.h2 } style={ reduced ? undefined : { clipPath: topClip } } sx={ head }>
          { letters }
        </Box>
        {/* 아래쪽 벌 — seam 아래로 열림 */}
        <Box
          component={ motion.div }
          aria-hidden
          style={ reduced ? { opacity: 0 } : { clipPath: bottomClip } }
          sx={ { ...head, position: 'absolute', inset: 0 } }
        >
          { letters }
        </Box>
        {/* 이음새 */}
        <Box
          component={ motion.div }
          aria-hidden
          style={ reduced ? { opacity: 0 } : { scaleX: seamScale, opacity: seamOpacity } }
          sx={ {
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: '1px',
            backgroundColor: INK_LIGHT,
            transformOrigin: 'left center',
          } }
        />
      </Box>
      <Box component={ motion.p } style={ bodyInk } sx={ { ...bodySx({ onLight: beat.onLight, maxWidth: '26em' }), mt: 2 } }>
        <InkLetters f={ f } text={ beat.body } unit="word" enter={ [0.45, 0.75] } reduced={ reduced } />
      </Box>
    </Box>
  );
}

export default SeamCaption;
