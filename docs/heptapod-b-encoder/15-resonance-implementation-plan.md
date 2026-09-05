# Response Archive — 관계 발견 구현 계획

2026-09-05. 사용자 요청: design-parallel-orchestration으로 계획 후 실행.

## 목표와 범위

아카이브 카드에서 **Heptapod B로 변환된 실제 모델의 공명**을 발견하고, 두 표식의 대응 부위를 비교한 뒤 관측 근거를 공개 링크로 공유한다. 2026-09-05 사용자 피드백에 따라 문자 관계 중심의 초기 계획을 수정했다. 이름의 철자·뜻·어원·친분을 관계 입력으로 사용하지 않는다.

- 같은 정규화 이름·인코더 버전·의문형은 같은 Glyph다. 표시 이름은 Contribution 문맥에 보존한다.
- v2는 canonical 이름으로 동일한 모델을 만든다. 기존 가역 코덱으로 손실 없이 복원 가능한 입력은 가역 모드, 미지원 문자/용량 초과 입력은 결정론 모드로 표현한다. 결정론 모드를 가역이라고 표시하지 않는다.
- 기존 공개 모델은 다시 생성하거나 덮어쓰지 않는다. 관계는 저장된 실제 모델에서 추출한다.
- FORM은 전체 형태/일부 구조의 관측이다. ECHO/CONTAINS/CONTEXT는 v3 주 탐색에서 제외한다. SAME은 동일 표식 안내이고 VARIANT는 실제 렌더 본체와 seed가 같은 의문형 갈고리 차이다.
- 읽기·로컬 비교는 공개. 공개 동의 후 익명 인증 또는 기존 세션으로 소유자를 확보한다. 원시 이름/모델은 공개 전 서버로 전송하지 않는다.
- 운영 DB 적용·배포·브라우저 자동화 없이 로컬 코드, 마이그레이션, 서버 함수, 테스트, Storybook 산출물을 검증한다.

## 오케스트레이션

4개 슬롯(루트 포함), 평면 artifact sharding. 임계 경로: 공통 계약 → 계산/데이터/UI 병렬 → 페이지 통합 → 검증.

| ID | 소유자 | 수정 범위 | 의존성 | 산출/검증 |
|---|---|---|---|---|
| A | 계산 worker | src/utils/heptapod의 이름·관계 모듈, scripts/test-archive-domain.mjs | 아래 계약 | 결정론·문자 보존·점수·근거·다중 관계 검증 |
| B | 데이터 worker | src/hooks/data, supabase 신규 migration/functions/tests, src/lib/archiveClient.js | 아래 계약, 최종 A | 서버 검증·트랜잭션 공개·RLS·관계 계산 |
| C | UI worker | GlyphNode, ResonanceMap/List/Preview, RelationInspector, GlyphPairComparison 및 각 stories | 아래 계약, 최종 A | 토큰 기반 비교·근거·선택·모바일·정적 story |
| R | 루트 | 페이지, PublishDialog, 공유 유틸, App, 설정/인덱스/문서/카탈로그 | A/B/C | 실제 페이지 플로우 연결·빌드·통합 검증 |

추가 wave: A 완료 후 같은 worker가 `archive-share`와 공유 테스트를, C 완료 후 같은 worker가 페이지 mock stories와 재현 가능한 비브라우저 UI 검증을 담당한다. 파일 소유권은 root와 겹치지 않는다.

공유 파일은 루트만 변경한다. 모든 작업자는 기존 미커밋 변경과 다른 작업자의 변경을 보존한다. 중첩 위임 금지. 브라우저·원격 mutation·키 출력 금지. apply_patch로 수정한다.

## 공통 인터페이스

### Domain (A)

`src/utils/heptapod/archiveGlyph.js`

- `ARCHIVE_ENCODER_VERSION = 2`
- `buildArchiveModel(rawName)` → model. 검증 실패 시 message/code를 가진 Error. `meta.canonicalName`, `meta.encoderVersion`, `meta.encodingMode` (`reversible`/`deterministic`), `meta.reversible`를 제공한다. model.meta.name은 canonical 표기(의문형 포함)다.
- `prepareArchiveGlyph(rawName)` → Promise<{ canonicalName, displayName, isInterrogative, fingerprint, encoderVersion, modelData, featureVector, contour }>. SHA-256 fingerprint. Web Crypto, Node/Deno 호환.

