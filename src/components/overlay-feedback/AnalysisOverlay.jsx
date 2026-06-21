import { useMemo, useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

/**
 * Heptapod B 분석 오버레이 — 울프럼 포렌식 화면 재현
 *
 * 영화에서 크리스토퍼 울프럼이 Wolfram Language로 촬영 중 실시간 구동한
 * 분석 코드 화면(로고그램을 특징점·삼각망·12세그먼트로 해부)을 재현한다.
 * "발견된 구조가 아니라 해독 가능하도록 심어둔 12세그먼트"라는 리서치 사실을
 * 라이브 스캔 연출 + 계측 수치 + 캡션으로 드러낸다.
 *
 * 레이어:
 * - 빨간 vertex: 모델에서 추출한 특징점 (클러스터 질량 주변 조밀)
 * - 초록 mesh: vertex의 Delaunay 삼각망 (구조 분해)
 * - 12세그먼트 점선 격자 + 측정 링/눈금 (모노크롬 가이드 — 심어둔 격자)
 * - 계측 readout + 세계관 캡션
 *
 * 색 정책: 평상시 모노크롬이지만 "분석은 별개의 계측 장비 뷰"이므로 이 모드
 * 한정으로 인광 초록(mesh) + 빨강(vertex) 계측색을 허용한다 (안 C).
 *
 * 좌표계 일치 (렌더러와 동일 — 절대 조건):
 * - viewBox 0 0 size size, 중심 (size/2, size/2)
 * - VIEW_EXTENT = 1.7, 각도 0 = 3시(+x) 시계방향, 슬롯 0 = 12시
 * - 링 반경은 renderer의 ringRadiusAt와 동일 공식
 */

const TWO_PI = Math.PI * 2;
/** viewBox 반경 (R 단위) — 렌더러 VIEW_EXTENT와 동일해야 한다 */
const VIEW_EXTENT = 1.7;
/** 측정 링 반경 (R 단위) */
const MEASURE_RING_R = 1.42;
/** 계측색 — 분석 모드 한정 (Wolfram 화면: 인광 초록 mesh + 마커 빨강) */
const MEAS_GREEN = '#3ad16b';
const MEAS_RED = '#e0432e';

/** 좌표 문자열 포맷 (소수 2자리) */
function fmt(v) {
  return Number(v.toFixed(2));
}

/** 두 각도의 원형 최단 거리 (rad) */
function angDist(a, b) {
  let d = Math.abs((((a - b) % TWO_PI) + TWO_PI) % TWO_PI);
  if (d > Math.PI) {
    d = TWO_PI - d;
  }
  return d;
}

/** 해시 유도 결정론 [0,1) — vertex 산포용 (Math.random 금지) */
function hashUnit(hash, salt) {
  let x = Math.imul(hash ^ Math.imul(salt, 0x9e3779b9), 2654435761) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

/** R 단위 극좌표 → px 좌표 */
function polarPt(ctx, r, angle) {
  return {
    x: ctx.cx + Math.cos(angle) * r * ctx.s,
    y: ctx.cy + Math.sin(angle) * r * ctx.s,
  };
}

/** 링 중심선 반지름 r(θ) — renderer.ringRadiusAt와 동일 공식 */
function ringRadiusAt(ring, theta) {
  const majorAxis = ring.weightCenterAngle + Math.PI / 2;
  const phi = theta - majorAxis;
  const e = ring.ellipticity;
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);
  const ellipse = e / Math.sqrt(e * e * cosP * cosP + sinP * sinP);
  let mod = 1;
  for (let i = 0; i < ring.harmonics.length; i += 1) {
    const h = ring.harmonics[i];
    mod += h.amp * Math.sin(h.k * theta + h.phase);
  }
  return ring.radius * ellipse * mod;
}

/** rad → deg 정규화 (0~359, 정수) */
function toDeg(rad) {
  const d = ((rad % TWO_PI) + TWO_PI) % TWO_PI;
  return Math.round((d * 180) / Math.PI) % 360;
}

/**
 * 모델 → 특징점(vertex) px 좌표 배열. 링 둘레 기본 샘플 + 클러스터(질량)
 * 주변 조밀 샘플 (analysis.png: 무거운 로브에 점이 몰림). 결정론.
 *
 * @param {object} model - LogogramModel
 * @param {object} ctx - { cx, cy, s }
 * @returns {{x:number,y:number}[]} vertex px 좌표
 */
function buildVertices(model, ctx) {
  const { ring, meta } = model;
  const verts = [];
  const push = (rR, ang) => {
    const p = polarPt(ctx, rR, ang);
    verts.push({ x: p.x, y: p.y });
  };

  // 링 둘레 기본 샘플 (개구부 제외)
  const BASE = 30;
  for (let i = 0; i < BASE; i += 1) {
    const a = (i / BASE) * TWO_PI;
    if (ring.gap && ring.gap.isOpen && angDist(a, ring.gap.angle) < ring.gap.width / 2) {
      // ring.gap는 호환 필드에 없을 수 있으므로 model.gap도 확인
    }
    if (model.gap && angDist(a, model.gap.ang) < model.gap.half) {
      continue;
    }
    push(ringRadiusAt(ring, a), a);
  }

  // 클러스터 주변 조밀화 — intensity 비례 점 개수, 약간 바깥(클러스터는 링 밖)
  (model.clusters || []).forEach((c, ci) => {
    const n = 5 + Math.round((c.I || 0.7) * 8);
    const baseR = ringRadiusAt(ring, c.ang);
    for (let k = 0; k < n; k += 1) {
      const u = hashUnit(meta.hash, ci * 37 + k + 1);
      const v = hashUnit(meta.hash, ci * 37 + k + 500);
      const da = (u - 0.5) * 0.95; // 각 산포
      const dr = (v - 0.5) * 0.42 + 0.13; // 반경: 살짝 바깥
      push(baseR + dr, c.ang + da);
    }
  });

  return verts;
}

/** 삼각형이 무방향 엣지 (u,v)를 가지는가 */
function triHasEdge(t, u, v) {
  return (
    (t[0] === u && t[1] === v) || (t[1] === u && t[0] === v)
    || (t[1] === u && t[2] === v) || (t[2] === u && t[1] === v)
    || (t[2] === u && t[0] === v) || (t[0] === u && t[2] === v)
  );
}

/**
 * Bowyer–Watson Delaunay 삼각분할 (의존성 0). 점이 적어(<150) 단순 구현으로 충분.
 *
 * @param {{x:number,y:number}[]} pts - 점 배열
 * @returns {number[][]} 삼각형 (점 인덱스 3개) 배열
 */
function triangulate(pts) {
  const n = pts.length;
  if (n < 3) {
    return [];
  }
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (let i = 0; i < n; i += 1) {
    minX = Math.min(minX, pts[i].x);
    minY = Math.min(minY, pts[i].y);
    maxX = Math.max(maxX, pts[i].x);
    maxY = Math.max(maxY, pts[i].y);
  }
  const dmax = Math.max(maxX - minX, maxY - minY) || 1;
  const midx = (minX + maxX) / 2;
  const midy = (minY + maxY) / 2;
  // 슈퍼 삼각형 (모든 점을 포함)
  const v = pts.concat([
    { x: midx - 20 * dmax, y: midy - dmax },
    { x: midx, y: midy + 20 * dmax },
    { x: midx + 20 * dmax, y: midy - dmax },
  ]);
  let tris = [[n, n + 1, n + 2]];

  /** (px,py)가 삼각형 a,b,c의 외접원 내부인가 */
  const inCircum = (a, b, c, px, py) => {
    const ax = v[a].x - px; const ay = v[a].y - py;
    const bx = v[b].x - px; const by = v[b].y - py;
    const cx = v[c].x - px; const cy = v[c].y - py;
    const det = (ax * ax + ay * ay) * (bx * cy - cx * by)
      - (bx * bx + by * by) * (ax * cy - cx * ay)
      + (cx * cx + cy * cy) * (ax * by - bx * ay);
    const orient = (v[b].x - v[a].x) * (v[c].y - v[a].y) - (v[c].x - v[a].x) * (v[b].y - v[a].y);
    return orient > 0 ? det > 0 : det < 0;
  };

  for (let i = 0; i < n; i += 1) {
    const px = v[i].x; const py = v[i].y;
    const bad = tris.filter((t) => inCircum(t[0], t[1], t[2], px, py));
    // 다각형 경계 엣지 (한 삼각형에만 속한 엣지)
    const boundary = [];
    for (let bi = 0; bi < bad.length; bi += 1) {
      const t = bad[bi];
      const es = [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]];
      for (let ei = 0; ei < 3; ei += 1) {
        const [u, w] = es[ei];
        let shared = false;
        for (let bj = 0; bj < bad.length; bj += 1) {
          if (bad[bj] !== t && triHasEdge(bad[bj], u, w)) {
            shared = true;
            break;
          }
        }
        if (!shared) {
          boundary.push([u, w]);
        }
      }
    }
    tris = tris.filter((t) => !bad.includes(t));
    for (let ei = 0; ei < boundary.length; ei += 1) {
      tris.push([boundary[ei][0], boundary[ei][1], i]);
    }
  }
  // 슈퍼 삼각형 정점을 포함한 삼각형 제거
  return tris.filter((t) => t[0] < n && t[1] < n && t[2] < n);
}

