import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';

const noop = async () => null;

/**
 * Supabase Auth 래퍼 훅
 *
 * Supabase가 미설정(@supabase/supabase-js 미설치 또는 env 없음)이면
 * { user: null, loading: false } + noop 함수를 반환 — UI는 로컬 전용 모드로 동작.
 *
 * @returns {{
 *   user: object|null,
 *   loading: boolean,
 *   signIn: function(string, string): Promise,
 *   signUp: function(string, string): Promise,
 *   signOut: function(): Promise,
 * }}
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSupabase().then((sb) => {
      if (cancelled) return;
      if (!sb) {
        setLoading(false);
        return;
      }
      setClient(sb);
      sb.auth.getSession().then(({ data }) => {
        if (!cancelled) {
          setUser(data?.session?.user ?? null);
          setLoading(false);
        }
      });
      const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setUser(session?.user ?? null);
      });
      return () => subscription?.unsubscribe();
    });
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!client) return null;
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, [client]);

  const signUp = useCallback(async (email, password) => {
    if (!client) return null;
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, [client]);

  const signOut = useCallback(async () => {
    if (!client) return;
    await client.auth.signOut();
  }, [client]);

  return {
    user,
    loading,
    signIn: client ? signIn : noop,
    signUp: client ? signUp : noop,
    signOut: client ? signOut : noop,
  };
}
