/**
 * Heptapod B Encoder — 가역 형태 모델 (병행 모드)
 *
 * reversibleCodec의 버킷으로 형태 모델을 만든다. 출력 스키마는 buildModel과
 * 동일 → generateParticles·렌더러·오버레이 무수정으로 재사용.
 *
 * 데이터 채널(복원 가능): 링 하모닉 진폭 단계·gap 위치·strand 수·무게중심
 * 슬롯·클러스터 수·각 클러스터(유형·가시수·슬롯). 전부 "이미 렌더되는 시각
 * 특징"의 양자화라 decode가 형태 데이터에서 그대로 역양자화한다.
 * 표현 채널(정보 0·순수 장식): 필압·붓질 지터·gap 폭·클러스터 강도/방향/위상
 * 등은 N 시드 PRNG로 — 비주얼은 유기적, 복원엔 무관.
 */

import { xmur3, sfc32 } from './encode';
import {
  RADII, K, encodeReversible, bucketsToInt, intToTokens, tokensToText,
  encodeClusterCell, decodeClusterCell, ALPHA_CODES, toDisplayChar,
} from './reversibleCodec';

const TWO_PI = Math.PI * 2;
/** 가지 유형 — reversibleCodec CL.TYPE 인덱스와 순서 일치 (절대) */
const TYPES = ['blob', 'spike', 'wisp', 'hook'];
/** 하모닉 진폭 양자화 — 0.004~0.018 (원본 범위 내), 8단계 */
const AMP_MIN = 0.004;
const AMP_STEP = 0.002;
/** gap 고정 폭(half, rad) — 데이터 아님 */
const GAP_HALF = 0.05;
/** 슬롯 중심 각도 (slot 0 = 12시) */
const slotAngle = (i) => (i * Math.PI) / 6 + (3 * Math.PI) / 2;

/** N(BigInt)에서 표현 채널용 PRNG */
function prngFromN(n) {
  const h = xmur3(String(n));
  return sfc32(h(), h(), h(), h());
}

/** rad → 가장 가까운 슬롯 인덱스 (0~11) */
function angleToSlot(ang) {
  const k = Math.round((ang - (3 * Math.PI) / 2) / (Math.PI / 6));
  return ((k % 12) + 12) % 12;
}

/** rad → 시계 방위 표기 (12시 = 위) — 화면 위치 직관화용 */
function slotToClock(ang) {
  // 0=3시(+x) 시계방향. 12시 = -90°. 시계 숫자로 환산
  const deg = (((ang * 180) / Math.PI) % 360 + 360) % 360;
  const hour = (((Math.round(deg / 30) + 3) % 12) + 12) % 12;
  return `${hour === 0 ? 12 : hour}시`;
}

/**
 * 이름 → 가역 LogogramModel (buildModel과 동일 스키마).
 *
 * @param {string} name - 입력 이름
 * @returns {object} 모델 (model.meta.overflow로 용량 초과 표시)
 */
