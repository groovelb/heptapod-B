# Heptapod B: Visual Direction

> 이 문서가 결정하는 것: 정체성과 화면이 어떻게 보이는가
> 입력: 01 3절 정체성, 02 2.1절 페이지, 02 4절 원칙 · 출력 대상: theme.js, /component-work, /layout-composer, /visual-asset-prompt (넘기는 항목은 이 문서 6절 표)

## 결정 현황

이 표의 확정 항목만 다음 문서가 그대로 인용한다. 잠정은 `(잠정)` 표시를 달고 인용하고, 미정은 인용하지 않는다.

| 섹션 | 상태 | 비고 |
|---|---|---|
| 1. 무드 | 잠정 | 상류 01 3절 잠정 |
| 2. 레이아웃 전략 | 잠정 | 배정은 추론 (Q3) |
| 3.1 색 | 확정 | theme 실제 값 |
| 3.2 타이포 | 확정 | theme·토큰 실제 값 |
| 3.3 형태·표면·모션 | 확정 | theme·컴포넌트 값 |
| 4. 이미지·에셋 방향 | 확정 | 원문 정량표 압축 |
| 4.1 레퍼런스 | 잠정 | 원본 폴더 부재 |
| 5. 변경 토큰 요약 | 확정 | 현재값은 스타터킷 |
| 6. 다음 문서로 넘기는 것 | 확정 | |

문서 상태: 잠정 승인 (하드 게이트 충족)
개정: 2026-09-17 v3 · 변경: 2026-09-09 구현 기준으로 다시 씀

비고:

- **2절 잠정**: 아키타입 id는 `src/data/layoutTaxonomyData.js` 목록에서 골랐고, 페이지별 배정은 화면 구성에서 추론했다 (Q3).
- **3절 값 출처**: `src/styles/themes/default.js`의 palette, typography, shape, shadows, transitions, components와 `src/styles/tokens/editorial.js`의 읽기 역할 토큰. 모션 값은 `LogogramChamber.jsx`, `scrub/inkMotion.js`, `HeptapodHeroIntro.jsx`에서 읽었다.
- **v2에서 바뀐 것**: 챔버 안개 색이 새 영상의 마지막 프레임 실측값으로 바뀌었고 좁은 화면용 한 벌이 생겼다. 읽기 전용 시맨틱 토큰 한 묶음이 새로 들어와 아카이브와 판독 영역의 위계를 담당한다. 에셋에는 미리보기 카드와 정지 표식 이미지 두 갈래가 추가됐다.
- **4절 이동**: 원문 1절과 2절의 레퍼런스 분석(로고그램 조형 F1~F8, 인코딩 규칙 단서 S1~S4, 질감 T1~T5)은 새 템플릿에 자리가 없어 이 문서 4절의 에셋별 방향과 그 아래 비고로 압축해 옮겼다. 코드 값 범위는 `src/utils/heptapod/MODEL.md`가 계약으로 갖고 있다. 옛 절 번호를 가리키던 상호참조 6곳(`MODEL.md`, `LogogramChamber.jsx`, 06 문서 1곳, 08 문서 4곳)은 이 문서 4절·3.3·2절로 바꿔야 한다. 수정 범위 밖이라 목록만 남긴다.
- **5절 현재값 출처**: 스타터킷 `component-work/resources/mui-theme.md`. 그 문서가 정하지 않은 축은 "미지정 (MUI 기본)"으로 적었다.
- **분량**: 277줄(권장 200). 4절 에셋별 방향을 `appendix-asset-direction.md`로 분리 가능하다.

---

## 1. 무드

- **키워드** (최대 5, 01 3.2절에서 파생): Monochrome Dark · Fog and Ink · Dreamlike · Editorial Quiet · Instrument Cold (잠정, Q2)
- **태도 선언** (최대 3): UI는 형태의 들러리이고 여백이 곧 연출이다. 어두운 관찰 공간에서 밝은 안개를 바라보는 영화의 구도를 화면 구조로 그대로 옮긴다. 형태 옆의 글은 읽히는 본문이지 캡션이 아니다.
- **하지 않는 것** (최대 5): 유채색 · 네온 글로우 · 빠른 스냅 전환 · 둥근 카드 묶음 · 균일한 굵기의 매끈한 곡선

