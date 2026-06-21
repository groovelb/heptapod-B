# Claude Code 설정 평가 기준 체크리스트

> 기준 수립일: 2026-04-14
> 근거: docs.anthropic.com 공식 문서 (2026-04 기준) + platform.claude.com 공식 Skills 문서
> 총 55개 항목 (Part A: 20, Part B: 22, Part C: 13)

---

## Part A: CLAUDE.md + Rules (구조/설정 레이어)

### A-1. CLAUDE.md

| # | 평가 기준 | 확인할 사항 | 공식 근거 (출처) | 확인 방법 |
|---|----------|-----------|----------------|----------|
| A1-1 | **공식 목적 정의** | CLAUDE.md의 역할이 "Claude가 매 세션 알아야 할 project-specific instructions, conventions, context"인가, "프로젝트 소개/정체성"인가? | docs.anthropic.com/memory: "project-specific instructions, conventions, and context that Claude should know every session" | 현재 CLAUDE.md 내용이 이 목적에 부합하는지 대조 |
| A1-2 | **포함 기준** | 포함해야 할 것: Claude가 코드 읽어서 **추론 불가능한** 지시사항만 포함했는가? (빌드 커맨드, 기본과 다른 코드 스타일, 테스트 러너, 브랜치 컨벤션, 아키텍처 결정, 비자명 gotchas) | docs: "Add when: Claude makes same mistake twice; code review catches something; you type same correction again; new teammate would need same context" | 각 줄이 "Claude가 추론 불가능한 정보"인지 검증 |
| A1-3 | **제외 기준** | 포함하면 안 되는 것이 포함되어 있는가? (Claude가 코드 읽으면 아는 것, 표준 언어 컨벤션, 상세 API 문서, 자주 변경되는 정보, 긴 설명/튜토리얼, 파일별 코드베이스 설명) | docs: "If an entry is a multi-step procedure or only matters for one part of the codebase, move it to a skill or path-scoped rule" | 각 항목 대조 |
| A1-4 | **파일 당 라인 수** | CLAUDE.md 단일 파일이 200줄 이하인가? | docs: "target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence." — **per file** 기준 | `wc -l CLAUDE.md` |
| A1-5 | **@-import 메커니즘** | `@` 참조 문법이 올바른가? 상대 경로가 CLAUDE.md 기준인가? 최대 5홉 이내인가? | docs: "Imported files are expanded and loaded into context at launch... Relative paths resolve relative to the file containing the import... maximum depth of five hops" | @참조 경로 검증 |
| A1-6 | **@-import와 .claude/rules/ 중복 여부** | `.claude/rules/` 파일을 `@`로 import하는 것이 필요한가? 공식 문서에서 이 패턴을 권장하는가? | docs에 따르면 `.claude/rules/` 파일은 **자동 발견 및 로드**됨. `@` import는 임의 파일(README, docs 등) 용도. **rules를 @로 import하는 건 공식 패턴에 없음** | 현재 CLAUDE.md가 `@.claude/rules/...`로 rules를 import하는지 확인 |
| A1-7 | **자동 로드 총량** | CLAUDE.md + 비-path-scoped rules의 합산이 컨텍스트에 부담을 주는가? | docs: 200줄은 CLAUDE.md 단일 파일 기준. rules는 별도 메커니즘으로 로드되며, 합산 제한은 공식 문서에 **명시되지 않음** | 합산 라인 수 계산 + "합산 제한이 공식인가" 확인 |
| A1-8 | **로딩 순서/우선순위** | 여러 CLAUDE.md가 있을 때 우선순위를 이해하고 있는가? | docs: managed policy > project > user > local. 같은 디렉토리에서 CLAUDE.local.md가 CLAUDE.md 뒤에 append | 프로젝트의 CLAUDE.md 위치 확인 |
| A1-9 | **컴팩션 대비** | "Compact Instructions" 섹션이 있는가? 컴팩션 시 보존할 핵심 지시사항이 명시되어 있는가? | docs: "add a 'Compact Instructions' section to CLAUDE.md or run /compact with a focus" | 해당 섹션 존재 여부 |
| A1-10 | **구체성** | 지시사항이 구체적인가 vs 모호한가? | docs: "Specific, concrete (e.g., 'Use 2-space indentation' not 'Format code properly')" | 각 지시사항의 구체성 수준 |
| A1-11 | **일관성** | 파일 간 충돌하는 규칙이 없는가? | docs: "Consistent (no conflicting rules across files)" | CLAUDE.md와 rules 간 교차 검증 |
| A1-12 | **정기 리뷰** | 오래된/모순되는 지시사항이 없는가? | docs: "Review periodically for outdated/contradicting instructions" | 현재 내용의 시의성 확인 |

