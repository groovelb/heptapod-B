# Vibe Design Starter Kit의 컨텍스트 엔지니어링

Claude Code가 프로젝트의 규칙을 이해하고 일관된 결과물을 내도록 설계한 구조를 설명합니다.

---

## 1. 컨텍스트 엔지니어링이란

Claude Code는 대화를 시작할 때마다 프로젝트에 대해 아무것도 모르는 상태입니다. 매번 "우리 프로젝트는 MUI를 쓰고, 코드 컨벤션은 이렇고, 컴포넌트는 이 구조로 만들어"라고 설명할 수는 없습니다.

**컨텍스트 엔지니어링**은 Claude Code가 자동으로 읽어들이는 설정 파일들을 설계하여, 사용자가 별도로 설명하지 않아도 프로젝트의 규칙과 패턴을 따르게 만드는 작업입니다.

### 핵심 문제: 컨텍스트 윈도우는 유한하다

Claude Code에 한 번에 전달할 수 있는 정보량(컨텍스트 윈도우)에는 한계가 있습니다. 프로젝트의 모든 규칙, 모든 컴포넌트 목록, 모든 스토리 작성 가이드를 매번 다 올리면 정작 사용자의 코드를 처리할 공간이 부족해집니다.

이 스타터킷의 컨텍스트 엔지니어링은 **"항상 필요한 것은 자동으로, 가끔 필요한 것은 필요할 때만"** 이라는 원칙으로 이 문제를 해결합니다.

---

## 2. 전체 구조

```
┌─────────────────────────────────────────────────────┐
│                    CLAUDE.md                         │
│              (라우터 — 7줄, 항상 로드)                │
│                                                     │
│  "컴포넌트 작업 → /component-work Skill"             │
│  "리팩토링 → refactoring-guide.md 참조"              │
│  "룰 수정 → pnpm generate-rules 실행"               │
└─────────────┬───────────────────────────────────────┘
              │
    ┌─────────┴─────────┐
    │  자동 로드 (항상)    │
    ▼                   ▼
┌────────┐    ┌──────────────────────┐
│ Rules  │    │      Settings        │
│ 4 파일  │    │  권한 제어 (JSON)     │
│ 183줄   │    └──────────────────────┘
└────────┘
    │
    │  의도 감지 시 활성화 (필요할 때만)
    ▼
┌────────────────────────────────────────┐
│              Skills (3개)              │
│                                        │
│  component-work ─── 8개 Resources      │
│  convert-external ─ 1개 Resource       │
│  rule-visualization (비활성)            │
│                                        │
│  Resources 합계: 2,425줄              │
│  (전부 on-demand — 필요할 때만 Read)    │
└────────────────────────────────────────┘
```

### 토큰 예산 요약

| 레이어 | 파일 수 | 줄 수 | 로딩 시점 |
|--------|---------|-------|----------|
| CLAUDE.md | 1 | 7 | 매 세션 자동 |
| Rules | 4 | 183 | 매 세션 자동 |
| Skills (SKILL.md) | 3 | 328 | 매 세션 자동 (description만) |
| Skill Resources | 9 | 2,425 | 필요할 때만 |
| **상시 로드 합계** | — | **~190줄** | — |
| **최대 로드 합계** | — | **~2,615줄** | — |

상시 로드되는 약 190줄은 Claude Code가 매 대화에서 부담 없이 처리하는 양이고, 2,425줄의 리소스는 실제 작업이 필요할 때만 올라옵니다.

---

## 3. 레이어별 상세 설명

### 3.1 CLAUDE.md — 라우터

```
위치: /CLAUDE.md (프로젝트 루트)
로딩: 매 세션 자동
```

CLAUDE.md는 Claude Code가 프로젝트에 진입할 때 가장 먼저 읽는 파일입니다. 이 스타터킷에서는 **라우터** 역할만 합니다. 규칙 자체를 여기에 쓰지 않고, "이 작업을 하려면 저쪽을 봐라"는 안내만 담습니다.

