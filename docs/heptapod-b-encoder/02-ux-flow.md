# Heptapod B: UX Flow

> 이 문서가 결정하는 것: 각 과업을 어떤 화면과 데이터로 이루는가
> 입력: 01 4절 사용자·대상, 01 5절 과업 · 출력 대상: 03-visual-direction, /supabase-integration, /component-work (넘기는 항목은 이 문서 6절 표)

## 결정 현황

이 표의 확정 항목만 다음 문서가 그대로 인용한다. 잠정은 `(잠정)` 표시를 달고 인용하고, 미정은 인용하지 않는다.

| 섹션 | 상태 | 비고 |
|---|---|---|
| 1. UX-flow 시나리오 | 확정 | 라우트·문서 대조 |
| 2.1 페이지 리스트 | 확정 | 경로 계약 대조 |
| 2.2 계층 트리 | 확정 | 적용 현황 계승 |
| 3.1 대상 정의 | 확정 | 모델 계약·스키마 |
| 3.2 이름 사전 | 확정 | 마이그레이션 대조 |
| 4. 인터랙션 원칙 | 잠정 | 상류 01 3절 잠정 |
| 5. 컴포넌트 리스트 | 확정 | 파일 diff로 대조 |
| 6. 다음 문서로 넘기는 것 | 확정 | |

문서 상태: 잠정 승인 (하드 게이트 충족)
개정: 2026-09-17 v3 · 변경: 2026-09-09 구현 기준으로 다시 씀

비고:

- **1절 근거**: 경로 계약은 `src/routes/paths.js`와 `app/` 라우트 7개, 흐름은 원문 02의 적용 현황(2026-09-06)과 `16-resonance-implementation.md`, `19-archetype-feed.md`, `20-mobile-optimization.md`로 대조했다.
- **2.1절 근거**: 랜딩과 생성은 더 이상 한 주소를 나눠 쓰지 않는다. 랜딩은 완료만 알리고 라우트가 이동을 소유한다. 기존 `?name=` 링크는 이름과 버전을 보존한 채 생성 주소로 대체된다.
- **3.1절 근거**: 속성과 영속성은 `src/utils/heptapod/MODEL.md`, `heptapodMeaningCatalog.js`, `heptapodArchetypeCatalog.js`, `supabase/migrations/*.sql`로 확인했다.
- **4절 압축**: 감속 선호와 모바일 정적 이미지 규칙은 원칙 4의 비고로 묶었다. 스크럽 사운드와 키네틱 타이포의 상세 규칙은 각각 `07-scroll-scrub-sound-plan.md`, `08-kinetic-typography-ideation.md`에 있다.
- **5절 근거**: 스타터킷 `src/components`와 파일 단위로 비교했다. 비교한 215개 중 99개가 동일, 17개가 다름, 99개가 이 저장소에만 있다.
- **v2에서 바뀐 것**: 시나리오가 4개에서 5개로 늘었고 화면이 하나에서 여섯으로 갈라졌다. 대상에 공개 기록·의미 판독·유형·연결이 들어왔고 서버 테이블 셋이 생겼다.
- **분량**: 339줄(권장 250). 화면이 여섯으로 갈라지며 시나리오가 늘었다. 1절 시나리오 비고를 `appendix-scenario-notes.md`로 분리 가능하다.

---

## 1. UX-flow 시나리오 (01 5절 과업과 1:1)

R 읽기 · W 생성 · D 갱신/삭제.

### 1.1 그들이 먼저 건넨 말을 따라가며 세계관을 받아들인다

- **사용자**: 영화 팬, 제너러티브 관심층
- **진입**: 직접 방문 · **성공 조건**: 생성 화면에 닿을 때 답할 차례라는 동기가 생김 · **예외**: 아래 비고