### A-2. .claude/rules/

| # | 평가 기준 | 확인할 사항 | 공식 근거 (출처) | 확인 방법 |
|---|----------|-----------|----------------|----------|
| A2-1 | **디렉토리 구조** | `.claude/rules/` 아래 `.md` 파일로 구성되어 있는가? 하위 디렉토리 사용 시 자동 발견되는가? | docs: "Discovered recursively — subdirectories work automatically" | Glob으로 파일 구조 확인 |
| A2-2 | **파일 형식** | YAML frontmatter가 필요한 경우(path-scoped) 올바르게 작성되어 있는가? | docs: "Rules are markdown files with optional YAML frontmatter... paths: glob patterns" | 각 rule 파일의 frontmatter 확인 |
| A2-3 | **Path-scoped 활용 여부** | 특정 파일/디렉토리에만 적용되는 규칙이 있다면 `paths:` frontmatter를 사용하고 있는가? | docs: "Rules without paths load unconditionally. Path-scoped rules trigger when matching files enter context" | 각 rule의 적용 범위 분석 |
| A2-4 | **로딩 시점** | `paths:` 없는 rules는 세션 시작 시 로드, `paths:` 있는 rules는 매칭 파일 접근 시 로드됨을 인지하고 있는가? | docs: "Rules without paths: load at session start. Rules with paths: load when matching file enters context" | 현재 rules의 로딩 전략 분석 |
| A2-5 | **CLAUDE.md와의 관계** | rules가 CLAUDE.md의 내용을 중복하지 않는가? | docs: rules는 CLAUDE.md의 **대안적 분리 방법**. 중복 아닌 보완 관계 | CLAUDE.md와 rules 내용 교차 비교 |
| A2-6 | **크기/수량 제한** | rules 파일 수나 총 크기에 공식 제한이 있는가? | docs: **공식 제한 없음**. "When CLAUDE.md approaches 200 lines, start splitting into rules" | 현재 수량/크기 확인 |
| A2-7 | **우선순위** | user-level rules(`~/.claude/rules/`) vs project rules 간 우선순위를 이해하고 있는가? | docs: "User-level rules load first, project rules load after" (project가 더 높은 우선순위) | 프로젝트의 rules 스코프 확인 |
| A2-8 | **내용 적합성** | 각 rule이 "Claude가 매 세션 알아야 하는 사실"인가, "절차/프로시저"인가? | docs: 사실(facts) = CLAUDE.md/rules. 절차(procedures) = Skills | 각 rule의 내용 성격 분류 |

---

## Part B: Skills + Infrastructure (기능 레이어)

### B-1. Skills 구조

