# Documentation Templates

Phase 0.5 ~ 6 에서 산출할 문서 템플릿. 본문 1종 (`04-data-bridge.md`) + 부록 5종 (`appendix-*.md`).

> **본문 vs 부록**: data-bridge 는 디자이너+개발자 합의 지점 (자연어, 표, 다이어그램). appendix 는 개발자 영역 (DDL, 정책, 코드). 디자이너가 부록을 펼치지 않아도 자기 디자인이 어떻게 데이터로 내려가는지 이해할 수 있어야 한다.

---

## 04-data-bridge.md (본문, Phase 0.5)

> **이 문서의 역할**: ux-flow 의 데이터 모델이 **Supabase 와 어떻게 연결되는지** 디자이너가 가장 쉽게 이해하도록 3 가지 질문에 답한다.
>
> 1. 데이터 모델은 어떤 DB 테이블이 되나?
> 2. UX-flow 의 어느 시점에 DB 가 업데이트되나?
> 3. 각 페이지는 어떤 DB 와 연결되나?
>
> § 4 (라이프사이클) / § 5 (정합성) 는 선택·후순위.

```markdown
# {ProjectName}. Data Bridge

> ux-flow 의 데이터 모델이 Supabase 와 어떻게 연결되는지 설명.
> 컬럼 / 제약 / SQL 은 `appendix-db-schema.md` 참조.

**입력**: [02-ux-flow.md § 데이터 모델 활용](./02-ux-flow.md)

## 1. 데이터 모델은 어떤 DB 테이블이 되나?

ux-flow 의 사전을 그대로 인용. 데이터명이 어느 Supabase 테이블에 저장되는지 1:1.

| 데이터명 | 예상 테이블명 | 설명 (1줄) |
|---|---|---|
| `Reference` | `reference_items` | 사용자가 모은 영감 이미지 |
| `Project` | `projects` | 의도+모드+레퍼런스 큐레이션 묶음 |
| `ProjectReference` | `project_references` | 프로젝트가 어떤 레퍼런스를 어떤 레이어로 활용 (M:N) |
| `AnalysisResult` | `analysis_results` | AI 가 만든 토큰 묶음 |
| `User` | `auth.users` (Supabase 내장) | 가입 사용자 |

## 2. UX-flow 의 어느 시점에 DB 가 업데이트되나?

ux-flow 의 UX-flow 단계별 서사를 따라가며, 각 단계에서 어떤 테이블이 변하는지.

### 시나리오 1. 레퍼런스 아카이빙

- **이미지 업로드** (Archive) → `reference_items` insert (status='tagging'). 동시에 Supabase Storage 에 이미지 본체 저장.
- **자동 태깅 완료** → 같은 row update (tags / dominant_colors / extracted 채움, status='ready')

### 시나리오 2. 프로젝트 생성 5-step

- **Step 0 모드 선택** (ProjectCreate) → `projects` insert (mode 만 채워진 row)
- **Step 1 제목+의도** → 같은 row update (name, intent)
- **Step 2 layer chip** → `project_references` insert/update (선택한 레퍼런스마다 1 row)
- **Step 3 활용 노트** → `projects` row update (user_notes)
- **Step 4 AI 분석** → `analysis_results` insert (Anthropic 응답을 layers jsonb 에)

### 시나리오 3. 토큰 확인 + 결정 추적

- **on/off + emphasis 편집** (ProjectDetail) → `analysis_results` row update (layers jsonb 의 isEnabled / emphasis 필드)

### 시나리오 4. Export

- **DB 업데이트 없음**. 읽기만 (`projects` + `analysis_results` + `reference_items` 모두 R).

## 3. 각 페이지는 어떤 DB 와 연결되나?

페이지 중심 표. R = 읽기, W = 쓰기 (insert/update).

| 페이지 | 다루는 테이블 | 동작 |
|---|---|---|
| Auth | `auth.users` + `profiles` + `user_settings` | W (가입 시 자동 생성) |
| Archive | `reference_items` | W (업로드) + R (그리드) |
| ProjectList | `projects` | R |
| ProjectCreate | `projects` + `project_references` + `analysis_results` + `reference_items` | W (Step 0~4) + R (레퍼런스 선택) |
| ProjectDetail | `analysis_results` + `projects` + `reference_items` | R + 편집 시 `analysis_results` W |
| Settings | `user_settings` | R + W |

## 4. (선택) 외부 의존 데이터의 라이프사이클

외부 API / Storage / Auth 가 끼는 데이터만 sequence. 단순 CRUD 만의 데이터는 생략.

### AnalysisResult (Anthropic 분석)

\`\`\`mermaid
sequenceDiagram
  actor User as 사용자
  participant UI as ProjectCreate (Step 4)
  participant API as Anthropic
  participant DB as analysis_results

  User->>UI: 분석 시작
  UI->>API: T3 호출
  API-->>UI: 토큰 + 이유
  UI->>DB: insert
\`\`\`

(다른 외부 의존 데이터도 동일 양식)

## 5. 정합성 체크

- [ ] § 1 의 데이터명·테이블명이 ux-flow 사전과 글자 단위 일치
- [ ] § 2 의 단계가 ux-flow UX-flow 단계별 서사의 단계와 일치
- [ ] § 3 의 페이지명이 ux-flow 페이지 리스트의 행과 글자 단위 일치
- [ ] § 4 시퀀스의 외부 의존이 ux-flow 단계별 서사의 트리거와 일치
- [ ] 본문에 SQL/컬럼/제약/훅 코드 0건 (있으면 부록으로 분리)
```