| 단계 | 화면 | 사용자 행동 | 다루는 대상 (R/W/D) | 결과 |
|---|---|---|---|---|
| 1 | Landing | 시작을 누른다 | HeroBeat R | 스크롤 잠금이 풀리고 소리가 열린다 |
| 2 | Landing | 스크롤을 내린다 | HeroBeat R (몇 개) | 영상이 스크롤을 따라 앞뒤로 움직인다 |
| 3 | Landing | 비트 카피를 읽는다 | HeroBeat R | 카피가 영상 위를 지나며 세계관을 쌓는다 |
| 4 | 전역 오버레이 | 소리를 끄거나 켠다 | 없음 | 소리가 전부 잦아든다 |
| 5 | Landing | 트랙을 완주한다 | HeroBeat R | 마지막 카피가 물러나고 화면이 밝아진다 |
| 6 | Canvas | 입력 줄 앞에 선다 | EncodeInput R | 주소가 바뀌고 소리가 배경음악이 된다 |

비고:

- 예외: 감속 선호를 켜면 스크럽 없이 정지 프레임으로 지나간다. 건너뛰기를 누르면 완주 지점으로 이동한다. 옛 이름 주소로 들어오면 인트로 없이 생성 화면이 열린다.
- 단계 1: 시작을 누르기 전에는 스크롤이 잠겨 있다. 이 클릭이 소리를 여는 제스처를 겸한다.
- 단계 2: 스크롤 위치가 영상의 `currentTime`을 양방향으로 움직인다. 되돌아 올리면 영상도 되감긴다. 트랙은 1셀이 100vh이고 비트마다 셀 수가 달라 읽는 구간은 길고 액션 구간은 짧다. 좁은 화면은 같은 순서를 더 짧은 트랙으로 지난다.
- 단계 5: 타이머가 아니라 영상이 실제로 끝나야 완주다. 이동은 주소 대체라서 뒤로 가기로 인트로가 다시 시작되지 않는다.

### 1.2 자기 이름을 넣어 하나의 형태로 응축시킨다

- **사용자**: 영화 팬
- **진입**: 인트로 완주 또는 직접 방문 · **성공 조건**: 같은 이름이 언제나 같은 형태로 완성 · **예외**: 아래 비고

| 단계 | 화면 | 사용자 행동 | 다루는 대상 (R/W/D) | 결과 |
|---|---|---|---|---|
| 1 | Canvas | 이름을 친다 | EncodeInput W | 방금 친 글자 하나가 미리보기로 뜬다 |
| 2 | Canvas | 엔터를 누른다 | EncodeInput D | 전환음과 안개 가속이 함께 터진다 |
| 3 | Canvas | 형성 과정을 본다 | Glyph W | 입자가 모여 하나의 형태로 응축된다 |
| 4 | Canvas | 완성된 형태를 본다 | Glyph R | 가장자리가 미세하게 계속 움직인다 |
| 5 | Canvas | 계측 값을 읽는다 | Readout R | 덩어리·가닥·무게중심·링 네 줄이 뜬다 |
| 6 | Canvas | 물음표를 붙여 다시 넣는다 | EncodeInput W | 본체는 그대로, 갈고리만 더해진다 |

비고:

- 예외: 빈 입력은 무시된다. 감속 선호를 켜면 형성 과정 없이 즉시 완성형이 뜬다. 조합 중인 글자는 확정 전까지 제출되지 않는다.
- 단계 2: 좁은 화면에서는 확정과 동시에 키보드가 닫힌다. 잘못된 입력은 키보드를 유지한다.
- 단계 5: 네 줄의 높이는 고정이다. 분석을 켜도 줄 수와 패널 높이, 버튼 자리는 그대로이고 설명만 늘어난다. 좁은 화면은 같은 네 값을 두 줄로 접는다.
- 단계 6: 의문형은 토글이 아니라 입력의 물음표로 결정된다. 갈고리는 분리된 자리에서 만들어져 본체 값에 영향을 주지 않는다.
- 이름이 코덱 범위를 벗어나면 형태는 그대로 만들되 되읽을 수 없는 결정론 모드로 표시한다. 글자를 조용히 버리지 않는다.

### 1.3 형태에서 읽어낸 의미로 자기 이름의 뜻을 확인한다

- **사용자**: 영화 팬, 제너러티브 관심층
- **진입**: 완성된 형태 · **성공 조건**: 뜻이 형태의 어느 부위에서 나왔는지 짚임 · **예외**: 형성 중에는 분석이 잠긴다

