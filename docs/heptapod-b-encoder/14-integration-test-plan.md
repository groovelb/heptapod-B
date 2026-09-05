# Gate 6 — 통합 검증 계획

> 02-ux-flow.md 성공 기준 7개 + 게이트 1~5 산출물에서 파생된 검증 항목을 통합한다.
> 각 검증은 자동화 가능 여부를 표시하고, 수동 검증은 체크리스트로 제공한다.

---

## 1. 결정론 (Determinism)

같은 입력이 항상 같은 Glyph를 생성해야 한다.

| ID | 검증 항목 | 방법 | 자동화 |
|---|---|---|---|
| T-DET-01 | 동일 canonical name → 동일 fingerprint | `normalizeName` → `SHA-256` 단위 테스트, 100개 이상 고정 벡터 | ✅ Vitest |
| T-DET-02 | 동일 seed → 동일 model output | `buildModel(seed)` 스냅샷 비교 (v1, v2 각각) | ✅ Vitest |
| T-DET-03 | 대소문자·공백 변형 → 동일 canonical | `"Louise"`, `" louise "`, `"LOUISE"` → 같은 fingerprint | ✅ Vitest |
| T-DET-04 | 의문형 분리 정확성 | `"Hello?"` → body `"Hello"`, `isInterrogative: true` | ✅ Vitest |
| T-DET-05 | v1↔v2 격리 | v1 seed로 v2 model을 호출하지 않음, 버전 레지스트리 라우팅 테스트 | ✅ Vitest |
| T-DET-06 | 크로스 브라우저 일관성 | Chrome/Safari/Firefox에서 같은 이름으로 생성 → SVG diff | 🔧 수동 + Playwright |

---

## 2. 관계 점수 (Resonance Scoring)

알고리즘이 문서 명세(02-ux-flow.md §Resonance)와 일치해야 한다.

| ID | 검증 항목 | 방법 | 자동화 |
|---|---|---|---|
| T-REL-01 | FORM 가중치 검증 | `scoreFormRelation(A, B)` 결과를 수식 수동 계산과 비교 (5쌍) | ✅ Vitest |
| T-REL-02 | ECHO 가중치 검증 | `scoreEchoRelation(A, B)` + IDF 가중 bigram 수동 검산 | ✅ Vitest |
| T-REL-03 | CONTEXT Jaccard 검증 | 태그 공유 시나리오 10개, 일반 태그 제외 확인 | ✅ Vitest |
| T-REL-04 | CONTAINS 방향성 | `"ABBOT"` ⊂ `"ABBOT CHOOSES SAVE"` → 상위→부분 방향 확인 | ✅ Vitest |
| T-REL-05 | VARIANT 판정 | `"Hello"` vs `"Hello?"` → VARIANT, 같은 body+같은 의문형 → SAME | ✅ Vitest |
| T-REL-06 | 임계값 경계 | FORM=0.77 → 미연결, 0.78 → 연결. ECHO=0.71/0.72 동일 | ✅ Vitest |
| T-REL-07 | 노드당 상한 | FORM 6, ECHO 4, CONTEXT 3, CONTAINS 6 초과 시 잘림 | ✅ Vitest |
| T-REL-08 | 60% 유형 캡 | 12개 노출 중 한 유형이 8개 이상 되지 않음 | ✅ Vitest |
| T-REL-09 | 근거 문장 존재 | 모든 저장된 관계에 `reasons[]` 1~3개 + `algorithmVersion` | ✅ DB query |
| T-REL-10 | 기준 미달 강제 연결 없음 | 관계 0개인 Glyph → `FIRST OF ITS CONTOUR` 상태 확인 | ✅ Vitest |

---

## 3. RLS 사용자 권한 매트릭스

