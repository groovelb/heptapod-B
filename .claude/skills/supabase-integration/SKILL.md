---
name: supabase-integration
description: Reads ux-flow's Entity ID Dictionary as the single input and produces data-bridge (main) plus appendix-* (db-schema / auth-design / rls-policies / api-integration / edge-functions). Read-only on ux-flow. Implementation constraints are reported back to the user, who must update ux-flow via /project-planning.
when_to_use: When user explicitly invokes /supabase-integration or asks to "connect supabase", "add backend", "set up auth", "create DB schema", "design RLS", "hide API key", "move API call to server", "add edge function". Do not auto-activate.
user-invocable: true
disable-model-invocation: true
---

# Supabase Integration Skill

> `02-ux-flow.md § 데이터 모델 활용` 을 유일한 입력으로 받아, **`04-data-bridge.md` (본문)** + `appendix-*.md` (부록 5종) 을 생성/갱신.
> ux-flow 는 **읽기만**. 데이터 모델 변경이 필요하면 사용자에게 보고 후 `/project-planning` 호출 요청.

## 활성화 조건

| 의도 | 트리거 예시 |
|------|-----------|
| 전체 연동 시작 | "/supabase-integration", "supabase 연동해줘", "백엔드 붙여줘" |
| data-bridge 만 | "데이터 흐름 표 만들어줘", "ux 와 db 연결해줘" |
| 스키마만 | "DB 스키마 만들어줘", "테이블 설계해줘" |
| 인증만 | "회원가입/로그인 붙여줘", "auth 설정해줘" |
| RLS만 | "RLS 정책 짜줘", "보안 정책 만들어줘" |
| 외부 API 서버 이전 | "OpenAI 키 숨겨줘", "API 호출 서버로 옮겨줘", "edge function 만들어줘" |
| 갱신 (delta sync) | "supabase 다시 동기화", "사전 바뀐 거 반영해줘" |

같은 호출 (`/supabase-integration`) 로 첫 작성 / 갱신 / delta sync 모두 처리. 별도 서브명령 없음. 스킬이 ux-flow ↔ data-bridge 비교해서 자동 분기.

---

## 전체 워크플로우

```
Phase 0           Phase 0.5 (NEW · 본문)        Phase 1+   (부록)
Prereq Check  →   Data Bridge              →    Schema → Auth → RLS → Client → Verify → Edge Fn
 (자동)            [승인 · 디자이너 게이트]       [appendix-* 산출, 개발자 영역]
```

**입력**: `docs/{project}/02-ux-flow.md § 데이터 모델 활용` (단일 진실 원천)

**산출 문서**:
- `04-data-bridge.md` (본문, 디자이너+개발자 합의 지점)
- `appendix-db-schema.md` (Phase 1)
- `appendix-auth-design.md` (Phase 2)
- `appendix-rls-policies.md` (Phase 3)
- `appendix-api-integration.md` (Phase 4·5 통합)
- `appendix-edge-functions.md` (Phase 6, 조건부)

**산출 코드**: `supabase/migrations/*.sql`, `supabase/functions/*/index.ts` (Phase 6), `src/lib/supabase.js`, `src/hooks/data/`, `src/types/database.js`

---

## 핵심 원칙 (절대 위반 금지)

1. **데이터 모델은 읽기만**. `02-ux-flow.md` 의 데이터 모델 카드 / 사전 / UX-flow / 페이지 리스트를 직접 수정 금지. 구현 제약 발견 시 사용자에게 보고만 한 뒤 작업 일시 중단.
2. **사용자에게 보고 후 정지**. 충돌 발생 시 다음 메시지 형식 사용:
   ```
   ⚠️ ux-flow 갱신 필요
   - 발견: {Supabase 가 강제하는 제약}
   - 영향: {ux-flow 의 어떤 부분과 충돌하는가}
   - 다음 행동: `/project-planning` 호출 → ux-flow § 데이터 모델 활용 갱신 → 다시 `/supabase-integration` 호출
   ```
