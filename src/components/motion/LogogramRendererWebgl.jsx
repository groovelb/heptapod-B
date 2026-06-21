import { useEffect, useMemo, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

/**
 * Heptapod B 로고그램 WebGL 유체 렌더러 (3단계 최종 렌더러)
 *
 * LogogramModel(src/utils/heptapod/MODEL.md)을 밀도 소스로 GPU 유체
 * 시뮬레이션(Stam Stable Fluids 계열)에 주입한다. 잉크가 형태를 띤 채
 * 가장자리만 숨쉬는 평형 상태가 목표 — 유체가 형태를 뭉개면 실패다.
 *
 * 파이프라인 (매 프레임):
 * 1. velocity advection (semi-Lagrangian) + 감쇠
 * 2. curl noise 미세 난류 외력 (해시 유도 — 큰 흐름 금지)
 * 3. divergence → pressure Jacobi 반복 → gradient subtract (비압축 투영)
 * 4. density advection + dissipation
 * 5. 소스 앵커 주입: d = max(d_advected, source × anchor) — 형태 유지 전략.
 *    anchor는 형성 단계(1600ms) 동안 0→1 램프, 이후 0.85 유지.
 *    advection이 가장자리 잉크를 밖으로 끌고 dissipation이 천천히 지우므로
 *    "코어는 고정, 가장자리만 살아있는" 평형이 만들어진다.
 * 6. 밀도 → 잉크색 매핑 (T1 3층 농담을 밀도 구간 알파 커브로 근사)
 *
 * 형태 샘플링은 LogogramRendererSvg와 동일 수식·동일 해시 솔트 — 동일 모델은
 * 세 렌더러에서 동일 형태를 만든다 (질감·모션만 다름).
 * 결정론: Math.random 미사용. 모든 변이는 model 값 또는 hash 유도값에서만.
 */

const TWO_PI = Math.PI * 2;
/** viewBox 반경 (R 단위) — SVG 렌더러와 동일 */
const VIEW_EXTENT = 1.7;
const RING_SAMPLES = 220;
const BRANCH_SAMPLES = 26;
const LOOP_SAMPLES = 64;
/** 형성(소스 점진 주입) 시간 (ms) — visual-direction §5 페이싱 */
const FORMATION_MS = 1600;
/** 형성 완료 후 형태 앵커 강도 — 1보다 낮춰 가장자리 호흡 여지를 남긴다 */
const SETTLED_ANCHOR = 0.85;
/** pressure Jacobi 반복 횟수 */
const JACOBI_ITERATIONS = 24;

/** [min, max] 클램프 */
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/* == HEPTAPOD-SHAPE-SAMPLING-BEGIN ==
 * (node 분리 검증용 마커 — 이 블록은 DOM/WebGL 의존성이 없는 순수 수식)
 */

/**
 * 해시에서 결정론적 [0, 1) 값 파생 — SVG/Canvas 렌더러와 동일 믹싱.
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

/**
 * 링 중심선 반지름 r(θ) — SVG 렌더러와 동일 (타원 보정 × 하모닉 변조).
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
 * 링 폭(θ) — SVG 렌더러와 동일 (가우시안 응집 + 해시 지터, 솔트 31/47).
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

/** 가지 4유형별 각도 스윕 — SVG 렌더러와 동일 */
const BRANCH_SWEEPS = {
  wisp: (curl, t) => curl * (1.15 * t * t) + curl * 0.2 * Math.sin(Math.PI * t),
  hook: (curl, t) => curl * (0.3 * t + 1.9 * t * t * t),
  blob: (curl, t) => curl * 0.35 * t * t,
  spike: (curl, t) => curl * 0.15 * t,
};

/** 가지 4유형별 폭 프로파일 — SVG 렌더러와 동일 */
const BRANCH_WIDTHS = {
  wisp: (bw, t) => Math.max(0.004, bw * 0.7 * Math.pow(1 - t, 1.4)),
  hook: (bw, t) => Math.max(0.005, bw * 0.95 * (1 - 0.7 * t)),
  blob: (bw, t) => bw * (1.3 - 0.4 * t),
  spike: (bw, t) => Math.max(0.002, bw * 1.45 * Math.pow(1 - t, 2.2)),
};

/** 유형별 컬 하한 — SVG 렌더러와 동일 */
const CURL_FLOOR = { wisp: 0.25, hook: 0.5, blob: 0, spike: 0 };

/**
 * 중심선 한 점을 밀도 소스 점으로 누적.
 * 점 반경은 리본 폭의 절반 + 소프트 마진, 강도는 폭에 비례 (잉크 질량 근사).
 *
 * @param {number[]} pts - [x, y, radius, intensity, ...] 플랫 누적 배열 (R 단위)
 * @param {number} x - 중심 x (R)
 * @param {number} y - 중심 y (R)
 * @param {number} width - 리본 폭 (R)
 * @param {number} gain - 강도 배율
 */
function pushSourcePoint(pts, x, y, width, gain) {
  const radius = Math.max(0.012, width * 0.72);
  const intensity = gain * clamp(width / 0.05, 0.18, 4.5);
  pts.push(x, y, radius, intensity);
}

/**
 * LogogramModel → 밀도 소스 점 집합 (순수 함수 — 결정론).
 * SVG 렌더러의 buildLogogramGeometry와 같은 순회 구조·솔트를 쓰되,
 * 폴리곤 대신 [x, y, radius, intensity] 점으로 잉크 질량을 표현한다.
 *
 * @param {object} model - LogogramModel
 * @returns {Float32Array} [x, y, radius, intensity] × N (R 단위, 중심 원점)
 */
function buildDensitySources(model) {
  const { ring, meta } = model;
  const hash = meta.hash;
  const pts = [];

  // 링 멀티 스트랜드 (F1/F2/F3/F7)
  const { count, separation, phaseOffsets } = ring.strands;
  for (let sIdx = 0; sIdx < count; sIdx += 1) {
    const radialOffset = count === 1 ? 0 : (sIdx - (count - 1) / 2) * separation;
    const phase = phaseOffsets[sIdx] || 0;
    const strandMul = sIdx === 0 ? 1 : 0.3 + 0.25 * hashUnit(hash, 60 + sIdx);
    if (ring.gap.isOpen) {
      const startAngle = ring.gap.angle + ring.gap.width / 2;
      const span = TWO_PI - ring.gap.width;
      for (let i = 0; i <= RING_SAMPLES; i += 1) {
        const t = i / RING_SAMPLES;
        const theta = startAngle + span * t;
        const edge = Math.min(1, Math.min(t, 1 - t) / 0.08);
        const taper = Math.max(edge * edge * (3 - 2 * edge), 0.1);
        const r = ringRadiusAt(ring, theta, phase, radialOffset);
        const w = ringWidthAt(ring, theta, hash, sIdx) * strandMul * taper;
        pushSourcePoint(pts, Math.cos(theta) * r, Math.sin(theta) * r, w, 1);
      }
    } else {
      for (let i = 0; i < RING_SAMPLES; i += 1) {
        const theta = (i / RING_SAMPLES) * TWO_PI;
        const r = ringRadiusAt(ring, theta, phase, radialOffset);
        const w = ringWidthAt(ring, theta, hash, sIdx) * strandMul;
        pushSourcePoint(pts, Math.cos(theta) * r, Math.sin(theta) * r, w, 1);
      }
    }
  }

  // 가지 (F5/F6/F8)
  for (let bIdx = 0; bIdx < model.branches.length; bIdx += 1) {
    const branch = model.branches[bIdx];
    if (branch.isEscapeLoop) {
      const r0 = ringRadiusAt(ring, branch.angle);
      const loopR = branch.escapeLoopLength / 2;
      const ccx = Math.cos(branch.angle) * (r0 + loopR);
      const ccy = Math.sin(branch.angle) * (r0 + loopR);
      const psi0 = branch.angle + Math.PI;
      const bw = ring.strokeWidth.base * branch.widthMul * 0.55;
      for (let i = 0; i < LOOP_SAMPLES; i += 1) {
        const u = i / LOOP_SAMPLES;
        const psi = psi0 + u * TWO_PI;
        const rho = loopR * (1 + 0.18 * Math.sin(2 * psi + branch.curl * 4));
        const taper = Math.pow(Math.sin(Math.PI * u), 0.6);
        const w = Math.max(0.003, bw * (0.25 + 0.85 * taper));
        pushSourcePoint(pts, ccx + Math.cos(psi) * rho, ccy + Math.sin(psi) * rho, w, 0.9);
      }
      continue;
    }
    const dirSign = branch.direction === 'in' ? -1 : 1;
    const r0 = ringRadiusAt(ring, branch.angle) - dirSign * 0.02;
    const bw = ring.strokeWidth.base * branch.widthMul;
    const length = branch.type === 'wisp' ? branch.length * 1.1 : branch.length;
    const floor = CURL_FLOOR[branch.type];
    const curl = (branch.curl < 0 ? -1 : 1) * Math.max(Math.abs(branch.curl), floor);
    const sweep = BRANCH_SWEEPS[branch.type];
    const widthProfile = BRANCH_WIDTHS[branch.type];
    let tipX = 0;
    let tipY = 0;
    let prevX = 0;
    let prevY = 0;
    for (let i = 0; i <= BRANCH_SAMPLES; i += 1) {
      const t = i / BRANCH_SAMPLES;
      const rad = Math.max(0.02, r0 + dirSign * length * t);
      const a = branch.angle + sweep(curl, t);
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      pushSourcePoint(pts, x, y, widthProfile(bw, t), 1);
      prevX = tipX;
      prevY = tipY;
      tipX = x;
      tipY = y;
    }
    // wisp 붓끝 갈라짐 — 보조 필라멘트 (솔트 130 동일)
    if (branch.type === 'wisp') {
      const splitCurl = curl * (1.5 + 0.6 * hashUnit(hash, 130 + branch.index));
      for (let i = 0; i <= BRANCH_SAMPLES; i += 1) {
        const t = i / BRANCH_SAMPLES;
        const rad = Math.max(0.02, r0 + dirSign * length * 0.8 * t);
        const a = branch.angle + splitCurl * (1.3 * t * t);
        const w = Math.max(0.003, bw * 0.32 * Math.pow(1 - t, 1.2));
        pushSourcePoint(pts, Math.cos(a) * rad, Math.sin(a) * rad, w, 0.8);
      }
    }
    // F6 말단 잉크 고임 — 접선 방향으로 밀어낸 방울
    if (branch.droplet) {
      const dx = tipX - prevX;
      const dy = tipY - prevY;
      const dLen = Math.hypot(dx, dy) || 1;
      const dropR = branch.droplet.diameter / 2;
      const cx2 = tipX + (dx / dLen) * dropR * 0.6;
      const cy2 = tipY + (dy / dLen) * dropR * 0.6;
      pushSourcePoint(pts, cx2, cy2, branch.droplet.diameter, 1.6);
    }
  }

  // F6/T3 위성 비산점
  for (let i = 0; i < model.splatter.length; i += 1) {
    const p = model.splatter[i];
    pushSourcePoint(
      pts,
      Math.cos(p.angle) * p.distance,
      Math.sin(p.angle) * p.distance,
      p.diameter,
      1.2,
    );
  }

  // 의문형 갈고리 — 본체와 무관한 부가 형상
  if (model.questionHook) {
    const hook = model.questionHook;
    const r0 = ringRadiusAt(ring, hook.angle) + 0.05;
    const bw = ring.strokeWidth.base * hook.widthMul;
    let hx = 0;
    let hy = 0;
    for (let i = 0; i <= BRANCH_SAMPLES; i += 1) {
      const t = i / BRANCH_SAMPLES;
      const rad = Math.max(0.02, r0 + hook.length * t);
      const a = hook.angle + hook.curl * (0.25 * t + 2.3 * t * t * t);
      hx = Math.cos(a) * rad;
      hy = Math.sin(a) * rad;
      pushSourcePoint(pts, hx, hy, Math.max(0.006, bw * (0.95 - 0.6 * t)), 1);
    }
    pushSourcePoint(pts, hx, hy, 0.045, 1.4);
  }

  return new Float32Array(pts);
}

/* == HEPTAPOD-SHAPE-SAMPLING-END == */

/* ── GLSL (ES 3.00) ───────────────────────────────────────────────── */

const QUAD_VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

/** 소스 점 → 가우시안 잉크 질량 (소스 텍스처에 1회 가산 합성) */
const SPLAT_VS = `#version 300 es
in vec4 a_point; // x, y (R 단위), radius (R), intensity
uniform float u_extent;
uniform float u_simSize;
out float v_intensity;
void main() {
  v_intensity = a_point.w;
  vec2 clip = a_point.xy / u_extent;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = max(2.0, (a_point.z / u_extent) * u_simSize * 2.6);
}`;

const SPLAT_FS = `#version 300 es
precision highp float;
in float v_intensity;
out vec4 outColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d2 = dot(p, p);
  float g = exp(-5.0 * d2);
  outColor = vec4(v_intensity * g * 0.16, 0.0, 0.0, 1.0);
}`;

/** semi-Lagrangian advection (velocity·density 공용) */
const ADVECT_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_field;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
uniform float u_dt;
uniform float u_dissipation;
out vec4 outColor;
void main() {
  vec2 vel = texture(u_velocity, v_uv).xy;
  vec2 back = v_uv - u_dt * vel * u_texel;
  outColor = u_dissipation * texture(u_field, back);
}`;

/** curl noise 미세 난류 외력 — 해시 유도 오프셋, 큰 흐름 금지 (형태 유지) */
const FORCE_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform float u_time;
uniform float u_amp;
uniform vec2 u_noiseOffset;
uniform float u_damp;
out vec4 outColor;

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x),
    mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
    u.y);
}
void main() {
  vec2 vel = texture(u_velocity, v_uv).xy;
  vec2 p = v_uv * 9.0 + u_noiseOffset + vec2(u_time * 0.05, -u_time * 0.04);
  float e = 0.55;
  // 포텐셜 노이즈의 회전 그래디언트 = 발산 없는 컬 장
  float n1 = vnoise(p + vec2(0.0, e)) - vnoise(p - vec2(0.0, e));
  float n2 = vnoise(p + vec2(e, 0.0)) - vnoise(p - vec2(e, 0.0));
  vec2 curl = vec2(n1, -n2);
  outColor = vec4((vel + curl * u_amp) * u_damp, 0.0, 1.0);
}`;

const DIVERGENCE_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
out vec4 outColor;
void main() {
  float l = texture(u_velocity, v_uv - vec2(u_texel.x, 0.0)).x;
  float r = texture(u_velocity, v_uv + vec2(u_texel.x, 0.0)).x;
  float b = texture(u_velocity, v_uv - vec2(0.0, u_texel.y)).y;
  float t = texture(u_velocity, v_uv + vec2(0.0, u_texel.y)).y;
  outColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}`;

const PRESSURE_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_pressure;
uniform sampler2D u_divergence;
uniform vec2 u_texel;
out vec4 outColor;
void main() {
  float l = texture(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x;
  float r = texture(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x;
  float b = texture(u_pressure, v_uv - vec2(0.0, u_texel.y)).x;
  float t = texture(u_pressure, v_uv + vec2(0.0, u_texel.y)).x;
  float div = texture(u_divergence, v_uv).x;
  outColor = vec4((l + r + b + t - div) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform sampler2D u_pressure;
uniform vec2 u_texel;
out vec4 outColor;
void main() {
  float l = texture(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x;
  float r = texture(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x;
  float b = texture(u_pressure, v_uv - vec2(0.0, u_texel.y)).x;
  float t = texture(u_pressure, v_uv + vec2(0.0, u_texel.y)).x;
  vec2 vel = texture(u_velocity, v_uv).xy;
  outColor = vec4(vel - 0.5 * vec2(r - l, t - b), 0.0, 1.0);
}`;

/** 밀도 갱신 — 형태 앵커: d = max(이류된 밀도, source × anchor) */
const INJECT_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_density;
uniform sampler2D u_source;
uniform float u_anchor;
out vec4 outColor;
void main() {
  float d = texture(u_density, v_uv).x;
  float s = texture(u_source, v_uv).x;
  outColor = vec4(max(d, s * u_anchor), 0.0, 0.0, 1.0);
}`;

/** 밀도 → 잉크색 (T1 3층 농담을 알파 커브로 근사, 프리멀티플라이드) */
const RENDER_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_density;
uniform vec3 u_ink;
out vec4 outColor;
void main() {
  float d = texture(u_density, v_uv).x;
  float halo = 0.15 * smoothstep(0.015, 0.12, d);
  float mid = 0.50 * smoothstep(0.12, 0.42, d);
  float core = 0.95 * smoothstep(0.42, 1.05, d);
  float a = clamp(max(halo, max(mid, core)), 0.0, 0.95);
  outColor = vec4(u_ink * a, a);
}`;

/* ── WebGL 헬퍼 ───────────────────────────────────────────────────── */

/**
 * 셰이더 컴파일 + 프로그램 링크.
 *
 * @param {WebGL2RenderingContext} gl - GL 컨텍스트
 * @param {string} vsSrc - vertex shader 소스
 * @param {string} fsSrc - fragment shader 소스
 * @returns {WebGLProgram} 링크된 프로그램
 */
function createProgram(gl, vsSrc, fsSrc) {
  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`Shader compile failed: ${log}`);
    }
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`Program link failed: ${log}`);
  }
  return prog;
}

