import { sourceText as t } from '../../i18n/messages.js';
/**
 * Heptapod B — CONTEXT 관계 스코어링 (사용자 맥락)
 *
 * 두 Glyph의 제한 태그(최대 3개)를 IDF weighted Jaccard로 비교한다.
 * 수식·조건은 02-ux-flow.md §Resonance §CONTEXT 그대로.
 * 순수 함수, 외부 의존성 0.
 *
 * @see docs/heptapod-b-encoder/02-ux-flow.md — §3. CONTEXT — 사용자 맥락
 */

/** 관계 계산에서 제외하는 일반 태그 (거의 모두에게 해당) */
const GENERIC_TAGS = new Set([t('scoreContextRelation.person'), t('glyphNode.name'), 'person', 'name']);

/** 노드당 최대 CONTEXT 관계 수 */
export const CONTEXT_MAX_PER_NODE = 3;

/**
 * 일반 태그를 제외한 구체 태그만 필터.
 *
 * @param {string[]} tags - 원본 태그 배열
 * @returns {string[]} 구체 태그 배열
 */
function filterSpecific(tags) {
  return tags.filter((t) => !GENERIC_TAGS.has(t.toLowerCase()));
}

/**
 * IDF weighted Jaccard 유사도.
 * idfMap이 없으면 모든 태그 IDF=1 (균등 가중).
 *
 * Jaccard = Σ min(wA, wB) / Σ max(wA, wB)
 * 여기서 w = idf(tag) × count(tag in set)
 * 제한 태그는 중복 없이 최대 3개이므로 count는 0 또는 1.
 *
 * @param {string[]} tagsA - 구체 태그 A
 * @param {string[]} tagsB - 구체 태그 B
 * @param {Map<string, number>|null} idfMap - tag → IDF weight
 * @returns {{ score: number, shared: string[] }}
 */
function idfWeightedJaccard(tagsA, tagsB, idfMap) {
  const setA = new Set(tagsA);
  const setB = new Set(tagsB);
  const allTags = new Set([...setA, ...setB]);

  let numerator = 0;
  let denominator = 0;
  const shared = [];

  for (const tag of allTags) {
    const inA = setA.has(tag) ? 1 : 0;
    const inB = setB.has(tag) ? 1 : 0;
    const w = idfMap ? (idfMap.get(tag) ?? 1) : 1;
    numerator += Math.min(inA, inB) * w;
    denominator += Math.max(inA, inB) * w;
    if (inA && inB) shared.push(tag);
  }

  return {
    score: denominator > 0 ? numerator / denominator : 0,
    shared,
  };
}

/**
 * CONTEXT 관계 점수 계산.
 *
 * 연결 조건:
 * - 구체 태그 2개 이상 공유, 또는
 * - 구체 태그 1개 공유 + FORM 또는 ECHO 기준 통과
 *
 * @param {string[]} tagsA - context tags (최대 3개) [Required]
 * @param {string[]} tagsB - context tags (최대 3개) [Required]
 * @param {Map<string, number>|null} idfMap - tag → IDF weight [Optional]
 * @param {object} otherRelations - { formPass: boolean, echoPass: boolean } [Optional]
 * @returns {{
 *   score: number,
 *   sharedTags: string[],
 *   pass: boolean
 * }}
 *
 * Example usage:
 * const result = scoreContextRelation(['기억', '감각'], ['기억', '의도'], null, { formPass: true });
 */
export function scoreContextRelation(tagsA, tagsB, idfMap = null, otherRelations = {}) {
  const { formPass = false, echoPass = false } = otherRelations;

  const specificA = filterSpecific(tagsA || []);
  const specificB = filterSpecific(tagsB || []);

  if (specificA.length === 0 || specificB.length === 0) {
    return { score: 0, sharedTags: [], pass: false };
  }

  const { score, shared } = idfWeightedJaccard(specificA, specificB, idfMap);

  const pass =
    shared.length >= 2 ||
    (shared.length === 1 && (formPass || echoPass));

  return { score, sharedTags: shared, pass };
}

export { GENERIC_TAGS };
export default scoreContextRelation;
