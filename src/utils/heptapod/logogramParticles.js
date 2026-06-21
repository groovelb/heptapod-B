/**
 * Heptapod B Encoder — Stage 3a: LogogramModel → 잉크 입자 (Canvas 전개)
 *
 * buildModel(v2 클러스터 모델)의 형태 필드를 잉크 입자로 전개한다.
 * 링(얇은 멀티 스트랜드 헤어라인 + 갈필 + 젖은 먹 고임) + 클러스터 버스트
 * (코어/방사·접선 가시/비산점/분리 방울) + 의문형 갈고리.
 *
 * 좌표는 720-space(R0=216, 중심 360,360) — 렌더러가 표시 크기로 스케일한다.
 * 결정론: model.meta.hash에서 파생한 sfc32 스트림만 사용 (Math.random 금지).
 * 본체 입자가 먼저, 갈고리 입자가 마지막에 생성되므로 갈고리 토글은 본체
 * 입자에 영향을 주지 않는다.
 */

/** 720-space 좌표계 — 렌더러 size로 스케일 (s = size / SIZE0) */
export const SIZE0 = 720;
const CX0 = SIZE0 / 2;
const CY0 = SIZE0 / 2;
/** 기준 링 반지름 (px) — VIEW_EXTENT 1.7 프레이밍과 ≈일치 (216/720 ≈ 1/1.7×0.5) */
const R0 = SIZE0 * 0.3;
/** 붓질 스윕 시간 (ms) */
const SWEEP_MS = 640;

const TWO_PI = Math.PI * 2;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * model.meta.hash → sfc32 [0,1) PRNG (입자 전용 스트림). 결정론.
 *
 * @param {number} hash - model.meta.hash (32bit)
 * @returns {function(): number} [0,1) 난수기
 */
function particlePrng(hash) {
  let a = (hash ^ 0x6d2b79f5) >>> 0;
  let b = (Math.imul(hash, 0x85ebca6b) ^ 0x165667b1) >>> 0;
  let c = (Math.imul(hash ^ 0x27d4eb2f, 0xc2b2ae35)) >>> 0;
  let d = (hash + 0x9e3779b9) >>> 0;
  const next = () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 14; i += 1) next();
  return next;
}

/** 링 반지름 r(θ) — 하모닉 변조 (px) */
function ringR(model, t) {
  let r = R0;
  for (const h of model.harmonics) r += R0 * h.amp * Math.sin(h.k * t + h.phase);
  return r;
}

/** 필압 p(θ) — 붓의 강약. 골을 깊게 — 약압 구간은 실제로 끊긴다 */
function pressureAt(model, t) {
  let p = 0.7;
  for (const h of model.pressure) p += h.amp * Math.sin(h.k * t + h.phase);
  return Math.max(0.04, p);
}

/**
 * 가닥 섬유 요동 — 매끈한 사인 대신 해시 변주 다중 사인(정수 주파수 = 주기적,
 * 이음새 불연속 없음). 가닥들이 불규칙하게 교차/벌어지며 굵은 덩어리 내부에
 * 결(striation)을 만든다 (analysis.png의 내부 구조선).
 *
 * @param {number} t - 각도 (rad)
 * @param {number} si - 가닥 인덱스
 * @param {number} hash - model.meta.hash
 * @returns {number} 오프셋 (px)
 */
function fiberOffset(t, si, hash) {
  const F = [5, 9, 14, 23];
  let v = 0;
  for (let j = 0; j < 4; j += 1) {
    const amp = (0.5 + noiseHash(si * 7 + j, hash & 0xffff)) * (1.4 / (j + 1));
    const ph = noiseHash(si * 13 + j + 40, hash & 0xffff) * TWO_PI;
    v += amp * Math.sin(F[j] * t + ph);
  }
  return v;
}

/**
 * 고주파 불규칙 변주 [-1, 1] — stroke 외곽(굵기)의 거친 실루엣용.
 * 정수 주파수 다중 사인(주기적·이음새 없음) + 해시 위상.
 *
 * @param {number} t - 각도 (rad)
 * @param {number} salt - 채널 구분 (가닥/용도별)
 * @param {number} hash - model.meta.hash
 * @returns {number} [-1, 1] 근사 변주값
 */
function jagAt(t, salt, hash) {
  const F = [27, 43, 61];
  let v = 0;
  for (let j = 0; j < 3; j += 1) {
    const ph = noiseHash(salt * 17 + j + 90, hash & 0xffff) * TWO_PI;
    v += Math.sin(F[j] * t + ph) / (j + 1);
  }
  return v / 1.83; // Σ 1/(j+1) 정규화
}

