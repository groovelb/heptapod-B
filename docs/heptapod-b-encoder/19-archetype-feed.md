# 표식 유형 피드 · 실행 계약

## 목표와 범위

2026-09-06 사용자 승인: 기존 메타 정렬 탭 대신 기본 계열 3개 × 동시성/여백/잔향의 8조합을 고유한 유형명·서사·상징으로 표현한다. 계열 선택 → 실제 구성원이 있는 유형의 세로 피드 → 개인 확대. 유형 선택용 중간 depth나 매트릭스 표 UI는 만들지 않는다.

- 24개는 사전 정의한 해석 카탈로그다. 모든 이름 인코더가 모든 유형에 도달한다거나 현재 표본에 24개가 존재한다고 주장하지 않는다.
- 사람의 성격/어원/관계를 추정하지 않는다. 기존 model_data 판독의 정확한 meaningKey에만 유형을 연결한다. 의미/형태 버전과 분류 임계값은 바꾸지 않는다.
- 실제 구성원은 하나의 정확한 유형에 한 번만 배치한다. partial/invalid는 false로 바꾸거나 유형을 강제하지 않고 원래 범위의 실제 표식으로 남긴다. 삭제된 미판독 메뉴·관측 Drawer·내 응답 화면을 복원하지 않는다.
- 유형 상징은 저작된 표시 모델이며 사람의 표식/평균/공개 데이터가 아니다. 각 상징을 기존 판독기로 검증한다.
- 랜딩 → /canvas → /archive, 우상단 고정 메타데이터·3액션, 초록 분석 라인·스캔·비프, Canvas 형성·Lenis를 보존한다.
- DB/API 쓰기·배포·commit·새 의존성·브라우저/Playwright 자동화는 하지 않는다.

## 병렬 실행 설계

Artifact sharding + 읽기 전용 공유 경로 조사. 유효 동시성 4(root 포함). 완료된 이전 작업은 재실행하지 않는다.

| ID | 소유자 | 쓰기 범위 | 의존성·산출물 | 합류 검증 |
|---|---|---|---|---|
| A | 유형 데이터 worker | 새 heptapodArchetypeCatalog, archiveArchetypeSymbols, locales/archetypes, buildArchiveArchetypeFeed, test-archive-archetypes | 아래 인터페이스 → B와 root가 소비 | 24개 키·상징 재판독·소속·버전·불변성 |
| B | Archive UI worker | ArchiveDepthExplorer와 story, 새 ArchiveArchetypeFeed와 story | 아래 인터페이스로 작성, A 합류 후 실행 검증 | 탭/빈 유형 없음, 실제 구성원·Dialog·Canvas 유지 |
| C | 공유 경로 explorer | 없음 | 현재 공유 소비자/이미지 경로 → root 보고 | 수정 지점·기존 계약·테스트 제시 |
| R | root | 나머지 통합 파일·공유·분석·ko/en 등록·문서·기존 회귀 테스트 | A/B/C 합류 | Node/메모리 DOM/SSR, lint, 앱·Storybook build |

순서: 공통 계약 고정 → A/B/C 병렬 + root 분석/페이지 연결 → 결과 확인 → 통합 검증. 동일 파일은 한 명만 수정한다. 실패한 분기는 안전한 산출물을 인계하고 root가 순차 완료한다. 실패를 가짜 데이터나 UI 숨김으로 대체하지 않는다.

## 고정 인터페이스

`src/data/heptapodArchetypeCatalog.js`

- `ARCHETYPE_CATALOG`: 기존 meaningKey를 키로 하는 24개 객체.
- 항목 `{ id, meaningKey, meaningVersion, narrativeVersion, familyId, modifierIds, title, reading, order }`.
- title/reading은 프로젝트 sourceText 방식으로 한영 localize 가능. sourceText 메시지는 별도 순수 `src/i18n/locales/archetypes.js`의 `archetypeKo`, `archetypeEn`에 저장하고 root가 기존 ko/en 사전에 등록한다.
- `getGlyphArchetype(interpretation)`은 지원 버전·complete·유효 기본 계열·boolean 3개·일치 meaningKey를 확인하고 카탈로그 객체 또는 null을 반환한다. 이름을 입력받지 않는다.

`src/data/archiveArchetypeSymbols.js`

