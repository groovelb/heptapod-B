# Edge Functions — 외부 API 연동 (로컬 검증 → 서버 이전)

> **핵심 원칙**: 외부 API(OpenAI, Stripe, 카카오, 결제, SMS 등)는 **로컬에서 기능을 먼저 검증**한 뒤, 검증이 끝나면 **Edge Function으로 반드시 옮긴다**. 프론트 번들에 비밀 키가 남으면 안 된다.

---

## 0. 왜 필요한가 (Why)

### 0-1. 프론트 env var은 "숨겨지는" 값이 아니다

- Vite의 `VITE_*` 변수는 **빌드 시 번들에 문자열로 박힌다**. 브라우저 DevTools의 Sources 탭에서 그대로 보인다.
- `import.meta.env.VITE_OPENAI_API_KEY`는 "환경 변수로 관리되는 값"이 아니라 **배포된 JS에 평문으로 포함되는 값**이다.
- 즉, 유료 API 키·결제 키·개인정보 접근 키를 프론트에 두면 **사용자가 키를 그대로 복사해서 임의로 호출할 수 있다**. 과금 공격, 데이터 유출 모두 가능.

### 0-2. 그럼 왜 굳이 로컬에서 프론트 직접 호출을 먼저 허용하는가

- **검증 대상이 다르기 때문**. 한 번에 다 엮으면 디버깅이 지옥이다:
  - 기능 검증 (API 스펙이 맞는가, 응답 파싱이 되는가, UI가 잘 반응하는가)
  - 네트워크 검증 (CORS, 인증 헤더 전달, 타임아웃)
  - 보안 검증 (키 노출, 호출자 식별, 권한 체크)
- Stage A에서는 **기능 검증에만 집중**, Stage C에서 **네트워크·보안 검증**을 분리한다.
- 단 Stage A는 **반드시 조건부**로만 허용 (아래 Stage A 규칙 참조).

### 0-3. Edge Function의 가치

- **비밀키 격리** — 키는 Supabase secrets에만 존재. 번들에 안 나온다.
- **호출자 식별** — 프론트가 보낸 사용자 JWT를 자동으로 검증 → RLS와 동일한 보안 모델로 확장.
- **요금·권한 게이팅** — 무료 사용자 호출 수 제한, 관리자만 특정 함수 호출 등을 서버에서 강제.
- **로그 분리** — 요청/응답 로그가 서버에 남음. PII 필터링·감사 추적 가능.
- **써드파티 webhook 수신** — 결제/OAuth 콜백처럼 퍼블릭 엔드포인트가 필요한 경우 유일한 선택지.

---

## 1. 언제 Edge Function이 필요한가 (판단 기준)

| 케이스 | Edge Function 필수? | 이유 |
|-------|------|------|
| OpenAI/Anthropic API 호출 | ✅ 필수 | API 키 노출 = 과금 공격 |
| Stripe 결제 | ✅ 필수 | secret key는 서버 전용, webhook endpoint 필요 |
| SMS/이메일 발송 | ✅ 필수 | 서비스 키 노출 시 스팸 악용 |
| 카카오/네이버 OAuth (Supabase 미지원 provider) | ✅ 필수 | 토큰 교환은 서버에서 |
| 외부 공개 데이터 API (키 불필요) | ⛔ 불필요 | CORS만 맞으면 프론트에서 직접 호출 |
| 복잡한 집계/관리자 전용 쿼리 | ⚠️ 권장 | RLS로 표현 불가한 로직이면 |
| 파일 업로드 후처리(썸네일 등) | ⚠️ 권장 | Storage trigger + Edge Function 조합 |
| 단순 Supabase DB CRUD | ❌ 쓰지 말 것 | RLS + 데이터 훅으로 충분, Edge Function은 오버헤드 |

**판단 질문**: "이 호출에 필요한 값(키/토큰)이 사용자에게 노출돼도 괜찮은가?" → NO면 Edge Function.

---

## 2. Stage A — 로컬 검증 단계 (프론트 직접 호출)

