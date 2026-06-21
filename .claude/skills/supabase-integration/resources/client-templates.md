# Client Code Templates

Phase 4에서 참조. 이 템플릿을 그대로 복사해 프로젝트에 맞게 엔티티명만 바꾼다.

---

## 1. `src/lib/supabase.js`

```js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

---

## 2. `src/utils/supabaseError.js`

```js
import { ERROR_MESSAGES } from './errorMessages';

/**
 * Supabase 에러를 한국어 메시지로 정규화
 * @param {unknown} error - Supabase 에러 객체
 * @returns {{ message: string, code: string | null }}
 */
export function normalizeSupabaseError(error) {
  if (!error) return { message: '', code: null };

  const code = error.code || error.status || null;
  const message =
    ERROR_MESSAGES[code] ||
    ERROR_MESSAGES[error.message] ||
    error.message ||
    '알 수 없는 오류가 발생했습니다';

  return { message, code };
}
```

`src/utils/errorMessages.js`는 `error-catalog.md` 참조.

---

## 3. `src/hooks/auth/useAuth.js` (전역 세션 훅)

```js
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * 현재 로그인 세션과 user를 구독하는 훅.
 * 앱 최상단에서 1회 사용 권장 (Context와 조합).
 *
 * @returns {{ user: object | null, session: object | null, loading: boolean }}
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user: session?.user ?? null, session, loading };
}
```

---

## 4. `src/hooks/auth/useSignUp.js`

```js
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { normalizeSupabaseError } from '../../utils/supabaseError';

/**
 * 회원가입 훅
 * @returns {{ signUp: (args: { email: string, password: string, nickname?: string }) => Promise<{ ok: boolean }>, loading: boolean, error: { message: string, code: string|null } | null }}
 */
export function useSignUp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function signUp({ email, password, nickname }) {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: nickname ? { nickname } : undefined },
      });
      if (err) throw err;
      return { ok: true };
    } catch (err) {
      setError(normalizeSupabaseError(err));
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }

  return { signUp, loading, error };
}
```

---

## 5. `src/hooks/auth/useSignIn.js`

```js
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { normalizeSupabaseError } from '../../utils/supabaseError';

export function useSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function signIn({ email, password }) {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      return { ok: true };
    } catch (err) {
      setError(normalizeSupabaseError(err));
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }

  return { signIn, loading, error };
}
```

---

## 6. `src/hooks/auth/useSignOut.js`

```js
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function useSignOut() {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  }

  return { signOut, loading };
}
```

---

## 7. `src/hooks/data/usePosts.js` — 엔티티별 CRUD 템플릿

> **각 엔티티(posts, comments 등)마다 이 템플릿을 복사해서 생성**
> `posts` → 엔티티명 교체, `Post` → 타입명 교체

```js
import { useCallback, useEffect, useState } from 'react';
import { supabase as defaultClient } from '../../lib/supabase';
import { normalizeSupabaseError } from '../../utils/supabaseError';

/**
 * posts 목록 조회 훅
 * @param {object} [options]
 * @param {object} [options.client] - 테스트/스토리용 주입. 생략 시 기본 client
 * @param {object} [options.filter] - 필터 조건 (예: { user_id: 'xxx' })
 * @returns {{ data: Post[] | null, loading: boolean, error: object | null, refetch: () => void }}
 */
export function usePosts({ client = defaultClient, filter } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = client.from('posts').select('*').order('created_at', { ascending: false });
      if (filter) {
        Object.entries(filter).forEach(([k, v]) => {
          query = query.eq(k, v);
        });
      }
      const { data: rows, error: err } = await query;
      if (err) throw err;
      setData(rows);
    } catch (err) {
      setError(normalizeSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }, [client, JSON.stringify(filter)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * post 단건 조회
 */
export function usePost({ id, client = defaultClient }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    client.from('posts').select('*').eq('id', id).single()
      .then(({ data: row, error: err }) => {
        if (err) setError(normalizeSupabaseError(err));
        else setData(row);
      })
      .finally(() => setLoading(false));
  }, [id, client]);

  return { data, loading, error };
}

/**
 * post 생성
 */
export function useCreatePost({ client = defaultClient } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function createPost(payload) {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await client.from('posts').insert(payload).select().single();
      if (err) throw err;
      return { ok: true, data };
    } catch (err) {
      setError(normalizeSupabaseError(err));
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }

  return { createPost, loading, error };
}

/**
 * post 수정
 */
export function useUpdatePost({ client = defaultClient } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function updatePost(id, patch) {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await client.from('posts').update(patch).eq('id', id).select().single();
      if (err) throw err;
      return { ok: true, data };
    } catch (err) {
      setError(normalizeSupabaseError(err));
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }

  return { updatePost, loading, error };
}

/**
 * post 삭제
 */
export function useDeletePost({ client = defaultClient } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function deletePost(id) {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await client.from('posts').delete().eq('id', id);
      if (err) throw err;
      return { ok: true };
    } catch (err) {
      setError(normalizeSupabaseError(err));
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }

  return { deletePost, loading, error };
}
```

---

## 8. `package.json` 스크립트 추가

```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --linked > /tmp/db.ts && node .claude/skills/supabase-integration/scripts/ts-to-jsdoc.mjs /tmp/db.ts > src/types/database.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.x"
  }
}
```

---

## 9. 설치 명령

```bash
pnpm add @supabase/supabase-js
```

---

## 10. 주입 원칙 (Storybook 호환 필수)

- 모든 데이터 훅은 `{ client = defaultClient }` 파라미터 받음
- 스토리에서는 mock client 주입 (`storybook-mock.md` 참조)
- auth 훅은 전역 상태 → 스토리에서는 MSW 또는 mock Supabase 인스턴스 사용
