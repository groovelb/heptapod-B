import { sourceText as t } from '../../i18n/messages.js';
/** Overlapping, complete-link morphology groups. No names, bins or transitive merging. */
import { assertComparableGlyph } from './assertComparableGlyph.js';
import { extractGlyphFeatures } from './extractGlyphFeatures.js';
import { compareBranchMorphology, scoreFormRelation } from './scoreFormRelation.js';
import { RELATION_ALGORITHM_VERSION } from './relateGlyphs.js';

export const CLUSTER_ALGORITHM_VERSION = 1;
export const CLUSTER_SAMPLE_LIMIT = 200;
export const CLUSTER_GROUP_LIMIT = 96;
const compareKeys = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const pairKey = (a, b) => JSON.stringify([a, b].sort(compareKeys));
const clockAt = (angle) => ((Math.round(angle / (Math.PI / 6)) + 2) % 12 + 12) % 12 + 1;

function* clusterSteps(input) {
  if (!Array.isArray(input)) throw new TypeError(t('clusterArchiveGlyphs.aListOfPublicGlyphsIsNeeded'));
  // Preserve the fetched sample selection, but never use its order to group.
  const publicRows = [...new Map(input.filter((row) => row?.is_public === true && typeof row.id === 'string' && row.id)
    .map((row) => [row.id, row])).values()];
  const rows = publicRows.slice(0, CLUSTER_SAMPLE_LIMIT).sort((a, b) => compareKeys(a.id, b.id));
  const valid = []; const invalidIds = [];
  for (let index = 0; index < rows.length; index += 1) {
    if (index % 8 === 0) yield;
    const glyph = rows[index];
    try { assertComparableGlyph(glyph); valid.push({ glyph, features: extractGlyphFeatures(glyph.model_data) }); }
    catch { invalidIds.push(glyph.id); }
  }
  const families = new Map();
  function addEdge(family, kind, a, b, score, observations, components = {}) {
    if (!families.has(family)) families.set(family, { kind, vertices: new Map(), edges: new Map(), neighbors: new Map() });
    const graph = families.get(family);
    for (const vertex of [a, b]) {
      graph.vertices.set(vertex.key, vertex);
      if (!graph.neighbors.has(vertex.key)) graph.neighbors.set(vertex.key, new Set());
    }
    graph.neighbors.get(a.key).add(b.key);
    graph.neighbors.get(b.key).add(a.key);
    graph.edges.set(pairKey(a.key, b.key), { a: a.key, b: b.key, score, observations, components });
  }
  const vertex = (glyphId, suffix, anchors) => ({ key: JSON.stringify([glyphId, suffix]), glyphId, anchors });
  let comparedPairs = 0;
  for (let i = 0; i < valid.length; i += 1) {
    for (let j = i + 1; j < valid.length; j += 1) {
      if (comparedPairs++ % 128 === 0) yield;
      const a = valid[i]; const b = valid[j];
      const form = scoreFormRelation(a.features, b.features);
      if (form.components.level === 'whole-form') {
        addEdge('whole-form', 'whole-form', vertex(a.glyph.id, 'whole', []), vertex(b.glyph.id, 'whole', []),
          form.score, form.components.observations, form.components);
      }
      for (const left of a.features.clusters) {
        for (const right of b.features.clusters) {
          const match = compareBranchMorphology(left, right);
          if (!match.motif) continue;
          const anchorA = { kind: 'branch', ang: left.ang, clusterIndex: left.clusterIndex };
          const anchorB = { kind: 'branch', ang: right.ang, clusterIndex: right.clusterIndex };
          const reason = t('clusterArchiveGlyphs.theBranchesShareSpikesAndSimilarAngles', { p0: left.dirBias === 1 ? t('clusterArchiveGlyphs.outwardReaching') : t('clusterArchiveGlyphs.inwardFacing'), p1: left.spikeN });
          addEdge(`branch:${left.dirBias}:${left.spikeN}`, 'branch',
            vertex(a.glyph.id, `branch:${left.clusterIndex}`, [anchorA]),
            vertex(b.glyph.id, `branch:${right.clusterIndex}`, [anchorB]), match.score,
            [{ kind: 'branch', reason, similarity: match.score, anchorA, anchorB }],
            { direction: left.dirBias, spikes: left.spikeN, wholeScore: form.score });
        }
      }
      if (form.components.openingInkMotif) {
        const observations = form.components.observations.filter((item) => ['opening', 'ink'].includes(item.kind));
        const ink = observations.find((item) => item.kind === 'ink');
        // A member must use the SAME measured ink peak in every edge of its group.
        addEdge(`opening-ink:${ink.profile}`, 'opening-ink',
          vertex(a.glyph.id, `${ink.profile}:${ink.anchorA.ang}`, observations.map((item) => ({ ...item.anchorA, kind: item.kind }))),
          vertex(b.glyph.id, `${ink.profile}:${ink.anchorB.ang}`, observations.map((item) => ({ ...item.anchorB, kind: item.kind }))),
          Math.min(form.components.gapSim, form.components.inkScore), observations,
          { profile: ink.profile, wholeScore: form.score });
      }
    }
  }
  const groups = [];
  let groupingTruncated = false;
  // Deterministic greedy edge cover. Each group is a clique of actual feature
  // vertices, with one fixed feature per glyph. Not all maximal cliques are claimed.
  for (const [family, graph] of [...families].sort(([a], [b]) => compareKeys(a, b))) {
    const covered = new Set();
    const edges = [...graph.edges.entries()].sort(([ka, a], [kb, b]) => b.score - a.score || compareKeys(ka, kb));
    for (const [key, edge] of edges) {
      if (covered.has(key)) continue;
      if (groups.length >= CLUSTER_GROUP_LIMIT) { groupingTruncated = true; break; }
      yield;
      const members = [edge.a, edge.b];
      const glyphIds = new Set(members.map((id) => graph.vertices.get(id).glyphId));
      const candidates = [...graph.neighbors.get(edge.a)].filter((id) => graph.neighbors.get(edge.b).has(id))
        .sort((a, b) => graph.neighbors.get(b).size - graph.neighbors.get(a).size || compareKeys(a, b));
      for (const candidate of candidates) {
        const glyphId = graph.vertices.get(candidate).glyphId;
        if (!glyphIds.has(glyphId) && members.every((id) => graph.neighbors.get(candidate).has(id))) {
          members.push(candidate); glyphIds.add(glyphId);
        }
      }
      members.sort(compareKeys);
      let minimumSimilarity = 1;
      for (let i = 0; i < members.length; i += 1) {
        for (let j = i + 1; j < members.length; j += 1) {
          const memberKey = pairKey(members[i], members[j]);
          covered.add(memberKey);
          minimumSimilarity = Math.min(minimumSimilarity, graph.edges.get(memberKey).score);
        }
      }
      const representative = graph.vertices.get(members[0]);
      const firstAngle = representative.anchors[0]?.ang;
      const title = graph.kind === 'branch'
        ? t('clusterArchiveGlyphs.nearOClockBranchWithSpikes', { p0: clockAt(firstAngle), p1: edge.components.direction === 1 ? t('clusterArchiveGlyphs.outward') : t('clusterArchiveGlyphs.inward'), p2: edge.components.spikes })
        : graph.kind === 'whole-form' ? t('clusterArchiveGlyphs.glyphsWithSimilarRingsAndBranches')
          : t('clusterArchiveGlyphs.nearOClockOpeningAnd', { p0: clockAt(firstAngle), p1: edge.components.profile === 'pressure' ? t('clusterArchiveGlyphs.pressure') : t('clusterArchiveGlyphs.pooledInk') });
      groups.push({
        id: `cluster-v1:${family}:${members.join('|')}`, kind: graph.kind, title,
        description: graph.kind === 'whole-form' ? t('clusterArchiveGlyphs.everyPairOfMembersMeetsTheWhole')
          : graph.kind === 'branch' ? t('clusterArchiveGlyphs.allMembersShareBranchesWithTheSame')
            : t('clusterArchiveGlyphs.allMembersShareASimilarOpeningAnd'),
        minimumSimilarity, pairCount: members.length * (members.length - 1) / 2,
        members: members.map((id) => {
          const member = graph.vertices.get(id);
          if (id === members[0]) return { glyphId: member.glyphId, anchors: member.anchors };
          const proof = graph.edges.get(pairKey(members[0], id));
          const observations = proof.observations.map((item) => proof.a === members[0] ? item
            : { ...item, anchorA: item.anchorB, anchorB: item.anchorA });
          const components = { ...proof.components, level: graph.kind === 'whole-form' ? 'whole-form' : 'shared-motif',
            motifScore: proof.score, observations };
          return { glyphId: member.glyphId, anchors: member.anchors, relationToRepresentative: {
            relationType: 'FORM', score: components.wholeScore, components,
            evidence: { basis: 'rendered-form', ...components }, reasons: observations.map((item) => item.reason),
            algorithmVersion: RELATION_ALGORITHM_VERSION, sourceId: representative.glyphId, targetId: member.glyphId, directed: false,
          } };
        }),
      });
    }
  }
  groups.sort((a, b) => b.members.length - a.members.length || b.minimumSimilarity - a.minimumSimilarity || compareKeys(a.id, b.id));
  const memberships = Object.fromEntries(valid.map(({ glyph }) => [glyph.id, groups.filter((group) => group.members.some((member) => member.glyphId === glyph.id)).map((group) => group.id)]));
  return { algorithmVersion: CLUSTER_ALGORITHM_VERSION, relationAlgorithmVersion: RELATION_ALGORITHM_VERSION,
    groups, memberships, ungroupedIds: valid.filter(({ glyph }) => !memberships[glyph.id].length).map(({ glyph }) => glyph.id),
    invalidIds, sampleSize: valid.length, sampleLimit: CLUSTER_SAMPLE_LIMIT,
    sampleTruncated: publicRows.length > CLUSTER_SAMPLE_LIMIT, groupingTruncated, comparedPairs };
}

/** Pure synchronous entry for tests, fixtures and a future server implementation. */
export function clusterArchiveGlyphs(rows) {
  const steps = clusterSteps(rows);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

/** Cooperative frontend calculation: yield between batches; stop stale work. */
export async function computeArchiveClusters(rows, { signal, yieldWork = () => new Promise((resolve) => setTimeout(resolve, 0)) } = {}) {
  const check = () => { if (signal?.aborted) throw Object.assign(new Error(t('clusterArchiveGlyphs.clusterCalculationCancelled')), { name: 'AbortError' }); };
  const steps = clusterSteps(rows);
  while (true) {
    check();
    const step = steps.next();
    if (step.done) return step.value;
    await yieldWork();
  }
}
