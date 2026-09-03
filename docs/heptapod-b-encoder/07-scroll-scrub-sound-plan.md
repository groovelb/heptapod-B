# 07 · Scroll Scrub + Sound Plan — oneir 테크닉 이식

> 히어로 인트로의 스크롤 방식을 **세그먼트 100% 재생(스크롤 잠금)** 에서 **스크롤 스크러빙 + Lenis 완급 조절 + 샘플링 사운드 매핑** 으로 바꾸는 계획.
> 레퍼런스: `~/Desktop/oneir` (ONEIR 랜딩, 2026-07-21). 선행 문서: `02-ux-flow.md` 시나리오 0, `04-audio-and-motion.md`, `06-hero-storyline.md`.
> 작성일: 2026-09-03 · 결정 확정·1차 구현: 2026-09-03 (§9)

---

## 0. 취지

| 항목 | 현재(세그먼트 재생) | 목표(스크럽) |
|---|---|---|
| 영상 구동 | 스테이지 진입 시 `play()` 로 구간 실시간 재생. 재생 중 `lenis.stop()` 으로 스크롤 잠금 | `currentTime` 이 스크롤 위치에 결속. 잠금 없음, 양방향 |
| 싱크 방식 | 잠금으로 강제 (스크롤 연속성 단절, 역스크롤 클램프) | 영상은 스크롤에 100% 종속. 소리만 실시간이라 별도 엔진이 위치 결속·아이들 게이트·드리프트 보정으로 따라온다 |
| 페이싱 | 영상 1s ≈ 12vh 선형 | Lenis 감쇠(lerp) + **비트별 셀 가중치** + (선택) 구간별 휠 감속 |
| 소리 | 영상 트랙 unmuted 재생 (모바일 취약) | 영상은 muted. 비트별 샘플 mp3 를 Web Audio 로 스크롤 위치에 매핑 |

핵심 논리: 스크럽은 시각 싱크가 정의상 완벽하지만 소리는 실시간으로만 흐른다. 그래서 (1) Lenis 가 스크롤 속도를 연속·완만하게 만들어 소리가 1x 로 흐를 수 있는 시간을 벌고, (2) 소리 엔진이 화면 위치에서 벗어나면 재정렬하고 멈추면 끊는다.

---

## 1. oneir 에서 가져올 것 — 3축 분석

### 1.1 스토리텔링 테크닉 (`ScrubSequence` + `BeatCaptionOverlay` + `ScrubHeroTitle` + `ScrubHud`)

- **트랙 = 클립 셀 N × 100vh + 퇴장 셀 1**. sticky 100dvh 스테이지에는 영상만 핀. 스크럽은 앞 N셀에서만(`scrollRange`), 완주 지점 = sticky 해제 지점.
- **등간격 셀 → 클립 타임코드 재매핑** (`mapProgress`): 클립 길이(5s/10s)와 무관하게 비트당 100vh. 페이싱의 1차 장치.
- **캡션은 애니메이션 없이 트랙 좌표에 실배치** (`top = (cell + anchor) / cells`). sticky 스테이지 밖 콘텐츠 레이어라 자연 스크롤로 핀된 영상 위를 지나간다. 등장·퇴장·opacity 일절 없음.
- **표시 셀 = 도착 셀 + 1**: 클립 i 의 도착 프레임이 셀 i+1 시작부에 정지되므로 캡션이 "지금 보이는 장면"을 설명한다. 셀 0 은 타이틀 전용.
- **A/B/C 지그재그 변주** (좌 h2 / 우 h1 / 중앙 display), **끝에서부터 세어 마지막은 항상 C** (중앙 스테이트먼트로 닫힘).
- 반전 잉크 + 어두운 확산 헤일로는 **연출 플래그** (`hasInvertedInk`), 프레임 밝기 측정값이 아님.
- HUD: sticky 하단 카운터 `01 — 09` + 진행바. 텍스트는 `ref.textContent`, 진행바는 MotionValue `scaleX` 직결 — 리렌더 0.
- 포스터는 브라우저 `poster` 대신 자체 `<img>` 오버레이 (되감기 시 재출현 방지). `videoReady` 에 1회 페이드.
- 영상 컬러 그레이딩은 SVG `feComponentTransfer` 필터 (비디오 레이어에만, 캡션 제외).
- 모바일: 1:1 크롭 + 필터 off + `mobileSrc` 960.
- **사운드 토글 `SoundFab`**: `mix-blend-mode: difference` 아이콘만, 히어로 벗어나면 숨김. 기본 ON. 언락은 `pointerdown/pointerup/touchend/keydown/click` — wheel·scroll·touchstart 는 활성 자격이 없어 제외.