| 단계 | 화면 | 사용자 행동 | 다루는 대상 (R/W/D) | 결과 |
|---|---|---|---|---|
| 1 | Canvas | 분석을 켠다 | Glyph R | 초록 격자와 정점, 순차 스캔이 덮인다 |
| 2 | Canvas | 이름의 뜻을 읽는다 | MeaningReading R | 기본 의미와 추가 의미로 유형이 정해진다 |
| 3 | Canvas | 유형 서사를 읽는다 | Archetype R | 이름이 그리는 사람이 장면으로 설명된다 |
| 4 | Canvas | 의미 칩을 고른다 | MeaningReading R | 그 의미의 실제 부위에 번호가 붙는다 |
| 5 | Canvas | 칩을 더 고른다 | MeaningReading R | 부위 표시가 겹쳐 쌓이고 번호는 그대로다 |
| 6 | Canvas | 형태를 클릭한다 | Glyph R | 문장이 하위 단위 형태로 분해된다 |

비고:

- 단계 2: 초점 방향이 전부 바깥이면 도래, 전부 안이면 수용, 섞이면 상호성이다. 추가 의미는 동시성(먼 초점 쌍), 여백(링 개구부), 잔향(먹 봉우리 둘 이상)이고 각각 확인·아님·미확인으로 나뉜다.
- 단계 3: 유형은 기본 의미 3 곱하기 추가 의미 조합 8, 스물넷이다. 미리 써 둔 해석이고 관측된 군집의 수가 아니다. 판독이 부분이면 유형을 붙이지 않는다.
- 단계 4: 시계 방향 안내는 근사이고 강조 좌표는 원래 각도를 유지한다. 번호는 표식 전체에서 고유하며 고르는 순서로 바뀌지 않는다.
- 단계 6: 문장은 줄, 문장, 단어, 글자 순으로 한 단계씩 쪼개진다. 더 못 쪼개면 멈춘다.
- 어원, 성격, 궁합, 전 세계 유일성은 말하지 않는다. 유형 서사는 세계관 안의 해석이라고 밝힌다.

### 1.4 만든 형태를 아카이브에 남기고 링크로 건넨다

- **사용자**: 영화 팬
- **진입**: 완성된 형태 · **성공 조건**: 주소만으로 같은 형태가 재현됨 · **예외**: 아래 비고

| 단계 | 화면 | 사용자 행동 | 다루는 대상 (R/W/D) | 결과 |
|---|---|---|---|---|
| 1 | Canvas | 공개를 누른다 | Response R | 무엇이 공개되는지 확인 창이 열린다 |
| 2 | 전역 오버레이 | 동의에 체크한다 | Response W | 가입 없이 익명 자격이 만들어진다 |
| 3 | 전역 오버레이 | 공개를 확정한다 | Glyph W, Response W | 서버가 형태를 다시 만들어 대조한다 |
| 4 | Canvas | 공유를 누른다 | Response R | 같은 버튼이 공유로 바뀌어 있다 |
| 5 | 전역 오버레이 | 보낼 곳을 고른다 | Response R | 주소와 유형 문구가 함께 전달된다 |
| 6 | GlyphDetail | 받은 주소로 들어온다 | Glyph R, Response R | 로그인 없이 같은 형태가 열린다 |

비고:

- 예외: 공개 실패와 취소는 입력을 보존한다. 공유 실패는 공개를 되돌리지 않는다. 같은 이름과 같은 버전은 새 기록을 만들지 않고 이미 있는 형태에 기여를 더한다.
- 단계 3: 서버는 보내온 형태를 믿지 않고 이름에서 다시 만들어 지문을 맞춘다. 지문은 다듬은 이름과 의문 여부와 버전으로 만든다.
- 단계 4: 버튼 라벨이 `PUBLISH`에서 공유로 바뀐다. 같은 자리에서 상태만 바뀌고 버튼이 늘지 않는다.
- 단계 5: 이름이 아니라 공개 주소만 나간다. 링크 복사는 별도 동작이고 기기 공유창은 어느 경로에서도 열지 않는다.
- 단계 6: 미리보기 그림은 저장된 형태로 그 자리에서 만든다. 공개를 내리면 새 요청부터 막히지만 이미 퍼진 미리보기는 회수할 수 없다.
- 세션이 사라지면 열람은 되지만 관리 권한은 돌아오지 않는다. 주소를 직접 보관하도록 안내한다.