```markdown
# Project Rules

## Workflow

- 컴포넌트 작업 → `/component-work` Skill이 워크플로우 담당
- 리팩토링 → `refactoring-guide.md` 참조, 기존 스토리 통과 확인
- 룰 수정 시 → `pnpm generate-rules` 실행하여 Storybook 시각화 동기화
```

**왜 7줄인가?**
Rules가 4개 파일 183줄로 이미 자동 로드되므로, CLAUDE.md에 같은 내용을 반복하면 토큰 낭비입니다. CLAUDE.md는 Rules에 담기 어려운 "작업 흐름 안내"만 담당합니다.

### 3.2 Rules — 매번 자동 로드되는 규칙

```
위치: .claude/rules/*.md
로딩: 매 세션 자동 (CLAUDE.md와 함께)
```

Rules는 **어떤 작업을 하든 항상 지켜야 하는 규칙**입니다. Claude Code는 `.claude/rules/` 폴더의 모든 `.md` 파일을 세션 시작 시 자동으로 읽습니다.

| 파일 | 줄 수 | 역할 |
|------|-------|------|
| `code-convention.md` | 54 | JS/React 코드 작성 규칙 (인덴트, 따옴표, Props 주석 형식 등) |
| `design-system.md` | 53 | 디자인 토큰 사용 원칙, MUI sx 기반 스타일링, 아이콘 라이브러리 |
| `directory-structure.md` | 54 | 파일/폴더 배치 규칙 (`src/components/{카테고리}/`) |
| `mui-grid-usage.md` | 16 | MUI Grid import 규칙 (Grid2 사용 금지) |

#### Rules 설계 원칙

**1. 우선순위 명시**

각 Rule 파일의 첫 번째 heading에 우선순위를 표기합니다.

```markdown
# MUI Grid Import 규칙 (CRITICAL - 절대 위반 금지)
# Design System (MUST)
```

- **CRITICAL**: 위반하면 빌드 실패 등 즉각적 문제 발생
- **MUST**: 모든 작업에서 반드시 준수

**2. 코드 예시 포함**

Claude Code는 자연어 설명보다 구체적인 코드 예시를 더 정확히 따릅니다.

```markdown
## 잘못된 Import (절대 사용 금지)
import Grid from '@mui/material/Grid2';  // 틀림!

## 올바른 Import (반드시 이것만 사용)
import Grid from '@mui/material/Grid';   // 정확함!
```

"Grid2를 쓰지 마세요"보다 "이것은 틀렸고 이것이 맞다"를 명시적으로 보여주는 것이 오류율을 크게 낮춥니다.

**3. 200줄 이내 유지**

각 Rule 파일은 200줄을 넘지 않도록 합니다. 4개 파일이 매 세션 자동 로드되므로, 파일당 200줄을 초과하면 컨텍스트 윈도우를 과도하게 소비합니다.

### 3.3 Skills — 의도 기반 활성화

```
위치: .claude/skills/{skill-name}/SKILL.md
로딩: 사용자의 의도가 감지되면 활성화
```

Skills는 **특정 작업을 할 때만 필요한 워크플로우**입니다. Rules와 달리 항상 로드되지 않고, 사용자가 해당 작업을 요청할 때 Claude Code가 자동으로 활성화합니다.

#### 이 프로젝트의 3개 Skill

##### component-work (컴포넌트 작업)

```yaml
# SKILL.md frontmatter
---
name: component-work
description: Creates, modifies, deletes UI components and their Storybook stories.
when_to_use: When user asks to create, modify, delete, or refactor components or stories.
---
```

- **활성화 조건**: "만들어줘", "수정해줘", "삭제해줘", "스토리 작성"
- **워크플로우**: 의도 분기(생성/수정/삭제/스토리) → 텍소노미 참조 → 기존 컴포넌트 확인 → 구현
- **Resources**: 8개 파일 (2,313줄) — 필요한 단계에서만 Read

##### convert-external (외부 코드 변환)