| # | 평가 기준 | 확인할 사항 | 공식 근거 (출처) | 확인 방법 |
|---|----------|-----------|----------------|----------|
| B1-1 | **SKILL.md frontmatter** | `name`, `description` 필드가 있는가? `description`은 1,024자 이내인가? | docs: name(64자, optional), description(1,024자, **recommended**). "Claude uses this to decide when to apply the skill" | 각 SKILL.md의 frontmatter 확인 |
| B1-2 | **description 품질** | description이 3인칭으로 작성되어 있는가? 핵심 용도가 앞에 배치되어 있는가? | docs: "Always write in third person... Front-load the key use case: combined description+when_to_use truncated at 1,536 chars" | description 내용 분석 |
| B1-3 | **when_to_use 필드** | 트리거 조건을 `when_to_use` 필드로 명시하고 있는가? | docs: "Additional context for when Claude should invoke the skill, such as trigger phrases or example requests. Appended to description" | frontmatter 확인 |
| B1-4 | **SKILL.md 본문 라인 수** | 500줄 이하인가? | docs: "Keep SKILL.md under 500 lines. Move detailed reference material to separate files." | `wc -l` 각 SKILL.md |
| B1-5 | **리소스 파일 크기** | 리소스(참조) 파일의 크기에 공식 제한이 있는가? | docs: **공식 제한 없음**. "Large reference docs, API specifications, or example collections don't need to load into context every time" — 읽기 전까지 토큰 비용 0 | 각 리소스 파일 크기 확인 (평가가 아닌 사실 확인) |
| B1-6 | **Progressive Disclosure** | SKILL.md가 "목차" 역할을 하고, 상세 자료는 별도 파일로 분리되어 있는가? | docs (공식 용어): "SKILL.md serves as an overview that points Claude to detailed materials as needed, like a table of contents" | SKILL.md -> 리소스 파일 참조 구조 분석 |
| B1-7 | **참조 깊이** | 리소스 참조가 1단계 이내인가? (SKILL.md -> resource.md, NOT SKILL.md -> a.md -> b.md) | docs: "Keep references one level deep from SKILL.md... Bad: SKILL.md -> advanced.md -> details.md" | 참조 체인 분석 |
| B1-8 | **디렉토리 구조** | `skill-name/SKILL.md` + 선택적 리소스/스크립트 구조를 따르는가? | docs: `my-skill/ SKILL.md template.md examples/ scripts/` | 디렉토리 구조 확인 |
| B1-9 | **네이밍 컨벤션** | 스킬 이름이 lowercase, numbers, hyphens만 사용하는가? 동명사(gerund) 형태가 권장됨 | docs: "Use gerund form (verb + -ing)... Avoid: helper, utils, tools" | 스킬 디렉토리명 확인 |

### B-2. Skills 활성화/동작

| # | 평가 기준 | 확인할 사항 | 공식 근거 (출처) | 확인 방법 |
|---|----------|-----------|----------------|----------|
| B2-1 | **활성화 메커니즘** | description 매칭 기반 자동 활성화가 작동하려면 description 품질이 핵심인가? | docs: "skill descriptions are loaded into context so Claude knows what's available, but full skill content only loads when invoked" | description 필드 존재 여부 및 품질 |
| B2-2 | **user-invocable vs auto-activated** | `disable-model-invocation`/`user-invocable` 설정으로 호출 모드를 제어하고 있는가? | docs: `disable-model-invocation: true` = 사용자만 호출. `user-invocable: false` = Claude만 호출. 기본: 둘 다 가능 | 각 SKILL.md frontmatter 확인 |
| B2-3 | **paths 필드 활용** | 특정 파일 작업 시에만 활성화되어야 하는 스킬에 `paths:` glob 패턴을 사용하고 있는가? | docs: "When set, Claude loads the skill automatically only when working with files matching the patterns" | frontmatter에 paths 필드 여부 |
| B2-4 | **토큰 예산** | 스킬 메타데이터가 컨텍스트 윈도우의 ~1%로 제한됨을 인지하고 있는가? 스킬 수가 많으면 description이 잘림 | docs: "budget scales dynamically at 1% of context window, fallback 8,000 chars... many skills -> descriptions shortened" | 전체 스킬의 description 합산 길이 |
| B2-5 | **컴팩션 후 재연결** | 컴팩션 시 최근 호출된 스킬은 5,000 토큰까지 재연결됨 (전체 25,000 토큰 예산) | docs: "re-attaches most recent invocation of each skill... first 5,000 tokens each. Combined budget of 25,000 tokens" | 인지 사항 (설정 불가, 동작 이해) |
| B2-6 | **스킬 콘텐츠 수명** | SKILL.md가 한 번 로드되면 세션 끝까지 유지됨. 재로드 없음 | docs: "rendered SKILL.md content enters the conversation as a single message and stays there for the rest of the session. Claude Code does not re-read the skill file on later turns" | 지시사항이 "standing instructions"인지 "one-time steps"인지 확인 |

### B-3. Skills-CLAUDE.md 관계

