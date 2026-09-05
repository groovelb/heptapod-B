/** Stable, distinct public neighbors shared by list, graph and detail views. */
const PRIORITY = { FORM: 0, VARIANT: 1 };
const OBSERVATION_KINDS = new Set(['branch', 'opening', 'ink', 'ring', 'question']);

/** The same measured evidence feeds list copy, comparison annotations and filters. */
export function getMorphologyObservations(relation) {
  const observations = relation?.evidence?.observations
    ?? relation?.components?.observations ?? relation?.score_components?.observations ?? [];
  if (!Array.isArray(observations)) return [];
  return observations.filter((item) => OBSERVATION_KINDS.has(item?.kind)
    && typeof item.reason === 'string' && item.reason.trim()
    && [item.anchorA, item.anchorB].every((anchor) => Number.isFinite(anchor?.ang)
      && (anchor.half == null || (Number.isFinite(anchor.half) && anchor.half >= 0 && anchor.half <= Math.PI))));
}

/** Do not revive old alphabet edges or unlabeled v2 scores when switching to API. */
export function isMorphologyRelation(relation) {
  if ((relation?.algorithmVersion ?? relation?.algorithm_version ?? 0) < 3) return false;
  const kind = relation.relationType ?? relation.relation_type;
  if (kind === 'VARIANT') return relation.evidence?.basis === 'rendered-variant';
  return kind === 'FORM' && relation.evidence?.basis === 'rendered-form'
    && ['whole-form', 'shared-motif'].includes(relation.evidence?.level)
    && getMorphologyObservations(relation).some((item) => item.kind !== 'question');
}

export function morphologyRelationLabel(relation) {
  if (relation?.relationType === 'VARIANT') return '질문의 변주';
  return (relation?.evidence?.level ?? relation?.components?.level) === 'whole-form'
    ? '전체 형태의 공명' : '일부 구조의 공명';
}

export function glyphLabel(glyph) {
  if (!glyph) return '';
  const body = glyph.canonical_name || glyph.model_data?.meta?.canonicalName || '';
  return `${body}${glyph.is_interrogative && !body.endsWith('?') ? '?' : ''}`;
}

export function groupResonanceRows(rows = [], { limit = 12, types = [], kinds = [] } = {}) {
  const groups = new Map();
  for (const row of rows) {
    const glyph = row.neighborGlyph;
    const kind = row.relation_type || row.relationType;
    if (!glyph?.id || glyph.is_public === false || !isMorphologyRelation(row)) continue;
    if (types.length && !types.includes(kind)) continue;
    const observations = getMorphologyObservations(row);
    if (kinds.length && !observations.some((item) => kinds.includes(item.kind))) continue;
    // A selected morphology facet leads its own explanation, without discarding
    // the other measured observations for this pair.
    const ordered = kinds.length ? [...observations].sort((a, b) =>
      Number(kinds.includes(b.kind)) - Number(kinds.includes(a.kind))) : observations;
    const relation = {
      relationType: kind, score: row.score, reasons: ordered.length ? ordered.map((item) => item.reason) : row.reasons || [],
      components: { ...(row.score_components || row.components || {}), observations: ordered },
      evidence: { ...row.evidence, observations: ordered }, algorithmVersion: row.algorithm_version || row.algorithmVersion,
      direction: row.direction, sourceId: row.glyph_a_id, targetId: row.glyph_b_id,
    };
    if (!groups.has(glyph.id)) {
      groups.set(glyph.id, { id: glyph.id, name: glyphLabel(glyph), model: glyph.model_data, neighborGlyph: glyph, relations: [] });
    }
    const group = groups.get(glyph.id);
    if (!group.relations.some((item) => item.relationType === kind)) group.relations.push(relation);
  }
  const neighbors = [...groups.values()].map((group) => {
    group.relations.sort((a, b) => (PRIORITY[a.relationType] ?? 9) - (PRIORITY[b.relationType] ?? 9));
    return { ...group, ...group.relations[0] };
  });
  // Whole-form and local-motif scores measure different things. Rank within
  // each level/observed structure, then alternate available buckets.
  const buckets = new Map();
  for (const neighbor of neighbors) {
    const key = neighbor.relationType === 'VARIANT' ? 'VARIANT'
      : `FORM:${neighbor.evidence.level || 'shared-motif'}:${getMorphologyObservations(neighbor)[0]?.kind}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(neighbor);
  }
  const rankScore = (neighbor) => neighbor.evidence.level === 'shared-motif'
    ? neighbor.components.motifScore ?? neighbor.score ?? 0 : neighbor.score ?? 0;
  for (const bucket of buckets.values()) bucket.sort((a, b) => rankScore(b) - rankScore(a) || a.id.localeCompare(b.id));
  const keys = [...buckets.keys()].sort((a, b) =>
    (PRIORITY[a.split(':')[0]] ?? 9) - (PRIORITY[b.split(':')[0]] ?? 9)
    || Number(b.includes('whole-form')) - Number(a.includes('whole-form')) || a.localeCompare(b));
  const selected = [];
  while (selected.length < limit && keys.some((key) => buckets.get(key).length)) {
    for (const key of keys) {
      const next = buckets.get(key).shift();
      if (next && selected.length < limit) selected.push(next);
    }
  }
  return selected;
}
