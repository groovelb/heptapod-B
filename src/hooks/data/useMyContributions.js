import { useCallback } from 'react';
import { resolveArchiveClient } from '../../lib/archiveClient.js';
import { useArchiveQuery } from './useArchiveQuery.js';

const EMPTY = [];
export function useMyContributions({ client, userId } = {}) {
  const query = useCallback(async (signal) => {
    const sb = await resolveArchiveClient(client);
    const { data: auth, error: authError } = await sb.auth.getSession();
    if (authError) throw authError;
    if (!auth?.session?.user) return [];
    if (userId !== undefined && auth.session.user.id !== userId) return [];
    let request = sb.from('glyph_contributions').select('*, glyph:glyphs(*)')
      .eq('user_id', auth.session.user.id).is('withdrawn_at', null)
      .order('created_at', { ascending: false }).limit(200);
    if (request.abortSignal) request = request.abortSignal(signal);
    const { data, error } = await request;
    if (error) throw error;
    return data || [];
  }, [client, userId]);
  const { data: contributions, ...state } = useArchiveQuery(query, { initialData: EMPTY });
  return { contributions, ...state };
}
