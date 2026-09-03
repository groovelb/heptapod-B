import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import { motion, useMotionValueEvent, useTransform } from 'framer-motion';
import { bodySx, headlineSx } from './captionStyles';
import { EASE, LINEAR, quantize, seededUnit, useBlurFilter, useInkReveal } from './inkMotion';
import InkLetters from './InkLetters';
import InstrumentLine from './InstrumentLine';

/** 흩어질 때 나타나는 로고그램풍 기호 */
const SYMBOLS = ['◦', '∘', '◌', '○', '·'];
/** f 양자화 단계 — 한 비트 안에서 기호가 바뀌는 횟수 상한(플리커 방지) */
const STEPS = 24;

const symbolFor = (key, i, q) => SYMBOLS[Math.floor(seededUnit(`${key}:${i}:${q}`) * SYMBOLS.length)];

/**
 * 흩어짐 — q 8 이후 글자가 (결정론 랜덤 순서로) 기호로 바뀌고, q 20 이후 전부 기호.
 * @param {string} text
 * @param {number} q - 0..STEPS
 * @param {string} key
 */
function dissolve(text, q, key) {
  return Array.from(text)
    .map((ch, i) => {
      if (/\s/.test(ch)) return ch;
      const turnAt = 8 + Math.floor(seededUnit(`${key}:turn:${i}`) * 10);
      return q >= turnAt ? symbolFor(key, i, q) : ch;
    })
    .join('');
}

/**
 * 결정화 — q 6 이전엔 전부 기호, 이후 왼쪽부터 순서대로 진짜 글자로 확정(q 18 에 완료).
 */
function resolve(text, q, key) {
  const chars = Array.from(text);
  const n = chars.filter((c) => !/\s/.test(c)).length;
  let k = 0;
  return chars
    .map((ch, i) => {
      if (/\s/.test(ch)) return ch;
      const resolveAt = 6 + Math.floor((k / Math.max(1, n)) * 12);
      k += 1;
      return q >= resolveAt ? ch : symbolFor(key, i, q);
    })
    .join('');
}

/**
 * ScrambleCaption (B3 · Not Translation, but Encoding — 명제 비트)
 *
 * BrokenGrid 2컬럼: 왼쪽 `not translation,` 은 f 에 따라 로고그램풍 기호로 흩어져 blur 로 사라지고,
 * 오른쪽 `but encoding` 은 기호에서 진짜 글자로 확정된다(italic 900). 두 컬럼의 베이스라인은 의도적으로 어긋난다.
 * 기호 선택은 인코더와 같은 xmur3→sfc32 결정론 — 같은 스크롤 위치는 항상 같은 기호(가역, 플리커 없음).
 * 아래 계기 줄: 시드·빈 12슬롯(아직 이름이 없다 — 인코더 예고).
 *
 * Props:
 * @param {import('framer-motion').MotionValue<number>} f [Required]
 * @param {import('framer-motion').MotionValue<number>} progress [Required]
 * @param {number} total [Required]
 * @param {object} beat [Required]
 * @param {boolean} reduced
 */
function ScrambleCaption({ f, progress, total, beat, reduced = false }) {
  const [leftText, rightText] = useMemo(() => {
    const parts = String(beat.headline).split(/,\s*/);
    return parts.length >= 2 ? [`${parts[0]},`, parts.slice(1).join(', ')] : [beat.headline, ''];
  }, [beat.headline]);

  const [q, setQ] = useState(reduced ? STEPS : 0);
  useMotionValueEvent(f, 'change', (v) => {
    if (reduced) return;
    const next = quantize(v, STEPS);
    setQ((prev) => (prev === next ? prev : next)); // 같은 단계면 리렌더 없음
  });

  const key = `heptapod:${beat.id}`;
  const left = reduced ? leftText : dissolve(leftText, q, key);
  const right = reduced ? rightText : resolve(rightText, q, key);

  const leftOpacity = useTransform(f, [0, 0.2, 0.5, 0.9], [0, 1, 1, 0], { ease: [EASE.in, LINEAR, EASE.out] });
  const leftBlur = useTransform(f, [0, 0.2, 0.5, 0.9], [12, 0, 0, 10], { ease: [EASE.in, LINEAR, EASE.out] });
  const leftFilter = useBlurFilter(leftBlur);
  const rightInk = useInkReveal(f, { enter: [0.15, 0.45], reduced });
  const bodyInk = useInkReveal(f, { enter: [0.3, 0.6], reduced });

  return (
    <Box sx={ { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' } }>
      <Box
        sx={ {
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          columnGap: { md: 4 },
          rowGap: { xs: 1, md: 0 },
          width: '100%',
          maxWidth: 'min(88vw, 1200px)', // 화면 중앙에 그룹으로 정렬 — 두 컬럼이 중앙선에서 만난다
          mx: 'auto',
          alignItems: 'start',
          justifyItems: { xs: 'center', md: 'stretch' },
        } }
      >
        <Box
          component={ motion.h2 }
          style={ reduced ? undefined : { opacity: leftOpacity, filter: leftFilter } }
          sx={ { ...headlineSx({ onLight: beat.onLight }), textAlign: { xs: 'center', md: 'right' }, whiteSpace: 'pre-wrap' } }
        >
          { left }
        </Box>
        <Box
          component={ motion.h2 }
          style={ rightInk }
          sx={ {
            ...headlineSx({ emphasis: true, onLight: beat.onLight }),
            textAlign: { xs: 'center', md: 'left' },
            whiteSpace: 'pre-wrap',
            mt: { xs: 0, md: '1.15em' }, // BrokenGrid — 베이스라인 어긋남
          } }
        >
          { right }
        </Box>
      </Box>
      <Box
        component={ motion.p }
        style={ bodyInk }
        sx={ { ...bodySx({ emphasis: true, onLight: beat.onLight, maxWidth: '34em' }), textAlign: 'center', mt: 3 } }
      >
        <InkLetters f={ f } text={ beat.body } unit="word" enter={ [0.3, 0.6] } reduced={ reduced } />
      </Box>
      <InstrumentLine progress={ progress } f={ f } total={ total } beat={ beat } mode="seed" reduced={ reduced } onLight={ beat.onLight } />
    </Box>
  );
}

export default ScrambleCaption;
