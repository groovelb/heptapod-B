# Vibe Design Starter Kit — Claude Code 설정 종합 분석 보고서

> 분석 기준: Anthropic Academy 공식 코스 (Stephen Grider) + 2025.12~2026.03 프로덕션 케이스 연구
> 분석 일자: 2026-04-14
> 대상: `.claude/` 전체 설정 (CLAUDE.md, Rules 4개, Skills 3개, Resources 9개, Settings 2개)

---

## 종합 점수표

| Phase | 영역 | 점수 | 핵심 발견 |
|-------|------|------|-----------|
| 1 | CLAUDE.md | **2.5/5** | 과소(22줄). 라우터 역할은 하나 프로젝트 정체성/기술스택 누락 |
| 2 | Rules | **3.5/5** | 룰 자체 우수하나 깨진 참조 2건, 강제 메커니즘 부재 |
| 3 | Skills | **3.5/5** | 설계 우수(특히 convert-external). rule-visualization 동기화 실패, 일부 리소스 과중 |
| 4 | Infrastructure | **2/5** | **Hook 0개가 최대 갭**. 포매팅/스킬활성화 모두 비강제적 |
| 5 | Content Quality | **2/5** | **8건+ 깨진 참조**. ruleRelationships.js가 현실과 비동기 |
| 6 | Purpose Fit | **3/5** | 핵심 설계는 적합하나 onboarding 부재, 일부 과중, 공유 불가 상태 |
| | **종합** | **2.75/5** | |

---

## Phase 1: CLAUDE.md 구조 감사 — 2.5/5

### 현황
- **22줄**, 순수 라우터 역할만 수행
- 4개 MUST 룰 `@` 참조 + Skill Resources 목록 + Workflow 섹션

### 공식 컨벤션 대비

| 기준 | 권장 | 현재 | 판정 |
|------|------|------|------|
| 라인 수 | 150-200줄 | 22줄 | 과소 |
| 프로젝트 정체성 | "디자인 시스템 헌법" 역할 | 없음 | 누락 |
| 기술 스택 명시 | React 19, MUI 7, Vite 7, Storybook 10 | 없음 | 누락 |
| 핵심 제약사항 | WCAG, 색상 토큰, 스페이싱 스케일 | 룰에 분산 | 간접적 |
| 자동 로드 총량 | 200줄 이하 권장 | CLAUDE.md(22) + 4 rules(~183) = ~205줄 | 경계선 OK |

### 주요 이슈

1. **프로젝트 정체성 부재**: 새 사용자가 CLAUDE.md만 보고 "이 프로젝트가 무엇인지" 파악 불가. Dhika Endi Astowo 사례처럼 "디자인 시스템 헌법"으로서 프로젝트 목적, 대상 사용자, 핵심 원칙을 선언해야 함
2. **`/frontend-design` 참조 모호**: 이것이 Anthropic 시스템 스킬인지 로컬 스킬인지 명시되지 않음. 스타터킷을 받은 사용자가 해당 스킬이 없으면 혼란
3. **자동 로드 총량은 적정**: 4개 룰 포함 ~205줄은 200줄 권장치 경계선에서 합리적. 룰을 추가하기보다 CLAUDE.md 자체를 보강하는 방향이 적절

### 긍정적 측면
- `@` 참조를 통한 **룰 위임 패턴**은 공식 컨벤션의 "progressive disclosure"와 정확히 부합
- Workflow 섹션의 작업-스킬 매핑은 Claude의 라우팅을 돕는 좋은 패턴
- Skill Resources를 "자동 로드되지 않음"으로 명시한 것은 토큰 관리 의식이 반영됨

---

## Phase 2: Rules 레이어 감사 — 3.5/5

### 현황
4개 MUST 룰, 총 ~183줄 자동 로드

### 룰별 분석

**code-convention.md (55줄) — 양호**
- Lint Rules + Code Convention + Props 관리가 잘 구조화
- Props JSDoc 패턴은 Claude의 패턴 매칭에 효과적 (구체적 예시 포함)
- 단, **Prettier/ESLint hook 없이 포매팅 룰은 비강제적** — 공식 연구에서 "Skills은 확률적, Hooks는 결정적"이라고 명확히 경고

**design-system.md (54줄) — 양호하나 참조 오류 있음**
- CRITICAL 원칙 2개(컴포넌트 재활용, 디자인 토큰)는 프로젝트 목적에 정확히 부합
- 코드 예시(색상/타이포/간격)는 in-context learning에 효과적
- **lucide-react 참조 오류**: 실제 설치된 아이콘 라이브러리는 `@mui/icons-material`과 `pixelarticons`
- `src/components/style/Icons.stories.jsx` 참조 — 파일 존재 여부 확인 필요

