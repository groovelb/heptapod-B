# 형태에서 읽는 의미군 v1

## 실행 범위와 원칙

이 문서는 의미군 구현의 공통 계약이다. 작업 완료 상태와 검증 결과는 마지막 절에 기록한다.

> 최신 UI 변경 · 2026-09-06: `19-archetype-feed.md`가 표시 계약에 우선한다. 의미 판독·집계·provider는 유지하고 계열 → 유형별 실제 구성원 피드 → 개인 확대를 구현했다. 메타 탭·개수 분포·관측 Drawer는 사용하지 않는다. 유형 카탈로그의 제목과 서사를 분석·피드·개인 확대·단일 네이티브 공유 문구가 재사용한다. 기존 meta 파서/정렬 유틸은 호환용으로 남지만 새 Archive UI는 사용하거나 URL에 생성하지 않는다. 아래 facets 설명과 검증 숫자는 이전 구현 기록이다.

> 기본 계열 표현: 첫 화면의 여러 구성원 표식은 `ArchiveFamilySymbol`의 단일 상징으로 교체했다. `archiveFamilySymbols.js`의 저작된 모델은 외곽·먹·초점 위치가 같고 방향만 다르며, 기존 판독기로 의도한 기본 계열만 확인한다. 공개 ID/동의/이름이 없는 표시 전용 모델로 소속과 통계에는 들어가지 않는다. 상징을 선택하면 실제 구성원 표식이 바로 드러난다.

- 이름이 아니라 실제 저장/표시 `model_data`만 판독한다. 영화 공식 번역이나 성격 판정이 아니다.
- 형태 분류 → 프로젝트의 의미 해석 → 실제 정밀 공명은 별도 계층이다. 의미를 FORM/VARIANT 관계에 넣거나 점수로 변환하지 않는다.
- 현재 불러온 공개 표본으로 로컬 계산한다. API는 명시적으로 provider를 주입할 때만 사용한다. 이번 작업에 DB 변경, 배포, commit은 없다.
- 기존 Canvas 형성 효과, Lenis, 오디오, 정밀 공명 계약을 보존한다. 브라우저 자동화는 사용자의 별도 명시 요청 전까지 금지한다.
- 44개(1~2초점), 80개(3초점 포함), 24개(복합 의미)는 조건부 분류 공간이며 실제 관측 군집 수 또는 인코더의 도달 가능성 보장이 아니다.

## 규칙

기본 의미는 `arrival`(도래), `reception`(수용), `reciprocity`(상호성) 중 하나다. 모든 초점 방향이 +1이면 도래, -1이면 수용, 두 방향이 함께 있으면 상호성이다. 초점이 없으면 기본 의미는 미확인이다.

추가 의미는 다음 세 가지다. 각 값은 true/false/null(미확인)로 구별한다.

| ID | 이름 | 기준 |
|---|---|---|
| simultaneity | 동시성 | 최소 원주 각도로 측정한 초점 쌍 거리의 최댓값 ≥150° |
| openness | 여백 | 유효한 링 개구부 존재 |
| trace | 잔향 | 기존 추출기의 유효 먹 봉우리 ≥2개; 1개=false, 0개=null |

초점 배치는 1개면 single, 2~3개면 최소 포함 원호 ≤90°일 때 near, 그렇지 않고 반대편 쌍이 있으면 opposed, 나머지는 distributed다. 초점 0개는 미확인이다. 링은 open/closed, 방향은 outward/inward/mixed, 먹은 concentrated/distributed/null이다. 각도 경계는 부동소수점 오차만 보정한다.

질문 갈고리는 본체 분류·의미를 바꾸지 않는다. `cluster.type`, contourLineage, 원문 이름, 태그는 사용하지 않는다. 렌더러 분포 함수의 봉우리이지 픽셀 농도 측정이라는 주장은 하지 않는다.

## 고정된 모듈 계약

### 도메인

