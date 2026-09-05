# Heptapod B — Data Bridge (Gate 3)

> **v3 관계 수정:** 현재 관계 입력은 저장 `model_data`뿐이다. 개발 snapshot 200개/API 최대 300개에서 FORM(전체/일부 구조)·실제 VARIANT를 계산한다. `observations`가 필터·비교 좌표·공유 이유의 공통 원천이며, 아래 문자·태그 관계 원안은 후속 계획이 아니라 폐기된 가정이다. 현재 계약은 `16-resonance-implementation.md` 참조.

> `02-ux-flow.md`의 데이터 모델 활용 표와 페이지 리스트를 기준으로 작성한 화면↔DB 생명주기 문서.
> 각 시나리오가 어떤 데이터를 언제·어디서 읽고 쓰는지, 권한은 누구에게 있고, 실패 시 어떻게 되는지를 정의한다.

> **2026-09-05 적용 주의:** 아래는 최초 설계다. 실제 구현은 `16-resonance-implementation.md`가 우선한다. `archive-publish`는 동의 후 익명 인증·서버 재생성·트랜잭션 RPC를 사용하고, 관계는 `archive-relations`가 현재 공개 표본에서 요청 시 계산한다. background queue/Realtime은 구현하지 않았다. 원문 이름을 포함한 신규 공유 URL은 만들지 않는다. 실제 컬럼은 `id/is_public/model_data/feature_vector/withdrawn_at`이며 `status/public_id`가 아니다.

---

## 1. 개요

### 아키텍처 경계

```text
┌─────────────────────────────────────┐
│         클라이언트 (React)           │
│  EncodeSession · LogogramModel      │
│  순수 로직 (encode, buildModel,     │
│  extractFeatures, scoreRelations)   │
├─────────────────────────────────────┤
│     Supabase Client (anon key)      │
│  Auth · PostgREST (RLS) · Realtime  │
├─────────────────────────────────────┤
│     Supabase Edge Function          │
│  publish 검증 · 관계 계산           │
│  (service_role, 프론트 비노출)      │
├─────────────────────────────────────┤
│     PostgreSQL + RLS                │
│  glyphs · glyph_contributions ·    │
│  glyph_relations · bookmarks ·     │
│  reports · profiles                 │
└─────────────────────────────────────┘
```

### 읽기/쓰기 주체 요약

| 데이터 | 클라이언트 읽기 | 클라이언트 쓰기 | Edge Function 쓰기 |
|---|---|---|---|
| `profiles` | 본인 전체, 타인 공개 필드 | 본인만 | 가입 트리거 (초기 생성) |
| `glyphs` | 공개 Glyph 누구나 | — | publish 검증 후 upsert |
| `glyph_contributions` | 공개 집계 누구나, 상세 본인 | — | publish 시 insert |
| `glyph_relations` | 공개 관계 누구나 | — | 관계 계산 로직만 |
| `bookmarks` | 본인만 | 본인만 | — |
| `reports` | 본인 + 운영자 | 본인 insert만 | 운영자 상태 변경 |

---

## 2. 시나리오별 데이터 흐름

### 시나리오 0: 히어로 인트로 진입

DB 호출 없음. 모든 데이터(영상, 오디오, 카피)는 정적 자산이다.

| 사용자 액션 | 프론트엔드 호출 | DB 오퍼레이션 | 권한 | 실패 시 |
|---|---|---|---|---|
| 랜딩 진입 | 정적 자산 로드 | 없음 | — | — |
| START 클릭 | AudioContext unlock | 없음 | — | — |
| 스크롤 스크러빙 | VideoScrubbing + SoundEngine | 없음 | — | — |
| SKIP INTRO | Lenis scrollTo(핸드오프) | 없음 | — | — |

### 시나리오 1: 이름 인코딩

DB 호출 없음. 모든 처리는 클라이언트에서 수행한다.

| 사용자 액션 | 프론트엔드 호출 | DB 오퍼레이션 | 권한 | 실패 시 |
|---|---|---|---|---|
| 이름 입력 | `EncodeSession` 로컬 상태 갱신 | 없음 | — | — |
| ENCODE 실행 | `canonicalize → validate → encode → buildModel` | 없음 | — | 지원 문자/길이 초과 → 입력 규칙 안내 |
| 로고그램 형성 | `LogogramModel` → 렌더러 | 없음 | — | 폴백 렌더러 (WebGL→Canvas→SVG) |
| 새 이름 입력 | `EncodeSession` 교체 | 없음 | — | — |