3. **UX-first 질문**. 사용자에게는 **권한·관계·역할**만 묻는다. SQL 구문을 묻지 않는다.
4. **승인 게이트 엄수**. 각 Phase 는 독립 승인 단위. 승인 없이 다음 Phase 금지.
5. **상태 변경은 반드시 마이그레이션 파일로**. MCP 로 즉흥 `CREATE/ALTER/DROP` 금지. 탐색·검증만 MCP 사용.
6. **최소 권한 RLS 기본값**. 모든 테이블 `ENABLE ROW LEVEL SECURITY`, 명시적 정책 외 DENY.
7. **service_role key 프론트 금지**. `.env.local` 에는 `VITE_SUPABASE_ANON_KEY` 만. service_role 은 서버/MCP 전용.
8. **JS 프로젝트 컨벤션 준수**. TS 대신 JSDoc typedef 로 타입 제공 (`src/types/database.js`).
9. **Storybook 호환**. 모든 데이터 훅은 `{ client }` 파라미터 주입 가능하도록 설계.
10. **인증 UI 는 component-work 에 위임**. 이 스킬은 훅만 만들고, UI 생성은 `component-work` 스킬 호출.
11. **비밀키는 절대 프론트에 두지 않는다**. 외부 API 키는 `VITE_*` 노출 금지. Vite env 는 번들에 평문으로 박힘.
12. **모든 Phase 는 "설명 → 질문 → 실행" 순서**. 사용자가 학습 중이라는 전제. 작업만 하지 말고 각 Phase 진입 시 개념·이유·위험을 먼저 설명.
13. **프로그래밍적으로 검증 못 하는 건 게이트가 될 수 없다** (CRITICAL). Dashboard UI 등 LLM 이 직접 관측 못 하는 상태는 필수 체크리스트로 두지 않는다. SQL/CLI/파일 검사로 등가 검증을 만들어 게이트화.
14. **사용자가 "없음/못 찾음" 보고 시 flip 금지** (CRITICAL). UI 가 바뀌었을 가능성을 인정하되 원래 스킬 주장을 부정하지 않는다.

---

## Phase 진입 설명 포맷 (모든 Phase 공통)

각 Phase 시작 시 **반드시 아래 6 항목을 출력** 후 작업.

```
## Phase N. {이름}

### 📘 이 단계가 하는 일
{1~2줄: 목적}

### 🎨 디자이너 관점
{이 단계가 끝나면 디자이너는 무엇을 알게 되는가, 1줄}

### 🧠 알아야 할 개념
- {개념1}: {왜 중요한지 1줄}
- {개념2}: {왜 중요한지 1줄}

### ❓ 왜 이 단계가 필요한가
{건너뛰거나 잘못하면 어떤 문제가 생기는지 2~3줄}

### ⚠️ 주의할 점
- {흔한 실수 / 되돌리기 어려운 작업 / 위험 신호}

### ▶ 지금부터 할 일
1. {사용자에게 물어볼 것}
2. {읽을 문서/파일}
3. {생성할 파일·실행할 명령}
```

---

## Phase 0. Prerequisites Check (자동, 승인 불필요)

### 📘 이 단계가 하는 일
후속 Phase 가 안전하게 동작할 환경 + 입력 문서 정합성 점검.

### 🎨 디자이너 관점
이 단계는 점검만. 디자이너 결과물 변화 없음.

### 체크 항목

1. **입력 문서 존재 + 2 컴포넌트 완전성**
   - `docs/{project}/02-ux-flow.md` 존재
   - § 데이터 모델 안에 다음 2 컴포넌트 모두 존재:
     - 데이터 모델 카드 (1개 이상)
     - **데이터 모델 활용** (필수)
   - § UX-flow 단계별 서사 존재
   - § 페이지 리스트 존재
   - 사전의 "예상 테이블명" 칸이 모두 채워져 있는지 (미정 = 차단)
   - **SQL 예약어 충돌 검증**: `.claude/skills/project-planning/resources/sql-reserved-words.md` Read. 사전의 "예상 테이블명" 컬럼이 PG 예약어 또는 흔한 충돌 단어 (`references`, `user`, `order`, `group` 등) 와 일치하면 차단 + 사용자에게 ux-flow 갱신 요청. Supabase 예약 스키마 (`auth.*` / `storage.*` / `realtime.*`) 는 `auth.users` 만 허용.
   - 누락 시 → "`/project-planning` 으로 ux-flow 완성 후 다시 호출하세요"