- `src/data/heptapodMeaningCatalog.js`: `MEANING_VERSION=1`, `MORPHOLOGY_VERSION=1`, `MEANING_BASE_IDS`, `MEANING_MODIFIER_IDS`, `MEANING_CATALOG`(ID별 `{id,label,description}`), `meaningTitle(ids)`.
- `classifyGlyphMorphology(model)`: `{status, ring, direction, focusCount, arrangement, ink, inkPeakCount, morphologyKey, ...}`. status는 complete/partial/invalid. 유효하지 않은 모델은 예외 대신 invalid 결과로 반환한다. 기존 feature 추출기를 재사용한다.
- `interpretGlyphMeaning(model)`: `{meaningVersion,morphologyVersion,status,morphology,baseMeaning,modifiers,meaningIds,meaningKey,title,reading,observations}`. modifiers는 위 세 ID를 모두 가진 true/false/null 맵. observations는 `{id,meaningId,reason,anchors}` 목록. anchors는 기존 오버레이의 `{kind,ang,clusterIndex?,half?,number?}` 계약이다. invalid는 관측 없음. partial은 확인한 의미와 관측을 유지하지만 meaningKey=null이다.
- `compareGlyphMeanings(leftModel,rightModel)`: `{left,right,sharedMeaningIds,exactMeaningMatch,observations,reason}`. 관측 항목은 `{id,meaningId,reason,anchorsA,anchorsB}`. 양쪽에서 실제 판독된 공통 의미만 제공한다. 점수/관계유형은 없다.
- 의미 key: `meaning-v1:<base>:<modifier IDs in fixed catalog order joined by +, or none>`. 형태 key도 규칙 버전과 분류값만 사용한다. 구성원 수/ID/이름에 의존하지 않는다.
- `groupArchiveMeanings(rows)`와 async `computeArchiveMeanings(rows,{signal}={})`: 동일 DTO. is_public=true인 UUID만 dedupe, 입력 순서의 최대 200개 표본 선택 후 ID순 정렬로 계산한다. 잘못된 ID는 선택 전 제외한다. `groups`는 완전 판독 의미형의 비어 있지 않은 그룹(1개 기록 포함), `families`는 기본/추가 의미 6개, `morphologyGroups`는 완전 판독 형태형이다.
- 집계 DTO: `{meaningVersion,morphologyVersion,sampleSize,analyzedCount,sampleLimit:200,sampleTruncated,sampleAtLimit,interpretations,groups,families,morphologyGroups,partialIds,invalidIds}`. sampleSize는 중복 제거 후 선택한 공개 행 수(무효 포함), analyzedCount는 invalid 제외. interpretations는 glyphId별 결과. 그룹은 `{id,title,reading,meaningIds,memberIds}`(형태 그룹은 meaningIds 불필요), family는 `{id,label,description,memberIds}`. 완전 판독의 각 ID는 복합 그룹에 정확히 1회 들어간다. partial은 확인된 family에는 들어가지만 복합 그룹에는 들어가지 않는다.

### 데이터

