# Claude Code in Action — 노트 테이킹 (한글)

**Course:** Claude Code in Action  
**Instructor:** Stephen Grider (Anthropic Technical Staff)  
**Source:** https://anthropic.skilljar.com/claude-code-in-action  
**추출일:** 2026년 4월  
**비고:** 비디오 자막 및 텍스트 레슨 기반 정리. 고유명사·기능명은 원문 유지.

---

## Section 1: What is Claude Code?

### Lesson 1. Introduction

코스 개요. 총 4개 섹션으로 구성되어 있다. coding assistant가 무엇인지 이해하고, Claude Code가 왜 다른지 파악한 뒤, 실제 프로젝트에서 hands-on으로 사용해보고, 마지막으로 자기 프로젝트에서 최대한 활용하는 법을 다룬다.

### Lesson 2. What is a coding assistant?

coding assistant는 task를 받으면 내부의 language model에 전달하고, 모델이 tool(파일 읽기, 검색, 명령어 실행, 파일 쓰기 등)을 사용해서 문제를 해결하는 구조다. assistant마다 차이를 만드는 건 두 가지: **(1)** 어떤 tool에 접근할 수 있는가, **(2)** 모델이 그 tool을 얼마나 잘 쓰는가.

Claude Code는 터미널에서 동작하기 때문에 시스템 전체에 접근할 수 있다 — 파일 읽기/쓰기, 명령어 실행, 코드 검색 등. IDE 기반 assistant가 editor API에 갇혀있는 것과 근본적으로 다르다. Claude는 특히 tool use에 강하다. 어떤 tool을 언제 써야 하는지에 대한 판단력이 좋다는 의미다.

### Lesson 3. Claude Code in action

Claude Code의 능력을 보여주는 데모 두 가지:

**(1)** chalk 라이브러리의 성능 이슈 찾기 및 최적화 — Claude가 파일을 읽고, 병목 지점을 식별하고, 수정안을 제안하고, benchmark를 실행했다.

**(2)** Playwright MCP server를 사용해서 앱에 dark mode 추가 — Claude가 브라우저를 직접 제어하고, 스크린샷을 찍고, 시각적 피드백을 기반으로 UI를 반복 수정했다.

핵심: Claude Code의 기본 tool만으로도 강력하지만, MCP server를 추가하면 능력이 극적으로 확장된다.

---

## Section 2: Getting Hands On

### Lesson 4. Claude Code setup (텍스트 레슨)

설치 방법:
- macOS (Homebrew): `brew install --cask claude-code`
- macOS/Linux/WSL: `curl -fsSL https://claude.ai/install.sh | bash`
- Windows CMD: `curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd`

설치 후 터미널에서 `claude`를 실행하면 인증 절차가 진행된다. AWS Bedrock이나 Google Cloud Vertex를 사용하는 경우 추가 설정이 필요하다.

### Lesson 5. Project setup (텍스트 레슨)

https://github.com/anthropics/courses 를 clone하고, `claude-code-in-action` 폴더로 이동. Node 백엔드를 가진 기본적인 TypeScript 앱이다.

### Lesson 6. Adding context

이 코스에서 가장 중요한 개념: **context management**.

context가 너무 적으면 Claude가 task를 해결할 수 없고, 관련 없는 context가 너무 많으면 Claude의 효율이 떨어진다. "딱 필요한 만큼"이 핵심이다.

context를 추가하는 4가지 방법:

**(1) prompt에 직접 포함** — 코드 조각이나 에러 메시지를 직접 붙여넣기.
**(2) @-mention으로 파일 참조** — 특정 파일을 지정해서 Claude에게 읽히기.
**(3) 이미지 사용** — Ctrl+V로 스크린샷을 Claude Code에 붙여넣기.
**(4) CLAUDE.md 파일** — 프로젝트 루트에 두는 영구적인 프로젝트 레벨 instructions. Claude가 세션 시작 시 자동으로 읽는다.

CLAUDE.md가 가장 중요한 context 도구다. 프로젝트 convention, 아키텍처 노트, 자주 쓰는 패턴을 여기에 정리해두면 매번 설명할 필요가 없다.

### Lesson 7. Making changes

실전에서 쓸만한 기능들:

**(1)** Ctrl+V로 스크린샷을 붙여넣어서 Claude에게 "이 부분을 수정해줘"라고 지시할 수 있다.
**(2)** Claude가 변경사항을 적용하기 전에 diff를 보여준다 — approve하거나 reject할 수 있다.
**(3)** `/undo`로 변경을 되돌릴 수 있다.
**(4)** Claude가 dev server를 실행하고 변경사항을 검증할 수 있다.
**(5)** 여러 파일에 걸친 변경이 함께 추적된다.

팁: 구체적으로 요청해야 한다. 모호한 요청은 모호한 결과를 낳는다.

### Lesson 8. Controlling context

context를 제어하는 기법들:

**(1) Escape 키** — Claude가 작업 중일 때 눌러서 중단시키고 다른 방향으로 재지시.
**(2) Escape + memories 조합** — Claude가 반복적으로 하는 실수를 영구적으로 교정.
**(3) /clear** — 대화 context를 초기화. 다른 작업으로 전환할 때 사용.
**(4) /compact** — 긴 대화를 요약해서 context window를 확보.
**(5) 새 대화 시작** — 관련 없는 작업은 기존 대화를 이어가지 말고 새 세션에서.

Escape 키가 특히 강력하다 — 실시간으로 방향을 교정할 수 있다.

### Lesson 9. Custom commands

`.claude/commands/` 디렉토리에 `.md` 파일을 만들면 custom command가 된다. 파일 이름이 곧 명령어 이름이다 (예: `audit.md` → `/audit`).

command 파일에는 상세한 prompt를 넣을 수 있어서 반복 작업을 자동화하기 좋다. 예시: dependency 취약점을 검사하고, 업데이트하고, 테스트를 실행하는 audit command.

새 command를 추가한 후에는 Claude Code를 재시작해야 적용된다.

### Lesson 10. MCP servers with Claude Code

MCP server는 Claude Code에 새로운 tool을 추가하는 방법이다.

설치: `claude mcp add [이름] -- [명령어]`

예시: Playwright MCP server를 추가하면 Claude가 브라우저를 제어할 수 있게 된다. tool 권한 관리는 `settings.local.json`의 `allow` 배열에서 자동 승인을 설정할 수 있다.

MCP server는 로컬(내 머신에서 실행)이거나 리모트일 수 있다. MCP registry에서 다양한 서버를 탐색할 수 있다.

### Lesson 11. Github integration

`/install-github-app`으로 설치. 두 가지 GitHub Action이 추가된다:

**(1) @Claude mentioning** — issue나 PR에서 @Claude를 태그하면 Claude에게 작업을 맡길 수 있다.
**(2) Auto PR review** — PR이 생성될 때마다 Claude가 자동으로 코드 리뷰를 수행한다.

두 action 모두 커스터마이징 가능하다. GitHub event 기반으로 추가 trigger를 설정할 수 있다. Claude가 branch를 만들고, 코드를 수정하고, PR을 제출하는 것까지 issue에서 직접 처리된다. label 기반 trigger, scheduled task 등으로 자동화를 확장할 수 있다.

---

## Section 3: Hooks and the SDK

### Lesson 12. Introducing hooks

Hook은 Claude가 tool을 사용하기 전이나 후에 커스텀 명령어를 실행하는 기능이다.

활용 사례: 파일 쓰기 후 자동으로 code formatter 실행, 편집 후 test 실행, 민감한 파일 읽기 차단.

두 가지 타입:
- **PreToolUse** — tool이 실행되기 전에 동작. 해당 action을 차단할 수 있다.
- **PostToolUse** — tool이 실행된 후에 동작.

hook script는 stdin으로 tool 호출 정보를 JSON 형태로 받고, stdout으로 JSON을 반환해서 행동을 제어한다 (예: action 차단, output 수정).

### Lesson 13. Defining hooks

실전 예시: Claude가 `.env` 파일을 읽지 못하도록 하는 hook 만들기.

`settings.local.json`의 hooks 섹션에서 설정한다. 각 hook에는:
- **matcher** — 감시할 tool을 지정 (예: "Read", "Grep")
- **command** — 실행할 script를 지정

PreToolUse hook은 `tool_input`을 받는데, 여기에 `file_path` 같은 상세 정보가 담겨있다. script가 파일 경로를 확인해서 `.env`이면 `{"decision": "block", "reason": "..."}` 을 반환하여 접근을 차단한다.

### Lesson 14. Implementing a hook

단계별 구현:

**(1)** `settings.local.json`의 `hooks.PreToolUse`에 hook 설정을 추가한다.
**(2)** matcher를 `"Read|Grep"`으로 설정해서 파일 접근 tool을 감시한다.
**(3)** command에 script 파일의 절대 경로를 지정한다 (보안상 절대 경로 사용).
**(4)** script가 stdin JSON을 읽고, `tool_input.file_path` 또는 `tool_input.pattern`을 확인한다.
**(5)** `.env`가 감지되면 `{"decision":"block","reason":"Sensitive file"}`을 출력한다.
**(6)** 아니면 아무것도 출력하지 않거나 빈 JSON을 반환해서 action을 허용한다.

### Lesson 15. Gotchas around hooks (텍스트 레슨)

보안 권장사항: hook script에는 **절대 경로를 사용**해야 한다. 상대 경로는 path interception 공격과 binary planting 공격에 취약하다.

문제는 절대 경로를 쓰면 `settings.json`을 팀원끼리 공유하기 어렵다는 것이다 (각자 머신의 경로가 다르니까). 해결책: `settings.example.json`에 `$PWD` placeholder를 쓰고, setup script가 실제 절대 경로로 치환한 `settings.json`을 생성하도록 한다.

### Lesson 16. Useful hooks!

실전에서 바로 쓸 수 있는 hook 두 가지:

**(1) Auto-build hook** — PostToolUse hook으로, 파일 쓰기 후 자동으로 TypeScript compiler를 실행한다. build가 실패하면 에러 output이 Claude에게 전달되고, Claude가 자동으로 문제를 수정한다. 이것이 핵심적인 feedback loop를 만든다: write → build → 에러 발견 → fix → 다시 build.

**(2) Query review hook** — Claude Code SDK를 hook 안에서 사용하는 예시. Claude가 SQL 관련 tool을 실행하기 전에, hook이 해당 query를 별도의 Claude instance에 보내서 보안 검토를 한다. 위험한 query(예: DROP TABLE)가 감지되면 차단한다. hooks + SDK의 조합으로 강력한 자동화가 가능하다는 것을 보여주는 데모다.

### Lesson 17. Another useful hook (텍스트 레슨)

PreToolUse/PostToolUse 외에 추가적인 hook 타입들:

- **Notification** — Claude Code가 알림을 보낼 때 (tool 권한 요청, 또는 60초 idle)
- **Stop** — Claude Code가 응답을 완료했을 때
- **SubagentStop** — subagent(UI에서 "Task"로 표시됨)가 완료됐을 때
- **PreCompact** — compact 작업이 실행되기 전 (수동이든 자동이든)
- **UserPromptSubmit** — 사용자가 prompt를 제출했을 때, Claude가 처리하기 전
- **SessionStart / SessionEnd** — 세션 시작/종료 시

중요: hook 타입마다 stdin으로 받는 input 형식이 다르다. PreToolUse의 `tool_input`도 어떤 tool이 호출되느냐에 따라 내용이 달라진다.

### Lesson 18. The Claude Code SDK

SDK는 Claude Code를 프로그래밍 방식으로 사용할 수 있게 해준다. CLI, TypeScript 라이브러리, Python 라이브러리로 제공된다.

일반 터미널에서 쓰는 것과 동일한 Claude Code이며, 모든 tool을 그대로 사용한다. 더 큰 pipeline이나 tool의 일부로 활용할 때 가장 유용하다.

데모: TypeScript SDK로 프로젝트 내 중복 SQL query를 찾는 script. SDK의 `conversation` 배열이 chat처럼 동작한다 — 메시지를 보내면 tool use 결과가 포함된 응답이 돌아온다. stream 방식으로 실시간 output을 받을 수 있다.

핵심: SDK를 사용하면 Claude Code의 지능을 어떤 자동화 workflow에든 끼워넣을 수 있다.

---

## Section 4: Wrapping Up

### Lesson 19. Summary and next steps

세 가지 권장사항:

**(1) 새 기능을 계속 주시하라** — Claude Code는 지속적으로 변하고 있다. homepage를 주기적으로 확인할 것.
**(2) 실험하라** — custom commands, CLAUDE.md instructions, 다양한 MCP server를 직접 시도해볼 것.
**(3) 자동화하라** — GitHub integration을 활용해서 repository event에 기반한 반복 작업을 Claude에게 위임할 것.