2. **환경 변수 / CLI / 디렉터리 / MCP 확인** (기존과 동일)
   - `.env.local`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `.gitignore`
   - `supabase --version`
   - `supabase/` 디렉터리 + `supabase init` 안내
   - Supabase MCP 응답 (선택)

### 산출

체크 결과 표. 누락 항목이 있으면 해결 후 다시 호출 요청. 모두 ✅면 Phase 0.5 자동 진행.

---

## Phase 0.5. Data Bridge (NEW, 본문 작성, 디자이너+개발자 합의 지점)

### 📘 이 단계가 하는 일
ux-flow 의 데이터 모델이 **Supabase 와 어떻게 연결되는지** 쉽게 설명하는 본문 작성. 첫 화면은 "데이터명 → 테이블명" 1:1 매핑 한 표. 디테일 (프론트 훅·라이프사이클·정합성) 은 그 아래에 점진적으로.

### 🎨 디자이너 관점
"내가 02 에서 그린 데이터가 모두 매트릭스에 있는가" 확인. 이 단계가 끝나면 디자이너는 자기 디자인이 어떻게 데이터로 내려가는지 한 페이지로 본다.

### 🧠 알아야 할 개념
- **단일 진실 원천**: ux-flow § 데이터 모델 활용. data-bridge 는 그 표를 컬럼 4개 (데이터 / 화면 / 프론트 / DB) 로 확장만 함.
- **글자 단위 일치**: data-bridge 의 데이터명 와 화면명은 ux-flow 의 그것과 글자 단위로 일치해야 함. 다르면 차단.

### ❓ 왜 필요한가
스키마부터 그리면 디자이너가 SQL 표를 읽어야 한다. data-bridge 를 먼저 합의하면 디자이너는 끝까지 자연어로 검토 가능, 개발자는 부록 (DDL) 으로 깊게 갈 수 있다.

### ⚠️ 주의할 점
- 컬럼 / SQL / 제약 / 정책 표기 금지. 그건 부록 영역.
- 사전에 없는 데이터명 등장 시 즉시 정지 + 사용자 보고.

### 작업 순서

1. **입력 Read (5종 모두 필수)**:
   - `docs/{project}/02-ux-flow.md § 데이터 모델 활용` (사전, 데이터명·테이블명 1:1)
   - `docs/{project}/02-ux-flow.md § 페이지 리스트` (페이지·경로·다루는 데이터)
   - `docs/{project}/02-ux-flow.md § UX-flow` (단계별 서사. 외부 API/비동기 트리거 추출)
   - `docs/{project}/02-ux-flow.md § 컴포넌트 리스트` (신규 컴포넌트. 매트릭스 컬럼 3 의 일부)
   - `docs/{project}/appendix-screen-component-map.md` (재활용/수정/신규 전체. 매트릭스 컬럼 3 의 나머지)
2. `resources/doc-templates.md` § "04-data-bridge.md" 템플릿 Read
3. **자동 매핑** (사용자 질문 0):
   - 데이터명 ← 사전 그대로
   - 화면 ← UX-flow 단계별 서사에서 데이터명 등장 페이지 합집합
   - 프론트 (store/hook/컴포넌트) ← 추정 규칙: `museStore.{소문자}` + `use{데이터명}()` + 페이지 리스트와 컴포넌트 (신규+재활용) 에서 데이터 다루는 컴포넌트 1~3개
   - DB ← 사전 "예상 테이블명" + RLS 패턴 추론 (소유자만 = `owner-only`, M:N = `owner-via-join`, 공개 = `public-read-owner-write`)
   - 외부 의존 ← UX-flow 단계별 서사의 트리거 동사 ("AI 가 ~", "업로드", "메일 발송" 등)
4. **추론 신뢰도 검사**: 위 자동 매핑 중 다음 중 하나라도 발생 시 **한 번에 묶어서** 사용자에게 묻기 (각 데이터별 1회씩 묻기 X):
   - 화면 컬럼이 비었거나 모호 (UX-flow 단계별 서사에 데이터가 등장 안 함)
   - 프론트 컬럼의 컴포넌트 매핑이 신뢰도 낮음 (3개 후보 중 1개도 명확하지 않음)
   - DB 컬럼의 RLS 패턴이 모호 (소유자가 사용자/팀/공개 중 어느 것인지)
   - 묻기 형식: "다음 데이터의 매핑이 불확실. 한 번에 답해주세요: [표]"
