# Verification Checklist

Phase 3(RLS 검증), Phase 5(최종 검증), Phase 6(Edge Functions)에서 실행.

> **게이트 원칙**: 이 체크리스트의 **필수 항목은 전부 SQL/CLI/파일로 프로그래밍적 검증 가능**한 것만 포함. Dashboard UI 기반 항목은 UI 개편에 취약하므로 **필수 게이트로 두지 않음**. 이 프로젝트는 마이그레이션 전용이라 Studio UI로 테이블을 만들지 않으며, 따라서 "Dashboard 신규 테이블 RLS 기본값" 같은 UI 설정에 의존하지 않는다.

---

## Phase 3 RLS 자동 검증

### A. RLS 활성화 확인

**MCP 쿼리**:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**검증**: 모든 비시스템 테이블이 `rowsecurity = true`.
**실패 시**: 해당 테이블의 마이그레이션에 `alter table ... enable row level security;` 추가.

---

### B. 정책 누락 테이블 탐지

```sql
SELECT c.relname AS table_name
FROM pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND p.polname IS NULL;
```

**검증**: 결과 0행.
**실패 시**: 해당 테이블에 정책 추가 (의도적으로 완전 차단이면 "deny_all" 주석 남기기).

---

### C. 비로그인 접근 차단 테스트

MCP에서 anon role로 실행:

```sql
-- anon context
SET ROLE anon;

-- 소유자 전용 테이블 접근 시도
SELECT COUNT(*) FROM public.private_notes;

-- 기대 결과: 0 (RLS로 차단됨)

RESET ROLE;
```

---

### D. 다른 사용자 데이터 접근 차단 테스트

```sql
-- 사용자 A 세션으로 시뮬레이션
SET LOCAL request.jwt.claims = '{"sub": "user-A-uuid", "role": "authenticated"}';

-- 사용자 B의 post 수정 시도
UPDATE public.posts SET title = 'hacked' WHERE user_id = 'user-B-uuid';

-- 기대 결과: 0 rows affected
```

---

## Phase 5 최종 검증 체크리스트

### 인증 플로우

- [ ] 회원가입 API 호출 성공 (`auth.users` row 생성)
- [ ] `handle_new_user` 트리거로 `profiles` row 자동 생성
- [ ] 이메일 인증 메일 수신 (실제 테스트)
- [ ] 인증 링크 클릭 → `email_confirmed_at` 채워짐
- [ ] 로그인 성공 → access_token/refresh_token 발급
- [ ] 로그아웃 → 세션 초기화
- [ ] 브라우저 새로고침 후 세션 유지 확인
- [ ] 비밀번호 재설정 플로우 동작

### DB / 스키마

- [ ] 모든 테이블에 `id`, `created_at`, `updated_at` 존재
- [ ] 모든 FK에 `on delete` 정책 명시됨
- [ ] 모든 `updated_at`에 `set_updated_at` 트리거 부착
- [ ] 조회/조인에 쓰이는 FK 컬럼에 인덱스
- [ ] `supabase db reset`이 에러 없이 완료

### RLS (프로그래밍적 게이트)

- [ ] 모든 public 테이블 RLS 활성화 (`pg_tables.rowsecurity=true`)
- [ ] 모든 RLS 활성 테이블에 정책 존재 (`pg_policies` 조인 검증)
- [ ] B, C, D 테스트 전부 PASS

### RLS (보조·UI 확인, 선택)

Dashboard UI는 개편 주기가 짧다. 아래는 **찾을 수 있으면 참고용**이며 필수 게이트 아님. 못 찾으면 skip하고 위 SQL 결과를 최종 진실로 삼는다.

- [ ] (선택) Supabase Advisor 패널에서 RLS 관련 경고 0건
  - 위치가 바뀔 수 있으므로 좌측 메뉴에서 "Advisor" 라벨 탐색. 없으면 skip

### 클라이언트 코드

- [ ] `src/lib/supabase.js` singleton 동작
- [ ] 모든 데이터 훅이 `{ client }` 파라미터 받음
- [ ] 에러 메시지가 한국어로 정규화됨
- [ ] `src/types/database.js` JSDoc 생성됨
- [ ] `pnpm db:types` 스크립트 동작

### Storybook

- [ ] Supabase 호출 없이 스토리 렌더링
- [ ] mock client로 데이터 변형 스토리(Default/Empty/Loading/Error) 동작
- [ ] 인증 UI 컴포넌트 스토리 (LoggedIn/LoggedOut) 동작

### 보안

- [ ] `.env.local`에 `service_role` 키 없음
- [ ] `.env*.local`이 `.gitignore`에 포함
- [ ] 커밋에 `.env`, `supabase/.temp/` 포함 안 됨
- [ ] Dashboard Redirect URLs에 프로덕션/로컬 모두 등록

