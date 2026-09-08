import { sourceText as t } from '../i18n/messages.js';
import { assertComparableGlyph } from '../utils/heptapod/assertComparableGlyph.js';
import { extractGlyphFeatures } from '../utils/heptapod/extractGlyphFeatures.js';
import { relateGlyphs, RELATION_ALGORITHM_VERSION } from '../utils/heptapod/relateGlyphs.js';
import { groupResonanceRows } from '../utils/heptapod/resonanceView.js';
import { publicEnv } from './publicEnv.js';

/**
 * @typedef {Object} ArchiveRelationProvider
 * @property {(glyphId: string, options?: {signal?: AbortSignal}) => Promise<Object>} getRelations
 * Both providers return the existing archive-relations DTO. Pages never choose a transport.
 */

export function assertArchiveRequestActive(signal) {
  if (signal?.aborted) throw Object.assign(new Error(t('archiveRelations.relationRequestCancelled')), { name: 'AbortError' });
}

/** Explicit injection wins; Storybook clients preserve their injected API behavior. */
export function resolveArchiveRelationsMode({ mode, hasInjectedClient = false, env = { VITE_ARCHIVE_RELATIONS_MODE: publicEnv.relationsMode, DEV: publicEnv.development } } = {}) {
  const selected = mode ?? (hasInjectedClient ? 'api' : env.VITE_ARCHIVE_RELATIONS_MODE || (env.DEV ? 'local' : 'api'));
  if (!['local', 'api'].includes(selected)) throw new Error(t('archiveRelations.theRelationConnectionModeMustBeLocal'));
  return selected;
}

/** @returns {ArchiveRelationProvider} */
export function createApiRelationProvider({ invoke }) {
  return {
    async getRelations(glyphId, { signal } = {}) {
      assertArchiveRequestActive(signal);
      const result = await invoke(glyphId, signal);
      assertArchiveRequestActive(signal);
      if (!Number.isFinite(result?.algorithmVersion) || result.algorithmVersion < RELATION_ALGORITHM_VERSION) {
        throw new Error(t('resonanceList.updateTheFormResonanceServerAndTry'));
      }
      return { ...result, computationMode: 'api' };
    },
  };
}

/**
 * Computes relationships from the frontend's public snapshot, never synthetic rows.
 * readCenter rechecks public visibility; loadSnapshot reuses the archive fetch or
 * bootstraps the same read on direct links. No function/auth/write APIs are used.
 * @returns {ArchiveRelationProvider}
 */
export function createLocalRelationProvider({ readCenter, loadSnapshot, yieldWork = () => new Promise((resolve) => setTimeout(resolve, 0)) }) {
  return {
    async getRelations(glyphId, { signal } = {}) {
      assertArchiveRequestActive(signal);
      const center = await readCenter(glyphId, signal);
      assertArchiveRequestActive(signal);
      if (!center || center.is_public !== true) throw new Error(t('archiveRelations.thePublicGlyphCouldNotBeFound'));
      try { assertComparableGlyph(center); extractGlyphFeatures(center.model_data); }
      catch { throw new Error(t('archiveRelations.thisGlyphSFormDataCouldNot')); }
      const snapshot = await loadSnapshot(signal);
      assertArchiveRequestActive(signal);
      if (!snapshot || !Array.isArray(snapshot.rows)) throw new Error(t('archiveRelations.publicGlyphsForComparisonCouldNotBe'));
      const candidates = [...new Map(snapshot.rows.filter((row) => row?.is_public === true && row.id && row.id !== glyphId)
        .map((row) => [row.id, row])).values()].slice(0, 200);
      const rawRows = [];
      let skippedModels = 0;
      const computedAt = new Date().toISOString();
      for (let index = 0; index < candidates.length; index += 1) {
        if (index % 16 === 0) await yieldWork();
        assertArchiveRequestActive(signal);
        const neighbor = candidates[index];
        let matches;
        try { assertComparableGlyph(neighbor); matches = relateGlyphs(center, neighbor); }
        catch { skippedModels += 1; continue; }
        for (const match of matches) rawRows.push({
          id: `${glyphId}:${neighbor.id}:${match.relationType}:v${RELATION_ALGORITHM_VERSION}`,
          glyph_a_id: match.sourceId || glyphId, glyph_b_id: match.targetId || neighbor.id,
          relation_type: match.relationType, score: match.score, score_components: match.components,
          reasons: match.reasons, evidence: match.evidence, algorithm_version: match.algorithmVersion,
          is_directed: match.directed, computed_at: computedAt, evidence_source: 'local-public-snapshot',
          neighborGlyph: neighbor, direction: match.sourceId === neighbor.id ? 'reverse' : 'forward',
        });
      }
      assertArchiveRequestActive(signal);
      const selected = new Set(groupResonanceRows(rawRows, { limit: 24 }).map((neighbor) => neighbor.id));
      return {
        relations: rawRows.filter((row) => selected.has(row.neighborGlyph.id)),
        mappingStatus: skippedModels ? 'partial-sample' : 'current-sample',
        sampleSize: candidates.length, sampleLimit: 200, skippedModels,
        candidateSources: ['frontend-public-snapshot'], computationMode: 'local',
        sampleFetchedAt: snapshot.fetchedAt ? new Date(snapshot.fetchedAt).toISOString() : null,
        algorithmVersion: RELATION_ALGORITHM_VERSION, computedAt,
      };
    },
  };
}