/** 클러스터 진입부 굵기 증폭 */
function clusterBoost(model, t) {
  let b = 0;
  for (const c of model.clusters) {
    const d = angDiff(t, c.ang);
    const s = 0.15 + c.I * 0.06;
    b += 3.0 * c.I * Math.exp(-(d * d) / (2 * s * s));
  }
  return b;
}

/** 젖은 먹 고임 load(θ) — 두껍고·연속·새까만 구간 (0~약 1.5) */
function loadAt(model, t) {
  let v = 0;
  for (const z of model.inkLoads || []) {
    const d = angDiff(t, z.ang);
    v += z.strength * Math.exp(-(d * d) / (2 * z.width * z.width));
  }
  return v;
}

/**
 * LogogramModel → 잉크 입자 목록 (순수·결정론, 720-space).
 *
 * @param {object} model - buildModel 산출물 [Required]
 * @param {boolean} reduced - prefers-reduced-motion (true면 즉시 완성) [Optional]
 * @returns {{ particles: object[], totalMs: number }} 입자 배열과 총 형성 시간
 */
export function generateParticles(model, reduced = false) {
  const hash = model.meta.hash >>> 0;
  const rng = particlePrng(hash);
  const P = [];
  const sweepStart = rng() * TWO_PI;
  const sweepDir = rng() > 0.5 ? 1 : -1;
  const delayOf = (ang) =>
    ((((ang - sweepStart) * sweepDir) % TWO_PI + TWO_PI) % TWO_PI) / TWO_PI * SWEEP_MS;

  /* 링: 멀티 스트랜드 헤어라인 + 갈필 + 젖은 고임 */
  const STEPS = 580;
  for (let i = 0; i < STEPS; i++) {
    const t = (i / STEPS) * TWO_PI;
    if (model.gap) {
      const gd = Math.abs(angDiff(t, model.gap.ang));
      if (gd < model.gap.half) continue;
    }
    const rr = ringR(model, t);
    const pr = pressureAt(model, t);
    const boost = clusterBoost(model, t);
    const load = loadAt(model, t);
    const n = Math.sin(t * 6.7 + model.spreadPh) * 0.6 + Math.sin(t * 13.1 + model.spreadPh * 2.3) * 0.4;
    // 갈필 핀치 — 좁은 협곡에서만 width가 0으로 조인다 (끊김은 아주 잠깐).
    // smoothstep 에지: 협곡 양끝에서 굵기가 매끄럽게 조였다 풀린다
    let pinch = 1;
    for (const z of model.dropZones) {
      const d = Math.abs(angDiff(t, z.ang));
      const u = clamp(d / z.width, 0, 1);
      pinch = Math.min(pinch, u * u * (3 - 2 * u));
    }
    let taper = 1;
    if (model.gap) {
      const gd = Math.abs(angDiff(t, model.gap.ang));
      taper = clamp((gd - model.gap.half) / 0.22, 0, 1);
    }
    // 붓의 물리 결합 — 필압 하나가 확산·굵기·농담·불룩함을 동시에 지배한다.
    // prDyn: 지수 강조로 다이내믹 확대 (약압 → 끊김/헤어라인, 강압 → 먹 덩어리)
    const prDyn = Math.pow(pr, 1.8);
    // 누르면 가닥이 부채꼴로 퍼지고(획 폭 확장), 들면 한 가닥으로 모인다
    const spread = (3.2 + 2.2 * Math.sin(2 * t + model.spreadPh)) * (0.3 + 0.9 * prDyn);
    // 강압 구간은 획이 바깥으로 살짝 불룩하다 (analysis.png의 먹 덩어리 방향)
    const bulge = Math.max(0, prDyn - 0.7) * 4.5;
    const cosT = Math.cos(t), sinT = Math.sin(t);
    const tanX = -sinT * sweepDir, tanY = cosT * sweepDir;
    const d0 = delayOf(t);

    for (let si = 0; si < model.strands.length; si += 1) {
      const s = model.strands[si];
      // 갈필 게이트 — 보조 가닥만 약압에서 듬성해진다 (주 가닥 si=0은 면제:
      // 링은 핀치 순간 외엔 아무리 가늘어도 이어진다)
      if (si > 0 && n < -0.92 + s.thin * 0.3 - load * 1.6 + (0.28 - prDyn * 0.8)) continue;
      if (load < 0.3 && rng() < 0.055) continue;
      // 섬유 요동 — 가닥별 불규칙 교차 (내부 결)
      const off = s.off * spread * 0.5 + fiberOffset(t, si, hash);
      // 가장자리 비대칭 — 안/밖 가장자리가 독립적으로 거칠게 요동 (실루엣 불규칙)
      const edgeJag = jagAt(t, si + 31, hash);
      const rad = rr + off + bulge + edgeJag * (0.6 + prDyn * 2.2);
      // 필압^1.8 기반 굵기 × 고주파 지터 — 매끈한 소시지 금지, 외곽이 거칠다
      const wJag = 0.55 + 0.6 * (0.5 + 0.5 * jagAt(t, si, hash)); // 0.55~1.15
      let w = clamp(s.w * (0.25 + 1.6 * prDyn + 1.15 * boost + 3.0 * load) * wJag * taper, 0, 10);
      // 주 가닥 헤어라인 보장 — 약압이어도 끊기지 않는다 (핀치가 유일한 0점)
      if (si === 0) w = Math.max(w, 0.5 * taper);
      w *= pinch;
      if (w < 0.3) continue;
      // 농담도 필압을 따른다 — 마른 약압은 옅게, 강압은 진하게
      let a = clamp(
        (s.a * (0.35 + 0.65 * Math.min(1, prDyn)) + boost * 0.16 + load * 0.62) * (0.55 + taper * 0.45),
        0, 0.98,
      );
      // 내부 균열 — 두꺼운 구간 한정, 좁은 노이즈 밴드에서 먹이 갈라진다
      if (load > 0.4 || prDyn > 0.8) {
        const n2 = Math.sin(t * 31 + model.spreadPh * 3.1) * Math.sin(t * 12 + s.wobPh * 2.3);
        if (Math.abs(n2) < 0.07) a *= 0.25;
      }
      P.push({
        kind: 'ring',
        x: CX0 + rad * cosT + (rng() - 0.5) * 0.9,
        y: CY0 + rad * sinT + (rng() - 0.5) * 0.9,
        r: w, a,
        t0: d0 + rng() * 36, dur: 170,
        tanX, tanY, ph: rng() * TWO_PI,
      });
      // 가장자리 거스러미(spur) — 획 envelope 바깥으로 튀는 잔가시.
      // 강압(두꺼운) 구간 주변에 몰린다 (레퍼런스의 찢긴 외곽)
      if (rng() < 0.035 + 0.045 * prDyn) {
        const dir = rng() > 0.5 ? 1 : -1;
        const spurN = 2 + Math.floor(rng() * 2);
        const tDrift = (rng() - 0.5) * 0.02;
        for (let k2 = 1; k2 <= spurN; k2 += 1) {
          const sr = rad + dir * (w * 0.5 + k2 * (1.2 + rng() * 1.6));
          const sa = t + tDrift * k2;
          P.push({
            kind: 'ring',
            x: CX0 + sr * Math.cos(sa),
            y: CY0 + sr * Math.sin(sa),
            r: Math.max(0.35, w * (0.55 - k2 * 0.12)),
            a: a * (0.75 - k2 * 0.1),
            t0: d0 + rng() * 36 + k2 * 14, dur: 170,
            tanX, tanY, ph: rng() * TWO_PI,
          });
        }
      }
      // 젖은 구간 연속성 보강 — 보간 대브로 점선 → 솔리드
      if (load > 0.45) {
        const t2 = t + (Math.PI / STEPS);
        const r2 = ringR(model, t2) + off;
        P.push({
          kind: 'ring',
          x: CX0 + r2 * Math.cos(t2) + (rng() - 0.5) * 0.6,
          y: CY0 + r2 * Math.sin(t2) + (rng() - 0.5) * 0.6,
          r: w * 0.92, a,
          t0: d0 + rng() * 36, dur: 170,
          tanX, tanY, ph: rng() * TWO_PI,
        });
      }
      // 연기/위스프 (연기 모드에서만 그려짐)
      if (rng() < 0.035) {
        P.push({
          kind: 'wisp',
          x: CX0 + rad * cosT, y: CY0 + rad * sinT,
          r: 6 + rng() * 9, a: 0.05 + rng() * 0.07,
          driftX: cosT * 0.35, lift: 24 + rng() * 34,
          sp: 0.45 + rng() * 0.8, ph: rng() * TWO_PI,
          t0: d0, dur: 1,
        });
      }
    }
  }

  /* 클러스터 버스트 */
  for (const c of model.clusters) {
    const rr = ringR(model, c.ang);
    const nx = Math.cos(c.ang) * c.dirBias, ny = Math.sin(c.ang) * c.dirBias;
    const coreR = 9 + c.I * 15;
    // 코어를 링에 거의 붙여 둔다 (떨어져 뜨는 폭발 → 획에서 자라는 덩어리)
    const cx = CX0 + rr * Math.cos(c.ang) + nx * coreR * 0.18;
    const cy = CY0 + rr * Math.sin(c.ang) + ny * coreR * 0.18;
    const tanAng = c.ang + Math.PI / 2;
    const T0 = delayOf(c.ang) + 70;

    // 코어 질량
    const coreN = Math.floor(60 + c.I * 70);
    for (let i = 0; i < coreN; i++) {
      const g1 = (rng() + rng() - 1), g2 = (rng() + rng() - 1);
      const stretch = 1 + 0.5 * Math.abs(nx);
      P.push({
        kind: 'core',
        x: cx + g1 * coreR * stretch, y: cy + g2 * coreR,
        r: (1.4 + rng() * 5.2) * (0.7 + c.I * 0.5),
        a: 0.42 + rng() * 0.48,
        t0: T0 + rng() * 130, dur: 130, ph: rng() * TWO_PI,
      });
    }

    // 가시 (방사 + 링 따라 흐르는 접선)
    const baseDir = Math.atan2(ny, nx);
    let spikeLenSum = 0;
    for (let k = 0; k < c.spikeN; k++) {
      const tangential = rng() < 0.42;
      const tanSide = rng() > 0.5 ? 1 : -1;
      const th0 = tangential
        ? tanAng + (tanSide > 0 ? 0 : Math.PI) + (rng() - 0.5) * 0.55
        : baseDir + (rng() - 0.5) * 2 * c.coneSpread;
      const L = coreR * (tangential ? (2.4 + rng() * 3.6) : (1.5 + rng() * 2.7));
      spikeLenSum += L;
      const curve = tangential
        ? -tanSide * c.dirBias * (0.6 + rng() * 0.7)
        : (rng() - 0.5) * 0.9;
      const w0 = (2.4 + c.I * 1.7) * (0.6 + rng() * 0.6);
      const nSt = Math.floor(11 + L / 5.5);
      for (let i = 0; i < nSt; i++) {
        const u = i / nSt;
        const th = th0 + curve * u;
        const dist = coreR * 0.3 + L * u;
        P.push({
          kind: 'spike',
          x: cx + Math.cos(th) * dist + (rng() - 0.5) * 0.8,
          y: cy + Math.sin(th) * dist + (rng() - 0.5) * 0.8,
          r: Math.max(0.4, w0 * Math.pow(1 - u, 1.5)),
          a: (0.5 + rng() * 0.35) * (1 - u * 0.4),
          t0: T0 + 40 + u * 210, dur: 130, ph: rng() * TWO_PI,
        });
      }
      if (rng() < 0.55) {
        const dist = coreR * 0.3 + L * (1.08 + rng() * 0.18);
        P.push({
          kind: 'scatter',
          x: cx + Math.cos(th0 + curve) * dist,
          y: cy + Math.sin(th0 + curve) * dist,
          r: 0.7 + rng() * 1.4, a: 0.3 + rng() * 0.5,
          fx: cx, fy: cy, t0: T0 + 230 + rng() * 120, dur: 280, ph: rng() * TWO_PI,
        });
      }
    }
    const avgL = spikeLenSum / Math.max(1, c.spikeN);

    // 비산점 필드
    const scN = Math.floor(15 + c.I * 24);
    for (let i = 0; i < scN; i++) {
      const wide = rng() < 0.25;
      const th = wide ? rng() * TWO_PI : baseDir + (rng() - 0.5) * 2 * (c.coneSpread + 0.5);
      const dist = (coreR * 0.5 + avgL * 1.15) * Math.pow(rng(), 1.7) + coreR * 0.4;
      P.push({
        kind: 'scatter',
        x: cx + Math.cos(th) * dist, y: cy + Math.sin(th) * dist,
        r: 0.6 + rng() * 1.9, a: 0.25 + rng() * 0.55,
        fx: cx, fy: cy, t0: T0 + 110 + rng() * 300, dur: 300, ph: rng() * TWO_PI,
      });
    }

    // 분리 방울 + 꼬리
    const dropN = Math.floor(rng() * 3);
    for (let i = 0; i < dropN; i++) {
      const th = baseDir + (rng() - 0.5) * 1.4;
      const dist = coreR * (1.6 + rng() * 1.3) + avgL * 0.5;
      const dx = cx + Math.cos(th) * dist, dy = cy + Math.sin(th) * dist;
      const dr = 2.4 + rng() * 3.4;
      P.push({
        kind: 'scatter', x: dx, y: dy, r: dr, a: 0.55 + rng() * 0.35,
        fx: cx, fy: cy, t0: T0 + 260 + rng() * 160, dur: 320, ph: rng() * TWO_PI,
      });
      for (let j = 1; j <= 3; j++) {
        const u = j / 4;
        P.push({
          kind: 'scatter',
          x: dx - Math.cos(th) * dr * 2.2 * u, y: dy - Math.sin(th) * dr * 2.2 * u,
          r: dr * (0.45 - u * 0.3), a: 0.35,
          fx: cx, fy: cy, t0: T0 + 260 + rng() * 160, dur: 300, ph: rng() * TWO_PI,
        });
      }
    }
  }

  /* 의문형 갈고리 (마지막 — 본체 입자 불변) */
  if (model.questionHook) {
    const h = model.questionHook;
    const rr = ringR(model, h.ang);
    const bx = CX0 + rr * Math.cos(h.ang), by = CY0 + rr * Math.sin(h.ang);
    const T0 = delayOf(h.ang) + 80;
    const nSt = 22;
    for (let i = 0; i < nSt; i++) {
      const u = i / nSt;
      const th = h.ang + h.curl * (0.3 + 2.0 * u * u);
      const dist = h.len * Math.sin(u * Math.PI * 0.62);
      P.push({
        kind: 'spike',
        x: bx + Math.cos(th) * dist, y: by + Math.sin(th) * dist,
        r: Math.max(0.4, 2.0 * Math.pow(1 - u, 1.1)),
        a: 0.55 * (1 - u * 0.3),
        t0: T0 + u * 200, dur: 120, ph: rng() * TWO_PI,
      });
    }
  }

  // 잉크는 연기보다 한 박자 늦게 응결한다 — 스윕 헤드에서 연기가 먼저 자리를
  // 열고(generateVapor), 그 자리에 형태가 채워지는 물리적 순서.
  // (Morin: 기체가 먼저, 잉크가 타겟 형태로 settle) — INK_LEAD만큼 잉크 지연.
  const INK_LEAD = 280;
  for (const p of P) {
    if (p.kind !== 'wisp') p.t0 += INK_LEAD;
  }

  if (reduced) for (const p of P) { p.t0 = 0; p.dur = 1; }
  let end = 0;
  for (const p of P) end = Math.max(end, p.t0 + p.dur);
  return { particles: P, totalMs: end + 120 };
}

