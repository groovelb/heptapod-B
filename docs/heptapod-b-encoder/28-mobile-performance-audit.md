# 모바일 레이아웃·성능 점검

2026-09-09 변경: 사용자 요청으로 모바일 Lenis를 재활성화했다. 터치 포인터에서도 인스턴스와 RAF를 생성하고 Archive를 포함해 `syncTouch`를 켠다. 아래 네이티브 스크롤 전환 및 모바일 RAF 0회 기록은 09-08 당시 결과이며 현재 설정에는 해당하지 않는다. 모션 감소 설정은 계속 존중한다.

2026-09-08. 로컬 코드, 실제 미디어 메타데이터, Node/Happy DOM/CSSOM 및 Next production build로 점검했다. 브라우저 자동화, 실기기 화면 확인, 배포는 수행하지 않았다.

## 수정 결과

| 영역 | 확인한 비용/누락 | 적용 |
| --- | --- | --- |
| 공통 스크롤 | 터치 기기에서도 Lenis 터치 보간과 상시 RAF 실행 | coarse pointer는 네이티브 관성 스크롤. Lenis 생성·RAF 예약 없음. 데스크톱 프로필 유지 |
| 첫 진입 | EncoderRoutes가 Landing·Canvas 구현을 모두 정적 import | 두 뷰를 각각 React.lazy/Suspense로 로드. production chunk도 각각 분리됨 |
| 모바일 비디오 | GOP 6, B프레임, 사용하지 않는 AAC 트랙 | 같은 Topaz 마스터에서 GOP 3, B프레임 0, 오디오 없는 960px 사본 생성 |
| 정적 표식 목록 | 보이지 않는 GlyphNode도 render 중 입자 생성, effect에서 즉시 그리기·스프라이트 생성 | 화면 200px 근처에서 1회 계산·그리기. 모델별 WeakMap 기하 재사용, 동일 잉크 스프라이트 공유, Observer 해제 |
| 관계 탐색 | 기본 목록 전환이 600px 미만에만 적용, 안전 영역·버튼 높이 보완 필요 | 900px 미만 기본 목록, 안전 영역·동적 높이·44px 버튼 적용 |
| 관계 패널·공유창 | 모바일 노치/홈 영역과 좁거나 낮은 화면 대응 부족 | 관계 패널 안전 영역 여백, 공유창 12px 외곽 여백·동적 최대 높이·작은 화면 내부 여백 |

Canvas·Archive·공개 상세·비교 페이지는 기존 모바일 대응을 검사했다. 입력 IME/Done, 분석 토글, 가로 화면, 공유, Archive 읽기 순서 등 기존 회귀 검사가 통과했다. CSSOM 검사는 실제 레이아웃 엔진의 픽셀 배치 검증을 대체하지 않는다.

## 모바일 영상 실측

| 항목 | 기존 | 변경 |
| --- | --- | --- |
| 파일 크기 | 10,006,282 bytes | 8,587,049 bytes (14.18% 감소) |
| 해상도 | 960×542 | 960×542 |
| 영상 프레임률/개수 | 24fps / 1,129 | 24fps / 1,129 |
| 영상 스트림 길이 | 47.041667초 | 47.041667초 |
| 최대 키프레임 간격 | 0.25초 | 0.125초 |
| B프레임 | 있음 | 없음 |
| 오디오 | AAC | 없음 (랜딩 사운드는 기존 별도 엔진 사용) |

새 파일은 `public/heptapod-b-encoder/hero-scrub-v2-topaz/hero-scrub-960-mobile.mp4`. 기존 모바일 파일과 4K 마스터는 보존했다. MP4 `moov`가 `mdat`보다 앞에 있는 faststart 구조를 확인했다. 기존 모바일 사본 대비 전체 프레임 SSIM은 0.988542이며, 이는 수치 비교이고 육안 품질이나 실제 탐색 지연의 측정값은 아니다.

재생성 명령 (마스터 복원은 기존 `pnpm run prepare:hero-video` 사용):

```sh
ffmpeg -hide_banner -n \
  -i public/heptapod-b-encoder/hero-scrub-v2-topaz/hero-scrub-3832.mp4 \
  -map 0:v:0 -an -vf scale=960:542 \
  -c:v libx264 -preset fast -crf 24 -pix_fmt yuv420p \
  -g 3 -keyint_min 3 -sc_threshold 0 -bf 0 -movflags +faststart \
  public/heptapod-b-encoder/hero-scrub-v2-topaz/hero-scrub-960-mobile.mp4
```

## 검증

- `pnpm run build`: 성공. Landing·Canvas가 별도 production JS chunk로 생성됨.
- 변경 파일 ESLint 및 `git diff --check`: 통과.
- 성능 검사: 버퍼 69, 영상 복구 44, 기하 캐시 25, 모바일 hero 36, Canvas 127, 공용 페이지 15, Archive CSSOM 236개 검사 통과. Encoder 모델 재계산 검사 통과.
- 신규 `test-glyph-node-work.mjs`: 14개 통과. 화면 밖 12개 표식에서 그리기/스프라이트 생성 0회, 진입 시 1회 그리기, 스프라이트 공유, 이름 변경 시 재그리기 없음, 언마운트 해제 확인. `test:performance-contracts`에 등록.
- 렌더링 중지 검사: vapor 5,906, renderer pause 22, overlay occlusion 34, video idle 74개 통과.
- 라우트: Canvas 77, Hero 75, Archive motion 8개 통과. 지연 import 완료를 기다리도록 기존 동기 로딩 가정의 테스트를 수정함.
- 공용 내비게이션 37개, Archive UI 79개 통과.
- 스킬에서 요구하는 `pnpm run check-agent-rules`는 현재 프로젝트에 스크립트가 없어 실행 불가. 다른 이름의 생성 스크립트로 대체하지 않음.

## 남은 확인 범위

실제 iOS/Android의 FPS, seek 지연, 발열, 모바일 네트워크 로딩 시간, safe area 픽셀 배치는 측정하지 않았다. 코드와 파일 수준의 비용 감소를 확인했으며, 체감 부드러움과 프레임 예산 달성 여부는 실기기에서 확인해야 한다.
