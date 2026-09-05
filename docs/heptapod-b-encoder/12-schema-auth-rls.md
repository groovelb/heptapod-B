# Heptapod B — Schema / Auth / RLS (Gate 4)

> **v3 관계 수정:** 아래 enum/SQL은 과거 설계이며 그대로 실행하지 않는다. v3는 기존 FORM/VARIANT와 JSON evidence/score_components를 사용하고 ECHO/CONTAINS/CONTEXT는 현재 관계 응답에서 제외한다. 기존 행 삭제·enum 제거·원격 마이그레이션 없이 실제 모델로 다시 계산한다. 아래 문자 관계 알고리즘은 폐기된 가정이다. 현재 계약은 `16-resonance-implementation.md` 참조.

> `02-ux-flow.md`의 데이터 모델과 `11-data-bridge.md`의 CRUD 흐름을 기반으로 작성한 Supabase 스키마·인증·RLS 설계 문서.

> **2026-09-05 적용 주의:** 아래 SQL은 최초 설계이며 migration으로 실행하지 않는다. 실제 스키마는 `supabase/migrations`가 기준이다. 신규 구현 migration은 `20260905120000_verified_archive_publication.sql`. owner/consent/soft withdrawal/직접 쓰기 차단 및 서비스 전용 RPC를 적용한다. `public_id/status/profiles` 설계를 이번에 추가한 것은 아니다. 실제 데이터 계약과 운영 적용 주의는 `16-resonance-implementation.md` 참조.

---

## 1. SQL Schema

### 1.1 Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- 향후 ECHO 후보 검색 가속용
```

### 1.2 Custom Types

```sql
CREATE TYPE glyph_status AS ENUM ('published', 'hidden', 'archived');
CREATE TYPE contribution_status AS ENUM ('active', 'withdrawn');
CREATE TYPE relation_type AS ENUM ('SAME', 'VARIANT', 'CONTAINS', 'FORM', 'ECHO', 'CONTEXT');
CREATE TYPE relation_status AS ENUM ('active', 'archived', 'recomputing');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');
CREATE TYPE contour_cluster AS ENUM ('WISP', 'HOOK', 'BLOB', 'SPIKE');
CREATE TYPE contour_quadrant AS ENUM ('Crown', 'Wake', 'Root', 'Veil');
```

### 1.3 profiles

```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle        TEXT UNIQUE,
  display_name  TEXT,
  avatar_url    TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS '사용자 공개 프로필. auth.users와 1:1. 이메일·provider 등 Auth 정보를 포함하지 않는다.';
```

### 1.4 glyphs

```sql
CREATE TABLE glyphs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id         TEXT NOT NULL UNIQUE,
  display_name      TEXT NOT NULL,
  canonical_name    TEXT NOT NULL,
  fingerprint       TEXT NOT NULL UNIQUE,
  is_interrogative  BOOLEAN NOT NULL DEFAULT FALSE,
  encoder_version   TEXT NOT NULL,
  model             JSONB NOT NULL,
  features          JSONB,
  contour_cluster   contour_cluster,
  contour_quadrant  contour_quadrant,
  status            glyph_status NOT NULL DEFAULT 'published',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_glyphs_fingerprint ON glyphs (fingerprint);
CREATE INDEX idx_glyphs_public_id ON glyphs (public_id);
CREATE INDEX idx_glyphs_canonical_name ON glyphs (canonical_name);
CREATE INDEX idx_glyphs_status ON glyphs (status) WHERE status = 'published';
CREATE INDEX idx_glyphs_contour ON glyphs (contour_cluster, contour_quadrant) WHERE status = 'published';

COMMENT ON TABLE glyphs IS '공개 언어 단위. 같은 fingerprint는 하나의 노드로 병합된다.';
COMMENT ON COLUMN glyphs.fingerprint IS 'SHA-256(canonicalName + isInterrogative + encoderVersion)';
COMMENT ON COLUMN glyphs.public_id IS '공개 URL용 opaque ID. 이름을 URL에 노출하지 않는다.';
COMMENT ON COLUMN glyphs.model IS '직렬화된 LogogramModel. 결정론적 재현용.';
COMMENT ON COLUMN glyphs.features IS '관계 계산용 GlyphFeature (harmonics, gapState, strand, weightSlot, clusters, nfd/grapheme tokens).';
```

### 1.5 glyph_contributions

```sql
CREATE TABLE glyph_contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  glyph_id        UUID NOT NULL REFERENCES glyphs(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_display_name TEXT NOT NULL,
  context_tags    TEXT[] DEFAULT '{}',
  status          contribution_status NOT NULL DEFAULT 'active',
  consented_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_glyph UNIQUE (user_id, glyph_id),
  CONSTRAINT chk_context_tags_max CHECK (array_length(context_tags, 1) IS NULL OR array_length(context_tags, 1) <= 3)
);

