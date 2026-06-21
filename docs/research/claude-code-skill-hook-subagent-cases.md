# Claude Code Skill / Hook / Sub-Agent 활용 케이스 조사

> 조사 기준: 2025.12 ~ 2026.03 (최근 3개월)
> 조사 일자: 2026-03-18
> 초점: 웹 프로덕트 개발, 디자인 시스템 구축

---

## 1. Skill 활용 케이스

Skill은 `.claude/skills/[skill-name]/SKILL.md` 파일 + 스크립트/리소스로 구성되는 파일 기반 확장 시스템. CLAUDE.md가 "권고"라면 Skill은 "구조화된 on-demand 컨텍스트"로, 관련 태스크 발생 시 로드됨. 2026년 3월 기준 60,000+ 퍼블리시된 Skill 존재.

### A. 프론트엔드 디자인 Skill (Anthropic 공식)

- 2026년 3월 기준 **277,000+ 설치**, 가장 인기 있는 공식 Skill
- AI 생성 UI의 "분포 수렴" 문제 해결 목적 (Inter 폰트, 보라색 그라데이션, 제네릭 카드 레이아웃으로의 수렴)
- ~400 토큰 프롬프트로 코드 작성 전 **목적, 톤, 제약조건, 차별화** 4가지 차원을 추론하도록 강제
- Anthropic Applied AI팀 2025.11 블로그에서 SaaS 랜딩, 블로그, 어드민 대시보드 before/after 비교 공개

### B. shadcn/ui 공식 Skill

- `npx skills add shadcn/ui`로 설치
- 매 인터랙션마다 `components.json` 읽기 + `shadcn info --json` 실행
- Claude에게 **프레임워크 버전, Tailwind 설정, 설치된 컴포넌트, 파일 alias**를 실시간 제공
- shadcn MCP 서버(실시간 컴포넌트 문서) + Presets(번들 디자인 토큰)와 결합 → 3-layer context stack
- shadcn/ui CLI v4 (2026.03 릴리즈) — 제작자가 **"코딩 에이전트를 위해 만들었다"** 명시

### C. Superpowers 프레임워크 (GitHub 40K+ stars)

전체 개발 라이프사이클을 Skill 체인으로 구성:

| Skill | 역할 | 특징 |
|-------|------|------|
| brainstorming | 코드 작성 전 아이디어 정제, 대안 탐색 | 섹션별 검증 후 승인 |
| using-git-worktrees | 격리 워크스페이스 생성 | 클린 테스트 베이스라인 확인 |
| implementation-planning | 구현 계획 수립 | 단계별 분해 |
| RED/GREEN TDD | 테스트 우선 개발 강제 | **테스트 전 코드 작성 시 삭제 후 재시작** |
| code-review | 머지 전 자동 리뷰 | 품질 게이트 역할 |

- Skill 생성 자체도 TDD 방식으로 수행 (RED/GREEN 사이클)
- Git worktree로 동일 프로젝트에서 병렬 작업 격리

### D. Figma MCP + Design System Skill

- **Figma Code-to-Canvas** (2026.02.17 발표, Gui Seiz & Alex Kern) — 양방향 루프:

```
Claude Code에서 UI 빌드
  → "Send this to Figma" 입력
  → 브라우저 상태가 편집 가능한 Figma 레이어로 변환 (스크린샷 아님)
  → 팀이 Figma에서 수정/주석
  → Figma MCP로 변경사항 코드에 반영
```

- **Intercom Staff Designer** Domingo Widen (Sneak Peek 팟캐스트): "시스템에 추가하는 모든 패턴이 디자이너가 프로토타이핑에 사용할 수 있는 새 코드가 된다" — 복리 효과. 단, 전담팀 + 프로토타이핑 허브 + 문서 + 튜토리얼 + 수개월의 skill 엔지니어링 필요
- **Dhika Endi Astowo** (Design Systems Collective, 2026.01): CLAUDE.md를 "디자인 시스템 헌법"으로 사용. 정확한 간격 스케일(4,8,16,24,32,48px), 색상 토큰, WCAG 2.1 AA, 다크모드 명시 → Figma 링크 붙여넣기만으로 토큰/타입/접근성이 맞는 컴포넌트 자동 생성
- **Yan Liu**: 15분 만에 전체 디자인 시스템(토큰 + 컴포넌트 + 코드) 구축 사례