### 작성 규칙

- **§ 1**: ux-flow 사전 그대로 인용. 자동 채움. 디자이너 entry point.
- **§ 2**: UX-flow 단계별 서사 → 시점별 DB 동작 1줄로 변환. 자동 채움 가능. 추론 신뢰도 낮으면 빈칸 + 사용자에게 묻기.
- **§ 3**: 페이지 리스트 + § 1 매핑 결합. 자동 채움 가능.
- **§ 4**: 외부 의존 있는 데이터만. 외부 의존 0 이면 § 4 자체 생략.
- **§ 5**: 자동 검증.
- 본문에 SQL / 제약 / 정책 / 훅 코드 등장 금지 (부록 영역).
- 데이터명 / 페이지명 / 테이블명은 ux-flow 와 글자 단위 일치. 다르면 차단.
- 자동 채움 가능 부분: § 1 / § 2 / § 3 / § 5. § 4 만 외부 의존 추론 후 작성.

---

## appendix-db-schema.md (Phase 1, 부록)

```markdown
# DB Schema

## 개요

- 프로젝트: {project-name}
- 총 테이블 수: N
- 작성일: YYYY-MM-DD

## ERD

\`\`\`mermaid
erDiagram
    profiles ||--o{ posts : "owns"
    posts ||--o{ comments : "has"
    profiles ||--o{ comments : "writes"

    profiles {
        uuid id PK
        string nickname
        string avatar_url
        timestamptz created_at
    }
    posts {
        uuid id PK
        uuid user_id FK
        string title
        text content
        timestamptz created_at
        timestamptz updated_at
    }
\`\`\`

## 테이블 상세

### profiles

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, FK → auth.users.id | 사용자 ID |
| nickname | text | NOT NULL, UNIQUE | 닉네임 |
| avatar_url | text | NULLABLE | 아바타 이미지 URL |
| created_at | timestamptz | default now() | 생성 시각 |
| updated_at | timestamptz | default now(), trigger | 수정 시각 |

**인덱스**: `nickname (UNIQUE)`
**트리거**: `set_updated_at` BEFORE UPDATE

### posts
(동일 형식 반복)

## 공통 규칙

- 모든 테이블: `id uuid default gen_random_uuid()`, `created_at`, `updated_at`
- 모든 `updated_at`: `set_updated_at()` 트리거 적용
- 삭제 정책: {hard-delete | soft-delete 명시}

## 마이그레이션 파일

- `supabase/migrations/{ts}_init_schema.sql`
```

---

## appendix-auth-design.md (Phase 2, 부록)

```markdown
# Auth Design

## 인증 방식

- **Provider**: Email + Password (표준)
- **이메일 인증**: 필수 (Supabase Auth 기본 동작)
- **비밀번호 정책**: 8자 이상
- **세션**: Supabase 기본 (access token 1h, refresh token 자동 갱신)

## profiles 테이블

`auth.users`는 Supabase가 관리하므로, 프로필 정보는 별도 `profiles` 테이블에 저장.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | `auth.users.id` 참조 |
| nickname | text | 닉네임 |
| avatar_url | text | 아바타 URL |
| role | user_role | enum: user / admin (선택) |

## 자동화 트리거

### handle_new_user
`auth.users` insert 시 `profiles`에 빈 row 자동 생성.

\`\`\`sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
\`\`\`

## Supabase Dashboard 설정 체크리스트

- [ ] Auth → Providers → **Email** Enabled
- [ ] Auth → Settings → **Confirm email** ON
- [ ] Auth → URL Configuration:
  - Site URL: `http://localhost:5173`
  - Redirect URLs: `http://localhost:5173/*`, 프로덕션 URL
