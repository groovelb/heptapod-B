import { useState, useEffect, useCallback } from 'react';
import { resolveArchiveClient } from '../../lib/archiveClient.js';

export function useAuth({ client } = {}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    let subscription;
    (async () => {
      try {
        const sb = await resolveArchiveClient(client);
        if (cancelled) return;
        subscription = sb.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setUser(session?.user ?? null);
        }).data.subscription;
        const result = await sb.auth.getSession();
        if (result.error) throw result.error;
        if (!cancelled) setUser(result.data?.session?.user ?? null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; subscription?.unsubscribe(); };
  }, [client]);

  const linkWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const sb = await resolveArchiveClient(client);
      const current = await sb.auth.getSession();
      if (current.error) throw current.error;
      const options = { provider: 'google', options: { redirectTo: `${window.location.origin}/me` } };
      // Linking preserves the anonymous owner's ID and its existing responses.
      const result = current.data?.session?.user?.is_anonymous
        ? await sb.auth.linkIdentity(options)
        : await sb.auth.signInWithOAuth(options);
      if (result.error) throw result.error;
      return result.data;
    } catch (err) { setError(err.message); throw err; }
  }, [client]);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      const sb = await resolveArchiveClient(client);
      const result = await sb.auth.signOut();
      if (result.error) throw result.error;
      setUser(null);
    } catch (err) { setError(err.message); throw err; }
  }, [client]);

  return { user, loading, error, linkWithGoogle, signInWithGoogle: linkWithGoogle, signOut };
}