---

## 2. 레이아웃 전략

구조:

| 페이지 (02 2.1절) | 공간 모델 | 아키타입 | 구분 언어 |
|---|---|---|---|
| Landing | 유동 | scrollytelling + video-hero (잠정, Q3) | 여백 |
| Canvas | 고정 | full-bleed-content + focal-point (잠정, Q3) | 선 |
| Archive | 유동 | single-column-feed + sectioned-stack (잠정, Q3) | 여백 |
| GlyphDetail | 혼합 | two-column-editorial (잠정, Q3) | 여백 |
| ResonanceField | 고정 | focal-point + z-axis-layering (잠정, Q3) | 선 |
| Compare | 고정 | fifty-fifty-block + split-screen (잠정, Q3) | 선 |
| 전역 오버레이 | 고정 | modal-centric-flow + z-axis-layering (잠정, Q3) | 선 |

콘텐츠 신호 (/layout-composer 입력):

| 페이지 | 밀도 | text / media / repeat / hierarchy |
|---|---|---|
| Landing | airy | short / dominant / few / two-tier |
| Canvas | airy | mixed / dominant / single / two-tier |
| Archive | airy | long / balanced / many / deep |
| GlyphDetail | airy | long / balanced / few / deep |
| ResonanceField | compact | micro / accent / many / flat |
| Compare | airy | short / balanced / few / two-tier |
| 전역 오버레이 | compact | short / none / few / flat |

- 공간 모델: 유동 / 고정 / 혼합. 아키타입: `src/data/layoutTaxonomyData.js`의 id. 구분 언어: 선 / 면 / 여백.
- Landing의 영상은 고정 스테이지에 핀되고 카피만 트랙 좌표를 지나가므로 `pinned-section`을 함께 쓴다 (잠정, Q3).
- GlyphDetail의 형태 열은 넓은 화면에서 헤더 아래에 붙어 따라온다 (`sticky-header-sidebar`, 잠정, Q3).
- Archive의 유형 피드 안쪽은 좁은 화면 2열, 넓은 화면 3열의 균일 격자다 (`uniform-card-grid`, 잠정, Q3).
- 전역 리듬: 형태가 있는 화면은 단일 컬럼 중앙 집중이다. 생성 화면에서 형태가 화면 짧은 변의 62%를 차지하고 컨트롤은 네 모서리로 밀려난다. 읽는 화면은 본문 폭 40rem, 넓은 피드 48rem, 펼침 80rem의 세 단으로만 나뉜다. 섹션 사이는 56~80px, 큰 단락 사이는 80~112px, 구분은 면이 아니라 1px 헤어라인으로 한다. 상세는 넓은 화면에서 형태 2 대 설명 3이고 형태 열은 헤더 아래에 붙어 따라온다. 좁은 화면에서는 한 열로 접히고 형태는 정방형 비율을 유지한다.

---

## 3. 토큰 방향

### 3.1 색 (역할 팔레트)

| 역할 | 이름 | 값 | MUI 토큰 | 근거 (01 3절) |
|---|---|---|---|---|
| 인터랙티브 전경 | 안개 블루그레이 | `#aebcc4` | `primary.main` | 절제 (잠정, Q2) |
| 전경 짙은 단 | 안개 블루그레이 딥 | `#8da0ac` | `primary.dark` | 절제 (잠정, Q2) |
| 보조·비활성 | 틸 그레이 | `#4a5a58` | `secondary.main` | 절제 (잠정, Q2) |
| 보조 밝은 단 | 틸 그레이 라이트 | `#6e7f7d` | `secondary.light` | 절제 (잠정, Q2) |
| 관찰자 배경 | 챔버 블랙 | `#0c100f` | `background.default` | Stillness (잠정) |
| 패널 표면 | 챔버 블랙 밝은 단 | `#131715` | `palette.background.paper` | Stillness (잠정) |
| 본문 | 한색 백 | `#e8ecec` | `palette.text.primary` | 순백 배제 |
| 보조 텍스트 | 안개 회록 | `#8a9694` | `palette.text.secondary` | 절제 (잠정) |
| 구분선 | 한색 백 8% | `rgba(232,236,236,0.08)` | `divider` | 선이 구분 언어 |
| 상태 표기 | 한색 백 단일 | `#e8ecec` | `palette.warning.main`, `error.main` | 유채색 배제 |
| 챔버 안개 | 쿨 그레이블루 7단 | `#abb4c1` ~ `#e0e5ef` | `custom.chamber.*` | 명암 이중 구조 |
| 챔버 안개 (좁은 화면) | 한 단 밝은 벌 | `#b9c4d7` ~ `#e5edfa` | `custom.chamber.mobile.*` | 기기별 밝기 차 |
| 잉크 | 잉크 | `#1c2226` | `custom.chamber.ink` | 완전 검정 배제 |

