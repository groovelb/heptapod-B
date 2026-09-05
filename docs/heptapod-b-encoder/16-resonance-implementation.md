# Response Archive · 실제 연결 발견 구현

2026-09-05. 계획: [15-resonance-implementation-plan.md](15-resonance-implementation-plan.md).

## 1. 이번에 고정한 개념

**이름이 Heptapod B 형태로 변환된 뒤 드러나는 공통 구조가 연결이다.** 세계관은 관계 위에 얹는 장식이 아니라 관계 계산의 전제다. 원문 철자를 비교하고 표식만 보여 주는 경험은 이 제품의 공명이 아니다. 이름의 뜻이나 사람 사이의 관계도 추정하지 않는다.

2026-09-05 사용자 수정 요청으로 관계 알고리즘을 v3로 바꿨다. 종전 문자 공유/포함 중심 구현은 폐기했다. 이름은 표시와 공개 정체성에만 사용하며, 형태 관계 계산은 저장 `model_data`만 입력받는다.

| 개념 | 현재 데이터 | 사용자에게 보이는 것 |
|---|---|---|
| Glyph · 표식 | canonical 이름 + 의문형 + encoder version의 SHA-256 정체성, 실제 저장 model | 같은 표현은 같은 공개 표식 |
| Response · 응답 | GlyphContribution, 인증 소유자, 공개 동의 시각, 철회 시각 | 내가 남기고 내가 철회할 수 있는 기여 |
| Resonance · 연결 | 실제 모델의 전체/부분 구조 점수·관측·양쪽 좌표·버전 | ‘변환된 표식의 어느 부분이 닮았는지’ 먼저, 측정값은 펼치기 |
| Field · 관측장 | 한 중심과 현재 후보 표본의 1-hop 이웃 | 중심을 바꾸며 다음 이름을 발견 |
| Comparison · 두 이름 사이 | 공개 두 Glyph 또는 공개 Glyph + 비공개 로컬 입력 | 실제 대응 부위를 같은 번호로 확인. 이름은 밑줄 없이 표식의 출처로 표시 |

### 변환 후의 두 수준과 질문의 변주

- `FORM / whole-form`: 위상이 반영된 링 윤곽, 개구부의 실각도와 폭, 가지의 가시 수·방향·실각도·강도·퍼짐, 필압/먹 분포가 전체 형태 기준을 충족한다.
- `FORM / shared-motif`: 특정 가지 구조가 구체적으로 일치하거나, 개구부와 먹 분포가 함께 일치한다. 전체 형태 점수가 낮아도 독립적인 부분 근거가 충분하면 연결하되 ‘일부 구조의 공명’으로 표시한다.
- `VARIANT`: 저장된 실제 본체 기하 및 입자 seed가 같고 질문 갈고리만 다르다. canonical 이름이 같다는 이유로 추정하지 않는다.

각 FORM의 `evidence.observations`는 `{kind: branch|opening|ink|ring, reason, similarity, anchorA, anchorB}`를 포함한다. 양쪽 좌표는 원래 모델의 실제 방향을 유지한다. 표식을 회전하거나 변형해 억지로 닮게 만들지 않는다. 링의 공통 기본 원이나 같은 가닥 수만으로 연결하지 않는다.

현재 Canvas는 `cluster.type`(blob/hook 등)을 실제 기하에 사용하지 않는다. 이 값은 v3 점수·연결 조건·근거에서 제외했다. 카드/상세의 과거 contour 분류도 실제 모델의 ‘가지 N곳 · 열린/닫힌 링’으로 교체했다. 분류를 맞추기 위해 기존 표식을 다시 그리지 않는다. VARIANT는 `question` 관측으로 질문 갈고리가 있는 쪽/없는 쪽을 표시하며 가지 필터에 섞지 않는다.

v3 측정 기준:

- 전체 점수 = 가지 `.40` + 위상 포함 링 `.25` + 필압/먹/갈필 `.25` + 개구부 `.10`.
- 전체 공명은 점수 `≥ .86`, 링 `≥ .72`, 먹 profile `≥ .74`, 같은 가지 수와 각 가지의 방향 일치/각도 차 `≤ 30°`/가시 수 차 `≤ 2`/강도비 `≥ .60`, 개구부 호환 조건을 함께 요구한다.
- 가지 모티프는 가시 수·방향 일치, 각도 차 `≤ 15°`, 강도비 `≥ .75`, coneSpread 차 `≤ .20`을 요구한다. 실재하는 특징적 가지(가시 6개 이상, 강도 .35 이상)만 해당한다.
- 개구부+먹 모티프는 양쪽 개구부 존재/각도 차 `≤ 15°`/폭비 `≥ .80`에 먹 profile `≥ .90` 및 실제 필압/먹 피크 방향 일치를 함께 요구한다.
- 부분 공명의 `motifScore`는 별도 순위값이다. 낮은 `wholeScore`를 부풀리거나 다른 수준의 점수와 직접 섞지 않는다. 임계값은 코드 상수와 회귀 테스트로 고정하며 표본 연결수를 채우기 위해 낮추지 않는다.

SAME은 선이 아니라 동일 표식 안내다. ECHO/CONTAINS/CONTEXT, 외부 이름 사전, 어원·번역·음역 연결은 주 탐색에서 제외한다. 과거 DB enum/행은 파괴적으로 삭제하지 않으며 v3 응답으로 재사용하지 않는다.

## 2. 실제 사용자 흐름

```text
공개 아카이브 /archive
  → 카드의 ‘이름의 연결 보기’
  → 상세 /glyph/:id · 주요 연결 3개
      ├─ 연결 이유 → RelationInspector → 두 표식 나란히 보기
      ├─ 연결 지도 /field/:id → 이유 확인 → 별도 동작으로 중심 이동
      └─ 내 이름과 비교 /compare/:leftId
          → 로컬 입력 · 서버 전송 없음
          → 비교 근거 + 실제 두 표식 이미지 저장
          → 명시적 공개 동의
          → 공개 쌍 /compare/:leftId/:rightId 공유
              → 방문자가 다시 자기 이름을 대입

내가 남긴 응답 /me → 본인 기여 철회 / 익명 계정 Google 연결
```

공유 후 방문자의 ‘내 이름도 변환하면 이런 부분이 나타날까?’가 다음 비교를 여는 구조다. 공유 설명은 비교 화면의 실제 관측 문장을 사용한다. 별도의 바이럴 성과·전환율을 측정한 것은 아니다. 관계가 없는 비교도 저장·공유할 수 있고, 연결이 있다고 꾸미지 않는다.

### 화면과 컴포넌트

- `MyArchivePage`: 최근 공개 표식 최대 200개. 기존 분석 hover 유지, 키보드로 실행 가능한 별도 탐색 버튼. 사용자 요청에 따라 각 카드의 기존 `LogogramRendererCanvas` 연기·잉크 형성 효과를 복구했다. 뷰포트 진입 시 마운트하고 기존 렌더러의 화면 밖/백그라운드 RAF 정지를 유지한다. 감소 모션에서는 즉시 정적 완성형이다. 지도/비교의 정적 GlyphNode와 갤러리의 형성 체험을 구분한다.
- `GlyphDetailPage`: 주요 연결 3개, 직접 비교, 공유, 현재 비교 표본 안내. 조회 실패·비공개·연결 없음 분리.
- `ResonanceFieldPage`: 모바일/감소 모션에서는 목록 기본. 가지/개구부/잉크/링/질문의 변주 필터, ID 기반 중심 이동, 실제 두 모델을 보여 주는 근거 Drawer. 목록 최대 24개, 지도 모바일6/데스크톱12. 지도는 거리 기반 유사도 좌표가 아님을 표시.
- `ResonanceList` / `ResonanceMap`: 같은 이웃 ID의 관측을 하나의 노드로 묶는다. 전체 형태와 일부 구조의 점수를 직접 섞지 않고 수준·관측 부위별 순위 후 교대로 선정한다. 필터에서 선택한 부위의 관측이 설명 첫 문장으로 올라온다.
- `GlyphPairComparison`: 같은 particle 기하로 양쪽 표식 표시. 관측 부위 버튼 선택 → 양쪽 실제 대응 부위에 같은 번호/링 구간 주석 → 관측 문장. 문자 밑줄 제거. 일부 구조의 공명을 전체 형태 일치로 과장하지 않는다. 점수는 궁합 확률이 아니다.
- `ResonancePreview`: 인코더의 좁은 측면 영역에는 진입 버튼만, 비교는 넓은 Dialog. 모바일 전체 화면과 IME 조합 중 Enter 보호.
- `PublishDialog`: unchecked 동의 → pending → 성공 또는 오류. 중복 제출 차단. 실패 시 성공 화면으로 넘어가지 않음. 세션 유실·철회·외부 이미지 캐시 한계 안내.
- `ArchiveComparePage`, `MyResponsesPage`: 페이지별 `{ client }` 주입으로 Storybook에서 실제 네트워크 없이 조회·오류·철회·공개 시나리오 재현.
- `App`: Lenis를 `/archive`를 포함한 모든 앱 경로에 복구했다. 경로 변경 시 기존 RAF/인스턴스를 해제한 뒤 새 인스턴스를 만들고 즉시 상단으로 이동한다. 인트로에서 멈춘 스크롤 상태가 아카이브에 남지 않는다. 내부 Dialog/Drawer는 allowNestedScroll로 네이티브 스크롤을 허용하고, 감소 모션에서는 Lenis를 생략한다.