### 문서

- [ ] `docs/{project}/04-db-schema.md`
- [ ] `docs/{project}/05-auth-design.md`
- [ ] `docs/{project}/06-rls-policies.md`
- [ ] `docs/{project}/07-api-integration.md`
- [ ] 모든 문서의 예시 코드가 실제 구현과 일치

---

## 검증 자동화 스크립트 (선택)

`supabase/verify.sql` 파일로 저장해 `supabase db reset` 후 자동 실행 가능:

```sql
-- 1. RLS 활성화 미적용 테이블
do $$
declare
  bad_count int;
begin
  select count(*) into bad_count
  from pg_tables
  where schemaname = 'public' and rowsecurity = false;

  if bad_count > 0 then
    raise exception 'RLS not enabled on % table(s)', bad_count;
  end if;
end $$;

-- 2. 정책 없는 RLS 활성 테이블
do $$
declare
  orphan_count int;
begin
  select count(*) into orphan_count
  from pg_class c
  left join pg_policy p on p.polrelid = c.oid
  where c.relnamespace = 'public'::regnamespace
    and c.relkind = 'r'
    and c.relrowsecurity = true
    and p.polname is null;

  if orphan_count > 0 then
    raise warning '% table(s) have RLS enabled but no policies', orphan_count;
  end if;
end $$;

-- 3. updated_at 있는데 트리거 없는 테이블
do $$
declare
  missing_trigger int;
begin
  select count(*) into missing_trigger
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.column_name = 'updated_at'
    and not exists (
      select 1 from information_schema.triggers t
      where t.event_object_schema = c.table_schema
        and t.event_object_table = c.table_name
        and t.action_statement ilike '%set_updated_at%'
    );

  if missing_trigger > 0 then
    raise exception '% table(s) missing set_updated_at trigger', missing_trigger;
  end if;
end $$;
```

---

## Phase 6 검증 — Edge Functions

외부 API 연동이 포함된 경우에만 수행.

### 번들 유출 검증 (CRITICAL)

```bash
# 프로덕션 빌드 후 비밀키 패턴 검색
pnpm build
grep -rcE "sk-[A-Za-z0-9]{20,}|sk_live|sk_test|AIza[0-9A-Za-z_-]{35}" dist/
# 결과: 반드시 0
```

**0이 아니면**: 빌드 중단, 해당 키 즉시 revoke, Stage A 잔재 재확인.

### 함수별 스모크 테스트

각 Edge Function에 대해:

- [ ] **미인증 호출**: Authorization 헤더 없이 호출 → 401 반환
  ```bash
  curl -i -X POST https://<project>.supabase.co/functions/v1/<name> \
    -H "Content-Type: application/json" -d '{}'
  # 기대: HTTP/2 401
  ```
- [ ] **인증 호출**: 유효한 JWT로 호출 → 200 + 정상 응답
- [ ] **잘못된 입력**: 스키마 어긋나는 body → 400 반환
- [ ] **Rate limit** (있다면): 한도 초과 시 429 반환
- [ ] **권한 체크** (있다면): 권한 없는 사용자 호출 → 403 반환

### Secret 관리 검증

- [ ] `supabase secrets list` → 필요한 모든 키 존재
- [ ] `.env` / `.env.production` → 외부 API 키 없음
- [ ] 함수 코드 literal 검색: `grep -rE "sk-|sk_live|sk_test" supabase/functions/` → 0
- [ ] Stage A에서 쓰던 개발 키가 외부 서비스 Dashboard에서 **revoke 완료**

### 관찰성

- [ ] 함수 로그 조회 가능 (Supabase Dashboard → Logs → Edge Functions)
- [ ] 에러 응답 포맷이 `supabaseError.js`와 호환되는 `{ error: code }` 구조
- [ ] PII(이메일, 토큰 등)가 로그에 평문 기록되지 않음

### Storybook 호환

- [ ] `functions.invoke`가 `createMockSupabase()`에 포함됨
- [ ] 해당 훅을 쓰는 컴포넌트 스토리가 실제 API 없이 렌더됨
- [ ] Success / UpstreamError / RateLimit 상태별 스토리 존재 (해당 시)

### 정리 (Stage A → C 이전 완료 확인)

- [ ] `grep -r "VITE_DEV_" src/` → 0
- [ ] 구 Stage A 훅 파일 삭제됨
- [ ] `supabase/functions/.env.local`이 `.gitignore`에 포함됨
- [ ] `package.json`에 `functions:serve`, `functions:deploy` 스크립트 존재
