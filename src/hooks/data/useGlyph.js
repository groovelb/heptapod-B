import { useCallback } from 'react';
import { readPublicGlyph } from '../../lib/archiveClient.js';
import { useArchiveQuery } from './useArchiveQuery.js';

export function useGlyph(glyphId, { client } = {}) {
  const query = useCallback((signal) => readPublicGlyph(client, glyphId, { signal }), [client, glyphId]);
  const { data: glyph, ...state } = useArchiveQuery(query, { enabled: !!glyphId });
  return { glyph, ...state };
}

export function useGlyphByFingerprint(fingerprint, { client } = {}) {
  const query = useCallback((signal) => readPublicGlyph(client, fingerprint, { field: 'fingerprint', signal }), [client, fingerprint]);
  const { data: glyph, ...state } = useArchiveQuery(query, { enabled: !!fingerprint });
  return { glyph, ...state };
}