```yaml
---
name: convert-external
description: Converts external code (TypeScript, Tailwind, styled-components) into
  project-compliant MUI sx-based JSX components.
when_to_use: When user pastes external code or asks to convert outside components.
---
```

- **활성화 조건**: "변환해줘", "외부 컴포넌트 적용해줘", `src/externalComponents/` 파일 참조
- **워크플로우**: 분석 → 분류 → 변환 계획(사용자 승인 필수) → 구현 → 등록
- **Resources**: 1개 파일 (112줄)
- **핵심 설계**: 3단계에서 반드시 사용자 승인을 받도록 강제

##### rule-visualization (룰 시각화 동기화)

```yaml
---
name: rule-visualization
description: Syncs ruleRelationships.js with .claude/ file structure.
disable-model-invocation: true
---
```

- **`disable-model-invocation: true`**: Claude Code가 자동으로 이 스킬을 호출하지 못하게 차단
- **이유**: `pnpm generate-rules` 스크립트가 이 작업을 더 정확하게 수행하므로, 스킬은 참조 문서로만 존재

#### Skill의 핵심 구조: SKILL.md + Resources

```
.claude/skills/component-work/
├── SKILL.md                    ← 워크플로우 정의 (97줄)
└── resources/                  ← 필요할 때만 Read
    ├── taxonomy-index.md       ← 컴포넌트 생성 시
    ├── storybook-writing.md    ← 스토리 작성 시
    ├── interactive-principles.md ← 인터랙티브 감지 시
    ├── components.md           ← 중복 확인 시
    ├── mui-theme.md            ← 테마 수정 시
    ├── refactoring-guide.md    ← 리팩토링 시
    ├── project-summary.md      ← 맥락 파악 시
    ├── taxonomy-v0.4.md        ← 상세 분류 필요 시
    └── (합계: 2,313줄)
```

**SKILL.md가 워크플로우의 "어떤 단계에서 어떤 리소스를 Read할 것인가"를 명시**합니다. Claude Code는 이 지시를 따라 필요한 리소스만 가져오므로, 2,313줄이 한꺼번에 로드되지 않습니다.

예시 — component-work의 생성 워크플로우:

```
1단계: 의도 구체화           → (리소스 불필요)
2단계: 텍소노미 참조          → taxonomy-index.md Read (106줄)
3단계: 기존 컴포넌트 확인      → components.md Read (120줄)
4단계: 구현                  → storybook-writing.md Read (652줄)
       인터랙티브 감지 시      → interactive-principles.md Read (347줄)
```

전체 리소스 중 해당 작업에 필요한 것만 단계별로 로드됩니다.

### 3.4 Settings — 권한 제어

```
위치: .claude/settings.json (공유용), .claude/settings.local.json (개인용)
```

#### settings.json (프로젝트 공유)

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Write",
      "Bash(pnpm *)",
      "Bash(git *)"
    ],
    "deny": [
      "Write(.env*)",
      "Write(*.local.*)"
    ]
  }
}
```

- **allow**: 파일 읽기/쓰기, pnpm과 git 명령어 — 일반적인 개발 작업에 필요한 최소 권한
- **deny**: `.env` 파일과 `*.local.*` 파일 쓰기 차단 — 시크릿과 개인 설정 보호

#### settings.local.json (개인 전용, git에서 제외)

```json
{
  "permissions": {
    "allow": [
      "Bash(wc:*)",
      "WebSearch",
      "WebFetch(domain:docs.anthropic.com)"
    ]
  }
}
```

개인 환경에서만 필요한 추가 권한을 여기에 설정합니다. `.local.` 파일은 deny 규칙에 의해 Claude Code가 수정할 수 없습니다.

---

## 4. Rules vs Skills — 무엇을 어디에 넣을 것인가

이 프로젝트의 설계에서 가장 중요한 판단은 "이 정보가 Rules에 들어가야 하는가, Skills에 들어가야 하는가"입니다.

### 판단 기준

| 기준 | Rules | Skills |
|------|-------|--------|
| **적용 빈도** | 모든 작업에 항상 | 특정 작업에만 |
| **로딩 방식** | 매 세션 자동 | 의도 감지 시 활성화 |
| **컨텍스트 비용** | 항상 차지함 | 필요할 때만 차지함 |
| **내용 성격** | 짧은 규칙/제약사항 | 긴 워크플로우/참조 데이터 |
| **예시** | "single quotes 사용" | "스토리 작성 시 652줄 가이드" |

### 이 프로젝트의 실제 배치

```
Rules (항상 로드 — 183줄):
├── "Grid2 import 금지"                       → 16줄, 모든 코드에 해당
├── "theme.palette 토큰만 사용"                → 53줄, 모든 스타일링에 해당
├── "컴포넌트 파일은 PascalCase"               → 54줄, 모든 코드에 해당
└── "src/components/{카테고리}/ 구조"           → 54줄, 모든 파일 생성에 해당

