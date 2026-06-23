# Heptapod B Encoder — Audio & Depth Motion

> 01~03 기획 이후 추가 구현된 **오디오 시스템**과 **배경 Z-depth 모션**의 실제 구현 문서.
> 코드 기준 (구현 완료): `src/utils/heptapod/ambientAudio.js`, `src/utils/heptapod/backgroundMusic.js`,
> `src/components/motion/LogogramChamber.jsx`, `src/components/templates/HeptapodEncoderPage.jsx`.

---

## 1. 오디오 시스템

두 갈래로 분리한다. **효과음(SFX)은 합성**, **배경음악(OST)은 외부 스트리밍**.

| 갈래 | 파일 | 음원 | 이유 |
|------|------|------|------|
| 효과음 (전환·스캔) | `ambientAudio.js` | Web Audio API로 **실시간 합성** | 영화 사운드는 저작권 — 무드만 재현 |
| 배경음악 (Heptapod B) | `backgroundMusic.js` | **YouTube IFrame Player API** (API key 불필요) | 풀트랙 + 익명 재생 + JS 제어. 영화 OST 원곡 |

### 1.1 효과음 — `ambientAudio.js`

영화 사운드를 직접 쓰지 않고 Web Audio로 합성한다 (저작권 회피, 무드만 재현). `createAmbientAudio()`가 컨트롤러를 반환.

| API | 동작 |
|-----|------|
| `encodeStart()` | 시네마틱 전환음 — airy **whoosh**(밴드패스가 솟구쳐 지나가는 공기) + 도착 순간 **boom**(sub 사인 피치 드롭) + **탁**(저역 노이즈 버스트) + convolver reverb 꼬리. 끝나면 무음 |
| `scanBeeps(count, opts)` | 분석 오버레이 edge 등장 타이밍에 잔잔한 둥근 톤("띡")을 throttle(min 160ms gap)로 솎아 재생 |
| `formationComplete()` | 의도적 무음 (전환음 reverb 꼬리로 자연 종료) |
| `setEnabled(bool)` / `dispose()` | 마스터 게인 페이드 음소거 / 컨텍스트 해제 |

- **피크 게인** `PEAK = 0.44` — 배경음악에 묻히지 않게 상향(기존 0.26). whoosh=PEAK×0.5, boom=PEAK×1.1, 탁=PEAK×0.8, scan=PEAK×0.11로 스케일.
- **자동재생 정책**: `AudioContext`는 사용자 제스처(ENCODE)에서 `resume()`.
- 호출 지점: `HeptapodEncoderPage`의 `handleEncode`(ENCODE), 루트 분해/자식 드릴 onClick(`encodeStart`), `AnalysisOverlay onScan`(`scanBeeps`).

### 1.2 배경음악 — `backgroundMusic.js`

`createBackgroundMusic({ videoId, volume })` → 컨트롤러. **API key 없이** `iframe_api` 스크립트만 로드.

| 항목 | 값/동작 |
|------|---------|
| 음원 | `VIDEO_ID = 'KzaqrQuwr1k'` (Jóhann Jóhannsson — Heptapod B, UMG/Paramount 제공) |
| 렌더 | 화면 밖(`left:-9999px`) 1×1px 숨긴 iframe. 컨트롤·키보드 비활성 |
| 루프 | `loop:1 + playlist:videoId` (YouTube loop는 playlist 지정 필요) |
| 음량 | 기본 32, 페이지에서 **20**으로 생성(효과음 헤드룸 확보) |
| API | `play / pause / toggle / isPlaying / setVolume / dispose` |
| 정책 대비 | `play()`는 `wantPlaying`을 보존 → API ready 전 클릭도 onReady에서 재생. 로드 실패 시 무음으로 우아하게 강등 |
| 음원 교체 | `VIDEO_ID` 한 줄 교체 (대체 후보: `F0ahB25FJ6o`) |

**기본 재생(default on)** — `HeptapodEncoderPage`:
1. 마운트 시 컨트롤러 생성 + `play()` 즉시 시도 + 토글 상태 `isMusicOn=true`.
2. 브라우저 자동재생 차단 대비 → **첫 `pointerdown`/`keydown`에서 1회 재생 보장** 후 리스너 해제.
3. 토글 버튼은 좌상단 타이틀 "Heptapod B" 블록 안: `► PLAY OST` ↔ `❚❚ PLAYING OST`.

> **제약(불가피)**: 완전 무음 상태의 즉시 자동재생은 브라우저 표준 정책상 차단된다. 페이지 진입 후 **첫 상호작용**에서 풀 사운드로 시작된다.

