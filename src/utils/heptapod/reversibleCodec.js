/**
 * Heptapod B Encoder — 가역 코덱 (정보 보존 인코딩)
 *
 * 비가역 원본(xmur3 해시 + 나머지 매핑)과 달리, 이름을 손실 없이 정수 N으로
 * 전단사(bijective) 매핑하고, N을 시각 파라미터의 "버킷(=혼합진법 자릿수)"으로
 * 분해한다. buildModelReversible이 그 버킷으로 형태를 만들고, decode가 형태
 * 데이터에서 버킷을 역양자화해 N → 이름으로 정확히 복원한다.
 *
 * 복원 경로는 픽셀이 아니라 형태 데이터(모델)다 — 그래서 잉크 번짐·갈필·연기
 * 같은 표현 채널은 정보를 담지 않는 순수 장식으로 남아 비주얼 컨셉이 보존된다.
 *
 * 전부 결정론·BigInt(정밀). 외부 라이브러리 0.
 */

/** 고정 알파벳 — NFD 자모(초19+중21+종27) + Latin(52) + digit(10) + space. 순서 불변(코드값) */
function buildAlphabet() {
  const codes = [32]; // space
  for (let c = 0x1100; c <= 0x1112; c += 1) codes.push(c); // 초성 19
  for (let c = 0x1161; c <= 0x1175; c += 1) codes.push(c); // 중성 21
  for (let c = 0x11a8; c <= 0x11c2; c += 1) codes.push(c); // 종성 27
  for (let c = 65; c <= 90; c += 1) codes.push(c); // A–Z
  for (let c = 97; c <= 122; c += 1) codes.push(c); // a–z
  for (let c = 48; c <= 57; c += 1) codes.push(c); // 0–9
  return codes;
}

const ALPHA_CODES = buildAlphabet();
/** 알파벳 크기 (K) */
export const K = ALPHA_CODES.length;
const CODE_TO_IDX = new Map(ALPHA_CODES.map((code, i) => [code, i]));

// 결합 자모(conjoining, U+1100~) → 호환 자모(ㄱㅏㅁ…) 표시용 매핑.
// 결합 자모는 단독 표시 시 떨어져 보이므로 읽기 쉬운 호환 자모로만 바꿔 보여준다.
// (인코딩·인덱스는 결합 자모 코드 그대로 — 표시 전용)
const CHO_COMPAT = Array.from('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ');
const JUNG_COMPAT = Array.from('ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ');
const JONG_COMPAT = Array.from('ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ');

/**
 * 결합 자모 문자 → 읽기 쉬운 호환 자모 (그 외 문자는 그대로). 표시 전용.
 *
 * @param {string} ch - 한 글자
 * @returns {string} 호환 자모 또는 원본
 */
export function toDisplayChar(ch) {
  const c = ch.codePointAt(0);
  if (c >= 0x1100 && c <= 0x1112) return CHO_COMPAT[c - 0x1100];
  if (c >= 0x1161 && c <= 0x1175) return JUNG_COMPAT[c - 0x1161];
  if (c >= 0x11a8 && c <= 0x11c2) return JONG_COMPAT[c - 0x11a8];
  return ch;
}

/**
 * 혼합진법 자릿수 정의 (각 시각 버킷의 상태 수). 곱이 곧 용량.
 * 순서 = 의미 고정. buildModelReversible / decode가 이 순서로 읽고 쓴다.
 *
 * 데이터 운반처는 전부 "이미 존재하는 시각 특징"의 양자화다 → 새 형태 요소 0.
 */
export const RADII = Object.freeze({
  harm1: 8, // 링 하모닉 k1 진폭 단계
  harm2: 8, // k2
  harm3: 8, // k3
  gapState: 17, // gap 닫힘(0) + 16방위 위치
  strand: 3, // strand 수 (3~5)
  weightSlot: 24, // 무게중심 슬롯 (반슬롯 해상도)
});
/** 고정 자릿수 순서 (낮은 자리 → 높은 자리). 이후 나머지가 클러스터 셀로 분해되며
 *  클러스터 개수(1~3)는 "필요한 셀 수"로 도출된다 — 형태에서 클러스터를 세면 복원됨 */
const FIXED_ORDER = ['harm1', 'harm2', 'harm3', 'gapState', 'strand', 'weightSlot'];

/** 클러스터 셀 내부 진법 — 유형4 × 가시8 × 슬롯12 × 방향2 = 768 (항상 유효) */
const CL = Object.freeze({ TYPE: 4, SPIKE: 8, SLOT: 12, DIR: 2 });
/** 클러스터 셀 진법(상태 수) */
export const CLUSTER_RADIX = CL.TYPE * CL.SPIKE * CL.SLOT * CL.DIR; // 768
/** 최대 클러스터 수 */
export const MAX_CLUSTERS = 3;

/**
 * 용량(비트) — 고정 자릿수 + 최대 클러스터 셀.
 *
 * @returns {number} 표현 가능한 최대 비트 수
 */
export function capacityBits() {
  let bits = 0;
  for (const key of FIXED_ORDER) bits += Math.log2(RADII[key]);
  bits += MAX_CLUSTERS * Math.log2(CLUSTER_RADIX);
  return bits;
}

/**
 * 이름 → 토큰 인덱스 배열 (NFD 분해, 알파벳 밖 문자는 제외). '?'는 분리.
 *
 * @param {string} name - 입력 이름
 * @returns {{ tokens: number[], interrogative: boolean }} 토큰과 의문 플래그
 */