CREATE INDEX idx_contributions_glyph ON glyph_contributions (glyph_id) WHERE status = 'active';
CREATE INDEX idx_contributions_user ON glyph_contributions (user_id) WHERE status = 'active';

COMMENT ON TABLE glyph_contributions IS '사용자와 Glyph의 N:M 연결. 같은 user+glyph는 1개만 허용.';
COMMENT ON COLUMN glyph_contributions.original_display_name IS '사용자가 실제 입력한 원래 표기. canonical name과 다를 수 있다.';
COMMENT ON COLUMN glyph_contributions.context_tags IS '정체성·기억·감각·의도 범주의 제한 태그 최대 3개.';
```

### 1.6 glyph_relations

```sql
CREATE TABLE glyph_relations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  glyph_a_id          UUID NOT NULL REFERENCES glyphs(id) ON DELETE CASCADE,
  glyph_b_id          UUID NOT NULL REFERENCES glyphs(id) ON DELETE CASCADE,
  relation_type       relation_type NOT NULL,
  score               REAL NOT NULL CHECK (score >= 0 AND score <= 1),
  score_components    JSONB NOT NULL DEFAULT '{}',
  reasons             TEXT[] NOT NULL DEFAULT '{}',
  is_directed         BOOLEAN NOT NULL DEFAULT FALSE,
  algorithm_version   TEXT NOT NULL,
  status              relation_status NOT NULL DEFAULT 'active',
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_relation_pair UNIQUE (glyph_a_id, glyph_b_id, relation_type),
  CONSTRAINT chk_no_self_relation CHECK (glyph_a_id <> glyph_b_id),
  CONSTRAINT chk_reasons_nonempty CHECK (array_length(reasons, 1) >= 1 AND array_length(reasons, 1) <= 3)
);

CREATE INDEX idx_relations_glyph_a ON glyph_relations (glyph_a_id) WHERE status = 'active';
CREATE INDEX idx_relations_glyph_b ON glyph_relations (glyph_b_id) WHERE status = 'active';
CREATE INDEX idx_relations_type ON glyph_relations (relation_type) WHERE status = 'active';

