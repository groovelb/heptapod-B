# Claude Code 설정 종합 평가 v2

> 평가일: 2026-04-14
> 기준: docs/claude-code-audit-criteria.md (55개 항목, 공식 문서 근거)
> 대상: CLAUDE.md, .claude/rules/ (4), .claude/skills/ (3+9 resources), .claude/settings* (2)

---

## Part A: CLAUDE.md + Rules

### A-1. CLAUDE.md (22줄)

| # | 기준 | 결과 | 발견 |
|---|------|------|------|
| A1-1 | 공식 목적 부합 | **Pass** | "Claude가 매 세션 알아야 할 instructions/conventions" 역할에 부합. 규칙 참조 + 워크플로우 라우팅으로 구성됨 |
| A1-2 | 포함 기준 | **Pass** | 모든 내용이 "Claude가 코드에서 추론 불가능한 지시사항" — 룰 위치, 스킬 매핑, 동기화 의무 등 |
| A1-3 | 제외 기준 | **Pass** | 프로젝트 소개, 기술 스택, 튜토리얼 등 포함 안 됨. 절차는 Skills로 분리됨 |
| A1-4 | 파일 당 200줄 이하 | **Pass** | 22줄. 충분히 간결 |
| A1-5 | @-import 문법 | **Pass** | `@.claude/rules/code-convention.md` 형식. 상대 경로, 5홉 이내 |
| A1-6 | @-import와 rules 중복 | **Issue** | `.claude/rules/` 파일은 `paths:` frontmatter 없으면 **세션 시작 시 자동 로드**됨. 동시에 CLAUDE.md에서 `@`로 import하면 **이중 로드** 가능. 공식 문서에 rules를 @로 import하는 패턴 없음 |
| A1-7 | 자동 로드 총량 | **주의** | 이중 로드 시: CLAUDE.md(22) + rules(179) + rules 재로드(179) = ~380줄. 이중 로드 해소 시: 22 + 179 = ~201줄로 적정 |
| A1-8 | 로딩 순서 | **Pass** | 프로젝트 루트 `./CLAUDE.md` 단일 파일. 충돌 없음 |
| A1-9 | 컴팩션 대비 | **없음** | "Compact Instructions" 섹션 미존재. 긴 세션에서 핵심 지시사항 손실 가능. 다만 22줄이므로 영향 제한적 |
| A1-10 | 구체성 | **Pass** | `@` 경로 명시, 스킬명 명시, 동기화 파일 경로 명시 — 모두 구체적 |
| A1-11 | 일관성 | **Pass** | CLAUDE.md와 rules 간 모순 없음 |
| A1-12 | 정기 리뷰 | **Issue** | `/frontend-design` 스킬 참조 — 로컬 스킬이 아닌 시스템/설치 스킬. 사용자가 미설치 시 존재하지 않음. Skill Resources 목록이 실제 리소스의 일부만 나열 (8개 중 4개) |

**간소화 기회:**
- **A1-6 해소**: `@.claude/rules/*` 4줄 제거. rules는 자동 로드되므로 @import 불필요. 이렇게 하면 CLAUDE.md가 더 간결해지고 이중 로드도 해소됨
- Skill Resources 목록도 제거 가능 — 스킬이 자체적으로 리소스를 관리하므로 CLAUDE.md에 나열할 실무적 이유 없음 (공식 문서: "Skills are self-advertising")
- 간소화 후 CLAUDE.md: Workflow 섹션만 남음 (~6줄). 이것이 공식 목적에 가장 부합하는 형태

### A-2. .claude/rules/ (4파일, 179줄)

| # | 기준 | 결과 | 발견 |
|---|------|------|------|
| A2-1 | 디렉토리 구조 | **Pass** | `.claude/rules/` 아래 4개 `.md` 파일. 표준 구조 |
| A2-2 | 파일 형식 | **Pass** | YAML frontmatter 없음 — `paths:` 미사용이므로 정상 (비조건부 로드) |
| A2-3 | Path-scoped 활용 | **기회** | 4개 룰 모두 비조건부 로드. directory-structure.md는 파일 생성 시에만 관련 → `paths:` 사용으로 조건부 로드 전환 가능. 다만 54줄이므로 절약 효과 제한적 |
| A2-4 | 로딩 시점 이해 | **Pass** | 비조건부 룰 = 세션 시작 시 로드. 현재 설계에 부합 |
| A2-5 | CLAUDE.md 중복 | **Issue** | A1-6과 동일. @import로 인한 잠재적 이중 로드 |
| A2-6 | 크기/수량 | **Pass** | 4개 파일, 합계 179줄. 공식 제한 없음 |
| A2-7 | 우선순위 | **N/A** | user-level rules 미사용. project rules만 존재 |
| A2-8 | 내용 적합성 | **Pass** | 4개 룰 모두 "사실/규칙"(facts) 성격. 절차(procedures) 아님. code-convention = 코딩 규칙, design-system = 디자인 원칙, mui-grid = import 규칙, directory-structure = 파일 배치 규칙 |

