import { useCallback } from 'react';
import { readArchiveMeanings } from '../../lib/archiveMeanings.js';
import { useArchiveQuery } from './useArchiveQuery.js';

/** Interpret only the public rows supplied by the page; no implicit archive fetch. */
export function useArchiveMeanings(glyphs, { enabled = true, provider } = {}) {
  const query = useCallback((signal) => readArchiveMeanings(glyphs, { signal, provider }), [glyphs, provider]);
  const { data: meanings, ...state } = useArchiveQuery(query, { enabled });
  return { meanings, ...state };
}