### 1.5 같은 유형의 다른 이름과 형태의 연결을 살펴본다

- **사용자**: 제너러티브 관심층, 디자이너·개발자
- **진입**: 아카이브 또는 공유 주소 · **성공 조건**: 왜 연결됐는지 부위로 확인함 · **예외**: 아래 비고

| 단계 | 화면 | 사용자 행동 | 다루는 대상 (R/W/D) | 결과 |
|---|---|---|---|---|
| 1 | Archive | 계열 상징을 고른다 | Archetype R | 그 계열의 유형 피드가 세로로 열린다 |
| 2 | Archive | 표식 하나를 고른다 | Response R (많음) | 목록 대신 상세 화면으로 바뀐다 |
| 3 | Archive | 같은 유형을 훑는다 | Archetype R, Glyph R | 공통 의미의 원본 부위가 나란히 놓인다 |
| 4 | GlyphDetail | 연결 이유를 연다 | Resonance R | 어느 부위가 닮았는지 문장으로 뜬다 |
| 5 | ResonanceField | 지도를 연다 | Resonance R (많음) | 중심 둘레에 이웃 표식이 놓인다 |
| 6 | Compare | 내 이름을 대입한다 | EncodeInput W, Resonance R | 두 형태의 대응 부위에 같은 번호가 붙는다 |

비고:

- 예외: 기준을 넘는 연결이 없으면 빈 결과를 그대로 둔다. 조회 실패와 정상 무연결을 구분해 알린다. 구성원이 하나뿐인 유형에는 공통성을 만들지 않는다.
- 단계 1: 계열 상징은 사람의 표식이 아니라 저작된 안내용 형태다. 소속과 집계에 들어가지 않는다.
- 단계 3: 부위 그리드는 선택한 표식과 최대 두 구성원까지다. 공통 의미가 같은 모양이나 같은 자리를 뜻하지는 않는다고 함께 적는다.
- 단계 5: 목록은 최대 스물넷, 지도는 좁은 화면 여섯과 넓은 화면 열둘이다. 원형 배치의 거리는 유사도가 아니다. 노드를 고르면 근거가 열리고 중심 이동은 별도 버튼이다.
- 단계 6: 비교에 넣은 내 이름은 공개 동의 전까지 서버로 가지 않는다. 연결이 없는 비교도 저장하고 공유할 수 있다.
- 뒤로 가면 목록의 저장된 위치와 고른 구성원의 포커스로 돌아온다.

---

## 2. 정보 구조

### 2.1 페이지 리스트

| 페이지 | 경로 | 한 줄 목적 | 다루는 대상 | 등장 시나리오 |
|---|---|---|---|---|
| Landing | `/` | 세계관 전달과 생성 인계 | HeroBeat | 1 |
| Canvas | `/canvas` | 이름 인코딩, 판독, 공개 | EncodeInput, Glyph, Readout | 2, 3, 4 |
| Archive | `/archive` | 계열과 유형별 공개 기록 | Archetype, Response, Glyph | 5 |
| GlyphDetail | `/glyph/[id]` | 공개 표식 하나와 주요 연결 | Glyph, Response, Resonance | 4, 5 |
| ResonanceField | `/field/[id]` | 중심 표식 둘레의 관계 지도 | Glyph, Resonance | 5 |
| Compare | `/compare/[leftId]/[rightId]` | 두 형태의 대응 부위 확인 | Glyph, Resonance | 5 |
| 전역 오버레이 | 경로 없음 | 공개 동의, 공유, 소리, 언어 | Response, MeaningReading | 1, 3, 4, 5 |

비고:

- Canvas의 3절 대상에는 MeaningReading과 Archetype도 포함된다. 칸 길이 때문에 표에서 생략했다.
- Compare의 오른쪽 자리는 비워 둘 수 있다. 비면 방문자가 자기 이름을 넣는 화면이 된다.
- 옛 `/me`는 Archive로 대체된다. `/map`, `/story`는 현재 경로가 아니다.

### 2.2 계층 트리