### 1.2 비디오 스크러빙 (`VideoScrubbing` — oneir 판이 heptapod 판보다 4단계 앞섬)

- `window.scrollY` 직접 읽음. Lenis 가 네이티브 scrollY 를 갱신하므로 그대로 동기.
- **seek 게이팅**: 진행 중 seek 1개 + pending 최신 목표 1개. `seeked` 에서 따라잡음. 매 프레임 `currentTime` 덮어쓰기 금지(디코더 thrash 방지, 모바일 수렴).
- rAF 는 scroll 이벤트가 있을 때만 예약. 영구 60fps 루프 없음(Lenis·seek·사운드와 경합 방지).
- **iOS 예열**: `muted` 를 프로퍼티로 직접 세팅 + `playsinline` + 첫 제스처 완료(`touchend/pointerup/click`)에 `play()→pause()`. 없으면 첫 프레임에 멈춘 채 캡션만 흐른다.
- `onReady` / `onLoadProgress` 로 로딩바·포스터 구동.
- **인코딩**: `-g 6 -keyint_min 6 -sc_threshold 0`, faststart, 1920 + 960. 오디오는 파일에 남기되(직접 재생 시 소리 존재) 스크럽은 muted.

### 1.3 사운드 샘플링 + 엔진 (`useScrubSoundEngine`)

소리는 영상과 완전히 분리된 Web Audio 그래프. 4원칙:

1. **위치 결속** — 클립 진입 시 통째로 흘리지 않고 `offset = fraction × duration` 지점부터 시작.
2. **아이들 게이트** — 140ms 무입력이면 클립 정지(1.1s 페이드), 베드만 남음. 화면 정지 vs 소리 진행 어긋남 원천 차단.
3. **드리프트 보정** — 스크롤 중 실제 재생 위치와 화면 위치가 0.35s 넘게 벌어지면 재정렬(0.25s 크로스페이드). detune 에 의한 rate 커플링 반영.
4. **종료 무음** — 완주 시 베드까지 2.2s 페이드. 되돌아오면 복귀.

레이어 3겹: **베드 루프**(gapless `loopStart/End`) + **비트 클립** + **합성 드론**(오프닝 셀 전용, 스크롤 멈춰도 지속). 전역 피치 -40 cents.
언락은 `ctx.state === 'running'` 일 때만 커밋(wheel 로 resume 실패 시 "켜짐" 오판 방지). iOS `navigator.audioSession.type = 'playback'` 으로 무음 스위치 우회.

**오프라인 파이프라인** (`scripts/`): 스파팅 시트 JSON(`stems[{prompt,start,gain_db,fade_in/out}]`) → ElevenLabs SFX stem(캐시) → ffmpeg 컨폼 + 마스터 체인(-16 LUFS, 저역 중심) → 원본 프레임에 무손실 mux. 대안: MMAudio V2 / Hunyuan-Foley video-to-audio. 웹용 클립 mp3 는 채택 mp4 에서 `-map a` 추출 (`build-hero-scrub.mjs`).

---

## 2. heptapod 현재 상태 대조

### 2.1 유지

- B0~B5 카피·비트 데이터(`heptapodHeroStory.js`), Cinzel 헤드라인, 마스터 타이틀.
- 핸드오프: 고정 캔버스 제자리 fade-in + `encProgress` 히스테리시스 게이트(display/OST/입력/fog). 퇴장 셀이 곧 핸드오프 스페이서.
- `audioActive` 로 인코더 OST 전환, SKIP, `?name=` 인트로 우회, reduced-motion.
- App 의 Lenis (lerp .05 / wheelMultiplier .65 / syncTouch — 2026-09-03 적용).

### 2.2 제거

- `playSegment` / `triggerStage` / 센티넬 IO / `dimmed` 잠금 / 역스크롤 클램프 / rVFC 세그먼트 정지 감시 / START 의 스크롤 잠금 역할.

### 2.3 자산 상태

