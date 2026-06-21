import { useEffect, useId, useMemo, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

/**
 * Heptapod B 로고그램 SVG 렌더러 — 기하 생성부
 *
 * LogogramModel(src/utils/heptapod/MODEL.md)을 유일한 입력으로 받아
 * 잉크 리본(가변 굵기 폐곡 폴리곤)·가지·스플래터를 fill path로 생성한다.
 *
 * 핵심 기법:
 * - stroke-width로는 한 패스 내 굵기 변형이 불가능하므로, 중심선을 따라
 *   법선 방향으로 폭을 변조한 폐곡 폴리곤을 직접 만들어 fill로 그린다 (F2)
 * - 같은 형상을 코어/미드/헤일로 3층 <use>로 중첩 — 알파만으로 농담 (T1/T4)
 * - feTurbulence + feDisplacementMap으로 잉크 번짐 (T2). 시드는 model.meta.hash
 * - 결정론: Math.random 미사용. 모든 변이는 model 값 또는 hash 유도값에서만
 */

const TWO_PI = Math.PI * 2;
/** viewBox 반경 (R 단위) — 링(1R) + 가지·droplet·스플래터 최대 연장 수용 */
const VIEW_EXTENT = 1.7;
const RING_SAMPLES = 220;
const BRANCH_SAMPLES = 26;
const LOOP_SAMPLES = 64;
/** 등장 연출 시간 (ms) — visual-direction §5 페이싱 (600~1200ms ease-out) */
const REVEAL_DURATION = 1200;

/** 좌표 문자열 포맷 (소수 2자리) */
function fmt(v) {
  return Number(v.toFixed(2));
}

/** [min, max] 클램프 */
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/**
 * 해시에서 결정론적 [0, 1) 값 파생 — buildModel.js의 jamoUnit과 동일 믹싱.
 * 렌더링 내 모든 "임의성"은 이 함수를 통해서만 만든다 (Math.random 금지).
 *
 * @param {number} hash - model.meta.hash
 * @param {number} salt - 채널 구분 솔트
 * @returns {number} [0, 1) 결정론 값
 */
function hashUnit(hash, salt) {
  let x = Math.imul(hash ^ Math.imul(salt, 0x9e3779b9), 2654435761) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 3266489917) >>> 0;
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** 두 각도의 원형 최단 거리 (rad) */
function circDist(a, b) {
  let d = Math.abs((((a - b) % TWO_PI) + TWO_PI) % TWO_PI);
  if (d > Math.PI) {
    d = TWO_PI - d;
  }
  return d;
}

/** R 단위 극좌표 → px 좌표 (ctx = { cx, cy, s }) */
function polarPt(ctx, r, angle) {
  return {
    x: ctx.cx + Math.cos(angle) * r * ctx.s,
    y: ctx.cy + Math.sin(angle) * r * ctx.s,
  };
}

/**
 * 링 중심선 반지름 r(θ) — 타원 보정 × 하모닉 변조 (MODEL.md §3.1).
 * 장축은 weightCenterAngle에 수직 (권장 해석).
 *
 * @param {object} ring - model.ring
 * @param {number} theta - 각도 (rad)
 * @param {number} phaseOffset - 스트랜드별 하모닉 위상 어긋남
 * @param {number} radialOffset - 스트랜드별 반지름 이격
 * @returns {number} 반지름 (R 단위)
 */
function ringRadiusAt(ring, theta, phaseOffset = 0, radialOffset = 0) {
  const majorAxis = ring.weightCenterAngle + Math.PI / 2;
  const phi = theta - majorAxis;
  const e = ring.ellipticity;
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);
  const ellipse = e / Math.sqrt(e * e * cosP * cosP + sinP * sinP);
  let mod = 1;
  for (let i = 0; i < ring.harmonics.length; i += 1) {
    const h = ring.harmonics[i];
    mod += h.amp * Math.sin(h.k * theta + h.phase + phaseOffset);
  }
  return ring.radius * ellipse * mod + radialOffset;
}

/**
 * 링 폭(θ) — 무게중심 가우시안 응집 + 해시 유도 유기적 지터 (F2).
 *
 * @param {object} ring - model.ring
 * @param {number} theta - 각도 (rad)
 * @param {number} hash - model.meta.hash
 * @param {number} salt - 스트랜드 구분 솔트
 * @returns {number} 폭 (R 단위)
 */