**간소화 기회:**
- mui-grid-usage.md(18줄)는 매우 짧은 단일 목적 룰. 독립 파일로 유지하는 것이 오히려 가독성에 좋음 — **현재 상태 유지가 적절**
- design-system.md와 code-convention.md는 각각 53-54줄로 적정

---

## Part B: Skills + Infrastructure

### B-1. Skills 구조

| # | 기준 | 결과 | 발견 |
|---|------|------|------|
| B1-1 | SKILL.md frontmatter | **Missing** | **3개 스킬 모두 YAML frontmatter 없음.** `name`, `description` 필드 미존재. description이 없으면 Claude가 스킬을 자동 발견하는 품질이 떨어짐 — 첫 번째 문단("컴포넌트 생성, 수정, 삭제...")이 fallback으로 사용됨 |
| B1-2 | description 품질 | **N/A** | frontmatter 없으므로 평가 불가. fallback(첫 문단)이 한국어이고 3인칭이 아님 |
| B1-3 | when_to_use 필드 | **Missing** | frontmatter 자체가 없으므로 when_to_use도 없음. SKILL.md 본문에 "활성화 조건" 표가 있지만, 이는 Claude에게 보이려면 스킬이 먼저 로드되어야 함 — 발견 단계가 아닌 실행 단계에서만 유효 |
| B1-4 | SKILL.md 500줄 이하 | **Pass** | component-work: 91줄, convert-external: 122줄, rule-visualization: 97줄. 모두 기준 충족 |
| B1-5 | 리소스 파일 크기 | **N/A** | 공식 제한 없음. taxonomy-v0.4.md(906줄), storybook-writing.md(652줄) 등은 읽기 전 비용 0. **크기 자체는 문제가 아님** |
| B1-6 | Progressive Disclosure | **Pass** | component-work SKILL.md(91줄)가 "목차" 역할. Resources 테이블에서 "언제 Read"를 명시. 상세 자료는 별도 파일. 공식 패턴에 정확히 부합 |
| B1-7 | 참조 깊이 1단계 | **Pass** | SKILL.md → resource.md 직접 참조. 리소스 간 체인 참조 없음 |
| B1-8 | 디렉토리 구조 | **Pass** | `component-work/SKILL.md + resources/`, `convert-external/SKILL.md + resources/`, `rule-visualization/SKILL.md`. 표준 구조 |
| B1-9 | 네이밍 컨벤션 | **Minor** | `component-work`, `convert-external`, `rule-visualization` — lowercase+hyphens 준수. 다만 공식 권장은 동명사(gerund) 형태: `working-components`, `converting-external`, `visualizing-rules`. 현재 이름도 공식 요건(lowercase, hyphens)은 충족 |

### B-2. Skills 활성화/동작

| # | 기준 | 결과 | 발견 |
|---|------|------|------|
| B2-1 | 활성화 메커니즘 | **Issue** | description 필드 부재로 인해 자동 활성화 품질이 저하됨. 첫 문단 fallback: "컴포넌트 생성, 수정, 삭제, 스토리 작업 시 활성화되는 워크플로우" — 한국어이고 일반적이어서 매칭 정확도 불확실 |
| B2-2 | 호출 모드 제어 | **미사용** | `disable-model-invocation`, `user-invocable` 모두 미설정 (기본값: 둘 다 true). 현재 3개 스킬이 사용자 호출과 자동 호출 모두 가능 상태. rule-visualization은 `disable-model-invocation: true`가 적절할 수 있음 (의도하지 않은 자동 활성화 방지) |
| B2-3 | paths 필드 활용 | **미사용** | 3개 스킬 모두 `paths:` 미설정. component-work는 `paths: ["src/components/**"]`로 특정하면 컴포넌트 파일 작업 시 자동 로드 가능 |
| B2-4 | 토큰 예산 | **Pass** | 3개 스킬 — description 합산이 8,000자 fallback 예산 내. 스킬 수가 적으므로 잘림 위험 없음 |
| B2-5 | 컴팩션 후 재연결 | **인지 사항** | 스킬당 5,000토큰, 합산 25,000토큰 예산. 현재 스킬 크기로는 충분 |
| B2-6 | 콘텐츠 수명 | **Pass** | 3개 SKILL.md 모두 "standing instructions" 성격 (워크플로우 규칙). 재로드 불필요한 구조 |

