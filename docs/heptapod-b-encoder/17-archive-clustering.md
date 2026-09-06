# Archive 공통 형태 군집

## 경험과 기준

`/archive` 입장 → 공통 형태 군집 선택 → 해당 구성원만 갤러리에 표시 → 같은 번호의 실제 부위 확인 → 구성원 쌍 비교 → 기존 비교·공유 화면으로 이동.

- 전체 형상: 모든 구성원 쌍이 기존 v3 whole-form 기준을 통과한다.
- 같은 가지: 모든 구성원이 하나의 고정된 가지를 공유한다. 방향·가시 수가 같고 각도·세기·퍼짐이 기존 motif 기준을 통과한다.
- 열린 틈과 먹: 개구부와 함께 필압 또는 먹 고임이 닮아야 한다. 군집 내에서는 같은 profile 종류와 각 구성원의 같은 peak 위치를 유지한다.
- 이름·철자·의미·기존 contour 라벨·저장 feature_vector로 군집을 만들지 않는다. 시간 방향 이름(예: 12시 부근)은 대표 부위의 읽기 쉬운 라벨일 뿐, 시간 구간 bin으로 묶지 않는다.
- 한 표식은 여러 군집에 속할 수 있다. A–B와 B–C만 닮았다고 A–B–C를 합치지 않는다. B의 서로 다른 가지를 통해 연결된 쌍도 하나의 공통 모티프로 합치지 않는다.
- 모든 표식에 군집을 강제하지 않는다. ‘현재 군집 미소속’과 모델 확인 실패를 별도로 집계한다. 이는 현재 표본·기준의 결과이지 독창성이나 사람 사이의 관계에 대한 판정이 아니다.

## 계산

`clusterArchiveGlyphs.js`는 공개 모델의 특징을 한 번 추출하고 모든 쌍을 비교한다. 각 표식의 **구체적인 관측 부위**를 정점으로 삼고 같은 기준을 통과한 쌍만 연결한다. 동일 표식의 부위 둘이 한 군집에 중복 등록되지는 않는다.

강한 간선부터, 서로 모두 연결되는 정점만 추가하는 결정론적 greedy complete-link edge cover를 만든다. 하나의 표식이 서로 다른 그룹에 중복 소속될 수 있다. 모든 maximal clique를 열거하거나 통계적으로 ‘자연적인 군집’을 발견했다고 주장하지 않는다.

계산 상한은 현재 읽은 공개 표식 200개(19,900쌍), 군집 96개다. 상한에 걸린 결과에는 `sampleTruncated`/`groupingTruncated`를 표시한다. feature 추출 8개, 쌍 비교 128개, 군집 생성 사이에 제어권을 돌려주어 갤러리 로딩·스크롤과 함께 진행한다. AbortSignal로 오래된 계산을 취소한다.

## 데이터와 API 교체 경계

새 DB 테이블이나 migration은 필요하지 않다. `glyphs.model_data`에서 유도하는 일시적 읽기 모델이며 공개·철회 상태는 원래 archive 조회를 따른다. 이미 읽은 표본 외의 추가 조회·인증·쓰기·Edge 호출은 없다.

```text
useArchiveGlyphs → 현재 공개 rows
                      ↓
useArchiveClusters → readArchiveClusters → provider.getClusters(rows, {signal})
                      ↓
              ArchiveClusterExplorer + 기존 갤러리
```

기본 provider는 local이다. production에서도 군집은 local로 동작한다. 기존 개별 관계 조회의 `VITE_ARCHIVE_RELATIONS_MODE`와 독립적이다.

향후 `createApiClusterProvider({ invoke })`를 `MyArchivePage.clusterProvider`에 주입하면 같은 화면을 재사용한다. API 요청에는 공개 glyphIds와 군집 알고리즘 버전만 보낸다. 서버는 공개 여부를 다시 확인하고 같은 DTO를 반환해야 한다. 실제 군집 서버 endpoint는 이번 범위에 포함하지 않았다.

DTO 주요 필드:

- `algorithmVersion: 1`, `relationAlgorithmVersion: 3`
- `groups[]`: id, kind, title, description, minimumSimilarity, pairCount, members
- `members[]`: glyphId, anchors, relationToRepresentative(대표 외 구성원)
- `memberships`: glyphId → groupIds (다대다)
- `ungroupedIds`, `invalidIds`, `sampleSize`, `sampleLimit`, `comparedPairs`
- `sampleTruncated`, `groupingTruncated`, `computationMode`

group ID는 현재 모델의 부위와 구성원에서 결정된다. 표본이 바뀌면 바뀔 수 있으므로 영구 공유 URL이나 DB 식별자로 사용하지 않는다. 공유는 기존 공개 표식 쌍 UUID 경로를 사용한다.

## UI와 기존 요소 보존

- ArchiveClusterExplorer는 네트워크 없는 표시부다. 전체·미소속·개별 군집 선택과 각 그룹의 근거를 제공한다.
- 선택한 군집은 기존 갤러리의 카드만 필터링한다. `LogogramRendererCanvas`의 최초 형성 효과·IntersectionObserver·사운드·hover 분석과 앱의 Lenis는 유지한다.
- `GlyphObservationOverlay`를 추출하여 애니메이션 카드와 기존 쌍 비교에서 동일한 좌표·번호 표시를 재사용한다. 표식을 돌리거나 억지로 변형해 맞추지 않는다.
- 비교 Dialog는 해당 군집의 고정된 관측 부위를 가진 relationToRepresentative로 GlyphPairComparison을 렌더한다. 기존 공개 쌍 비교·공유 화면으로도 이동할 수 있다.
- 계산 실패·로딩 중에도 갤러리는 사용 가능하다. 표본 변경·재시도 시 오래된 필터를 적용하지 않는다. 군집 8개 초과 시 모두 보기로 확장한다.

## 검증

브라우저 자동화 없이 Node/SSR/빌드로 확인한다. 생성 fixture는 테스트·Storybook에서만 사용하며 실제 아카이브로 쓰지 않는다.

```sh
node --test scripts/test-archive-clusters.mjs
node scripts/test-archive-ui.mjs
node --test scripts/test-archive-motion.mjs
pnpm run build
```

핵심 회귀: A–B–C 사슬, 서로 다른 부위의 거짓 삼각형, 동일 부위의 세 표식 군집, 0° 경계, 중복 소속, 이름 변경 불변, 순서 변경 불변, 비공개·중복·손상 모델, 비동기 계산 취소, 추가 통신 없는 local provider, API 교체·구버전 거절.

군집 검사 23개를 포함한 Node runner 95개, UI SSR 80개(스토리 모듈 14개), 대상 ESLint, 앱·Storybook 빌드를 통과했다. `check-agent-rules`는 package.json에 스크립트가 없어 실행할 수 없었다. `/archive`의 개발 서버 HTTP 200을 확인했으며, 브라우저 자동화·시각 검증은 하지 않았다.

### 실제 공개 표본 확인

2026-09-05, 프론트와 같은 공개 GET만 사용해 34개 표식·561쌍을 비교했다. 가지 군집 2개(각 2개 표식), 현재 미소속 30개, 손상 모델 0개, 중복 소속 0개였다. 군집 라벨은 ‘12시 부근 · 바깥 가지 6가시’, ‘6시 부근 · 안쪽 가지 7가시’다. 동일 로컬 환경의 순수 계산은 약 32ms였으며 브라우저 성능 수치로 일반화하지 않는다. 큰 군집이나 중복 소속은 구현상 지원하지만 이 실제 표본에서 발견된 것처럼 표시하지 않는다. 운영 데이터에 쓰지 않았다.