- `localArchiveMeaningProvider.getMeanings(rows,{signal})` → compute 결과.
- `createApiMeaningProvider({invoke})`: `invoke({glyphIds,meaningVersion,morphologyVersion,sampleTruncated,sampleAtLimit}, signal)` 호출. 네트워크 구현은 invoke 주입으로 한정. 응답은 동일 DTO이며 로컬 기준과 전체 대조한다. 등록 local/API는 도메인 계산을 중복하지 않는다.
- `readArchiveMeanings(rows,{signal,provider})`: 입력 표본 범위, 버전, ID 유일성, counts, 그룹/판독/소속/관측의 일관성을 검증. 오래된/취소 응답 금지. 반환값에 computationMode=local/api 추가.
- `useArchiveMeanings(glyphs,{enabled,provider})`: `{meanings,loading,error,refetch}`, 기존 useArchiveQuery 재사용.
- 공유 유틸: `archiveMeaningPath({base=null,modifiers=[],groupId=null,status='all'}={})`는 `/archive?view=meaning&mv=1...`; `parseArchiveMeaningSearch(search)`는 `{filter:{base,modifiers,groupId,status},unsupportedVersion}`. status=all/partial/invalid, 추가 의미는 모두 포함(AND), groupId는 완전일치 선택이다. 허용 enum/key만 수용하고 이름은 URL에 넣지 않는다.
- 깊이 공유: `archiveDepthPath(filter,focusedId=null,{meta=null}={})`와 `parseArchiveDepthSearch`는 위 계약에 공개 UUID `glyph`, 단일 추가 의미 정렬 `meta`를 더한다. `meta`는 소속을 바꾸지 않는다. 기존 조합/AND/상태 링크의 정확한 범위와 버전 게이트를 유지한다.
- 공통 버전 게이트는 상세/비교의 `reading=meaning&mv=1`도 처리한다. 명시된 미지원 mv는 보기와 무관하게 unsupported, 의미 보기인데 버전이 누락돼도 unsupported다. 기존 버전 없는 정밀 링크는 유지한다.
- 기존 `shareArchive`/`archiveShareUrl`에 선택적 reading='meaning', meaningVersion=1을 전달할 수 있게 확장한다. 의미 공유는 앱 UUID URL의 `?reading=meaning&mv=1`을 사용해 기존 정밀 공명 OG와 혼동하지 않는다. 기본 호출 동작은 그대로다. `exportPairCard` 4번째 optional options에서도 의미 해석임을 footer로 구분한다.

### 표시 컴포넌트

- `buildArchiveDepthView(glyphs,meanings,filter,focusedId,meta)`는 화면용 `scopeKey`와 3개 `facets`를 계산한다. 각 facet은 `{id,label,memberIds,count,total,knownCount,unknownCount}`이며 현재 필터 범위의 공개 중복 제거 표식만 집계한다. count는 true만, knownCount는 true/false만, unknownCount는 나머지다. 합계가 전체 수보다 클 수 있고 개인 focus와 정렬은 분모를 바꾸지 않는다. 정렬은 해당 의미 true를 우선하고 ID로 안정 정렬한다. 기본 화면에 조합별 포털은 없지만 조합 데이터는 그대로 유지한다.
- `GlyphMeaningSummary({interpretation,compact=false,selectedObservationId,onSelectObservation,onExplore,fg,sx})`: 순수 표시. 콜백은 관측 객체/null을 전달하며 부모가 anchors를 표시한다. onExplore가 있으면 현재 의미군 탐색 CTA. partial/invalid 구분. compact는 짧은 제목/판독상태만 표시하며 fg는 기존 인코더 전경색을 따른다.
- `ArchiveMeaningExplorer({meanings,glyphs=[],filter,loading,error,onRetry,onFilterChange,onShare,onCompare})`: 기본 방향 단일선택, 추가 의미 AND, 관측 복합 그룹, 전체/부분/미확인, 표본 범위. 필터·공유 콜백에 전체 filter 전달. 선택한 그룹에서 두 공개 구성원을 Select로 고른 후 onCompare(leftId,rightId). 같은 ID는 비활성화, 1개 그룹은 안내. `filterMeaningGlyphs(glyphs,meanings,filter)`는 갤러리와 같은 공개·표본 소속 판정이다.
- 기존 `GlyphPairComparison`에 optional `meaningComparison`, `initialView='precision'`, controlled `view`, `onViewChange(reading)` 추가. 정보가 있으면 의미/정밀 보기 선택. 의미 관측은 별도 anchors로 표시하고 relations 배열과 섞지 않는다. onShare는 `{reading:'meaning'|'precision',reason}` 전달. 기존 인자 없는 콜백과 호환된다.
- 표시 컴포넌트는 실제 모델을 재생성하지 않는다. 기존 renderer/overlay 및 MUI sx/theme를 재사용한다. Storybook은 네트워크 없는 presentation fixture다.

## 병렬 작업과 합류

