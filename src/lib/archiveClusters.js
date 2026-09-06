import { sourceText as t } from '../i18n/messages.js';
import { CLUSTER_ALGORITHM_VERSION, CLUSTER_GROUP_LIMIT, CLUSTER_SAMPLE_LIMIT, computeArchiveClusters } from '../utils/heptapod/clusterArchiveGlyphs.js';
import { RELATION_ALGORITHM_VERSION } from '../utils/heptapod/relateGlyphs.js';
import { isMorphologyRelation } from '../utils/heptapod/resonanceView.js';
import { assertArchiveRequestActive } from './archiveRelations.js';

/** Provider contract: getClusters(publicRows, { signal }) -> serializable cluster DTO.
 * The default only consumes rows already fetched by the page. No fetch/auth/writes.
 * A future API adapter is explicitly injected, never a silent network fallback.
 */
export const localArchiveClusterProvider = {
  async getClusters(rows, options) { return { ...await computeArchiveClusters(rows, options), computationMode: 'local' }; },
};

export function createApiClusterProvider({ invoke }) {
  return {
    async getClusters(rows, { signal } = {}) {
      assertArchiveRequestActive(signal);
      const glyphIds = [...new Set(rows.filter((row) => row?.is_public === true && row.id).map((row) => row.id))].slice(0, CLUSTER_SAMPLE_LIMIT);
      const result = await invoke({ glyphIds, algorithmVersion: CLUSTER_ALGORITHM_VERSION }, signal);
      return { ...result, computationMode: 'api' };
    },
  };
}

export async function readArchiveClusters(rows, { signal, provider = localArchiveClusterProvider } = {}) {
  assertArchiveRequestActive(signal);
  const result = await provider.getClusters(rows, { signal });
  assertArchiveRequestActive(signal);
  const ids = new Set(rows.filter((row) => row?.is_public === true).map((row) => row.id));
  const finiteScore = (value) => Number.isFinite(value) && value >= 0 && value <= 1;
  const validAnchor = (anchor) => ['branch', 'opening', 'ink', 'ring'].includes(anchor?.kind)
    && Number.isFinite(anchor.ang) && (anchor.kind !== 'branch' || (Number.isInteger(anchor.clusterIndex) && anchor.clusterIndex >= 0 && anchor.clusterIndex < 3));
  function validGroup(group) {
    if (typeof group?.id !== 'string' || !group.id || !['branch', 'whole-form', 'opening-ink'].includes(group.kind)
      || typeof group.title !== 'string' || typeof group.description !== 'string' || !finiteScore(group.minimumSimilarity)
      || !Array.isArray(group.members) || group.members.length < 2 || group.members.length > CLUSTER_SAMPLE_LIMIT
      || new Set(group.members.map((member) => member?.glyphId)).size !== group.members.length
      || group.pairCount !== group.members.length * (group.members.length - 1) / 2) return false;
    return group.members.every((member, index) => {
      if (!ids.has(member?.glyphId) || !Array.isArray(member.anchors) || !member.anchors.every(validAnchor)) return false;
      if (group.kind === 'branch' && (member.anchors.length !== 1 || member.anchors[0].kind !== 'branch')) return false;
      if (group.kind === 'opening-ink' && (member.anchors.length !== 2 || member.anchors[0].kind !== 'opening' || member.anchors[1].kind !== 'ink')) return false;
      const proof = member.relationToRepresentative;
      return index === 0 || (isMorphologyRelation(proof) && finiteScore(proof.score)
        && proof.sourceId === group.members[0].glyphId && proof.targetId === member.glyphId
        && proof.evidence.level === (group.kind === 'whole-form' ? 'whole-form' : 'shared-motif'));
    });
  }
  if (result?.algorithmVersion !== CLUSTER_ALGORITHM_VERSION || result?.relationAlgorithmVersion !== RELATION_ALGORITHM_VERSION
    || !Array.isArray(result.groups) || !Array.isArray(result.ungroupedIds) || !Array.isArray(result.invalidIds)
    || !result.memberships || typeof result.memberships !== 'object' || Array.isArray(result.memberships)
    || !Number.isInteger(result.sampleSize) || result.sampleSize < 0 || result.sampleSize > CLUSTER_SAMPLE_LIMIT
    || result.groups.length > CLUSTER_GROUP_LIMIT || !result.groups.every(validGroup)
    || new Set(result.groups.map((group) => group.id)).size !== result.groups.length
    || Object.keys(result.memberships).length !== result.sampleSize
    || result.comparedPairs !== result.sampleSize * (result.sampleSize - 1) / 2
    || result.sampleLimit !== CLUSTER_SAMPLE_LIMIT
    || typeof result.sampleTruncated !== 'boolean' || typeof result.groupingTruncated !== 'boolean') {
    throw new Error(t('archiveClusters.theClusterCalculationResponseCouldNotBe'));
  }
  const memberIds = Object.keys(result.memberships);
  const sameSet = (a, b) => Array.isArray(a) && new Set(a).size === a.length && a.length === b.length && a.every((id) => b.includes(id));
  if (memberIds.some((id) => !ids.has(id) || !sameSet(result.memberships[id], result.groups.filter((group) => group.members.some((member) => member.glyphId === id)).map((group) => group.id)))
    || result.groups.some((group) => group.members.some((member) => !memberIds.includes(member.glyphId)))
    || !sameSet(result.ungroupedIds, memberIds.filter((id) => !result.memberships[id].length))
    || new Set(result.invalidIds).size !== result.invalidIds.length
    || result.invalidIds.some((id) => !ids.has(id) || memberIds.includes(id))) {
    throw new Error(t('archiveClusters.theClusterCalculationResponseCouldNotBe'));
  }
  return result;
}