| ID | 역할 | glyphs 읽기 | contribution 쓰기 | 남의 contribution 삭제 | bookmark | report | 관계 쓰기 |
|---|---|---|---|---|---|---|---|
| T-RLS-01 | anon (비회원) | ✅ 공개만 | ❌ | ❌ | ❌ | ❌ | ❌ |
| T-RLS-02 | 사용자 A | ✅ 공개만 | ✅ 본인만 | ❌ | ✅ 본인만 | ✅ insert | ❌ |
| T-RLS-03 | 사용자 B | ✅ 공개만 | ✅ 본인만 | ❌ | ✅ 본인만 | ✅ insert | ❌ |
| T-RLS-04 | service_role | ✅ 전체 | ✅ 전체 | ✅ | ✅ 전체 | ✅ 전체 | ✅ |

**테스트 방법**: Supabase 테스트 환경에서 4개 역할로 각각 CRUD 시도. 금지된 작업이 403/RLS error 반환 확인.

| ID | 검증 시나리오 | 기대 결과 | 자동화 |
|---|---|---|---|
| T-RLS-05 | 사용자 A가 사용자 B의 contribution 삭제 시도 | 거부 | ✅ Supabase test |
| T-RLS-06 | anon이 publish 시도 | 거부 | ✅ Supabase test |
| T-RLS-07 | 사용자 A가 남의 bookmark 조회 시도 | 빈 결과 | ✅ Supabase test |
| T-RLS-08 | service_role이 관계 일괄 쓰기 | 성공 | ✅ Supabase test |

---

## 4. Canonical 중복 방지

| ID | 검증 항목 | 방법 | 자동화 |
|---|---|---|---|
| T-DUP-01 | 동일 canonical + version → 기존 Glyph에 합류 | `"Louise"` publish 후 `"louise"` publish → 같은 glyph_id | ✅ Integration |
| T-DUP-02 | DB UNIQUE 제약 | glyphs(fingerprint) unique 위반 시 upsert | ✅ SQL test |
| T-DUP-03 | 동시 publish race condition | 두 세션이 같은 이름을 동시 publish → 하나만 생성, 둘 다 합류 | 🔧 부하 테스트 |

---

## 5. 공개 취소 (Unpublish) Cascade

| ID | 검증 항목 | 기대 결과 | 자동화 |
|---|---|---|---|
| T-UNP-01 | 기여자 2명 중 1명 삭제 | Glyph 공개 유지, 삭제자 contribution만 제거 | ✅ Integration |
| T-UNP-02 | 마지막 기여자 삭제 | Glyph `is_public=false`, 지도에서 제거 | ✅ Integration |
| T-UNP-03 | 삭제된 Glyph의 관계 | 비공개 전환 시 관련 glyph_relations soft delete | ✅ DB query |
| T-UNP-04 | 다른 기여자 데이터 무영향 | 사용자 A 삭제 후 사용자 B의 contribution·bookmark 정상 조회 | ✅ Integration |
| T-UNP-05 | 삭제 후 재공개 | 같은 이름 재publish → 기존 Glyph 재활성 (soft delete 복원) | ✅ Integration |

---

## 6. 모바일 성능

| ID | 검증 항목 | 기준 | 방법 |
|---|---|---|---|
| T-MOB-01 | ResonanceMap 초기 노출 | ≤ 12 노드 | 코드 상수 확인 + 실측 |
| T-MOB-02 | ResonanceMap 프레임 레이트 | ≥ 30fps (pan/zoom 시) | Chrome DevTools Performance, 중급 Android |
| T-MOB-03 | GlyphNode 렌더 비용 | Canvas 2D 정적 모드, 파티클 없음 | `detectRenderTier` low → 정적 확인 |
| T-MOB-04 | 페이지 전환 지연 | < 300ms (SPA 라우팅) | Lighthouse / 수동 |
| T-MOB-05 | 터치 스크롤 Resonance Field | 가로 스크롤 간섭 없음, pull-to-refresh 충돌 없음 | 🔧 수동 (iOS Safari, Android Chrome) |
| T-MOB-06 | 가상 키보드 오프셋 | PublishDialog, LoginForm에서 입력 필드 가림 없음 | 🔧 수동 (--kb-offset 적용 확인) |

