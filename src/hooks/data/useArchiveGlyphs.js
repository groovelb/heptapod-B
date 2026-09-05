import { useCallback } from 'react';
import { readArchiveGlyphs } from '../../lib/archiveClient.js';
import { useArchiveQuery } from './useArchiveQuery.js';

const EMPTY = [];
export function useArchiveGlyphs({ client, limit = 200 } = {}) {
  const query = useCallback((signal) => readArchiveGlyphs(client, { limit, signal }), [client, limit]);
  const { data: glyphs, ...state } = useArchiveQuery(query, { initialData: EMPTY });
  return { glyphs, ...state };
}