### B-3. Skills-CLAUDE.md 관계

| # | 기준 | 결과 | 발견 |
|---|------|------|------|
| B3-1 | 역할 분리 | **Pass** | CLAUDE.md = 규칙 참조 + 라우팅(사실). Skills = 워크플로우(절차). 명확히 분리됨 |
| B3-2 | CLAUDE.md에서 스킬 참조 | **유효하나 중복 가능** | Workflow 섹션이 스킬 라우팅 제공 — 실용적 가치 있음. 다만 공식 문서: 스킬은 description 기반 자동 광고됨 → CLAUDE.md에 나열 필수 아님. Workflow 섹션은 "사용자 행동 가이드" 역할로 유지 가치 있음 |
| B3-3 | 스킬 안티패턴 | **1건** | convert-external SKILL.md 3단계에 코드 블록으로 구체적 변환 계획 예시가 있음 — 이것은 안티패턴이 아님(구체적이므로). 다만 rule-visualization의 ruleRelationships.js 구조 예시가 현실과 비동기 상태 → "시간에 민감한 정보" 안티패턴에 해당할 수 있음 |

### B-4. Hooks

| # | 기준 | 결과 | 발견 |
|---|------|------|------|
| B4-1 | 공식 위치 | **Optional** | 공식: hooks는 기능 확장. required/mandatory 표현 없음. 7가지 recommended 패턴 존재 |
| B4-2 | 이벤트 수 | **참고** | 공식 26개 이벤트 |
| B4-3 | 핸들러 타입 | **참고** | 공식 4가지 (command, http, prompt, agent) |
| B4-4 | 설정 형식 | **N/A** | 현재 hooks 미설정 |
| B4-5 | Prettier hook | **기회** | 공식: recommended 중 하나. 코드 포매팅 일관성 향상에 유용하지만 필수 아님 |
| B4-6 | UserPromptSubmit 스킬활성화 | **N/A** | 공식 권장 아님. 평가 대상에서 제외 |
| B4-7 | 스킬 활성화 신뢰성 | **N/A** | 공식 인정 아닌 커뮤니티 의견. 평가 대상에서 제외. description 품질(B2-1)로 대체 평가 |
| B4-8 | 보안 가이드 | **N/A** | hooks 미사용이므로 해당 없음 |

### B-5. Settings

| # | 기준 | 결과 | 발견 |
|---|------|------|------|
| B5-1 | 파일 구분 | **Pass** | `settings.json`: Read, Write, Bash(pnpm/git) 허용 + .env 차단 → 팀 공유 적합. `settings.local.json`: wc, WebSearch, WebFetch(docs.anthropic.com) → 개인 설정 적합 |
| B5-2 | 권한 패턴 | **Pass** | `"Bash(pnpm *)"`, `"Bash(git *)"`, `"Write(.env*)"`, `"Write(*.local.*)"` — 공식 문법 준수 |
| B5-3 | 우선순위 | **Pass** | deny(.env, .local) > allow(Read, Write, Bash). 적절한 구성 |
| B5-4 | 누락된 설정 | **기회** | `$schema` 필드 미사용 — JSON 스키마 검증 가능. `defaultMode` 미설정(기본값 사용 중). 스타터킷 특성상 현재 상태가 적절 |

### B-6. MCP

| # | 기준 | 결과 | 발견 |
|---|------|------|------|
| B6-1 | 설정 파일 | **없음** | `.mcp.json` 미존재. MCP 미사용 |
| B6-2 | 프로젝트 적합 MCP | **기회** | Storybook 중심 프로젝트 → `@storybook/addon-mcp` 유용 가능. 다만 MCP는 optional 기능 확장. 부재가 결함 아님 |
| B6-3 | MCP+hooks 통합 | **N/A** | MCP 미사용 |

---

## Part C: Content Integrity + Purpose Fit

### C-1. 파일 참조 무결성

