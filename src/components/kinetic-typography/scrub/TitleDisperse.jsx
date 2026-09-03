import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { motion, useTransform } from 'framer-motion';
import { EASE, seededUnit, useBlurFilter } from './inkMotion';

/** 글자별 패럴럭스 속도 범위(배) — 결정론 난수로 고정 */
const SPEED_MIN = 0.55;
const SPEED_MAX = 1.75;
/** 최대 추가 상승 거리(vh) — 자연 스크롤 위에 얹히는 몫 */
const DRIFT_VH = 34;

/**
 * DisperseLetter — 글자 하나. t(타이틀 셀 진행도)에 따라 자기 속도로 위로 흘러가며 blur·소실.
 */
function DisperseLetter({ t, speed, char, reduced }) {
  // 손을 대자마자 반응(창 시작 0), 짧게 끝남(0.55~0.8)
  const drift = useTransform(t, [0, 0.8], [0, -DRIFT_VH * speed], { ease: EASE.move });
  const y = useTransform(drift, (v) => `${v.toFixed(2)}vh`);
  const blur = useTransform(t, [0, 0.55], [0, 18], { ease: EASE.in });
  const filter = useBlurFilter(blur);
  const opacity = useTransform(t, [0.02, 0.5], [1, 0], { ease: EASE.in });
  return (
    <Box
      component={ motion.span }
      style={ reduced ? undefined : { y, filter, opacity } }
      sx={ { display: 'inline-block', whiteSpace: 'pre', willChange: 'transform, filter, opacity' } }
    >
      { char }
    </Box>
  );
}

/**
 * TitleDisperse 컴포넌트
 *
 * 마스터 타이틀의 글자 하나하나가 **서로 다른 패럴럭스 속도**로 위로 흘러가며 흐려져 사라진다.
 * 구동은 타이틀 흩어짐 진행도 t(0 = 스크롤 0, 1 = 뷰포트의 TITLE_DISPERSE_VH 만큼 스크롤). 속도는 xmur3→sfc32 결정론 난수라
 * 새로고침해도 같은 글자는 같은 속도. 단어는 nowrap 으로 묶어 철자가 개행되지 않는다.
 *
 * Props:
 * @param {string} text - 타이틀 [Required]
 * @param {import('framer-motion').MotionValue<number>} t - 타이틀 셀 진행도 [Required]
 * @param {boolean} reduced - prefers-reduced-motion [Optional]
 * @param {object} sx - 루트(Typography 대체) 스타일 [Optional]
 *
 * Example usage:
 * <TitleDisperse text="HEPTAPOD B" t={ titleProgress } sx={ titleSx } />
 */
function TitleDisperse({ text, t, reduced = false, sx = {} }) {
  const words = useMemo(() => {
    const out = [];
    let idx = 0;
    for (const word of text.split(' ')) {
      const letters = [];
      for (const char of Array.from(word)) {
        const r = seededUnit(`heptapod:title:${idx}`);
        letters.push({ char, speed: SPEED_MIN + r * (SPEED_MAX - SPEED_MIN) });
        idx += 1;
      }
      out.push(letters);
    }
    return out;
  }, [text]);

  return (
    <Box component="p" sx={ { m: 0, ...sx } } aria-label={ text }>
      { words.map((letters, w) => (
        <Box key={ w } component="span" sx={ { display: 'inline-block', whiteSpace: 'nowrap' } } aria-hidden>
          { letters.map((l, i) => (
            <DisperseLetter key={ i } t={ t } speed={ l.speed } char={ l.char } reduced={ reduced } />
          )) }
          { w < words.length - 1 && ' ' }
        </Box>
      )) }
    </Box>
  );
}

export default TitleDisperse;
