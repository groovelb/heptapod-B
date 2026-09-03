import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { bodySx, headlineSx } from './captionStyles';
import { BLUR_MAX, EASE, INK_LIGHT, useBlurFilter, useInkReveal } from './inkMotion';

/** 단계(f) — 잉크 등장 → 글자별 90° 뒤집힘 → 자리 재배치 → 바닥선·본문 */
// g = 캡션 화면 통과 진행도(0 하단 진입 → 1 상단 이탈). 재배치가 0.56 에 끝나 화면 중앙에 닿을 때 문장이 완성된다.
const REVEAL = [0, 0.12];
const FLIP = [0.12, 0.32];
const FLIP_DUR = 0.1;
const REFLOW = [0.34, 0.56];
const REFLOW_DUR = 0.16;
/** 두 기둥 중심 간격 (헤드라인 font-size 배수) */
const COLUMN_GAP = 1.9;

/**
 * FlipLetter — 글자 하나. 세로 기둥 자리(−90°)에서 등장 → 제자리 90° 회전 → 가로 문장 자리로 이동.
 * x/y 는 "기둥 자리 − 최종 자리" 차이(dx, dy)에 move(1→0)를 곱한 값 — 끝 상태는 transform 0 이라 레이아웃이 어긋나지 않는다.
 * 측정값(dx, dy)은 layoutRef 에 있고 version 이 바뀌면 다시 계산된다.
 */
function FlipLetter({ f, version, layoutRef, index, stagger, char, reduced, setEl }) {
  const flipStart = FLIP[0] + stagger * (FLIP[1] - FLIP[0] - FLIP_DUR);
  const rotate = useTransform(f, [flipStart, flipStart + FLIP_DUR], [-90, 0], { ease: EASE.move });
  const reflowStart = REFLOW[0] + stagger * (REFLOW[1] - REFLOW[0] - REFLOW_DUR);
  const move = useTransform(f, [reflowStart, reflowStart + REFLOW_DUR], [1, 0], { ease: EASE.move });
  const x = useTransform([move, version], ([m]) => (layoutRef.current[index]?.dx ?? 0) * m);
  const y = useTransform([move, version], ([m]) => (layoutRef.current[index]?.dy ?? 0) * m);
  const revealStart = REVEAL[0] + stagger * (REVEAL[1] - REVEAL[0]) * 0.5;
  const opacity = useTransform(f, [revealStart, revealStart + 0.06], [0, 1], { ease: EASE.in });
  const blur = useTransform(f, [revealStart, revealStart + 0.06], [BLUR_MAX, 0], { ease: EASE.in });
  const filter = useBlurFilter(blur);
  return (
    <Box
      component={ motion.span }
      ref={ setEl }
      style={ reduced ? undefined : { x, y, rotate, opacity, filter } }
      sx={ { display: 'inline-block', whiteSpace: 'pre', willChange: 'transform, filter, opacity' } }
    >
      { char }
    </Box>
  );
}

/**
 * FlipReflowCaption (B4 · Perspective Inverts)
 *
 * 3단계 안무 — 스크롤 진행도 f 기준.
 *  1. 세로 기둥 (f 0~0.12): 두 단어가 두 기둥으로 서 있다. 글자는 −90°(벽 사인처럼 누움), 첫 글자가 맨 아래.
 *  2. 글자별 뒤집힘 (0.12~0.32): 각 글자가 자기 중심으로 90° 돌아 바로 선다. 아래 글자부터 위로 도미노 시차.
 *  3. 자리 재배치 (0.34~0.56): 기둥의 글자들이 제대로 배치된 문장(두 줄, 중앙)의 자기 자리로 미끄러진다.
 * 바닥선과 본문은 3단계 뒤에만. 끝 상태는 일반 레이아웃 그대로(FLIP 기법 — 최종 배치를 렌더해 두고
 * offsetLeft/Top 으로 잰 뒤, 기둥 자리와의 차이만 transform 으로 준다. offset* 은 transform 을 무시하므로
 * 측정 시점의 변형 상태와 무관). 폰트 로드 완료·리사이즈 시 재측정.
 *
 * Props:
 * @param {import('framer-motion').MotionValue<number>} f [Required]
 * @param {object} beat [Required]
 * @param {boolean} reduced
 */
