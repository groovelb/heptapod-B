import { sourceText as t } from '../../i18n/messages.js';
import { useCallback, useMemo } from 'react';
import { resolveArchiveClient } from '../../lib/archiveClient.js';
import { useArchiveQuery } from './useArchiveQuery.js';
import { useArchiveMutation } from './useArchiveMutation.js';

const EMPTY = [];
export function useMyBookmarks({ client, userId } = {}) {
  const query = useCallback(async (signal) => {
    const sb = await resolveArchiveClient(client);
    const { data: auth, error: authError } = await sb.auth.getSession();
    if (authError) throw authError;
    if (!auth?.session?.user) return [];
    if (userId !== undefined && auth.session.user.id !== userId) return [];
    let request = sb.from('bookmarks').select('*, glyph:glyphs(*)')
      .eq('user_id', auth.session.user.id).order('created_at', { ascending: false }).limit(200);
    if (request.abortSignal) request = request.abortSignal(signal);
    const { data, error } = await request;
    if (error) throw error;
    return data || [];
  }, [client, userId]);
  const { data: bookmarks, loading, error: readError, refetch } = useArchiveQuery(query, { initialData: EMPTY });
  const bookmarkedIds = useMemo(() => new Set(bookmarks.map((row) => row.glyph_id)), [bookmarks]);
  const isBookmarked = useCallback((id) => bookmarkedIds.has(id), [bookmarkedIds]);
  const operation = useCallback(async (glyphId) => {
    const sb = await resolveArchiveClient(client);
    const { data: auth, error: authError } = await sb.auth.getSession();
    if (authError) throw authError;
    if (!auth?.session?.user) throw new Error(t('useMyBookmarks.aSessionIsNeededToSaveBookmarks'));
    const user = auth.session.user;
    const result = bookmarkedIds.has(glyphId)
      ? await sb.from('bookmarks').delete().eq('user_id', user.id).eq('glyph_id', glyphId)
      : await sb.from('bookmarks').insert({ user_id: user.id, glyph_id: glyphId });
    if (result.error) throw result.error;
    refetch();
  }, [client, bookmarkedIds, refetch]);
  const { mutate: toggleBookmark, error: writeError } = useArchiveMutation(operation);
  return { bookmarks, loading, error: writeError || readError, toggleBookmark, isBookmarked, refetch };
}