### 목표

API 스펙·응답 형태·UI 반응만 빠르게 확인.

### 엄격한 허용 조건 (모두 충족해야 함)

1. **`.env.local`에만 키 저장**, `.env` / `.env.production`에는 **절대 금지**
2. **`.gitignore`에 `.env.local` 명시** (커밋 방지)
3. **스로우어웨이 키 사용** — 운영 키 금지. 발급 후 사용량 캡을 최저로 설정, Stage C 완료 즉시 **폐기(revoke)**
4. **개발 DB/개발 프로젝트 한정** — 프로덕션 Supabase 프로젝트에 연결된 앱에서는 Stage A 금지
5. **UI에 "DEV ONLY" 뱃지 노출** (선택) — 팀원이 이 빌드를 운영에 올리지 않도록 시각적 경고
6. **Stage A 기간 타임박스**: 기능 검증 후 **즉시 Stage C 진행**. 며칠 이상 방치 금지

### 코드 패턴 예시 (OpenAI 호출)

```jsx
// src/hooks/data/useChatCompletion.js — Stage A 한정
import { useState } from 'react';

const DEV_ONLY_OPENAI_KEY = import.meta.env.VITE_DEV_OPENAI_KEY;

if (import.meta.env.PROD && DEV_ONLY_OPENAI_KEY) {
  throw new Error('DEV_ONLY_OPENAI_KEY must not be present in production build');
}

export function useChatCompletion() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function send(messages) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEV_ONLY_OPENAI_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      return json;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error, send };
}
```

**왜 이렇게 작성하나**:
- `VITE_DEV_` 접두어로 **"이 키는 Stage A 전용"** 이라는 의도를 코드에서 드러낸다
- `if (import.meta.env.PROD && ...)` 가드로 **운영 빌드에 섞여 들어가는 것을 런타임에 차단**
- Stage C에서 이 파일의 훅 시그니처(`{ data, loading, error, send }`)를 **그대로 유지**한다 → 컴포넌트 쪽을 안 고쳐도 됨

---

## 3. Stage B — 마이그레이션 진입 체크리스트

Stage A에서 Stage C로 넘어가기 전 **모두 ✅ 이어야** 안전하게 이전 가능.

- [ ] API 응답 스펙이 안정적이고 문서화됨 (기대 필드, 에러 케이스)
- [ ] 프론트 훅 시그니처가 확정됨 (Stage C에서 훅 내부만 바꾸고 외부 인터페이스는 유지)
- [ ] 호출 시 **필요한 사용자 컨텍스트** 정의됨 (누가 호출하는지, 권한 필요한지)
- [ ] **호출 제한 정책** 정의됨 (무료/유료, 분당 N회 등) — Edge Function에서 enforce
- [ ] 에러 포맷이 `supabaseError.js`와 호환되도록 매핑 가능 (`code`, `message`)
- [ ] Storybook 스토리가 mock 훅을 쓰고 있음 (실제 API 의존 X)

---

## 4. Stage C — Edge Function 마이그레이션 (step-by-step)

> 각 단계에 **"왜(Why)"** 를 붙인다. 이유를 알아야 edge case에서 판단 가능.

### Step 1. CLI로 함수 스켈레톤 생성

```bash
supabase functions new chat-completion
```

생성 파일: `supabase/functions/chat-completion/index.ts`

**Why**: Supabase CLI는 Deno 런타임 기준 템플릿을 만들어준다. 수동 생성하면 디렉터리 구조나 `deno.json` 설정이 어긋나서 로컬 `serve`가 실패한다.

### Step 2. 서버 함수에 로직 이식

