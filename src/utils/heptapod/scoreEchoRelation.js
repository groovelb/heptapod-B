/**
 * Heptapod B — ECHO 관계 스코어링 (문자·자모 메아리)
 *
 * 두 canonical name의 grapheme·bigram·token 유사도를 계산한다.
 * 수식·가중치·임계값은 02-ux-flow.md §Resonance §ECHO 그대로.
 * 순수 함수, 외부 의존성 0, Levenshtein 직접 구현.
 *
 * @see docs/heptapod-b-encoder/02-ux-flow.md — §2. ECHO — 문자·자모 메아리
 */

/**
 * Levenshtein distance (Wagner–Fischer, O(mn) DP).
 *
 * @param {string[]} a - 시퀀스 A
 * @param {string[]} b - 시퀀스 B
 * @returns {number} 편집 거리
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);

  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * 문자열 → grapheme 배열 (NFC). 한글은 음절 단위, 영문은 case-fold.
 *
 * @param {string} name - canonical name
 * @returns {string[]} grapheme 배열
 */
function toGraphemes(name) {
  const normalized = name.toLowerCase().normalize('NFC');
  return Array.from(new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(normalized), (part) => part.segment);
}

/**
 * 문자열 → NFD 자모 배열 (한글 분해, 영문 case-fold).
 *
 * @param {string} name - canonical name
 * @returns {string[]} 자모/문자 배열
 */
function toJamo(name) {
  return Array.from(name.toLowerCase().normalize('NFD'));
}

/**
 * 문자열 → bigram 배열.
 * 한글은 NFD 자모 bigram, 영문은 case-fold bigram.
 *
 * @param {string} name - canonical name
 * @returns {string[]} bigram 배열
 */
function toBigrams(name) {
  const units = toJamo(name);
  const bigrams = [];
  for (let i = 0; i < units.length - 1; i += 1) {
    if (/^[\p{L}\p{M}\p{N}]+$/u.test(units[i] + units[i + 1])) {
      bigrams.push(units[i] + units[i + 1]);
    }
  }
  return bigrams;
}

/**
 * 문자열 → 공백 구분 토큰 (case-fold).
 *
 * @param {string} name - canonical name
 * @returns {string[]} 토큰 배열
 */
function toTokens(name) {
  return name.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

/**
 * 집합 교집합.
 *
 * @param {Set} setA
 * @param {Set} setB
 * @returns {Set}
 */
function intersection(setA, setB) {
  const result = new Set();
  for (const item of setA) {
    if (setB.has(item)) result.add(item);
  }
  return result;
}

/**
 * multiset에서 공유 원소의 IDF 가중 유사도.
 * idfMap이 없으면 모든 원소 IDF=1 (균등 가중).
 *
 * @param {string[]} arrA - 원소 배열 A
 * @param {string[]} arrB - 원소 배열 B
 * @param {Map<string, number>|null} idfMap - bigram/token → IDF weight
 * @returns {{ similarity: number, shared: string[] }}
 */
function idfWeightedSimilarity(arrA, arrB, idfMap) {
  const countA = new Map();
  const countB = new Map();
  for (const x of arrA) countA.set(x, (countA.get(x) || 0) + 1);
  for (const x of arrB) countB.set(x, (countB.get(x) || 0) + 1);

  const allKeys = new Set([...countA.keys(), ...countB.keys()]);
  let numerator = 0;
  let denominator = 0;
  const shared = [];

  for (const key of allKeys) {
    const cA = countA.get(key) || 0;
    const cB = countB.get(key) || 0;
    const candidateWeight = idfMap ? (idfMap.get(key) ?? 1) : 1;
    const w = Number.isFinite(candidateWeight) && candidateWeight > 0 ? candidateWeight : 1;
    const minC = Math.min(cA, cB);
    const maxC = Math.max(cA, cB);
    numerator += minC * w;
    denominator += maxC * w;
    if (minC > 0) shared.push(key);
  }

  return {
    similarity: denominator > 0 ? numerator / denominator : 0,
    shared,
  };
}

/** ECHO 임계값 */
const ECHO_THRESHOLD = 0.72;

/** 노드당 최대 ECHO 관계 수 */
export const ECHO_MAX_PER_NODE = 4;

/**
 * ECHO 관계 점수 계산.
 *
 * ECHO =
 *   0.45 × normalizedGraphemeEditSimilarity
 * + 0.35 × IDFWeightedBigramSimilarity
 * + 0.20 × IDFWeightedTokenSimilarity
 *
 * @param {string} nameA - canonical name [Required]
 * @param {string} nameB - canonical name [Required]
 * @param {Map<string, number>|null} idfMap - bigram/token → IDF weight [Optional]
 * @returns {{
 *   score: number,
 *   components: {
 *     graphemeEditSim: number,
 *     bigramSim: number,
 *     tokenSim: number,
 *     sharedGraphemes: string[],
 *     sharedBigrams: string[]
 *   },
 *   pass: boolean
 * }}
 *
 * Example usage:
 * const result = scoreEchoRelation('Louise', 'Louis');
 * if (result.pass) { /* ECHO >= 0.72 + 공유 존재 *\/ }
 */
export function scoreEchoRelation(nameA, nameB, idfMap = null) {
  const graphA = toGraphemes(nameA);
  const graphB = toGraphemes(nameB);
  const maxLen = Math.max(graphA.length, graphB.length);
  const graphemeEditSim = maxLen === 0 ? 1 : 1 - levenshtein(graphA, graphB) / maxLen;

  const bigramsA = toBigrams(nameA);
  const bigramsB = toBigrams(nameB);
  const bigramResult = idfWeightedSimilarity(bigramsA, bigramsB, idfMap);

  const tokensA = toTokens(nameA);
  const tokensB = toTokens(nameB);
  const tokenResult = idfWeightedSimilarity(tokensA, tokensB, idfMap);

  const meaningful = (grapheme) => /[\p{L}\p{N}]/u.test(grapheme);
  const contentA = new Set(graphA.filter(meaningful));
  const contentB = new Set(graphB.filter(meaningful));
  const sharedGraphemes = [...intersection(contentA, contentB)].sort();
  const sharedCoverage = sharedGraphemes.length / Math.max(1, Math.min(contentA.size, contentB.size));

  const score =
    0.45 * graphemeEditSim +
    0.35 * bigramResult.similarity +
    0.20 * tokenResult.similarity;

  const hasSharedContent = sharedGraphemes.length > 0 || bigramResult.shared.length > 0;
  const similar = score >= ECHO_THRESHOLD && hasSharedContent;
  // A short name can share a real syllable despite a low whole-name similarity.
  // Keep the low score and explicitly identify this as fragment evidence.
  const sharedFragment = sharedGraphemes.length > 0 && sharedCoverage >= 0.35
    && (Math.min(contentA.size, contentB.size) <= 3 || sharedGraphemes.length >= 2);

  return {
    score,
    components: {
      graphemeEditSim,
      bigramSim: bigramResult.similarity,
      tokenSim: tokenResult.similarity,
      sharedGraphemes,
      sharedBigrams: bigramResult.shared.sort(),
      sharedTokens: tokenResult.shared.filter((token) => /[\p{L}\p{N}]/u.test(token)).sort(),
      sharedCoverage,
      level: similar ? 'similar' : sharedFragment ? 'shared-fragment' : 'none',
    },
    pass: similar || sharedFragment,
  };
}

export { ECHO_THRESHOLD, toGraphemes };
export default scoreEchoRelation;