- [ ] Auth → Email Templates → 필요 시 한국어 커스터마이즈

## 클라이언트 플로우

1. 회원가입 → 이메일 인증 링크 → 인증 완료 → 로그인 가능
2. 로그인 → access token 저장 (localStorage, Supabase 기본) → 이후 자동 첨부
3. 로그아웃 → 세션 삭제 → 앱 상태 초기화
```

---

## appendix-auth-ui-spec.md (Phase 2, NEW · component-work 입력 사양)

```markdown
# appendix. Auth UI Spec ({Project})

> `/component-work` 의 입력 사양. 이 파일을 component-work 가 Read 해서 컴포넌트 + 스토리 자동 생성.
> 사용자 호출: `/component-work LoginForm SignUpForm AuthGuard`

## 컴포넌트 목록

### 1. LoginForm

- **카테고리**: input
- **경로**: `src/components/input/LoginForm.jsx`
- **소비할 훅**: `useSignIn` (`src/hooks/auth/useSignIn.js`)
- **필드**: email, password
- **상태**: loading / error / success
- **동작**: 입력 후 submit → `signIn({email, password})` 호출 → 성공 시 onSuccess 콜백
- **Props**:
  - `onSuccess?: () => void`. 로그인 성공 시 콜백 (예: 라우팅)
  - `redirectTo?: string`. 로그인 후 이동 경로 (default: `/`)
- **Storybook 스토리**: Default / Loading / WithError (mock useSignIn 주입)

### 2. SignUpForm

- **카테고리**: input
- **경로**: `src/components/input/SignUpForm.jsx`
- **소비할 훅**: `useSignUp` (`src/hooks/auth/useSignUp.js`)
- **필드**: email, password, password_confirm, nickname (선택)
- **상태**: loading / error / awaiting_email_confirmation
- **동작**: submit → `signUp({email, password, nickname})` 호출 → 인증 메일 발송 안내 표시
- **Props**: `onSuccess?: () => void`
- **Storybook 스토리**: Default / Loading / AwaitingEmailConfirmation / WithError

### 3. AuthGuard

- **카테고리**: layout
- **경로**: `src/components/layout/AuthGuard.jsx`
- **소비할 훅**: `useAuth`
- **동작**: children 을 감싸고 비로그인 시 `<Navigate to="/auth" />`
- **Props**:
  - `children: ReactNode`
  - `fallback?: ReactNode`. 비로그인 시 표시할 컴포넌트 (default: redirect)
- **Storybook 스토리**: Authenticated / Unauthenticated (mock useAuth 주입)

## 디자인 시스템 준수

- 모든 form 은 MUI `TextField` + `Button` 재활용
- 에러 메시지는 한국어 (supabaseError.js 정규화 결과)
- spacing / typography 는 theme 토큰만 사용 (직접값 금지)
```

---

## appendix-rls-policies.md (Phase 3, 부록)

```markdown
# RLS Policies

## 개요

- 모든 테이블 `ENABLE ROW LEVEL SECURITY` 적용
- 기본 원칙: **DENY by default, 명시적 ALLOW만 허용**

## 정책 매트릭스

| 테이블 | SELECT | INSERT | UPDATE | DELETE | 패턴 |
|--------|--------|--------|--------|--------|------|
| profiles | 모두 | 자동(트리거) | 본인만 | 본인만 | public-read-owner-write |
| posts | 모두 | 로그인 | 본인만 | 본인만 | public-read-owner-write |
| comments | 모두 | 로그인 | 본인만 | 본인 or 글주인 | custom |
| private_notes | 본인만 | 본인만 | 본인만 | 본인만 | owner-only |

## 테이블별 상세

### profiles
\`\`\`sql
alter table profiles enable row level security;

create policy "profiles_select_all"
  on profiles for select
  using (true);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);
\`\`\`

### posts
(동일 형식)

## 검증 결과

| 테스트 | 결과 |
|--------|------|
| 비로그인 SELECT private_notes | ✅ 차단 |
| 사용자 A가 사용자 B의 post UPDATE | ✅ 차단 |
| 본인 post UPDATE | ✅ 허용 |
| (나머지 검증 결과) | |
```

---

## appendix-api-integration.md (Phase 4·5 통합, 부록)

