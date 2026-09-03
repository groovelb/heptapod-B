/**
 * inkMotion — 스크럽 히어로 키네틱 타이포의 공통 모션 문법 (docs/heptapod-b-encoder/08 §1)
 *
 * 고정 축:
 * - 구동: 비트 로컬 진행도 f(0~1) 하나. 시간 기반 애니메이션 없음(가역·결정론)
 * - 재질: 잉크 — 등장 blur 12px→0 + opacity 0→1, 퇴장 blur↑ + 자간 +0.06em + opacity↓
 * - 타이밍: 등장 f 0→0.35, 유지, 퇴장 0.8→1. 이징 cubic-bezier(0.16, 1, 0.3, 1)
 *
 * 변주 축(각 캡션이 고른다): 글자 스태거 순서(ORDER) · 공간 변형(각 컴포넌트)
 *
 * 글자 단위 스태거 컴포넌트는 InkLetters.jsx (이 파일은 JSX 없는 순수 로직).
 *
 * Example usage:
 * const f = useBeatProgress(progress, clip);
 * const ink = useInkReveal(f);
 * <motion.h2 style={ ink }>…</motion.h2>
 */
import { cubicBezier, useTransform } from 'framer-motion';

/**
 * 이징 프리셋 — 인(등장)·아웃(퇴장)·무브(공간 변형) 세 종류. 모든 f 매핑은 이 셋 중 하나를 쓴다.
 *  cinematic: 극적 — 등장은 빠르게 도착해 길게 정착(out-quint), 퇴장은 머뭇거리다 가속해 사라짐(in-quint),
 *             움직임은 느리게 시작해 한 번에 쓸고 지나가 느리게 멈춤(in-out-quint)
 *  soft:      완만 — 초기 버전(expo-out 단일)
 */
export const EASE_PRESETS = {
  cinematic: {
    in: cubicBezier(0.22, 1, 0.36, 1),
    out: cubicBezier(0.64, 0, 0.78, 0),
    move: cubicBezier(0.83, 0, 0.17, 1),
  },
  soft: {
    in: cubicBezier(0.16, 1, 0.3, 1),
    out: cubicBezier(0.4, 0, 0.6, 1),
    move: cubicBezier(0.16, 1, 0.3, 1),
  },
};
/** 활성 프리셋 — 여기 한 줄로 전체 히어로의 이징이 바뀐다 */
export const EASE = EASE_PRESETS.cinematic;
/** 유지 구간용 항등 */
export const LINEAR = (v) => v;
/** @deprecated EASE.in 별칭 */
export const INK_EASE = EASE.in;
/** 등장 창(f) */
export const ENTER = [0, 0.35];
/** 퇴장 창(f) */
export const EXIT = [0.8, 1];
/** 등장 blur(px) */
export const BLUR_MAX = 12;
export const INK_LIGHT = '#e8ecec';
export const INK_DARK = '#1c2226';
export const COPY_SHADOW = '0 1px 14px rgba(8,12,11,0.5)';

/**
 * 비트 로컬 진행도 — 영상 진행도 p 를 클립 [startNorm, endNorm] → [0, 1] 로 (MotionValue, 리렌더 없음).
 * @param {import('framer-motion').MotionValue<number>} progress
 * @param {{ startNorm: number, endNorm: number }} clip
 */
export function useBeatProgress(progress, clip) {
  return useTransform(progress, [clip.startNorm, clip.endNorm], [0, 1]);
}

/** blur(px) MotionValue → CSS filter 문자열 */
export function useBlurFilter(blur) {
  return useTransform(blur, (b) => (b < 0.05 ? 'none' : `blur(${b.toFixed(2)}px)`));
}

/**
 * 잉크 재질 등장·퇴장 — 블록 단위 { opacity, filter, letterSpacing } (motion style 에 그대로 spread).
 * reduced 면 정적 최종 상태를 돌려준다.
 *
 * @param {import('framer-motion').MotionValue<number>} f
 * @param {object} options
 * @param {[number, number]} options.enter - 등장 창 [Optional, 기본값: ENTER]
 * @param {[number, number]} options.exit - 퇴장 창 [Optional, 기본값: EXIT]
 * @param {number} options.baseSpacing - 기본 자간(em) [Optional, 기본값: 0.02]
 * @param {number} options.disperse - 퇴장 시 자간 가산(em) [Optional, 기본값: 0.06]
 * @param {boolean} options.reduced - prefers-reduced-motion [Optional]
 */
export function useInkReveal(
  f,
  { enter = ENTER, exit = EXIT, baseSpacing = 0.02, disperse = 0.06, reduced = false } = {},
) {
  const keys = [enter[0], enter[1], exit[0], exit[1]];
  const eases = [EASE.in, LINEAR, EASE.out]; // 등장 / 유지 / 퇴장
  const opacity = useTransform(f, keys, [0, 1, 1, 0], { ease: eases });
  const blur = useTransform(f, keys, [BLUR_MAX, 0, 0, BLUR_MAX * 0.8], { ease: eases });
  const filter = useBlurFilter(blur);
  const spacing = useTransform(f, [exit[0], exit[1]], [baseSpacing, baseSpacing + disperse], {
    ease: EASE.out,
  });
  const letterSpacing = useTransform(spacing, (s) => `${s.toFixed(3)}em`);
  if (reduced) return { opacity: 1, filter: 'none', letterSpacing: `${baseSpacing}em` };
  return { opacity, filter, letterSpacing };
}

/** 글자 스태거 순서 — (i, n) → 0(먼저)~1(나중) */
export const ORDER = {
  leftToRight: (i, n) => (n <= 1 ? 0 : i / (n - 1)),
  /** 중앙에서 양끝으로 (균열이 퍼지듯) */
  centerOut: (i, n) => {
    const mid = (n - 1) / 2;
    return mid === 0 ? 0 : Math.abs(i - mid) / mid;
  },
  /** 양끝에서 중앙으로 (먼저도 나중도 없이) */
  edgesIn: (i, n) => {
    const mid = (n - 1) / 2;
    return mid === 0 ? 0 : 1 - Math.abs(i - mid) / mid;
  },
  /** 동시 */
  none: () => 0,
};

/* ---------- 결정론 PRNG (인코더 encode.js 와 동일 알고리즘: xmur3 → sfc32) ---------- */

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function sfc32(a, b, c, d) {
  return function next() {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * 키 문자열 → [0, 1) 결정론 난수. 같은 키는 항상 같은 값(스크램블 기호가 위치별로 고정 → 가역·무플리커).
 * @param {string} key
 */
export function seededUnit(key) {
  const h = xmur3(key);
  return sfc32(h(), h(), h(), h())();
}

/** f(0~1) → 0..steps 정수 단계 */
export const quantize = (f, steps) => Math.max(0, Math.min(steps, Math.floor(f * steps)));

/** 영상 진행도 → 타임코드 `mm:ss.d` */
export function timecode(p, total) {
  const t = Math.max(0, p * total);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
}