export function textToTokens(name) {
  const raw = (name || '').normalize('NFD');
  const interrogative = /[?？]/.test(raw);
  const tokens = [];
  for (const ch of raw.replace(/[?？]/g, '')) {
    const idx = CODE_TO_IDX.get(ch.codePointAt(0));
    if (idx !== undefined) tokens.push(idx);
  }
  return { tokens, interrogative };
}

/**
 * 토큰 배열 → BigInt N (전단사 base-K, 길이 내재 — 빈 문자열도 유일).
 * bijective numeration: N = Σ (tokens[i]+1)·K^i.
 *
 * @param {number[]} tokens - 토큰 인덱스 배열
 * @returns {bigint} N
 */
export function tokensToInt(tokens) {
  const base = BigInt(K);
  let n = 0n;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    n = n * base + BigInt(tokens[i] + 1);
  }
  return n;
}

/**
 * BigInt N → 토큰 배열 (tokensToInt의 역).
 *
 * @param {bigint} n - N
 * @returns {number[]} 토큰 인덱스 배열
 */
export function intToTokens(n) {
  const base = BigInt(K);
  const tokens = [];
  let x = n;
  // bijective base-K 디코드 — 나머지 0이면 자리올림 차용(borrow)
  while (x > 0n) {
    let r = x % base;
    if (r === 0n) {
      tokens.push(K - 1);
      x = x / base - 1n;
    } else {
      tokens.push(Number(r) - 1);
      x = (x - r) / base;
    }
  }
  return tokens;
}

/**
 * 토큰 → NFC 문자열 (자모 결합).
 *
 * @param {number[]} tokens - 토큰 인덱스 배열
 * @returns {string} 복원된 문자열 (NFC)
 */
export function tokensToText(tokens) {
  const chars = tokens.map((i) => String.fromCodePoint(ALPHA_CODES[i]));
  return chars.join('').normalize('NFC');
}

/**
 * N → 혼합진법 버킷 객체 (순차: 고정 자릿수 → clusterCount → 그만큼의 클러스터 셀).
 *
 * @param {bigint} n - N
 * @returns {{ buckets: object, overflow: boolean }} 버킷과 용량 초과 여부
 */
export function intToBuckets(n) {
  const buckets = { c0: 0, c1: 0, c2: 0 };
  let x = n;
  for (const key of FIXED_ORDER) {
    const r = BigInt(RADII[key]);
    buckets[key] = Number(x % r);
    x /= r;
  }
  // 나머지를 base-384 클러스터 셀로 분해 — 필요한 만큼만(최소 1, 최대 MAX_CLUSTERS)
  const cr = BigInt(CLUSTER_RADIX);
  let count = 0;
  while (x > 0n && count < MAX_CLUSTERS) {
    buckets[`c${count}`] = Number(x % cr);
    x /= cr;
    count += 1;
  }
  if (count === 0) {
    count = 1; // 나머지 0이어도 클러스터 1개는 둔다 (c0=0)
  }
  buckets.clusterCount = count; // 자릿수가 아니라 도출값
  return { buckets, overflow: x > 0n };
}

/**
 * 버킷 객체 → N (intToBuckets의 역, 순차 동일 순서).
 *
 * @param {object} buckets - 버킷 (clusterCount가 셀 개수를 지배)
 * @returns {bigint} N
 */
export function bucketsToInt(buckets) {
  const count = buckets.clusterCount || 1;
  const cr = BigInt(CLUSTER_RADIX);
  let n = 0n;
  for (let i = count - 1; i >= 0; i -= 1) {
    n = n * cr + BigInt(buckets[`c${i}`] || 0);
  }
  for (let i = FIXED_ORDER.length - 1; i >= 0; i -= 1) {
    const key = FIXED_ORDER[i];
    n = n * BigInt(RADII[key]) + BigInt(buckets[key] || 0);
  }
  return n;
}

/** 클러스터 셀 정수(0..767) → { type, spikeN, slot, dir(0|1) } (항상 유효) */
export function decodeClusterCell(v) {
  let x = v;
  const type = x % CL.TYPE; x = Math.floor(x / CL.TYPE);
  const spike = x % CL.SPIKE; x = Math.floor(x / CL.SPIKE);
  const slot = x % CL.SLOT; x = Math.floor(x / CL.SLOT);
  const dir = x % CL.DIR;
  return { type, spikeN: 6 + spike, slot, dir };
}

/** { type, spikeIdx(0..7), slot, dir(0|1) } → 클러스터 셀 정수(0..767) */
export function encodeClusterCell({ type, spikeIdx, slot, dir }) {
  return ((dir * CL.SLOT + slot) * CL.SPIKE + spikeIdx) * CL.TYPE + type;
}

/**
 * 이름 → 인코딩 결과 (버킷 + 메타). buildModelReversible의 입력.
 *
 * @param {string} name - 입력 이름
 * @returns {{
 *   buckets: object, interrogative: boolean, overflow: boolean,
 *   n: bigint, tokenCount: number
 * }} 인코딩 결과
 */
export function encodeReversible(name) {
  const { tokens, interrogative } = textToTokens(name);
  const n = tokensToInt(tokens);
  const { buckets, overflow } = intToBuckets(n);
  return { buckets, interrogative, overflow, n, tokenCount: tokens.length };
}

export { ALPHA_CODES, CL, FIXED_ORDER };