| 작업 | 소유자 | 쓰기 범위 | 합류 조건 |
|---|---|---|---|
| 의미 도메인 | archive_domain | 새 catalog, 분류/해석/집계 모듈, 새 domain 테스트 | 계약과 경계/불변성/조합 테스트 통과 |
| 데이터 계약 | archive_data | 새 provider/hook, shareArchive와 관련 테스트 | local 무네트워크, API 거부/취소/공유 테스트 |
| 표시 UI | archive_ui | 새 Explorer/Summary와 stories, GlyphPairComparison와 story | props 계약, 표시/근거 분리, lint |
| 페이지·통합 | root | Archive/Detail/Compare/ResonancePreview와 stories, catalog/index/docs, 통합·회귀 테스트 | domain/data/UI 합류 후 전체 체크 |

각 파일은 한 명만 수정한다. 기존 dirty 변경을 보존한다. 공통 계약 수정은 root가 결정해 공유한다. 준비 → 3갈래 구현 + root 페이지 통합 → 합류 → 전체 검증 순서다. 실패한 분기는 담당자 정지/양도 확인 후 root가 순차로 마무리한다.

## 구현·검증 상태 · 2026-09-05

> 2026-09-06 단순화 검증: Node 도메인·데이터·URL·모션 156개 통과. 의미 UI SSR 101개, 기존 Archive UI 80개, 메모리 DOM의 결과 화면 51개·Archive 상태 24개 검사 통과. 앱·Storybook 빌드와 변경 코드 ESLint 통과. 정렬·개인 확대·뒤로 가기에서 기존 DOM 및 스크롤 호출 보존을 확인했으며 실제 Canvas 픽셀·브라우저 레이아웃을 검증한 것은 아니다. 한영 문구·상태 테스트도 통과. `check-agent-rules` 스크립트 부재와 기존 빌드 경고는 유지되며 DB 변경·실제 공개·배포·commit은 수행하지 않았다. 아래는 이전 구현 시점 기록이다.

- 아카이브 기본 의미 탐색/정밀 별도 보기, 복합 그룹 두 구성원 비교, 카드/상세 실제 근거, 인코더 로컬 판독, 공유/PNG 보기 일치 구현.
- 공개 모델을 재생성하지 않았고, 기존 정밀 공명 계산·Canvas 생성·Lenis·인코더/히어로 원본은 이번 작업에서 수정하지 않았다. 인코더 연결은 기존 ResonancePreview를 확장했다.
- 실제 공개 model_data 34개를 읽기 전용 확인: 완전 판독 33개, 부분 판독 1개, invalid 0개. 복합 의미군 13개, 형태 조합형 19개. 기본 도래17/수용11/상호성6, 추가 동시성7/여백9/잔향11. 이 숫자는 조회 시점 표본이며 코드/테스트에서 운영 데이터 개수를 고정하지 않는다.
- Node 도메인/군집/의미/데이터/공유/통합/모션 9개 스크립트: test runner 127개 통과(그 안의 archive-data 스크립트는 자체 18개 검사). 의미 UI/통합 SSR 66개, 기존 UI SSR 80개 통과.
- 기존 특징 추출기의 검증 함수를 `isRenderableGlyphModel`로 공개해 아카이브·상세·비교에서 손상 모델을 Canvas에 전달하지 않는다. 의미 provider 실패 중에도 갤러리의 안전한 원본 표식은 계속 볼 수 있다.
- 앱/Storybook 빌드와 변경 JS/JSX 범위 ESLint 통과. 기존 MDX 패턴·큰 chunk·baseline-browser-mapping 경고는 남아 있다.
- `check-agent-rules`는 package.json에 없어 실행할 수 없다. 문서 동기화의 프로젝트 상세 `.claude/skills/docs-sync/SKILL.md`도 없어 기존 문서 형식과 실제 diff로 한정 갱신했다.
- 브라우저 자동화는 실행하지 않았다. 실제 픽셀·포커스·스크롤 체감은 별도 허가 후 검증 대상이다. 서버 의미 API/OG/DB 변경, 배포, commit은 이번 범위에 없다.
