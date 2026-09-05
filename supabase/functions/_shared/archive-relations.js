import { RELATION_ALGORITHM_VERSION, relateGlyphs } from '../../../src/utils/heptapod/relateGlyphs.js';
import { extractGlyphFeatures } from '../../../src/utils/heptapod/extractGlyphFeatures.js';
import { groupResonanceRows } from '../../../src/utils/heptapod/resonanceView.js';
import { ArchiveError } from './archive-http.js';
import { assertComparableGlyph } from './archive-model.js';

const SAMPLE_LIMIT = 300;
const PUBLIC_COLUMNS = 'id,canonical_name,is_interrogative,encoder_version,model_data,contour_primary,contour_quadrant,contour_label,is_public,created_at';

/** Compute only from actual public, stored models. This is a bounded candidate sample. */
export async function computePublicRelations(client, glyphId) {
  const { data: center, error: centerError } = await client.from('glyphs').select(PUBLIC_COLUMNS)
    .eq('id', glyphId).eq('is_public', true).maybeSingle();
  if (centerError) throw new ArchiveError('중심 표식을 불러오지 못했습니다.', 503);
  if (!center) throw new ArchiveError('공개된 표식을 찾을 수 없습니다.', 404);
  try { assertComparableGlyph(center); extractGlyphFeatures(center.model_data); }
  catch { throw new ArchiveError('이 표식의 형상 데이터를 확인하지 못했습니다.', 422); }

  const publicQuery = () => client.from('glyphs').select(PUBLIC_COLUMNS).eq('is_public', true)
    .neq('id', glyphId).order('created_at', { ascending: false }).order('id', { ascending: false });
  const results = await Promise.all([
    publicQuery().limit(200),
    client.from('glyph_relations').select('glyph_a_id,glyph_b_id').eq('glyph_a_id', glyphId).limit(50),
    client.from('glyph_relations').select('glyph_a_id,glyph_b_id').eq('glyph_b_id', glyphId).limit(50),
  ]);
  if (results.some((result) => result.error)) throw new ArchiveError('관계 후보를 불러오지 못했습니다. 다시 시도해 주세요.', 503);
  const candidates = new Map();
  for (const glyph of results[0].data || []) candidates.set(glyph.id, glyph);
  // Old relation rows supply IDs only. Their type, score and explanation are never replayed.
  const storedNeighborIds = [...new Set(results.slice(1).flatMap((result) => (result.data || []).map((row) =>
    row.glyph_a_id === glyphId ? row.glyph_b_id : row.glyph_a_id)))];
  if (storedNeighborIds.length) {
    const { data, error } = await client.from('glyphs').select(PUBLIC_COLUMNS)
      .eq('is_public', true).in('id', storedNeighborIds);
    if (error) throw new ArchiveError('기존 연결의 표식을 확인하지 못했습니다.', 503);
    for (const glyph of data || []) candidates.set(glyph.id, glyph);
  }

  const pairs = [];
  let skippedModels = 0;
  for (const neighbor of [...candidates.values()].slice(0, SAMPLE_LIMIT)) {
    let matches;
    try { assertComparableGlyph(neighbor); matches = relateGlyphs(center, neighbor); }
    catch { skippedModels += 1; continue; }
    if (!matches.length) continue;
    pairs.push({ neighbor, matches });
  }
  const computedAt = new Date().toISOString();
  const rawRows = pairs.flatMap(({ neighbor, matches }) => matches.map((match) => ({
    id: `${glyphId}:${neighbor.id}:${match.relationType}:v${RELATION_ALGORITHM_VERSION}`,
    glyph_a_id: match.sourceId || glyphId,
    glyph_b_id: match.targetId || neighbor.id,
    relation_type: match.relationType,
    score: match.score,
    score_components: match.components,
    reasons: match.reasons,
    evidence: match.evidence,
    algorithm_version: match.algorithmVersion,
    is_directed: match.directed,
    computed_at: computedAt,
    evidence_source: 'current-sample',
    neighborGlyph: neighbor,
    direction: match.sourceId === neighbor.id ? 'reverse' : 'forward',
  })));
  // Allocate distinct neighbors by kind, comparing scores only within one kind.
  // Keep every original evidence row for each selected neighbor.
  const selectedIds = new Set(groupResonanceRows(rawRows, { limit: 24 }).map((neighbor) => neighbor.id));
  const relations = rawRows.filter((row) => selectedIds.has(row.neighborGlyph.id));
  return {
    relations,
    mappingStatus: skippedModels ? 'partial-sample' : 'current-sample',
    sampleSize: Math.min(candidates.size, SAMPLE_LIMIT),
    sampleLimit: SAMPLE_LIMIT,
    skippedModels,
    candidateSources: ['recent-public', 'stored-neighbor-models'],
    algorithmVersion: RELATION_ALGORITHM_VERSION,
    computedAt,
  };
}
