---
name: project-planning
description: Creates structured planning documents (01-project-summary, 02-ux-flow, 03-visual-direction) in docs/{project}/ with a shared skeleton, a per-section status block (확정/잠정/미정), and hard gates that allow provisional approval so work can continue before every section is final.
when_to_use: When user explicitly invokes /project-planning. Do not auto-activate. Wait for direct user invocation.
user-invocable: true
disable-model-invocation: true
---

# Project Planning Skill

> 기획 문서 3종(01-project-summary, 02-ux-flow, 03-visual-direction)을 `docs/{project}/`에 작성한다.
> 문서 포맷의 단일 기준은 `resources/doc-templates.md`다. 이 파일은 절차와 가드레일만 다룬다.

## 활성화 조건

| 의도 | 트리거 예시 |
|------|-----------|
| 기획 시작 | "기획 문서 작성해줘", "프로젝트 계획", "새 기능 기획" |
| 개별 문서 | "project-summary 작성", "ux-flow 만들어줘", "visual-direction" |
| 이어서 작성 | "다음 단계 진행해줘", "ux-flow 이어서" |
| 앞 문서 수정 | "대상 이름 바꿔줘", "과업 하나 추가", "01 고쳐줘" |

---

## 시작 절차 (모든 호출 공통)

1. `docs/{project}/`를 확인한다. 문서가 있으면 각 문서 상단 결정 현황 블록을 읽는다.
2. 현재 위치를 3줄로 보고한다: 어느 문서가 어떤 상태인지, 미정 항목 수, 다음에 할 일.
3. 진입 모드를 고른다.

| 모드 | 조건 | 동작 |
|---|---|---|
| 신규 | `docs/{project}/` 없음 | 01부터 시작 |
| 이어서 | 상류 문서가 잠정 승인 이상 | 다음 문서 작성 |
| 개별 | 특정 문서만 요청 | 상류 하드 게이트 확인. 미충족이면 빠진 항목을 표로 보여주고 멈춘다 |
| 역류 | 하류 작업 중 상류 변경 필요 | 아래 "역류 절차" |

4. `resources/doc-templates.md`의 0장 공통 규칙과 해당 문서 템플릿을 Read한다.
5. 프로젝트에 `.storybook/`이 있으면 `src/stories/overview/`의 문서 MDX 래퍼를 확인한다. 없으면 템플릿 0.6대로 만든다(원본 raw import + `EditorialDocument`). 본문이 복사돼 있으면 래퍼로 바꾼다. 문서를 고친 뒤 스토리북 사본을 남기지 않는다.

---

## 문서별 절차

### 01 project-summary

1. 질문은 최대 4개(목적, 사용자, 다루는 것, 과업). 초안을 먼저 쓰고 "확인 포인트"로 묻는 방식을 권장한다.
2. 템플릿 1절 기준으로 `docs/{project}/01-project-summary.md` 작성.
3. 금지 목록(화면 이름, 컴포넌트명, 색상값, 레이아웃 패턴, 연출, 구현 상태) 자가 점검. 걸리는 내용은 버리지 않고 결정 현황 블록 비고에 "02 4절 후보" 또는 "03 1절 후보"로 메모.
4. 하드 게이트 체크리스트를 출력하고 승인을 묻는다(확정 승인 또는 잠정 승인).

### 02 ux-flow

1. 01 4절(사용자·대상)와 5절(과업)를 Read. 확정·잠정 항목만 인용하고 미정은 인용하지 않는다.
2. `component-work/resources/components.md`와 `taxonomy-index.md`를 Read(재활용 확인, 카테고리 매핑).
3. 템플릿 2절 기준으로 `docs/{project}/02-ux-flow.md` 작성. 과업 1개가 시나리오 1개, 같은 번호. 대상 이름은 01 글자 그대로.
4. 3.2절 이름 사전 작성 시 `resources/sql-reserved-words.md`와 대조. 충돌이면 이름을 바꾸지 말고 예상 테이블명만 바꾸거나 사용자에게 묻는다.
5. 정합성 점검(템플릿 5장): 이름 일치, 과업 수 = 시나리오 수, 단계 표의 화면이 2.1절에 전부.
6. 하드 게이트 체크리스트 출력, 승인.

### 03 visual-direction

1. 01 3절(정체성), 02 2.1절(페이지)·4절(인터랙션 원칙)를 Read.
2. `component-work/resources/mui-theme.md`를 Read(현재 토큰값).
3. 템플릿 3절 기준으로 `docs/{project}/03-visual-direction.md` 작성.
   - 2절 아키타입은 `src/data/layoutTaxonomyData.js`의 id만 쓴다.
   - 4절 이미지·에셋 방향은 FORMAT / LOOK / SUBJECT 구조. LOOK 키워드는 1~2개. 해당 없으면 "해당 없음: {이유}".
   - 레퍼런스는 사용자 제공만. 임의 URL·경로 금지.
4. 정합성 점검: 02 2.1절 페이지가 2절 표에 전부.
5. 하드 게이트 체크리스트 출력, 승인.

---

## 가드레일

### 완료도 3단계

모든 문서는 상단 결정 현황 블록에 섹션별 상태를 적는다.

| 값 | 뜻 | 하류에서의 취급 |
|---|---|---|
| 확정 | 승인됐고 바뀔 계획 없음 | 그대로 인용 |
| 잠정 | 채웠지만 승인 전 또는 변경 가능 | 인용하되 `(잠정)` 표기 |
| 미정 | 내용 없음 또는 결정 대기. 비고에 이유와 질문 번호 | 인용 금지 |

