# Project Summary

## 프로젝트 개요

이 저장소는 React + MUI + Storybook 기반의 디자인 개발 환경이며, 현재 핵심 제품은 영화 *Arrival*의 헵타포드 B를 모티프로 한 **Heptapod B — The Response Archive**다.

기존의 개인 이름 인코더를 확장해 사용자가 자신의 이름 로고그램을 공개하고, **Heptapod B로 변환된 뒤 드러나는 형태의 공명**을 탐색하는 비선형 언어맵을 만든다. 이름은 표식의 출처와 표시 이름이지 연결 계산의 입력이 아니다. 제품은 실제 번역기나 영화의 공식 언어 체계를 주장하지 않으며, “번역이 아니라 결정론적 인코딩”이라는 기존 원칙을 유지한다.

## 핵심 목적

1. **개인 응답 생성** - 이름을 결정론적 로고그램으로 인코딩한다. 손실 없는 복원이 검증된 입력만 가역 모드로 표시하고, 그 외 지원 이름은 이름 전체로 재현하는 결정론 모드로 표현한다.
2. **공동 아카이브 구축** - 사용자가 명시적으로 공개한 Response를 Supabase에 저장하고 동일 이름은 하나의 Glyph로 통합한다.
3. **설명 가능한 언어맵** - 변환된 링 윤곽·개구부·가지 구조·필압/먹 분포에서 실제 공통점을 찾고, 양쪽 표식의 관측 부위를 직접 표시한다. 전체 형태와 일부 구조의 공명을 구분한다.
4. **비선형 세계관 체험** - 시간순 SNS 피드가 아니라 선택한 Glyph 주변의 관계가 동시에 드러나는 Resonance Field를 제공한다.
5. **디자인 시스템 유지** - UI 컴포넌트를 재사용 가능한 단위로 분리하고 Storybook에서 상태별로 문서화한다.

## 대상 사용자

- **주요 사용자**: 영화 *Arrival* 팬, 자기 이름의 시각화를 만들고 공유하려는 사용자, 제너레이티브 아트 관심층
- **탐색 사용자**: 공유 링크 또는 언어맵에서 다른 이름이 어떤 표식으로 변환되어 공명하는지 탐색하는 방문자
- **디자이너**: Storybook에서 publish·auth·map·detail 상태를 실제 DB 없이 검토하는 작업자
- **개발자**: 컴포넌트·관계 알고리즘·Supabase 데이터 경계를 분리해 구현하는 작업자

## 기술 스택

- React 19.x
- MUI 7.x (Material UI)
- Vite 7.x
- Storybook 10.x
- React Router 7.x
- Framer Motion 12.x / Lenis 1.x / Three.js 0.182.x
- Supabase Auth / PostgreSQL / Edge Functions — **로컬 구현·검증 범위는 아래 스냅샷 참조. 운영 적용은 별도**

### 구현 스냅샷 · 2026-09-05

실제 동작 기준은 `docs/heptapod-b-encoder/15-resonance-implementation-plan.md`와 `16-resonance-implementation.md`다. 아래의 bookmark/report/태그 확장은 장기 계획이며 이번 사용자 플로우에 포함되지 않는다.

- `/archive` 공개 카드 → `/glyph/:id` 주요 연결 → `/field/:id` 근거·중심 이동 → `/compare/:leftId/:rightId?` 두 이름 비교 → 공개 동의 후 UUID 공유.
- `/me`는 공개 갤러리와 분리된 본인 기여 관리. 익명 소유자 세션에서 공개 가능하며 Google 연결로 동일 소유자를 유지한다.
- 관계 알고리즘 v3는 저장된 실제 `model_data`만 비교한다. FORM(전체 형태/일부 구조)과 실제 본체가 같은 VARIANT만 지원한다. 문자 공유·포함·태그를 연결 근거로 쓰지 않는다. 개발 환경은 프론트 공개 snapshot 최대 200개, API는 최근 공개/기존 이웃 최대 300개 후보이며 전체 아카이브의 완전 탐색을 주장하지 않는다. API 교체 시에도 같은 v3 계약을 요구한다.
- 기존 저장 모델과 기여는 새 migration에서 보존한다. 서버 재생성·동의·트랜잭션·소유자 전용 철회를 구현했고 직접 Glyph 쓰기 권한은 차단한다.
- 공유 PNG/OG 함수 구현. 리치 미리보기는 HTML 지원 custom domain 설정 후 활성화하며 기본 Supabase 도메인은 일반 앱 링크로 폴백한다.

## 제품 세계관과 용어