5. `docs/{project}/04-data-bridge.md` 작성. **3 가지 질문에 답하는 구조** 강제. 디자이너가 가장 쉽게 이해하도록:
   - **§ 1. 데이터 모델은 어떤 DB 테이블이 되나?** (한 줄 매핑)
     - ux-flow 사전을 그대로 인용. 데이터명 → 예상 테이블명 → 1줄 설명 표 1개.
     - 디자이너가 펼쳤을 때 압박 0.
   - **§ 2. UX-flow 의 어느 시점에 DB 가 업데이트되나?** (시점별 자연어)
     - ux-flow 의 UX-flow 단계별 서사를 그대로 따라가며, 각 단계에서 어떤 테이블이 어떻게 변하는지 한 문장씩.
     - 형식: "{시나리오 N} - {단계} → `{테이블명}` insert/update/read"
     - 외부 API 호출이 있는 단계는 자연어로 추가 설명 (1줄).
   - **§ 3. 각 페이지는 어떤 DB 와 연결되나?** (페이지 중심 표)
     - 페이지명 → 다루는 테이블 + 동작 (R/W) 표.
     - ux-flow 페이지 리스트의 6 페이지 모두 등장.
   - **§ 4. (선택) 외부 의존 데이터의 라이프사이클** (시퀀스 다이어그램)
     - 외부 API/Storage/Auth 가 끼는 데이터만. 외부 의존 0이면 § 4 생략.
   - **§ 5. 정합성 체크** (작성/갱신 시 자동 검증)
   - 자동 채움: § 1 (사전 인용), § 2 (UX-flow 단계별 서사 변환), § 3 (페이지 리스트 + § 1 매핑 결합), § 5. 추론 신뢰도 낮은 부분만 빈칸 + 사용자에게 한 번에 묻기.
   - **금지**: SQL/컬럼/제약/훅 코드 (모두 부록 영역).
6. **3 단답 승인 게이트**:
   - "메인 매트릭스의 데이터 모델 활용과 1:1 일치 OK?"
   - "외부 의존 컬럼 (위자드/업로드 등) 빠진 거 없음?"
   - "라이프사이클 시퀀스의 actor 이름 OK?"

### Storybook 미러 자동 생성 (모든 산출 직후 자동)

각 Phase (0.5 / 1 / 2 / 3 / 4·5 / 6) 가 부록 / 본문 .md 를 산출하는 즉시 다음 자동 작업:

1. 대응하는 .mdx 파일이 `src/stories/overview/{project}-planning/` 에 있는지 확인.
2. 없으면 신규 생성. 양식:
   ```mdx
   import { Meta, Markdown } from '@storybook/addon-docs/blocks';
   import raw from '../../../../docs/{project}/{filename}.md?raw';

   <Meta title="Overview/{Project} Planning/{sidebar path}" />

   <Markdown>{raw}</Markdown>
   ```
3. sidebar title 매핑:
   - `04-data-bridge.md` → `Overview/{Project} Planning/04 Data Bridge`
   - `appendix-db-schema.md` → `Overview/{Project} Planning/Appendix/DB Schema`
   - `appendix-auth-design.md` → `Overview/{Project} Planning/Appendix/Auth Design`
   - `appendix-rls-policies.md` → `Overview/{Project} Planning/Appendix/RLS Policies`
   - `appendix-api-integration.md` → `Overview/{Project} Planning/Appendix/API Integration`
   - `appendix-edge-functions.md` → `Overview/{Project} Planning/Appendix/Edge Functions`
4. 이미 있으면 sidebar 경로만 갱신. 깨진 import (삭제된 .md 참조) 는 .mdx 도 함께 삭제.

### 갱신 모드 (재호출 시)

이미 `04-data-bridge.md` 가 있으면:
1. ux-flow § 사전과 data-bridge § 매트릭스 비교
2. delta (추가/삭제/이름 변경) 감지
3. 변경분만 수정 (전체 재작성 금지)
4. 영향 받는 appendix 목록 표시 (Phase 1+ 에서 갱신 대상)
5. 영향 받는 .mdx 미러도 함께 갱신/삭제

---

## Phase 1. Schema (`appendix-db-schema.md`, 부록)