### 시각 원칙

기존 fog/ink 팔레트, serif 이름, 설명에는 읽을 수 있는 본문 크기, 계측값에 mono를 사용한다. 입자 렌더러를 새 도형으로 대체하지 않는다. 노드 크기는 인기도가 아니라 현재 중심/선택 상태만 구분한다. 에러는 텍스트·상태 역할로도 식별하며 색만으로 전달하지 않는다. 지도 선택은 근거를 열고, 탐색은 별도 버튼이다.

## 3. 인코더와 데이터 경계

`buildArchiveModel`은 브라우저와 서버에서 같은 canonical v2 모델을 만든다.

- NFC·공백 축약·소문자화·의문형 분리 후 최대 64 grapheme/256 byte, 명시된 문자 범위를 검증한다.
- 기존 코덱이 지원하고 정확한 roundtrip이 통과하면 `encodingMode: reversible`.
- 그 외 지원 이름은 전체 canonical 이름을 seed로 `encodingMode: deterministic`. 원문을 형태만으로 해독할 수 있다고 표시하지 않는다.
- 기존 `?name=` 링크와 저장된 v1 모델을 다시 생성해 덮어쓰지 않는다. legacy 링크에서는 새 공개 전에 v2로 명시적으로 다시 만든다.
- fingerprint는 canonical body·의문형·버전을 포함한 SHA-256. 형태 seed 자체의 충돌 없음이나 전 세계 이름의 고유성까지 보장하는 것은 아니다.

### DB 실제 구현

현재 `supabase/migrations`가 SQL의 기준이다. 이전 문서의 `public_id`, `status`, `model`, `features`, `profiles` 설계와 달리 실제 흐름은 `id`, `is_public`, `model_data`, `feature_vector`, Auth user를 사용한다.

새 migration: `20260905120000_verified_archive_publication.sql`.

| 테이블/함수 | 적용 내용 |
|---|---|
| glyphs | fingerprint unique 유지, anon/authenticated 직접 INSERT/UPDATE/DELETE 차단, 공개 SELECT |
| glyph_contributions | consent_version/consented_at/withdrawn_at, 신규 v2 활성 기여에 (glyph,user) partial unique, 본인만 상세 조회 |
| glyph_relations | evidence/computed_at/evidence_source 추가. 기존 관계 보존. 현재 화면 계산 결과는 영구 저장하지 않음 |
| archive_publish_verified | service-role 전용 트랜잭션 RPC. 서버 검증 소유자·동의, owner/fingerprint lock, 재시도 멱등성, 기존 모델 불변, 20회/시간 소유자 제한 |
| archive_unpublish_verified | 본인 활성 기여만 soft withdrawal, 마지막 응답이 사라지면 Glyph 비공개 |
| update_contribution_count | DELETE 후 남은 기여 1개를 잘못 숨기는 오류 수정. 마지막 기여의 기준은 0 |

기존 ownerless/중복 기여를 임의로 삭제하거나 특정 사용자에게 귀속하지 않는다. 이 과거 데이터의 소유권 복구는 별도 운영 결정이다.