> 그들은 문장을 한 번에 보았다. 우리는 이름을 하나씩 남겼다. 아카이브는 흩어진 응답을 하나의 발화로 연결한다.

| 용어 | 제품에서의 역할 |
|---|---|
| **The Signal** | 현재 히어로 인트로. 그들이 먼저 말을 건네는 진입 서사 |
| **Your Response** | 이름 입력과 로고그램 형성·분석 체험 |
| **Response** | 사용자가 아카이브에 공개한 이름 로고그램 |
| **Archive** | 공개 Glyph와 사용자 기여가 보존되는 공동 공간 |
| **Resonance** | 서로 다른 이름이 Heptapod B 형태가 된 뒤 드러나는 구조적 공명 |
| **Resonance Field** | 중심 Glyph의 직접 관계 지도. 모바일 최대 6개, 데스크톱 최대 12개, 목록 최대 24개 |
| **Observer** | 인코딩·공개·탐색하는 사용자 |
| **Contour Lineage** | 과거 저장 분류. 현재 Canvas의 실제 기하와 일치하지 않는 type 메타이므로 v3 연결·주 화면에서는 미사용 |

세계관 분류는 영화의 공식 언어학이 아니라 프로젝트 내부의 관측 체계다. 이름의 실제 의미를 시스템이 자동으로 안다고 표현하지 않는다.

## 목표 사용자 경험

```text
The Signal
→ Your Response
→ PUBLISH TO ARCHIVE
→ 인증·공개 동의
→ Glyph 저장·관계 계산
→ Resonance Field
→ 관계 근거 열람
→ 다른 Response 탐색
```

### 현재 라우트와 후속 표면

| 경로 / 표면 | 역할 | 주요 UI 책임 |
|---|---|---|
| `/` | 인트로 + 인코더 | 현재 체험 유지, publish 진입점 추가 |
| PublishDialog | 동의·공개 | 동의 후 익명 인증 또는 기존 세션 재사용, 오류 시 결과 유지 |
| `/archive` | 공개 아카이브 | 최근 공개 표식 최대 200개, 카드에서 연결 탐색 |
| `/field/:id` | Resonance Field | 중심 이동, 관계 필터, 근거, 모바일 기본 목록 |
| `/glyph/:id` | 공개 Glyph 상세 | UUID 공유, lineage, 주요 연결 3개, 직접 이름 비교 |
| `/compare/:leftId/:rightId?` | 두 이름 비교 | 공개 쌍 또는 로컬 입력 비교, 증거 강조, 이미지·링크 공유 |
| `/me` | 내가 남긴 응답 | 본인 contribution 철회, 익명 계정 Google 연결 |
| `/story`, bookmark/report UI | 후속 계획 | 이번 구현·완료 범위에 포함하지 않음 |

## 관계 모델 요약

현재 알고리즘 계약은 `src/utils/heptapod/relateGlyphs.js`와 테스트, 실제 화면 계약은 `16-resonance-implementation.md`를 사용한다. `02-ux-flow.md`의 최초 설계와 차이는 해당 문서 상단에 명시한다.

| 관계 | 규칙 | UI 표현 원칙 |
|---|---|---|
| `SAME` | canonical name·의문형·encoder version fingerprint 동일 | 연결선을 만들지 않고 하나의 Glyph로 병합 |
| `FORM / whole-form` | 위상을 포함한 링·실각도 가지·필압/먹 분포·개구부의 엄격한 전체 기준 통과 | 전체 형태의 공명. 관측 부위 선택 및 양쪽 번호 표시 |
| `FORM / shared-motif` | 특정 가지 또는 개구부+먹 분포의 구체적 일치 | 일부 구조의 공명. 전체 표식이 닮았다고 표현하지 않음 |
| `VARIANT` | 저장된 본체 기하와 렌더 seed가 같고 실제 질문 갈고리만 다름 | 질문의 변주. 이름 동일성만으로 추정하지 않음 |

- 한 연결은 여러 형태 관측을 가질 수 있다. `evidence.observations`가 목록·지도 필터·비교 주석·공유 이유의 공통 원천이다.
- 관계는 점수만 표시하지 않고 실제 근거와 양쪽 모델의 관측 좌표를 제공한다. v2 문자 기반 관계는 주 탐색에 재사용하지 않는다.
- 이름의 뜻과 교차 문자 음역을 AI로 추정하지 않는다.
- 기준 미달 이름을 지도 밀도를 위해 강제 연결하지 않는다.
- 지도는 한 번에 전체 그래프를 렌더하지 않고 중심 Glyph의 1-hop 최대 6개(모바일)/12개(데스크톱)만 보여준다. 관계가 적으면 빈자리를 가짜 이름으로 채우지 않는다.