---

## 7. 접근성 (a11y)

| ID | 검증 항목 | 기준 | 자동화 |
|---|---|---|---|
| T-A11Y-01 | ResonanceList 대체 | `prefers-reduced-motion: reduce` → ResonanceMap 숨김, ResonanceList 표시 | ✅ Vitest + media query mock |
| T-A11Y-02 | 키보드 내비게이션 | ResonanceMap 노드 간 Tab/Arrow 이동, Enter로 선택 | 🔧 수동 |
| T-A11Y-03 | 스크린리더 관계 | 각 관계에 `aria-label` (유형 + 점수 + 근거 요약) | ✅ axe-core |
| T-A11Y-04 | 색상 대비 | WCAG AA (4.5:1 텍스트, 3:1 UI) — 다크 UI 위 `rgba(255,…)` 텍스트 | ✅ axe-core |
| T-A11Y-05 | 포커스 트랩 | PublishDialog, LoginForm 내 포커스 순환 | ✅ axe-core |
| T-A11Y-06 | 이미지 대체 텍스트 | GlyphNode에 `aria-label="[이름]의 로고그램"` | ✅ axe-core |

---

## 8. 인증 흐름 복귀

| ID | 검증 항목 | 기대 결과 | 자동화 |
|---|---|---|---|
| T-AUTH-01 | publish 중 인증 → 복귀 | sessionStorage에 Glyph 상태 저장 → 인증 완료 → 원래 Glyph + PublishDialog 복원 | 🔧 수동 (OAuth redirect) |
| T-AUTH-02 | 인증 실패/취소 | Glyph 상태 유지, 인코더 화면으로 복귀 | 🔧 수동 |
| T-AUTH-03 | 토큰 만료 중 publish | 자동 갱신 또는 재인증 유도 | ✅ Integration |
| T-AUTH-04 | publish 완료율 측정 | `publish_started` → `publish_completed` 이벤트 쌍 기록 가능 | ✅ Analytics hook 존재 확인 |

---

## 검증 실행 순서

구현 순서(13-component-specs.md §구현 순서 권장)에 맞춰 검증도 단계별로 진행:

| 구현 단계 | 해당 검증 |
|---|---|
| 1. 기반 (normalize, validate, supabase, auth) | T-DET-01~04, T-AUTH-01~04 |
| 2. 인증 (LoginForm, SignUpForm, AuthGuard) | T-RLS-01~08, T-A11Y-05 |
| 3. 공개 (TagInput, PublishDialog, usePublish) | T-DUP-01~03, T-UNP-01~05, T-A11Y-06 |
| 4. 관계 로직 (score*, buildReasons) | T-REL-01~10 |
| 5. 시각화 (GlyphNode, ResonanceMap, List, Inspector) | T-MOB-01~06, T-A11Y-01~04 |
| 6. 페이지 (Detail, Field, MyArchive) | T-DET-06, 전체 E2E |

---

## 자동화 커버리지 요약

| 구분 | 자동화 가능 | 수동 | 합계 |
|---|---|---|---|
| 결정론 | 5 | 1 | 6 |
| 관계 점수 | 10 | 0 | 10 |
| RLS | 8 | 0 | 8 |
| 중복 방지 | 2 | 1 | 3 |
| 공개 취소 | 5 | 0 | 5 |
| 모바일 성능 | 0 | 6 | 6 |
| 접근성 | 4 | 2 | 6 |
| 인증 흐름 | 2 | 2 | 4 |
| **합계** | **36** | **12** | **48** |

자동화율: **75%** — Vitest 단위 테스트 + Supabase integration 테스트로 핵심 로직을 커버하고, 모바일 성능과 OAuth 리디렉트는 수동 체크리스트로 보완.