/* ───────────────────────── vapor (연기) 시스템 ─────────────────────────
 * 영화 VFX(Hybride/Louis Morin) 방식의 Canvas 번역:
 * "잉크는 dust가 아니라 liquid/기체 — 타겟 형태로 settle하되 영구히 움직인다"
 * - vapor puff는 사전 계산된 결정론 스케줄 (birth/life/drift 전부 해시 유도)
 *   → 시간 t의 순수 함수로 그려진다 (프레임레이트 무관, Math.random 불요)
 * - 형성 단계: 스윕 헤드를 따라 분출 (방향성) + 클러스터 버스트
 * - 완성 후: 가장자리 순환(cyclic) puff로 영구 미세 운동 (Morin: "remains
 *   in movement constantly")
 */

/**
 * 결정론 해시 노이즈 — 외부 라이브러리 없이 푸프 드리프트 변주용.
 *
 * @param {number} ix - 정수 격자 x
 * @param {number} iy - 정수 격자 y
 * @returns {number} [0,1)
 */
function noiseHash(ix, iy) {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * LogogramModel → vapor puff 스케줄 (순수·결정론).
 * 본체 입자 스트림과 분리된 시드(hash ^ 0x56415021)를 사용 — 본체 불변.
 *
 * puff 스키마: { x0, y0, birth, life, r0, growth, rot0, rotSpd,
 *   driftAng, driftSpd, wAmp, wFreq, wPh, baseA, cycle }
 * cycle > 0이면 순환 puff (완성 후 영구 운동), 0이면 형성 단계 1회성.
 *
 * @param {object} model - buildModel 산출물 [Required]
 * @returns {{ puffs: object[], formEnd: number }} 스케줄과 형성 종료 시각(ms)
 */
export function generateVapor(model) {
  const hash = model.meta.hash >>> 0;
  const rng = particlePrng((hash ^ 0x56415021) >>> 0); // 'VAP!' — 분리 스트림
  // 본체와 동일한 스윕 방향 재현 (본체 스트림의 첫 2draw 복제 — 소비 아님)
  const bodyRng = particlePrng(hash);
  const sweepStart = bodyRng() * TWO_PI;
  const sweepDir = bodyRng() > 0.5 ? 1 : -1;
  const delayOf = (ang) =>
    ((((ang - sweepStart) * sweepDir) % TWO_PI + TWO_PI) % TWO_PI) / TWO_PI * SWEEP_MS;

  const puffs = [];
  let formEnd = SWEEP_MS + 900;

  /** 공통 puff 생성 */
  const push = (x0, y0, birth, opts = {}) => {
    puffs.push({
      x0, y0, birth,
      life: opts.life ?? (600 + rng() * 500),
      r0: opts.r0 ?? (8 + rng() * 10),
      growth: opts.growth ?? (1.2 + rng() * 1.0),
      rot0: rng() * TWO_PI,
      rotSpd: (rng() - 0.5) * 0.0012,
      driftAng: opts.driftAng ?? rng() * TWO_PI,
      driftSpd: opts.driftSpd ?? (0.008 + rng() * 0.012), // px/ms (720-space)
      wAmp: 2 + rng() * 4,
      wFreq: 0.0012 + rng() * 0.0018,
      wPh: rng() * TWO_PI,
      baseA: opts.baseA ?? (0.05 + rng() * 0.04),
      cycle: opts.cycle ?? 0,
    });
  };

  // 1) 스윕 헤드 분출 — 링을 따라 (방향성의 시각 단서)
  const HEAD_N = 150;
  for (let k = 0; k < HEAD_N; k += 1) {
    const t = (k / HEAD_N) * TWO_PI;
    if (model.gap) {
      const gd = Math.abs(angDiff(t, model.gap.ang));
      if (gd < model.gap.half) continue;
    }
    const rr = ringR(model, t);
    const ox = CX0 + Math.cos(t) * rr;
    const oy = CY0 + Math.sin(t) * rr;
    // 바깥 + 스윕 진행 반대쪽으로 끌리는 드리프트 (붓이 지나간 자리의 연기)
    const out = t + (rng() - 0.5) * 1.2;
    push(ox, oy, delayOf(t) + rng() * 80, { driftAng: out });
  }

  // 2) 클러스터 버스트 — 질량 응집 시 연기 분출 (더 크게·진하게)
  for (const c of model.clusters) {
    const rr = ringR(model, c.ang);
    const bx = CX0 + Math.cos(c.ang) * rr;
    const by = CY0 + Math.sin(c.ang) * rr;
    const T0 = delayOf(c.ang) + 70;
    const n = Math.floor(10 + c.I * 12);
    for (let i = 0; i < n; i += 1) {
      const a = rng() * TWO_PI;
      const d = rng() * (12 + c.I * 14);
      push(bx + Math.cos(a) * d, by + Math.sin(a) * d, T0 + rng() * 320, {
        r0: 12 + rng() * 16,
        growth: 1.6 + rng() * 1.2,
        life: 800 + rng() * 700,
        baseA: 0.06 + rng() * 0.05,
        driftAng: c.ang + (rng() - 0.5) * 1.5,
      });
      formEnd = Math.max(formEnd, T0 + 320 + 1500);
    }
  }

  // 3) 순환(앰비언트) puff — 완성 후 영구 미세 운동 (링·클러스터 가장자리)
  const AMB_N = 30;
  for (let k = 0; k < AMB_N; k += 1) {
    const onCluster = model.clusters.length > 0 && rng() < 0.45;
    let ox; let oy;
    if (onCluster) {
      const c = model.clusters[Math.floor(rng() * model.clusters.length)];
      const rr = ringR(model, c.ang);
      const a = rng() * TWO_PI;
      const d = 6 + rng() * (10 + c.I * 12);
      ox = CX0 + Math.cos(c.ang) * rr + Math.cos(a) * d;
      oy = CY0 + Math.sin(c.ang) * rr + Math.sin(a) * d;
    } else {
      const t = rng() * TWO_PI;
      const rr = ringR(model, t);
      ox = CX0 + Math.cos(t) * rr;
      oy = CY0 + Math.sin(t) * rr;
    }
    push(ox, oy, formEnd + rng() * 4000, {
      life: 1800 + rng() * 1400,
      r0: 9 + rng() * 12,
      growth: 1.3 + rng() * 0.9,
      baseA: 0.03 + rng() * 0.02,
      driftSpd: 0.004 + rng() * 0.006,
      cycle: 4000 + rng() * 5000,
    });
  }

  return { puffs, formEnd };
}

/**
 * vapor puff들을 시간 t의 순수 함수로 그린다 (vctx는 720-space 변환 적용).
 * 푸프 생명주기: scale 성장 + 개별 느린 회전 + cosine 알파 (정석 처방).
 *
 * @param {CanvasRenderingContext2D} vctx - vapor 레이어 컨텍스트 (720-space)
 * @param {object[]} puffs - generateVapor().puffs
 * @param {number} t - 경과 시간 (ms)
 * @param {HTMLCanvasElement} puffSprite - makeVaporSprites().puff
 */
export function paintVapor(vctx, puffs, t, puffSprite) {
  for (let i = 0; i < puffs.length; i += 1) {
    const p = puffs[i];
    let age;
    if (p.cycle > 0) {
      if (t < p.birth) continue;
      age = (t - p.birth) % p.cycle;
    } else {
      age = t - p.birth;
    }
    if (age < 0 || age > p.life) continue;
    const u = age / p.life;
    const fade = Math.sin(Math.PI * u); // cosine 생명주기 (0→peak→0)
    const scale = p.r0 * (1 + p.growth * u);
    // 드리프트 + 해시 노이즈 흔들림 (결정론 — 시간의 순수 함수)
    const nx = noiseHash(i * 7 + 1, Math.floor(age * 0.01)) - 0.5;
    const wob = Math.sin(age * p.wFreq + p.wPh) * p.wAmp * (0.5 + u);
    const x = p.x0 + Math.cos(p.driftAng) * p.driftSpd * age + wob * 0.6 + nx * 2;
    const y = p.y0 + Math.sin(p.driftAng) * p.driftSpd * age + Math.cos(age * p.wFreq * 0.8 + p.wPh) * p.wAmp * 0.4;
    const rot = p.rot0 + p.rotSpd * age;
    vctx.globalAlpha = p.baseA * fade;
    vctx.translate(x, y);
    vctx.rotate(rot);
    vctx.drawImage(puffSprite, -scale, -scale, scale * 2, scale * 2);
    vctx.rotate(-rot);
    vctx.translate(-x, -y);
  }
  vctx.globalAlpha = 1;
}

/**
 * 이동 중인 잉크 입자의 방향성 streak를 vapor 레이어에 스탬프한다.
 * (이동 방향으로 3:1 늘인 스프라이트 — 모션 블러의 stretched sprite 정석)
 *
 * @param {CanvasRenderingContext2D} vctx - vapor 레이어 컨텍스트 (720-space)
 * @param {object[]} particles - generateParticles().particles
 * @param {number} t - 경과 시간 (ms)
 * @param {HTMLCanvasElement} streakSprite - makeVaporSprites().streak
 */
export function stampStreaks(vctx, particles, t, streakSprite) {
  for (let i = 0; i < particles.length; i += 3) { // 1/3 스트라이드 (버짓)
    const p = particles[i];
    if (p.kind === 'wisp' || p.kind === 'core' || p.kind === 'spike') continue;
    const e = (t - p.t0) / p.dur;
    if (e <= 0 || e >= 1) continue;
    const k = easeOutCubic(e);
    let x = p.x; let y = p.y; let ang;
    if (p.kind === 'ring') {
      const slide = 11 * (1 - k);
      x -= p.tanX * slide; y -= p.tanY * slide;
      ang = Math.atan2(p.tanY, p.tanX);
    } else { // scatter — 사출 방향
      x = p.fx + (p.x - p.fx) * k;
      y = p.fy + (p.y - p.fy) * k;
      ang = Math.atan2(p.y - p.fy, p.x - p.fx);
    }
    const len = Math.max(6, p.r * 5);
    vctx.globalAlpha = 0.05 * (1 - k * 0.5);
    vctx.translate(x, y);
    vctx.rotate(ang);
    vctx.drawImage(streakSprite, -len, -len / 3, len * 2, (len * 2) / 3);
    vctx.rotate(-ang);
    vctx.translate(-x, -y);
  }
  vctx.globalAlpha = 1;
}

/**
 * vapor 스프라이트 2종을 오프스크린에 1회 굽는다 (실시간 ctx.filter 금지 —
 * prerender 정석). puff는 3로브 오프셋 가우시안(회전 시 변주가 보이도록
 * 비원형), streak는 3:1 가로 타원 가우시안.
 *
 * @param {string} inkColor - 잉크 색 [Optional]
 * @returns {{ puff: HTMLCanvasElement, streak: HTMLCanvasElement }} 스프라이트
 */
export function makeVaporSprites(inkColor) {
  const [r, g, b] = parseRgb(inkColor);
  // puff — 128px, 중심 + 오프셋 로브 2개 (비원형 구름)
  const puff = document.createElement('canvas');
  puff.width = puff.height = 128;
  const pg = puff.getContext('2d');
  const lobe = (cx, cy, rad, a) => {
    const grad = pg.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(0.55, `rgba(${r},${g},${b},${a * 0.4})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    pg.fillStyle = grad;
    pg.fillRect(0, 0, 128, 128);
  };
  lobe(64, 64, 60, 0.5);
  lobe(46, 52, 38, 0.35);
  lobe(82, 76, 34, 0.3);
  // streak — 128×44, 가로 타원 가우시안 (그릴 때 회전)
  const streak = document.createElement('canvas');
  streak.width = 128;
  streak.height = 44;
  const sg = streak.getContext('2d');
  sg.save();
  sg.translate(64, 22);
  sg.scale(3, 1);
  const grad = sg.createRadialGradient(0, 0, 0, 0, 0, 21);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
  grad.addColorStop(0.6, `rgba(${r},${g},${b},0.2)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  sg.fillStyle = grad;
  sg.fillRect(-22, -22, 44, 44);
  sg.restore();
  return { puff, streak };
}

/**
 * 잉크 색 → [r,g,b]. 실패 시 기본 잉크색.
 *
 * @param {string} color - CSS hex 색
 * @returns {number[]} [r,g,b]
 */
function parseRgb(color) {
  const m = /^#?([0-9a-f]{6})$/i.exec((color || '').trim());
  const n = parseInt(m ? m[1] : '15171a', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 잉크 도트 스프라이트 2종(hard/soft)을 오프스크린에 1회 굽는다.
 *
 * @param {string} inkColor - 잉크 색 [Optional]
 * @returns {{ hard: HTMLCanvasElement, soft: HTMLCanvasElement }} 스프라이트
 */
export function makeSprites(inkColor) {
  const [r, g, b] = parseRgb(inkColor);
  const mk = (stops) => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const gx = c.getContext('2d');
    const grad = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
    for (const [o, a] of stops) grad.addColorStop(o, `rgba(${r},${g},${b},${a})`);
    gx.fillStyle = grad;
    gx.fillRect(0, 0, 64, 64);
    return c;
  };
  return {
    hard: mk([[0, 1], [0.62, 0.95], [0.82, 0.35], [1, 0]]),
    soft: mk([[0, 0.9], [0.5, 0.45], [1, 0]]),
  };
}

/**
 * 한 입자를 그린다 (잉크 모드). caller가 720-space 변환을 적용한 ctx를 넘긴다.
 *
 * @param {CanvasRenderingContext2D} ctx - 720-space 변환 적용된 컨텍스트
 * @param {object} p - 입자
 * @param {object} sprites - { hard, soft }
 * @param {number} k - eased 진행도 (0~1)
 */
function drawInkParticle(ctx, p, sprites, k) {
  if (p.kind === 'wisp') return; // 잉크 모드에서는 위스프 생략
  let x = p.x, y = p.y;
  if (p.kind === 'ring') {
    const slide = 11 * (1 - k);
    x -= p.tanX * slide; y -= p.tanY * slide;
  } else if (p.kind === 'scatter') {
    x = p.fx + (p.x - p.fx) * k;
    y = p.fy + (p.y - p.fy) * k;
  }
  const sprite = p.kind === 'core' && p.r > 4.5 ? sprites.soft : sprites.hard;
  const s = p.r * 2.5;
  ctx.globalAlpha = p.a * k;
  ctx.drawImage(sprite, x - s / 2, y - s / 2, s, s);
}

/**
 * 완성 정적 프레임을 720-space로 그린다 (PNG 익스포트·reduced-motion 공용).
 *
 * @param {CanvasRenderingContext2D} ctx - 720-space 변환 적용된 컨텍스트
 * @param {object[]} particles - generateParticles().particles
 * @param {object} sprites - makeSprites() 산출물
 */
export function paintStatic(ctx, particles, sprites) {
  for (const p of particles) {
    drawInkParticle(ctx, p, sprites, 1);
  }
  ctx.globalAlpha = 1;
}

export { drawInkParticle, CX0, CY0, R0 };