### E. 커뮤니티 Skill 저장소

| 저장소 | 내용 | 비고 |
|--------|------|------|
| jezweb/claude-skills | Next.js 16 Skill (App Router, `use cache`, Server Components) | 65-70% 토큰 절감, 18+ 에러 카테고리 방지. 2026.01 업데이트 |
| secondsky/claude-skills | **167개** 프로덕션 Skill (`tailwind-v4-shadcn`, `tanstack-start`, `hono-api-scaffolder` 등) | |
| blencorp/claude-code-kit | 프레임워크 자동감지 + Skill 설치 (`npx claude-code-setup --kit tailwindcss`) | Tailwind v4 `@theme`, OKLCH, 다크모드 패턴 |
| julianromli/ai-skills | `vibe-cloner` — Firecrawl MCP로 기존 웹사이트 스크래핑 → 디자인 토큰 추출 | 3단계: Scrape → Analysis → Code Generation |
| bear2u/my-skills | 한국어 Skill (`landing-page-guide-v2`, `design-prompt-generator-v2`, `nextjs15-init`) | |

### F. 기타 주요 Skill

- **Composition Patterns Skill**: 컴파운드 컴포넌트, Context Provider, 명시적 Variant, 상태 관리 아키텍처 등 확장 가능한 패턴 학습
- **Vercel Web Design Guidelines Skill**: 100개 이상의 접근성/성능/UX 규칙으로 기존 UI 코드 자동 리뷰
- **Skill Creator** (Anthropic 공식): 인터랙티브 Q&A로 SKILL.md + 템플릿 + 리소스 디렉토리 자동 생성
- **Marie Claire Dean**: 63개 디자인 Skill + 27개 커맨드, 8개 플러그인 (리서치, 시스템, 전략, UI, 인터랙션, 프로토타이핑, 디자인 옵스, 툴킷). `/handoff` 커맨드 → 측정값, 동작, 엣지케이스, QA 체크리스트 포함 개발자 핸드오프 패키지 생성
- **nathanonn.com 사례**: `skill-creator` 메타스킬로 디자인 토큰 추출 → Skill 패키징 → **47개 컴포넌트** 일관 리디자인

### G. 접근성 & Storybook

- **AccessLint**: WCAG 2.1 Level A/AA 감사 + 색상 대비 분석
- **Community-Access/accessibility-agents**: 57개 전문 에이전트, 5개 팀, Playwright 행동 스캐닝
- **Brent W. Peterson 사례** (2025.12): 마케팅 사이트에서 Pa11y 29개 오류 발견 → 4개 근본 패턴으로 그룹화 → Tailwind 색상 변형 조정(-400 → -200)으로 WCAG 4.5:1 대비율 충족
- **Storybook MCP addon** (`@storybook/addon-mcp`): 에이전트에게 컴포넌트 메타데이터, 검증된 패턴, 테스트 스위트 제공

---

## 2. Hook 활용 케이스

**핵심 인사이트: "Skill은 확률적(probabilistic), Hook은 결정적(deterministic)."** CLAUDE.md 지시는 무시될 수 있지만, Hook은 라이프사이클 이벤트마다 반드시 실행되는 셸 명령. 2026년 기준 **14개 라이프사이클 이벤트**, **3가지 핸들러 타입** (command, prompt, agent) 지원.

**설정 레벨:**

| 레벨 | 파일 | 용도 |
|------|------|------|
| 전역 | `~/.claude/settings.json` | 모든 프로젝트 |
| 프로젝트 | `.claude/settings.json` | 팀 공유 (git 추적) |
| 로컬 | `.claude/settings.local.json` | 개인 설정 (gitignore) |

