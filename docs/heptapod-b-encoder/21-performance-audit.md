# 반응형·영상·렌더링 성능 점검

## 범위와 상태

2026-09-06, 기준 커밋 `8df7dea`. 기존 PC 배치·스크롤 타이밍, 표식 형성, 초록 분석 라인, Lenis, 실제 영상 종료 후 Canvas 이동을 보존한다. UI 제거·모델/DB 변경·미디어 재인코딩·배포는 하지 않는다.

비브라우저 재현과 수정 검증을 먼저 수행한다. Aside CLI `1.26.810.1915`의 REPL·탭 제어 기능을 확인했으나, 명시적인 브라우저 승인 규칙에 따라 추가 제어와 화면 측정을 보류했다. 기능 확인 중 로컬 Canvas 탭을 한 번 열었으며 이것을 성능 측정으로 간주하지 않는다. 브라우저 측정·캡처 승인 질문을 별도로 전달했다.

## 실행 구성

`design-parallel-orchestration`의 조사 → 판단 → 파일별 수정 → 통합 검증 순서다. root 포함 최대 4개 작업자가 동작한다. 측정은 한 기기에서 순차 수행하며, 서로 다른 코드의 조사와 수정만 병렬화한다.

| 담당 | 독점 수정 범위 | 소비할 산출물 |
|---|---|---|
| 영상 | VideoScrubbing, test-video-recovery | 오류 이벤트 순서 재현, 최소 복구 수정, PC/모바일 회귀 |
| Canvas | HeptapodEncoderPage, test-encoder-render-work | 실제 모델 생성 호출 계수, 불필요한 생성 제거, 입력/분해 보존 |
| 입자 | LogogramRendererCanvas, geometry cache, 전용 테스트 | 동일 모델 기하 재사용, 출력 동일성·읽기 전용 소비 검증 |
| root | Aside, 로컬 미디어/HTTP 확인, 문서·Storybook·통합 | 사실/가설 구분, 최종 회귀, 브라우저 측정 게이트 |

공유 파일은 root만 편집하고 기존 `scripts/seed-archive.mjs` 삭제는 건드리지 않는다. 개별 작업 완료 보고만으로 합격 처리하지 않고 통합 상태를 다시 검사한다.

## 확인한 근거와 조치

### 영상

- 첫 seek → 오류 → `load()` → `emptied/loadstart` → `loadedmetadata/canplay` → 스크롤 순서에서, 수정 전 영상 시간이 목표 15초 대신 0초에 남았다. `seeked` 없이 취소된 이전 seek 잠금이 원인이다. 실제 디코더가 아닌 happy-dom 미디어 이벤트 재현이다.
- 새 미디어 로딩 시 seek 잠금·대기 목표만 초기화하고 마지막 **완료된** 위치를 보존한다. 위치 복원 중/메타데이터 준비 전/오류 상태에서는 스크롤 seek를 막는다. 실제 `ended` 검증과 자동 재생 경계는 유지한다.
- `ffprobe`로 확인한 파일 상태:

| 파일 | 크기 | 비디오 | 컨테이너 / 비디오 길이 |
|---|---:|---|---|
| hero-scrub-960.mp4 | 9,226,034 B | H.264 High, 960×542, 24fps, yuv420p | 47.090 / 47.041667초 |
| hero-scrub-1920.mp4 | 42,101,208 B | H.264 High, 1916×1080, 24fps, yuv420p | 47.090 / 47.041667초 |

두 파일 모두 `moov`가 offset 32로 미디어 데이터 앞에 있다. 모바일 파일 키프레임은 0.25초 간격이다. 로컬 production preview에 `Range: bytes=0-1023` 요청 시 `206`, `Content-Length: 1024`, 올바른 `Content-Range`를 확인했다. 배포 CDN·실기기 재생의 검증 결과는 아니다.

### Canvas와 Archive

- Canvas 루트에서 보이지 않는 하위 모델을 미리 생성하고, 입력 검증에서 완성 모델을 만들고 버리는 중복 경로를 확인했다. 입력 프리뷰도 관계없는 부모 갱신마다 동일 마지막 글자 모델을 다시 만들었다.
- 모바일 키보드 resize가 예약한 스크롤이 Enter로 blur한 뒤에도 실행되는 순서를 재현했다. 예약 콜백에서 입력 포커스를 재확인하여 불필요한 지연 스크롤을 1회에서 0회로 줄였다. PC 분기와 CSS는 바꾸지 않았다.
- Archive Louise fixture는 고유 모델 5개에 메인·이웃·공통 부위 합계 11개 렌더러를 사용한다. 공통 부위의 CSS mask는 전체 모델의 입자 생성 비용을 줄이지 않는다. 불변 모델 객체와 모션 모드를 키로 기하를 재사용하되, Canvas·스프라이트·형성 시계·프레임 상태는 인스턴스별로 유지한다.
- 기존 렌더러에 화면 밖/숨긴 탭 RAF 중지가 이미 있다. 이를 누락 문제로 취급하지 않는다. 모달에 가려진 Canvas의 중복 프레임 비용, CSS blur·초록 SVG 분석의 합성 비용은 브라우저에서 측정할 별도 후보이며 이번 수정에서 연출을 제거하지 않는다.
- 기준 빌드 최대 JS 청크는 917,691 B, 로컬 gzip 294,158 B다. 이 크기만으로 체감 병목을 확정하지 않는다. Landing/Canvas의 eager import 구조는 후속 네트워크·CPU 측정 후 분리 여부를 판단한다.