| 자산 | 상태 | 조치 |
|---|---|---|
| `kling-audio-01-final-hero-v1-source01v2-screenfillv4.mp4` | 1916×1080 24fps 47.08s, **키프레임 7개** (스크럽 불가), mono AAC -24.5 LUFS | GOP 6 재인코딩 → 1920 + 960 |
| `kling-audio-01-final-scrub-1280-allkey.mp4` | all-intra 1280, 무음, 31MB | 폐기 (GOP 6 판이 대체) |
| 세그먼트 원본(`kling-audio-*`) | 대부분 stereo | stem 교체 시 소스 후보. 1차는 최종본 컷 사용 |

---

## 3. 목표 아키텍처

```
App (Lenis: lerp .05 / wheelMultiplier .65 / syncTouch + syncTouchLerp .05)
└ HeptapodHeroIntro (재작성)
   ├ HeroScrubTrack            ← oneir ScrubSequence 이식 (N셀 + 퇴장셀, sticky 100dvh 스테이지)
   │   ├ VideoScrubbing        ← oneir 판으로 교체 (seek 게이팅·iOS 예열·mapProgress·onReady)
   │   ├ PosterOverlay         (자체 img, videoReady 1회 페이드)
   │   └ 콘텐츠 레이어(트랙 좌표, 자연 스크롤)
   │       ├ HeroTitle         셀 0 — HEPTAPOD B + SCROLL 힌트 (+ START = 사운드 언락 CTA)
   │       ├ BeatCaptions      B0~B5, 도착셀+1, A/B/C 변주(마지막 B5 = C 중앙)
   │       └ Hud               카운터 01 — 06 + 진행바
   ├ ScrubSoundLayer           progress → engine.handleProgress
   ├ SoundFab                  우하단, 히어로 벗어나면 숨김
   └ Handoff(퇴장 셀)           기존 fixed 캔버스 fade-in + audioActive(OST)
```

데이터 추가: `src/data/heptapodScrubTimeline.js`
```js
export const HERO_SCRUB_TIMELINE = {
  total: 47.08,
  clips: [
    { id: 'B0', start: 0,  duration: 4,  cells: 0.8  },
    { id: 'B1', start: 4,  duration: 8,  cells: 1.25 },
    { id: 'B2', start: 12, duration: 11, cells: 1.0  },
    { id: 'B3', start: 23, duration: 6,  cells: 1.25 },  // 명제 비트, 읽기 최적
    { id: 'B4', start: 29, duration: 6,  cells: 0.9  },  // 중력 전환, 비주얼 우선
    { id: 'B5', start: 35, duration: 12, cells: 1.2  },  // 걷기 + 화이트아웃 한 큐
  ],
  // startNorm/endNorm 은 start/total 로 파생. cells 합 6.4 + 퇴장 1 = 740vh (현 560 + 120 과 유사)
};
```

---

## 4. Lenis 완급 조절 — 3단

1. **전역 감쇠** (적용됨): `lerp 0.05`, `wheelMultiplier 0.65`, `syncTouch + syncTouchLerp 0.05`. 스크롤 속도가 연속 곡선이 되어 소리가 1x 로 흐를 시간을 확보하고 seek 폭주를 막는다.
2. **비트별 셀 가중치** (§3 `cells`): oneir 의 등간격 셀을 가중 셀로 확장. `mapProgress` 를 piecewise-linear 로 — 읽기 비트(B1·B3)는 영상 1s 당 스크롤이 길고, 액션 비트(B4)는 짧다. 현 12vh/s 선형이 만들던 "4s 비트 48vh" 문제 해결.
3. **구간별 휠 감속** (선택, 실기기 후): Lenis `virtualScroll` 콜백에서 현재 비트에 계수(액션 0.8 / 읽기 1.0)를 `deltaY` 에 곱한다. 데이터가 아니라 손맛 튜닝이므로 2단이 안정된 뒤에만.

---

## 5. 사운드 샘플링 계획

### 5.1 소스 A (1차) — 최종본 오디오 비트 컷
`ffmpeg -ss <start> -t <dur> -i final.mp4 -vn -af loudnorm=I=-16:TP=-1.5:LRA=11 -ac 2 -c:a libmp3lame -b:a 256k B<n>.mp3`
- 6 클립(B0~B5) = 영상 구간과 1:1. 같은 타임라인에서 잘라내므로 `fraction × buffer.duration` 이 곧 영상 시간 — 엔진 수정 없이 정확.
- Kling 생성음이라 저작권 무관. mono 라 `-ac 2` 로 복제(추후 stereo stem 으로 교체 가능).

