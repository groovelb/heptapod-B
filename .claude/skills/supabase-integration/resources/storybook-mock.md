# Storybook Mock Guide

Phase 4에서 참조. 데이터 훅이 Supabase 서버를 실제로 호출하지 않도록 mock 주입.

---

## 원칙

1. **데이터 훅은 절대 모듈 import 시점에 Supabase를 호출하지 않는다** — 훅 호출 시점에만
2. **모든 데이터 훅은 `{ client }` 파라미터를 받는다** — 기본값은 실제 client, 스토리에서는 mock
3. **auth 훅은 Context로 주입** — 스토리에서는 AuthContext에 mock user 주입

---

## 1. Mock Supabase Client

### `src/mocks/supabaseMock.js`

```js
/**
 * Storybook 전용 mock Supabase client.
 * 실제 network 호출 없이 고정 데이터 반환.
 *
 * @param {object} mockData - { tableName: rows[] } 형태
 * @returns mock client
 */
export function createMockSupabase(mockData = {}) {
  const makeQuery = (tableName) => {
    const rows = mockData[tableName] || [];
    const result = Promise.resolve({ data: rows, error: null });

    const thenable = {
      select: () => thenable,
      insert: (payload) => Promise.resolve({ data: payload, error: null }),
      update: (payload) => Promise.resolve({ data: payload, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      eq: () => thenable,
      order: () => thenable,
      single: () => Promise.resolve({ data: rows[0] || null, error: null }),
      then: (onFulfilled, onRejected) => result.then(onFulfilled, onRejected),
    };

    return thenable;
  };

  return {
    from: makeQuery,
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signUp: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    functions: {
      // Edge Function mock. 함수명별 오버라이드는 mockData.functions[name]으로.
      invoke: async (name, { body } = {}) => {
        const impl = mockData.functions?.[name];
        if (typeof impl === 'function') return impl(body);
        if (impl) return impl; // { data, error } 형태 직접 지정
        return { data: null, error: null };
      },
    },
  };
}
```

### Edge Function mock 사용 예시

```jsx
// 성공 케이스
const mockClient = createMockSupabase({
  functions: {
    'chat-completion': {
      data: { data: { choices: [{ message: { content: 'mock answer' } }] } },
      error: null,
    },
  },
});

// 에러 케이스 (upstream 실패)
const errorClient = createMockSupabase({
  functions: {
    'chat-completion': { data: null, error: { message: 'upstream_error' } },
  },
});

// body에 따라 다른 응답
const dynamicClient = createMockSupabase({
  functions: {
    'chat-completion': (body) => ({
      data: { data: { echo: body.messages[0].content } },
      error: null,
    }),
  },
});
```

---

## 2. 스토리에서 사용

### 데이터 훅 스토리

```jsx
// src/components/card/PostCard.stories.jsx
import { PostCard } from './PostCard';
import { createMockSupabase } from '../../mocks/supabaseMock';

const mockClient = createMockSupabase({
  posts: [
    { id: '1', title: '샘플 포스트', content: '내용...', user_id: 'u1', created_at: '2026-04-23T00:00:00Z' },
  ],
});

export default {
  title: 'Card/PostCard',
  component: PostCard,
};

export const Default = {
  args: {
    supabaseClient: mockClient,
    postId: '1',
  },
};
```

### 컴포넌트가 훅을 내부에서 호출하는 경우

훅을 prop drilling 대신 **Provider 패턴**으로 주입:

```jsx
// src/contexts/SupabaseContext.jsx
import { createContext, useContext } from 'react';
import { supabase as defaultClient } from '../lib/supabase';

const SupabaseContext = createContext(defaultClient);

export function SupabaseProvider({ client, children }) {
  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}

export const useSupabaseClient = () => useContext(SupabaseContext);
```

### 스토리 Decorator

```jsx
// .storybook/preview.js 또는 story별
import { SupabaseProvider } from '../src/contexts/SupabaseContext';
import { createMockSupabase } from '../src/mocks/supabaseMock';

const mockClient = createMockSupabase({ posts: [...] });

export const decorators = [
  (Story) => (
    <SupabaseProvider client={mockClient}>
      <Story />
    </SupabaseProvider>
  ),
];
```

---

## 3. Auth 스토리 (로그인 상태 mock)

### `src/mocks/authMock.js`

```js
export const MOCK_USER = {
  id: 'mock-user-id',
  email: 'test@example.com',
  user_metadata: { nickname: '테스터' },
};

export const MOCK_SESSION = {
  access_token: 'mock-token',
  user: MOCK_USER,
};
```

### AuthContext에 mock 주입

```jsx
// src/contexts/AuthContext.jsx
export const AuthContext = createContext({ user: null, session: null, loading: false });

// 스토리에서
<AuthContext.Provider value={{ user: MOCK_USER, session: MOCK_SESSION, loading: false }}>
  <Story />
</AuthContext.Provider>
```

---

## 4. 상태별 스토리 배리에이션

| 스토리 | Mock 값 |
|--------|---------|
| `Default` | 일반 데이터 배열 |
| `Empty` | `[]` |
| `Loading` | `new Promise(() => {})` (영원히 pending) |
| `Error` | `{ data: null, error: { message: '...' } }` |
| `LoggedIn` | AuthContext에 MOCK_USER |
| `LoggedOut` | AuthContext에 `{ user: null }` |

---

## 5. 주의사항

- **실제 `.env.local` 키가 Storybook 빌드에 포함되지 않도록** → `.storybook/main.js`의 env 관리 확인
- **MSW(Mock Service Worker) 대안**: 더 현실적인 mocking을 원하면 MSW로 Supabase REST 엔드포인트 가로채기 가능. 단, 초기 러닝 코스트 있음
- 이 스킬은 **기본적으로 mockClient 방식** 채택. MSW는 필요 시 별도 확장