**mui-grid-usage.md (19줄) — 우수**
- 단일 목적, 극도로 구체적인 룰. LLM이 자주 혼동하는 MUI Grid2 vs Grid 문제를 정확히 타겟
- **`mui-grid-example.md` 참조 오류**: "상세 사용 예시" 파일이 존재하지 않음
- 이 패턴(알려진 LLM 오류를 타겟하는 짧은 CRITICAL 룰)은 모범 사례

**directory-structure.md (55줄) — 양호**
- 디렉토리 트리 + 배치 규칙이 Claude의 파일 생성 결정에 직접적 가이드
- kebab-case 폴더명, barrel export 유지 등 구체적

### 룰 간 관계

| 체크 포인트 | 판정 |
|------------|------|
| 룰 간 중복 | design-system.md의 "Grid 규칙은 CLAUDE.md 참조"가 mui-grid-usage.md로 간접 연결 — 약간의 원형 참조이지만 실해 없음 |
| 누락된 룰 | ruleRelationships.js는 `project-summary`, `easy-refactoring`, `mui-theme`도 auto-load 룰로 표시하지만 실제로는 Skill Resource |
| 강제성 | 4개 룰 모두 advisory 성격. Hook 없이는 위반 시 자동 교정 불가 |

---

## Phase 3: Skills 레이어 감사 — 3.5/5

### component-work Skill — 우수한 설계, 일부 과중