`src/utils/heptapod/relateGlyphs.js`

- `RELATION_ALGORITHM_VERSION = 3`
- `relateGlyphs(a, b)` → 관계 배열. a/b는 DB Glyph 형태 (`id`, `canonical_name`, `is_interrogative`, `encoder_version`, `model_data`, `feature_vector`). 신뢰 가능한 features는 실제 모델로부터 추출한다.
- 항목: `{ relationType, score, components, reasons, evidence, algorithmVersion, directed, sourceId, targetId }`.
- 지원 관계 FORM/VARIANT. FORM evidence에는 `level: whole-form|shared-motif`, `observations: [{kind, reason, similarity, anchorA, anchorB}]`를 포함한다. 실제 링/가지/개구부/필압·먹 데이터를 직접 측정하며 이름 및 비가시 분류 값으로 관계를 만들지 않는다.

### Data (B)

- `usePublish({ client } = {})` → `{ publish, loading, error }`. `publish({ displayName, contextTags = [], consented = false })` → `{ glyphId, isNew, mappingStatus: 'on-demand' }` 또는 실패 시 throw. `consented: true`가 명시되어야 공개하며 서버에 모델/fingerprint를 신뢰 입력으로 보내지 않는다. background job은 만들지 않는다.
- `useGlyph(id, { client } = {})` → `{ glyph, loading, error, refetch }`.
- `useGlyphRelations(id, { client } = {})` → `{ relations, loading, error, mappingStatus, refetch }`. relations는 기존 DB row + `neighborGlyph`, `direction` 형태. 공개 실제 데이터로 계산하고 출처(저장/현재 표본)를 구분. 실패를 관계 0개로 감추지 않는다.
- `useArchiveGlyphs({ client, limit = 200 } = {})` → `{ glyphs, loading, error, refetch }`.
- `useUnpublish({ client } = {})` → `{ unpublish(glyphId), loading, error }`.
- 관계 공유: `/compare/:leftId/:rightId`는 공개 Glyph 쌍 ID만 사용. 서버 `archive-share`는 공개 두 모델/관계를 검증 후 초기 HTML/OG를 제공하는 준비된 endpoint. 페이지/배포 rewrite 연결은 루트 책임. 개별 공유에는 `/glyph/:id`.

### Presentation (C)

`ResonanceNeighbor`: `{ id, name, model, relationType, score, reasons, components, algorithmVersion, relations: Relation[], direction }`. 한 이웃 ID당 한 항목이다. root가 data rows를 grouping하는 helper를 추가한다.

- `GlyphNode({ model, size, label, isSelected, onClick, sx })`: 실제 표식 형상 유지, 정적 렌더, 키보드.
- `ResonanceList({ centerName, relations, onNodeSelect(id), onInspect(neighbor), loading, error, onRetry, emptyMessage, sx })`.
- `ResonanceMap({ centerModel, centerName, relations, onNodeSelect(id), onInspect(neighbor), width, height, sx })`: 선택은 설명, 중심 이동은 별도 동작. 모바일 최대 6, 데스크톱 최대 12. native page scroll을 wheel로 가로채지 않는다.
- `RelationInspector({ relation, open, onClose, onExplore(id), onCompare(id) })`: relation은 neighbor + nameA/nameB. 설명 먼저, 정확한 근거별 측정값, 색만으로 구분하지 않는다.
- `GlyphPairComparison({ leftGlyph, rightGlyph, relations, onExplore, onShare, sharing, sx })`: DB Glyph 2개, relateGlyphs 출력, 저장된 실제 모델 비교. 공명 없는 비교도 정직하게 표시.
- `ResonancePreview({ primaryName, primaryModel, fg })`: 공개 전 로컬 비교. primaryModel이 있으면 그것을 기준으로 사용. 상대는 buildArchiveModel. 실패와 무관계를 분리.