비고:

- 명암 이중 구조가 정체성이다. UI(관찰자 영역)는 어둡고 챔버(형태 영역)는 밝은 안개다. 그래서 두 팔레트를 하나로 합치지 않고 `custom.chamber` 네임스페이스로 분리했다.
- 안개 7단은 막 베이스 `custom.chamber.fog` `#c6cdd9`, 중심 하이라이트 `#e0e5ef`, 깊은 단 `#abb4c1`, 위 `#d4dae5`, 가운데 `#ced5e1`, 아래 `#b5bcc8`, 가장자리 `#afb8c5`이다. 현재 랜딩 영상의 마지막 프레임(1128) 실측에 맞췄다.
- 좁은 화면 한 벌은 같은 구조에 밝기만 올린 값이다(`#cfd8e8`, `#e5edfa`, `#b9c4d7`, `#dbe3f1`, `#d6dfef`, `#bbc7d9`, `#c0cadc`). 표식의 잉크는 두 벌 모두 같다.
- 경고와 에러도 무채색 한 벌을 쓰고 모노스페이스 라벨로만 구분한다.
- `grey.*`는 MUI 기본 스케일을 그대로 둔다. 브랜드 색이 아니라 보조 경계용이다.

### 3.2 타이포

| 역할 | 서체 | 방향 (웨이트·크기·자간·행간) | MUI variant |
|---|---|---|---|
| 헤드라인 대 | Outfit | 300, 32~56px, 자간 0.25em, 대문자 | h1 |
| 헤드라인 중 | Outfit | 300~400, 22~40px, 자간 0.25em | h2, h3 |
| 소제목 | Outfit | 600~700, 1.125~1.5rem, 자간 -0.01~0 | h4~h6 |
| 본문 | Pretendard Variable | 400, 1rem·0.875rem, 행간 1.6 | body1, body2 |
| 라벨 | Pretendard Variable | 500, 1rem·0.875rem, 자간 0.01em | subtitle1, subtitle2 |
| 버튼 | Pretendard Variable | 600, 0.875rem, 자연 케이스 | button |
| 오버라인 | Pretendard Variable | 600, 0.75rem, 자간 0.08em, 대문자 | overline |
| 계측 | JetBrains Mono | 0.75rem, 자간 0.05em, 행간 1.5 | `custom.mono` |
| 읽기 본문 | Pretendard Variable | 400, 18~20px, 행간 1.75 | `editorialBody` |
| 이름의 뜻 | Pretendard Variable | 400, 20~24px, 자간 -0.01em | `editorialLead` |
| 읽기 제목 | Cinzel + Noto Serif KR | 700, 30~40px, 자간 -0.02em | `editorialTitle` |
| 페이지 표제 | Cinzel + Noto Serif KR | 700, 36~56px, 자간 -0.025em | `editorialDisplay` |
| 한마디 인용 | Cinzel + Noto Serif KR | 400, 24~32px, 행간 1.5 | `editorialQuote` |
| 인트로 헤드라인 | Cinzel | 700, 강조 900 이탤릭, 36~92px, 소문자 | `custom.serif` |
| 인트로 표제 | Cinzel | 300, `clamp(32px, 6vw, 88px)`, 자간 0.34em | `custom.serif` |
| 계측 HUD | JetBrains Mono | `clamp(11px, 0.85vw, 13px)`, 자간 0.04em | `custom.mono` |

비고:

- 삼원 구조다. 생성 화면의 계기 영역은 차가운 산세리프와 모노스페이스(연구 장비), 읽는 영역은 세리프 제목과 18~20px 본문(에디토리얼), 인트로는 세리프 헤드라인(영화적)이다. 인트로 본문은 Pretendard 400에 18~32px, 행간 1.7이다.
- 헤드라인은 가늘고 넓게 간다. 포스터의 와이드 트래킹을 따르고 헤비 웨이트를 쓰지 않는다.
- 읽기 역할은 크기를 rem으로 두고 넓은 화면 전환을 900px 하나로만 한다. 컴포넌트는 크기가 아니라 역할 이름을 소비한다.
- 캡션 크기는 비트 종류로 갈린다. 일반 `clamp(36px, 5.6vw, 92px)`, 명제 비트 `clamp(40px, 6.4vw, 104px)`, 거울 대칭 비트 `clamp(44px, 9vw, 128px)`, 본문 `clamp(18px, 2.6vw, 32px)`, 보조 라벨 `clamp(11px, 0.9vw, 14px)`. 좁은 화면 표제는 자간을 0.18em으로 줄인다.
- 인트로 카피의 원본은 `src/data/heptapodHeroStory.js`이고, 표제 서체 스택도 같은 파일이 갖는다.
- 드리프트: 테마의 `custom.serif`는 Fraunces·Newsreader·Georgia 300이지만 화면에 실제로 뜨는 세리프는 두 갈래 모두 Cinzel이다(인트로는 데이터 파일의 스택, 읽기 역할은 토큰의 스택). 표의 값은 실제 화면 기준이다.

### 3.3 형태·표면·모션

| 축 | 방향 | 값 |
|---|---|---|
| radius | 전부 각지게 | `shape.borderRadius: 0`, 버튼·카드도 0 |
| radius 예외 | 칩만 미세하게 | `MuiChip` 4, 의미 칩은 알약형 |
| elevation | 방향 없는 확산 | offset 0, blur 12~24px, 투명도 0.06~0.12 |
| 표면 | 패널 배경을 그리지 않음 | 헤어라인과 텍스트만, 컨테이너 없음 |
| 전환 템포 | MUI 기본 유지 | 150~375ms |
| 안개 전진 | 상시 느린 줌 | 주기 8000ms, 배율 1에서 2.1 |
| 안개 가속 | 생성 시 1회 | 1300ms, 배율 1에서 1.32, 복귀 없음 |
| 인계 전환 | 완주 후 1회 | 650ms 선형, 감속 선호 시 즉시 |
| 캡션 리듬 | 스크롤 진행도의 함수 | 등장 0에서 0.35, 퇴장 0.8에서 1 |
| 이징 | 등장·퇴장·이동 3종 | 등장 `cubic-bezier(0.22, 1, 0.36, 1)` |
| 읽기 간격 | 역할 토큰으로 고정 | 섹션 56/80px, 단락 사이 80/112px |
| 터치 타깃 | 손가락 기준 하한 | 칩·관측 표식 최소 44px |
| 계기 자간 | 대문자 라벨은 넓게 | 입력 줄 0.4em, 모노 라벨 0.04em |
| 간격 | 8px 그리드 | `spacing: 8`, 브레이크포인트 MUI 기본 |

비고:

- 안개 전진은 같은 줌 루프를 절반 위상차로 두 겹 겹치고 15~85% 구간에서 불투명도를 유지해 이음매를 감춘다.
- 안개 가속은 되돌아오는 구간이 없다. 시작 직후 빠르게 나갔다 감속하고 끝값을 유지한다. 발화 시점은 완성이 아니라 사용자가 누른 순간이다.
- 캡션은 번짐 12px에서 0으로 들어오고 번짐과 자간으로 흩어진다. 슬라이드·바운스·스케일·웨이트 모핑을 쓰지 않는다.
- 감속 선호를 켜면 안개 모션과 캡션 변형이 모두 최종 상태로 고정된다. 좁은 화면의 목록과 지도는 움직이는 형태 대신 정지 이미지를 쓰고, 상세와 생성 결과만 살아 움직인다.
- 이징은 한 프리셋의 세 곡선이다. 등장 `cubic-bezier(0.22, 1, 0.36, 1)`, 퇴장 `cubic-bezier(0.64, 0, 0.78, 0)`, 이동 `cubic-bezier(0.83, 0, 0.17, 1)`.
- 읽기 간격의 작은 축은 라벨 6px, 문단과 항목 8px, 구분선과 소제목 사이 12~16px이다. 본문 목록의 고리 불릿은 지름 0.4em이다.
- 트랙은 1셀이 100vh다. 캡션은 셀 좌표를 따라가고 링 캡션만 +16vh에서 -16vh로 패럴럭스 이동한다.
- 좁은 화면의 내비게이션 서랍은 100vw 전면이고, 아카이브 인덱스는 상단 오프셋 기본값 128px 아래에서 시작한다. 목록의 정지 이미지는 뷰포트 160px 앞에서 미리 받는다. 안개 입자의 퍼프 텍스처도 128px 한 장이다.
- 원문 5절의 기획 값(등장·전환 600~1200ms, 앰비언트 루프 20~40s)은 구현에서 위 값으로 대체됐다.

---

## 4. 이미지·에셋 방향

| 에셋 유형 | 쓰이는 곳 | LOOK 키워드 (1~2) |
|---|---|---|
| 절차 생성 표식 | Canvas 챔버, 저장 이미지 | ink wash calligraphy |
| 정지 표식 이미지 | 목록, 지도, 미리보기 | ink wash calligraphy |
| 히어로 스크럽 영상 | Landing 트랙 | practical 35mm film |
| 스크럽 사운드 | Landing 소리 | low ambient drone |
| 공유 미리보기 카드 | 링크 미리보기 | monochrome poster |

에셋별 방향 (에셋 유형마다 한 블록):

- **절차 생성 표식**
  - FORMAT: 정방형. 기준 반지름 R로 정규화하고 슬롯 12개를 12시부터 시계 방향 30도 간격으로 둔다. 저장은 기준 960px의 두 배(1920px)로 다시 그린다
  - LOOK: ink wash calligraphy. 농담은 중심선 최농에서 외곽으로 지수 감쇠(코어 0.95, 중간 0.5, 헤일로 0.15). 가장자리는 기체처럼 풀리고 확산 폭 0.05~0.15R. 비산점은 무게중심 주변 가우시안 산포로 거리에 따라 크기와 밀도가 준다 (T1, T2, T3)
  - SUBJECT: F1 타원율 0.92~1.00에 반지름 변조 0.03~0.08R · F2 폭은 최세 0.02R, 평균 0.04~0.06R, 응집부 0.15~0.30R · F3 가닥 1~4에 이격 0~0.10R · F4 덩어리 1~6개를 무게중심으로 편중 · F5 가지 길이 0.10~0.40R, 안팎 비율 2 대 8 · F6 말단 고임 최대 0.35R과 비산점 0.01~0.03R 5~15개 · F7 링 개구부 최대 60도, 출현율 3% · F8 이탈 루프 0.3~0.6R
  - 하지 않는 것: 매끈한 균일 두께 곡선, 회색을 따로 칠하는 농담(알파로만), 정지된 순백 배경 (T4, T5)
- **정지 표식 이미지**
  - FORMAT: 투명 배경 PNG 두 벌(256px, 512px). 720 좌표계의 원 중심과 여백을 그대로 보존한다
  - LOOK: ink wash calligraphy. 같은 잉크 한 색(`#1c2226`)만 쓰고 배경을 칠하지 않는다
  - SUBJECT: 움직이는 표식과 같은 모델에서 같은 입자 생성기로 뽑은 한 프레임
  - 하지 않는 것: 다른 도형으로 대체한 아이콘, 원본과 다른 여백, 실패 시 살아 있는 표식으로의 되돌림