| # | 기준 | 결과 | 발견 |
|---|------|------|------|
| C1-1 | CLAUDE.md @참조 | **Pass** | `@.claude/rules/code-convention.md` 등 4개 경로 모두 실존 파일 |
| C1-2 | Rules 내 파일 참조 | **Fail (2건)** | (1) `design-system.md:35` "lucide-react 라이브러리 아이콘 우선 사용" → 미설치. 실제: @mui/icons-material, pixelarticons. (2) `design-system.md:36` `src/components/style/Icons.stories.jsx` → 실제 경로: `src/stories/style/Icons.stories.jsx` (3) `mui-grid-usage.md:18` `mui-grid-example.md` 참조 → 파일 미존재 |
| C1-3 | Skills 내 리소스 참조 | **Pass** | component-work SKILL.md의 Resources 테이블이 참조하는 8개 리소스 파일 모두 존재 확인됨 |
| C1-4 | Skills 간 교차 참조 | **Pass** | convert-external이 component-work의 리소스를 참조 → 경로 정확 (`component-work/resources/taxonomy-index.md` 등) |
| C1-5 | package.json 의존성 | **Fail (1건)** | design-system.md가 lucide-react 참조 → package.json에 미존재 |
| C1-6 | 데이터 파일 동기화 | **Fail (5건+)** | `ruleRelationships.js` 이슈: (1) `.claude/rules/project-summary.md` → 실제: skills 리소스 (2) `.claude/rules/easy-refactoring.md` → 실제: `refactoring-guide.md`, skills 리소스 (3) `.claude/rules/mui-theme.md` → 실제: skills 리소스 (4) `resources/project-directory.md` → 실제: `rules/directory-structure.md` (5) 6개 loads 엣지 → 실제 4개 |

### C-2. 내용 일관성

| # | 기준 | 결과 | 발견 |
|---|------|------|------|
| C2-1 | 규칙 간 충돌 | **Pass** | CLAUDE.md, rules, skills 간 모순 없음 |
| C2-2 | 용어 일관성 | **Minor** | "텍소노미"와 "분류체계" 혼용. "카테고리"와 "분류" 혼용. 실무적 영향 없음 |
| C2-3 | 버전 일치 | **Pass** | project-summary.md에 "React 19.x, MUI 7.x, Vite 7.x, Storybook 10.x" → package.json: React 19.2.0, MUI 7.3.5, Vite 7.2.4, Storybook 10.1.0. 일치 |

### C-3. 대상 사용자 적합성

| # | 기준 | 결과 | 발견 |
|---|------|------|------|
| C3-1 | 복잡도 수준 | **적절** | CLAUDE.md 22줄 + 4 rules + 3 skills. 초보 사용자가 직접 수정할 필요 없이 자동 작동하는 구조. 복잡도가 사용자에게 노출되지 않음 |
| C3-2 | 온보딩 경로 | **Issue** | README.md가 Vite 기본 템플릿. CLAUDE.md는 Claude를 위한 것이므로 사람을 위한 온보딩은 README 영역 — **CLAUDE.md의 문제가 아닌 README의 문제** |
| C3-3 | 유지보수 부담 | **Issue (1건)** | `components.md`(수동 업데이트 필수), `ruleRelationships.js`(수동 동기화 필수). 특히 ruleRelationships.js는 이미 비동기 상태로, 수동 유지보수 모델의 한계를 보여줌 |
| C3-4 | 공유 가능성 | **Pass** | `.claude/settings.local.json`이 개인 설정(WebSearch 등). 필수 설정은 `settings.json`에 있음. git clone 후 작동 가능 구조 |

### C-4. 과잉설계 판정

| # | 기준 | 결과 | 발견 |
|---|------|------|------|
| C4-1 | SKILL.md 500줄 이하 | **Pass** | 91, 122, 97줄 — 모두 기준의 1/4 이하 |
| C4-2 | 리소스 파일 분량 | **해당 없음** | 공식 제한 없음. 읽기 전 비용 0. 크기 자체는 과잉설계 지표가 아님 |
| C4-3 | 스킬 수 | **적정** | 3개. description 잘림 위험 없음 |
| C4-4 | Hook 부재 | **설계 선택** | optional 기능의 미사용. 결함 아님 |
| C4-5 | MCP 부재 | **설계 선택** | optional 기능의 미사용. 결함 아님 |
| C4-6 | 메타 인프라 | **검토 필요** | rule-visualization 스킬 + ruleRelationships.js는 "설정을 관리하는 설정". 공식 문서에 이 패턴 없음. 독창적이지만 동기화 실패 중. 유지보수 비용 > 가치라면 간소화 대상 |

