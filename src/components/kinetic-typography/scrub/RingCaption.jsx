import Box from '@mui/material/Box';
import { motion, useTransform } from 'framer-motion';
import { HERO_HEADLINE_FONT } from '../../../data/heptapodHeroStory';
import { bodySx } from './captionStyles';
import { EASE, INK_LIGHT, useInkReveal } from './inkMotion';
import InkLetters from './InkLetters';

const RING_ID = 'hero-ring-path';
/** 링 지름 — 뷰포트 높이 기준 clamp, 좁은 화면에선 너비 상한 */
const RING_SIZE = 'min(clamp(280px, 44vh, 620px), 76vw)';

/**
 * RingCaption (B1 · A Sentence, All at Once)
 *
 * 헤드라인을 SVG textPath 로 원 위에 놓는다(로고그램 형태 인용). 링은 f 에 따라 0→90° 회전(EASE.move — 느리게
 * 시작해 쓸고 지나가 멈춤), 하이라인 잉크 원이 f 0→0.6 에서 그려진다. 글자 스태거 없음 — 전 글자가 동시에 blur→sharp.
 * 본문은 링의 **왼쪽을 통과**한다: 링 왼쪽 1/3 과 겹치는 자리에서 f 에 따라 위로 패럴럭스(+16vh → −16vh) 이동.
 * (md 미만은 겹침 없이 링 아래에 세로 배치)
 *
 * Props:
 * @param {import('framer-motion').MotionValue<number>} f [Required]
 * @param {object} beat [Required]
 * @param {boolean} reduced
 */
function RingCaption({ f, beat, reduced = false }) {
  const rotate = useTransform(f, [0, 1], [0, 90], { ease: EASE.move });
  const pathLength = useTransform(f, [0, 0.6], [0, 1], { ease: EASE.in });
  const ringInk = useInkReveal(f, { enter: [0.04, 0.4], reduced });
  const bodyInk = useInkReveal(f, { enter: [0.3, 0.6], exit: [0.85, 1], reduced });
  const parallax = useTransform(f, [0, 1], [16, -16], { ease: EASE.move });
  const bodyY = useTransform(parallax, (v) => `${v.toFixed(2)}vh`);

  return (
    <Box
      sx={ {
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: { xs: 3, md: 0 },
      } }
    >
      <Box
        component={ motion.div }
        style={ ringInk }
        sx={ { width: RING_SIZE, aspectRatio: '1 / 1', flex: 'none', position: 'relative', zIndex: 0 } }
      >
        <motion.svg
          viewBox="0 0 100 100"
          style={ { width: '100%', height: '100%', display: 'block', rotate: reduced ? 0 : rotate, transformOrigin: '50% 50%' } }
          aria-label={ beat.headline }
          role="img"
        >
          <defs>
            <path id={ RING_ID } d="M 50,50 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" />
          </defs>
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={ INK_LIGHT }
            strokeWidth="0.28"
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={ { pathLength: reduced ? 1 : pathLength, opacity: 0.55 } }
          />
          <text
            fill={ INK_LIGHT }
            fontFamily={ HERO_HEADLINE_FONT }
            fontSize="10.6"
            fontWeight="700"
            letterSpacing="1.3"
          >
            <textPath href={ `#${RING_ID}` } startOffset="0">
              { beat.headline.toLowerCase() }
            </textPath>
          </text>
        </motion.svg>
      </Box>

      {/* 본문 — md+: 링 왼쪽 1/3 에 겹쳐 위로 통과(패럴럭스). xs: 링 아래 정적 */}
      <Box
        sx={ {
          position: { xs: 'static', md: 'absolute' },
          top: { md: '50%' },
          right: { md: `calc(${RING_SIZE} * 0.68)` },
          transform: { md: 'translateY(-50%)' },
          width: { xs: '100%', md: 'min(46vw, 24em)' },
          zIndex: 1,
          textAlign: { xs: 'center', md: 'right' },
        } }
      >
        <Box
          component={ motion.p }
          style={ reduced ? bodyInk : { ...bodyInk, y: bodyY } }
          sx={ { ...bodySx({ onLight: beat.onLight, maxWidth: 'none' }), ml: { md: 'auto' } } }
        >
          <InkLetters f={ f } text={ beat.body } unit="word" enter={ [0.3, 0.6] } reduced={ reduced } />
        </Box>
      </Box>
    </Box>
  );
}

export default RingCaption;