function ringWidthAt(ring, theta, hash, salt) {
  const { min, base, peak, peakAngle, peakSigma } = ring.strokeWidth;
  const d = circDist(theta, peakAngle);
  let w = base + (peak - base) * Math.exp((-d * d) / (2 * peakSigma * peakSigma));
  const j1 = hashUnit(hash, 31 + salt) * TWO_PI;
  const j2 = hashUnit(hash, 47 + salt) * TWO_PI;
  w *= 1 + 0.16 * Math.sin(theta * 7 + j1) * Math.sin(theta * 11 + j2);
  return clamp(w, min, peak);
}

/**
 * 폐곡 중심선 리본 — 모듈러 이웃으로 접선·법선을 구해 외곽/내곽 두 서브패스를
 * 반대 권선으로 만든다 (nonzero fill → 환형 잉크 밴드).
 *
 * @param {{x: number, y: number}[]} points - 중심선 점 (px)
 * @param {number[]} widths - 점별 폭 (px)
 * @returns {string} path d
 */
function closedRibbonPath(points, widths) {
  const n = points.length;
  const outer = [];
  const inner = [];
  for (let i = 0; i < n; i += 1) {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const hw = widths[i] / 2;
    outer.push(`${fmt(points[i].x + nx * hw)},${fmt(points[i].y + ny * hw)}`);
    inner.push(`${fmt(points[i].x - nx * hw)},${fmt(points[i].y - ny * hw)}`);
  }
  inner.reverse();
  return `M${outer.join('L')}ZM${inner.join('L')}Z`;
}

/**
 * 개곡 중심선 리본 — 외곽 전진 + 내곽 역행의 단일 폐곡 폴리곤.
 *
 * @param {{x: number, y: number}[]} points - 중심선 점 (px)
 * @param {number[]} widths - 점별 폭 (px)
 * @returns {string} path d
 */
function openRibbonPath(points, widths) {
  const n = points.length;
  const outer = [];
  const inner = [];
  for (let i = 0; i < n; i += 1) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(n - 1, i + 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const hw = widths[i] / 2;
    outer.push(`${fmt(points[i].x + nx * hw)},${fmt(points[i].y + ny * hw)}`);
    inner.push(`${fmt(points[i].x - nx * hw)},${fmt(points[i].y - ny * hw)}`);
  }
  inner.reverse();
  return `M${outer.join('L')}L${inner.join('L')}Z`;
}

/**
 * 잉크 고임(droplet)·스플래터 점 — 진원이 아닌 해시 유도 저주파 일그러진 방울.
 *
 * @param {object} ctx - { cx, cy, s }
 * @param {{x: number, y: number}} center - 중심 (px)
 * @param {number} diameter - 직경 (R 단위)
 * @param {number} hash - model.meta.hash
 * @param {number} salt - 점 구분 솔트
 * @returns {string} path d
 */