- `getArchiveArchetypeSymbol(meaningKey)` → `{ model }` 또는 null. 기존 렌더러/판독기에 맞는 안정적인 저작 모델. 공개 UUID/소유자/동의 없음.

`src/utils/heptapod/buildArchiveArchetypeFeed.js`

- `buildArchiveArchetypeFeed(glyphs, meanings)`는 기존 scope에서 걸러진 공개 glyph 배열과 동일 판독 DTO를 소비한다. 새 판독/새 관계 계산 없음.
- 반환 `{ sections, untypedGlyphs, glyphs }`.
- section `{ id, archetype, glyphs }`, 비어 있지 않은 정확한 유형만 카탈로그 순서로 나열. 각 유형 안은 안정적 ID 순서.
- glyphs는 sections의 실제 구성원 + untypedGlyphs 순서다. 원본 glyph 참조를 유지한다. 개인 Dialog 전후 이동은 후속 요청으로 제거했다.

## 통합 책임

분석의 GlyphMeaningSummary reading 헤더와 Archive 피드/개인 확대는 동일 카탈로그를 읽는다. 원래 의미 선택·정의·관측 근거·anchors는 남긴다. 공유는 공개 UUID와 같은 유형명·서사를 사용하되 기존 정밀 비교/OG 계약과 혼합하지 않는다. 기존 group/AND/status 링크의 실제 범위는 보존하며 meta는 새 UI에 노출하거나 생성하지 않는다.

## 검증 상태

2026-09-06: A/B 구현과 C 공유 경로 조사를 합류하고 root 통합을 완료했다.

- `ArchiveArchetypeFeed`는 상징·유형명·짧은 서사 아래 실제 구성원을 모바일 2열/데스크톱 3열로 표시한다. 빈 유형과 메타 탭은 없고, 미확인 표식은 유형을 강제하지 않는다.
- 표식 이름은 목록부터 실제 원 중앙에 크게 표시한다. 선택 시 목록 대신 `ArchiveSelectedGlyph` 상세 화면을 보여준다. 원본 표식·이름 → 분석 on/off → 같은 정확한 유형의 다른 표식 → 공통 의미별 원본 부위 그리드 순서다. 분석에는 실제 초록 mesh·스캔과 선택한 관측의 좌표 강조가 연결된다. 그리드는 선택 표식과 최대 두 구성원의 모델을 재생성하지 않고 관측 좌표의 Canvas 부분만 드러낸다. 모든 다른 구성원은 위 목록에 표시하며 singleton/미확인 유형에는 공통성을 만들지 않는다. 모달·Next/Compare는 없다.
- 분석 reading·Archive 피드/개인 확대·공유 상세·단일 네이티브 공유 제목/본문이 같은 유형 카탈로그를 읽는다. 기존 의미 선택·형태 근거·anchors·초록 분석 라인·스캔·비프와 우상단 고정 메타데이터/3액션은 유지했다.
- 새 Archive URL은 meta를 생성하지 않는다. 기존 group/AND/status 필터 및 공개 UUID 범위는 유지한다. 목록은 상세에서 hidden/inert로 보이지도 조작되지도 않지만 마운트는 유지한다. 목록/개인 URL별 Lenis 스크롤을 따로 저장하며 상세 첫 진입은 상단, Back은 기존 목록 위치와 구성원 포커스로 복귀한다. 시간순 상세는 200개 표본에 잘리지 않도록 로드한 공개 모델 전체를 같은 판독기로 읽는다. 공용 AppGNB·전역 Lenis 수명을 바꾸지 않는다.
- DB/분류 임계값/meaning v1/provider 계약 변경 없음. 로컬 판독 DTO를 화면용 피드로 투영하므로 추후 동일 DTO API 주입 경계를 유지한다.
- 공유 문구만 유형 카탈로그와 연결했다. 기존 UUID/정밀 비교/OG 이미지·PNG 계약은 보존하며, 유형명이 들어간 새 공유 이미지 제작이나 OG 서버 배포를 완료한 것은 아니다.

검증 결과:

