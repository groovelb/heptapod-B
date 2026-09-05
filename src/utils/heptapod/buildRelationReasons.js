/** One wording source for comparison, numbered observations and share cards. */
const CLUSTER_TYPE_LABELS = { blob: '응집형', spike: '방사형', wisp: '흐름형', hook: '갈고리형' };
const QUADRANT_LABELS = { Crown: '상단', Wake: '우측', Root: '하단', Veil: '좌측' };

export function buildRelationReasons(relationType, components = {}) {
  if (!['FORM', 'VARIANT'].includes(relationType)) return [];
  return (components.observations || [])
    .filter((observation) => typeof observation.reason === 'string' && observation.reason.length > 0)
    .slice(0, 4).map((observation) => observation.reason);
}
export { CLUSTER_TYPE_LABELS, QUADRANT_LABELS };