---

## 종합 결과

### 항목별 집계

| 결과 | 건수 | 항목 |
|------|------|------|
| **Pass** | **33** | 대부분의 구조, 형식, 역할 분리, 크기 기준 충족 |
| **Issue/Fail** | **9** | A1-6(이중로드), A1-12(스킬참조 모호), C1-2(깨진참조 3건), C1-5(lucide-react), C1-6(ruleRelationships 5건+), C3-2(README), C3-3(유지보수) |
| **Missing** | **3** | B1-1(frontmatter 없음), B1-3(when_to_use 없음), A1-9(Compact Instructions 없음) |
| **기회** | **6** | A2-3(path-scoped), B2-2(호출모드제어), B2-3(paths), B4-5(Prettier hook), B5-4(schema), B6-2(Storybook MCP) |
| **N/A/참고** | **4** | 해당 없는 항목 |

### 핵심 발견 3가지

**1. Skills에 frontmatter가 없다 (B1-1, B1-2, B1-3, B2-1)**

3개 스킬 모두 YAML frontmatter(`---`)가 없어 `description` 필드가 존재하지 않음. 이것은 구조적 누락:
- 자동 활성화 품질이 첫 문단 fallback에 의존
- 한국어 첫 문단이 description으로 사용됨 — 매칭 정확도 불확실
- `when_to_use`, `disable-model-invocation`, `paths` 등 유용한 설정 기회 상실

**수정 난이도**: 낮음. 각 SKILL.md 상단에 3-5줄 frontmatter 추가.

**2. CLAUDE.md의 @import가 rules 자동 로드와 중복 (A1-6, A1-7, A2-5)**

`.claude/rules/` 파일은 `paths:` 없으면 자동 로드됨. CLAUDE.md에서 동일 파일을 `@`로 import하면 이중 로드. 공식 문서에 이 패턴 없음.

**수정 난이도**: 매우 낮음. CLAUDE.md에서 `@.claude/rules/*` 4줄 제거.

**3. 파일 참조 깨짐 (C1-2, C1-5, C1-6)**

| 깨진 참조 | 위치 | 수정 내용 |
|----------|------|----------|
| lucide-react | design-system.md:35 | `@mui/icons-material` + `pixelarticons`으로 변경 |
| `src/components/style/Icons.stories.jsx` | design-system.md:36 | `src/stories/style/Icons.stories.jsx`로 변경 |
| `mui-grid-example.md` | mui-grid-usage.md:18 | 파일 생성 또는 참조 제거 |
| ruleRelationships.js 5건+ | src/data/ | 현재 파일 구조에 맞게 전면 수정 |

### 간소화 권장사항 (초반 정리)

| 대상 | 현재 | 간소화 | 이유 |
|------|------|--------|------|
| CLAUDE.md `@` rules 참조 4줄 | `@.claude/rules/code-convention.md` 등 | **제거** | rules 자동 로드와 중복. 제거 시 이중 로드 해소 |
| CLAUDE.md Skill Resources 목록 4줄 | 리소스 경로 나열 | **제거 가능** | 스킬이 자체적으로 리소스 관리. CLAUDE.md에 나열 불필요 |
| CLAUDE.md 간소화 후 형태 | 22줄 | **~8줄** | Workflow 섹션 + 최소한의 주석만 남음 |
| ruleRelationships.js 동기화 | 수동 | **수정 후 판단** | 먼저 현재 상태 정확하게 수정. 이후 유지 전략 결정 |
| SKILL.md frontmatter | 없음 | **추가** | 각 3-5줄. 활성화 품질 향상, 호출 모드 제어 |

### 추가 작업이 필요 없는 것들

이전 평가에서 문제시했으나 **공식 기준상 문제가 아닌 것들**:

- taxonomy-v0.4.md 906줄 → 읽기 전 비용 0. 문제 아님
- storybook-writing.md 652줄 → 동일
- Hook 0개 → optional 기능. 결함 아님
- MCP 미사용 → optional 기능. 결함 아님
- CLAUDE.md에 프로젝트 정체성 없음 → README 영역. CLAUDE.md 문제 아님
- CLAUDE.md에 기술 스택 없음 → Claude가 package.json에서 추론 가능
- 스킬 이름이 동명사 아님 → lowercase+hyphens 요건은 충족. gerund는 권장이지 필수 아님
