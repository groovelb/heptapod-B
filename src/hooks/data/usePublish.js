import { useCallback } from 'react';
import { publishArchiveGlyph } from '../../lib/archiveClient.js';
import { useArchiveMutation } from './useArchiveMutation.js';

/** Explicit consent creates an owner session; server verifies and publishes atomically. */
export function usePublish({ client } = {}) {
  const operation = useCallback((input) => publishArchiveGlyph(client, input), [client]);
  const { mutate: publish, loading, error } = useArchiveMutation(operation);
  return { publish, loading, error };
}