### 시나리오 2: 해독 과정 탐색 (분석 오버레이)

DB 호출 없음.

| 사용자 액션 | 프론트엔드 호출 | DB 오퍼레이션 | 권한 | 실패 시 |
|---|---|---|---|---|
| 분석 오버레이 ON | `AnalysisOverlay` 토글, 로컬 모델 참조 | 없음 | — | — |
| 오버레이 OFF | 토글 복귀 | 없음 | — | — |

### 시나리오 3: 표현 변형 (의문형 갈고리)

DB 호출 없음.

| 사용자 액션 | 프론트엔드 호출 | DB 오퍼레이션 | 권한 | 실패 시 |
|---|---|---|---|---|
| 의문형 토글 ON | `EncodeSession.isInterrogative = true`, 분리 시드 스트림으로 갈고리 추가 | 없음 | — | — |
| 토글 OFF | 갈고리 제거, 본체 유지 | 없음 | — | — |

### 시나리오 4: 로컬 저장 및 레거시 공유

DB 호출 없음.

| 사용자 액션 | 프론트엔드 호출 | DB 오퍼레이션 | 권한 | 실패 시 |
|---|---|---|---|---|
| SAVE (PNG) | `exportPng.js` → canvas toBlob → 다운로드 | 없음 | — | Canvas 미지원 시 안내 |
| SHARE (레거시 URL) | 이름 인코딩 URL 클립보드 복사 | 없음 | — | — |
| 공유 URL 진입 | 쿼리 디코딩 → 동일 모델 재현 | 없음 | — | — |

### 시나리오 5: Response 공개 (PUBLISH)

**핵심 쓰기 흐름.** 인증, 검증, 저장, 관계 계산이 순차로 진행된다.

| 사용자 액션 | 프론트엔드 호출 | DB 오퍼레이션 | 권한 | 실패 시 |
|---|---|---|---|---|
| PUBLISH 선택 | 인증 상태 확인 | `supabase.auth.getSession()` | — | — |
| (비인증) 로그인/가입 | Auth 오버레이 → `supabase.auth.signInWithPassword` / `signUp` / `signInWithOAuth` | `auth.users` insert (가입 시), `profiles` insert (트리거) | anon | 인증 실패 → 오류 표시, 인코더 상태 유지 |
| 공개 확인 (태그, 동의) | `PublishDialog` 표시 | 없음 | — | 취소 → 인코더 복귀 |
| 공개 동의 | Edge Function `publish-glyph` 호출 | 아래 참조 | authenticated | — |

#### Edge Function `publish-glyph` 내부 흐름

```text
1. 입력 검증
   - canonical name 재계산 (클라이언트와 동일 로직)
   - 지원 문자·길이·overflow 검증
   - encoder version 일치 확인
   - 모델 재생성 → 클라이언트 모델과 일치 검증

2. Glyph upsert
   - fingerprint = SHA-256(canonicalName + isInterrogative + encoderVersion)
   - SELECT FROM glyphs WHERE fingerprint = $1
   - 있으면 → 기존 glyph_id 사용
   - 없으면 → INSERT INTO glyphs (+ publicId 생성, features 추출, lineage 계산)

3. Contribution 생성
   - 동일 user + glyph 기존 contribution 확인
   - 이미 있으면 → 기존 상세로 redirect (중복 방지)
   - 없으면 → INSERT INTO glyph_contributions

4. 관계 계산 트리거 (비동기)
   - pg_notify 또는 별도 Edge Function 큐
   - 실패해도 publish 자체는 완료
```

| 단계 | DB 오퍼레이션 | 권한 |
|---|---|---|
| 입력 검증 | 없음 (순수 로직) | — |
| fingerprint 조회 | `SELECT FROM glyphs` | service_role |
| Glyph 생성 | `INSERT INTO glyphs` | service_role |
| 중복 contribution 확인 | `SELECT FROM glyph_contributions WHERE user_id AND glyph_id` | service_role |
| Contribution 생성 | `INSERT INTO glyph_contributions` | service_role |
| 관계 계산 큐 | `pg_notify('compute_relations', glyph_id)` | service_role |

| 실패 원인 | 처리 |
|---|---|
| 지원 문자/길이 초과 | 저장하지 않음, 입력 규칙 안내 |
| 모델 불일치 | 저장하지 않음, 재인코딩 유도 |
| 중복 contribution | 기존 Glyph 상세로 이동 |
| DB 오류 | 저장하지 않음, 재시도 안내 |
| 관계 계산 실패 | 공개는 유지, `MAPPING RESONANCE` 상태에서 재시도 |