### 서버 함수

- `archive-publish`: 실제 bearer token의 `getUser()` 검증 → 이름·동의 검증 → 서버에서 모델/fingerprint 재생성 → 전용 RPC. 클라이언트 모델·사용자 ID를 신뢰하지 않는다.
- `archive-unpublish`: 인증된 동일 소유자만 전용 RPC 호출.
- `archive-relations`: 공개 중심 및 공개 후보의 저장 모델을 요청 시 비교. 최근 공개200 + 기존 양방향 이웃 각50을 중복 제거해 최대300 후보. 이름 접두/동일 철자와 검증되지 않은 contour 캐시를 후보 기준에서 제외한다. 기존 이웃은 ID만 사용하고 실제 모델로 v3 재계산한다. 잘못된 모델은 제한된 작업량 검사 후 제외하고 `partial-sample`로 알린다.
- `archive-share`: 공개 ID만 수용. HTML/PNG/HEAD 각각 양쪽 공개 상태 재확인, HTML escaping, trusted URL, 실제 기하의 1200×630 PNG, no-store. 비공개면 양쪽 이름·모델·OG를 노출하지 않는다.

`mappingStatus: on-demand`는 예약된 background job을 뜻하지 않는다. 화면이 요청할 때 계산한다. `current-sample`은 전체 데이터 완전 검색을 뜻하지 않는다. 대규모 성능/추천 품질을 보장하는 단계도 아니다.

### 추가 연결 · 프론트 공개 데이터로 로컬 관계 계산

후속 사용자 요청에 따라 **개발 환경은 이미 조회한 실제 공개 표식으로 관계를 계산**한다. Storybook 표본으로 실제 아카이브를 대체하지 않는다. 데이터 모델·화면·DB 쓰기 권한은 변경하지 않았다.

```text
useGlyphRelations(id)
  → readGlyphRelations(client, id, options) · 고정 facade
      ├─ local provider → 프론트 공개 목록 snapshot + 실제 relateGlyphs
      └─ api provider   → archive-relations API
  → 동일한 relations / mappingStatus / sampleSize / evidence 응답
```

- `src/lib/archiveRelations.js`: `ArchiveRelationProvider.getRelations(id, { signal })` 계약. 기본 API 이외의 서버도 `{ provider }` 주입으로 교체 가능하다.
- `src/lib/archiveSnapshot.js`: `readArchiveGlyphs`가 조회한 공개 행만 client별 메모리에 60초 보관한다. localStorage·테스트용 이름·미공개 입력을 넣지 않는다. 로컬 계산은 최대 200개 후보이며, API의 최대 300개 후보와 범위가 다르다.
- 상세/지도 직접 진입으로 snapshot이 없거나 만료됐다면 기존 공개 목록 조회로 준비한다. 아카이브 목록을 이미 조회한 상태면 다시 전체 목록을 요청하지 않는다. 중심의 공개 상태는 매번 확인하고, 공개 철회된 최신 상세 응답은 캐시에서도 제거한다.
- 공개/철회가 실제 API에서 성공하면 snapshot을 무효화한다. 다른 사용자가 방금 숨긴 이웃이 기존 snapshot에 잠시 남을 가능성은 있어 실시간 구독을 보장하지 않는다. 새로고침·TTL 만료 후 조회에 반영된다.
- 로컬 관계 계산은 서버 함수·인증·쓰기 호출이 없다. 실제 저장 model을 재생성하지 않고 같은 계산 함수/모델 크기 검증을 사용한다. 16개씩 계산 후 UI 작업 기회를 주고 화면 이동 시 취소한다.
- `computationMode: local`, `evidence_source: local-public-snapshot`, `sampleFetchedAt`으로 출처를 구분한다. 기존 화면이 소비하는 DTO는 유지한다. 잘못된 모델은 `partial-sample`, 조회 실패는 error, 무관계는 정상 빈 배열이다.
- 기존 `{ client }` Storybook 주입은 해당 mock API 동작을 그대로 사용한다. 주입 클라이언트로 로컬 경로를 시험하려면 `{ mode: 'local' }`을 명시한다.