**산출 문서명 변경**: `04-db-schema.md` → `appendix-db-schema.md` (부록 위상 명시)

### 📘 이 단계가 하는 일
data-bridge 의 DB 컬럼 (테이블명) 을 PostgreSQL DDL 로 변환.

### 🎨 디자이너 관점
이 단계는 부록. 디자이너는 펼치지 않아도 됨.

### 🧠 알아야 할 개념
(기존 동일: 테이블 vs 데이터 모델 / UUID PK / created_at, updated_at / soft delete / FK on delete / 마이그레이션)

### ❓ 왜 필요한가
DB 스키마는 한 번 박히면 바꾸기 어려운 뼈대. data-bridge 의 테이블명을 그대로 받아 DDL 화.

### ⚠️ 주의할 점
- ux-flow 사전 의 "예상 테이블명" 과 다른 이름으로 만들면 차단.
- Supabase 가 강제하는 이름 (`auth.users` 등) 과 사전이 충돌하면 **정지 + 사용자에게 ux-flow 갱신 요청** (직접 수정 금지).

### 작업 순서

1. `04-data-bridge.md` § 메인 매트릭스 Read → 테이블 목록 추출
2. `resources/schema-patterns.md` Read → 공통 패턴
3. `resources/trigger-patterns.md` Read → `updated_at`, `handle_new_user` 트리거
4. `resources/doc-templates.md` § "appendix-db-schema.md" 템플릿 Read
5. **사용자 확인 질문 (UX 레벨만)**:
   - 각 데이터의 **소유자**가 누구인지
   - **삭제 정책**: hard / soft
   - **다국어 필드** 여부
   - (관계는 ux-flow 사전 + UX-flow 단계별 서사에서 추론. 직접 묻기 가능)
6. `docs/{project}/appendix-db-schema.md` 작성 (ERD + 테이블 상세 + 마이그레이션 경로)
7. 마이그레이션 파일 생성: `supabase migration new init_schema`

### 승인 게이트
- ERD 다이어그램 + 테이블 개수 / FK / 마이그레이션 파일 경로 요약

---

## Phase 2. Auth (`appendix-auth-design.md` + `appendix-auth-ui-spec.md`, 부록)

**산출 문서**: `appendix-auth-design.md` (트리거 SQL · Dashboard 체크리스트) + **`appendix-auth-ui-spec.md`** (component-work 입력 사양, NEW)

### 📘 이 단계가 하는 일
Email+Password 인증 + `profiles` 자동화 + 인증 UI 컴포넌트 사양 명세.

### 🎨 디자이너 관점
"사용자" 데이터가 가입/로그인 흐름에서 어떻게 만들어지는지 인지.

### 작업 순서 (요점)

1. `resources/auth-flows.md` Read
2. 사용자 확인 질문 4개 (이메일 인증 / 비밀번호 정책 / profiles 필드 / 역할 시스템)
3. `appendix-auth-design.md` 작성 (트리거 SQL + Dashboard 체크리스트)
4. 마이그레이션 파일 생성 (`auth_profiles`)
5. **`appendix-auth-ui-spec.md` 자동 생성** (component-work 입력 사양):
   - 컴포넌트 목록: `LoginForm` / `SignUpForm` / `AuthGuard`
   - 각 컴포넌트의 props · 소비할 훅 (`useSignIn` / `useSignUp` / `useAuth`) · 필드 · 상태 (loading/error/success) · 카테고리 · Storybook 스토리 요구사항

### Phase 2 종료 메시지 (강제 형식)

```
✅ Phase 2 완료. 인증 UI 컴포넌트 생성이 필요합니다.

이 스킬은 component-work 를 자동 호출할 수 없습니다 (스킬 간 호출 제한).
다음 명령을 직접 실행하세요:

/component-work LoginForm SignUpForm AuthGuard

스펙은 docs/{project}/appendix-auth-ui-spec.md 에 자동 작성됨.
component-work 가 그 파일을 입력으로 받아 컴포넌트 + 스토리를 생성합니다.

(미실행 시 Phase 4 의 인증 UI 부분이 비어있게 됨)
```

이 메시지는 **반드시 위 문구 형식** 으로 출력. 사용자가 그대로 복사·붙여넣기 가능하게.

---

## Phase 3. RLS (`appendix-rls-policies.md`, 부록)