## 데이터·인증 경계

- 비회원도 인코딩·분석·PNG 저장·공개 Glyph/관계 읽기를 할 수 있다.
- 인증은 publish, bookmark, report, unpublish에서만 요구한다.
- publish 동의 전 이름·모델·태그는 DB에 저장하지 않는다.
- 같은 canonical name과 encoder version은 하나의 `Glyph`로 통합하고, 사용자 소유는 `GlyphContribution`으로 분리한다.
- 주요 영속 엔티티는 `Profile`, `Glyph`, `GlyphContribution`, `GlyphRelation`, `Bookmark`, `Report`다.
- 공개 Glyph/관계는 누구나 읽고, profile·contribution·bookmark·report 변경은 소유자에게만 허용한다.
- 모델 검증과 관계 쓰기는 서버 경계에서만 수행한다. service role 키는 프론트엔드에 두지 않는다.
- DB 상태 변경은 Supabase migration으로만 관리하고, 데이터 훅은 Storybook mock을 위해 `{ client }` 주입을 지원한다.
- 로고그램 PNG는 기본 저장 대상이 아니다. `LogogramModel`과 `encoderVersion`으로 재렌더하고, 필요 시에만 Storage를 추가한다.

## Encoder v2 선행 조건

v2 구현은 다음 계약을 적용한다. legacy `?name=` 재현과 기존 DB 모델은 보존한다.

- canonicalization: NFC, trim, 연속 공백 축약, locale-neutral case fold, `?` 분리
- 공개 식별자: 현재 32비트 seed가 아닌 SHA-256 기반 fingerprint
- 지원 문자와 최대 길이를 명시하고 미지원 문자를 조용히 제거하지 않기
- 코덱 미지원·용량 초과는 이름 전체를 seed로 한 결정론 모드로 표현하고 비가역임을 명시
- `encoderVersion`과 `relationAlgorithmVersion`을 저장해 과거 결과와 관계를 재현

## 컴포넌트 작업 영향

### 기존 컴포넌트 우선 재활용

- `HeptapodHeroIntro`, `LogogramChamber`, `LogogramRenderer*`, `AnalysisOverlay`, `DataReadout`
- MUI `TextField`, `Button`, `Switch`, `Dialog`
- `TagInput`, `FilterBar`, `CustomCard`, `FullPageContainer`, `FadeTransition`, `ScrambleText`

### 목표 수정

- `HeptapodEncoderPage`: publish CTA, 인증 후 draft 복귀, 공개/관계 계산 상태 추가
- `TagInput`: 자유 입력 대신 허용된 context tag를 최대 3개 선택하는 모드
- `FilterBar`: 관계 종류 필터를 외부 옵션으로 주입
- `LogogramRenderer*`: map node에서 사용할 정적·저비용 렌더 모드

### 목표 신규 컴포넌트

- `PublishDialog`: 공개 데이터·태그·삭제 규칙 확인
- `LoginForm`, `SignUpForm`, `AuthGuard`: 인증 UI spec 승인 후 생성
- `ResonanceMap`, `GlyphNode`: 1-hop 그래프와 로고그램 노드
- `RelationInspector`: 관계 유형·점수·근거 설명
- `ResonanceList`: 모바일·reduced-motion·스크린리더용 동등한 목록
- `GlyphDetailPage`, `ResonanceFieldPage`, `MyArchivePage`: 라우트 수준 템플릿

신규 컴포넌트는 UI 상태를 props로 받고 Supabase를 직접 호출하지 않는다. 데이터 조회·mutation·관계 점수 계산은 hook/logic/server 계층에 둔다.

## Heptapod B Encoder Hero Motion

현재 프로젝트의 히어로 섹션은 영화 *Arrival*의 진입 시퀀스를 모티프로 한 비디오 스크러빙 방식으로 업데이트한다. 사용자가 스크롤하거나 히어로 구간을 진행하면, 안개 낀 들판의 거대한 외계 우주선 하부에서 시작해 내부 접촉면으로 접근하고, 마지막에는 현재 앱의 메시지 입력/로고그램 변환 화면으로 넘어갈 수 있는 발광 스크린만 남는 구조다.

### 최종 영상 자산