### 5.2 베드 + 드론
- 베드: 최종본 23–29s(억제된 상승, 저역 정상 구간)를 잘라 8–10s 루프. `afade` 양끝 + 엔진 `loopStart/End` gapless. 대안: `ambientAudio.js` 의 brown-noise 합성 재활용.
- 드론: 오프닝(B0) 전용, oneir `DRONE_DEFAULT`(74Hz, level .054, wobble .9Hz) 로 시작.

### 5.3 소스 B (2차, 선택) — stem 파이프라인
oneir `scripts/sound-design.mjs` + `build-spotting.mjs` 이식. 비트별 스파팅 시트(예: B4 "중력 전환 — 저역 압력 반전 + 착지 둔탁음")를 ElevenLabs SFX 로 stem 생성 → 컨폼 → 클립 교체. 엔진은 파일만 바뀌므로 무수정.

### 5.4 배치
```
public/heptapod-b-encoder/audio/
  bed-loop.mp3
  clips/B0.mp3 … B5.mp3
public/heptapod-b-encoder/hero-motion/kling-audio-01-final/
  hero-scrub-1920.mp4   (GOP 6, 오디오 포함)
  hero-scrub-960.mp4
scripts/build-hero-scrub.mjs   ← oneir 이식: 재인코딩 + 클립 추출 + timeline 검증
```

### 5.5 OST 핸드오프 순서
완주(`p ≥ lastEnd`) → 엔진 END_FADE 2.2s → `encProgress ≥ 0.55` 에서 `audioActive` → OST 시작. 역스크롤 시 OST pause + 엔진 `startBed` 복귀. 2.2s 가 핸드오프 스크롤 시간보다 짧은지 실측.

### 5.6 언락 UX
- START 버튼은 **유지하되 역할 변경**: "사운드 언락 + 첫 셀로 scrollTo". 스크롤 잠금 없음. 누르지 않아도 첫 유효 제스처에서 자동 언락(oneir 방식).
- SoundFab 으로 언제든 on/off.

---

## 6. 단계별 실행

| Phase | 내용 | 산출물 | 검증 |
|---|---|---|---|
| **0 자산** | `build-hero-scrub.mjs` 이식·실행 | 1920/960 GOP6 mp4, 클립 6 + 베드 mp3, timeline | ffprobe 키프레임 ≈ nb_frames/6, 길이 47.08±0.15, 클립 LUFS -16 |
| **1 스크럽 코어** | `VideoScrubbing` 교체, `HeroScrubTrack`, `heptapodScrubTimeline.js`, `HeptapodHeroIntro` 재작성(세그먼트·잠금·클램프 제거, 핸드오프 유지) | 컴포넌트 + 스토리 | 데스크톱 양방향 스크럽, 퇴장 셀에서 캔버스 fade, SKIP·`?name=` |
| **2 스토리텔링** | HeroTitle(셀0) · BeatCaptions(도착셀+1, A/B/C) · Hud · 포스터 | 콘텐츠 레이어 | 카피 위치가 06 문서 타임라인과 일치, 마지막 비트 C 중앙 |
| **3 사운드** | `useScrubSoundEngine` · `ScrubSoundLayer` · `SoundFab` 이식, OST 핸드오프 연동 | 엔진 + 토글 | 아이들 시 클립 정지, 완주 시 무음 → OST, 역스크롤 복귀 |
| **4 튜닝** | 셀 가중치, `virtualScroll`, 드리프트/아이들 상수, 피치, 모바일 syncTouch | 상수값 | 실기기(iOS·안드로이드) |
| **5 예외** | reduced-motion(스크럽 off + 정지 프레임 + 자연 스크롤), 로드 실패 시 포스터 유지, 모바일 1:1 크롭 | 폴백 | |

권장 순서는 0 → 1 → 3 → 2 → 4 → 5. 사운드(3)를 캡션(2)보다 먼저 두는 이유: 셀 가중치가 소리의 1x 구간 길이를 좌우하므로, 소리를 들으며 가중치를 정한 뒤 캡션 앵커를 확정하는 편이 재작업이 적다.