/**
 * RGBA16F 렌더 타깃(텍스처 + FBO) 생성.
 *
 * @param {WebGL2RenderingContext} gl - GL 컨텍스트
 * @param {number} w - 너비 (px)
 * @param {number} h - 높이 (px)
 * @returns {{ tex: WebGLTexture, fbo: WebGLFramebuffer }} 타깃
 */
function createTarget(gl, w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fbo };
}

/** ping-pong read/write 교환 */
function swapPingPong(pp) {
  const tmp = pp.read;
  pp.read = pp.write;
  pp.write = tmp;
}

/** hex 색 → [r, g, b] (0~1) */
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = parseInt(m ? m[1] : '1c2226', 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * LogogramRendererWebgl 컴포넌트
 *
 * Heptapod B 로고그램을 GPU 유체 시뮬레이션으로 렌더링한다. 형성 단계에서
 * 잉크가 난류 속에 응집하고, 이후 형태를 띤 채 가장자리만 미세하게 숨쉰다.
 * WebGL2 + EXT_color_buffer_float 필요 — 불가하면 onContextLost를 호출해
 * 상위에서 Canvas 렌더러로 폴백할 수 있게 한다.
 *
 * Props:
 * @param {object} model - LogogramModel (encode → buildModel 산출물, MODEL.md 스키마) [Required]
 * @param {number} size - 정방형 한 변 (px) [Optional, 기본값: 480]
 * @param {string} inkColor - 잉크 색 [Optional, 기본값: theme palette.custom.chamber.ink → '#1c2226' 폴백]
 * @param {boolean} isActive - 시뮬레이션 구동 여부 [Optional, 기본값: true]
 * @param {number} simScale - 시뮬레이션 그리드 다운스케일 (0.25~0.5) [Optional, 기본값: 0.5]
 * @param {function} onFormationComplete - 형성(1600ms) 완료 시 호출 [Optional]
 * @param {function} onContextLost - WebGL 사용 불가·컨텍스트 손실 시 호출 [Optional]
 *
 * Example usage:
 * const model = buildModel(encode('Louise'));
 * <LogogramRendererWebgl model={model} size={480} onContextLost={fallbackToCanvas} />
 */
function LogogramRendererWebgl({
  model,
  size = 480,
  inkColor,
  isActive = true,
  simScale = 0.5,
  onFormationComplete,
  onContextLost,
}) {
  const theme = useTheme();
  const canvasRef = useRef(null);
  const formationRef = useRef(onFormationComplete);
  const lostRef = useRef(onContextLost);

  const ink = inkColor || theme.palette.custom?.chamber?.ink || '#1c2226';
  const sources = useMemo(() => buildDensitySources(model), [model]);

  /** 콜백 최신화 — 시뮬레이션 effect 의존성에서 콜백 제외 */
  useEffect(() => {
    formationRef.current = onFormationComplete;
    lostRef.current = onContextLost;
  }, [onFormationComplete, onContextLost]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
      lostRef.current?.();
      return undefined;
    }

    const prefersReduced = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const simSize = clamp(Math.round(size * simScale), 96, 384);
    const texel = [1 / simSize, 1 / simSize];
    const hash = model.meta.hash;

    let raf = 0;
    let disposed = false;
    const resources = { programs: [], targets: [], buffers: [], vaos: [] };

    /** 정리 — 텍스처·FBO·프로그램·버퍼 전부 해제 */
    const dispose = () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resources.targets.forEach(({ tex, fbo }) => {
        gl.deleteTexture(tex);
        gl.deleteFramebuffer(fbo);
      });
      resources.programs.forEach((p) => gl.deleteProgram(p));
      resources.buffers.forEach((b) => gl.deleteBuffer(b));
      resources.vaos.forEach((v) => gl.deleteVertexArray(v));
      const loseExt = gl.getExtension('WEBGL_lose_context');
      loseExt?.loseContext();
    };

    const handleContextLost = (event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      lostRef.current?.();
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    try {
      /* 프로그램 */
      const track = (p) => {
        resources.programs.push(p);
        return p;
      };
      const progSplat = track(createProgram(gl, SPLAT_VS, SPLAT_FS));
      const progAdvect = track(createProgram(gl, QUAD_VS, ADVECT_FS));
      const progForce = track(createProgram(gl, QUAD_VS, FORCE_FS));
      const progDiv = track(createProgram(gl, QUAD_VS, DIVERGENCE_FS));
      const progPressure = track(createProgram(gl, QUAD_VS, PRESSURE_FS));
      const progGradient = track(createProgram(gl, QUAD_VS, GRADIENT_FS));
      const progInject = track(createProgram(gl, QUAD_VS, INJECT_FS));
      const progRender = track(createProgram(gl, QUAD_VS, RENDER_FS));

      /* 풀스크린 삼각형 VAO */
      const quadVao = gl.createVertexArray();
      resources.vaos.push(quadVao);
      gl.bindVertexArray(quadVao);
      const quadBuf = gl.createBuffer();
      resources.buffers.push(quadBuf);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      /* 소스 점 VAO */
      const pointVao = gl.createVertexArray();
      resources.vaos.push(pointVao);
      gl.bindVertexArray(pointVao);
      const pointBuf = gl.createBuffer();
      resources.buffers.push(pointBuf);
      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
      gl.bufferData(gl.ARRAY_BUFFER, sources, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      /* 필드 타깃 */
      const trackT = (t) => {
        resources.targets.push(t);
        return t;
      };
      const sourceTex = trackT(createTarget(gl, simSize, simSize));
      const velocity = { read: trackT(createTarget(gl, simSize, simSize)), write: trackT(createTarget(gl, simSize, simSize)) };
      const density = { read: trackT(createTarget(gl, simSize, simSize)), write: trackT(createTarget(gl, simSize, simSize)) };
      const pressure = { read: trackT(createTarget(gl, simSize, simSize)), write: trackT(createTarget(gl, simSize, simSize)) };
      const divergence = trackT(createTarget(gl, simSize, simSize));

      /* 소스 텍스처 1회 베이크 — 점 가우시안 가산 합성 */
      gl.bindFramebuffer(gl.FRAMEBUFFER, sourceTex.fbo);
      gl.viewport(0, 0, simSize, simSize);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(progSplat);
      gl.uniform1f(gl.getUniformLocation(progSplat, 'u_extent'), VIEW_EXTENT);
      gl.uniform1f(gl.getUniformLocation(progSplat, 'u_simSize'), simSize);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(pointVao);
      gl.drawArrays(gl.POINTS, 0, sources.length / 4);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(quadVao);

      /** 텍스처 바인딩 헬퍼 */
      const bindTex = (prog, name, unit, tex) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(gl.getUniformLocation(prog, name), unit);
      };

      /** 시뮬레이션 1스텝 */
      const step = (dt, time, anchor, turbulenceAmp) => {
        gl.viewport(0, 0, simSize, simSize);

        // 1. velocity advection
        gl.useProgram(progAdvect);
        gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
        bindTex(progAdvect, 'u_field', 0, velocity.read.tex);
        bindTex(progAdvect, 'u_velocity', 1, velocity.read.tex);
        gl.uniform2fv(gl.getUniformLocation(progAdvect, 'u_texel'), texel);
        gl.uniform1f(gl.getUniformLocation(progAdvect, 'u_dt'), dt);
        gl.uniform1f(gl.getUniformLocation(progAdvect, 'u_dissipation'), 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        swapPingPong(velocity);

        // 2. curl noise 외력 + 감쇠
        gl.useProgram(progForce);
        gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
        bindTex(progForce, 'u_velocity', 0, velocity.read.tex);
        gl.uniform1f(gl.getUniformLocation(progForce, 'u_time'), time);
        gl.uniform1f(gl.getUniformLocation(progForce, 'u_amp'), turbulenceAmp * dt);
        gl.uniform2f(
          gl.getUniformLocation(progForce, 'u_noiseOffset'),
          hashUnit(hash, 71) * 100,
          hashUnit(hash, 89) * 100,
        );
        gl.uniform1f(gl.getUniformLocation(progForce, 'u_damp'), 0.985);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        swapPingPong(velocity);

        // 3. 비압축 투영 — divergence → Jacobi → gradient subtract
        gl.useProgram(progDiv);
        gl.bindFramebuffer(gl.FRAMEBUFFER, divergence.fbo);
        bindTex(progDiv, 'u_velocity', 0, velocity.read.tex);
        gl.uniform2fv(gl.getUniformLocation(progDiv, 'u_texel'), texel);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        gl.useProgram(progPressure);
        gl.uniform2fv(gl.getUniformLocation(progPressure, 'u_texel'), texel);
        for (let i = 0; i < JACOBI_ITERATIONS; i += 1) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.write.fbo);
          bindTex(progPressure, 'u_pressure', 0, pressure.read.tex);
          bindTex(progPressure, 'u_divergence', 1, divergence.tex);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          swapPingPong(pressure);
        }

        gl.useProgram(progGradient);
        gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
        bindTex(progGradient, 'u_velocity', 0, velocity.read.tex);
        bindTex(progGradient, 'u_pressure', 1, pressure.read.tex);
        gl.uniform2fv(gl.getUniformLocation(progGradient, 'u_texel'), texel);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        swapPingPong(velocity);

        // 4. density advection (이류 + 천천히 소산)
        gl.useProgram(progAdvect);
        gl.bindFramebuffer(gl.FRAMEBUFFER, density.write.fbo);
        bindTex(progAdvect, 'u_field', 0, density.read.tex);
        bindTex(progAdvect, 'u_velocity', 1, velocity.read.tex);
        gl.uniform2fv(gl.getUniformLocation(progAdvect, 'u_texel'), texel);
        gl.uniform1f(gl.getUniformLocation(progAdvect, 'u_dt'), dt);
        gl.uniform1f(gl.getUniformLocation(progAdvect, 'u_dissipation'), 0.994);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        swapPingPong(density);

        // 5. 형태 앵커 주입
        gl.useProgram(progInject);
        gl.bindFramebuffer(gl.FRAMEBUFFER, density.write.fbo);
        bindTex(progInject, 'u_density', 0, density.read.tex);
        bindTex(progInject, 'u_source', 1, sourceTex.tex);
        gl.uniform1f(gl.getUniformLocation(progInject, 'u_anchor'), anchor);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        swapPingPong(density);
      };

      /** 화면 렌더 */
      const present = () => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(progRender);
        bindTex(progRender, 'u_density', 0, density.read.tex);
        gl.uniform3fv(gl.getUniformLocation(progRender, 'u_ink'), hexToRgb(ink));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      if (prefersReduced || !isActive) {
        // 정적 경로 — 시뮬레이션 없이 소스를 완성 밀도로 1회 주입 후 표시
        gl.useProgram(progInject);
        gl.bindFramebuffer(gl.FRAMEBUFFER, density.write.fbo);
        gl.viewport(0, 0, simSize, simSize);
        bindTex(progInject, 'u_density', 0, density.read.tex);
        bindTex(progInject, 'u_source', 1, sourceTex.tex);
        gl.uniform1f(gl.getUniformLocation(progInject, 'u_anchor'), 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        swapPingPong(density);
        present();
        formationRef.current?.();
      } else {
        let start = 0;
        let prev = 0;
        let formationDone = false;
        const tick = (now) => {
          if (disposed) {
            return;
          }
          if (!start) {
            start = now;
            prev = now;
          }
          const elapsed = now - start;
          const dt = Math.min(33, now - prev) / 1000;
          prev = now;
          const f = Math.min(1, elapsed / FORMATION_MS);
          const eased = 1 - Math.pow(1 - f, 3);
          // 형성 중에는 난류를 키워 응집의 동세를, 이후엔 미세 호흡만
          const anchor = eased * (SETTLED_ANCHOR + (1 - SETTLED_ANCHOR) * (1 - f));
          const turbulenceAmp = 26 * (1 - eased) + 5;
          step(dt, now / 1000, Math.max(anchor, eased * 0.2), turbulenceAmp);
          present();
          if (!formationDone && f >= 1) {
            formationDone = true;
            formationRef.current?.();
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    } catch {
      // 셰이더 컴파일·링크 실패 등 — 상위 폴백 경로로
      dispose();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      lostRef.current?.();
      return undefined;
    }

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      dispose();
    };
  }, [model, size, ink, isActive, simScale, sources]);

  return (
    <Box component="span" sx={ { display: 'inline-flex', lineHeight: 0 } }>
      <canvas
        ref={ canvasRef }
        role="img"
        aria-label={ `Heptapod B logogram (fluid): ${model.meta.name}` }
        style={ { width: size, height: size } }
      />
    </Box>
  );
}

export default LogogramRendererWebgl;