Skills (필요할 때만 — 2,425줄):
├── "207개 UI 택소노미 분류체계"               → 906줄, 컴포넌트 생성 시만
├── "Storybook 스토리 작성 가이드"             → 652줄, 스토리 작업 시만
├── "인터랙티브 컴포넌트 원칙"                  → 347줄, 모션/스크롤 작업 시만
└── "외부 코드 변환 체크리스트"                 → 112줄, 코드 변환 시만
```

만약 이 2,425줄을 전부 Rules에 넣었다면, Claude Code는 "버튼 색상 바꿔줘" 같은 단순한 요청에도 매번 906줄짜리 택소노미를 읽어야 합니다. Skills로 분리함으로써 필요한 작업에만 적절한 정보가 로드됩니다.

---

## 5. Skill의 워크플로우 설계 패턴

### 패턴 1: 의도 분기

component-work Skill은 같은 스킬 안에서 의도에 따라 워크플로우를 분기합니다.

```
사용자: "카드 컴포넌트 만들어줘"  → 생성 워크플로우
사용자: "카드 수정해줘"          → 수정 워크플로우
사용자: "카드 삭제해줘"          → 삭제 워크플로우
사용자: "스토리 수정해줘"        → 스토리 워크플로우
```

하나의 Skill이 4가지 워크플로우를 포함하는 이유는, 모두 "컴포넌트 관련 작업"이라는 공통 맥락을 공유하기 때문입니다. 별도의 Skill로 분리하면 Resources를 중복 배치해야 합니다.

### 패턴 2: 승인 게이트

convert-external Skill은 3단계에서 반드시 사용자 승인을 받도록 설계되어 있습니다.

```
1단계: 분석 → 자동 실행
2단계: 분류 → 후보 제시 (사용자 선택)
3단계: 변환 계획 → 사용자 승인 필수 ← 게이트
4단계: 구현 → 승인 후 실행
5단계: 등록 → 자동 실행
```

외부 코드 변환은 원본을 변형하는 비가역적 작업이므로, Claude Code가 독단적으로 진행하지 못하도록 "변환 계획을 보여주고 승인을 받아라"는 지시를 SKILL.md에 명시합니다.

### 패턴 3: 조건부 리소스 로딩

component-work Skill은 특정 조건이 감지되면 추가 리소스를 로드합니다.

```
기본: taxonomy-index.md + storybook-writing.md

추가 조건 감지 시:
├── Framer Motion 사용        → interactive-principles.md 추가 Read
├── 스크롤 기반 인터랙션       → interactive-principles.md 추가 Read
├── 텍소노미 #11~#15 카테고리  → interactive-principles.md 추가 Read
└── CSS 애니메이션 초과        → interactive-principles.md 추가 Read
```

347줄짜리 인터랙티브 원칙은 일반 버튼이나 카드를 만들 때는 불필요합니다. 스크롤이나 모션이 감지될 때만 로드되도록 SKILL.md에 "감지 조건"을 명시합니다.

### 패턴 4: 리소스 공유

convert-external Skill은 자체 리소스(conversion-checklist.md) 1개만 보유하고, 나머지는 component-work의 리소스를 참조합니다.

```
convert-external/
├── SKILL.md
└── resources/
    └── conversion-checklist.md    ← 자체 리소스