---

## 7. 리스크

- **iOS 스크럽 무반응**: 예열 필수. 1920 GOP6 47s ≈ 40MB(oneir 90s 74MB 비례), 960 ≈ 10MB. 모바일은 960 고정.
- **빠른 플릭 시 재정렬 잦음**: 0.35s tolerance / lerp 로 흡수. 안 되면 클립 게인 낮추고 베드 비중↑.
- **화이트아웃 매치컷**: 퇴장 셀에서 최종 프레임(순백 안개) 정지 + 캔버스 fade. `ENC_*` 게이트 값을 셀 좌표로 재측정.
- **YouTube OST + Web Audio 병행**: 별개 컨텍스트라 충돌 없음. 다만 둘 다 첫 제스처 의존 — START 한 번으로 둘 다 언락되게.
- **저작권**: 클립·베드는 Kling 생성음이라 문제 없음. OST 는 04 문서의 주의 유지.

---

## 8. 결정 (2026-09-03 확정)

| # | 항목 | 결정 |
|---|---|---|
| 1 | 셀 가중치 초기값(§3) | **승인** — B0 .8 / B1 1.25 / B2 1.0 / B3 1.25 / B4 .9 / B5 1.2 (+타이틀 셀 1) |
| 2 | START 버튼 | **필수·강제** — 누르기 전엔 스크롤 잠금(Lenis stop + html overflow hidden). 클릭 = 사운드 언락 제스처 |
| 3 | 사운드 소스 | **oneir 와 동일 방식** — 영상 오디오를 비트 구간대로 잘라낸 클립 + 베드 루프 + 합성 드론, 엔진 동일 이식 |
| 4 | 컬러 그레이딩 | **생략** |

---

## 9. 구현 기록 (1차, 2026-09-03)

| 영역 | 파일 | 비고 |
|---|---|---|
| 자산 빌드 | `scripts/build-hero-scrub.mjs` | GOP 6 재인코딩 1920/960(키프레임 189/1129), 포스터, 클립 B0~B5 + 베드 — loudnorm 2-pass(linear) -16 / -18 LUFS |
| 자산 | `public/heptapod-b-encoder/hero-scrub/`, `public/heptapod-b-encoder/audio/` | 1920 42MB · 960 9.2MB · 클립 6 · bed-loop 10s(루프 주기 8.5s = 엔진 loopStart 1 / loopEnd 9.5) |
| 데이터 | `src/data/heptapodHeroStory.js` | `cells` 가중치, 스크럽/포스터/오디오 경로, `HERO_TITLE_CELLS`, `HERO_HANDOFF_VH` |
| 타임라인 | `src/data/heptapodScrubTimeline.js` | `buildScrubTimeline` / `mapTrackToVideo`(가중 piecewise-linear) / `findClipIndex` |
| 스크럽 | `src/components/scroll/VideoScrubbing.jsx` | oneir 판으로 교체(seek 게이팅·iOS 예열·mapProgress·onReady) |
| 사운드 | `src/components/scroll/useScrubSoundEngine.js`, `src/components/input/SoundFab.jsx` | oneir 이식(기본 경로만 변경) |
| HUD | `src/components/scroll/ScrubHud.jsx` | oneir 이식(@supports 키 중복 정리) |
| 히어로 | `src/components/templates/HeptapodHeroIntro.jsx` | 재작성 — 고정 영상 muted 스크럽, START 게이트, 캡션 트랙 실배치(A/B/C), 카운터, 핸드오프 유지 |

**후속(2026-09-03)**: 타이틀 셀 1 → 0 (정지 구간 없음, 트랙 640vh + 핸드오프 120vh). 캡션 시점은 `captionAt`, 캡션 안무는 화면 통과 진행도 — `08-kinetic-typography-ideation.md` §7.
**미착수**: Phase 4 튜닝(실기기), reduced-motion 실측, stem 파이프라인(5.3).

### 검증 (브라우저 미사용)
- `eslint` 통과, `vite build` 통과, dev 서버 모듈 transform 200, 자산 206(range) 서빙 확인.
- 타임라인 로직 node 검사: scrubCells 7.4, 타이틀 셀 매핑 0, B3 중앙 = 26s, 단조증가, 클립 인덱스 경계.
