import { useCallback } from 'react';
import { readGlyphRelations } from '../../lib/archiveClient.js';
import { useArchiveQuery } from './useArchiveQuery.js';

const EMPTY = [];
export function useGlyphRelations(glyphId, { client, mode, provider } = {}) {
  const query = useCallback((signal) => readGlyphRelations(client, glyphId, { signal, mode, provider }), [client, glyphId, mode, provider]);
  const { data, ...state } = useArchiveQuery(query, { enabled: !!glyphId });
  return {
    ...state,
    relations: data?.relations || EMPTY,
    mappingStatus: state.error ? 'error' : state.loading ? 'loading' : data?.mappingStatus || 'idle',
    sampleSize: data?.sampleSize ?? null,
    sampleLimit: data?.sampleLimit ?? null,
    algorithmVersion: data?.algorithmVersion ?? null,
    skippedModels: data?.skippedModels ?? 0,
    computedAt: data?.computedAt ?? null,
    computationMode: data?.computationMode ?? null,
    sampleFetchedAt: data?.sampleFetchedAt ?? null,
  };
}