참조하는 외부 리소스 (복제하지 않음):
├── component-work/resources/taxonomy-index.md
├── component-work/resources/storybook-writing.md
└── component-work/resources/interactive-principles.md
```

같은 리소스를 두 곳에 복제하면 동기화 문제가 생기므로, SKILL.md에 "이 리소스는 component-work 폴더에서 Read하라"고 경로를 명시합니다.

---

## 6. 자동화: ruleRelationships.js

이 프로젝트는 Rules와 Skills 구조를 **Storybook에서 시각적으로 확인**할 수 있습니다.

### 문제

Rules나 Skills를 추가/수정/삭제할 때마다 시각화 데이터(`ruleRelationships.js`)를 수동으로 업데이트하면 빠르게 동기화가 깨집니다.

### 해결: generate-rules 스크립트

```bash
pnpm generate-rules
```

이 명령은 `scripts/generate-rules.js`를 실행합니다.

```
.claude/rules/ 스캔          → ruleNodes (규칙 목록)
.claude/skills/ 스캔         → ruleNodes (스킬+리소스 목록)
SKILL.md frontmatter 파싱    → description, priority 추출
관계 계산                    → ruleEdges (loads, activates, resources)
조건 매트릭스 생성            → conditionMatrix (작업별 필요 규칙/스킬)
                             ↓
                    src/data/ruleRelationships.js 출력
