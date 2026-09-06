# 지속 렌더링 연산 최적화

## 목적과 보존 조건

기준 커밋 `9a24f3e`. 초기 생성 비용을 줄인 이전 작업과 달리, 화면을 오래 열었을 때 반복되는 연산을 줄인다. PC·모바일의 해상도, 입자 수, 프레임 속도, 형성 연출, 안개 질감, 초록 분석 라인, Lenis와 실제 영상 종료 후 Canvas 이동은 보존한다.

브라우저 자동화는 사용하지 않는다. 아래 1·5·10분 검사는 제어 시계를 전진시키는 비브라우저 검사이며, 실제 기기에서 10분 동안 측정한 발열·GPU·메모리 결과가 아니다. 배포·공개 등록·DB·commit/push는 이번 실행에 포함하지 않는다. 기존 seed 스크립트 삭제도 유지한다.

## 병렬 실행 설계

`design-parallel-orchestration`: 파일 분할 + 구현 후 통합 검증. root 포함 4개까지 실행한다. 코드 조사는 병렬화하되 전후 성능 측정은 같은 조건에서 순차 수행한다.

| ID / 담당 | 독점 수정 범위 | 선행 조건 | 산출물 / 완료 기준 | 위험 |
|---|---|---|---|---|
| A / 입자 | logogramParticles, vapor-work 테스트·oracle | 기존 함수 기준 확정 | 만료 입자 제외, 원본 인덱스·시간별 명령 완전 일치 | noiseHash 인덱스 변경 |
| B / 가림 | EncoderPage, Chamber·stories, occlusion 테스트 | R의 isPaused 계약 | 모바일 전체 분석 뒤만 pause, 닫으면 동일 DOM 복귀 | isActive로 초기화하거나 반투명 창 뒤를 정지 |
| C / 영상 | VideoScrubbing, Hero·story, idle-work 테스트 | 기존 seek/ended 계약 | 불필요한 RAF 제외, 숨김 복구·목표 프레임 검증 | 의도치 않은 재생·조기 종료 |
| R / 통합 | RendererCanvas·story, pause 테스트, manifest·문서 | 기준 상태 확인 | pause는 effect 재시작 없이 시계/화면 유지, 전체 회귀 | visibility·초기 pause 중첩 |

준비 → A/B/C 독립 구현 및 R pause 계약 → 합류 → 전체 테스트·빌드 순서로 진행한다. 한 파일은 한 작업자만 쓴다. 분기 실패 시 재현 근거와 변경분을 root가 검토해 순차 완료하며, 품질 보존을 증명하지 못한 변경은 활성화하지 않는다.

작업별 실행 계약:

- A: 기존 함수와 birth/expiry 경계, 역방향 시간 이동, 1/5/10분을 비교한다. 생성 모델/입자 구조를 바꾸지 않고 순회 목록만 줄인다. 결과는 R이 기하 캐시 회귀와 함께 확인한다.
- B: R의 `isPaused=false` API를 사용한다. 실제 애니메이션 요소의 `animationPlayState`만 바꾼다. 메인 뒤쪽 Canvas와 안개는 멈추되 모바일 Dialog 안의 Canvas는 유지한다. PC 분석과 반투명 Publish 창은 제외한다.
- C: 일반 VideoScrubbing의 기본 시간 매핑을 유지한다. 프레임 중복 제거는 검증 가능한 소스에만 opt-in이며 목표 시간을 반올림하지 않는다. 재생 중 스크롤 예약·숨긴 탭 복구는 오류/seek/실제 종료 상태와 함께 검증한다.
- R: 공유 props·문서·scripts를 통합한다. 렌더러가 pause/resume에서 초기화되지 않고, 화면 밖·탭 숨김과 pause가 서로 덮어쓰지 않는지 검사한다. 실제 CPU/GPU 개선률은 추정하지 않는다.

## 적용 및 검증

### 입자

일회성 안개의 마지막 `birth + life`를 지난 뒤에는 순환 입자만 검사한다. 정확한 만료 경계까지 기존 경로를 유지하고, 되감으면 전체 형성 목록을 다시 사용한다. 순환 입자의 원본 인덱스를 보존해 노이즈 궤적이 달라지지 않는다. 배열별 WeakMap에는 인덱스와 만료 시각만 저장하며 프레임 시계·Canvas는 저장하지 않는다.

Louise의 장시간 프레임 검사량은 237 → 30, 민준은 238 → 30이다. 이는 순회 횟수이며 FPS·전력 절감률이 아니다. 기준 코드와 속성 변경·그리기 명령을 경계값 및 장시간 구간에서 비교한다.

### Canvas·배경 pause