```typescript
// supabase/functions/chat-completion/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. 호출자 식별 — 사용자 JWT 검증
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'unauthorized' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    // 2. 입력 검증
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return json({ error: 'invalid_input' }, 400);
    }

    // 3. (선택) 권한/요금 체크 — 프로필의 plan, 호출 카운트 등
    // const { data: profile } = await supabase.from('profiles')
    //   .select('plan, monthly_calls').eq('id', user.id).single();
    // if (profile.plan === 'free' && profile.monthly_calls >= 100) {
    //   return json({ error: 'quota_exceeded' }, 429);
    // }

    // 4. 외부 API 호출 — 키는 서버 secret에서
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) return json({ error: 'server_misconfigured' }, 500);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('openai_error', res.status, body);
      return json({ error: 'upstream_error' }, 502);
    }
    const data = await res.json();

    // 5. (선택) 호출 로그/카운트 증가
    // await supabase.rpc('increment_api_call', { user_id: user.id });

    return json({ data });
  } catch (e) {
    console.error(e);
    return json({ error: 'internal_error' }, 500);
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

**Why 단계별**:
1. **JWT 검증** — 함수가 퍼블릭 엔드포인트라 누구나 호출 가능. 인증된 사용자만 허용해야 과금·남용 방지
2. **입력 검증** — 악의적 페이로드로 OpenAI 호출을 늘려 과금 공격하는 걸 차단
3. **권한/요금 체크** — RLS는 DB 접근을 막지만 외부 API 호출량은 못 막는다. 여기서 막아야 함
4. **secret 서버 전용** — 프론트에는 이제 이 키가 존재하지 않음. 유출 경로 차단
5. **로깅** — 호출량 추적·감사. `console.error`는 Supabase 로그에 남음
6. **CORS** — 브라우저 호출을 허용해야 하지만 `Access-Control-Allow-Origin`을 정확한 도메인으로 좁히는 게 운영 환경에선 더 안전 (개발 편의상 `*` 유지)

### Step 3. 서버 secret 등록

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets list   # 검증
```

**Why**: `.env` 파일 아닌 Supabase 플랫폼의 secret 저장소에 들어감. 함수 런타임의 `Deno.env.get()`으로만 접근 가능. 프론트 번들에는 절대 노출되지 않음.

### Step 4. 로컬에서 함수 테스트

```bash
supabase functions serve chat-completion --env-file supabase/functions/.env.local
```

`supabase/functions/.env.local` (로컬 전용, `.gitignore`에 추가):
```
OPENAI_API_KEY=sk-...
```

테스트:
```bash
# 다른 터미널에서
curl -i -X POST http://localhost:54321/functions/v1/chat-completion \
  -H "Authorization: Bearer {user-jwt}" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'
```

**Why**: 배포 전 로컬에서 CORS/인증/에러 포맷을 먼저 잡는다. 배포 후 디버깅은 훨씬 느리다 (로그 지연, 재배포 사이클).

### Step 5. 프론트 훅 교체 (시그니처 유지)

```jsx
// src/hooks/data/useChatCompletion.js — Stage C
import { useState } from 'react';
import { supabase as defaultClient } from '@/lib/supabase';

/**
 * Props/Args:
 * @param {object} options - [Optional]
 * @param {object} options.client - Supabase client (Storybook 주입용) [Optional]
 */
export function useChatCompletion({ client = defaultClient } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function send(messages) {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: fnError } = await client.functions.invoke(
        'chat-completion',
        { body: { messages } }
      );
      if (fnError) throw fnError;
      setData(res.data);
      return res.data;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error, send };
}
```

**Why**:
- 훅 시그니처(`{ data, loading, error, send }`)를 Stage A와 **완전히 동일**하게 유지 → 컴포넌트·스토리 수정 0
- `supabase.functions.invoke`가 **자동으로 현재 사용자 JWT를 Authorization 헤더에 실어준다** → 서버에서 `auth.getUser()`가 바로 동작
- `{ client }` 주입 패턴 유지 → Storybook mock 가능

### Step 6. 배포

```bash
supabase functions deploy chat-completion
```

**Why**: `supabase db push`와 달리 함수 배포는 별도 명령. 자동화 스크립트(`package.json`의 `"functions:deploy"`)로 묶어두면 누락 방지.

### Step 7. Stage A 잔재 정리 (핵심)