설정은 `.env` 또는 환경별 파일의 `VITE_ARCHIVE_RELATIONS_MODE`로 바꾼다. 비어 있으면 `pnpm dev`는 `local`, production build는 `api`다. API 배포 후 다음 값으로 바꾸고 개발 서버 재시작/재빌드하면 화면 수정 없이 전환된다.

```dotenv
VITE_ARCHIVE_RELATIONS_MODE=api
```

API 모드에서 404/네트워크 실패 또는 구형 관계 버전을 받으면 로컬로 몰래 폴백하지 않는다. 구형 버전은 업데이트 필요 오류이며 무관계로 숨기지 않는다. 뷰도 v3 이상의 검증된 형태 근거만 노출한다. **공개·철회·로그인·리치 공유 서버는 여전히 실제 API가 필요하다.** 이번 연결은 읽어온 데이터의 관계 탐색·비교를 가능하게 한 것이며 전체 앱을 오프라인 쓰기 데모로 바꾼 것이 아니다.

초기 로컬 provider 연결(v2) 검증에서는 공개 표식 34개, 중심별 33개 후보, 공개 GET만 사용한 것을 확인했다. 이 당시 문자 포함 관계 수치는 v3의 관계 품질 검증으로 재사용하지 않는다. v3 통합 검증은 아래에 별도로 기록한다. 운영 데이터에 쓰지 않았다.

## 4. 설정과 운영 전 확인

운영 DB, Auth dashboard, 함수 배포, DNS, OAuth provider는 이번 작업에서 변경하지 않았다. 로컬 `supabase/config.toml`에는 익명 로그인·manual linking 및 함수별 `verify_jwt=false`를 반영했다. 쓰기 함수는 내부에서 token을 검증하므로 검증을 생략한 공개 쓰기 API가 아니다.

