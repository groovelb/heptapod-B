import { useCallback } from 'react';
import { unpublishArchiveGlyph } from '../../lib/archiveClient.js';
import { useArchiveMutation } from './useArchiveMutation.js';

export function useUnpublish({ client } = {}) {
  const operation = useCallback((id) => unpublishArchiveGlyph(client, id), [client]);
  const { mutate: unpublish, loading, error } = useArchiveMutation(operation);
  return { unpublish, loading, error };
}