### 시나리오 6: Resonance Field 탐색

읽기 전용. 비회원도 접근 가능.

| 사용자 액션 | 프론트엔드 호출 | DB 오퍼레이션 | 권한 | 실패 시 |
|---|---|---|---|---|
| `/map/:publicId` 진입 | `useGlyph(publicId)` | `SELECT FROM glyphs WHERE public_id = $1 AND status = 'published'` | anon (RLS) | Glyph 없음/숨김 → unavailable |
| 관계 로딩 | `useGlyphRelations(glyphId)` | `SELECT FROM glyph_relations WHERE (glyph_a_id = $1 OR glyph_b_id = $1) AND status = 'active'` | anon (RLS) | 관계 0개 → `FIRST OF ITS CONTOUR` |
| 이웃 노드 로딩 | `useGlyphs(neighborIds)` | `SELECT FROM glyphs WHERE id IN ($1...) AND status = 'published'` | anon (RLS) | 부분 실패 → 로딩된 노드만 표시 |
| 기여 수 조회 | `useContributionCount(glyphId)` | `SELECT count(*) FROM glyph_contributions WHERE glyph_id = $1 AND status = 'active'` | anon (RLS) | — |
| 관계 필터 | 클라이언트 필터링 (이미 로딩된 관계) | 없음 | — | — |
| 이웃 노드 선택 (중심 이동) | 새로운 `useGlyphRelations` 호출 | 위와 동일 | anon | 네트워크 실패 → 중심 캐시 유지, 관계 영역 재시도 |
| 관계 근거 열람 | `RelationInspector` 표시 (이미 로딩된 데이터) | 없음 | — | — |

### 시나리오 7: 공개 Glyph 상세 및 개인 아카이브

읽기(공개)와 쓰기(인증) 혼합.

| 사용자 액션 | 프론트엔드 호출 | DB 오퍼레이션 | 권한 | 실패 시 |
|---|---|---|---|---|
| `/glyph/:publicId` 진입 | `useGlyph(publicId)` | `SELECT FROM glyphs WHERE public_id AND status = 'published'` | anon | 숨김/삭제 → unavailable (이름·모델 비노출) |
| 기여 수 확인 | `useContributionCount(glyphId)` | `SELECT count(*)` | anon | — |
| 주요 Resonance 표시 | `useGlyphRelations(glyphId, {limit: 4})` | `SELECT FROM glyph_relations ... LIMIT 4` | anon | — |
| Bookmark 토글 | `useBookmark(glyphId)` | `INSERT / DELETE FROM bookmarks WHERE user_id AND glyph_id` | authenticated, 본인만 | 비인증 → 로그인 유도 |
| Report 제출 | `useReport(glyphId)` | `INSERT INTO reports` | authenticated | 비인증 → 로그인 유도 |
| opaque URL 복사 | 클립보드 복사 (`/glyph/:publicId`) | 없음 | — | — |

#### My Archive (`/me`)

| 사용자 액션 | 프론트엔드 호출 | DB 오퍼레이션 | 권한 | 실패 시 |
|---|---|---|---|---|
| `/me` 진입 | `useMyContributions()` | `SELECT gc.*, g.* FROM glyph_contributions gc JOIN glyphs g ON gc.glyph_id = g.id WHERE gc.user_id = auth.uid() AND gc.status = 'active'` | authenticated, 본인만 | 비인증 → 로그인 redirect |
| Bookmark 목록 | `useMyBookmarks()` | `SELECT b.*, g.* FROM bookmarks b JOIN glyphs g ON b.glyph_id = g.id WHERE b.user_id = auth.uid()` | authenticated, 본인만 | — |
| 프로필 수정 | `useUpdateProfile()` | `UPDATE profiles SET ... WHERE id = auth.uid()` | authenticated, 본인만 | — |

#### Unpublish (공개 취소)

| 단계 | DB 오퍼레이션 | 권한 | 후속 처리 |
|---|---|---|---|
| Contribution 삭제 | `DELETE FROM glyph_contributions WHERE id = $1 AND user_id = auth.uid()` | authenticated, 본인만 | — |
| 마지막 기여 확인 | `SELECT count(*) FROM glyph_contributions WHERE glyph_id = $1 AND status = 'active'` | service_role (트리거) | — |
| count = 0 → Glyph 비공개 | `UPDATE glyphs SET status = 'archived' WHERE id = $1` | service_role (트리거) | — |
| 관계 정리 | `UPDATE glyph_relations SET status = 'archived' WHERE glyph_a_id = $1 OR glyph_b_id = $1` | service_role (트리거) | — |