`isPaused`는 기존 `isActive`와 별개다. `isActive`는 생성/초기화 계약을 유지하고, `isPaused`는 기존 버퍼·형성 상태·완료 콜백을 그대로 둔 채 RAF만 멈춘다. 처음부터 pause인 경우에도 형성 시계가 진행되지 않는다. 복귀할 때는 화면 안·탭 표시·명시적 pause 해제가 모두 충족돼야 한다.

Chamber의 여섯 drift 레이어, 두 zoom 래퍼, dive 래퍼에 pause를 적용한다. 모델·필터·키프레임·속도·DOM key는 변경하지 않는다. 모바일 전체 화면 분석에만 연결하며 닫으면 이전 위상에서 이어진다.

### 영상

스크럽 RAF 예약 단계에서 재생 요청·자동 재생·숨김 상태를 제외한다. 탭을 숨길 때 대기 RAF/목표를 취소하고 실제 재생 중이거나 완료 재생을 기다리던 영상만 일시 정지·복귀한다. 이미 멈추었거나 종료된 영상을 탭 복귀만으로 재시작하지 않는다. 의도적 숨김 정지 때문에 늦게 도착한 play Promise 거절은 이전 suspension epoch로 구분한다.

히어로 두 MP4는 ffprobe에서 24/1 CFR, 1129프레임, 시작 0초로 확인했다. 해당 소스만 `scrubFrameRate=24`를 전달하며, 동일 프레임으로 향하는 seek를 생략한다. 목표 currentTime을 양자화하지 않고 0.033초 허용값·최신 대기 목표·역스크럽·끝 경계는 보존한다. 일반 VideoScrubbing은 이 옵션을 지정하지 않으면 기존 seek 판정을 유지한다.

### 다음 단계 게이트

이번 단계는 출력 동일성과 상태 보존을 비브라우저로 검증할 수 있는 변경이다. 다음 항목은 아직 적용하지 않는다.

- 고정 잉크/안개의 표시 Canvas 분리: 레이어 순서, 알파, 마스킹, 픽셀 합성의 전후 시각 비교 필요.
- Archive 상태 보존형 자원 해제: 형성 중 잔상/완료 상태 복원, 빠른 왕복 시 깜빡임과 메모리 plateau 검증 필요. 현재 offscreen RAF 정지는 유지하되 자원 회수를 구현했다고 주장하지 않는다.
- 안개 사전 텍스처와 완성 후 저빈도 갱신: 질감/잔상 비교 및 시간 간격 기반 소거 보정 필요. FPS·해상도·입자 수를 이번 단계에서 낮추지 않는다.

재현 명령:

```sh
npm run test:thermal-contracts
npm run test:performance-contracts
npm run test:routes
npm run test:archetypes
npm run build
npm run build-storybook
```

통합 검증 결과:

- 신규 thermal 계약 6,035개 통과: vapor oracle 5,906개, Renderer pause 22개, 가림 통합 33개, 영상 유휴/숨김/프레임 계약 74개.
- 독립 리뷰에서 숨김 전 예약된 playing/pause 이벤트가 복귀 후 오류로 오인되는 경합을 발견했다. 현재 visible/paused 상태를 확인하는 가드를 추가했고, 지연 Promise 거절·오래된 미디어 이벤트·진짜 일시정지 오류를 구분하는 회귀 검사에 포함했다.
- 기존 performance 계약(영상 복구 38, 기하 캐시 25, 생성 계수, 모바일 27+36+15+14), routes 76+67+7, archetypes 8+456+362+91+39+175, navigation 37 통과. PC Archive CSS 기준 해시 6개 일치.
- 최종 production 및 Storybook 빌드, 변경 컴포넌트·스토리·입자 유틸 ESLint, diff whitespace 검사 통과.
- `pnpm run check-agent-rules`는 해당 script가 없어 검증 불가. 기존 ScrambleCaption 상태 변경·큰 번들·baseline-browser-mapping·Storybook MUI 경고는 남아 있다. 병렬 테스트 중 일부 HMR 포트 경고가 있었으나 테스트는 성공 종료했다.
- 미측정: 실기기 발열/전력, 브라우저 GPU·FPS·dropped frames, 10분 실제 사용 메모리 추세, 최종 픽셀 합성. 테스트 시계 전진과 Canvas 명령 검사를 실기기 측정으로 간주하지 않는다.

스킬에 따른 파일별 소유권과 독립 리뷰를 적용했고, 가시 연출을 바꾸지 않는 1차 변경만 통합했다. 남은 레이어 분리·Archive 자원 해제는 위의 품질 검증 게이트를 통과한 뒤 별도로 적용한다.