| # | 평가 기준 | 확인할 사항 | 공식 근거 (출처) | 확인 방법 |
|---|----------|-----------|----------------|----------|
| B3-1 | **역할 분리** | CLAUDE.md = 사실(facts), Skills = 절차(procedures)로 구분되어 있는가? | docs: "Create a skill when you keep pasting the same playbook, checklist, or multi-step procedure" | CLAUDE.md와 skills의 내용 성격 비교 |
| B3-2 | **CLAUDE.md에서 스킬 참조** | CLAUDE.md가 스킬을 참조할 필요가 있는가? | docs: 스킬은 description 기반으로 **자동 광고**됨. "Claude sees all skill descriptions at startup" -> CLAUDE.md에 리스트할 필요 없음. 단, 워크플로우 라우팅 목적이라면 합리적 | 현재 CLAUDE.md의 Workflow 섹션 분석 |
| B3-3 | **스킬 안티패턴** | 스킬에 시간에 민감한 정보, 깊은 중첩 참조, 여러 대안 나열, 매직 넘버 등 안티패턴이 있는가? | docs: "Avoid time-sensitive info, deeply nested references, offering too many options, magic numbers, assuming tools installed" | 각 SKILL.md 콘텐츠 검토 |

### B-4. Hooks

| # | 평가 기준 | 확인할 사항 | 공식 근거 (출처) | 확인 방법 |
|---|----------|-----------|----------------|----------|
| B4-1 | **공식 위치** | hooks는 optional인가 required인가? | docs: hooks는 **기능 확장 메커니즘**으로 소개됨. "required"/"mandatory"라는 표현 없음. 7가지 공식 패턴이 "recommended"로 제시 | 공식 문서에서 "required" 검색 |
| B4-2 | **이벤트 수** | 공식 hook 이벤트가 몇 개인가? | docs: **26개** 이벤트 (SessionStart, SessionEnd, UserPromptSubmit, PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, PermissionDenied, Stop, StopFailure, Notification, SubagentStart, SubagentStop, TaskCreated, TaskCompleted, TeammateIdle, InstructionsLoaded, ConfigChange, CwdChanged, FileChanged, WorktreeCreate, WorktreeRemove, PreCompact, PostCompact, Elicitation, ElicitationResult) | 공식 문서 대조 |
| B4-3 | **핸들러 타입** | 공식 핸들러 타입이 몇 가지인가? | docs: **4가지** (command, http, prompt, agent) | 공식 문서 대조 |
| B4-4 | **설정 형식** | hooks 설정 JSON 구조가 올바른가? | docs: `{"hooks": {"EventName": [{"matcher": "...", "hooks": [{"type": "...", ...}]}]}}` — 3단 중첩 | 설정 파일이 있다면 구조 검증 |
| B4-5 | **Prettier hook 위치** | "auto-format" hook이 공식적으로 어떻게 포지셔닝되는가? | docs: 7가지 "common recommended hooks" 중 하나로 제시됨. "table stakes"/"required"라는 표현 **없음** | 공식 문서 원문 확인 |
| B4-6 | **UserPromptSubmit 스킬활성화** | UserPromptSubmit hook으로 스킬 활성화를 보장하는 것이 공식 권장인가? | docs: **공식 권장 아님**. UserPromptSubmit은 "프롬프트 처리 전 가로채기"용으로 설명됨 | 공식 문서에 이 패턴 존재 여부 |
| B4-7 | **스킬 활성화 신뢰성** | "auto-activation이 unreliable"이 공식 인정인가? | docs: **공식 인정 아님**. 활성화는 description 매칭 품질에 의존. "If you have many skills, descriptions are shortened..." | 공식 문서에 이 경고 존재 여부 |
| B4-8 | **보안 가이드** | hook 스크립트에 절대 경로/환경변수를 사용하는가? | docs: "Use absolute paths or $CLAUDE_PROJECT_DIR... Reference relative paths via environment variables" | 설정이 있다면 경로 검증 |

### B-5. Settings

| # | 평가 기준 | 확인할 사항 | 공식 근거 (출처) | 확인 방법 |
|---|----------|-----------|----------------|----------|
| B5-1 | **파일 구분** | `settings.json`(팀 공유, git 추적) vs `settings.local.json`(개인, gitignore)의 역할이 올바른가? | docs: settings.json = team shared. settings.local.json = personal, gitignored | 각 파일의 내용이 적절한 스코프인지 |
| B5-2 | **권한 패턴** | allow/deny 패턴이 공식 문법을 따르는가? | docs: `"Bash(pnpm *)"`, `"Write(.env*)"` 등 — 도구명 + 괄호 패턴 | 현재 settings의 패턴 문법 검증 |
| B5-3 | **우선순위** | deny > ask > allow 우선순위를 올바르게 활용하고 있는가? | docs: "Deny rules from ANY scope take absolute precedence" | 현재 allow/deny 조합 분석 |
| B5-4 | **누락된 설정** | 유용하지만 미사용 중인 설정이 있는가? (defaultMode, sandbox, costTracking 등) | docs: 다수의 선택적 설정 필드 존재 | 프로젝트 요구에 맞는 설정 누락 여부 |