- 최종 MP4: `public/heptapod-b-encoder/hero-motion/kling-audio-01-final/kling-audio-01-final-hero-v1-source01v2-screenfillv4.mp4`
- 해상도: `1916x1080`
- 프레임레이트: `24fps`
- 길이: `47.08s`
- 프레임 수: `1129`
- 파일 크기: 약 `42MB`
- 실제 조립 기준 총 씬 수: `8개 모션 씬`
- 데스크톱 리뷰 HTML: `/Users/ddd/Desktop/heptapod-storyboard-timeline.html`

### 씬별 타임코드와 스크롤 배치 기준

최종 영상은 서사상 7단계 흐름이지만, 비디오 스크러빙 구현에서는 수직 상승 구간이 2개 모션 씬으로 나뉘어 총 8개 구간으로 취급한다. 아래 타임코드는 히어로 스크롤 영역별 UI/카피/인터랙션 배치 기준으로 사용한다.

| 씬 | 타임코드 | 길이 | 스크롤 진행률 | 내용 | 실제 소스 |
| --- | --- | --- | --- | --- | --- |
| 01 | `0.00-4.04s` | `4.04s` | `0.0-8.6%` | 외부 스케일. 안개 낀 초원에서 정지한 우주선과 리프트를 향해 카메라가 접근한다. | `kling-audio-v2-01-02-fast-lowwind-no-cut.mp4` |
| 02 | `4.04-12.04s` | `8.00s` | `8.6-25.6%` | 하부 입구 개방. 우주선 표면의 틈이 검은 개구부로 벌어지고, 작업자들이 탑승한 리프트가 입구로 접근한다. | `kling-audio-v2-02-03-locked-hole-lowwind-no-cut.mp4` |
| 03 | `12.04-17.04s` | `5.00s` | `25.6-36.2%` | 암흑 진입. 리프트가 우주선 내부로 들어가며 외부 배경이 사라진다. | `kling-audio-03-05-direct-lift-up-camera-zoom-v1.mp4` |
| 04 | `17.04-23.04s` | `6.00s` | `36.2-48.9%` | 내부 수직 상승 시작. 어두운 내부 공간에서 리프트가 같은 축으로 계속 올라간다. | `kling-audio-05-07-direct-same-axis-ascent-v2.mp4` |
| 05 | `23.04-29.04s` | `6.00s` | `48.9-61.7%` | 긴 수직 상승. 멀리 천장에 있는 발광 접촉면을 향해 올라가며, 작업자는 리프트 위에 머문다. | `kling-audio-07-09-direct-ceiling-far-v4-still-workers.mp4` |
| 06 | `29.04-35.04s` | `6.00s` | `61.7-74.4%` | 중력 재정렬. 천장처럼 보이던 접촉면이 정면의 넓은 벽으로 인식되도록 시점과 중력 방향이 바뀐다. | `kling-audio-09-10-gravity-reorientation-v1.mp4` |
| 07 | `35.04-41.04s` | `6.00s` | `74.4-87.2%` | 리프트 하차와 벽면 접근. 작업자들이 리프트에서 내려 발광 벽을 향해 걸어간다. | `kling-audio-10-11-walk-to-wide-wall-v2.mp4` |
| 08 | `41.04-47.08s` | `6.04s` | `87.2-100.0%` | 접촉면 화면 채움. 카메라가 발광 접촉면으로 밀고 들어가며 화면 전체가 흰 막의 질감으로 채워진다. | `kling-audio-11-screen-fill-camera-push-v4.mp4` |

### 히어로 스토리라인

| 구간 | 내용 | 스크러빙 역할 |
| --- | --- | --- |
| 01. 외부 스케일 | 안개 낀 초원 위에 거대한 검은 타원형 우주선이 정지해 있고, 카메라가 하부 입구와 리프트를 향해 접근한다. | 첫 화면의 시각적 후킹. 우주선과 리프트는 고정된 물체이고 카메라만 이동한다는 인상을 유지한다. |
| 02. 하부 입구 접근 | 우주선 표면의 얇은 틈이 검은 개구부로 벌어지고, 작업자들이 리프트에 탑승한 상태로 입구를 향해 올라간다. | 외부에서 내부로 들어가는 첫 전환. 입구는 조명이나 포털이 아니라 순수한 검은 틈으로 보여야 한다. |
| 03. 암흑 진입 | 리프트가 우주선 내부의 어두운 공간으로 들어가며 외부 배경이 사라진다. | 히어로의 현실 세계가 외계 내부 공간으로 전환되는 구간. 불필요한 조명, 연기, 장식적 이벤트는 피한다. |
| 04. 수직 상승 | 긴 내부 공간에서 리프트가 수직 상승하고, 멀리 천장에 있는 발광 접촉면이 작게 보인다. | 긴장감을 만드는 핵심 상승 구간. 접촉면은 처음에는 멀리 있어야 하며, 우주선 내부의 길이감이 유지되어야 한다. |
| 05. 중력 재정렬 | 상승 끝에서 중력 방향과 시점이 바뀌며 천장처럼 보이던 접촉면이 정면의 넓은 벽처럼 인식된다. | 영화 설정을 설명하는 전환 구간. 공간이 회전한 것처럼 보이되, 급격한 컷이나 임의의 카메라 전환은 피한다. |
| 06. 벽면 접근 | 작업자들이 리프트에서 내려 넓은 발광 벽을 향해 걸어간다. | 인간과 언어 접촉면의 관계를 보여주는 구간. 인물은 작고 절제되게 움직이고, 화면은 차분한 필름 톤을 유지한다. |
| 07. 화면 채움 | 카메라가 작업자 뒤에서 발광 접촉면으로 계속 밀고 들어가며, 최종적으로 화면 전체가 흰 막의 질감으로 채워진다. | 히어로 영상의 마지막 상태. 이 흰 접촉면을 현재 앱 UI 또는 로고그램 출력 화면으로 매치 컷하기 위한 연결부로 사용한다. |