```

생성된 데이터는 Storybook의 `Overview > Rule Relationships` 스토리가 소비하여 4개 섹션을 렌더링합니다:

| 섹션 | 내용 |
|------|------|
| 룰 계층 구조 | CLAUDE.md → Rules/Skills 트리 다이어그램 |
| 룰 목록 | 모든 노드의 이름, 우선순위, 설명 |
| 참조 관계 | 모든 엣지의 from → to, 유형 |
| 활용 조건 매트릭스 | 작업별 필요 규칙/스킬/리소스 |

### CLAUDE.md와의 연결

```markdown
- 룰 수정 시 → `pnpm generate-rules` 실행하여 Storybook 시각화 동기화
```

CLAUDE.md에 이 한 줄을 넣어둠으로써, Claude Code가 Rules/Skills를 수정할 때 자동으로 이 명령을 실행하도록 유도합니다.

---

## 7. 설계 판단의 근거

### 왜 Hook을 사용하지 않는가

Claude Code는 Hook 시스템(파일 저장 후 자동 포매팅 등)을 지원합니다. 그러나 이 스타터킷에서는 사용하지 않습니다.

- Hook은 Prettier, ESLint 같은 도구를 자동 실행하는 데 유용합니다
- 그러나 이 프로젝트의 대상 사용자(바이브 코딩 입문자)에게 Hook 설정 유지보수는 불필요한 복잡성입니다
- code-convention.md의 포매팅 규칙만으로도 Claude Code는 충분히 일관된 코드를 생성합니다
- 필요 시 README의 "내 프로젝트에 최적화하기" 섹션에서 Prettier Hook 추가 방법을 안내합니다

### 왜 Sub-agent를 사용하지 않는가

Claude Code는 하위 에이전트에 작업을 분배하는 기능을 지원합니다. 그러나 이 프로젝트에서는 사용하지 않습니다.

- Sub-agent는 대규모 코드베이스의 병렬 탐색이나 CI/CD 파이프라인에 적합합니다
- 50+ 컴포넌트 규모에서는 단일 에이전트가 충분히 처리 가능합니다
- Sub-agent는 4~7배의 토큰을 소비하며, 스타터킷 수준에서는 비용 대비 효과가 낮습니다

### 왜 CLAUDE.md가 7줄인가

많은 프로젝트가 CLAUDE.md에 모든 규칙을 나열합니다. 이 스타터킷에서는 의도적으로 라우터 역할만 부여했습니다.

- Rules 4개 파일이 자동 로드되므로 CLAUDE.md에 같은 내용을 반복할 이유가 없습니다
- CLAUDE.md에 규칙을 직접 쓰면, Rules와 CLAUDE.md 양쪽을 유지보수해야 하는 이중 관리 부담이 생깁니다
- CLAUDE.md는 "어디를 봐야 하는가"만 알려주는 목차/라우터가 가장 효과적입니다

---

## 8. 파일 구조 전체 맵

```
프로젝트 루트/
│
├── CLAUDE.md                                    ← 진입점 (라우터, 7줄)
│
├── .claude/
│   ├── settings.json                            ← 권한 제어 (공유)
│   ├── settings.local.json                      ← 권한 제어 (개인)
│   │
│   ├── rules/                                   ← 매 세션 자동 로드
│   │   ├── code-convention.md                   (54줄) 코드 작성 규칙
│   │   ├── design-system.md                     (53줄) 디자인 토큰/스타일링
│   │   ├── directory-structure.md               (54줄) 파일 배치 규칙
│   │   └── mui-grid-usage.md                    (16줄) Grid import 규칙
│   │
│   └── skills/                                  ← 의도 기반 활성화
│       ├── component-work/
│       │   ├── SKILL.md                         (97줄) 컴포넌트 워크플로우
│       │   └── resources/
│       │       ├── components.md                (120줄) 기존 컴포넌트 목록
│       │       ├── interactive-principles.md    (347줄) 인터랙티브 원칙
│       │       ├── mui-theme.md                 (92줄)  MUI 테마 설정
│       │       ├── project-summary.md           (49줄)  프로젝트 개요
│       │       ├── refactoring-guide.md         (41줄)  리팩토링 가이드
│       │       ├── storybook-writing.md         (652줄) 스토리 작성 규칙
│       │       ├── taxonomy-index.md            (106줄) 분류체계 인덱스
│       │       └── taxonomy-v0.4.md             (906줄) 분류체계 전체
│       │
│       ├── convert-external/
│       │   ├── SKILL.md                         (128줄) 외부 코드 변환
│       │   └── resources/
│       │       └── conversion-checklist.md      (112줄) 변환 체크리스트
│       │
│       └── rule-visualization/
│           └── SKILL.md                         (103줄) 룰 시각화 (비활성)
│
├── scripts/
│   └── generate-rules.js                        ← 시각화 데이터 자동 생성
│
└── src/data/
    └── ruleRelationships.js                     ← 생성된 시각화 데이터
```

---

## 9. 정보의 흐름 요약

```
사용자: "카드 컴포넌트 만들어줘"
         │
         ▼
    ┌─ CLAUDE.md ─────────────────────────────────┐
    │  "컴포넌트 작업 → /component-work Skill"     │
    └──────────────────────────────────────────────┘
         │
    ┌─ Rules (이미 로드됨) ────────────────────────┐
    │  code-convention.md  → Props 주석 규칙       │
    │  design-system.md    → theme 토큰만 사용     │
    │  directory-structure.md → 카드 → card/ 폴더   │
    └──────────────────────────────────────────────┘
         │
    ┌─ component-work Skill 활성화 ────────────────┐
    │  1. 의도: "생성" → 생성 워크플로우             │
    │  2. taxonomy-index.md Read → #3 Card 카테고리 │
    │  3. components.md Read → 기존 카드 확인        │
    │  4. storybook-writing.md Read → 스토리 작성    │
    │     (인터랙티브 감지 안됨 → 추가 로딩 없음)     │
    └──────────────────────────────────────────────┘
         │
         ▼
    결과: src/components/card/NewCard.jsx
          src/components/card/NewCard.stories.jsx
          components.md 업데이트
```

이 전체 과정에서 사용자가 직접 지시한 것은 "카드 컴포넌트 만들어줘" 한 문장뿐입니다. 나머지는 컨텍스트 엔지니어링이 처리합니다.
