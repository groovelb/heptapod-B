# Heptapod B — Response Archive 컴포넌트 인터페이스 스펙

> **v3 형태 공명 수정:** ECHO/CONTAINS/CONTEXT와 문자 밑줄·문자 필터는 현재 UI에서 제외한다. 실제 `observations`의 가지/개구부/잉크/링을 필터링하고 Pair/Inspector에서 대응 좌표를 같은 번호로 보여 준다. 아래 문자 관계 표면은 후속 계획이 아니라 폐기된 원안이다. 현재 props/흐름은 `16-resonance-implementation.md` 참조.

> Gate 5 산출물. `02-ux-flow.md`의 컴포넌트 리스트를 상태별 UI spec으로 확장한다.
> 각 컴포넌트는 프로젝트 톤앤매너(`03-visual-direction.md`)를 따른다: **다크 UI + 라이트 챔버, 순수 모노크롬, 느린 페이싱(600~1200ms), 여백이 곧 연출.**

> **2026-09-05 실제 컴포넌트 계약:** `15-resonance-implementation-plan.md`의 Presentation/Data 인터페이스 및 `16-resonance-implementation.md`가 우선한다. 공개 흐름은 LoginForm 대신 PublishDialog의 명시적 동의 후 익명 세션을 확보한다. `GlyphPairComparison`, 비교 페이지, `/me`를 추가했고, 모든 페이지는 `{ client }`로 주입한 mock stories를 제공한다. 노드 선택/중심 이동은 분리하며 static Canvas는 실제 입자 기하를 사용한다. 아래 AuthForm/bookmark/report 등 미구현 항목은 후속 설계다.

---

## 톤앤매너 공통 규칙

모든 신규 컴포넌트에 적용:

- **색상**: `background.default`(#0c100f), `background.paper`(#131715), `text.primary`(#e8ecec), `text.secondary`(#8a9694). 유채색 전면 배제 — 경고/에러도 명도 차와 텍스트 라벨로 구분
- **타이포**: 본문 Pretendard 300~400, 데이터/라벨 JetBrains Mono 11~13px (`theme.typography.custom?.mono` ‖ `MONO_FALLBACK`), 영문 헤드라인 Outfit 300 uppercase letter-spacing 0.25em
- **모션**: 등장 600~1200ms ease-out, `prefers-reduced-motion` 시 전부 정적
- **간격**: 8px 단위. 섹션 수직 패딩 `py: 12~20`. borderRadius: 0
- **반응형**: 모바일에서도 챔버 정방형 유지, 리드아웃 하단 접이식
- **그림자**: elevation은 표면 밝기 미세 차등으로. 네온 글로우/과한 글로우 금지

---

## 신규 컴포넌트

---

### 1. PublishDialog

- **카테고리**: `src/components/overlay-feedback/PublishDialog.jsx`
- **역할**: Response 공개 전 데이터·태그·삭제 규칙을 확인하고 명시적 동의를 받는 다이얼로그

**Props 인터페이스**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `isOpen` | boolean | O | — | 다이얼로그 열림 상태 |
| `onClose` | function | O | — | 닫기/취소 콜백 |
| `onConfirm` | function | O | — | 공개 동의 콜백 `(publishData) => void` |
| `displayName` | string | O | — | 사용자가 입력한 표시 이름 |
| `canonicalName` | string | O | — | 정규화된 이름 (표시용) |
| `isInterrogative` | boolean | X | false | 의문형 갈고리 포함 여부 |
| `model` | object | O | — | 현재 `LogogramModel` (프리뷰 렌더용) |
| `tags` | string[] | X | [] | 선택된 context 태그 |
| `onTagsChange` | function | O | — | 태그 변경 콜백 `(tags[]) => void` |
| `isLoading` | boolean | X | false | 서버 검증 중 로딩 상태 |
| `error` | string\|null | X | null | 검증 실패 메시지 |

**주요 상태(States)**:

| 상태 | 트리거 | 시각적 변화 |
|---|---|---|
| `idle` | 다이얼로그 열림 | 이름·로고그램 프리뷰 + 태그 선택 + 삭제 규칙 안내 표시 |
| `tagging` | 태그 영역 포커스 | TagInput(허용 목록 모드) 활성 — 최대 3개 |
| `confirming` | 동의 체크박스 선택 | PUBLISH 버튼 활성화 |
| `loading` | PUBLISH 클릭 | 버튼 스피너(모노크롬), 입력 비활성 |
| `error` | 서버 검증 실패 | 에러 라벨 표시(명도 대비 + `WARNING:` 접두), 입력 재활성 |

**접근성**:
- MUI `Dialog` 기반 — `aria-labelledby`, `aria-describedby` 자동
- Escape로 닫기, Tab 순서: 태그 → 체크박스 → 취소 → PUBLISH
- 스크린리더: "공개할 이름: {displayName}, 태그 {n}개 선택됨" 안내

**의존 컴포넌트**: `Dialog`(MUI), `TagInput`(수정 — 허용 목록 모드), `LogogramRendererCanvas`(프리뷰), `FadeTransition`

**데이터 소스**: 부모(`HeptapodEncoderPage`)로부터 props 주입. 서버 검증은 부모가 `onConfirm` 내에서 처리 후 `isLoading`/`error` 반영

**UI 가이드라인**: 다이얼로그 배경 `background.paper`, 로고그램 프리뷰는 축소 사이즈(120~160px). 공개 범위 안내 문구는 `text.secondary` 모노스페이스로 군사 보고서 톤. "이 이름과 로고그램이 공개됩니다" 명시

---

### 2. LoginForm

- **카테고리**: `src/components/input/LoginForm.jsx`
- **역할**: 이메일/비밀번호 또는 소셜 로그인 입력 폼

**Props 인터페이스**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `onSuccess` | function | O | — | 인증 성공 콜백 `(user) => void` |
| `onSwitchToSignUp` | function | O | — | 가입 폼 전환 콜백 |
| `isLoading` | boolean | X | false | 인증 진행 중 |
| `error` | string\|null | X | null | 인증 에러 메시지 |
| `sx` | object | X | {} | 추가 스타일 |

**주요 상태(States)**:

| 상태 | 트리거 | 시각적 변화 |
|---|---|---|
| `idle` | 초기 | 이메일/비밀번호 필드 + 소셜 버튼 표시 |
| `validating` | 입력 중 | 실시간 이메일 형식 검증 (틀리면 `text.secondary`로 안내, 유채색 없음) |
| `submitting` | 로그인 클릭 | 버튼 비활성 + 모노크롬 스피너 |
| `error` | 인증 실패 | 에러 텍스트 `text.primary` 고명도 + `AUTH ERROR:` 라벨 |

**접근성**:
- `aria-label="로그인 폼"`, 필드별 `aria-describedby`
- Enter로 제출, Tab 순서: 이메일 → 비밀번호 → 로그인 → 소셜 → 가입 전환

**의존 컴포넌트**: `TextField`(MUI), `Button`(MUI), `FadeTransition`

**데이터 소스**: `useAuth()` 훅 (Supabase Auth — `src/hooks/data/useAuth.js`)

**UI 가이드라인**: 최소한의 필드만. 소셜 로그인 버튼도 모노크롬(로고 없이 텍스트만). 배경 `background.default`, 필드 테두리 `divider`(rgba(232,236,236,0.08)). "UI는 로고그램의 들러리" 원칙 — 인증 폼도 최소·절제

---

### 3. SignUpForm

- **카테고리**: `src/components/input/SignUpForm.jsx`
- **역할**: 신규 계정 생성 폼

**Props 인터페이스**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `onSuccess` | function | O | — | 가입 성공 콜백 `(user) => void` |
| `onSwitchToLogin` | function | O | — | 로그인 폼 전환 콜백 |
| `isLoading` | boolean | X | false | 가입 진행 중 |
| `error` | string\|null | X | null | 가입 에러 메시지 |
| `sx` | object | X | {} | 추가 스타일 |

**주요 상태(States)**:

| 상태 | 트리거 | 시각적 변화 |
|---|---|---|
| `idle` | 초기 | 이메일/비밀번호/확인 필드 + 표시 이름(선택) |
| `validating` | 입력 중 | 비밀번호 강도 표시(밝기 4단계 바, 모노크롬), 이메일 형식 확인 |
| `submitting` | 가입 클릭 | 버튼 비활성 + 스피너 |
| `verifying` | 이메일 인증 대기 | "확인 이메일을 보냈습니다" 안내 |
| `error` | 가입 실패 | 에러 라벨 |

**접근성**: LoginForm과 동일 패턴. Tab 순서에 표시 이름·비밀번호 확인 추가

**의존 컴포넌트**: `TextField`(MUI), `Button`(MUI), `FadeTransition`

**데이터 소스**: `useAuth()` 훅

**UI 가이드라인**: LoginForm과 동일 톤. 비밀번호 강도 바는 4칸 `divider` 색 → `text.secondary` → `text.primary` 3단계 밝기

---

### 4. AuthGuard

- **카테고리**: `src/components/templates/AuthGuard.jsx`
- **역할**: 인증 필요 표면을 감싸는 래퍼. 비로그인 시 인증 오버레이를 띄우고, 인증 후 원래 문맥으로 복귀

**Props 인터페이스**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `children` | node | O | — | 보호 대상 컨텐츠 |
| `fallback` | node | X | null | 인증 전 대체 표시 (null이면 인증 오버레이 자동) |
| `onAuthComplete` | function | X | — | 인증 완료 시 추가 콜백 |
| `returnContext` | object | X | null | 인증 후 복귀할 문맥 (publish draft 등) |

**주요 상태(States)**:

| 상태 | 트리거 | 시각적 변화 |
|---|---|---|
| `authenticated` | 세션 존재 | children 렌더 |
| `unauthenticated` | 세션 없음 | fallback 또는 인증 오버레이(LoginForm/SignUpForm 전환) |
| `loading` | 세션 확인 중 | 빈 화면 (깜박임 방지 — FadeTransition으로 등장) |
| `returning` | 인증 직후 | returnContext 복원 → children 렌더 + onAuthComplete 호출 |

**접근성**:
- 인증 오버레이는 `Dialog` 또는 전면 `Box` — focus trap 적용
- 인증 상태 변경 시 `aria-live="polite"` 안내

**의존 컴포넌트**: `LoginForm`, `SignUpForm`, `Dialog`(MUI) 또는 전면 `Box`, `FadeTransition`

**데이터 소스**: `useAuth()` 훅 — 세션 존재 여부 구독

**UI 가이드라인**: 인증 오버레이는 `background.default` 전면 위에 중앙 패널. 기존 챔버/인코더가 뒤에 블러 없이 어둡게 유지(투명도 아님 — 완전 덮기). publish 문맥 복귀가 핵심: "인증 전후에 생성 결과가 유실되지 않음"(시나리오 5)

---

### 5. ResonanceMap

- **카테고리**: `src/components/data-display/ResonanceMap.jsx`
- **역할**: 중심 Glyph와 1-hop 관계 노드를 안개 속 그래프로 시각화. pan/zoom/키보드 포커스 지원

**Props 인터페이스**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `centerGlyph` | object | O | — | 중심 `Glyph` 데이터 |
| `relations` | array | O | — | `GlyphRelation[]` — 중심으로부터의 1-hop 관계 |
| `relatedGlyphs` | array | O | — | 관계 대상 `Glyph[]` |
| `activeFilter` | string\|null | X | null | 활성 관계 유형 필터 (`'FORM'`\|`'ECHO'`\|`'CONTEXT'`\|`'CONTAINS'`\|`'VARIANT'`\|null) |
| `onNodeSelect` | function | O | — | 노드 선택 콜백 `(glyph) => void` — 새 중심으로 이동 |
| `onRelationSelect` | function | X | — | 관계선 선택 콜백 `(relation) => void` — RelationInspector 열기 |
| `isLoading` | boolean | X | false | 관계 데이터 로딩 중 |
| `maxNodes` | number | X | 12 | 최대 노출 노드 수 |
| `sx` | object | X | {} | 추가 스타일 |

**주요 상태(States)**:

| 상태 | 트리거 | 시각적 변화 |
|---|---|---|
| `loading` | 관계 데이터 fetch 중 | 중심 노드만 표시 + `MAPPING RESONANCE` 모노스페이스 라벨 |
| `populated` | 관계 수신 완료 | 노드 점진적 안개 속 등장 (600ms ease-out 순차) |
| `empty` | 관계 0개 | 중심 노드 + `FIRST OF ITS CONTOUR` 라벨 + Contour Lineage 배지 |
| `navigating` | 주변 노드 클릭 | 선택 노드가 중심으로 이동 애니메이션 → 새 관계 로드 |
| `filtered` | 필터 활성 | 해당 유형 관계선·노드만 표시, 나머지 저투명도 |
| `reduced-motion` | `prefers-reduced-motion` | 정적 배치, 애니메이션 없음 → 자동 `ResonanceList`로 전환 |

**접근성**:
- 키보드: Arrow로 노드 간 포커스 이동, Enter로 선택, Tab으로 관계선 → 노드 순환
- `role="img"` + `aria-label="Resonance field: {centerName} 중심, {n}개 연결"`
- `prefers-reduced-motion` 시 `ResonanceList`로 자동 대체
- 스크린리더 사용자에게는 `ResonanceList` 우선 렌더

**의존 컴포넌트**: `GlyphNode`(노드 렌더), `FadeTransition`(등장), 기존 `FilterBar`(수정 — 관계 유형 필터)

**데이터 소스**: `useGlyphRelations(glyphId)` 훅 — Supabase에서 관계·대상 Glyph 조회

**UI 가이드라인**:
- 배경은 `background.default` 위 미세 안개 레이어 (LogogramChamber의 fogNoiseSvg 재활용, 극저 투명도)
- 관계선 스타일: `VARIANT` 이중선, `CONTAINS` 가는 방향선, `FORM` 실선, `ECHO` 점선, `CONTEXT` 옅은 후광선. 모두 모노크롬(`text.secondary` ~ `divider`)
- 중심 노드 크기 > 주변 노드. 노드 크기는 탐색 맥락으로만 결정 — 인기/팔로워 기반 크기 차등 금지
- 노드 수 상한: 8~12개. 한 관계 종류가 60%를 넘지 않게 다양화
- pan/zoom은 pointer drag + wheel/pinch. 줌 범위 제한 (0.5x~2x)

---

### 6. GlyphNode

- **카테고리**: `src/components/data-display/GlyphNode.jsx`
- **역할**: 지도용 저비용 로고그램 노드 — `ResonanceMap` 내에서 각 Glyph를 렌더

**Props 인터페이스**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `glyph` | object | O | — | `Glyph` 데이터 (model, displayName, lineage 포함) |
| `size` | number | X | 80 | 렌더 사이즈 (px) |
| `isCenter` | boolean | X | false | 중심 노드 여부 (중심이면 크게, 라벨 상시 표시) |
| `isFocused` | boolean | X | false | 키보드 포커스 상태 |
| `isFiltered` | boolean | X | true | 현재 필터에 포함 여부 (false면 저투명도) |
| `onClick` | function | X | — | 클릭 콜백 |
| `sx` | object | X | {} | 추가 스타일 |

**주요 상태(States)**:

| 상태 | 트리거 | 시각적 변화 |
|---|---|---|
| `idle` | 기본 | 축소 로고그램 + 하단 이름 라벨 (hover 시) |
| `center` | `isCenter=true` | 크기 1.5x, 이름 라벨 상시 표시, 포커스 링 |
| `focused` | 키보드 포커스 | 미세 밝기 상승 테두리 (`text.secondary` → `text.primary`) |
| `dimmed` | `isFiltered=false` | opacity 0.2 |
| `hover` | 포인터 호버 | 이름 라벨 등장 (FadeTransition 300ms) |

**접근성**:
- `role="button"`, `aria-label="{displayName}"`, `tabIndex=0`
- Enter/Space로 선택

**의존 컴포넌트**: `LogogramRendererCanvas` — **정적/저비용 모드**(`isActive=false`, 파티클 없음, 단일 프레임 렌더). `FadeTransition`

**데이터 소스**: 부모(`ResonanceMap`)로부터 props 주입

**UI 가이드라인**:
- 잉크 색은 `custom.chamber.ink`(#1c2226) — 지도 배경이 다크이므로 반전하여 `text.secondary`(#8a9694) 또는 `text.primary`(#e8ecec) 계열 사용
- 이름 라벨: 모노스페이스 11px, `text.secondary`, 노드 하단 4px 아래
- 지도에서 12개 이상 노드가 모바일에서 프레임 저하 없이 동작해야 함 → Canvas 정적 렌더 1회, requestAnimationFrame 루프 없음

---

### 7. RelationInspector

- **카테고리**: `src/components/overlay-feedback/RelationInspector.jsx`
- **역할**: 선택한 관계의 유형·점수·구성요소·사용자용 근거 문장을 표시하는 패널

**Props 인터페이스**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `relation` | object\|null | O | — | 선택된 `GlyphRelation` (null이면 패널 숨김) |
| `sourceGlyph` | object | X | null | 관계의 source Glyph |
| `targetGlyph` | object | X | null | 관계의 target Glyph |
| `onClose` | function | X | — | 패널 닫기 콜백 |
| `sx` | object | X | {} | 추가 스타일 |

**주요 상태(States)**:

| 상태 | 트리거 | 시각적 변화 |
|---|---|---|
| `hidden` | `relation=null` | 패널 비표시 |
| `visible` | 관계선/노드 선택 | 슬라이드 인 (하단 또는 우측), 유형 배지 + 점수 바 + 근거 1~3개 |
| `switching` | 다른 관계 선택 | 내용 크로스페이드 (ScrambleText 전환) |

**접근성**:
- `role="complementary"`, `aria-label="관계 분석: {sourceDisplayName} ↔ {targetDisplayName}"`
- Escape로 닫기, 패널 내부 Tab 순서

**의존 컴포넌트**: `DataReadout`(점수 구성요소 표시 — `ReadoutRow` 패턴), `ScrambleText`(값 전환), `FadeTransition`

**데이터 소스**: 부모(`ResonanceFieldPage` 또는 `ResonanceMap`)로부터 props 주입. relation 객체에 `score`, `reasons[]`, `kind`, `algorithmVersion` 포함

**UI 가이드라인**:
- 패널 배경 `background.paper`(#131715), 테두리 `divider`
- 관계 유형 배지: 모노스페이스 uppercase (`FORM`, `ECHO`, `CONTEXT`, `CONTAINS`, `VARIANT`), 배경 없이 텍스트 명도만 차등
- 점수: 0~1 범위, DataReadout 스타일로 `RING SCORE`, `CLUSTER SCORE` 등 구성요소 나열
- 근거 문장: Pretendard 400, `text.primary`, 1~3줄
- 모바일: 하단 시트(bottom sheet) 패턴. 데스크톱: 우측 사이드 패널 (max-width 320px)

---

### 8. ResonanceList

- **카테고리**: `src/components/data-display/ResonanceList.jsx`
- **역할**: `ResonanceMap`의 모바일/reduced-motion/스크린리더 대체. 관계를 접근 가능한 목록으로 표현

**Props 인터페이스**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `centerGlyph` | object | O | — | 중심 Glyph |
| `relations` | array | O | — | `GlyphRelation[]` |
| `relatedGlyphs` | array | O | — | 관계 대상 `Glyph[]` |
| `activeFilter` | string\|null | X | null | 관계 유형 필터 |
| `onNodeSelect` | function | O | — | 노드 선택 콜백 |
| `onRelationSelect` | function | X | — | 관계 상세 열기 콜백 |
| `sx` | object | X | {} | 추가 스타일 |

**주요 상태(States)**:

| 상태 | 트리거 | 시각적 변화 |
|---|---|---|
| `populated` | 관계 있음 | 유형별 그룹 헤더 + 관계 카드 목록 |
| `empty` | 관계 없음 | `FIRST OF ITS CONTOUR` + Lineage 표시 |
| `filtered` | 필터 활성 | 해당 유형만 표시 |

**접근성**:
- `role="list"`, 각 항목 `role="listitem"`
- 각 관계: "{targetName} — {kind} ({score})" 라벨
- 키보드: Arrow로 항목 이동, Enter로 상세/노드 이동

**의존 컴포넌트**: `CustomCard`(각 관계 항목 카드), `GlyphNode`(축소 프리뷰), `ScrambleText`

**데이터 소스**: `ResonanceMap`과 동일 props 구조 — 부모 페이지에서 동일 데이터 주입

**UI 가이드라인**:
- `CustomCard` 재활용 — `layout="horizontal"`, `mediaSlot`에 GlyphNode 소형(48px) 배치
- 관계 유형 배지 + 점수 + 근거 첫 문장을 카드 콘텐츠에
- 유형별 그룹 헤더: 모노스페이스 uppercase, `text.secondary`
- 스크롤 목록으로 모바일 프레임 저하 없음

---

### 9. GlyphDetailPage

- **카테고리**: `src/components/templates/GlyphDetailPage.jsx`
- **역할**: 공개 Glyph 상세 페이지 (`/glyph/:publicId`). 로고그램·표시 이름·Contour Lineage·주요 Resonance 표시, 공유·bookmark·report

**Props 인터페이스**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `publicId` | string | O | — | URL 파라미터에서 추출한 Glyph public ID |

**주요 상태(States)**:

| 상태 | 트리거 | 시각적 변화 |
|---|---|---|
| `loading` | 페이지 진입 | 챔버 실루엣 + `DECODING` 라벨 |
| `ready` | 데이터 수신 | 로고그램 형성 애니메이션 → 이름·Lineage·Resonance 표시 |
| `unavailable` | Glyph 숨김/삭제 | 빈 챔버 + `RESPONSE UNAVAILABLE` 라벨. 이름·모델 노출 없음 |
| `owner-view` | 본인 소유 | UNPUBLISH 버튼 추가 |

**접근성**:
- `<main>` 랜드마크, `<h1>`에 표시 이름
- opaque URL 복사 버튼: `aria-label="공유 링크 복사"`
- bookmark/report 버튼: 토글 상태 `aria-pressed`

**의존 컴포넌트**: `LogogramChamber`(전체 사이즈 렌더), `DataReadout`(Lineage·인코딩 데이터), `ResonanceList`(주요 관계 목록), `AnalysisOverlay`(선택적), `AuthGuard`(bookmark/report/unpublish 시)

**데이터 소스**: `useGlyph(publicId)` 훅, `useGlyphRelations(glyphId)` 훅, `useBookmark(glyphId)` 훅

**UI 가이드라인**:
- 메인 레이아웃: 챔버가 뷰포트 60~70% 점유 (기존 `HeptapodEncoderPage` 패턴), 하단에 이름·Lineage·Resonance
- Contour Lineage: `WISP · Crown` 형식 모노스페이스 배지
- SHARE: opaque URL(`/glyph/:publicId`) 클립보드 복사. 이름이 URL에 포함되지 않음
- BOOKMARK: 로그인 필요 — `AuthGuard` 래핑
- UNPUBLISH: 본인만. 확인 다이얼로그 필요 — "마지막 기여자라면 이 Glyph가 지도에서 제거됩니다"

---

### 10. ResonanceFieldPage

- **카테고리**: `src/components/templates/ResonanceFieldPage.jsx`
- **역할**: 언어맵 페이지 (`/map`, `/map/:publicId`). 중심 노드 라우팅, 관계 데이터 로딩, 지도/목록 토글

**Props 인터페이스**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `publicId` | string\|null | X | null | URL 파라미터 — 초기 중심 노드. null이면 랜덤/최근 |

**주요 상태(States)**:

| 상태 | 트리거 | 시각적 변화 |
|---|---|---|
| `loading` | 페이지 진입 | 빈 지도 + `SCANNING ARCHIVE` 모노스페이스 라벨 |
| `ready` | 중심 + 관계 수신 | ResonanceMap 렌더 |
| `navigating` | 노드 선택 | URL 업데이트 (`/map/:newPublicId`) + 새 관계 로드 |
| `inspecting` | 관계선 선택 | RelationInspector 패널 열기 |
| `list-mode` | 모바일 또는 사용자 토글 | ResonanceList로 전환 |
| `error` | 네트워크 실패 | 중심 Glyph 유지 + 관계 영역 재시도 안내 |

**접근성**:
- 지도/목록 토글: `role="tablist"` + `role="tab"`
- `prefers-reduced-motion` 시 자동 목록 모드
- `aria-live="polite"` 중심 변경 시 안내

**의존 컴포넌트**: `ResonanceMap`, `ResonanceList`, `RelationInspector`, `FilterBar`(수정), `GlyphNode`

**데이터 소스**: `useGlyph(publicId)` 훅, `useGlyphRelations(glyphId)` 훅

**UI 가이드라인**:
- 전면 지도 — 뷰포트 전체 점유 (inset: 0, z-index 적절)
- FilterBar는 상단 또는 좌측에 floating. 모노크롬 칩 스타일
- 중심 이동 시 URL이 갱신되어 공유 가능
- 네트워크 실패: 중심 노드는 캐시/로컬 모델로 유지 — 관계 영역만 재시도 버튼

---

### 11. MyArchivePage

- **카테고리**: `src/components/templates/MyArchivePage.jsx`
- **역할**: 본인 contribution·bookmark 관리 페이지 (`/me`)

**Props 인터페이스**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| — | — | — | — | (라우트 컴포넌트 — props 없음, 내부에서 인증 확인) |

**주요 상태(States)**:

| 상태 | 트리거 | 시각적 변화 |
|---|---|---|
| `unauthenticated` | 비로그인 진입 | AuthGuard → 인증 오버레이 |
| `loading` | 데이터 fetch 중 | 스켈레톤 카드 목록 |
| `ready` | 데이터 수신 | 탭 2개: MY RESPONSES / BOOKMARKS |
| `empty` | contribution 0개 | 빈 상태 + 인코더 진입 CTA |
| `deleting` | 공개 취소 확인 | 확인 다이얼로그 — 삭제 규칙 안내 |

**접근성**:
- `<main>` 랜드마크, 탭: `role="tablist"` + `role="tabpanel"`
- 삭제 확인: focus trap 다이얼로그

**의존 컴포넌트**: `AuthGuard`, `CustomCard`(Response/bookmark 카드), `GlyphNode`(카드 내 축소 프리뷰), `FadeTransition`

**데이터 소스**: `useMyContributions()` 훅, `useMyBookmarks()` 훅

**UI 가이드라인**:
- CustomCard 재활용: `layout="horizontal"`, `mediaSlot`에 GlyphNode 80px
- 카드 콘텐츠: 표시 이름 + Lineage 배지 + 공개 날짜
- 탭 헤더: 모노스페이스 uppercase, `text.secondary`
- 빈 상태: 중앙 정렬 "아직 공개한 Response가 없습니다" + `ENCODE YOUR RESPONSE` 버튼

---

## 수정 대상 컴포넌트

---

### TagInput (수정)

- **현재 경로**: `src/components/input/TagInput.jsx`
- **수정 목적**: 자유 텍스트 태그 → **허용 목록(allowlist) 모드** 추가. publish 시 context tag 최대 3개를 제한된 목록에서 선택

**추가/변경 Props**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `mode` | `'free'`\|`'allowlist'` | X | `'free'` | 태그 입력 모드. 기존 동작은 `'free'` |
| `allowedTags` | string[] | X (allowlist 모드에서 O) | [] | 허용된 태그 목록 |
| `categoryLabels` | object | X | {} | 태그 범주별 라벨 `{ identity: '정체성', memory: '기억', ... }` |

**동작 변경**:
- `mode='allowlist'` 시:
  - 자유 텍스트 입력 비활성 (InputBase 숨김)
  - 허용 태그를 범주별 Chip 그룹으로 표시
  - 클릭으로 선택/해제 (토글)
  - `maxTags` 도달 시 미선택 태그 비활성
- `mode='free'` 시: 기존 동작 그대로 (하위 호환)

**기존 코드 영향**: `TagInput.jsx:40` — props 구조분해에 `mode`, `allowedTags`, `categoryLabels` 추가. `addTag` 함수(`TagInput.jsx:71`)에 allowlist 검증 분기. 렌더 부분(`TagInput.jsx:187~`)에 모드별 분기

---

### HeptapodEncoderPage (수정)

- **현재 경로**: `src/components/templates/HeptapodEncoderPage.jsx`
- **수정 목적**: PUBLISH 진입점 추가, 인증 후 복귀 상태 관리

**추가/변경 Props**:

| prop | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| — | — | — | — | (내부 상태 변경 위주, 새 props 불필요) |

**내부 상태 추가**:

| 상태 | 용도 |
|---|---|
| `publishDraft` | publish 시작 시 현재 `{ inputName, model, isInterrogative }` 스냅샷 |
| `isPublishing` | publish 플로우 진행 중 여부 |
| `publishStep` | `'idle'` → `'auth'` → `'confirm'` → `'submitting'` → `'done'` |

**동작 변경**:
- 완성 상태(로고그램 형성 완료)에서 기존 SAVE/SHARE 옆에 `PUBLISH TO ARCHIVE` 버튼 추가
- PUBLISH 클릭 시:
  1. `publishDraft`에 현재 상태 스냅샷
  2. 비로그인이면 `AuthGuard` 인증 오버레이 진입 → 인증 완료 시 `publishDraft`로 복귀
  3. 로그인 상태면 `PublishDialog` 열기
  4. PublishDialog 확인 → 서버 검증 → 성공 시 `GlyphDetailPage`로 이동
- 기존 시나리오 1~4 (인코딩·분석·저장·공유) 동작 불변

**기존 코드 영향**: `HeptapodEncoderPage.jsx:1~18` imports에 `PublishDialog`, `AuthGuard` 추가. 완성 상태 버튼 영역(현재 SAVE/SHARE 버튼 부근)에 PUBLISH 버튼 추가. 상태 관리를 위한 `useState` 3개 추가

---

## 로직·데이터 모듈 스펙 요약

> 각 모듈의 상세 알고리즘은 `02-ux-flow.md` §Resonance 관계 알고리즘에 정의됨. 여기서는 인터페이스만 명시.

### Encoder v2 모듈

| 모듈 | 경로 | 시그니처 | 입출력 |
|---|---|---|---|
| `normalizeName` | `src/utils/heptapod/normalizeName.js` | `(rawInput: string) => { displayName, canonicalName, isInterrogative }` | 원문 → NFC → trim → 연속 공백 축약 → locale-neutral case fold. `?`/`？` 분리 |
| `validateName` | `src/utils/heptapod/validateName.js` | `(canonicalName: string, options?) => { valid, errors[] }` | 지원 문자 범위·최대 길이·overflow 검증. options로 encoderVersion 지정 |

### 관계 로직 모듈

| 모듈 | 경로 | 시그니처 | 핵심 |
|---|---|---|---|
| `extractGlyphFeatures` | `src/utils/heptapod/extractGlyphFeatures.js` | `(model, canonicalName) => GlyphFeature` | 링 harmonics·gap·strand·weightSlot·cluster descriptors, NFD/grapheme 토큰 |
| `scoreFormRelation` | `src/utils/heptapod/scoreFormRelation.js` | `(featureA, featureB) => { score, components }` | ringScore(0.35h+0.20g+0.15s+0.30w) × 0.45 + clusterScore × 0.55. 임계값 ≥0.78 |
| `scoreEchoRelation` | `src/utils/heptapod/scoreEchoRelation.js` | `(featureA, featureB, idfMap) => { score, components }` | 0.45×graphemeEdit + 0.35×IDFBigram + 0.20×IDFToken. 임계값 ≥0.72 |
| `scoreContextRelation` | `src/utils/heptapod/scoreContextRelation.js` | `(tagsA, tagsB, idfMap) => { score, sharedTags }` | IDF weighted Jaccard. 구체 태그 ≥2 또는 (구체 ≥1 + FORM/ECHO 통과) |
| `buildRelationReasons` | `src/utils/heptapod/buildRelationReasons.js` | `(kind, components, sourceGlyph, targetGlyph) => string[]` | 관계 유형·구성요소로부터 사용자용 근거 1~3문장 생성 |

### Supabase 통합

| 모듈 | 경로 | 역할 |
|---|---|---|
| `supabase` | `src/lib/supabase.js` | Supabase client 싱글턴. anon key만 — service role 프론트 노출 금지 |
| `useAuth` | `src/hooks/data/useAuth.js` | 세션 구독, login/signup/logout, 인증 상태 |
| `useGlyph` | `src/hooks/data/useGlyph.js` | `glyphs` 테이블 CRUD. publicId로 조회 |
| `useGlyphRelations` | `src/hooks/data/useGlyphRelations.js` | `glyph_relations` 테이블 조회. 중심 glyph 기준 1-hop |
| `useMyContributions` | `src/hooks/data/useMyContributions.js` | 본인 `glyph_contributions` 목록 |
| `useMyBookmarks` | `src/hooks/data/useMyBookmarks.js` | 본인 `bookmarks` CRUD |
| `usePublish` | `src/hooks/data/usePublish.js` | publish 플로우: 검증 → upsert → contribution 생성 → 관계 트리거 |
| `useReport` | `src/hooks/data/useReport.js` | 신고 생성 |

---

## 의존성 그래프 (컴포넌트 간)

```text
HeptapodEncoderPage (수정)
├── PublishDialog (신규)
│   ├── TagInput (수정 — allowlist 모드)
│   └── LogogramRendererCanvas (재활용)
├── AuthGuard (신규)
│   ├── LoginForm (신규)
│   └── SignUpForm (신규)
└── [기존: LogogramChamber, AnalysisOverlay, DataReadout, ...]

ResonanceFieldPage (신규)
├── ResonanceMap (신규)
│   ├── GlyphNode (신규) × N
│   │   └── LogogramRendererCanvas (재활용 — 정적 모드)
│   └── FilterBar (수정)
├── ResonanceList (신규 — 접근성 대체)
│   ├── CustomCard (재활용)
│   └── GlyphNode (신규)
└── RelationInspector (신규)
    ├── DataReadout (재활용)
    └── ScrambleText (재활용)

GlyphDetailPage (신규)
├── LogogramChamber (재활용)
├── DataReadout (재활용)
├── ResonanceList (신규)
├── AnalysisOverlay (재활용)
└── AuthGuard (신규) — bookmark/report/unpublish

MyArchivePage (신규)
├── AuthGuard (신규)
├── CustomCard (재활용)
└── GlyphNode (신규)
```

---

## 구현 순서 권장

1. **기반**: `normalizeName` → `validateName` → `src/lib/supabase.js` → `useAuth`
2. **인증**: `LoginForm` → `SignUpForm` → `AuthGuard`
3. **공개**: `TagInput` 수정 → `PublishDialog` → `HeptapodEncoderPage` 수정 → `usePublish`
4. **관계 로직**: `extractGlyphFeatures` → `scoreForm/Echo/Context` → `buildRelationReasons`
5. **시각화**: `GlyphNode` → `ResonanceMap` → `ResonanceList` → `RelationInspector`
6. **페이지**: `GlyphDetailPage` → `ResonanceFieldPage` → `MyArchivePage`