function dropletPath(ctx, center, diameter, hash, salt) {
  const r = (diameter / 2) * ctx.s;
  const p1 = hashUnit(hash, salt) * TWO_PI;
  const p2 = hashUnit(hash, salt + 101) * TWO_PI;
  const pts = [];
  const segments = 16;
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * TWO_PI;
    const wobble = 1 + 0.2 * Math.sin(3 * a + p1) + 0.12 * Math.sin(5 * a + p2);
    pts.push(`${fmt(center.x + Math.cos(a) * r * wobble)},${fmt(center.y + Math.sin(a) * r * wobble)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** 가지 4유형별 각도 스윕 함수 — t ∈ [0,1] → 슬롯 각도 대비 오프셋 (rad) */
const BRANCH_SWEEPS = {
  wisp: (curl, t) => curl * (1.15 * t * t) + curl * 0.2 * Math.sin(Math.PI * t),
  hook: (curl, t) => curl * (0.3 * t + 1.9 * t * t * t),
  blob: (curl, t) => curl * 0.35 * t * t,
  spike: (curl, t) => curl * 0.15 * t,
};

/** 가지 4유형별 폭 프로파일 — t ∈ [0,1] → 폭 (R 단위) */
const BRANCH_WIDTHS = {
  wisp: (bw, t) => Math.max(0.004, bw * 0.7 * Math.pow(1 - t, 1.4)),
  hook: (bw, t) => Math.max(0.005, bw * 0.95 * (1 - 0.7 * t)),
  blob: (bw, t) => bw * (1.3 - 0.4 * t),
  spike: (bw, t) => Math.max(0.002, bw * 1.45 * Math.pow(1 - t, 2.2)),
};

/** 유형별 컬 하한 — hook은 갈고리 형태 보장, wisp는 흩날림 보장 */
const CURL_FLOOR = { wisp: 0.25, hook: 0.5, blob: 0, spike: 0 };

/**
 * 가지 중심선 샘플링 (방사 + 스윕).
 *
 * @param {object} ctx - { cx, cy, s }
 * @param {number} angle - 시작 각도 (rad)
 * @param {number} dirSign - 1(out) | -1(in)
 * @param {number} r0 - 시작 반지름 (R)
 * @param {number} length - 길이 (R)
 * @param {function(number): number} sweepFn - t → 각도 오프셋
 * @param {function(number): number} widthFn - t → 폭 (R)
 * @returns {{ pts: {x: number, y: number}[], widths: number[] }} 샘플 결과
 */
function sampleBranch(ctx, angle, dirSign, r0, length, sweepFn, widthFn) {
  const pts = [];
  const widths = [];
  for (let i = 0; i <= BRANCH_SAMPLES; i += 1) {
    const t = i / BRANCH_SAMPLES;
    const rad = Math.max(0.02, r0 + dirSign * length * t);
    pts.push(polarPt(ctx, rad, angle + sweepFn(t)));
    widths.push(widthFn(t) * ctx.s);
  }
  return { pts, widths };
}

/**
 * F8 이탈 루프 — 링에서 벗어나는 느슨한 폐곡선 (HUMAN 좌측 참조).
 * 접점에서 폭이 0에 수렴해 링과 자연스럽게 융합한다.
 *
 * @param {object} ctx - { cx, cy, s }
 * @param {object} ring - model.ring
 * @param {object} branch - 가지 (isEscapeLoop=true)
 * @param {string[]} shapes - path 누적 배열
 */
function buildEscapeLoop(ctx, ring, branch, shapes) {
  const r0 = ringRadiusAt(ring, branch.angle);
  const loopR = branch.escapeLoopLength / 2;
  const center = polarPt(ctx, r0 + loopR, branch.angle);
  const psi0 = branch.angle + Math.PI;
  const bw = ring.strokeWidth.base * branch.widthMul * 0.55;
  const pts = [];
  const widths = [];
  for (let i = 0; i < LOOP_SAMPLES; i += 1) {
    const u = i / LOOP_SAMPLES;
    const psi = psi0 + u * TWO_PI;
    const rho = loopR * (1 + 0.18 * Math.sin(2 * psi + branch.curl * 4));
    pts.push({
      x: center.x + Math.cos(psi) * rho * ctx.s,
      y: center.y + Math.sin(psi) * rho * ctx.s,
    });
    const taper = Math.pow(Math.sin(Math.PI * u), 0.6);
    widths.push(Math.max(0.003, bw * (0.25 + 0.85 * taper)) * ctx.s);
  }
  shapes.push(closedRibbonPath(pts, widths));
}

/**
 * 가지 1개 → 리본 path(들) + droplet 생성.
 *
 * @param {object} ctx - { cx, cy, s }
 * @param {object} ring - model.ring
 * @param {object} branch - model.branches[i]
 * @param {number} hash - model.meta.hash
 * @param {string[]} shapes - path 누적 배열
 */
function buildBranchShapes(ctx, ring, branch, hash, shapes) {
  if (branch.isEscapeLoop) {
    buildEscapeLoop(ctx, ring, branch, shapes);
    return;
  }
  const dirSign = branch.direction === 'in' ? -1 : 1;
  const r0 = ringRadiusAt(ring, branch.angle) - dirSign * 0.02;
  const bw = ring.strokeWidth.base * branch.widthMul;
  const length = branch.type === 'wisp' ? branch.length * 1.1 : branch.length;
  const floor = CURL_FLOOR[branch.type];
  const curl = (branch.curl < 0 ? -1 : 1) * Math.max(Math.abs(branch.curl), floor);
  const sweep = BRANCH_SWEEPS[branch.type];
  const widthProfile = BRANCH_WIDTHS[branch.type];

  const main = sampleBranch(
    ctx, branch.angle, dirSign, r0, length,
    (t) => sweep(curl, t),
    (t) => widthProfile(bw, t),
  );
  shapes.push(openRibbonPath(main.pts, main.widths));

  // wisp 붓끝 갈라짐 — 컬이 어긋난 보조 필라멘트 1가닥
  if (branch.type === 'wisp') {
    const splitCurl = curl * (1.5 + 0.6 * hashUnit(hash, 130 + branch.index));
    const sub = sampleBranch(
      ctx, branch.angle, dirSign, r0, length * 0.8,
      (t) => splitCurl * (1.3 * t * t),
      (t) => Math.max(0.003, bw * 0.32 * Math.pow(1 - t, 1.2)),
    );
    shapes.push(openRibbonPath(sub.pts, sub.widths));
  }

  // F6 말단 잉크 고임 — 진짜 잉크처럼 보이게 하는 핵심 디테일
  if (branch.droplet) {
    const tip = main.pts[main.pts.length - 1];
    const prev = main.pts[main.pts.length - 2];
    const dx = tip.x - prev.x;
    const dy = tip.y - prev.y;
    const dLen = Math.hypot(dx, dy) || 1;
    const dropR = (branch.droplet.diameter / 2) * ctx.s;
    const center = {
      x: tip.x + (dx / dLen) * dropR * 0.6,
      y: tip.y + (dy / dLen) * dropR * 0.6,
    };
    shapes.push(dropletPath(ctx, center, branch.droplet.diameter, hash, 200 + branch.index * 13));
  }
}

/**
 * 링 멀티 스트랜드 → 가변 굵기 리본 path들 (F1/F2/F3/F7).
 *
 * @param {object} ctx - { cx, cy, s }
 * @param {object} model - LogogramModel
 * @param {string[]} shapes - path 누적 배열
 */
function buildRingShapes(ctx, model, shapes) {
  const { ring, meta } = model;
  const { count, separation, phaseOffsets } = ring.strands;
  for (let sIdx = 0; sIdx < count; sIdx += 1) {
    const radialOffset = count === 1 ? 0 : (sIdx - (count - 1) / 2) * separation;
    const phase = phaseOffsets[sIdx] || 0;
    // 주 가닥은 풀 폭, 보조 가닥은 가는 동반 선 (HUMAN의 느슨한 꼬임)
    const strandMul = sIdx === 0 ? 1 : 0.3 + 0.25 * hashUnit(meta.hash, 60 + sIdx);
    const pts = [];
    const widths = [];

    if (ring.gap.isOpen) {
      const startAngle = ring.gap.angle + ring.gap.width / 2;
      const span = TWO_PI - ring.gap.width;
      for (let i = 0; i <= RING_SAMPLES; i += 1) {
        const t = i / RING_SAMPLES;
        const theta = startAngle + span * t;
        // 개구 양끝은 잉크가 끌리며 가늘어진다 (smoothstep 테이퍼)
        const edge = Math.min(1, Math.min(t, 1 - t) / 0.08);
        const taper = edge * edge * (3 - 2 * edge);
        pts.push(polarPt(ctx, ringRadiusAt(ring, theta, phase, radialOffset), theta));
        widths.push(ringWidthAt(ring, theta, meta.hash, sIdx) * strandMul * Math.max(taper, 0.1) * ctx.s);
      }
      shapes.push(openRibbonPath(pts, widths));
    } else {
      for (let i = 0; i < RING_SAMPLES; i += 1) {
        const theta = (i / RING_SAMPLES) * TWO_PI;
        pts.push(polarPt(ctx, ringRadiusAt(ring, theta, phase, radialOffset), theta));
        widths.push(ringWidthAt(ring, theta, meta.hash, sIdx) * strandMul * ctx.s);
      }
      shapes.push(closedRibbonPath(pts, widths));
    }
  }
}

/**
 * 의문형 갈고리 — 링 바깥에 부착되는 말림 리본 + 말단 미세 고임.
 *
 * @param {object} ctx - { cx, cy, s }
 * @param {object} ring - model.ring
 * @param {object} hook - model.questionHook
 * @param {number} hash - model.meta.hash
 * @param {string[]} shapes - path 누적 배열
 */
function buildQuestionHook(ctx, ring, hook, hash, shapes) {
  const r0 = ringRadiusAt(ring, hook.angle) + 0.05;
  const bw = ring.strokeWidth.base * hook.widthMul;
  const sampled = sampleBranch(
    ctx, hook.angle, 1, r0, hook.length,
    (t) => hook.curl * (0.25 * t + 2.3 * t * t * t),
    (t) => Math.max(0.006, bw * (0.95 - 0.6 * t)),
  );
  shapes.push(openRibbonPath(sampled.pts, sampled.widths));
  const tip = sampled.pts[sampled.pts.length - 1];
  shapes.push(dropletPath(ctx, tip, 0.045, hash, 500));
}

/**
 * LogogramModel → SVG fill path 집합 (순수 함수 — 결정론).
 * 같은 (model, size)는 항상 같은 path 문자열을 만든다.
 * (모듈 내부 전용 — react-refresh 제약상 컴포넌트 외 export 금지)
 *
 * @param {object} model - LogogramModel (MODEL.md 스키마) [Required]
 * @param {number} size - SVG 정방형 한 변 (px) [Required]
 * @returns {{ shapes: string[], cx: number, cy: number }} path d 배열과 중심 좌표
 */
function buildLogogramGeometry(model, size) {
  const cx = size / 2;
  const cy = size / 2;
  const ctx = { cx, cy, s: (size / 2) / VIEW_EXTENT };
  const shapes = [];
  const hash = model.meta.hash;

  buildRingShapes(ctx, model, shapes);

  for (let i = 0; i < model.branches.length; i += 1) {
    buildBranchShapes(ctx, model.ring, model.branches[i], hash, shapes);
  }

  // F6/T3 위성 비산점 — 무게중심 주변
  for (let i = 0; i < model.splatter.length; i += 1) {
    const p = model.splatter[i];
    shapes.push(dropletPath(ctx, polarPt(ctx, p.distance, p.angle), p.diameter, hash, 300 + i * 7));
  }

  if (model.questionHook) {
    buildQuestionHook(ctx, model.ring, model.questionHook, hash, shapes);
  }

  return { shapes, cx, cy };
}

/**
 * 각도 기준 회전 클리핑 웨지 path — 등장 연출용.
 * sweep이 2π에 도달하면 전체 사각형으로 치환한다.
 *
 * @param {number} cx - 중심 x (px)
 * @param {number} cy - 중심 y (px)
 * @param {number} r - 웨지 반지름 (px, 코너 커버 크기)
 * @param {number} a0 - 시작 각도 (rad)
 * @param {number} sweepAngle - 진행 각도 (rad)
 * @returns {string} path d
 */
function wedgePath(cx, cy, r, a0, sweepAngle) {
  if (sweepAngle <= 0.0001) {
    return 'M0 0Z';
  }
  if (sweepAngle >= TWO_PI - 0.0001) {
    return `M${cx - r},${cy - r}h${2 * r}v${2 * r}h${-2 * r}Z`;
  }
  const a1 = a0 + sweepAngle;
  const x0 = fmt(cx + r * Math.cos(a0));
  const y0 = fmt(cy + r * Math.sin(a0));
  const x1 = fmt(cx + r * Math.cos(a1));
  const y1 = fmt(cy + r * Math.sin(a1));
  const large = sweepAngle > Math.PI ? 1 : 0;
  return `M${cx},${cy}L${x0},${y0}A${r} ${r} 0 ${large} 1 ${x1} ${y1}Z`;
}

/**
 * LogogramRendererSvg 컴포넌트
 *
 * Heptapod B 로고그램 모델을 잉크 질감의 정지 SVG로 렌더링한다.
 * 가변 굵기 리본(폐곡 폴리곤 fill) + 3층 농담(코어/미드/헤일로) +
 * feTurbulence 잉크 번짐으로 "진짜 헵타포드 B" 인상을 만든다.
 *
 * 동작 흐름:
 * 1. model → 결정론적 기하 생성 (useMemo, Math.random 미사용)
 * 2. 같은 형상을 3층 <use>로 중첩 — 잉크색 단일, 알파만으로 농담 (T1/T4)
 * 3. isAnimated=true면 무게중심 각도에서 시작하는 회전 웨지 클립으로 등장
 *    (rAF + ref 직접 갱신 — React 상태 미사용, reduced-motion 시 즉시 완성형)
 *
 * Props:
 * @param {object} model - LogogramModel (encode → buildModel 산출물, MODEL.md 스키마) [Required]
 * @param {number} size - SVG 정방형 한 변 (px) [Optional, 기본값: 480]
 * @param {string} inkColor - 잉크 색 [Optional, 기본값: theme palette.custom.chamber.ink → '#1c2226' 폴백]
 * @param {boolean} isAnimated - 각도 기준 회전 클리핑 등장 연출 여부 [Optional, 기본값: false]
 * @param {function} onRenderComplete - 렌더 완성(등장 연출 종료) 시 호출 [Optional]
 *
 * Example usage:
 * const model = buildModel(encode('Louise'));
 * <LogogramRendererSvg model={model} size={480} isAnimated />
 */
function LogogramRendererSvg({
  model,
  size = 480,
  inkColor,
  isAnimated = false,
  onRenderComplete,
}) {
  const theme = useTheme();
  const uid = useId().replace(/:/g, '');
  const clipRef = useRef(null);
  const completeRef = useRef(onRenderComplete);

  const ink = inkColor || theme.palette.custom?.chamber?.ink || '#1c2226';
  const geometry = useMemo(() => buildLogogramGeometry(model, size), [model, size]);

  /** 콜백 최신화 — 연출 effect의 의존성에 콜백을 넣지 않기 위한 ref 동기화 */
  useEffect(() => {
    completeRef.current = onRenderComplete;
  }, [onRenderComplete]);

  // 질감 파라미터 — 시드는 model.meta.hash 유도 (결정론), 강도는 size 비례
  const k = size / 480;
  const seed = model.meta.hash % 9973;

  /** 등장 연출 — rAF로 클립 웨지를 직접 갱신 (리렌더링 없음) */
  useEffect(() => {
    if (!isAnimated) {
      completeRef.current?.();
      return undefined;
    }
    const clipEl = clipRef.current;
    const prefersReduced = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cx = size / 2;
    const cy = size / 2;
    if (prefersReduced || !clipEl) {
      clipEl?.setAttribute('d', wedgePath(cx, cy, size, 0, TWO_PI));
      completeRef.current?.();
      return undefined;
    }
    const startAngle = model.ring.weightCenterAngle;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / REVEAL_DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      clipEl.setAttribute('d', wedgePath(cx, cy, size, startAngle, eased * TWO_PI));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        completeRef.current?.();
      }
    };
    clipEl.setAttribute('d', wedgePath(cx, cy, size, startAngle, 0));
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isAnimated, model, size]);

  return (
    <Box component="span" sx={ { display: 'inline-flex', lineHeight: 0 } }>
      <svg
        width={ size }
        height={ size }
        viewBox={ `0 0 ${size} ${size}` }
        role="img"
        aria-label={ `Heptapod B logogram: ${model.meta.name}` }
      >
        <defs>
          {/* T2 잉크 번짐 — 층별로 다른 강도의 turbulence 변위 */}
          <filter id={ `${uid}-core` } x="-25%" y="-25%" width="150%" height="150%">
            <feTurbulence type="fractalNoise" baseFrequency={ (0.028 / k).toFixed(4) } numOctaves="2" seed={ seed } result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={ 8 * k } />
          </filter>
          <filter id={ `${uid}-mid` } x="-25%" y="-25%" width="150%" height="150%">
            <feMorphology operator="dilate" radius={ 1.1 * k } in="SourceGraphic" result="fat" />
            <feTurbulence type="fractalNoise" baseFrequency={ (0.018 / k).toFixed(4) } numOctaves="2" seed={ seed + 1 } result="noise" />
            <feDisplacementMap in="fat" in2="noise" scale={ 14 * k } result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation={ 1.2 * k } />
          </filter>
          <filter id={ `${uid}-halo` } x="-25%" y="-25%" width="150%" height="150%">
            <feMorphology operator="dilate" radius={ 3 * k } in="SourceGraphic" result="fat" />
            <feTurbulence type="fractalNoise" baseFrequency={ (0.013 / k).toFixed(4) } numOctaves="3" seed={ seed + 2 } result="noise" />
            <feDisplacementMap in="fat" in2="noise" scale={ 20 * k } result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation={ 4.2 * k } />
          </filter>
          { isAnimated && (
            <clipPath id={ `${uid}-reveal` }>
              <path ref={ clipRef } d="M0 0Z" />
            </clipPath>
          ) }
          <g id={ `${uid}-shape` }>
            { geometry.shapes.map((d, i) => (
              <path key={ `${uid}-p${i}` } d={ d } fill={ ink } />
            )) }
          </g>
        </defs>
        {/* T1 3층 농담 — 잉크색 단일 + 알파만 (T4: 회색 별도 지정 금지) */}
        <g clipPath={ isAnimated ? `url(#${uid}-reveal)` : undefined }>
          <use href={ `#${uid}-shape` } opacity={ 0.15 } filter={ `url(#${uid}-halo)` } />
          <use href={ `#${uid}-shape` } opacity={ 0.5 } filter={ `url(#${uid}-mid)` } />
          <use href={ `#${uid}-shape` } opacity={ 0.95 } filter={ `url(#${uid}-core)` } />
        </g>
      </svg>
    </Box>
  );
}

export default LogogramRendererSvg;