### 연출 유지 규칙

- 영상은 히어로 섹션의 비디오 스크러빙에 매핑될 자산이므로, 스크롤 진행도와 영상 `currentTime`을 직접 연결하는 구조를 전제로 한다.
- 스크러빙 중간에 카메라 컷처럼 보이는 급격한 전환을 만들지 않는다. 필요하면 이미지/키프레임 단계에서 이미 연결성이 확보된 컷만 사용한다.
- 우주선과 리프트는 임의로 이동하거나 날아다니면 안 된다. 외부 구간에서는 우주선과 리프트가 같은 자리에 고정되어 있고, 카메라가 그쪽으로 접근하는 것으로 처리한다.
- 내부 구간에서는 리프트가 수직 상승하고, 작업자는 리프트 위에 머문다. 걷는 동작은 중력 재정렬 이후, 리프트에서 내려 접촉면으로 접근하는 장면에서만 사용한다.
- 색감은 저채도 청회색/녹회색 계열의 필름 룩을 유지한다. 주황색 작업복, 게임 렌더 느낌, 과한 SF 네온, 포털, 빔, 연기 분출, 갑작스러운 조명 점등은 금지한다.
- 마지막 흰 화면은 연기나 화이트아웃 효과가 아니라, 카메라가 발광 접촉면으로 가까워져서 화면 자체가 프레임을 채우는 결과여야 한다.

## 중요 규칙

### 1. 컴포넌트 작성

- 모든 UI 컴포넌트는 MUI 기반으로 작성
- 스타일링은 MUI의 `sx` prop 사용
- 컴포넌트는 독립적이고 재사용 가능하게 설계

### 2. 스토리 작성

- 모든 컴포넌트는 Storybook 스토리와 함께 작성
- 디자이너가 이해하기 쉬운 명확한 설명 포함
- Props 변형을 시각적으로 확인할 수 있도록 구성

### 3. 디자인 시스템

- 색상, 타이포그래피는 테마 파일에서 중앙 관리
- 일관된 spacing, elevation, borderRadius 적용
- Style 섹션에서 디자인 토큰 문서화

### 4. 작업 분리 원칙

- **UI 레이어**: 순수 프레젠테이션 컴포넌트 (로직 없음)
- **로직 레이어**: canonicalization, encoder version, feature 추출, 관계 점수와 사용자용 근거 생성
- **데이터 레이어**: Supabase client와 client 주입 가능한 data hook, 인증·로딩·에러 정규화
- **서버 레이어**: publish 모델 검증, 관계 쓰기·재계산, moderation과 service role 격리
- Storybook에서는 UI 레이어를 mock data/client로 검토하며 실제 Supabase 연결을 전제로 하지 않음

### 5. 공개 데이터와 접근성

- 이름과 로고그램이 공개된다는 동의를 publish 직전에 명시적으로 받는다.
- 공개 링크는 이름을 URL query에 넣지 않고 opaque public ID를 사용한다.
- 인기 지표로 Glyph 크기를 결정하지 않는다. 현재 중심과 관계 맥락만 위계를 만든다.
- `prefers-reduced-motion`에서는 지도 응집·이동을 생략하고 정적 배치와 관계 목록을 제공한다.
- 키보드 포커스와 스크린리더 사용자는 그래프와 동일한 노드·관계·근거를 목록으로 탐색할 수 있어야 한다.