**산출 문서명 변경**: `06-rls-policies.md` → `appendix-rls-policies.md`

### 📘 이 단계가 하는 일
data-bridge § 매트릭스의 R/W 권한을 PostgreSQL RLS 정책으로 변환.

### 🎨 디자이너 관점
"이 화면에서 이 데이터를 누가 읽는가" 가 그대로 정책이 됨. 디자이너 매트릭스 = 보안 경계.

(작업 순서 / 패턴 매핑 / 승인 게이트는 기존 동일. 산출 문서 경로만 변경.)

---

## Phase 4·5. Client + Verify (`appendix-api-integration.md`, 부록)

**산출 문서명 변경**: `07-api-integration.md` → `appendix-api-integration.md`. Phase 4 (Client Integration) + Phase 5 (Migration & Verification) 산출을 한 부록으로 통합.

### 📘 이 단계가 하는 일
훅 / 클라이언트 / 에러 정규화 코드 생성 + 마이그레이션 적용 + 스모크 테스트.

### 🎨 디자이너 관점
이 단계 끝나면 Storybook 에서 mock 으로 데이터 훅이 동작. 디자이너는 실제 데이터 없이 화면 검토 가능.

(작업 순서 / 검증 SQL / 승인 게이트는 기존 Phase 4 + Phase 5 동일.)

---

## Phase 6. Edge Functions (`appendix-edge-functions.md`, 부록, 조건부)

**산출 문서명 변경**: `08-edge-functions.md` → `appendix-edge-functions.md`

(전체 내용 기존 Phase 6 동일. 외부 API 호출이 있을 때만 진행.)

---

## 갱신 모드 (delta sync, 같은 호출로 자동 처리)

사용자가 ux-flow 사전을 갱신한 후 `/supabase-integration` 을 다시 부르면:

1. Phase 0 (Prereq) 자동 실행. 2 컴포넌트 정합성 + 사전 완전성 재검사.
2. ux-flow § 사전 ↔ `04-data-bridge.md` § 메인 매트릭스 비교 → delta 추출:
   - 추가된 데이터명
   - 삭제된 데이터명
   - 이름 변경된 데이터명
   - 테이블명 변경
   - 새 외부 의존성
3. 변경 요약 표 + 영향 받는 appendix 목록 사용자에게 제시.
4. 사용자 승인 후 영향 받는 부록만 부분 갱신 (Phase 별로). 나머지는 변화 없음.
5. 마이그레이션은 새 파일 생성 (기존 마이그레이션 수정 금지).

---

## MCP + CLI 사용 규칙 (요약)

| 작업 유형 | 도구 |
|----------|------|
| 스키마 탐색, 테스트 쿼리, RLS 검증, 디버깅 | **MCP** |
| `supabase init` / `link` / `migration new` / `db push` / `gen types` / `start` | **CLI** |

**규칙**: "탐색·검증은 MCP, 상태 변경은 CLI 마이그레이션". 상세는 `resources/mcp-cli-playbook.md`.

---

## Resources

| 파일 | 용도 | 언제 Read |
|------|------|----------|
| `doc-templates.md` | data-bridge + appendix 5종 템플릿 | 각 Phase 문서 작성 시 |
| `schema-patterns.md` | 공통 스키마 패턴 | Phase 1 |
| `trigger-patterns.md` | 트리거 SQL 템플릿 | Phase 1, 2 |
| `rls-patterns.md` | RLS 정책 카탈로그 | Phase 3 |
| `auth-flows.md` | 인증 플로우 + OAuth 확장 가이드 | Phase 2, 4 |
| `client-templates.md` | 훅/클라이언트 코드 템플릿 | Phase 4 |
| `error-catalog.md` | 에러 코드 → 한국어 메시지 | Phase 4 |
| `storybook-mock.md` | 스토리 mock 주입 가이드 | Phase 4 |
| `mcp-cli-playbook.md` | MCP/CLI 역할 분담 상세 | 전 Phase |
| `verification-checklist.md` | 최종 검증 체크리스트 | Phase 3, 5 |
| `edge-functions.md` | 외부 API 서버 이전 가이드 (Stage A/B/C) | Phase 6 |
| `scripts/ts-to-jsdoc.mjs` | TS 타입 → JSDoc 변환 | Phase 4 |