### B-6. MCP

| # | 평가 기준 | 확인할 사항 | 공식 근거 (출처) | 확인 방법 |
|---|----------|-----------|----------------|----------|
| B6-1 | **설정 파일** | `.mcp.json`(프로젝트) 또는 `~/.claude.json`(사용자)에 MCP 설정이 있는가? | docs: `.mcp.json` = project scope, `~/.claude.json` = user/local scope | 파일 존재 확인 |
| B6-2 | **프로젝트 적합 MCP** | 프로젝트 성격에 맞는 MCP 서버를 활용하고 있는가? | docs: MCP는 **선택적 기능 확장**. 공식 "반드시 사용해야 할 MCP" 목록은 없음 | 프로젝트 요구와 가용 MCP 대조 |
| B6-3 | **MCP와 hooks 통합** | MCP 도구에 대한 permission 규칙이 설정되어 있는가? | docs: `"mcp__server__tool"` 패턴으로 permission 제어 가능 | 설정 확인 |

---

## Part C: Content Integrity + Purpose Fit (품질/적합성 레이어)

### C-1. 파일 참조 무결성

| # | 평가 기준 | 확인할 사항 | 공식 근거 | 확인 방법 |
|---|----------|-----------|----------|----------|
| C1-1 | **CLAUDE.md @참조** | 모든 `@path` 참조가 실존하는 파일을 가리키는가? | docs: @참조는 실행 시 expand됨. 존재하지 않는 파일 참조 시 동작 미정의 | Glob으로 각 경로 확인 |
| C1-2 | **Rules 내 파일 참조** | rules 안에서 참조하는 파일/라이브러리가 실제로 존재하는가? | 일반 원칙: 참조 무결성 | Glob/Grep으로 확인 |
| C1-3 | **Skills 내 리소스 참조** | SKILL.md에서 참조하는 리소스 파일이 모두 존재하는가? | 일반 원칙: 참조 무결성 | Glob으로 확인 |
| C1-4 | **Skills 간 교차 참조** | 한 스킬이 다른 스킬의 리소스를 참조할 때 경로가 정확한가? | 일반 원칙: 참조 무결성 | 교차 경로 검증 |
| C1-5 | **package.json 의존성** | rules/skills에서 언급하는 라이브러리가 package.json에 설치되어 있는가? | 일반 원칙: 의존성 일관성 | package.json 교차 검증 |
| C1-6 | **데이터 파일 동기화** | `ruleRelationships.js` 등 메타 데이터가 실제 파일 구조와 일치하는가? | 프로젝트 자체 원칙: "데이터 단일 소스" | 노드/엣지를 실제 파일과 대조 |

### C-2. 내용 일관성

| # | 평가 기준 | 확인할 사항 | 공식 근거 | 확인 방법 |
|---|----------|-----------|----------|----------|
| C2-1 | **규칙 간 충돌** | CLAUDE.md, rules, skills 사이에 모순되는 지시사항이 있는가? | docs: "Consistent (no conflicting rules across files)" | 교차 비교 |
| C2-2 | **용어 일관성** | 같은 개념에 다른 용어를 사용하고 있지 않은가? | 일반 원칙: 일관성 | 전체 파일 스캔 |
| C2-3 | **버전 일치** | 언급된 기술 버전이 실제 설치 버전과 일치하는가? | 일반 원칙: 정확성 | package.json 대조 |

### C-3. 대상 사용자 적합성