> **저작권 주의**: 효과음(`ambientAudio.js`)은 의도적으로 OST 원음을 피했으나, 배경음악은 OST 원곡을 임베드한다. 공개 배포 시 고려 필요.

---

## 2. 배경 Z-depth 모션 — `LogogramChamber.jsx`

**대상은 배경 안개(글리프 아님).** 안개가 화면 안쪽으로 파고드는 깊이감을 준다. 글리프(문자)는 기존 입자 형성 그대로 — Z 변형 없음.

### 2.1 두 모드

| 모드 | 키프레임 | 동작 | 트리거 |
|------|----------|------|--------|
| **평상시 상시 전진 (creep)** | `fogZoom` (scale 1→2.1) | 안개가 끊임없이 천천히 안으로 줌인. 무한 루프 | 마운트 시 상시 (isActive) |
| **생성 시 가속 (dive burst)** | `fogDiveIn` (scale 1→1.32) | 문자 생성 순간 안쪽으로 "확" 가속. 1회 | `diveKey` 변경 |

### 2.2 creep — 끊김 없는 연속 줌 (크로스페이드 2겹)

- 단일 줌 루프는 끝에서 scale 리셋이 튄다 → **같은 `fogZoom`을 절반 위상차로 두 겹** 겹쳐 크로스페이드.
- **핵심 함정 해결**: opacity 피크가 *중간 스케일*에 있으면 두 겹의 평균 스케일이 고정돼 **"멈춰" 보인다**. 그래서 opacity를 **15~85% 구간 내내 1로 유지(flat-top)**, 이음새(0%/100%)에서만 0으로 떨궈 두 번째 겹이 가린다. 그 결과 보이는 겹이 scale 1→2.1을 끝까지 통과하며 연속 전진으로 보인다.
- 주기 `CREEP_MS = 8000ms` (값↑ = 느림). transformOrigin `50% 45%`.
- 안개 노이즈 3장(`fogStack`)의 기존 2D drift(`chamberDriftA/B/C`)는 creep transform과 합성되어 살아 움직인다.

### 2.3 dive burst — 가속, bounce 없음

- `fogDiveIn`: **단조 전진** `scale 1 → 1.32`만 — 되돌아오는(축소) 구간 없음 = **bounce 없음**. (기존 1→1.85→1 복귀 설계가 "확대됐다 뒤로 가는" 느낌을 유발 → 제거)
- `cubic-bezier(0.05, 0.7, 0.1, 1)` **ease-out + `forwards`** → Enter 직후 즉시 빠르게 나갔다 감속, 끝값 유지. 다음 생성 때 리셋.
- `DIVE_MS = 1300ms`. front-load라 **peak가 초반** → Enter 누르는 순간 가속이 체감된다(완료 시점 아님).
- 구조: burst 래퍼(`key={diveKey}`, fogDiveIn) → creep 2겹 → fogStack. burst transform이 creep과 합성되어 "상시 전진이 확 빨라지는" 가속이 된다.

### 2.4 타이밍 연결 (`HeptapodEncoderPage`)

- 상태 `diveKey`(정수). `triggerRush()`가 `diveKey + 1` → 챔버 remount로 dive 1회 재생.
- 트리거 지점(모두 **제스처 시점 = Enter/클릭**, 형성 완료 아님): `handleEncode`(Enter/ENCODE), 루트 분해 onClick, 자식 드릴 `onSelect`.
- 효과음 `encodeStart`와 **동시 발화** → 소리·화면 가속이 함께 도착.
- `prefers-reduced-motion`: `triggerRush` 무동작 + creep/burst 비활성(단일 정적 안개).

### 2.5 튜닝 노브 (`LogogramChamber.jsx`)

| 목적 | 노브 |
|------|------|
| 평상시 전진 속도 | `CREEP_MS` (작을수록 빠름) |
| 평상시 전진 깊이 | `fogZoom` 100% `scale(2.1)` |
| 생성 가속 강도 | `fogDiveIn` 100% `scale(1.32)` |
| 생성 가속 속도/체감 | `DIVE_MS`, burst easing `cubic-bezier(0.05,0.7,0.1,1)` |

---

## 3. 신규 파일 요약

| 파일 | 역할 |
|------|------|
| `src/utils/heptapod/ambientAudio.js` | 합성 효과음 컨트롤러 (whoosh/boom/탁/scan, reverb) |
| `src/utils/heptapod/backgroundMusic.js` | YouTube IFrame 배경음악 컨트롤러 (key 불필요, default-on) |
| `LogogramChamber.jsx` (수정) | 안개 Z-depth creep(상시) + dive(생성) — `diveKey` prop |
| `HeptapodEncoderPage.jsx` (수정) | 오디오/음악 라이프사이클, `triggerRush`, 음악 토글 UI, default-on |
