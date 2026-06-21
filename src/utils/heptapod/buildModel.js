/**
 * Heptapod B Encoder — Stage 2: seed → LogogramModel (형태 모델 v2)
 *
 * 아트북 로고그램 사전을 다시 읽어 재설계한 클러스터 기반 형태 모델.
 * v1(12슬롯 분산 가지 + 두꺼운 가변 리본)의 근본 오류를 교정한다.
 *
 * - 링: 얇은 멀티 스트랜드 헤어라인 + 갈필(dry brush) + 젖은 먹 고임 구간
 * - 질량: 둘레 분산이 아니라 1~3개 스플래터 클러스터로 응집
 *   (코어 + 방사/접선 가시 + 비산점 + 분리 방울 — 렌더러에서 입자로 전개)
 *
 * 좌표·길이는 스케일 프리(각도·비율). 렌더러가 자신의 픽셀 스케일을 적용한다.
 * 결정론: encode(name).createPrng 스트림만 사용 (Math.random 금지).
 * 본체는 'body' 스트림, 의문형 갈고리는 'hook' 스트림 — 갈고리 토글은
 * 본체 필드를 단 한 비트도 바꾸지 않는다.
 *
 * 출력은 v2 클러스터 필드 + 기존 UI(AnalysisOverlay·DataReadout) 호환 필드를
 * 함께 담는 superset이다 (meta / ring / slots[12] / branches[]).
 */

const TWO_PI = Math.PI * 2;