- **히어로 스크럽 영상**
  - FORMAT: 47.08초 한 편을 넓은 화면용 한 벌과 세로 1080×1920 한 벌로, 각각 첫 프레임 포스터 한 장. 되감기가 가능하도록 키프레임 간격 6으로 굽는다
  - LOOK: practical 35mm film. 저채도 그린그레이 외부와 블루그레이 안개, 낮은 콘트라스트, 약한 그레인
  - SUBJECT: 아래에서 진입, 상승, 중력 전환, 막을 향해 걷기, 마지막은 밝은 안개로 화면이 가득 차 챔버와 이어진다
  - 하지 않는 것: 주황·빨강 의상과 장비, 배우 얼굴 클로즈업, 통로나 계단으로 들어가는 진입 논리
- **스크럽 사운드**
  - FORMAT: 베드 루프 하나와 마디 클립 여섯 개. 마스터는 저역 중심 -16 LUFS
  - LOOK: low ambient drone
  - SUBJECT: 영상 소리를 마디 구간대로 잘라낸 클립. 스크롤 위치에 결속되고 멈추면 잦아든다
  - 하지 않는 것: 밝은 알림음, 생성 효과음에 원작 음원 사용(합성으로 만든다)
- **공유 미리보기 카드**
  - FORMAT: 1200×630 한 장. 랜딩은 고정 판, 개인과 묶음은 요청할 때 저장된 형태로 그린다
  - LOOK: monochrome poster. 표식이 중심에 크게 놓이고 제목은 링 중심에 맞춰 얹는다
  - SUBJECT: 개인은 표식 하나와 이름, 묶음은 대표 표식 최대 셋과 유형 제목
  - 하지 않는 것: 사진 액자, 푸터와 작은 보조 카피, 이미지 위의 긴 설명문(설명은 메타데이터에만 둔다)

비고:

- 형태 규칙의 근거 (원문 S1~S4): 복잡도는 의미 단위 수에 비례한다(짧은 이름은 단순, 긴 이름은 조밀) · 같은 자모는 같은 가지 유형으로 돌아온다 · 화행은 정해진 자리의 장식으로만 표시한다 · 아무리 단순해도 링은 유지하고 가지는 3개 이상 둔다.
- 유형 상징과 계열 상징은 사람의 표식이 아니라 같은 문법으로 저작한 안내용 형태다. 같은 판독기로 다시 읽어 의도한 의미가 나오는지 확인한다.
- 상세 샷 시퀀스와 프롬프트 전문은 `05-hero-cinematic-prompt-template.md`, 마디별 카피는 `06-hero-storyline.md`에 있다. 형태 파라미터의 최종 계약은 `src/utils/heptapod/MODEL.md`다.

### 4.1 레퍼런스 (사용자 제공만)

| ID | 파일/URL | 참고 포인트 | 잠금 |
|---|---|---|---|
| REF-01 | 로고그램 36자 사전 이미지 | 형태 변이 모집단, 복잡도 상관 | 예 |
| REF-02 | `reference/langauge/MQ90Lm.jpg` | 멀티 가닥과 비산점 디테일 | 예 |
| REF-03 | `fc58573527...jpg` (안개 질감 링) | 기체 확산과 농담 감쇠 | 예 |
| REF-04 | 원화 시트 18점 | 잉크 물성과 스트로크 변이 | 예 |
| REF-05 | `MV5B...jpg` (챔버 내부 스틸) | 어두운 UI 색과 수직 결 텍스처 | 예 |
| REF-06 | 콘셉트 아트 | 스케일 대비와 광원 구도 | 예 |
| REF-07 | `images.jpeg` 외 안개 스틸 묶음 | 틸 그레이 안개 팔레트 | 예 |
| REF-08 | `reference/langauge/61RQ...jpg` (포스터) | 와이드 트래킹 타이포, 잉크 대비 | 예 |

비고:

- 원문 6절의 레퍼런스 목록을 옮겼다. 원본 이미지 폴더(`reference/langauge/`)는 현재 저장소에 없고 분석 결과만 4절에 남아 있다. 전체 경로는 `reference/langauge/MQ90Lm.jpg`, `reference/langauge/fc58573527df57be670e7d2ebbab2ff3.jpg`, `reference/langauge/61RQ...jpg`다.
- 색 값은 육안 샘플링 추정치에서 출발해 테마에서 확정됐다. 방호복 오렌지(`hq720.jpg`)에서 뽑았던 유채색 액센트는 채택하지 않았다. 사유는 1절의 하지 않는 것과 B2r 보고서에 있다.