## 작업 brief와 join

각 worker는 자기 범위 구현 + focused 검증을 수행하고 변경 경로, 실행 결과, 불확실성을 루트에 보고한다. A의 domain API와 B의 hook API는 위 계약을 유지한다. C는 mock data로 먼저 진행한다. 루트는 동시에 페이지·공유·UX 문서 통합을 준비한다.

Join 1: 세 산출물의 import/API/모델 계약 확인. 충돌은 루트가 한 구현으로 통합한다. 실패한 branch는 변경을 보존하고 루트가 순차 보완한다.

Join 2: Node domain tests, 데이터/서버 단위 검증, 수정 파일 ESLint, Vite build, Storybook build. 브라우저 테스트는 실행하지 않는다. DB 실행 환경이 없으면 SQL 실행 검증과 운영 적용을 미검증으로 명시한다.

## 완료 조건

- 동일 모델 자기 유사도 1, 입력 정규화·의문형 fingerprint·유니코드 보존이 검증된다.
- 카드에 명시적 진입 동작이 있고, 관계 설명/중심 이동/두 이름 비교가 이어진다.
- 공유 URL에 입력 이름을 넣지 않는다. 비교 방문자가 로컬에서 자기 이름을 비교할 수 있다.
- 공개 실패를 성공으로 표시하지 않는다. 소유자 없는 신규 기여를 만들지 않는다.
- 같은 이웃의 복수 근거는 하나의 노드로 묶고, 목록과 지도에서 동일하게 확인할 수 있다.
- 실제 검증한 항목과 배포 전 남은 항목을 구분해 보고한다.

## 초기 실행 결과 · 2026-09-05 (v2, 아래 수정 이전)

A/B/C 독립 작업 후 R에서 페이지·계약·설정·문서를 통합했다. A 후속 공유 함수, C 후속 페이지 stories도 같은 worker를 재사용했다. 코드와 로컬 검증 결과는 `16-resonance-implementation.md`에 정리했다.

- Domain 12개, Data 17개, Share 13개, 통합10개, 비브라우저 UI44개, 임시 PostgreSQL11개, Edge HTTP/Auth 경계6개 검증.
- 수정 파일 ESLint, Edge Deno check, Vite production build, Storybook build 통과.
- 브라우저·운영 DB·OAuth provider·함수 배포·DNS 변경은 수행하지 않음. 리치 공유 custom domain 설정, 실제 사용자 상호작용과 배포 환경 검증은 남음.

## 형태 공명 v3 수정 wave

공통 계약을 먼저 수정한 뒤 기존 작업자들을 재사용한다. 사용자 피드백은 원문이 아니라 변환된 형태의 연관성이 핵심이라는 제품 결정을 확정한다.

| 소유자 | 단독 수정 범위 | join 조건 |
|---|---|---|
| A | extractGlyphFeatures, morphology, scoreFormRelation, relateGlyphs, buildRelationReasons, domain tests | 이름 변경 불변성, 실제 렌더 변수만 사용, 전체/부분 공명·관측 좌표 |
| B | local/API provider, server relation candidates, share handler, data/local/integration/share tests | 같은 v3 DTO·오래된 버전 거부·공개 범위·이름 후보검색 제거 |
| C | List/Map/Inspector, archive/detail/field/compare pages, 해당 stories/fixtures/UI tests | 대응 부위 확인→다른 표식 탐색, 형태 필터·공유 이유 일치 |
| R | resonanceView, Pair/Preview 및 stories, 공통 문서/카탈로그, 최종 검증 | 레거시 문자 근거 차단·실제 관측 좌표 시각화·공개 표본 전수/빌드 |

Root join은 실제 renderer가 어떤 model 필드를 소비하는지 대조한다. 현재 Canvas가 소비하지 않는 `cluster.type`은 관계 판정에서 제외하고 기존 모델/렌더러를 바꾸지 않는다. 결과 수를 늘리기 위해 임계값을 낮추지 않는다. 검증 결과는 `16-resonance-implementation.md`의 v3 항목이 기준이다.