/** 삼각형 목록 → 유니크 무방향 엣지 [i,j] */
function uniqueEdges(tris) {
  const seen = new Set();
  const edges = [];
  const add = (a, b) => {
    const k = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (!seen.has(k)) {
      seen.add(k);
      edges.push([a, b]);
    }
  };
  for (let i = 0; i < tris.length; i += 1) {
    add(tris[i][0], tris[i][1]);
    add(tris[i][1], tris[i][2]);
    add(tris[i][2], tris[i][0]);
  }
  return edges;
}

/**
 * AnalysisOverlay 컴포넌트 — 울프럼 포렌식 화면 (특징점·삼각망·12격자·계측).
 *
 * Props:
 * @param {object} model - LogogramModel (encode → buildModel 산출물) [Required]
 * @param {number} size - SVG 정방형 한 변 (px) — 렌더러와 동일 값 [Optional, 기본값: 480]
 * @param {boolean} isVisible - 표시 여부. true 전환 시 라이브 스캔 재생 [Optional, 기본값: true]
 *
 * Example usage:
 * <Box sx={{ position: 'relative', display: 'inline-flex' }}>
 *   <LogogramRendererCanvas model={model} size={480} />
 *   <AnalysisOverlay model={model} size={480} isVisible={showAnalysis} />
 * </Box>
 */