1. 운영 migration 이력을 먼저 조회한다. **기존 `20260904130000_cleanup_bad_data.sql`에는 DELETE가 있다.** 모든 미적용 migration을 확인 없이 한꺼번에 실행하지 않는다. 새 migration 자체는 과거 모델·기여를 삭제하지 않는다.
2. DB 새 migration → 새 함수들 → 새 클라이언트를 조율해 적용한다. 구형 클라이언트의 직접 publish는 권한 차단 후 실패하므로 전환 구간을 관리한다. 통합 스테이징에서 동시 공개/철회를 검증한다.
3. 익명 Auth와 manual linking 활성화, Google OAuth 제공자 및 실제 사이트 `/me` redirect 허용. 기존 Google 계정에 연결하려는 충돌 UX·세션 유실 복구는 별도 확인.
4. 익명 계정 무한 재생성 방지를 위한 Auth CAPTCHA/IP 제한, 공개 관계 요청 rate limit, 운영 신고/모더레이션, 모델 JSON 다운로드 상한을 런칭 전에 검토한다. 소유자당 20회 제한만으로 전체 남용을 막는 것은 아니다.
5. 클라이언트는 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. service role은 서버의 플랫폼 환경에만 둔다.
6. 리치 공유는 `ARCHIVE_SITE_URL`, `ARCHIVE_SHARE_URL`, 클라이언트 `VITE_ARCHIVE_SHARE_URL`을 동일한 **HTML 지원 custom domain/proxy** 기준으로 구성한다. 기본 Supabase 도메인은 HTML을 text/plain으로 바꾸므로 리치 OG 배포 완료로 간주하지 않는다. [공식 Routing 문서](https://supabase.com/docs/guides/functions/http-methods), [공식 Limits 소스](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/limits.mdx).
7. 실제 공유 URL을 curl로 열어 content-type=text/html, 절대 og:image URL, PNG 응답, 철회 후 404를 확인한다. 이미지 파일에는 표식이, 이름·근거는 OG 제목/설명에 있다. 클라이언트 저장 PNG에는 이름·근거도 포함한다.
8. 정적 호스팅은 `/glyph`, `/field`, `/compare`, `/me` deep link를 index.html로 rewrite해야 한다. 외부 SNS의 이미 저장된 preview cache/사용자 PNG는 서버에서 소급 회수할 수 없다.

## 5. 검증 및 남은 한계

브라우저를 실행하지 않는 재현 명령:

```sh
node --test scripts/test-archive-domain.mjs scripts/test-archive-data.mjs scripts/test-archive-share.mjs scripts/test-archive-integration.mjs
node --test scripts/test-archive-local.mjs
node --test scripts/test-archive-motion.mjs
node scripts/test-archive-ui.mjs
deno run --no-lock --node-modules-dir=none --allow-read --allow-env supabase/tests/archive-migration.mjs
deno test --no-lock --node-modules-dir=none supabase/tests/archive-edge.test.ts
deno check --no-lock --node-modules-dir=none supabase/functions/archive-publish/index.ts supabase/functions/archive-unpublish/index.ts supabase/functions/archive-relations/index.ts supabase/functions/archive-share/index.ts
pnpm run build
pnpm run build-storybook
```

초기 v2에서는 계산·데이터·공유·통합 테스트, UI 정적 렌더 44개, 임시 PostgreSQL SQL 검증 11개, Edge 경계 테스트, 앱/Storybook 빌드를 통과했다. v3에서는 다음을 별도로 검증했다.

- Domain 20개, Data 18개, 통합 14개, Local 17개, Share 15개 검사 통과. Node runner는 data 스크립트의 내부 18개를 하나로 집계하여 `67 tests`로 출력한다.
- UI SSR 62개, Storybook 모듈 12개, 브라우저/네트워크 없이 검증. 실제로 변환한 `Louise ↔ Hannah`는 가지 모티프, `Louise ↔ Louis`는 철자만 비슷한 무관계 사례다. 상한 검사는 별도 명시적 합성 ID fixture에서 수행하며 실제 아카이브에 넣지 않는다.
- 실제 공개 표식 34개의 561쌍을 읽기 전용으로 비교: 일부 가지 구조 공명 2쌍(표식 4개), 전체 형태 공명 0쌍, 잘못된 모델 0개. 전체 쌍에서 표시 이름을 바꿔도 연결·점수·이유가 불변이었다. 이는 이 표본의 관측이지 전체 아카이브/사람의 관계에 대한 결론이 아니다.
- 로컬 provider 중심 3개는 각 33개 후보에서 이웃 1/0/0개, 계산 버전 3, skipped 0. 공개 GET 4회, Edge/인증/쓰기 0회. 개발 서버 `/archive` 및 v3 계산 모듈 HTTP 200 확인.
- 수정 파일 ESLint, Edge Deno check, Vite production build, Storybook build 통과. 브라우저를 켜지 않았으므로 주석의 실제 픽셀 가독성과 클릭/포커스 체험을 검증했다고 주장하지 않는다.
- 후속 복구: `test-archive-motion.mjs` 5개 통과. 실제 App의 Lenis effect를 JS stub으로 실행해 아카이브 포함 6개 경로 초기화·route cleanup·감소 모션을 검증하고, 카드가 기존 형성 렌더러를 사용하는지 검사한다. 실제 스크롤 촉감/애니메이션 픽셀을 브라우저로 검증한 것은 아니다.
- `scripts/test-resonance.mjs`도 별도 문자 판정 코드를 제거하고 프론트와 같은 prepareArchiveGlyph/relateGlyphs v3를 호출한다. `node scripts/test-resonance.mjs Louise Hannah`로 네트워크 없이 부분 구조 공명과 실제 관측 좌표를 확인할 수 있다.

기본 Vitest 설정은 Playwright를 활성화하므로 실행하지 않았다. `check-agent-rules`는 현재 package script에 없어 실행할 수 없다. 스키마·RLS·Auth·운영 데이터·배포는 v3 수정에서 변경하지 않았다.

실제 모바일 Canvas 픽셀, 포커스 이동, 소프트 키보드/IME, 소셜 크롤러, OAuth 왕복, 운영 DB 동시성·부하는 아직 검증하지 않았다. 브라우저 확인은 사용자의 별도 명시적 요청이 필요하다. 빌드에는 기존 MDX 패턴·패키지 탐색·큰 chunk 경고가 남는다.

후속 제품 과제는 실제 형태 특징 기반 후보 인덱싱, 관측 지점의 시각 검수와 임계값 보정, 개인정보 최소화 전환 지표다. 원문 이름 사전이나 의미 추정을 형태 관계의 대체재로 도입하지 않는다.
