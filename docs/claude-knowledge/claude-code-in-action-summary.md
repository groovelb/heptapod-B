# Claude Code in Action — 코스 완전 정리

> Anthropic Academy | Instructor: Stephen Grider  
> 원본: https://anthropic.skilljar.com/claude-code-in-action


## 이 코스가 말하고 싶은 것

이 코스의 핵심 메시지는 단순하다: **Claude Code는 "코드 자동완성 도구"가 아니라, 도구(tool)를 스스로 판단하고 사용하는 에이전트다.** 그리고 그 에이전트의 성능은 당신이 얼마나 잘 세팅하고 컨텍스트를 관리하느냐에 달려있다.

코스는 크게 4단계로 전개된다: 코딩 어시스턴트의 본질 이해 → 실전 사용법 → 고급 커스터마이징(Hooks/SDK) → 자동화.


## Part 1: 코딩 어시스턴트의 본질 — "도구를 쓰는 AI"

코딩 어시스턴트를 단순히 "코드 짜주는 AI"로 이해하면 제대로 활용할 수 없다. Stephen Grider는 코딩 어시스턴트의 작동 원리를 이렇게 설명한다:

**Task → Language Model → Tool Use → Result**

사용자가 과제를 주면, 언어 모델이 어떤 도구를 어떤 순서로 써야 하는지 판단한다. 파일 읽기, 코드 검색, 커맨드 실행, 파일 쓰기 등. 여기서 **어시스턴트의 차이는 두 가지**에서 나온다:

1. **어떤 도구에 접근할 수 있는가** — IDE 기반 어시스턴트는 에디터 API에 갇혀있다. Claude Code는 터미널에서 동작하므로 시스템 전체에 접근 가능하다.
2. **모델이 도구를 얼마나 잘 쓰는가** — Claude는 tool use에 특히 강하다. 어떤 도구를 언제 쓸지에 대한 판단력이 좋다는 의미다.

**활용 포인트:** Claude Code의 힘은 "터미널 레벨 접근권한 + 도구 사용 판단력"의 조합에서 나온다. IDE 플러그인형 어시스턴트와는 근본적으로 다른 카테고리다.


## Part 2: 실전의 핵심 — Context Management

코스에서 가장 많은 시간을 할애하고, 가장 강조하는 개념이 **컨텍스트 관리**다. 이건 그냥 "프롬프트 잘 쓰기"가 아니다.

### 왜 컨텍스트 관리가 중요한가

프로젝트에 수백 개의 파일이 있을 때, Claude에게 모든 정보를 주면 오히려 성능이 떨어진다. 필요한 만큼만, 정확하게 주는 것이 핵심이다.

### 컨텍스트를 추가하는 4가지 방법

| 방법 | 설명 | 언제 쓰나 |
|------|------|-----------|
| **프롬프트에 직접 포함** | 코드 조각, 에러 메시지를 직접 붙여넣기 | 특정 이슈를 해결할 때 |
| **@-mention으로 파일 참조** | @src/auth.ts 형태로 특정 파일 지정 | 특정 파일 작업 시 |
| **스크린샷 (Ctrl+V)** | UI 스크린샷을 직접 Claude에게 전달 | 프론트엔드 작업, 시각적 이슈 |
| **CLAUDE.md** | 프로젝트 루트에 두는 영구 컨텍스트 파일 | 항상. 가장 중요한 컨텍스트 도구 |

### CLAUDE.md — 가장 중요한 설정 파일

CLAUDE.md는 Claude Code가 세션 시작 시 자동으로 읽는 파일이다. 여기에 프로젝트 아키텍처, 코딩 컨벤션, 자주 쓰는 패턴을 적어두면 매번 설명할 필요가 없다. 이건 Claude Code를 "우리 팀 컨텍스트를 이해하는 어시스턴트"로 만드는 핵심 수단이다.

### 컨텍스트를 줄이는 기법

- **Escape** — Claude가 잘못된 방향으로 갈 때 즉시 중단하고 재지시
- **Escape + Memories** — 반복되는 실수를 영구적으로 교정
- **/clear** — 대화 컨텍스트 초기화 (다른 작업 시작 시)
- **/compact** — 긴 대화를 요약하여 컨텍스트 윈도우 확보
- **새 대화 시작** — 관련 없는 작업은 새 세션에서

**활용 포인트:** 컨텍스트 관리의 핵심은 "적절한 정보를 적절한 시점에"이다. 많이 주는 게 좋은 게 아니다. CLAUDE.md로 기본 컨텍스트를 깔고, 나머지는 상황에 맞게 추가/제거하는 흐름을 만들어라.


## Part 3: 확장과 커스터마이징

### Custom Commands — 반복 작업 자동화

`.claude/commands/` 폴더에 마크다운 파일을 만들면 커스텀 명령어가 된다. 예를 들어 `audit.md`를 만들면 `/audit`으로 실행 가능. 의존성 취약점 검사, 업데이트, 테스트 실행을 한 번의 명령으로 자동화할 수 있다. 명령어 추가 후 Claude Code를 재시작해야 적용된다.

### MCP Servers — 새로운 능력 추가

MCP(Model Context Protocol) 서버는 Claude Code에 새로운 도구를 추가하는 방법이다.

```
claude mcp add playwright -- npx @anthropic/playwright-mcp
```

이 한 줄로 Claude Code가 브라우저를 제어할 수 있게 된다. 스크린샷 찍기, 요소 클릭, 페이지 탐색 등. settings.local.json의 "allow" 배열에서 자동 권한 승인 설정 가능. MCP 레지스트리에서 다양한 서버를 탐색할 수 있다.

### GitHub Integration — CI/CD 수준의 자동화

`/install-github-app`으로 설치. 두 가지 GitHub Action이 추가된다:

1. **@Claude 멘션** — 이슈나 PR에서 @Claude를 태그하면 Claude가 작업을 수행한다. 이슈에 @Claude를 달면 브랜치를 만들고, 코드를 수정하고, PR을 제출하는 것까지 자동으로 해준다.
2. **자동 PR 리뷰** — PR이 생성될 때마다 Claude가 자동으로 코드 리뷰.

둘 다 커스터마이징 가능하고, 라벨 기반 트리거, 스케줄 작업 등 추가 이벤트에 반응하도록 확장할 수 있다.

**활용 포인트:** GitHub Integration은 Claude Code를 "개인 도구"에서 "팀 자동화 인프라"로 확장하는 지점이다. 반복적인 리뷰, 이슈 처리, 의존성 관리를 자동화할 수 있다.


## Part 4: Hooks — 진짜 파워 유저의 영역

Hooks는 Claude가 도구를 사용하기 전/후에 커스텀 스크립트를 실행하는 기능이다. 이게 왜 강력하냐면, Claude의 행동을 프로그래밍적으로 제어할 수 있기 때문이다.

### Hook의 두 가지 타입

| 타입 | 실행 시점 | 주요 용도 |
|------|----------|-----------|
| **PreToolUse** | 도구 실행 전 | 특정 파일 접근 차단, 보안 검증 |
| **PostToolUse** | 도구 실행 후 | 자동 빌드, 자동 포매팅, 테스트 실행 |

### 설정 방법

settings.local.json에서 설정한다:
- **matcher**: 감시할 도구 이름 (예: "Read|Grep")
- **command**: 실행할 스크립트의 절대 경로

스크립트는 stdin으로 도구 호출 정보(JSON)를 받고, stdout으로 제어 명령을 반환한다.

### 실전 Hook 예시

**1. .env 파일 보호 Hook (PreToolUse)**
Claude가 Read나 Grep 도구로 .env 파일에 접근하려고 하면 자동 차단. `{"decision":"block","reason":"Sensitive file"}`을 반환.

**2. Auto-Build Hook (PostToolUse)**
파일 쓰기 후 자동으로 TypeScript 컴파일러 실행. 빌드 에러가 나면 에러 메시지가 Claude에게 전달되고, Claude가 자동으로 수정 → 다시 빌드. 이 피드백 루프가 핵심이다.

**3. SQL Query Review Hook (PreToolUse + SDK)**
SQL 관련 도구 실행 전에, 해당 쿼리를 별도의 Claude 인스턴스에 보내서 보안 검토. DROP TABLE 같은 위험한 쿼리는 자동 차단. **Hooks + SDK의 조합**으로 만든 가장 인상적인 예시.

### 추가 Hook 타입들

PreToolUse/PostToolUse 외에도 다양한 Hook이 있다: Notification, Stop, SubagentStop, PreCompact, UserPromptSubmit, SessionStart, SessionEnd. 각 Hook 타입마다 stdin으로 받는 데이터 형식이 다르다는 점 주의.

### 보안 주의사항

Hook 스크립트에는 **절대 경로를 사용**해야 한다. 상대 경로는 경로 가로채기(path interception) 공격에 취약하다. 팀 공유 시 settings.example.json에 $PWD 플레이스홀더를 쓰고, 셋업 스크립트로 실제 경로를 생성하는 패턴을 권장.


## Part 5: Claude Code SDK — 파이프라인에 지능을 끼워넣기

SDK는 Claude Code를 프로그래밍적으로 사용할 수 있게 해준다. CLI, TypeScript, Python 라이브러리로 제공.

핵심은 **Claude Code의 모든 도구를 그대로 사용**할 수 있다는 것이다. 파일 읽기, 코드 검색, 커맨드 실행 등. 이걸 기존 워크플로우의 일부로 끼워넣을 수 있다.

예시: TypeScript SDK로 프로젝트 내 중복 SQL 쿼리를 찾는 스크립트. conversation 배열에 메시지를 보내고, 스트리밍으로 응답을 받는 구조.

**활용 포인트:** SDK는 "Claude를 한 번 쓰고 끝"이 아니라 "Claude를 자동화 파이프라인에 통합"하는 도구다. Hook과 결합하면 Claude가 스스로를 감시하는 구조도 만들 수 있다.


## 정리: Claude Code 활용의 3단계

| 단계 | 무엇을 하나 | 핵심 도구 |
|------|------------|-----------|
| **1. 기본 사용** | 프로젝트에서 Claude Code 실행, 질문/작업 지시 | CLAUDE.md, @-mention, 스크린샷 |
| **2. 커스터마이징** | 반복 작업 자동화, 새 도구 추가 | Custom Commands, MCP Servers |
| **3. 자동화/통합** | CI/CD 연동, 프로그래밍적 사용, 행동 제어 | GitHub Integration, Hooks, SDK |

대부분의 사람들이 1단계에서 멈추는데, 실제 생산성 차이는 2~3단계에서 발생한다. CLAUDE.md를 제대로 세팅하는 것만으로도 큰 차이가 나고, Hooks로 피드백 루프를 만들면 Claude가 스스로 실수를 잡고 고치는 수준까지 간다.

Stephen Grider의 마지막 조언 세 가지: **(1) 새 기능을 계속 주시하라** — Claude Code는 빠르게 변하고 있다. **(2) 실험하라** — Custom Commands, MCP 서버, CLAUDE.md 설정을 직접 시도해봐라. **(3) 자동화하라** — GitHub Integration으로 반복 작업을 Claude에게 위임하라.

---

*이 문서는 Anthropic Academy "Claude Code in Action" 코스의 19개 레슨 비디오 자막 및 텍스트를 기반으로 정리되었습니다.*