### A. 자동 Lint/Format (가장 보편적)

거의 모든 가이드와 실제 설정에서 등장하는 **가장 일반적인 Hook 패턴**:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
      }]
    }]
  }
}
```

- **Boris Cherny (Claude Code 제작자)**, 2026.02 Threads 포스트: 본인이 이 패턴을 사용한다고 확인. **"CI 포맷팅 에러를 피하기 위한 마지막 10%를 처리한다."**
- Stop hook에 background agent를 연결하여 장기 태스크의 결과를 결정적으로 검증하는 패턴도 공개

### B. Lint 우회 방지 — Liam ERD 사례

**가장 설득력 있는 프로덕션 사례** (github.com/liam-hq/liam, 오픈소스 DB 설계 도구):

- **문제**: Claude Code가 프로젝트 전체 린팅을 건너뛰며 실패를 "관련 없음"으로 무시
- **해결**: Lefthook pre-commit hook(`pnpm lint`) + Claude Code 권한 설정에서 `git commit --no-verify:*` 차단
- 블로그 (2025.12)에 전체 설정 파일과 반복 시행착오 과정 포함

### C. 병렬 에이전트 브랜치 격리 — GitButler

- 여러 동시 Claude Code 세션의 변경사항을 **자동으로 별도 브랜치에 격리**
- 3개 Hook 이벤트 사용:

| 이벤트 | 명령 | 역할 |
|--------|------|------|
| PreToolUse | `but claude pre-tool` | 변경 전 상태 기록 |
| PostToolUse | `but claude post-tool` | 변경 후 브랜치 분리 |
| Stop | `but claude stop` | 세션 종료 시 정리 |

### D. 보안 & 안전 Hook

| 출처 | Hook 내용 |
|------|-----------|
| **Trail of Bits** (보안 기업) | PreToolUse: `rm -rf` 차단 (trash 제안), main/master 직접 push 차단. 오픈소스: github.com/trailofbits/claude-code-config |
| **Cameron Westland** | 브랜치 보호 (feature branch 가이드 JSON 반환) + TypeScript `tsc --noEmit` + `yarn lint:fix` |

### E. 실시간 진단 Hook

- **@juanpprieto/claude-lsp**: npm 패키지로 백그라운드 LSP 데몬 실행
- SessionStart/PostToolUse/SessionEnd hook으로 **TypeScript, ESLint, Prettier, GraphQL 진단을 지속 주입**

### F. TDD Guard — 한계점 포함

- **Nizar Selander**: PreToolUse hook으로 Write/Edit/MultiEdit 가로채서 test-first 개발 강제
- JavaScript, Python, PHP, Go, Rust 지원
- **중요한 발견**: 에이전트가 TDD를 따르는 것처럼 *보이지만*, 실제로는 컨텍스트가 "TDD로 포화"되어서 그런 것일 수 있음 — hook 실행이 실제 행동을 강제한 것인지 불분명

### G. Skill Auto-Activation 보완 워크어라운드

- **Reddit u/JokeGold5455**: 5 skills + 6 hooks + 10 agents + 3 slash commands 인프라 구축
- `UserPromptSubmit` hook에 "SKILL ACTIVATION CHECK" 프롬프트 주입 → Claude가 행동 전 관련 Skill 확인하도록 강제
- **배경**: skill auto-activation이 불안정하여 Claude가 메인 세션에서 직접 처리하는 문제 보완
- 오픈소스: github.com/diet103/claude-code-infrastructure-showcase

---

## 3. Sub-Agent 활용 케이스

v2.1.63에서 "Task tool" → "Agent"로 리네임. 최대 **10개 동시 sub-agent** 지원, 각각 독립 컨텍스트 윈도우/시스템 프롬프트/도구 접근. Agent Teams (2026.02.05, Research Preview, Opus 4.6) — 여러 풀 Claude Code 인스턴스가 피어투피어 메시징으로 공유 코드베이스에서 병렬 작업.

### A. Anthropic C 컴파일러 프로젝트 (플래그십)

| 항목 | 수치 |
|------|------|
| 병렬 에이전트 | 16개 |
| 인풋 토큰 | **2B (20억)** |
| 아웃풋 토큰 | 140M |
| 비용 | ~$20K |
| 세션 수 | ~2,000 |
| 코드 라인 | 100,000 |
| 결과 | Linux 6.9를 x86/ARM/RISC-V에서 컴파일하는 Rust 기반 C 컴파일러 |

- 각 에이전트가 Docker 컨테이너에서 실행, 공유 bare git repo, 파일 기반 잠금으로 태스크 선점

### B. Product Trinity 패턴 — Zach Wills

`/add-linear-ticket` 커맨드로 3개 sub-agent **병렬** 실행:

```
product-manager (유저 스토리 정의)  ─┐
ux-designer (기존 컴포넌트 재사용 UX 흐름) ─┼→ Linear 티켓 자동 생성
senior-software-engineer (기술 스펙)  ─┘
```

- 구현: `senior-software-engineer` (Opus) + 반복적 `code-reviewer` 피드백 루프
- 대규모 리팩토링 패턴: "75개 파일에서 사용되는 함수 deprecate → 메인 에이전트가 grep → 파일별 전용 sub-agent 생성"

### C. PubNub 3단계 파이프라인

| 단계 | Agent | 역할 |
|------|-------|------|
| 1 | pm-spec | 개선사항 읽고 워킹 스펙 작성 |
| 2 | architect-review | 플랫폼 제약조건 대비 설계 검증 (PubNub MCP 서버 활용) + ADR 생성 |
| 3 | implementer-tester | 코드 구현, 테스트, 문서 업데이트 |

- `SubagentStop` hook으로 단계 체이닝, 각 핸드오프에 **human-in-the-loop 승인**
- 결론: **"Subagents + hooks가 Claude Code를 도움이 되는 AI에서 반복 가능한 엔지니어링 시스템으로 전환한다."**

### D. 디자인 시스템 전용 Sub-Agent — The Design Project

cal.com 오픈소스 리포 (50+ UI 컴포넌트) Storybook 라이브러리를 **하루 만에** 구축:

| 단계 | 내용 |
|------|------|
| Phase 1 | 감사 — 리포 분석 |
| Phase 2 | 카탈로그 생성 — **17 simple, 20 medium, 7 complex** 컴포넌트 분류 |
| Phase 3 | 스토리 빌드 — Playwright MCP로 시각적 검증 |
| 발견 | 토큰 환경 불일치, CSS hover 상태 이슈 (`@media (hover: hover)` in Tailwind v4) |

- 3~4개 컴포넌트 후 충분한 지식 축적 → 나머지 일괄 빌드

전용 Sub-Agent 구성:

| Agent | 역할 |
|-------|------|
| design-verification | 컴포넌트 구현 ↔ Figma 디자인 일치 검증 |
| component-composition-reviewer | 중첩 컴포넌트 생성 리뷰 |
| figma-code-connect-generator | Code Connect 태스크 처리 |

### E. TDD Sub-Agent — Alex Opalka (Vue.js)

| Agent | 단계 | 역할 |
|-------|------|------|
| tdd-test-writer | RED | 실패하는 테스트 작성, 실패 확인 |
| tdd-implementer | GREEN | 테스트 통과하는 최소 코드 |
| tdd-refactorer | REFACTOR | 코드 품질 개선 |

- **컨텍스트 격리**로 test-writer가 구현 방식을 모르는 상태에서 테스트 작성 → 진정한 test-first 보장
- "context pollution" 방지가 핵심

### F. Claude Code + Codex CLI 협업

- Claude Code = 빌더, Codex CLI = 리뷰어
- 접근성 개선 및 컴포넌트 구조 일관성에 특히 효과적

### G. 비용 고려사항

| 모드 | 토큰 사용량 (단일 에이전트 대비) |
|------|-------------------------------|
| Sub-agent | **4~7x** |
| Agent Teams | **~15x** |

- Heeki Park (2026.03): "내가 하는 대부분의 작업에서 Agent Teams보다 subagents가 복잡도와 시간 면에서 충분하다."

---

## 4. 한국 커뮤니티 동향

| 출처 | 내용 |
|------|------|
| bear2u/my-skills | 한국어 Skill 컬렉션 (`landing-page-guide-v2`, `design-prompt-generator-v2`, `nextjs15-init`) |
| brunch.co.kr | Figma MCP 연동 한국어 가이드 — 디자인 토큰 추출, 시각적 피드백 루프 |
| TILNOTE | frontend-design Skill 설치 튜토리얼 — AI 맥주 큐레이션 서비스 랜딩 (Next.js + shadcn/ui) |
| Apidog 한국어 블로그 | "분포 수렴" 대응: 타이포그래피 가이드라인, 테마 엔지니어링, 디자인 토큰 관리 |
| **GeekDive Corp** | 프론트엔드 개발 태스크 **최대 90% 시간 단축** 보고 |

---

## 5. 현재 프로젝트 적용 시사점

| 영역 | 현재 구성 | 참고 사례 | 적용 난이도 | 기대 효과 |
|------|-----------|-----------|------------|-----------|
| `/frontend-design` Skill | 사용 중 | Figma MCP 양방향 싱크, shadcn/ui Skill | 중 | 디자인-코드 루프 단축 |
| `component-work` Skill | 워크플로우 담당 | Composition Patterns Skill, Marie Claire Dean 핸드오프 | 하 | 컴포넌트 구조 일관성 |
| Hook (Format) | **미설정** | Prettier PostToolUse hook (Boris Cherny 패턴) | **하** | CI 포맷 에러 제거 |
| Hook (토큰 검증) | **미설정** | Dhika Endi Astowo "디자인 시스템 헌법", PreToolUse 검증 | 중 | theme 토큰 강제 준수 |
| Hook (Lint 우회 방지) | **미설정** | Liam ERD `--no-verify` 차단 | 하 | 린팅 스킵 원천 차단 |
| Hook (Skill 활성화) | **미설정** | UserPromptSubmit "SKILL ACTIVATION CHECK" | 중 | Skill 자동 활성화 안정성 보완 |
| Sub-Agent (디자인 검증) | 기본 사용 | design-verification + component-reviewer | 중 | Figma ↔ 코드 일치 자동 검증 |
| Sub-Agent (TDD) | 미도입 | Alex Opalka RED/GREEN/REFACTOR 패턴 | 중 | 테스트 품질 향상 |
| Superpowers | 미도입 | 전체 라이프사이클 Skill 체인 | 상 | 체계적 개발 프로세스 |

---

## 6. 핵심 결론

**첫째, Skills-as-Design-System 패턴이 작동한다.** 디자인 토큰, 컴포넌트 규칙, 코딩 표준을 SKILL.md로 인코딩하면 일관된 컴포넌트가 생성된다. 커뮤니티 합의: CLAUDE.md는 200줄 이하, 특정 도메인은 별도 Skill로 점진적 공개(progressive disclosure).

**둘째, Hook이 강제력 문제를 해결한다.** Prettier PostToolUse hook은 기본. 브랜치 보호, TypeScript 타입 체크, lint 강제를 hook으로 걸면 CLAUDE.md 지시만으로는 불가능한 보장을 얻는다. Liam ERD 사례가 가장 명확한 증거: hook 없이는 Claude가 린팅을 건너뛰고, hook 있으면 건너뛸 수 없다.

**셋째, Sub-agent는 강력하지만 비싸다.** PM/UX/Engineer 트리오 (Zach Wills), spec→architecture→implementation 파이프라인 (PubNub), TDD Red-Green-Refactor (Alex Opalka)가 가장 검증된 패턴. 단, 4-7x 토큰 비용과 과도 생성(over-spawning) 이슈로 복잡하거나 병렬화 가능한 태스크에 선별 사용이 현실적.

**주의: Skill auto-activation은 여전히 불안정.** Claude가 매칭되는 에이전트에 위임하지 않고 메인 세션에서 직접 처리하는 경우가 빈번. UserPromptSubmit hook 워크어라운드가 존재하지만, 인프라가 아직 성숙 중임을 보여준다.

---

## Sources

### 공식 문서
- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Claude Code Sub-Agents Docs](https://code.claude.com/docs/en/sub-agents)
- [Claude Code Common Workflows](https://code.claude.com/docs/en/common-workflows)
- [Figma MCP Server — Create Design System Rules](https://developers.figma.com/docs/figma-mcp-server/skill-create-design-system-rules/)

### 프로덕션 사례
- [Liam ERD — lint 강제 사례](https://github.com/liam-hq/liam)
- [Trail of Bits — 보안 hook 설정](https://github.com/trailofbits/claude-code-config)
- [diet103 — 5 skills + 6 hooks + 10 agents 인프라](https://github.com/diet103/claude-code-infrastructure-showcase)
- [PubNub — Sub-Agent Best Practices](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/)
- [The Design Project — cal.com Storybook 구축](https://uxdesign.cc/designing-with-claude-code-and-codex-cli-building-ai-driven-workflows-powered-by-code-connect-ui-f10c136ec11f)

### 프레임워크 & 저장소
- [Superpowers Framework (GitHub)](https://github.com/obra/superpowers)
- [Superpowers Deep Dive](https://www.heyuan110.com/posts/ai/2026-02-01-superpowers-deep-dive/)
- [Awesome Claude Code](https://github.com/hesreallyhim/awesome-claude-code)
- [Awesome Claude Code Sub-Agents](https://github.com/VoltAgent/awesome-claude-code-subagents)

### 가이드 & 블로그
- [Claude Code Hooks Complete Guide (DEV)](https://dev.to/lukaszfryc/claude-code-hooks-complete-guide-with-20-ready-to-use-examples-2026-dcg)
- [Claude Code to AI OS Blueprint (DEV)](https://dev.to/jan_lucasandmann_bb9257c/claude-code-to-ai-os-blueprint-skills-hooks-agents-mcp-setup-in-2026-46gg)
- [Agentic Coding 2026 Guide](https://halallens.no/en/blog/agentic-coding-in-2026-the-complete-guide-to-plugins-multi-model-orchestration-and-ai-agent-teams)
- [Best Claude Code Skills 2026 (Firecrawl)](https://www.firecrawl.dev/blog/best-claude-code-skills)
- [Figma MCP + Design System in 15 mins](https://medium.com/@yanliuharvard/no-64-figma-mcp-claude-code-3-how-i-built-a-design-system-in-15mins-6ef95145a4e5)
- [Figma + Claude for Design System Tasks](https://medium.com/@singhsamratankit/figma-claude-for-design-system-tasks-6d6c71c971b5)
- [Claude Code Agent Skills 2.0 (Towards AI)](https://medium.com/@richardhightower/claude-code-agent-skills-2-0-from-custom-instructions-to-programmable-agents-ab6e4563c176)
- [Demystifying Design Systems with Figma MCP](https://www.designsystemscollective.com/demystifying-design-systems-and-using-figmas-mcp-with-claude-cli-674d1b66468b)
- [Pre-commit Setup Skill (MCP Market)](https://mcpmarket.com/tools/skills/pre-commit-setup)
- [Git Hooks with Claude Code (DEV)](https://dev.to/myougatheaxo/git-hooks-with-claude-code-build-quality-gates-with-husky-and-pre-commit-27l0)