- 선택 상세 후속 수정: 메모리 DOM 91개(중앙 이름·상세/목록 전환·실제 분석 선택·singleton·시간순 구성원·스크롤/포커스 복원), 의미/화면 SSR 362개(200번째 이후 시간순 표식·원본 부위 mask 포함), 한영 1738개, 공용 탐색 37개, 모션 7개 통과. 변경 컴포넌트 ESLint·앱/Storybook 빌드 통과. 아래 수치는 이전 유형 피드 통합 당시 결과다. 실제 브라우저 픽셀 검증은 하지 않았다.
- `pnpm run test:archetypes`: 유형 도메인 8개, 단일 공유 456개, 의미/피드 SSR 297개, Archive 메모리 DOM 47개, 결과 화면 메모리 DOM 148개 검사 통과.
- 24개 저작 상징을 기존 판독기로 재판독하여 정확한 의미 키를 확인했다. 모든 유형의 피드/분석 제목·서사가 일치하고 상징이 구성원 수에 들어가지 않는지 검사했다. 합성 테스트 모델은 공개 이름 표본이나 인코더 도달성 증거가 아니다.
- 기존 의미/데이터/필터/깊이/URL/상징/공유/통합 8개 스크립트의 Node 테스트 88개 통과. 기존 Archive UI 79개·meaning reading 241개 통과.
- 한영 문구/상태 1661+21개, Canvas 라우트 75개·히어로 67개·모션 7개 통과.
- 변경 JS/JSX 범위 ESLint·`git diff --check`·앱 빌드·Storybook 빌드 통과.
- 기존 큰 청크·baseline-browser-mapping·Storybook @mui/icons-material 경고와 히어로 ScrambleCaption의 렌더 중 state 갱신 경고는 남아 있다. `check-agent-rules` 스크립트는 저장소에 없다.
- 브라우저/Playwright를 실행하지 않았다. 메모리 DOM의 노드·상태·스크롤 호출 보존 검증이며 실제 픽셀/포커스/스크롤 체감 확인은 별도 요청 대상이다. 실제 공개·DB 쓰기·배포·commit은 수행하지 않았다.


## Narrative v2 콘텐츠 확장 · 2026-09-07

기존 24개 유형명·meaning-v1 키·분류 계약을 유지하고 narrativeVersion만 2로 올렸다. 카탈로그는 한 줄 reading 외에 story, traits[3], moments[2], tension, question, motto, distinction, relations[2]를 제공한다. relations는 편집용 상대 유형 키와 서사이며 공명/궁합 점수가 아니다. 피드·단일 공유는 reading을 사용하고 기존 상세·분석 설명은 story를 사용한다. 추가 화면 영역은 만들지 않았다.

한영 전체 원고는 [서사 사전](24-archetype-narrative-dictionary.md), 60쌍의 차이와 이전 문구는 [편집 검토](25-archetype-narrative-review.md), 검사 결과는 [실행 기록](23-archetype-storytelling-plan.md)에 있다.


## JSON 배포와 Archive 설명 확장 · Narrative v3 · 2026-09-07

원고의 단일 배포 원본은 `src/data/archetypeNarratives.json`이다. `narrativeVersion`, `families`(도래·수용·상호성 각각 ko/en의 title·reading·story), `types`(24개 정확한 조합 각각 ko/en의 전체 원고와 composition)를 포함한다. 기존 JS 원고 파일을 제거했고 locale adapter와 카탈로그가 JSON을 직접 import한다. 수정한 JSON은 Vite 빌드에 포함되어 앱과 함께 배포되며 Markdown이나 DB에서 원고를 읽지 않는다.

- 군집 선택: 각 원 아래 `families[id].reading` 대표 설명.
- 군집 내부 / 정확한 유형 링크: 상위 `families[id].story` 다음에 각 유형의 `composition`과 `story`.
- Archive 개인 상세 / Create 분석 초기 화면: 군집 → 조합 → 서사 → 특징·상황·긴장·질문·관계·차이·한마디. 기존 분석의 관측 선택 중에는 조합·서사와 해당 형태 근거를 읽는다.
- 시간순 목록과 부분 판독에는 임의의 유형 설명을 붙이지 않는다. 시간순에서 완전 판독된 개인 상세를 열면 같은 JSON 설명을 사용한다.
- 상위 군집 설명은 전체 군집의 공통 방향이다. composition은 단일 속성 문장을 이어 붙이지 않고 24조합별로 작성했다. 기본형도 별도 설명을 가진다.
- `ArchetypeNarrative`를 재사용하며 분석 버튼은 장문 앞에 유지한다. 분류·UUID·DB·소셜 공유 계약은 동일하다.

