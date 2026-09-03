import Box from '@mui/material/Box';
import { motion, useTransform } from 'framer-motion';
import { bodySx, headlineSx } from './captionStyles';
import { EASE, ENTER, ORDER, useInkReveal } from './inkMotion';
import InkLetters from './InkLetters';

/**
 * MirrorCaption (B2 · No Before, No After)
 *
 * 프레임이 캄캄한 구간 — 중앙·대형(Oversized Display)이 허용되는 유일한 비트.
 * 글자가 양끝에서 중앙으로 동시에 드러나고(첫 글자도 마지막 글자도 먼저가 아니다) 자간이 0.25em→0.02em 으로 모인다.
 * 본문 두 줄은 헤드라인 위·아래에 거울 대칭으로, 정확히 같은 f 커브로 등장한다.
 *
 * Props:
 * @param {import('framer-motion').MotionValue<number>} f [Required]
 * @param {object} beat - body 에 '\n' 로 위/아래 줄을 나눈다 [Required]
 * @param {boolean} reduced
 */
function MirrorCaption({ f, beat, reduced = false }) {
  const [top, bottom] = String(beat.body || '').split('\n');
  const spacing = useTransform(f, ENTER, [0.25, 0.02], { ease: EASE.move });
  const letterSpacing = useTransform(spacing, (s) => `${s.toFixed(3)}em`);
  const exit = useInkReveal(f, { enter: [0, 0.01], reduced });
  const bodyInk = useInkReveal(f, { enter: [0.2, 0.5], reduced });
  const body = { ...bodySx({ onLight: beat.onLight, maxWidth: '32em' }), textAlign: 'center' };

  return (
    <Box
      component={ motion.div }
      style={ exit }
      sx={ { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: { xs: 2, md: 3 }, width: '100%' } }
    >
      <Box component={ motion.p } style={ bodyInk } sx={ body }>
        { top }
      </Box>
      <Box
        component={ motion.h2 }
        style={ reduced ? undefined : { letterSpacing } }
        sx={ {
          ...headlineSx({ onLight: beat.onLight, size: 'clamp(44px, 9vw, 128px)' }),
          textAlign: 'center',
          whiteSpace: { xs: 'normal', md: 'nowrap' },
        } }
      >
        <InkLetters f={ f } text={ beat.headline } order={ ORDER.edgesIn } enter={ ENTER } letterSpan={ 0.5 } reduced={ reduced } />
      </Box>
      <Box component={ motion.p } style={ bodyInk } sx={ body }>
        { bottom }
      </Box>
    </Box>
  );
}

export default MirrorCaption;