## 브라우저 평가 설계 · 승인 후

Aside로 로컬 production preview를 단독 제어한다. 기존 dev 서버는 재현용으로 유지하고 실제 개선 비교에는 production build를 쓴다. 브라우저 API 지원을 확인한 항목만 측정하며, 지원하지 않는 CPU 제한·네트워크 제한·트레이스는 **미측정**으로 표기한다.

| 조건 | 행동 | 기록과 통과 기준 |
|---|---|---|
| 320×568, 390×844, 844×390 | 입력·긴 이름·분석·공유 창·Archive 탐색 | 가로 넘침/가려진 필수 액션 없음, 스크롤 도달 가능 |
| 899 / 900px, 1440×900 | 같은 입력·같은 라우트·같은 애니메이션 시점 | PC 배치/타이밍/기능 회귀 없음; 픽셀 비교는 모션 영역을 통제 |
| 모바일·PC 영상 | START → 정/역 스크럽 → 자동 재생 → 종료 | seek 완료 지연, buffering/play 거부, 실제 ended→Canvas; 조기 전환 0회, 완주 20/20회 목표 |
| cold / warm, 일반 / 감소 모션 | 동일 시나리오 조건별 5회 | 중앙값·최악값, RAF frame 간격과 비디오 dropped frames를 별도 기록 |
| Archive 고정 fixture | 계열 → 상세 → 분석 → 공통 부위 → Back | 생성 횟수, long tasks, 보이는 Canvas 수, 스크롤/포커스 복원 |
| 화면 밖·탭 숨김·라우트 왕복 10회 | 같은 모델/순서 유지 | RAF·미디어·리스너가 계속 누적되지 않음; 메모리는 측정 가능 시 추세 확인 |
| 실기기 Safari/Chrome | 한글 조합 → Enter/Done, 회전·주소창 변동 | 조합 중 제출 없음, 유효 제출 1회와 실제 키보드 닫힘 |

브라우저 viewport 에뮬레이션은 iPhone GPU·WebKit·OS 키보드 검증을 대신하지 않는다. 공개 등록 확정·외부 공유는 테스트하지 않는다. 개선 판정은 계산량 감소와 출력 보존을 먼저 확인하고, 체감/FPS 향상은 실제 전후 측정 전에는 주장하지 않는다.

## 검증 결과

Vite 테스트 transform으로 실제 `buildArchiveModel` 진입 횟수를 세었다. 결과 모델 전체와 자식 모델을 기존 인코더 출력과 deep equality로 비교했다. 입자 캐시는 실제 생성 함수를 감싼 카운터와 동결된 기하를 사용해 출력·읽기 전용 그리기 소비자를 검사했다.

| 비브라우저 검증 조건 | 변경 전 → 후 |
|---|---|
| Louise 루트 진입 | 모델 생성 7 → 1회 |
| 마지막 글자가 같은 프리뷰, 무관한 부모 갱신 | 1 → 0회 |
| LouiseX 확정 | 9 → 1회 |
| 동일 이름 재확정 | 1 → 0회 |
| 첫 문자 분해 진입 | 0 → 7회: 없앤 것이 아니라 실제 표시 시점으로 이동 |
| 5개 모델 객체를 쓰는 11개 표시 영역 | 입자/vapor 생성 각각 11 → 5회 |
| 키보드 resize → Enter/blur → 예약 RAF | 늦은 scrollIntoView 1 → 0회 |

반복 실행 명령:

```sh
npm run test:performance-contracts
npm run test:routes
npm run test:archetypes
npm run test:locale
npm run test:navigation
npm run build
npm run build-storybook
```

`test:performance-contracts`는 브라우저 성능 벤치마크가 아니라 계산량·동작 계약 회귀 테스트다. 브라우저 FPS·dropped frames·실기기 키보드·실제 완주율은 현재 미측정이다.

통합 실행 결과:

- PASS: 영상 복구 38개, 기하 캐시 25개, Canvas 실제 생성 계수·모델 동일성·예약 스크롤 회귀.
- PASS: 모바일 Hero 27개, Canvas 36개, 공유 UI 15개, Archive CSSOM 14개. Archive의 기존 PC CSS 해시 6개 일치.
- PASS: routes 76+67+7개, archetypes 8+456+362+91+39+175개, locale 1738+21개, navigation 37개.
- PASS: 변경 컴포넌트·스토리·캐시 ESLint, `git diff --check`, production 빌드, Storybook 빌드.
- 검증 불가: `pnpm run check-agent-rules`는 저장소에 해당 script가 없어 실패한다.
- 잔여 경고: 기존 ScrambleCaption 렌더 중 상태 변경, 큰 번들, 오래된 baseline-browser-mapping 데이터, Storybook MUI 패키지 메타데이터. 병렬 비브라우저 검사 중 HMR 24678 포트 경고도 있었으나 검사 프로세스는 성공 종료했다.

레이아웃 CSS와 Canvas 애니메이션 effect 자체를 변경하지 않았으며, 실측 FPS·픽셀·실기기 완주율의 합격 판정은 브라우저/기기 측정 후에만 내린다.