/** [lo, hi] 클램프 */
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/** 두 각도의 부호 있는 최단 차 (rad) */
function angDiff(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** 가지 유형 4종 — 오버레이/리드아웃 라벨용 (클러스터 성격을 분류) */
const BRANCH_TYPES = ['blob', 'spike', 'wisp', 'hook'];

/**
 * 클러스터 각도 → 가장 가까운 12슬롯 인덱스 (slot 0 = 12시 = 3π/2, π/6 간격).
 *
 * @param {number} ang - 클러스터 각도 (rad)
 * @returns {number} 0~11 슬롯 인덱스
 */
function slotOfAngle(ang) {
  const k = Math.round((ang - (3 * Math.PI) / 2) / (Math.PI / 6));
  return ((k % 12) + 12) % 12;
}

/**
 * Seed → LogogramModel (순수·결정론).
 *
 * @param {object} seed - encode(name) 산출물 ({ name, hashHex, hash, nfdUnits, createPrng }) [Required]
 * @param {object} options - { questionHook: boolean } [Optional]
 * @returns {object} LogogramModel (v2 클러스터 + 호환 필드)
 *
 * Example usage:
 * const model = buildModel(encode('Louise'), { questionHook: true });
 */
export function buildModel(seed, options = {}) {
  const { questionHook = false } = options;
  const rng = seed.createPrng('body');
  const jamo = seed.nfdUnits.map((c) => c.codePointAt(0));

  // 링: 살짝 일그러진 원 (레퍼런스는 의외로 원에 가까움)
  const harmonics = [1, 2, 3].map((k) => ({
    k, amp: 0.004 + rng() * 0.014, phase: rng() * TWO_PI,
  }));
  // 필압 프로파일 — 동양화 붓의 강약. 저주파(k=1)가 지배하는 긴 호흡의
  // 부풀음/가늘어짐 + 중주파의 미세 변주. (잔떨림이 아니라 강약 변주)
  const pressure = [
    { k: 1, amp: 0.38 + rng() * 0.25, phase: rng() * TWO_PI },
    { k: 2, amp: 0.18 + rng() * 0.18, phase: rng() * TWO_PI },
    { k: 3, amp: 0.08 + rng() * 0.12, phase: rng() * TWO_PI },
  ];
  // 스트랜드 (마른 붓의 평행 가닥)
  const strandCount = 3 + Math.floor(rng() * 3); // 3~5
  const strands = Array.from({ length: strandCount }, () => ({
    off: (rng() - 0.5) * 2,
    w: 0.5 + rng() * 0.65,
    a: 0.22 + rng() * 0.42,
    wobPh: rng() * TWO_PI,
    thin: rng() * 0.5,
  }));
  const spreadPh = rng() * TWO_PI;
  // 갈필 핀치 (먹이 끊기는 곳) — 좁은 협곡: width가 0으로 조였다가 바로 복귀.
  // 끊김은 "아주 잠깐"이어야 한다 (레퍼런스: 링은 거의 항상 이어져 있음)
  const dropZones = Array.from({ length: 2 }, () => ({
    ang: rng() * TWO_PI,
    width: 0.05 + rng() * 0.08, // 반폭 (rad) ≈ 3~7.5°
    strength: 0.45 + rng() * 0.5,
  }));
  // 젖은 먹 고임 구간 (붓에 먹이 실려 두껍고 새까만 연속 획이 되는 곳 — 극단 대비)
  const loadCount = 1 + Math.floor(rng() * 2); // 1~2
  const inkLoads = Array.from({ length: loadCount }, () => ({
    ang: rng() * TWO_PI,
    width: 0.34 + rng() * 0.5,
    strength: 0.8 + rng() * 0.7,
  }));
  // 링 개방 (일부 로고그램은 닫히지 않음)
  const gap = rng() < 0.35
    ? { ang: rng() * TWO_PI, half: (0.025 + rng() * 0.055) * Math.PI }
    : null;

  // 클러스터: 1~3개, 이름 길이에서 유도
  const clusterCount = clamp(1 + Math.floor(jamo.length / 5), 1, 3);
  const clusters = [];
  let guard = 0;
  while (clusters.length < clusterCount && guard++ < 60) {
    const ang = rng() * TWO_PI;
    if (gap && Math.abs(angDiff(ang, gap.ang)) < gap.half + 0.5) continue;
    if (clusters.some((c) => Math.abs(angDiff(ang, c.ang)) < 1.25)) continue;
    const i = clusters.length;
    const code = jamo.length ? jamo[i % jamo.length] : 97;
    clusters.push({
      ang,
      I: 0.55 + ((code % 13) / 13) * 0.55 + rng() * 0.25, // intensity 0.55~1.35
      dirBias: rng() > 0.4 ? 1 : -1, // 주로 바깥 폭발
      spikeN: 6 + (code % 8),
      coneSpread: 0.6 + rng() * 0.7,
      ph: rng() * TWO_PI,
      type: BRANCH_TYPES[code % BRANCH_TYPES.length],
    });
  }
  // 메인(가장 무거운) 클러스터 = 잉크 무게중심
  const main = clusters.reduce((a, b) => (b.I > a.I ? b : a), clusters[0]);

  // 갈필(끊김) 구간이 젖은 구간·클러스터 질량 위에 겹치면 끊김이 상쇄/은폐된다
  // — 결정론적으로 빈 자리로 밀어냄 (rng 미소비: 다른 파라미터에 영향 없음)
  for (let zi = 0; zi < dropZones.length; zi += 1) {
    const z = dropZones[zi];
    let g3 = 0;
    const blocked = () =>
      inkLoads.some((L) => Math.abs(angDiff(z.ang, L.ang)) < L.width + z.width * 0.5)
      || clusters.some((c) => Math.abs(angDiff(z.ang, c.ang)) < 0.55 + z.width * 0.5)
      // 갈필 구간끼리 겹치면 끊김이 하나로 합쳐진다 — 상호 분리
      || dropZones.slice(0, zi).some(
        (prev) => Math.abs(angDiff(z.ang, prev.ang)) < (z.width + prev.width) * 0.5 + 0.35,
      );
    while (blocked() && g3++ < 12) {
      z.ang = (z.ang + 0.7) % TWO_PI;
    }
  }

  // 의문형 갈고리: 분리된 'hook' 스트림 (본체 불변)
  let qHook = null;
  if (questionHook) {
    const q = seed.createPrng('hook');
    let qa = q() * TWO_PI;
    let g2 = 0;
    while (clusters.some((c) => Math.abs(angDiff(qa, c.ang)) < 0.9) && g2++ < 24) {
      qa += 0.45;
    }
    qHook = { ang: qa, curl: q() > 0.5 ? 1 : -1, len: 24 + q() * 12 };
  }

  // ── 호환 필드 (AnalysisOverlay · DataReadout · SVG export) ─────────────
  // ring: 정규화 R=1 근사 원 (overlay ringRadiusAt이 그대로 사용)
  const ring = {
    radius: 1,
    ellipticity: 1,
    harmonics,
    weightCenterAngle: main ? main.ang : (3 * Math.PI) / 2,
    strokeWidth: { min: 0.02, base: 0.04, peak: 0.22, peakAngle: main ? main.ang : 0, peakSigma: 0.5 },
  };
  // slots[12] — 클러스터가 앉은 슬롯을 active로, branchIndex로 가지 연결
  const slots = Array.from({ length: 12 }, (_, i) => ({
    index: i,
    angle: (i * Math.PI) / 6 + (3 * Math.PI) / 2,
    active: false,
    branchIndex: null,
  }));
  const branches = clusters.map((c, i) => ({
    index: i,
    type: c.type,
    slotIndex: slotOfAngle(c.ang),
    angle: c.ang,
    intensity: c.I,
  }));
  branches.forEach((b) => {
    const slot = slots[b.slotIndex];
    if (slot && !slot.active) {
      slot.active = true;
      slot.branchIndex = b.index;
    }
  });

  return {
    // 메타 (리드아웃·오버레이 호환)
    meta: {
      name: seed.name,
      hash: seed.hash,
      hashHex: seed.hashHex,
      nfdCount: seed.nfdUnits.length,
      clusterCount: clusters.length,
    },
    // 호환 (overlay/readout/svg)
    ring,
    slots,
    branches,
    // v2 형태 필드 (Canvas 렌더러가 입자로 전개)
    jamo,
    harmonics,
    pressure,
    strands,
    spreadPh,
    dropZones,
    inkLoads,
    gap,
    clusters,
    main,
    questionHook: qHook,
  };
}

export default buildModel;