function FlipReflowCaption({ f, beat, reduced = false }) {
  const rootRef = useRef(null);
  const letterEls = useRef([]);
  const layoutRef = useRef([]);
  const version = useMotionValue(0);

  /** 단어 → 글자 목록. stagger 는 단어 안에서 아래(첫 글자)→위(마지막 글자) 순서 0→1 */
  const words = useMemo(() => {
    const out = [];
    let index = 0;
    for (const word of String(beat.headline).toLowerCase().split(/\s+/)) {
      const chars = Array.from(word);
      const n = Math.max(1, chars.length - 1);
      out.push(chars.map((char, j) => ({ char, index: index + j, stagger: j / n })));
      index += chars.length;
    }
    return out;
  }, [beat.headline]);

  /**
   * 측정 — 최종(가로) 자리와 기둥(세로) 자리의 차이를 글자별로 계산.
   * 기둥: 단어 w 의 중심 x = 중앙 ± COLUMN_GAP·fontSize/2. 글자는 아래에서 위로, 누운 글자의 세로 길이 = 글자 폭.
   */
  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const cx = root.offsetWidth / 2;
    const cy = root.offsetHeight / 2;
    const fontSize = parseFloat(getComputedStyle(root).fontSize) || 48;
    const colSpacing = fontSize * COLUMN_GAP;
    const next = [];
    words.forEach((letters, w) => {
      const colX = cx + (w - (words.length - 1) / 2) * colSpacing;
      const els = letters.map((l) => letterEls.current[l.index]);
      if (els.some((el) => !el)) return;
      const total = els.reduce((s, el) => s + el.offsetWidth, 0);
      let acc = 0;
      letters.forEach((l, j) => {
        const el = els[j];
        const ncx = el.offsetLeft + el.offsetWidth / 2;
        const ncy = el.offsetTop + el.offsetHeight / 2;
        const colY = cy + total / 2 - (acc + el.offsetWidth / 2);
        acc += el.offsetWidth;
        next[l.index] = { dx: colX - ncx, dy: colY - ncy };
      });
    });
    layoutRef.current = next;
    version.set(version.get() + 1);
  }, [words, version]);

  useLayoutEffect(() => {
    if (reduced) return undefined;
    measure();
    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) measure();
      });
    }
    const root = rootRef.current;
    const ro = typeof ResizeObserver !== 'undefined' && root ? new ResizeObserver(() => measure()) : null;
    if (ro && root) ro.observe(root);
    window.addEventListener('resize', measure);
    return () => {
      cancelled = true;
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, reduced]);

  const headExit = useInkReveal(f, { enter: [0, 0.01], exit: [0.94, 1], reduced });
  const bodyInk = useInkReveal(f, { enter: [0.56, 0.68], exit: [0.94, 1], reduced });
  const lineScale = useTransform(f, [0.56, 0.66], [0, 1], { ease: EASE.in });

  return (
    <Box sx={ { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' } }>
      <Box
        component={ motion.h2 }
        ref={ rootRef }
        style={ headExit }
        aria-label={ beat.headline }
        sx={ {
          ...headlineSx({ onLight: beat.onLight, size: 'clamp(32px, 4.6vw, 76px)' }),
          position: 'relative',
          display: 'inline-block',
          textAlign: 'center',
        } }
      >
        { words.map((letters, w) => (
          <Box key={ w } component="span" aria-hidden sx={ { display: 'block', whiteSpace: 'nowrap' } }>
            { letters.map((l) => (
              <FlipLetter
                key={ l.index }
                f={ f }
                version={ version }
                layoutRef={ layoutRef }
                index={ l.index }
                stagger={ l.stagger }
                char={ l.char }
                reduced={ reduced }
                setEl={ (el) => { letterEls.current[l.index] = el; } }
              />
            )) }
          </Box>
        )) }
      </Box>
      {/* 바닥선 — 재배치가 끝나면 중앙에서 양쪽으로 */}
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
      <Box
        component={ motion.p }
        style={ bodyInk }
        sx={ { ...bodySx({ onLight: beat.onLight, maxWidth: '28em' }), mt: 2, textAlign: 'center' } }
      >
        { beat.body }
      </Box>
    </Box>
  );
}

export default FlipReflowCaption;
