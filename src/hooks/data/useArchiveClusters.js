import { useCallback } from 'react';
import { readArchiveClusters } from '../../lib/archiveClusters.js';
import { useArchiveQuery } from './useArchiveQuery.js';

export function useArchiveClusters(glyphs, { enabled = true, provider } = {}) {
  const query = useCallback((signal) => readArchiveClusters(glyphs, { signal, provider }), [glyphs, provider]);
  const { data, ...state } = useArchiveQuery(query, { enabled });
  return { clusters: data, ...state };
}