---

## 5. 변경 토큰 요약 (theme.js 입력)

| 토큰 경로 | 현재값 | 변경값 | 적용 대상 |
|---|---|---|---|
| `palette.mode` | 미지정 (light) | `dark` | 전역 |
| `palette.primary.main` | `#0000FF` | `#aebcc4` | 인터랙티브 요소 |
| `palette.secondary.main` | blueGrey[900] `#263238` | `#4a5a58` | 보조·비활성 |
| `palette.background.default` / `.paper` | 미지정 (MUI 흰색) | `#0c100f` / `#131715` | 페이지와 패널 |
| `palette.text.primary` / `.secondary` | 미지정 | `#e8ecec` / `#8a9694` | 본문과 캡션 |
| `palette.divider` | 미지정 | `#e8ecec` 8% | 헤어라인 |
| `palette` 상태 색 4종 | MUI 기본 유채색 | `#e8ecec` 한 벌 | error·warning·info·success |
| `palette.action.*` | 미지정 | 한색 백 4~54% 단계 | hover·selected·disabled |
| `palette.grey.*` | 미지정 | MUI 스케일 (유지) | 보조 경계 |
| `palette.custom.chamber.*` | 없음 | 안개 7단 + 잉크 (신설) | 챔버와 표식 |
| `palette.custom.chamber.mobile.*` | 없음 | 밝은 안개 7단 (신설) | 좁은 화면 챔버 |
| `typography.fontFamily` | Pretendard Variable | Pretendard Variable (유지) | 본문·라벨 |
| `typography.h1~h3` | Outfit 900 | Outfit 300~400, 자간 0.25em, 대문자 | 헤드라인 |
| `typography.h4~h6` | 미지정 | Outfit 600~700, 1.125~1.5rem | 소제목 |
| `typography.button` | 미지정 (MUI 대문자) | 600, 자간 0.02em, `none` | 버튼 |
| `typography.overline` | 미지정 | 600, 자간 0.08em, 대문자 | 계기 라벨 |
| `typography.custom.mono` | 없음 | JetBrains Mono 0.75rem, 자간 0.05em | 계측 표기 (신설) |
| `typography.custom.serif` | 없음 | Fraunces·Newsreader·Georgia 300 | 인트로 헤드라인 (신설) |
| `typography.editorial*` | 없음 | 읽기 역할 16종 (신설) | 판독·아카이브 본문 |
| `editorial.layout` | 없음 | 본문 폭·섹션 간격·상세 2열 (신설) | 읽는 화면 리듬 |
| `shape.borderRadius` | `0` | `0` (유지) | 전역 |
| `shadows` | offset 0, blur 높인 dimmed | offset 0, blur 12~24px, 0.06~0.12 | Paper·카드 |
| `spacing` | 미지정 (MUI 8) | `8` (유지) | 전역 |
| `breakpoints.values` | 미지정 | MUI 기본 (유지) | 반응형 |
| `transitions` | 미지정 | MUI 기본 150~375ms (유지) | 전역 |
| `components.MuiButton` | 미지정 | radius 0, 자연 케이스 | 버튼 |
| `components.MuiPaper` / `MuiCard` | 미지정 | radius 0, dimmed 그림자 5단 | 표면 |
| `components.MuiChip` | 미지정 | radius 4 | 칩만 예외 |

비고: 인트로 헤드라인은 테마의 serif 대신 데이터 파일의 Cinzel 스택으로 그려지고, 읽기 역할은 토큰 안에서 따로 Cinzel 스택을 갖는다. 셋을 한 값으로 모을지는 열린 질문이다. 챔버 색은 히어로 영상 마지막 프레임 실측에 맞춘 값이라 영상을 바꾸면 같이 바뀐다.

---

## 6. 다음 문서로 넘기는 것

| 받는 곳 | 가져가는 것 |
|---|---|
| theme.js 수정 | 5절 표 |
| /component-work | 3절 토큰 방향, 5절 표 |
| /layout-composer | 2절 두 표의 아키타입·콘텐츠 신호 |
| /visual-asset-prompt | 4절 개요 표와 에셋별 방향, 4.1절 |