> Unpublish의 마지막 기여 확인 → Glyph 비공개 → 관계 정리는 DB 트리거 또는 Edge Function에서 처리한다. 클라이언트는 자신의 contribution만 삭제 요청하고, cascade는 서버가 처리한다.

### 시나리오 8: 제작 비하인드

읽기 전용. 정적 콘텐츠 + 공개 관계 예시.

| 사용자 액션 | 프론트엔드 호출 | DB 오퍼레이션 | 권한 | 실패 시 |
|---|---|---|---|---|
| `/story` 진입 | 정적 에세이 콘텐츠 로드 | 없음 | — | — |
| 관계 예시 표시 | `useExampleRelations()` | `SELECT FROM glyph_relations ... LIMIT N` (큐레이트된 예시) | anon | 실패 → 예시 없이 텍스트만 |

---

## 3. Hooks 인터페이스 설계

`src/hooks/data/` 아래에 Supabase client를 주입받는 React hooks를 배치한다.

### Auth

```text
useAuth()
  - session, user, loading
  - signIn(email, password)
  - signUp(email, password)
  - signInWithOAuth(provider)
  - signOut()
```

### Glyph

```text
useGlyph(publicId)
  - glyph, loading, error
  - 공개 Glyph 단건 조회

useGlyphs(ids)
  - glyphs, loading, error
  - 복수 Glyph 조회 (Resonance Field 이웃 노드용)

usePublishGlyph()
  - publish(encodeSession, contextTags)
  - Edge Function 호출 → 결과 반환
  - loading, error, publishedGlyph
```

### Relation

```text
useGlyphRelations(glyphId, options?)
  - relations, loading, error
  - options: { types?, limit? }

useExampleRelations()
  - 큐레이트된 관계 예시 (The Real Story 용)
```

### Contribution

```text
useContributionCount(glyphId)
  - count, loading

useMyContributions()
  - contributions (joined with glyphs), loading, error

useUnpublish()
  - unpublish(contributionId)
  - Edge Function 호출 → cascade 서버 처리
```

### Bookmark

```text
useBookmark(glyphId)
  - isBookmarked, toggle(), loading

useMyBookmarks()
  - bookmarks (joined with glyphs), loading, error
```

### Report

```text
useReport(glyphId)
  - submit(reason), loading, error
```

### Profile

```text
useProfile()
  - profile, loading

useUpdateProfile()
  - update(fields), loading, error
```

---

## 4. Edge Function 목록

| Function | 트리거 | 입력 | 출력 | service_role 사용 |
|---|---|---|---|---|
| `publish-glyph` | 클라이언트 POST | `{ displayName, canonicalName, isInterrogative, encoderVersion, model, contextTags }` | `{ glyphId, publicId, isNew }` | Yes — Glyph upsert, Contribution insert |
| `compute-relations` | `pg_notify` 또는 publish 후 비동기 호출 | `{ glyphId }` | `{ relationsCreated }` | Yes — 후보 검색, 점수 계산, Relation insert |
| `unpublish-contribution` | 클라이언트 POST | `{ contributionId }` | `{ success, glyphArchived }` | Yes — Contribution 삭제, 마지막 기여 시 cascade |

---

## 5. 실시간 구독 (선택)

| 채널 | 용도 | 구현 시점 |
|---|---|---|
| `glyph_relations:glyph_id=eq.$1` | publish 후 관계 계산 완료 시 Resonance Field 실시간 갱신 | 관계 계산 비동기 처리 이후 |
| `glyphs:status` | 운영 숨김 시 실시간 반영 | 운영 도구 구현 이후 |

---

## 6. 캐싱 전략

| 데이터 | 캐시 위치 | TTL / 무효화 |
|---|---|---|
| 공개 Glyph 단건 | React Query | staleTime 5분, publish/unpublish 시 invalidate |
| Resonance Field (관계 + 이웃) | React Query | staleTime 5분, 중심 이동 시 새 쿼리 |
| 내 contributions | React Query | publish/unpublish 시 invalidate |
| 내 bookmarks | React Query | toggle 시 optimistic update + invalidate |
| contribution count | React Query | staleTime 10분 |