```markdown
# API Integration Guide

## 파일 구조

- `src/lib/supabase.js`. client singleton
- `src/utils/supabaseError.js`. 에러 정규화
- `src/types/database.js`. JSDoc 타입
- `src/hooks/auth/`. useAuth, useSignIn, useSignUp, useSignOut
- `src/hooks/data/`. 데이터별 CRUD 훅

## 사용 예시

### 회원가입
\`\`\`jsx
const { signUp, loading, error } = useSignUp();
await signUp({ email, password });
// → 이메일 인증 메일 발송됨
\`\`\`

### 로그인
\`\`\`jsx
const { signIn, loading, error } = useSignIn();
await signIn({ email, password });
\`\`\`

### 데이터 조회
\`\`\`jsx
const { data: posts, loading, error } = usePosts();
\`\`\`

### 데이터 생성
\`\`\`jsx
const { createPost } = useCreatePost();
await createPost({ title, content });
\`\`\`

## 에러 처리

모든 Supabase 에러는 `supabaseError.js`를 거쳐 한국어 메시지로 변환된다.
커스텀 매핑이 필요하면 `resources/error-catalog.md` 참조.

## 자주 발생하는 이슈

### Q. 회원가입 후 로그인이 안 돼요
A. 이메일 인증이 필수로 설정되어 있다. Inbox 확인.

### Q. RLS 차단 에러 (42501)
A. `06-rls-policies.md`에서 해당 테이블 정책 확인.

### Q. Storybook에서 Supabase 호출이 실행돼요
A. 훅에 `{ client }` 파라미터로 mock 주입. `storybook-mock.md` 참조.

## OAuth 확장

현재는 Email+Password만. Google/GitHub 등 OAuth 추가는 `resources/auth-flows.md#oauth-확장`.
```

---

## appendix-edge-functions.md (Phase 6, 조건부, 부록)

```markdown
# Edge Functions. 외부 API 연동

## 개요

외부 API(OpenAI/결제/SMS 등)를 호출하는 모든 경로는 Edge Function으로 서버화되어 있다.
비밀 키는 Supabase secrets에만 존재하며 프론트 번들에 노출되지 않는다.

관련 가이드: `.claude/skills/supabase-integration/resources/edge-functions.md`

## 함수 목록

| 함수명 | 목적 | 호출 권한 | 외부 의존 | 필요 secret | Rate Limit |
|-------|-----|---------|---------|-----------|-----------|
| chat-completion | OpenAI 챗 응답 | 로그인 사용자 | api.openai.com | OPENAI_API_KEY | 100회/일 (free), 무제한 (paid) |
| send-sms | 인증 문자 발송 | 로그인 사용자 | Twilio | TWILIO_SID, TWILIO_TOKEN | 5회/시간/user |
| stripe-webhook | 결제 이벤트 수신 | 퍼블릭 (서명 검증) | Stripe | STRIPE_WEBHOOK_SECRET | N/A |

## 함수별 계약

### `chat-completion`

**Method**: POST
**Auth**: Supabase JWT 필수
**입력**:
\`\`\`json
{ "messages": [{ "role": "user", "content": "..." }] }
\`\`\`
**출력 (성공)**:
\`\`\`json
{ "data": { "choices": [{ "message": { "content": "..." } }] } }
\`\`\`
**에러 코드**: `unauthorized` (401) / `invalid_input` (400) / `quota_exceeded` (429) / `upstream_error` (502)

## 프론트 호출 패턴

\`\`\`jsx
import { useChatCompletion } from '@/hooks/data/useChatCompletion';

const { send, data, loading, error } = useChatCompletion();
await send([{ role: 'user', content: '...' }]);
\`\`\`

## 로컬 개발

\`\`\`bash
# 1. secret 로컬 env 파일 세팅 (.gitignore됨)
echo "OPENAI_API_KEY=sk-..." > supabase/functions/.env.local

# 2. 로컬 실행
pnpm functions:serve

# 3. 다른 터미널에서 테스트
curl -X POST http://localhost:54321/functions/v1/chat-completion \
  -H "Authorization: Bearer $(supabase status -o json | jq -r .anon_key)" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hi"}]}'
\`\`\`

## 배포

\`\`\`bash
# secret 원격 등록 (최초 1회 + 변경 시)
supabase secrets set OPENAI_API_KEY=sk-...

# 함수 배포
pnpm functions:deploy chat-completion
\`\`\`

## Stage A → C 이전 기록 (감사용)

| 날짜 | 함수 | Stage A 키 revoke 여부 | 번들 검증 |
|------|------|---------------------|----------|
| YYYY-MM-DD | chat-completion | ✅ revoked | ✅ 0건 |

## 운영 체크리스트

- [ ] 모든 함수가 JWT 검증 (퍼블릭은 서명 검증)
- [ ] Secret이 `.env*` 파일에 없음
- [ ] `pnpm build && grep -r "sk-" dist/` → 0건
- [ ] 함수 로그에서 PII 평문 미노출
- [ ] Rate limit 정책 문서화
```