function AnalysisOverlay({
  model, size = 480, isVisible = true, showMesh = true, showFrame = true, onScan,
}) {
  const theme = useTheme();
  const ink = theme.palette.custom?.chamber?.ink || '#1c2226';
  const monoFont = theme.typography.custom?.mono?.fontFamily
    || "'JetBrains Mono', 'IBM Plex Mono', monospace";

  const geometry = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const ctx = { cx, cy, s: (size / 2) / VIEW_EXTENT };

    // 12세그먼트 방사 분할선 (심어둔 격자)
    const segmentLines = [];
    for (let i = 0; i < 12; i += 1) {
      const theta = (i * Math.PI) / 6 + (3 * Math.PI) / 2 - Math.PI / 12;
      const outer = polarPt(ctx, MEASURE_RING_R, theta);
      segmentLines.push({ x2: fmt(outer.x), y2: fmt(outer.y) });
    }

    // 외곽 측정 링 눈금
    const ticks = [];
    for (let deg = 0; deg < 360; deg += 5) {
      const theta = (deg * Math.PI) / 180;
      const isMajor = deg % 30 === 0;
      const tickLen = isMajor ? 0.07 : 0.035;
      const inner = polarPt(ctx, MEASURE_RING_R - tickLen, theta);
      const outer = polarPt(ctx, MEASURE_RING_R, theta);
      ticks.push({
        x1: fmt(inner.x), y1: fmt(inner.y), x2: fmt(outer.x), y2: fmt(outer.y), isMajor,
      });
    }

    // 무게중심 인디케이터
    const wcAngle = model.ring.weightCenterAngle;
    const wcInner = polarPt(ctx, MEASURE_RING_R - 0.12, wcAngle);
    const wcOuter = polarPt(ctx, MEASURE_RING_R + 0.06, wcAngle);
    const wcLabel = polarPt(ctx, MEASURE_RING_R + 0.18, wcAngle);

    // 특징점 + Delaunay 삼각망
    const verts = buildVertices(model, ctx);
    const tris = triangulate(verts);
    const edges = uniqueEdges(tris);

    return {
      cx,
      cy,
      measureRingPx: fmt(MEASURE_RING_R * ctx.s),
      segmentLines,
      ticks,
      weightCenter: {
        x1: fmt(wcInner.x),
        y1: fmt(wcInner.y),
        x2: fmt(wcOuter.x),
        y2: fmt(wcOuter.y),
        labelX: fmt(wcLabel.x),
        labelY: fmt(wcLabel.y),
        anchor: Math.cos(wcAngle) >= 0 ? 'start' : 'end',
        deg: toDeg(wcAngle),
      },
      verts,
      edges,
    };
  }, [model, size]);

  const labelPx = Math.max(7, size * 0.018);

  /**
   * 스캔 동기 콜백 — isVisible이 true로 켜질 때(라이브 스캔 시작) vertex 등장
   * 타이밍 정보를 상위로 전달해 비프음을 동기화한다. reduced-motion이면 생략.
   */
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => {
    if (!isVisible || !showMesh) {
      return;
    }
    const reduced = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      return;
    }
    // edge(초록선) 등장 타이밍과 동기: animationDelay = 0.35s + i·0.004s
    onScanRef.current?.({ count: geometry.edges.length, interval: 4, startDelay: 350 });
  }, [isVisible, showMesh, geometry]);

  return (
    <Box
      component="span"
      aria-hidden={ !isVisible }
      sx={ {
        position: 'absolute',
        inset: 0,
        display: 'inline-flex',
        lineHeight: 0,
        pointerEvents: 'none',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.985)',
        transformOrigin: 'center',
        transition: theme.transitions.create(['opacity', 'transform'], {
          duration: 600,
          easing: theme.transitions.easing.easeOut,
        }),
        // 라이브 스캔 — vertex 톡톡 등장, edge 그어짐 (결정론 delay는 인라인)
        '@keyframes hbVtxPop': {
          from: { opacity: 0, transform: 'scale(0)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        '@keyframes hbEdgeDraw': {
          from: { strokeDashoffset: 1, opacity: 0 },
          to: { strokeDashoffset: 0, opacity: 1 },
        },
        '& .hb-vtx': {
          transformBox: 'fill-box',
          transformOrigin: 'center',
          animation: 'hbVtxPop 380ms cubic-bezier(0.2,0.8,0.2,1) both',
        },
        '& .hb-edge': {
          animation: 'hbEdgeDraw 460ms ease-out both',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '& .hb-vtx, & .hb-edge': { animation: 'none' },
        },
      } }
    >
      <svg
        width={ size }
        height={ size }
        viewBox={ `0 0 ${size} ${size}` }
        role="img"
        aria-label={ `Heptapod B analysis overlay: ${model.meta.name}` }
      >
        {/* 좌표계 스캐폴드 (12세그먼트 격자 + 측정 링 + 각도 눈금) — showFrame일 때만 */}
        { showFrame && (
          <>
            <g stroke={ ink } strokeWidth={ 0.6 } strokeDasharray="1 6" opacity={ 0.22 }>
              { geometry.segmentLines.map((line, i) => (
                <line key={ `seg-${i}` } x1={ geometry.cx } y1={ geometry.cy } x2={ line.x2 } y2={ line.y2 } />
              )) }
            </g>
            <circle
              cx={ geometry.cx }
              cy={ geometry.cy }
              r={ geometry.measureRingPx }
              fill="none"
              stroke={ ink }
              strokeWidth={ 0.6 }
              opacity={ 0.2 }
            />
            <g stroke={ ink }>
              { geometry.ticks.map((tick, i) => (
                <line
                  key={ `tick-${i}` }
                  x1={ tick.x1 }
                  y1={ tick.y1 }
                  x2={ tick.x2 }
                  y2={ tick.y2 }
                  strokeWidth={ tick.isMajor ? 0.9 : 0.55 }
                  opacity={ tick.isMajor ? 0.28 : 0.14 }
                />
              )) }
            </g>
          </>
        ) }

        {/* 구조 삼각망 (초록 mesh) — 라이브 스캔으로 그어진다 (showMesh일 때만) */}
        <g stroke={ MEAS_GREEN } strokeWidth={ 0.7 } fill="none">
          { showMesh && isVisible && geometry.edges.map((e, i) => {
            const a = geometry.verts[e[0]];
            const b = geometry.verts[e[1]];
            return (
              <line
                key={ `edge-${i}` }
                className="hb-edge"
                x1={ fmt(a.x) }
                y1={ fmt(a.y) }
                x2={ fmt(b.x) }
                y2={ fmt(b.y) }
                pathLength={ 1 }
                strokeDasharray={ 1 }
                opacity={ 0.5 }
                style={ { animationDelay: `${0.35 + i * 0.004}s` } }
              />
            );
          }) }
        </g>

        {/* 특징점 (빨강 vertex) — 순차 검출 (showMesh일 때만) */}
        <g fill={ MEAS_RED }>
          { showMesh && isVisible && geometry.verts.map((p, i) => (
            <circle
              key={ `vtx-${i}` }
              className="hb-vtx"
              cx={ fmt(p.x) }
              cy={ fmt(p.y) }
              r={ 1.8 }
              style={ { animationDelay: `${i * 0.022}s` } }
            />
          )) }
        </g>

        {/* 무게중심 인디케이터 (좌표계) — showFrame일 때만 */}
        { showFrame && (
          <>
            <line
              x1={ geometry.weightCenter.x1 }
              y1={ geometry.weightCenter.y1 }
              x2={ geometry.weightCenter.x2 }
              y2={ geometry.weightCenter.y2 }
              stroke={ ink }
              strokeWidth={ 1.1 }
              opacity={ 0.45 }
            />
            <text
              x={ geometry.weightCenter.labelX }
              y={ geometry.weightCenter.labelY }
              fill={ ink }
              fillOpacity={ 0.55 }
              textAnchor={ geometry.weightCenter.anchor }
              dominantBaseline="middle"
              style={ { fontFamily: monoFont, fontSize: labelPx, letterSpacing: '0.05em' } }
            >
              { `WC ${geometry.weightCenter.deg}°` }
            </text>
          </>
        ) }

        {/* 계측 readout (좌하단) — 라이브 장비 출력 (showMesh일 때만) */}
        { showMesh && (
          <text
            x={ size * 0.04 }
            y={ size * 0.95 }
            fill={ MEAS_GREEN }
            fillOpacity={ 0.85 }
            style={ { fontFamily: monoFont, fontSize: labelPx, letterSpacing: '0.08em' } }
          >
            { `VERTICES ${geometry.verts.length}  ·  EDGES ${geometry.edges.length}  ·  SEG 12` }
          </text>
        ) }

        {/* 세계관 캡션 (좌하단 하단) */}
        <text
          x={ size * 0.04 }
          y={ size * 0.985 }
          fill={ ink }
          fillOpacity={ 0.4 }
          style={ { fontFamily: monoFont, fontSize: Math.max(6, size * 0.0145), letterSpacing: '0.12em' } }
        >
          STRUCTURAL DECOMPOSITION — 12 SEGMENTS (DESIGNED, NOT DISCOVERED)
        </text>
      </svg>
    </Box>
  );
}

export default AnalysisOverlay;