export function buildModelReversible(name) {
  const {
    buckets, interrogative, overflow, n, tokenCount,
  } = encodeReversible(name);
  const rng = prngFromN(n);

  // ── 데이터 채널 → 시각 특징 (복원 가능) ──
  const harmBuckets = [buckets.harm1, buckets.harm2, buckets.harm3];
  const harmonics = [1, 2, 3].map((k, i) => ({
    k,
    amp: AMP_MIN + harmBuckets[i] * AMP_STEP,
    phase: rng() * TWO_PI, // 위상은 장식
  }));

  const gap = buckets.gapState === 0
    ? null
    : { ang: ((buckets.gapState - 1) / 16) * TWO_PI, half: GAP_HALF };

  const strandCount = 3 + buckets.strand;
  const strands = Array.from({ length: strandCount }, () => ({
    off: (rng() - 0.5) * 2,
    w: 0.5 + rng() * 0.65,
    a: 0.22 + rng() * 0.42,
    wobPh: rng() * TWO_PI,
    thin: rng() * 0.5,
  }));

  const weightCenterAngle = (buckets.weightSlot / 24) * TWO_PI; // 24-bin 데이터

  const clusterCount = buckets.clusterCount; // intToBuckets가 도출한 셀 개수(1~3)
  const cells = [buckets.c0, buckets.c1, buckets.c2];
  const clusters = [];
  for (let i = 0; i < clusterCount; i += 1) {
    const d = decodeClusterCell(cells[i] || 0); // 셀 0..767 모두 유효한 클러스터
    const jitter = (rng() - 0.5) * (Math.PI / 6) * 0.55; // 슬롯 내 장식 지터
    clusters.push({
      ang: slotAngle(d.slot) + jitter,
      I: 0.55 + rng() * 0.6, // 강도 = 장식 (크기/번짐)
      dirBias: d.dir === 1 ? 1 : -1, // 방향 = 데이터
      spikeN: d.spikeN,
      coneSpread: 0.6 + rng() * 0.7,
      ph: rng() * TWO_PI,
      type: TYPES[d.type],
      slot: d.slot,
    });
  }
  const main = clusters.reduce((a, b) => (b.I > a.I ? b : a), clusters[0]);

  // ── 표현 채널 (정보 0) ──
  const pressure = [
    { k: 1, amp: 0.38 + rng() * 0.25, phase: rng() * TWO_PI },
    { k: 2, amp: 0.18 + rng() * 0.18, phase: rng() * TWO_PI },
    { k: 3, amp: 0.08 + rng() * 0.12, phase: rng() * TWO_PI },
  ];
  const spreadPh = rng() * TWO_PI;
  const dropZones = Array.from({ length: 2 }, () => ({
    ang: rng() * TWO_PI, width: 0.05 + rng() * 0.08, strength: 0.45 + rng() * 0.5,
  }));
  const inkLoads = Array.from({ length: 1 + Math.floor(rng() * 2) }, () => ({
    ang: rng() * TWO_PI, width: 0.34 + rng() * 0.5, strength: 0.8 + rng() * 0.7,
  }));

  // ── 호환 필드 (overlay/readout) ──
  const ring = {
    radius: 1,
    ellipticity: 1,
    harmonics,
    weightCenterAngle,
    strokeWidth: {
      min: 0.02, base: 0.04, peak: 0.22, peakAngle: weightCenterAngle, peakSigma: 0.5,
    },
  };
  const slots = Array.from({ length: 12 }, (_, i) => ({
    index: i, angle: slotAngle(i), active: false, branchIndex: null,
  }));
  const branches = clusters.map((c, i) => ({
    index: i, type: c.type, slotIndex: c.slot, angle: c.ang, intensity: c.I,
  }));
  branches.forEach((b) => {
    const slot = slots[b.slotIndex];
    if (slot && !slot.active) {
      slot.active = true;
      slot.branchIndex = b.index;
    }
  });

  let qHook = null;
  if (interrogative) {
    const q = prngFromN(n ^ 0x51n);
    qHook = { ang: q() * TWO_PI, curl: q() > 0.5 ? 1 : -1, len: 24 + q() * 12 };
  }

  return {
    meta: {
      name,
      hash: Number(n % 4294967296n),
      hashHex: (Number(n % 4294967296n) >>> 0).toString(16).padStart(8, '0').toUpperCase(),
      nfdCount: tokenCount,
      clusterCount,
      reversible: true,
      overflow,
    },
    ring,
    slots,
    branches,
    jamo: [],
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

/**
 * 가역 모델 → 원본 이름 복원 (형태 데이터에서 역양자화).
 *
 * @param {object} model - buildModelReversible 산출물
 * @returns {{ name: string, interrogative: boolean }} 복원 결과
 */
/**
 * 형태 모델 → 버킷(혼합진법 자릿수) 역양자화. decode/inspect 공용.
 *
 * @param {object} model - buildModelReversible 산출물
 * @returns {object} 버킷
 */
function modelToBuckets(model) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const ampBucket = (amp) => clamp(Math.round((amp - AMP_MIN) / AMP_STEP), 0, RADII.harm1 - 1);
  const buckets = {
    harm1: ampBucket(model.harmonics[0].amp),
    harm2: ampBucket(model.harmonics[1].amp),
    harm3: ampBucket(model.harmonics[2].amp),
    gapState: model.gap ? (Math.round((model.gap.ang / TWO_PI) * 16) % 16) + 1 : 0,
    strand: clamp(model.strands.length - 3, 0, RADII.strand - 1),
    weightSlot: ((Math.round((model.ring.weightCenterAngle / TWO_PI) * 24) % 24) + 24) % 24,
    clusterCount: model.clusters.length,
    c0: 0,
    c1: 0,
    c2: 0,
  };
  const keys = ['c0', 'c1', 'c2'];
  model.clusters.forEach((c, i) => {
    if (i > 2) return;
    buckets[keys[i]] = encodeClusterCell({
      type: TYPES.indexOf(c.type),
      spikeIdx: clamp(c.spikeN - 6, 0, 7),
      slot: angleToSlot(c.ang),
      dir: c.dirBias === 1 ? 1 : 0,
    });
  });
  return buckets;
}

/**
 * 가역 모델 → 원본 이름 복원 (형태 데이터에서 역양자화).
 *
 * @param {object} model - buildModelReversible 산출물
 * @returns {{ name: string, interrogative: boolean }} 복원 결과
 */
export function decode(model) {
  const n = bucketsToInt(modelToBuckets(model));
  const name = tokensToText(intToTokens(n));
  const interrogative = !!model.questionHook;
  return { name: interrogative ? `${name}?` : name, interrogative };
}

/**
 * decode 직전의 raw 데이터 전체를 추출 — "자세히 보기" 모달용.
 * 버킷(혼합진법 자릿수) → N(정수) → 토큰(자모/문자) → 이름의 전 과정을 노출.
 *
 * @param {object} model - buildModelReversible 산출물
 * @returns {object} raw 추적 데이터
 */
export function inspect(model) {
  const buckets = modelToBuckets(model);
  const n = bucketsToInt(buckets);
  const tokens = intToTokens(n);
  const baseName = tokensToText(tokens);
  const interrogative = !!model.questionHook;

  // 데이터 채널 — 각 버킷이 "만드는 형태(visual)"와 "화면 위치(where)"를 함께
  const fixed = [
    {
      field: 'harm1·2·3', value: `${buckets.harm1}·${buckets.harm2}·${buckets.harm3}`, radix: RADII.harm1, visual: '링 굴곡 (k1/k2/k3 물결)', where: '원이 일그러진 정도',
    },
    {
      field: 'gapState', value: buckets.gapState, radix: RADII.gapState, visual: buckets.gapState === 0 ? '닫힌 링' : '링 개구부', where: buckets.gapState === 0 ? '끊김 없음' : `${slotToClock(((buckets.gapState - 1) / 16) * TWO_PI)} 방향 끊김`,
    },
    {
      field: 'strand', value: buckets.strand, radix: RADII.strand, visual: `멀티 스트랜드 ${3 + buckets.strand}가닥`, where: '붓의 평행 결',
    },
    {
      field: 'weightSlot', value: buckets.weightSlot, radix: RADII.weightSlot, visual: '잉크 무게중심', where: `${slotToClock((buckets.weightSlot / 24) * TWO_PI)} 쪽이 두껍게 고임`,
    },
  ];

  const clusterCells = model.clusters.map((c, i) => {
    const cell = buckets[`c${i}`] || 0;
    const d = decodeClusterCell(cell);
    return {
      index: i,
      cell,
      type: c.type,
      spikeN: d.spikeN,
      slot: d.slot,
      dir: d.dir === 1 ? 'out' : 'in',
      visual: `${c.type} 덩어리 · 가시 ${d.spikeN}`,
      where: `${slotToClock(c.ang)} ${d.dir === 1 ? '바깥' : '안쪽'} 폭발`,
    };
  });

  const tokenList = tokens.map((idx) => ({
    idx,
    char: toDisplayChar(String.fromCodePoint(ALPHA_CODES[idx])), // 호환 자모로 읽기 쉽게
  }));

  // ② 위치값 진법 합산 — N = Σ (문자번호+1)·K^i (전단사, 손실 0)
  const radixK = K;
  const nExpr = tokens.length
    ? tokens.map((t, i) => (i === 0 ? `(${t}+1)` : `(${t}+1)·${K}^${i}`)).join(' + ')
    : '0';

  return {
    name: interrogative ? `${baseName}?` : baseName,
    interrogative,
    overflow: !!model.meta.overflow,
    nfd: model.meta.name.normalize('NFD').replace(/[?？]/g, ''),
    radixK,
    nExpr,
    n: n.toString(),
    nHex: `0x${n.toString(16).toUpperCase()}`,
    bitLength: n.toString(2).length,
    clusterCount: model.clusters.length,
    fixed,
    clusterCells,
    tokens: tokenList,
  };
}

export default buildModelReversible;