### 승인 두 종류

- **초안은 잠정·미정만.** AI가 쓴 초안에 확정은 없다. 확정은 사용자의 승인 답에서만 생긴다.
- **확정 승인**: 모든 섹션 확정.
- **잠정 승인**: 하드 게이트(템플릿 4장)만 충족. 나머지는 잠정·미정.
- 잠정 승인으로도 다음 문서를 시작할 수 있다. 승인 요청 시 게이트 항목의 충족 여부를 표로 보여준다.
- 사용자가 "100% 완성 후 진행"을 원하면 확정 승인만 인정한다.

### 미정 의존 금지

- 하류 문서는 상류의 미정 항목을 인용하지 않는다.
- 필요하면 하류 작성을 멈추지 말고 해당 셀을 미정으로 두고 상류 질문을 하나 만든다.
- 상류가 확정되면 하류의 `(잠정)` 표기와 미정 셀을 갱신한다.

### 역류 절차

하류 작업 중 상류를 바꿔야 할 때:

1. 상류 문서의 해당 섹션을 수정하고 상태를 잠정으로 내린다.
2. 상류 결정 현황 블록의 개정 줄을 갱신한다.
3. 하류 문서에서 영향받는 섹션을 잠정으로 내리고 비고에 "상류 n절 변경"을 적는다.

사용자에게는 이 형식으로 알린다.

```
상류 갱신 필요
- 발견: {무엇이 필요한가}
- 영향: {상류 문서 n절, 하류 문서 m절}
- 다음 행동: {상류 수정 → 하류 갱신}
```

### 질문 예산

- 문서 하나를 시작할 때 질문은 최대 4개.
- 답이 없는 질문은 미정으로 기록하고 진행한다. 다시 묻지 않는다.
- 문서에 없는 판단이 필요하면 임의로 채우지 않고 미정 + 질문으로 남긴다.

### 분량과 부록

- 권장 상한: 01 120줄, 02 250줄, 03 200줄 (구분선·비고 목록 포함).
- 넘으면 자르지 않는다. 구현 디테일(SQL, 좌표계, 프롬프트 전문)을 `appendix-{주제}.md`로 분리하자고 제안한다.

---

## Resources

| 파일 | 용도 | 언제 Read |
|------|------|----------|
| `resources/doc-templates.md` | 공통 규칙, 템플릿 3종, 하드 게이트, 정합성 점검 | 시작 절차 4단계, 각 문서 작성 시 |
| `resources/sql-reserved-words.md` | 02 3.2절 예상 테이블명 충돌 검사 | 02 작성 시 |

### 참조하는 외부 리소스 (복제하지 않음)

| 파일 | 위치 | 언제 Read |
|------|------|----------|
| `components.md` | `.claude/skills/component-work/resources/` | 02 (재활용 확인) |
| `taxonomy-index.md` | `.claude/skills/component-work/resources/` | 02 (신규 카테고리) |
| `mui-theme.md` | `.claude/skills/component-work/resources/` | 03 (현재 토큰) |
| `layoutTaxonomyData.js` | `src/data/` | 03 2절 (아키타입 id) |

### 산출물을 읽는 스킬

| 스킬 | 읽는 섹션 |
|---|---|
| `/supabase-integration` | 02 3.2절 데이터 모델 활용(사전), 2.1절 페이지 리스트, 1절 UX-flow 단계 표, 5절 컴포넌트 리스트 |
| `/visual-asset-prompt` | 03 4절 이미지·에셋 방향(FORMAT / LOOK / SUBJECT), 4.1절 레퍼런스 |
| `/layout-composer` | 03 2절 레이아웃 전략(아키타입, 콘텐츠 신호 4축) |
| `/component-work` | 02 5절, 03 3절·5절 |

---

## 핵심 원칙

- **포맷은 템플릿이 기준.** 섹션 번호·제목을 바꾸지 않는다. 덧붙일 것은 H3 또는 부록으로.
- **이름은 01에서 한 번만 짓는다.** 02·03은 글자 단위로 그대로 쓴다.
- **표 우선, 한 셀 한 사실.** 산문은 01 2절·3절에만.
- **렌더링 가독성(템플릿 0.4).** 표는 열 5개 이하, 셀 45자 이내. 모든 H2 앞에 `---`. 상태는 컬럼이 아니라 셀 끝 `(잠정)` 표기.
- **다이어그램 금지.** Mermaid를 쓰지 않는다. 흐름은 단계 표, 계층은 코드 블록 트리.
- **기존 컴포넌트 재활용 우선.** 02 5절에서 `components.md`를 먼저 확인.
- **레퍼런스는 사용자 제공.** URL·경로를 만들지 않는다.
- **em dash 금지.** 콜론, 쉼표, 괄호로 푼다.
- **판단이 필요한 빈칸은 미정으로.** 임의로 채우지 않는다.
- **스토리북 노출은 원본 참조로.** Docs 페이지(MDX)에 문서 내용을 복사하지 않는다. `import doc from '.../docs/{project}/01-project-summary.md?raw'` 뒤 `<EditorialDocument source={doc} />`(`src/components/storybookDocumentation/`)로 원본을 브랜드 테마로 그린다. 사본이 있으면 docs/ 수정이 스토리북에 반영되지 않고, MDX는 GFM 표를 파싱하지 못한다.