검증: 유형/서사 도메인 8+4개, 공유 456개, 한영 의미/상세 SSR 2,042개, Archive 상태 94개, 피드 인덱스 39개, 인코더 결과 175개, locale 2,402+21개, 의미 읽기 241개 검사 통과. 변경 파일 ESLint 및 프로덕션 빌드 통과. 기존 500 kB 청크 경고는 남아 있다. 브라우저 자동화 없이 검증했으며 픽셀 배치 검증은 하지 않았다. 저장소에는 `check-agent-rules` 스크립트가 없어 해당 검사는 실행할 수 없다.


## 참여자의 이름과 일상으로 다시 쓴 원고 · Narrative v4 · 2026-09-07

`src/data/archetypeNarratives.json`의 3개 군집과 24유형의 한영 원고를 전면 수정했다. 중심 질문은 “이 언어에서 내 이름은 무슨 뜻이며 어떤 사람으로 읽히는가?”다. reading은 이름의 뜻을 직접 답하고, story는 그 이름이 그리는 사람을 인사·안부·일·친구와의 대화 같은 구체적인 장면으로 설명한다. 특징·일상 사례·놓치기 쉬운 점·질문·유형 관계·차이·한마디도 같은 인물상에 맞췄다. 형태에서 실제 성격을 검증한 결과가 아니라 세계관 안에서 이름에 붙이는 상상적 해석이다.

- 첫 신호: 먼저 말을 건네는 사람. 어색한 자리의 첫 인사, 미뤄진 일의 작은 시작.
- 기억의 보관자: 작게 건넨 말도 기억해주는 사람. 중요한 날을 기억하고 먼저 결과를 물어주는 안부.
- 경계의 가교: 다른 생각 사이에서 통하는 말을 찾는 사람. 의견이 갈릴 때 각자가 걱정하는 점을 풀어주는 대화.
- 끝과 시작의 매개자: 함께한 끝에서 다음 시작을 찾는 사람. 프로젝트가 끝난 뒤 서로 남은 마음과 다음에 해보고 싶은 일을 나누는 장면.

Create 분석과 Archive 개인 상세는 이름의 뜻을 첫 문장에 표시한다. `ArchetypeNarrative.showIdentity`는 기본 true이며, 이미 제목 아래 reading을 표시하는 피드는 false로 중복을 피한다. 분류·유형명·JSON 구조·실제 DB 소속은 유지한다. 핵심 서사는 한국어 194~223자로 구체적인 행동과 관계를 담는다.

검증: 기존 24개 유형명 및 판독 계약, 한영 JSON 필드와 관계 대상, 의미/상세 SSR 2,234개 검사(이름의 뜻이 군집 설명보다 먼저 출력되는지 포함), 공유 456개, locale 2,402+21개 검사 통과. 변경한 코드 ESLint 및 앱 빌드 통과. 브라우저 자동화는 사용하지 않았다. 실제 사용자 반응을 측정한 결과는 아니다.


## 읽기 중심 에디토리얼 타이포 · 2026-09-07

Archive 군집 소개·유형 피드·개인 상세와 Create 분석은 `src/styles/tokens/editorial.js`의 시맨틱 역할을 사용한다. 기본 테마가 `theme.typography`와 `theme.editorial`로 제공하며 컴포넌트는 역할 이름으로 소비한다. 크기는 rem, 데스크톱 전환은 기존 md breakpoint, 여백은 MUI spacing 단위를 사용한다.

| 역할 | 모바일 / 데스크톱 (기본 루트 16px) | 용도 |
| --- | --- | --- |
| editorialBody | 18 / 20px | 군집·조합·인물 설명, 행간 1.75 |
| editorialLead | 24 / 32px | 내 이름의 뜻 |
| editorialTitle | 30 / 40px | 유형·상세 제목 |
| editorialDisplay | 36 / 56px | Archive 페이지 제목 |
| editorialPortal | 20 / 30px | 군집 원 안의 제목 |
| editorialLabel | 16 / 17px | 굵은 문단 소제목 |
| editorialMeta | 15 / 16px | 날짜·안내·보조 정보 |
| editorialQuote | 24 / 32px | 유형의 한마디 |
| editorialAction | 16 / 17px | 탐색·분석 액션 |

