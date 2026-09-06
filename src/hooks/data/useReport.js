import { sourceText as t } from '../../i18n/messages.js';
/**
 * useReport — Glyph 신고
 *
 * @returns {{
 *   submitReport: function(string, string, string?): Promise<boolean>,
 *   loading: boolean,
 *   error: string|null
 * }}
 *
 * Example usage:
 * const { submitReport, loading } = useReport();
 * await submitReport(glyphId, 'offensive', '설명');
 */
import { useState, useCallback } from 'react';
import { resolveArchiveClient } from '../../lib/archiveClient.js';

export function useReport({ client } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitReport = useCallback(async (glyphId, reason, note = null) => {
    setLoading(true);
    setError(null);

    try {
      const sb = await resolveArchiveClient(client);
      if (!sb) {
        setError(t('useReport.noSupabaseConnectionIsAvailable'));
        setLoading(false);
        return false;
      }

      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        setError(t('useReport.authenticationIsRequired'));
        setLoading(false);
        return false;
      }

      const { error: err } = await sb
        .from('reports')
        .insert({
          user_id: user.id,
          glyph_id: glyphId,
          reason,
          note,
        });

      if (err) throw new Error(err.message);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  }, [client]);

  return { submitReport, loading, error };
}