- [ ] `.env.local`에서 `VITE_DEV_OPENAI_KEY` **삭제**
- [ ] Stage A에서 발급했던 OpenAI 키 **revoke** (OpenAI Dashboard)
- [ ] `grep -r "VITE_DEV_" src/` — 잔존 참조 없는지 확인
- [ ] `pnpm build && grep -rc "sk-" dist/` — 번들에 키가 박혀있지 않은지 확인 (반환 0이면 안전)
- [ ] 구버전 Stage A 훅 파일이 남아있다면 삭제

**Why 회수 절차가 중요한가**: Stage A 키가 git 히스토리나 구 빌드에 남아있을 수 있음. **revoke만이 확실한 차단**. 삭제한 키는 어차피 못 쓰므로, 의심되면 무조건 폐기.

---

## 5. Storybook Mock 패턴

`client.functions.invoke`도 mock 대상. `storybook-mock.md`의 `createMockSupabase()` 확장:

```js
export function createMockSupabase(overrides = {}) {
  return {
    auth: { /* ... */ },
    from: () => ({ /* ... */ }),
    functions: {
      invoke: overrides.invokeImpl ?? (async (name, { body }) => ({
        data: { data: { choices: [{ message: { content: 'mock response' } }] } },
        error: null,
      })),
    },
    ...overrides,
  };
}
```

스토리:
```jsx
export const Success = {
  decorators: [(Story) => (
    <SupabaseProvider client={createMockSupabase()}>
      <Story />
    </SupabaseProvider>
  )],
};

export const UpstreamError = {
  decorators: [(Story) => (
    <SupabaseProvider client={createMockSupabase({
      invokeImpl: async () => ({ data: null, error: { message: 'upstream_error' } }),
    })}>
      <Story />
    </SupabaseProvider>
  )],
};
```

---

## 6. 보안 체크리스트 (Edge Function 배포 전)

- [ ] 모든 함수가 **사용자 JWT 검증** (퍼블릭 허용 시 명시적 주석 필수)
- [ ] 외부 API 키는 `supabase secrets set`으로만 등록, `.env.local`·코드 literal 금지
- [ ] 입력 페이로드 크기/형태 검증 (거대 payload DoS 방지)
- [ ] 요금 민감 호출은 사용자당 rate limit 적용 (DB 카운터 or upstash 등)
- [ ] 에러 응답이 내부 구조(스택트레이스, upstream body)를 노출하지 않음
- [ ] CORS Origin을 프로덕션 도메인으로 좁힘 (또는 명시적 allowlist)
- [ ] Webhook 수신 함수는 서명 검증 (Stripe `stripe-signature`, 카카오 token 등)
- [ ] `service_role key` 사용 함수는 **반드시 관리자 권한 체크 후** 호출

---

## 7. 흔한 실수

| 실수 | 결과 | 대응 |
|------|-----|-----|
| `VITE_OPENAI_API_KEY` 프론트에서 사용 | 번들에 키 노출, 과금 공격 | 즉시 revoke + Edge Function으로 이전 |
| Edge Function에서 `auth.getUser()` 호출 안 함 | 익명 호출 허용 = 공개 API화 | 모든 함수 최상단에 JWT 검증 |
| `Authorization` 헤더를 supabase client에 안 넘김 | `auth.getUser()`가 null 반환 | `createClient(..., { global: { headers } })` |
| `supabase functions deploy` 누락 | 로컬만 동작, 프로덕션 404 | 배포 스크립트화 |
| CORS `*` 그대로 프로덕션 | 타 사이트에서도 호출 가능 | 프로덕션은 Origin 좁히기 |
| service_role key를 함수에 하드코딩 | 함수 코드 유출 시 전권 탈취 | `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` + 관리자 함수에만 |

---

## 8. package.json 스크립트 추가

```json
{
  "scripts": {
    "functions:serve": "supabase functions serve --env-file supabase/functions/.env.local",
    "functions:deploy": "supabase functions deploy",
    "functions:new": "supabase functions new"
  }
}
```

`.gitignore`에 추가:
```
supabase/functions/.env.local
```