본문 폭(measure), 넓은 피드 폭(wideMeasure), 문단 간격(sectionGap), 구분선(rule)도 공통 토큰이다. 상세는 데스크톱에서 표식 2 : 설명 3의 비율, 모바일에서 한 열을 사용한다. 의미 읽기 영역은 키보드로 스크롤할 수 있다. 모노크롬과 기존 서체를 유지하며 크기·굵기·여백·얇은 선으로 위계를 만든다.

검증: 24유형·한영 원고·공유·Archive 탐색·Create 결과 계약, 의미 읽기와 테마 오버라이드 SSR, 반응형 타이포 및 모바일 CSSOM 검사, 변경 코드 ESLint, 앱·Storybook 빌드를 확인했다. 브라우저 자동화는 사용하지 않았다.


## 분석 메타데이터 다중 토글 · 2026-09-07

Create 데스크톱·모바일 분석, Archive 개인 상세, 공유 상세의 의미 선택을 `GlyphObservationChips` 공용 컴포넌트로 통일했다. MUI Chip·selectedIds 배열·onToggle 콜백으로 누른 항목만 추가/제거한다. 체크·채움색과 + 아이콘, native button·aria-pressed·포커스 표시, 한영 안내를 제공한다. editorialAction과 observationChip 시맨틱 토큰을 사용한다.

Archive는 기존 제목과 전체 서사를 그대로 유지한다. 분석 토글은 원본 표식 위 초록 mesh만 켜고 끈다. 추가 읽기 패널이나 중복 제목/서사를 열지 않는다. 메타데이터 칩은 처음부터 보이고, 초록 mesh와 독립적으로 각 관측 표시를 켜고 끈다. Create와 공유 상세의 기존 읽기 영역은 켜진 관측 근거를 함께 보여준다. 새 이름 생성은 선택을 비우고 Create 세션 복원은 다중 선택을 보존한다.

buildMeaningReading의 번호는 표식 전체에서 고유하며 선택 순서에 따라 바뀌지 않는다. 동시에 표시해도 Create/공유의 본문 위치 설명과 일치한다. AnalysisOverlay의 showVertices 기본값은 true이며, ArchiveGlyph는 showVertices/showFrame/showReadout=false로 초록 선만 그린다.

검증: 관측 부분집합·번호 295개, Create·공유 상세 201개, Archive 상태 106개 검사(처음부터 칩 노출, mesh와 독립 선택, 원래 서사 DOM 유지, 중복 패널/정점/계측 텍스트 없음), 한영 검사 및 앱·Storybook 빌드를 확인했다. 브라우저 자동화는 실행하지 않았다.

데스크톱 표식 열은 GNB와 Archive 내비게이션 아래에 sticky로 유지된다. 고정 범위는 유형 설명이 있는 2열 그리드까지이며, 같은 유형 구성원 목록에서는 해제된다. 분석 버튼은 표식 바로 아래 가운데에 배치했다. 뷰포트 높이에 맞춰 표식의 최대 폭을 줄여 버튼까지 화면에 들어오게 하며, 위치·크기는 theme.editorial.archiveFigure 토큰을 사용한다. 모바일 한 열에서는 본문을 가리지 않도록 일반 흐름을 유지한다.

내 이름을 한마디로(motto)는 공용 ArchetypeMotto의 blockquote로 유형 제목 바로 아래에 배치했다. Archive 상세·Create 분석·공유 상세는 본문 하단에서 이 문구를 반복하지 않는다. ArchetypeNarrative는 showMotto=false로 중복을 방지하며, 독립 사용 시에는 한마디를 맨 앞에 표시한다. 기존 한영 JSON 문구와 editorialQuote 역할을 그대로 사용한다.

간격 리듬: labelGap 6px, paragraphGap/itemGap 8px로 섹션 내부 요소를 묶고 sectionGap 56/80px, sectionBreak 80/112px(모바일/데스크톱)로 섹션 사이를 넓혔다. 구분선과 해당 소제목 사이(sectionPadding)는 12/16px로 줄였다. 모든 값은 theme.editorial 토큰의 MUI spacing 단위로 관리한다.
