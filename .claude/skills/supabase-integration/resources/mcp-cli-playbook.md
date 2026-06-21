# MCP + CLI Playbook

전 Phase에서 참조. Supabase MCP 서버와 Supabase CLI의 역할 분담 규칙.

---

## 핵심 원칙

> **"탐색·검증은 MCP, 상태 변경은 CLI 마이그레이션"**

- **MCP**: 읽기 쿼리, RLS 테스트, 디버깅, 스키마 탐색
- **CLI**: 프로젝트 생성, 마이그레이션 파일, 타입 생성, 배포
- **절대 금지**: MCP로 `CREATE/ALTER/DROP TABLE`, `CREATE POLICY`, `CREATE FUNCTION` 등 상태 변경
  - 이유: 재현성 없음, 팀 공유 불가, 롤백 불가

---

## 작업별 도구 선택

### Phase 0 — Prereq Check

| 작업 | 도구 | 명령 |
|------|------|------|
| CLI 설치 확인 | Bash | `supabase --version` |
| 프로젝트 연결 상태 | CLI | `supabase status` |
| env 변수 확인 | Bash | `grep VITE_SUPABASE .env.local` |
| MCP 연결 확인 | MCP | 간단한 쿼리 `SELECT 1` |

### Phase 1 — Schema Design

| 작업 | 도구 |
|------|------|
| 기존 스키마 탐색 | **MCP** (`SELECT * FROM information_schema.tables WHERE table_schema='public'`) |
| 마이그레이션 파일 생성 | **CLI** (`supabase migration new init_schema`) |
| 마이그레이션 내용 작성 | **파일 편집** (Edit/Write) |
| 로컬 적용 테스트 | **CLI** (`supabase db reset`) |
| 적용 결과 확인 | **MCP** (테이블 조회) |

### Phase 2 — Auth

| 작업 | 도구 |
|------|------|
| `auth.users` 구조 확인 | **MCP** (read-only) |
| profiles 마이그레이션 생성 | **CLI** (`supabase migration new auth_profiles`) |
| handle_new_user 트리거 작성 | **파일 편집** |
| Dashboard 설정 (Email, Redirect) | **수동** (사용자가 직접) |
| 트리거 동작 검증 | **MCP** (테스트 insert 후 profiles 조회) |

### Phase 3 — RLS

| 작업 | 도구 |
|------|------|
| 현재 정책 조회 | **MCP** (`SELECT * FROM pg_policies WHERE schemaname='public'`) |
| 정책 마이그레이션 생성 | **CLI** (`supabase migration new rls_policies`) |
| 정책 작성 | **파일 편집** |
| RLS 적용 검증 | **MCP** (anon 키로 쿼리 시뮬레이션) |
| 보호 테이블 접근 차단 검증 | **MCP** |

### Phase 4 — Client Integration

| 작업 | 도구 |
|------|------|
| 타입 덤프 | **CLI** (`supabase gen types typescript --linked`) |
| JSDoc 변환 | **Bash** (`node scripts/ts-to-jsdoc.mjs`) |
| 의존성 설치 | **Bash** (`pnpm add @supabase/supabase-js`) |
| 훅 파일 생성 | **Write** |
| 인증 UI 컴포넌트 | **Skill 호출** (component-work) |

### Phase 5 — Verification

| 작업 | 도구 |
|------|------|
| 마이그레이션 적용 (원격) | **CLI** (`supabase db push`) |
| 마이그레이션 적용 (로컬) | **CLI** (`supabase db reset`) |
| seed 데이터 | **CLI** (`supabase db reset` 시 자동 실행) |
| 기능별 smoke 테스트 | **MCP** (쿼리로 검증) |
| 로컬 개발 서버 | **Bash/CLI** (`supabase start`) |

### Phase 6 — Edge Functions

| 작업 | 도구 |
|------|------|
| 함수 스켈레톤 생성 | **CLI** (`supabase functions new <name>`) |
| 함수 코드 작성 | **파일 편집** (Write/Edit) |
| secret 등록 | **CLI** (`supabase secrets set KEY=value`) |
| secret 목록 확인 | **CLI** (`supabase secrets list`) |
| 로컬 함수 실행 | **CLI** (`supabase functions serve <name> --env-file supabase/functions/.env.local`) |
| 로컬 함수 호출 테스트 | **Bash** (`curl`) |
| 배포 | **CLI** (`supabase functions deploy <name>`) |
| 배포된 함수 로그 조회 | **MCP** 또는 Dashboard Logs |
| 호출 카운트 집계 검증 | **MCP** (read-only 쿼리) |
| 번들 키 유출 검증 | **Bash** (`pnpm build && grep -r "sk-" dist/`) |

---

## 자주 쓰는 CLI 명령

```bash
# 프로젝트 초기화 (최초 1회)
supabase init

# 원격 프로젝트 연결 (최초 1회)
supabase link --project-ref <ref>

# 로컬 Supabase 기동 (개발 중)
supabase start

# 로컬 DB 리셋 + 모든 마이그레이션 재적용
supabase db reset

# 마이그레이션 파일 생성
supabase migration new <name>

# 원격에 마이그레이션 적용
supabase db push

# 원격 ↔ 로컬 스키마 차이 확인
supabase db diff

# TypeScript 타입 생성 (원격 기준)
supabase gen types typescript --linked > /tmp/db.ts

# 로컬 상태
supabase status

# 정지
supabase stop

# --- Edge Functions (Phase 6) ---

# 함수 스켈레톤 생성
supabase functions new <name>

# secret 등록 / 삭제 / 조회
supabase secrets set KEY=value
supabase secrets unset KEY
supabase secrets list

# 로컬 실행 (hot reload)
supabase functions serve <name> --env-file supabase/functions/.env.local

# 배포
supabase functions deploy <name>

# 모든 함수 일괄 배포
supabase functions deploy
```

---

## 자주 쓰는 MCP 쿼리 (읽기 전용)

```sql
-- 모든 public 테이블 목록
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- 특정 테이블 컬럼
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'posts';

-- 모든 RLS 정책
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies WHERE schemaname = 'public';

-- RLS 활성 상태
SELECT tablename, rowsecurity
FROM pg_tables WHERE schemaname = 'public';

-- 트리거 목록
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers WHERE trigger_schema = 'public';

-- 최근 에러 로그 (supabase hosted only)
-- → Dashboard의 Logs → Postgres 섹션 수동 확인 권장
```

---

## 금지 행동 (⛔)

- MCP로 `CREATE TABLE` / `ALTER TABLE` / `DROP TABLE`
- MCP로 `CREATE POLICY` / `DROP POLICY`
- MCP로 `INSERT INTO auth.users` (auth.admin API 사용)
- 프로덕션 DB에 `supabase db reset` (⚠️ 데이터 전부 삭제)
- `supabase db push --linked`를 미검증 상태로 실행 — 반드시 먼저 로컬에서 `db reset`으로 검증
- 외부 API 키를 `.env` / `.env.production` / 코드 리터럴에 저장 — Supabase secrets에만
- `supabase secrets set`한 값을 로그/코드에 echo — secret은 한 번 쓰고 잊는다

---

## 권장 워크플로우 순서 (Phase당)

```
1. MCP로 현재 상태 탐색
2. CLI로 마이그레이션 파일 생성
3. 에디터로 SQL 작성
4. 로컬: supabase db reset (적용 + 검증)
5. MCP로 결과 확인
6. 문제 없으면 커밋 + supabase db push (원격)
7. MCP로 원격 검증
```