```
/ (Landing)
├── 타이틀 (작품 표제 + 시작 + 건너뛰기)
├── 스크럽 트랙 (영상 + 비트 카피 6마디, 1셀 = 100vh)
└── 하단 HUD (마디 카운터 + 진행바)

/canvas (Canvas)
├── 챔버 (화면 전체 안개 + 중앙 표식)
├── 입력 줄 (이름 입력 + 타이핑 미리보기)
├── 계측 패널 (네 줄 값 + 분석 + 공개·공유 + 아카이브)
└── 판독 영역 (이름의 뜻 + 유형 서사 + 의미 칩)

/archive (Archive)
├── 계열 상징 (도래 · 수용 · 상호성)
├── 유형 피드 (유형 제목 + 짧은 뜻 + 구성원)
└── 선택 상세 (원본 표식 + 분석 + 같은 유형 + 부위 그리드)

/glyph/[id] · /field/[id] · /compare/...
├── 공개 표식과 표시 이름
├── 주요 연결과 근거 문장
└── 지도 또는 나란히 비교

전역 오버레이 (경로 없음)
├── 공개 동의 창
├── 공유 대상 선택 창
└── 소리 토글 · 언어 전환
```

---

## 3. 데이터 모델 (01 4.2절 이름 그대로)

### 3.1 대상 정의

정의와 영속성:

| 이름 | 식별자 | 주요 속성 (윤곽) | 영속성 |
|---|---|---|---|
| 입력 이름 | EncodeInput | 이름 문자열, 물음표 유무, 버전 | 휘발 |
| 표식 | Glyph | 링, 슬롯 12, 가지, 덩어리, 비산점 | 서버 |
| 계측 값 | Readout | 덩어리 수, 가닥 수, 무게중심, 링 | 휘발 |
| 의미 판독 | MeaningReading | 기본 의미, 추가 의미 3, 관측 근거 | 휘발 |
| 유형 | Archetype | 제목, 뜻, 서사, 특징, 한마디 | 정적 |
| 공개 기록 | Response | 표시 이름, 동의 시각, 철회 시각 | 서버 |
| 연결 | Resonance | 수준, 점수, 관측 근거, 양쪽 좌표 | 서버 |
| 인트로 비트 | HeroBeat | 카피, 영상 구간, 셀 가중치, 변주 | 정적 |

흐름과 관계:

| 이름 | 만드는 곳 | 보이는 페이지 | 관계 |
|---|---|---|---|
| 입력 이름 | 입력 줄, 옛 주소 | Canvas, Compare | 표식의 유일한 출처 |
| 표식 | 인코딩 규칙, 공개 시 서버 | Canvas, Archive, GlyphDetail | 이름 하나에 하나 |
| 계측 값 | 표식 파생값 | Canvas | 표식을 참조 |
| 의미 판독 | 형태 분류 규칙 | Canvas, Archive, GlyphDetail | 유형을 고르는 열쇠 |
| 유형 | 정적 카탈로그 | Canvas, Archive | 의미 판독과 1:1 |
| 공개 기록 | 공개 동의 창 | Archive, GlyphDetail | 사용자와 표식을 잇는다 |
| 연결 | 관계 계산 | GlyphDetail, ResonanceField, Compare | 공개 표식 둘을 잇는다 |
| 인트로 비트 | 정적 데이터 | Landing | 영상 구간에 결속 |

비고:

- 영속성 값은 정적 / 휘발 / 세션 / 브라우저 / 서버다. 표식과 공개 기록만 동의 후에 서버로 간다. 연결은 저장된 행이 남아 있지만 화면이 보는 값은 요청할 때 다시 계산한다.
- 시드와 슬롯, 가지, 덩어리, 비산점은 별도 대상이 아니라 표식의 내부 구조다. 범위와 단위는 `src/utils/heptapod/MODEL.md`에 있다.
- 표식은 복원 가능한 데이터 채널과 장식만 담당하는 표현 채널로 나뉜다. 번짐과 붓질 지터는 정보를 담지 않는다.
- 표식에서 뽑은 특징 묶음(옛 이름 `GlyphFeature`)은 관계 계산의 입력이고 공개 행에서는 `feature_vector` 열에 남는다. 연결 종류는 전체 형태, 일부 구조, 그리고 질문 갈고리만 다른 `VARIANT` 세 가지다.
- 과거 분류는 계산에서 뺐다. Canvas가 실제 기하에 쓰지 않는 `cluster.type`과 무게중심 사분면(`Crown`, `Wake`, `Root`, `Veil`, 열 이름은 `contour_primary`·`contour_quadrant`)은 기록으로만 남기고 연결 조건이나 형태 설명에 쓰지 않는다.
- 같은 이름의 다른 표기는 하나로 모인다. `Louise`, ` louise `, `LOUISE`는 같은 다듬은 이름이 되고 원래 표기는 공개 기록 쪽에만 남는다. 의문 여부는 다듬는 단계의 `isInterrogative` 값이 그대로 `is_interrogative` 열이 되고, 공개 여부는 `is_public` 열이다.
- 공개 표식의 정지 이미지는 파생 데이터라서 원본 형태를 바꾸지 않는다. 별도 작업 테이블이 그 생성 상태만 들고 있다.

### 3.2 데이터 모델 활용 (이름 사전)

| 데이터명 | 한국어 | 코드 식별자 | 예상 테이블명 | 생성 책임 페이지 |
|---|---|---|---|---|
| `EncodeInput` | 입력 이름 | `encodeInput` | (클라이언트) | Canvas |
| `Glyph` | 표식 | `glyph` | `glyphs` | Canvas |
| `Readout` | 계측 값 | `readout` | (클라이언트) | Canvas |
| `MeaningReading` | 의미 판독 | `meaningReading` | (클라이언트) | Canvas |
| `Archetype` | 유형 | `archetype` | (정적) | 없음 |
| `Response` | 공개 기록 | `response` | `glyph_contributions` | Canvas |
| `Resonance` | 연결 | `resonance` | `glyph_relations` | GlyphDetail |
| `HeroBeat` | 인트로 비트 | `heroBeat` | (정적) | 없음 |

비고:

- 네 번째 테이블 `glyph_image_jobs`는 공개 표식의 정지 이미지 생성 상태만 담는 파생 테이블이라 대상 표에 올리지 않았다. 세 테이블명과 예약어 사전(`sql-reserved-words.md`)의 충돌은 없다.
- 이름을 옮긴 것: 옛 문서의 `GlyphContribution`과 `GlyphRelation`은 각각 `Response`와 `Resonance`가 됐고 테이블 이름은 그대로다. 옛 문서가 따로 세웠던 인증 주체는 별도 대상이 아니라 `auth.users`의 익명 사용자다.
- 쓰지 않는 테이블: `bookmarks`와 `reports`는 초기 마이그레이션에 남아 있지만 화면과 조회 경로가 없다. 지우지 않고 그대로 둔다.

---

## 4. 인터랙션 원칙 (최대 5)

| 원칙 | 근거 (01 3절 가치) | 드러나는 곳 | 유도되는 컴포넌트 유형 |
|---|---|---|---|
| 같은 이름은 언제나 같은 형태로 돌아온다 | Determinism (잠정, Q2) | Canvas, 공유 주소 진입 | 순수 인코딩 모듈, 형태 렌더러 |
| 형태에서 읽은 것만 말한다 | Honesty (잠정, Q2) | 판독 영역, 연결 근거 | 관측 근거 패널, 부위 강조 레이어 |
| 움직임은 시간이 아니라 스크롤의 함수다 | Determinism (잠정, Q2) | Landing 전 구간 | 영상 스크럽, 위치 결속 사운드 |
| UI는 형태의 들러리로 물러난다 | Stillness (잠정, Q2) | Canvas, Archive 전역 | 배경 없는 계기 패널, 헤어라인 |
| 공개는 한 번의 명시적 동의로만 일어난다 | Honesty (잠정, Q2) | 공개 동의 창, 공유 창 | 동의 확인 창, 상태 전환 버튼 |

비고:

- 원칙 3: 소리도 같은 손을 따른다. 스크롤이 멎으면 클립이 잦아들고 베드만 남으며, 위치가 벌어지면 다시 맞춘다 (`07-scroll-scrub-sound-plan.md`).
- 원칙 3: 캡션 글자도 같은 진행도 하나로 움직인다. 등장과 퇴장은 번짐과 자간으로만 하고 슬라이드와 바운스를 쓰지 않는다 (`08-kinetic-typography-ideation.md`).
- 원칙 4: 감속 선호(`prefers-reduced-motion`)를 켜면 안개와 캡션과 형성이 모두 최종 상태로 고정된다. 좁은 화면의 목록과 지도는 움직이는 형태 대신 같은 형태의 정지 이미지를 쓰고, 상세와 생성 결과만 살아 움직인다.
- 원칙 5: 공개 실패는 실패로 표시한다. 조용히 성공 화면으로 넘어가거나 재시도로 다시 올리지 않는다.

---

## 5. 컴포넌트 리스트

| 컴포넌트 | 페이지/섹션 | 구분 | 카테고리 | 비고 |
|---|---|---|---|---|
| RatioContainer | Canvas · 챔버 | 재활용 | container | 정방형 비율 고정 |
| FadeTransition | Canvas · 계측 패널 | 재활용 | motion | 패널 등장 페이드 |
| VideoScrubbing | Landing · 스크럽 트랙 | 수정 | scroll | 모바일 트랙, 실제 종료 판정 |
| GNB | 전역 헤더 | 수정 | navigation | 언어·경로 항목 추가 |
| LineGrid | Archive · 서사 | 수정 | layout | 에디토리얼 괘선 격자 |
| HeptapodHeroIntro | Landing 전체 | 신규 | templates | 트랙과 완주 인계 |
| HeptapodEncoderPage | Canvas 전체 | 신규 | templates | 인코딩·판독·공개 흐름 |
| MyArchivePage | Archive 전체 | 신규 | templates | 이름은 옛 화면에서 남음 |
| GlyphDetailPage | GlyphDetail 전체 | 신규 | templates | 공개 표식과 주요 연결 |
| ResonanceFieldPage | ResonanceField 전체 | 신규 | templates | 지도와 목록 전환 |
| ArchiveComparePage | Compare 전체 | 신규 | templates | 두 형태 나란히 비교 |
| AppGNB | 전역 헤더 | 신규 | navigation | GNB 래퍼, 언어 전환 포함 |
| LogogramChamber | Canvas · 챔버 | 신규 | motion | 안개 깊이 모션 |
| LogogramRendererCanvas | 챔버, 상세 | 신규 | motion | 입자 형성, 현재 유일 사용 |
| StaticGlyphImage | 목록, 지도, 미리보기 | 신규 | data-display | 좁은 화면 정지 이미지 |
| ArchiveDepthExplorer | Archive · 계열과 피드 | 신규 | data-display | 계열 상징과 유형 묶음 |
| ArchiveSelectedGlyph | Archive · 선택 상세 | 신규 | data-display | 같은 유형과 부위 그리드 |
| ArchetypeNarrative | Canvas, Archive | 신규 | data-display | 유형 서사와 한마디 |
| GlyphMeaningSummary | Canvas, GlyphDetail | 신규 | data-display | 이름의 뜻과 관측 근거 |
| GlyphPairComparison | Compare · 본문 | 신규 | data-display | 대응 부위 같은 번호 |
| 관계 표시 묶음 | ResonanceField 본문 | 신규 | data-display | 지도와 목록 두 표현 |
| AnalysisOverlay | Canvas · 분석 | 신규 | overlay-feedback | 초록 격자와 스캔 |
| GlyphObservationOverlay | 분석, 상세, 비교 | 신규 | overlay-feedback | 선택 의미의 부위 강조 |
| PublishDialog | 전역 오버레이 | 신규 | overlay-feedback | 동의 확인과 상태 전환 |
| SocialShareDialog | 전역 오버레이 | 신규 | overlay-feedback | 보낼 곳 선택 |
| GlyphObservationChips | 판독 영역 | 신규 | input | 의미 다중 선택 |
| ScrubHud | Landing · HUD | 신규 | scroll | 마디 카운터와 진행바 |
| useScrubSoundEngine | Landing · 소리 | 신규 | scroll | 위치 결속, 드리프트 보정 |
| 스크럽 캡션 묶음 | Landing · 비트 카피 | 신규 | kinetic-typography | 변주 7종 + 공통 5 |

