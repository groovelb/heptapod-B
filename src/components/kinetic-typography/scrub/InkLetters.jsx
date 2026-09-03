import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { motion, useTransform } from 'framer-motion';
import { BLUR_MAX, EASE, ENTER, ORDER, useBlurFilter } from './inkMotion';

/**
 * InkLetter — 글자 하나. 자기 창 [start, end] 에서 blur→sharp (EASE.in).
 */
function InkLetter({ f, start, end, char, reduced }) {
  const opacity = useTransform(f, [start, end], [0, 1], { ease: EASE.in });
  const blur = useTransform(f, [start, end], [BLUR_MAX, 0], { ease: EASE.in });
  const filter = useBlurFilter(blur);
  return (
    <Box
      component={ motion.span }
      style={ reduced ? undefined : { opacity, filter } }
      sx={ { display: 'inline-block', whiteSpace: 'pre' } }
    >
      { char }
    </Box>
  );
}

/**
 * InkLetters 컴포넌트
 *
 * 텍스트를 글자(또는 어절)로 쪼개 스태거 창을 배정한다. 순서는 ORDER.* 로 고른다(변주 축 ①).
 * 글자 단위일 때도 **단어는 nowrap 박스로 묶어** 한 단어의 철자가 줄 사이에서 끊기지 않는다.
 *
 * Props:
 * @param {import('framer-motion').MotionValue<number>} f - 비트 로컬 진행도 [Required]
 * @param {string} text [Required]
 * @param {'char'|'word'} unit - 스태거 단위 [Optional, 기본값: 'char'] (한글 본문은 'word')
 * @param {function} order - ORDER.* [Optional, 기본값: leftToRight]
 * @param {[number, number]} enter - 전체 등장 창 [Optional, 기본값: ENTER]
 * @param {number} letterSpan - 한 단위의 등장 길이(창 대비 비율) [Optional, 기본값: 0.45]
 * @param {boolean} reduced - prefers-reduced-motion [Optional]
 *
 * Example usage:
 * <InkLetters f={ f } text="they arrived" order={ ORDER.centerOut } />
 */
function InkLetters({
  f,
  text,
  unit = 'char',
  order = ORDER.leftToRight,
  enter = ENTER,
  letterSpan = 0.45,
  reduced = false,
}) {
  const [a, b] = enter;
  const span = (b - a) * letterSpan;
  const spread = b - a - span;

  /**
   * 단어 목록 — 각 단어는 { letters: [{ char, start }] }. 공백은 단어 사이에 그대로 둔다.
   * unit='word' 면 단어 전체가 글자 하나처럼 한 창을 갖는다.
   */
  const words = useMemo(() => {
    const parts = text.split(/(\s+)/).filter((t) => t.length > 0);
    const units = unit === 'word'
      ? parts.filter((t) => !/^\s+$/.test(t)).length
      : Array.from(text.replace(/\s+/g, '')).length;
    const out = [];
    let k = 0;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (/^\s+$/.test(part)) {
        out.push({ space: part });
      } else if (unit === 'word') {
        out.push({ letters: [{ char: part, start: a + order(k, units) * spread }] });
        k += 1;
      } else {
        const letters = [];
        const chars = Array.from(part);
        for (let j = 0; j < chars.length; j += 1) {
          letters.push({ char: chars[j], start: a + order(k, units) * spread });
          k += 1;
        }
        out.push({ letters });
      }
    }
    return out;
  }, [text, unit, order, a, spread]);

  return words.map((w, i) => {
    if (w.space) {
      return (
        <Box key={ i } component="span" sx={ { whiteSpace: 'pre' } }>
          { w.space }
        </Box>
      );
    }
    return (
      <Box key={ i } component="span" sx={ { display: 'inline-block', whiteSpace: 'nowrap' } }>
        { w.letters.map((l, j) => (
          <InkLetter key={ j } f={ f } start={ l.start } end={ l.start + span } char={ l.char } reduced={ reduced } />
        )) }
      </Box>
    );
  });
}

export default InkLetters;