| # | 평가 기준 | 확인할 사항 | 공식 근거 | 확인 방법 |
|---|----------|-----------|----------|----------|
| C3-1 | **복잡도 수준** | 설정의 복잡도가 대상 사용자(바이브 코딩 초보 디자이너/디자인 모르는 개발자)에게 적절한가? | 프로젝트 목적에 의한 기준. 공식 문서는 대상별 가이드라인 없음 | 사용자 페르소나 기반 주관적 평가 (명시 필요) |
| C3-2 | **온보딩 경로** | 새 사용자가 프로젝트를 받았을 때 시작점이 명확한가? | 일반 UX 원칙. CLAUDE.md의 공식 역할은 "Claude를 위한 지시사항"이며 **사람을 위한 온보딩은 README.md 영역** | README.md 상태 확인 |
| C3-3 | **유지보수 부담** | 수동으로 동기화해야 하는 파일/데이터가 있는가? 이 부담이 합리적인가? | 일반 원칙: 유지보수성 | 수동 동기화 필요 항목 목록화 |
| C3-4 | **공유 가능성** | 프로젝트를 clone한 사람이 추가 설명 없이 사용할 수 있는가? | 일반 원칙: 재현성 | `.claude/settings.local.json`의 개인 설정이 gitignore 대상인지, 필수 설정이 `settings.json`에 있는지 |

### C-4. 과잉설계 판정 기준

| # | 평가 기준 | 확인할 사항 | 공식 근거 | 확인 방법 |
|---|----------|-----------|----------|----------|
| C4-1 | **SKILL.md 분량** | SKILL.md 본문이 500줄 이하인가? | docs: 500줄 이하 공식 권장 | `wc -l` |
| C4-2 | **리소스 파일 분량** | 리소스 파일이 크다는 것 자체가 문제인가? | docs: **문제 아님**. "Large reference docs... don't need to load into context every time" — 읽기 전 비용 0 | 이 기준 자체가 "과잉설계"로 판정할 근거가 **공식적으로 없음**을 인지 |
| C4-3 | **스킬 수** | 스킬 수가 많다는 것 자체가 문제인가? | docs: **공식 제한 없음**. 다만 "많으면 description 잘림 가능" -> `SLASH_COMMAND_TOOL_CHAR_BUDGET`로 조절 | 스킬 수와 description 잘림 위험 평가 |
| C4-4 | **Hook 부재** | Hook이 없는 것이 "갭"인가 "설계 선택"인가? | docs: hooks는 optional 기능 확장. "required"라는 표현 없음. 7가지 패턴이 "recommended"로 제시 | **optional로 명시된 기능의 부재를 결함으로 평가하는 것이 정당한지** |
| C4-5 | **MCP 부재** | MCP가 없는 것이 "갭"인가? | docs: MCP는 optional 기능 확장 | 동일 논리 |
| C4-6 | **메타 인프라** | rule-visualization 같은 "설정을 관리하는 설정"이 필요한가? | 공식 문서에 이런 패턴 없음. 프로젝트 자체의 설계 판단 | 유지보수 비용 대비 가치 |

---

## 부록: 이전 평가에서 오적용된 기준 목록

| 기존 기준 | 오류 유형 | 정정 |
|----------|----------|------|
| "CLAUDE.md에 프로젝트 정체성 필요" | README.md 역할과 혼동 | CLAUDE.md는 Claude를 위한 지시사항. 프로젝트 소개는 README 영역 |
| "CLAUDE.md가 150-200줄이어야 한다" | per-file 기준을 합산 기준으로 오적용 | 200줄은 CLAUDE.md **단일 파일** 기준. rules로 분리하면 CLAUDE.md는 짧아도 됨 |
| "디자인 시스템 헌법" | 커뮤니티 패턴을 공식 기준으로 격상 | Anthropic 공식 용어 아님 |
| "Prettier hook이 table stakes" | 개인 의견을 공식 권장으로 격상 | 7가지 recommended patterns 중 하나. required 아님 |
| "UserPromptSubmit으로 스킬 활성화 보장" | 커뮤니티 워크어라운드를 공식 권장으로 격상 | 공식 문서에 이 패턴 없음 |
| "스킬 자동 활성화가 unreliable" | 커뮤니티 불만을 공식 인정으로 격상 | 공식 인정 아님. description 품질에 의존 |
| "14개 hook 이벤트, 3가지 핸들러" | 참조 자료의 숫자를 검증 없이 인용 | 실제: 26개 이벤트, 4가지 핸들러 |
| "리소스 파일 906줄이 과중" | 공식 기준 없는 주관적 판단 | 리소스 파일은 읽기 전 비용 0. 공식 크기 제한 없음 |