비고:

- **합계**: 재활용 2 · 수정 3 · 신규 24 (행 기준, 묶음은 한 건). 파일 기준으로는 비교 215개 중 동일 99, 다름 17, 이 저장소에만 99다.
- **대조 범위**: 스타터킷 `src/components`와 같은 상대 경로 파일을 전부 비교했다. 표에는 현재 화면(랜딩·캔버스·아카이브·상세·지도·비교)이 실제로 쓰는 것만 올렸다.
- **제외 기준**: 다른 17개 중 12개는 문구를 사전으로 뺀 차이뿐이고 현재 화면이 쓰지 않는다(ImageCard, MoodboardCard, CarouselContainer, CategoryTab, FileDropzone, SearchBar, TagInput, FilterBar와 배럴 4). 이 저장소에만 있는 99개 중에는 스토리 파일과 묶음 구성원, 현재 화면이 쓰지 않는 표현 실험(LogogramRendererSvg, LogogramRendererWebgl, DataReadout, ResonancePreview, ArchiveMeaningExplorer, SoundFab)이 들어 있어 표에 넣지 않았다.
- **묶음 구성**: 관계 표시 묶음 = ResonanceMap, ResonanceList, RelationInspector, GlyphNode. 스크럽 캡션 묶음 = ScrubCaption, CaptionFrame, InkLetters, inkMotion, captionStyles, SeamCaption, RingCaption, MirrorCaption, ScrambleCaption, RotateCaption, FlipReflowCaption, TypeCaption, TitleDisperse, InstrumentLine.
- **이름 주의**: Archive를 그리는 것은 `MyArchivePage`다. 개인 응답 화면이 사라지면서 역할이 공개 아카이브로 바뀌었고 파일 이름만 남았다.
- **직접 사용**: 입력 줄, 버튼, 칩, 모달, 본문은 MUI 기본 컴포넌트를 그대로 쓴다. 파일이 없어 대조 대상이 아니라 표에 넣지 않았다.
- **파일 경로**: 표의 항목은 카테고리 폴더 그대로다. `components/container/`, `components/layout/`, `components/data-display/`, `components/kinetic-typography/`, `components/overlay-feedback/AnalysisOverlay.jsx`, `components/templates/HeptapodHeroIntro.jsx`, `components/templates/HeptapodEncoderPage.jsx` 식이다.
- **로직 모듈** (컴포넌트 아님): `src/utils/heptapod/` 32개. 인코딩은 `normalizeName.js`, `validateName.js`, `reversibleCodec.js`, `reversibleModel.js`, `buildModel.js`, 표현은 `logogramParticles.js`, `detectRenderTier.js`, 관계는 `extractGlyphFeatures.js`, `scoreFormRelation.js`, `relateGlyphs.js`, `buildRelationReasons.js`, `resonanceView.js`, 소리는 `backgroundMusic.js`(YouTube 내장 플레이어로 OST 루프)와 `ambientAudio.js`다. 서버 쪽은 `src/lib/supabase.js`와 `src/hooks/data/` 아래 조회·공개 훅, 그리고 `src/lib/` 16개(미리보기 카드, 정지 이미지), `src/routes/` 10개(경로와 스크롤), `src/workers/` 1개(정지 이미지 생성)다.
- **재활용 제외**: GradientOverlay(안개를 가벼운 레이어로 직접 만들어 제외), SectionContainer·StyledParagraph·Title(별도 읽기 섹션을 두지 않음), FullPageContainer(라우트가 화면 전체를 직접 그린다), CustomCard(`components/card/CustomCard.jsx`, 목록을 카드로 감싸지 않고 표식만 세운다), TagInput(`components/input/TagInput.jsx`, 태그 체계를 접었다), AppShell(전역 셸 없이 라우트가 직접 그린다).

---

## 6. 다음 문서로 넘기는 것

| 받는 곳 | 가져가는 것 |
|---|---|
| 03-visual-direction | 2.1절 페이지 목록, 페이지별 콘텐츠 신호, 4절 원칙 |
| /supabase-integration | 3.2절 사전, 2.1절, 1절 단계 표, 5절 컴포넌트 리스트 |
| /component-work | 5절 신규·수정 항목 |