COMMENT ON TABLE glyph_relations IS '두 공개 Glyph 사이의 설명 가능한 관계. 생성·갱신은 서버 관계 계산 로직만 수행.';
COMMENT ON COLUMN glyph_relations.is_directed IS 'CONTAINS만 true (상위→부분). 나머지는 false (무방향).';
COMMENT ON COLUMN glyph_relations.score_components IS '점수 구성요소 (ringScore, clusterPairScore 등).';
COMMENT ON COLUMN glyph_relations.reasons IS '사용자용 근거 문장 1~3개.';
```

### 1.7 bookmarks

```sql
CREATE TABLE bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  glyph_id    UUID NOT NULL REFERENCES glyphs(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_bookmark UNIQUE (user_id, glyph_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks (user_id);

COMMENT ON TABLE bookmarks IS '사용자와 공개 Glyph의 비공개 N:M 연결.';
```

### 1.8 reports

```sql
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  glyph_id    UUID NOT NULL REFERENCES glyphs(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  status      report_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_reports_glyph ON reports (glyph_id);
CREATE INDEX idx_reports_status ON reports (status) WHERE status = 'pending';

COMMENT ON TABLE reports IS '공개 UGC 신고. 신고자와 운영자만 상세 열람.';
```

---

## 2. DB Triggers & Functions

### 2.1 프로필 자동 생성

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### 2.2 Contribution 삭제 시 cascade

```sql
CREATE OR REPLACE FUNCTION handle_contribution_withdrawal()
RETURNS TRIGGER AS $$
DECLARE
  remaining_count INTEGER;
BEGIN
  IF NEW.status = 'withdrawn' AND OLD.status = 'active' THEN
    SELECT count(*) INTO remaining_count
    FROM glyph_contributions
    WHERE glyph_id = NEW.glyph_id AND status = 'active' AND id <> NEW.id;

    IF remaining_count = 0 THEN
      UPDATE glyphs SET status = 'archived', updated_at = now()
      WHERE id = NEW.glyph_id;

      UPDATE glyph_relations SET status = 'archived'
      WHERE (glyph_a_id = NEW.glyph_id OR glyph_b_id = NEW.glyph_id)
        AND status = 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_contribution_status_change
  AFTER UPDATE OF status ON glyph_contributions
  FOR EACH ROW
  EXECUTE FUNCTION handle_contribution_withdrawal();
```

### 2.3 updated_at 자동 갱신

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON glyphs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 3. RLS Policies

모든 테이블에 RLS를 활성화한다.

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE glyphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE glyph_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE glyph_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
```

### 3.1 profiles

```sql
-- 공개 프로필 필드는 누구나 읽기
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  USING (true);

-- 본인만 수정
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT/DELETE는 트리거 또는 Auth에서만 (서비스 역할)
```

### 3.2 glyphs

```sql
-- 공개 Glyph는 누구나 읽기
CREATE POLICY "glyphs_select_published"
  ON glyphs FOR SELECT
  USING (status = 'published');

-- INSERT/UPDATE/DELETE는 service_role만 (Edge Function)
-- 클라이언트 직접 쓰기 없음
```

### 3.3 glyph_contributions

```sql
-- 공개 기여 집계는 누구나 읽기 (활성 기여만)
CREATE POLICY "contributions_select_active"
  ON glyph_contributions FOR SELECT
  USING (status = 'active');

-- 본인 기여 상세는 본인도 읽기 (withdrawn 포함)
CREATE POLICY "contributions_select_own"
  ON glyph_contributions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE는 service_role만 (Edge Function)
-- 클라이언트는 unpublish Edge Function을 통해 status를 withdrawn으로 변경
```

### 3.4 glyph_relations

```sql
-- 활성 관계는 누구나 읽기
CREATE POLICY "relations_select_active"
  ON glyph_relations FOR SELECT
  USING (status = 'active');

-- INSERT/UPDATE/DELETE는 service_role만 (관계 계산 Edge Function)
```

### 3.5 bookmarks

```sql
-- 본인 bookmark만 읽기
CREATE POLICY "bookmarks_select_own"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

-- 본인만 생성
CREATE POLICY "bookmarks_insert_own"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인만 삭제
CREATE POLICY "bookmarks_delete_own"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);
```

### 3.6 reports

```sql
-- 본인 신고만 읽기 (운영자는 service_role로 접근)
CREATE POLICY "reports_select_own"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- 로그인 사용자만 신고 생성
CREATE POLICY "reports_insert_auth"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- UPDATE는 service_role만 (운영자 상태 변경)
```

### RLS 권한 매트릭스 요약

| 테이블 | anon SELECT | auth SELECT | auth INSERT | auth UPDATE | auth DELETE | service_role |
|---|---|---|---|---|---|---|
| profiles | 공개 필드 | 공개 필드 + 본인 | (트리거) | 본인만 | — | 전체 |
| glyphs | published만 | published만 | — | — | — | 전체 |
| glyph_contributions | active만 | active + 본인 withdrawn | — | — | — | 전체 |
| glyph_relations | active만 | active만 | — | — | — | 전체 |
| bookmarks | — | 본인만 | 본인만 | — | 본인만 | 전체 |
| reports | — | 본인만 | 본인만 | — | — | 전체 |

---

## 4. Edge Function 경계

클라이언트에 service_role을 노출하지 않는다. 아래 로직은 반드시 서버(Edge Function 또는 DB 함수)에서 실행한다.

### 4.1 `publish-glyph`

```text
서버에서 실행해야 하는 이유:
- fingerprint 생성 (SHA-256 — 클라이언트 조작 방지)
- canonical name 재검증 (클라이언트와 동일 로직이지만 서버가 최종 판정)
- LogogramModel 재생성 후 클라이언트 모델과 비교 (결정론 검증)
- Glyph upsert (중복 fingerprint 검사 + 원자적 insert)
- Contribution insert (unique constraint 보장)
- public_id 생성 (opaque, 예측 불가)

입력: { displayName, canonicalName, isInterrogative, encoderVersion, model, contextTags, authToken }
검증:
  1. authToken → Supabase Auth 세션 검증
  2. canonicalize(displayName) === canonicalName 확인
  3. validate(canonicalName) — 지원 문자, 최대 길이
  4. SHA-256(canonicalName + isInterrogative + encoderVersion) === fingerprint
  5. encode(canonicalName) → buildModel() → 클라이언트 model과 비교
출력: { glyphId, publicId, isNew, error? }
```

### 4.2 `compute-relations`

```text
서버에서 실행해야 하는 이유:
- 전체 아카이브 대상 후보 검색 (feature vector 유사도)
- score 계산에 아카이브 전체 IDF 통계 필요
- 관계 쓰기는 service_role만 가능
- publish와 분리된 비동기 처리 (실패해도 publish 유지)

입력: { glyphId }
처리:
  1. glyphs에서 대상 Glyph의 features 로드
  2. feature vector로 최대 50개 후보 검색
  3. SAME → VARIANT → CONTAINS 순 판정
  4. 나머지에 FORM · ECHO · CONTEXT 독립 계산
  5. 임계값 (FORM ≥ 0.78, ECHO ≥ 0.72) + 상한 (FORM 6, ECHO 4, CONTEXT 3, CONTAINS 6) 적용
  6. glyph_relations INSERT (ON CONFLICT 시 score 갱신)
출력: { relationsCreated, relationsUpdated }
```

### 4.3 `unpublish-contribution`

```text
서버에서 실행해야 하는 이유:
- contribution 소유권 검증 후 status 변경
- 마지막 기여 시 cascade (Glyph 비공개 + 관계 정리)를 DB 트리거로 원자적 처리
- 다른 사용자의 contribution에 영향 없음을 보장

입력: { contributionId, authToken }
검증: contribution.user_id === auth.uid()
처리:
  1. UPDATE glyph_contributions SET status = 'withdrawn'
  2. DB 트리거가 cascade 판단 (handle_contribution_withdrawal)
출력: { success, glyphArchived }
```

---

## 5. Auth Flow

### 5.1 Supabase Auth 설정

| 항목 | 설정 |
|---|---|
| 이메일/비밀번호 | 활성 (기본) |
| Google OAuth | 활성 (소셜 로그인) |
| 이메일 확인 | 활성 (가입 시 확인 이메일 발송) |
| 세션 만료 | 7일 (리프레시 토큰 자동 갱신) |

### 5.2 Publish 시점 인증 흐름

```text
1. 사용자가 PUBLISH TO ARCHIVE 선택
2. 클라이언트: supabase.auth.getSession() 확인
3-A. 세션 있음 → PublishDialog로 직행
3-B. 세션 없음 → Auth 오버레이 표시
   - 현재 EncodeSession (이름, 모델, 태그 draft)을 로컬 상태에 보존
   - 이메일/비밀번호 또는 Google OAuth 선택

4. OAuth 인증의 경우:
   - redirectTo: 현재 URL + ?publish_intent=true
   - 리다이렉트 복귀 시 publish_intent 쿼리 감지
   - 보존된 EncodeSession 복원 → PublishDialog로 진행

5. 이메일/비밀번호 인증의 경우:
   - 인증 성공 시 오버레이 닫힘 → PublishDialog로 진행
   - 실패 시 오류 표시, 재시도 가능

6. 인증 취소:
   - 오버레이 닫힘 → 인코더 상태 복귀
   - EncodeSession 유지 (로컬 결과 손실 없음)
```

### 5.3 인증이 필요한 액션

| 액션 | 시점 | 실패 시 |
|---|---|---|
| PUBLISH TO ARCHIVE | 공개 동의 직전 | Auth 오버레이 → 인증 후 복귀 |
| Bookmark 토글 | 토글 클릭 | 로그인 유도 toast |
| Report 제출 | 제출 클릭 | 로그인 유도 toast |
| Unpublish (공개 취소) | 삭제 확인 | 이미 인증 상태 (My Archive 접근 전제) |
| My Archive 진입 | `/me` 라우팅 | 로그인 페이지 redirect |
| 프로필 수정 | 수정 클릭 | 이미 인증 상태 |

### 5.4 보안 고려사항

- `anon` key만 클라이언트에 노출. `service_role` key는 Edge Function 환경 변수에만 존재.
- 공개 프로필에 이메일·인증 provider를 포함하지 않는다.
- RLS가 모든 테이블에 활성화되어 있으므로 API 직접 호출도 정책을 통과해야 한다.
- Edge Function은 요청의 Authorization 헤더에서 JWT를 검증하고 `auth.uid()`를 추출한다.
- publish 시 서버가 모델을 재생성하여 클라이언트 조작을 방지한다.

---

## 6. 마이그레이션 전략

각 단계를 독립 마이그레이션으로 작성하여 롤백 가능하게 한다.

| 순서 | 마이그레이션 | 의존성 |
|---|---|---|
| 001 | Custom types (ENUMs) | — |
| 002 | profiles + 트리거 | 001 |
| 003 | glyphs | 001 |
| 004 | glyph_contributions | 001, 002, 003 |
| 005 | glyph_relations | 001, 003 |
| 006 | bookmarks | 002, 003 |
| 007 | reports | 001, 002, 003 |
| 008 | RLS policies (전체) | 002~007 |
| 009 | DB triggers (cascade, updated_at) | 003, 004, 005 |
| 010 | Indexes (성능 최적화) | 003~007 |
