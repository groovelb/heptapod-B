# Subagent Reference

Subagent 생성에 적용하는 룰북. 파일을 쓰기 전에 이 문서를 읽고 그대로 따른다.

## description 작성 규칙

description은 메타데이터가 아니라 *라우팅 함수*다. Claude가 이 텍스트를 읽고 자동 위임 여부를 결정한다. 그 목적에 맞게 최적화한다.

**기본 패턴**: `<역할 명사 문장>. <트리거 조건>. <도메인 키워드>.`

좋은 예:
> Reviews Python code for type safety, error handling, and PEP 8 violations. Use PROACTIVELY immediately after the user edits any `.py` file. MUST BE USED before commits.

나쁜 예:
> I help with Python code reviews when needed.

### 가중치 표현(영어 키워드 유지)

다음 표현은 자동 위임 가중치를 실질적으로 높인다. 한국어 번역 말고 영어 그대로 박는다.

- `Use PROACTIVELY ...`
- `MUST BE USED when ...`
- `Automatically invoke after ...`
- `Invoke immediately after ...`

### 피해야 할 표현

- 1인칭("I review...")
- 헤징("can sometimes help with...")
- 트리거 없는 능력 나열("does X, Y, Z")
- 너무 일반적인 단어("helps with code", "general purpose")

### 도메인 키워드

description에 구체적 기술/맥락 단어를 2개 이상 넣는다. "TypeScript", "SQL migration", "React hook", "Stripe webhook" 같은. 추상어("코드", "파일")만 있으면 라우팅 정확도가 떨어진다.

## 도구 최소권한 매트릭스

에이전트 모양별 기본 도구 세트. 이보다 넓히지 말 것. 더 필요하면 사용자에게 한 번 더 확인.

| Agent shape    | Default tools                 | Add only if needed             |
|----------------|-------------------------------|--------------------------------|
| reviewer       | Read, Grep, Glob              | (없음)                         |
| analyzer       | Read, Grep, Glob, Bash        | WebFetch                       |
| mutator        | Read, Edit, Write, Grep, Glob | Bash(검증 실행이 필요할 때)    |
| runner         | Read, Bash                    | Edit(패치형 작업일 때만)       |
| doc-writer     | Read, Write, Edit, Grep, Glob | (없음)                         |

`tools` 필드를 생략하면 메인 세션의 모든 도구를 상속한다. 편하지만 subagent의 집중도 이점을 깎는다. 항상 명시할 것.

## 모델 선택 휴리스틱

| 작업 모양                                    | 모델     |
|----------------------------------------------|----------|
| 짧은 정형 출력(린트, 포맷 체크, 단순 분류)   | haiku    |
| 표준 리뷰, 리팩터, 문서 생성                 | sonnet   |
| 다단계 디버그, 아키텍처 분석, 깊은 추론      | opus     |
| 메인 세션 모델과 일치시키고 싶을 때          | inherit  |

비용/지연 vs 품질의 트레이드오프. 명확히 가벼우면 haiku, 명확히 무거우면 opus, 애매하면 sonnet.

## 본문 스켈레톤(필수 6 섹션)

```
You are a <specialist> for <scope>.

## When invoked
- <조건 1>
- <조건 2>
- <조건 3>

## Procedure
1. <단계>
2. <단계>
3. <단계>

## Checklist before finishing
- [ ] <기준>
- [ ] <기준>

## Do not
- <out-of-scope 동작>
- <위험한 동작>

## Output format
<응답 구조 명시>
```

각 섹션의 의도:

**Role line**: 한 문장으로 정체성과 스코프 정의. "You are a senior code reviewer for TypeScript projects." 처럼 *역할*과 *범위*를 함께 박는다.

**When invoked**: description의 트리거를 더 자세히 풀어쓴다. description은 라우팅용 압축본, 이 섹션은 에이전트 자신이 읽는 상세본.

**Procedure**: 매번 따르는 표준 절차. 변동 단계가 있으면 분기를 명시. 너무 짧으면(2단계 이하) 절차화의 의미가 없으니 다른 섹션을 두텁게.

**Checklist before finishing**: 완료를 선언하기 전 확인할 항목. 빠뜨리기 쉬운 검증을 여기 박는다.

**Do not**: 가장 강력한 섹션. 에이전트가 표류하지 않게 잡아주는 가드레일. 최소 1개는 명시.

**Output format**: 메인 세션이 받을 응답의 구조. Markdown 헤더, JSON 스키마, 표 양식 등 구체적으로. 이게 빠지면 호출 후 후속 질문이 한 번 더 든다.

## Validation checklist

파일을 쓰기 전에 항목별로 점검한다. 하나라도 실패하면 수정 후 재점검.

- [ ] `name`이 소문자, 하이픈 구분, 역할 명사
- [ ] `description`이 3인칭이고 명시적 트리거 표현 포함
- [ ] `description`에 도메인 키워드 2개 이상
- [ ] `tools`가 최소권한 세트(이 매트릭스 기준)
- [ ] 본문에 6개 필수 섹션 모두 존재
- [ ] "Do not"에 최소 1개 항목
- [ ] "Output format"이 구체적(불릿/JSON/표 양식 등)
- [ ] 파일 경로가 의도와 일치(.claude/agents/ vs ~/.claude/agents/)
- [ ] 단일 책임(여러 작업이 섞이지 않음)

## 자주 하는 실수

**description 비대화**. 3문장이 상한이다. 3문장에 트리거와 스코프가 안 들어가면 에이전트가 너무 넓은 것이고, 분리해야 한다.

**도구 과다 부여**. 필드를 생략해서 모든 도구 상속받게 두는 편의 추구. subagent의 집중 이점을 망친다. 항상 명시.

**Output format 누락**. 없으면 호출자가 응답 구조를 다시 물어야 한다. subagent의 지연 이점이 사라진다.

**재귀 가정**. subagent가 다른 subagent를 호출하게 설계하지 말 것. 오케스트레이션은 메인 세션의 일이다.

**컨텍스트 가정**. subagent는 매번 fresh context로 시작한다. 메인이 알고 있는 정보가 자동 전달되지 않는다. 본문 시스템 프롬프트로 *불변 맥락*을 박고, 가변 맥락은 호출 시점에 명시 전달되게 설계한다.
