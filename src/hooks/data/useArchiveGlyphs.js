import { useCallback } from 'react';
import { readArchiveGlyphs, readAllArchiveGlyphs } from '../../lib/archiveClient.js';
import { useArchiveQuery } from './useArchiveQuery.js';

const EMPTY = [];
export function useArchiveGlyphs({ client, limit = 200, all = false } = {}) {
  const query = useCallback((signal) => all ? readAllArchiveGlyphs(client, { signal }) : readArchiveGlyphs(client, { limit, signal }), [client, limit, all]);
  const { data: glyphs, ...state } = useArchiveQuery(query, { initialData: EMPTY });
  return { glyphs, ...state };
}