**강점:**
- 4가지 의도 분기(생성/수정/삭제/스토리)가 명확히 분리
- Resources 테이블에서 "언제 Read"를 명시적으로 지정 — **on-demand 로딩 규율이 우수**
- 택소노미를 "절대 기준이 아닌 맥락 안내 도구"로 포지셔닝 — 현실적
- 인터랙티브 감지 조건이 명확 (#11~#15, 특정 라이브러리)
- `components.md` 업데이트 필수(MUST) — 상태 관리 의식

**우려:**
- **토큰 비용**: 최악의 경우(인터랙티브 컴포넌트 생성) = SKILL.md(92) + taxonomy-index(107) + taxonomy-v0.4(906) + storybook-writing(652) + interactive-principles(348) + components(121) = **~2,200줄+** 한 번에 로드 가능
- **taxonomy-v0.4.md 906줄**은 "on-demand"이긴 하지만, 로드되면 컨텍스트 윈도우의 상당 부분 소비
- **storybook-writing.md 652줄**도 동일. 스타터킷 수준에서 이 분량이 필요한가?

**판정**: 설계 자체는 shadcn/ui 공식 스킬의 "필요할 때만 로드" 패턴과 잘 부합. 다만 개별 리소스의 분량이 스타터킷 대상 사용자에게 과중할 수 있음.

### convert-external Skill — 가장 잘 설계됨

**강점:**
- 5단계 워크플로우에 **3단계 승인 게이트**가 핵심 — "승인 없이 구현 진행 금지"
- 외부 리소스 참조(component-work의 resources)를 복제하지 않고 참조 — 중복 방지
- conversion-checklist.md의 구체적 매핑(Tailwind->sx, TS->JSDoc 등)은 실행 가능한 지식
- 원본 보존 원칙

**우려:**
- `src/externalComponents/` 디렉토리가 프로젝트에 존재하지 않음 — 이것은 컨벤션이므로 OK이지만 사용자에게 미리 안내 필요

**판정**: 과잉설계 없음. 복잡도가 태스크에 비례.

### rule-visualization Skill — 혁신적이나 동기화 실패

**강점:**
- "룰을 데이터로 관리하고 Storybook에서 시각화"하는 메타-인프라 접근은 독창적
- ruleRelationships.js를 단일 소스로 지정

**치명적 문제:**
- **ruleRelationships.js가 이미 현실과 심각하게 비동기**:
  - `project-summary.md`를 `.claude/rules/`로 표시 -> 실제: skills 리소스
  - `easy-refactoring.md`를 `.claude/rules/`로 표시 -> 실제: `refactoring-guide.md` (다른 이름, 다른 경로)
  - `mui-theme.md`를 `.claude/rules/`로 표시 -> 실제: skills 리소스
  - `project-directory.md`를 skills 리소스로 표시 -> 실제: rules/directory-structure.md
  - 6개 loads 엣지 표시 -> 실제 auto-load는 4개뿐
- 이 스킬의 존재 이유(동기화)가 이미 실패한 상태

**판정**: **목적 달성 실패**. "데이터 단일 소스"라는 원칙이 지켜지지 않으면 오히려 잘못된 정보를 시각화. 동기화가 수동인 한 지속 불가능.

### 스킬 활성화 신뢰성

공식 연구의 핵심 경고: **"skill auto-activation remains unreliable"**. 커뮤니티 해결책은 UserPromptSubmit hook으로 "SKILL ACTIVATION CHECK" 프롬프트를 강제 주입하는 것. 이 프로젝트에는 이 메커니즘이 **없음**.

대상 사용자(바이브 코딩 초보)가 스킬을 명시적으로 호출하지 않으면, Claude가 스킬을 무시하고 직접 처리할 위험이 상시 존재.

---

## Phase 4: 인프라/도구 감사 — 2/5

### 가장 큰 갭: Hook 부재

| 공식 권장 | 현재 | 영향도 |
|----------|------|--------|
| Prettier PostToolUse hook ("table stakes") | 없음 | code-convention 포매팅 룰이 비강제적 |
| UserPromptSubmit skill activation check | 없음 | 3개 스킬 모두 활성화 보장 불가 |
| Lint enforcement (Liam ERD 패턴) | 없음 | ESLint 룰 위반 무시 가능 |

**추가 발견**: Prettier 자체가 `package.json`에 미설치. Hook 도입 시 `prettier` + `.prettierrc` 추가 필요.

### MCP 서버: 기회 손실

| MCP | 프로젝트 적합성 | 현재 |
|-----|---------------|------|
| Storybook MCP (`@storybook/addon-mcp`) | **높음** — Storybook 중심 프로젝트 | 미적용 |
| Figma MCP | 중간 — 디자이너 대상이지만 Figma 워크플로우 미확인 | 미적용 |
| Playwright MCP | 중간 — 시각적 검증 | 시스템 레벨 설치됨 |

### 권한 설정 — 적절

`.claude/settings.json`의 Read/Write/pnpm/git 허용 + .env 차단은 합리적. `.claude/settings.local.json`의 WebFetch(domain:docs.anthropic.com) 제한도 보안 의식 반영.

### 메모리 시스템 — 불필요

스타터킷의 성격상 세션 간 메모리는 필수가 아님. 적절한 판단.

---

## Phase 5: 콘텐츠 품질/일관성 감사 — 2/5

### 깨진 참조 종합

| # | 출처 | 참조 | 문제 |
|---|------|------|------|
| 1 | `ruleRelationships.js:30` | `.claude/rules/project-summary.md` | 경로 오류 (실제: skills 리소스) |
| 2 | `ruleRelationships.js:60` | `.claude/rules/easy-refactoring.md` | 이름+경로 오류 (실제: `refactoring-guide.md`, skills 리소스) |
| 3 | `ruleRelationships.js:68` | `.claude/rules/mui-theme.md` | 경로 오류 (실제: skills 리소스) |
| 4 | `ruleRelationships.js:112` | `resources/project-directory.md` | 경로 오류 (실제: `rules/directory-structure.md`) |
| 5 | `ruleRelationships.js:127-132` | 6개 loads 엣지 | 실제 auto-load는 4개 |
| 6 | `design-system.md:35` | lucide-react | 미설치 라이브러리 |
| 7 | `mui-grid-usage.md:18` | `mui-grid-example.md` | 파일 미존재 |
| 8 | `CLAUDE.md:19` | `/frontend-design` Skill | 로컬 스킬 아님, 시스템 스킬 (미설명) |

### 데이터 동기화 상태

`ruleRelationships.js`는 프로젝트의 과거 상태를 반영하고 있으며, 현재 `.claude/` 구조와 **5건 이상** 불일치. 이 데이터를 소비하는 Storybook 시각화(`RuleRelationships.stories.jsx`)가 잘못된 정보를 표시 중.

---

## Phase 6: 목적 적합성/과잉설계 감사 — 3/5

### 대상 사용자 적합성

| 기능 | 초보 디자이너 | 디자인 모르는 개발자 | 판정 |
|------|-------------|-------------------|------|
| 4개 자동 로드 룰 | 투명하게 적용됨 | 배경 지식 없이 컨벤션 보장 | 적합 |
| component-work 스킬 | 택소노미가 컴포넌트 선택 안내 | 워크플로우가 설계 결정 구조화 | 적합 |
| convert-external 스킬 | 외부 코드 변환 가이드 | TypeScript->JSX 등 실용적 | 적합 |
| taxonomy-v0.4.md (906줄) | 전문적 참조 — 과중 가능 | 읽기 어려울 수 있음 — 과중 가능 | 경계선 |
| storybook-writing.md (652줄) | 상세한 가이드 — 유용하나 압도적 | 스토리 작성 규칙 — 필요하나 과중 | 경계선 |
| rule-visualization | 메타-도구 — 초보에겐 불필요 | 시스템 이해에 도움 — 유지보수 부담 | 과잉 가능 |

### 과잉설계 최종 판정

| 기능 | 판정 | 근거 |
|------|------|------|
| **택소노미 2-파일 시스템** | **경계선** | taxonomy-index.md만으로 충분. v0.4(906줄)는 "full reference"로 격하하고, 스킬이 index만 기본 참조하도록 |
| **storybook-writing.md** | **경계선** | 652줄은 한 리소스로서 과중. "필수 규칙"(200줄 이하)과 "고급 패턴/템플릿"으로 분리 고려 |
| **rule-visualization 스킬** | **과잉** | 동기화 실패 상태. 수동 동기화는 지속 불가능. ruleRelationships.js를 수정하거나, 이 스킬의 범위를 축소하거나, 자동 생성 메커니즘 도입 필요 |
| **component-work 스킬** | **적정** | 워크플로우 복잡도가 태스크에 비례. on-demand 로딩 규율 우수 |
| **convert-external 스킬** | **적정** | 승인 게이트 포함, 외부 리소스 참조로 중복 없음 |
| **4개 자동 로드 룰** | **적정** | ~183줄은 200줄 예산 내, 각 룰이 구체적이고 행동가능 |

### 공유/배포 준비도

| 항목 | 상태 | 심각도 |
|------|------|--------|
| README.md | Vite 기본 템플릿 그대로 | **P0** |
| Getting Started 가이드 | 없음 | P1 |
| 깨진 참조 8건+ | 잘못된 정보 표시 | **P0** |
| `/frontend-design` 스킬 설치 안내 | 없음 | P1 |
| `.claude/settings.example.json` | 없음 (Hook 추가 시 필요) | P2 |

---

## 우선순위별 권장사항

### P0 — 공유 전 반드시 수정

1. **깨진 참조 전수 수정** — ruleRelationships.js의 5건, design-system.md의 lucide-react, mui-grid-usage.md의 mui-grid-example.md
2. **ruleRelationships.js 동기화** — 현재 `.claude/` 구조와 일치하도록 전면 업데이트
3. **README.md 교체** — Vite 기본 템플릿 -> 프로젝트 소개, 설치 방법, 사용법

### P1 — 높은 임팩트, 낮은 노력

4. **Prettier PostToolUse hook 추가** — `pnpm add -D prettier` + `.prettierrc` + settings.json hook 설정. Boris Cherny(Claude Code 제작자)가 "table stakes"로 인정한 패턴
5. **CLAUDE.md 확장** (50-70줄 추가) — 프로젝트 목적, 대상 사용자, 기술 스택(React 19/MUI 7/Vite 7/Storybook 10), 핵심 설계 원칙, `/frontend-design` 스킬 설치 안내
6. **design-system.md 아이콘 참조 수정** — lucide-react -> @mui/icons-material + pixelarticons

### P2 — 높은 임팩트, 중간 노력

7. **UserPromptSubmit hook 추가** — 스킬 자동 활성화 보장. 대상 사용자가 스킬을 명시적으로 호출하지 않아도 작동하도록
8. **storybook-writing.md 분리** — "Essential Rules" (200줄 이하) + "Advanced Patterns" (나머지). 기본 로드 분량 축소
9. **rule-visualization 스킬 결정** — (a) ruleRelationships.js를 현실에 맞게 수정 후 유지, 또는 (b) 스킬 제거하고 Storybook 시각화만 유지, 또는 (c) 자동 생성 스크립트 도입

### P3 — ROI 평가 필요

10. **Storybook MCP addon** — Storybook 중심 프로젝트에 자연스러운 핏이지만, 설정 복잡도 증가
11. **taxonomy-v0.4.md 경량화** — index만 기본 참조하고, 풀 버전은 "카테고리 상세 필요 시"로 제한 (현재 SKILL.md에서 이미 이렇게 분기하고 있으므로, 실질적으로는 v0.4의 분량 자체를 줄이는 것이 효과적)
12. **Getting Started 가이드 작성** — 특히 `/frontend-design` 스킬 설치, Storybook 실행, 첫 컴포넌트 생성까지의 워크스루

---

## 핵심 인사이트

이 스타터킷의 가장 큰 강점은 **Skills의 on-demand 로딩 설계와 progressive disclosure 패턴**이다. component-work와 convert-external 스킬의 "필요한 리소스만 필요한 시점에 Read" 규율은 공식 컨벤션의 핵심 원칙과 정확히 부합한다.

가장 큰 약점은 **"확률적 vs 결정적" 갭**이다. 우수한 룰과 스킬을 설계했지만, 이것들을 **강제**하는 인프라(Hooks)가 전무하다. 공식 연구의 표현을 빌리면: "Skills are probabilistic; hooks are deterministic." 현재 상태에서는 Claude가 룰을 무시하거나, 스킬을 활성화하지 않거나, 포매팅 규칙을 어길 가능성이 상시 존재한다.

가장 시급한 문제는 **콘텐츠 무결성**이다. ruleRelationships.js의 8건+ 깨진 참조는 프로젝트의 "self-documenting" 자부심을 훼손한다. 시각화가 거짓말을 하고 있는 상태이다.
