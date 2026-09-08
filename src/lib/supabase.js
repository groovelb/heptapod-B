/**
 * Supabase 클라이언트 — 지연 초기화
 *
 * VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY가 설정되고 @supabase/supabase-js가
 * 설치되어 있으면 클라이언트를 반환, 아니면 null — 로컬 전용 모드(publish 비활성).
 *
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient | null>}
 */

import { publicEnv } from './publicEnv.js';

let cached = undefined;

export async function getSupabase() {
  if (cached !== undefined) return cached;

  const url = publicEnv.supabaseUrl;
  const key = publicEnv.supabaseAnonKey;

  if (!url || !key) {
    cached = null;
    return null;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    cached = createClient(url, key);
    return cached;
  } catch {
    cached = null;
    return null;
  }
}
