# Components

Vibe Dictionary 텍소노미 v0.4 기반 분류. 번호는 텍소노미 카테고리 번호.

## 참조 문서

- 전체 텍소노미: `.claude/skills/component-work/resources/taxonomy-v0.4.md`
- 빠른 인덱스: `.claude/skills/component-work/resources/taxonomy-index.md`

새 컴포넌트 생성 시 위 문서에서 해당 카테고리 번호와 컴포넌트 원형을 확인한 후 구현할 것.

---

## 1. Typography — 텍스트 표현과 장식

- FitText: 컨테이너에 맞춤 텍스트 (`components/typography/FitText.jsx`)
- HighlightedTypography: 하이라이트 타이포그래피 (`components/typography/HighlightedTypography.jsx`)
- InlineTypography: 인라인 타이포그래피 (`components/typography/InlineTypography.jsx`)
- StretchedHeadline: 스트레치 헤드라인 (`components/typography/StretchedHeadline.jsx`)
- StyledParagraph: 스타일드 문단 (`components/typography/StyledParagraph.jsx`)
- Title: 타이틀 컴포넌트 (`components/typography/Title.jsx`)
- QuotedContainer: 인용 컨테이너 (`components/typography/QuotedContainer.jsx`)

## 2. Container — 시각적 경계와 그룹핑

- SectionContainer: 페이지 섹션 컨테이너. MUI Container 기반 (`components/container/SectionContainer.jsx`)
- CarouselContainer: 캐로셀 컨테이너 (`components/container/CarouselContainer.jsx`)
- RatioContainer: 비율 기반 컨테이너 (`components/container/RatioContainer.jsx`)

## 3. Card — 독립적 정보 단위

- CardContainer: 카드 기본 컨테이너. variant, padding, elevation (`components/card/CardContainer.jsx`)
- CustomCard: 미디어+콘텐츠 카드. vertical/horizontal/overlay 레이아웃 (`components/card/CustomCard.jsx`)
- ImageCard: 이미지 카드 (`components/card/ImageCard.jsx`)
- MoodboardCard: 무드보드 컬렉션 카드. 2x2 썸네일 그리드 (`components/card/MoodboardCard.jsx`)
- Card: MUI Card 컴포넌트 [MUI]

## 4. Media — 이미지, 비디오 표시

- AspectMedia: 비율 기반 미디어 컨테이너 (`components/media/AspectMedia.jsx`)
- ImageCarousel: 이미지 캐로셀 (`components/media/ImageCarousel.jsx`)
- ImageTransition: 이미지 트랜지션 효과 (`components/media/ImageTransition.jsx`)
- CarouselIndicator: 캐로셀 인디케이터 (`components/media/CarouselIndicator.jsx`)

## 5. Data Display — 구조화된 데이터 시각화

- Table: MUI Table 컴포넌트 [MUI]
- DataReadout: Heptapod B 로고그램 분석 패널. 모노스페이스 연구 장비 톤, 시드 해시·NFD·12슬롯 상태 표기, ScrambleText 값 전환 (`components/data-display/DataReadout.jsx`)

## 6. In-page Navigation — 페이지 내 탐색

- CategoryTab: 카테고리 탭 (`components/in-page-navigation/CategoryTab.jsx`)
- Tabs: MUI Tabs 컴포넌트 [MUI]

## 7. Input & Control — 사용자 입력

- FileDropzone: 파일 드래그&드롭 영역 (`components/input/FileDropzone.jsx`)
- SearchBar: 검색 입력 바 (`components/input/SearchBar.jsx`)
- TagInput: 태그 입력 필드 (`components/input/TagInput.jsx`)
- Button: MUI Button 컴포넌트 [MUI]
- Checkbox: MUI Checkbox 컴포넌트 [MUI]
- Select: MUI Select 컴포넌트 [MUI]
- Switch: MUI Switch 컴포넌트 [MUI]
- TextField: MUI TextField 컴포넌트 [MUI]

## 8. Layout — 공간 배치와 구조

- PhiSplit: 황금비 분할 레이아웃 (`components/layout/PhiSplit.jsx`)
- SplitScreen: 좌우 분할 레이아웃. ratio, stackAt, stackOrder 지원 (`components/layout/SplitScreen.jsx`)
- BentoGrid: 벤토 그리드 레이아웃 (`components/layout/BentoGrid.jsx`)
- LineGrid: 그리드 아이템 사이 1px 라인 자동 삽입 (`components/layout/LineGrid.jsx`)
- FullPageContainer: 전체 페이지 컨테이너 (`components/layout/FullPageContainer.jsx`)
- PageContainer: 반응형 페이지 컨테이너. PC maxWidth 고정, 모바일 100% (`components/layout/PageContainer.jsx`)
- AppShell: 반응형 앱 셸. GNB + 메인 콘텐츠 영역 (`components/layout/AppShell.jsx`)
- StickyAsideCenterLayout: 대칭 3열 그리드. sticky aside + 페이지 정중앙 콘텐츠 + 빈 대칭 칼럼 (`components/layout/StickyAsideCenterLayout.jsx`)
- Grid: MUI Grid 컴포넌트 [MUI]
- Masonry: MUI Masonry 컴포넌트 [MUI]

## 9. Overlay & Feedback — 맥락적 정보 표시

- Dialog: MUI Dialog 컴포넌트 [MUI]
- AnalysisOverlay: Heptapod B 울프럼 포렌식 화면 재현. 모델에서 특징점(빨강 vertex, 클러스터 주변 조밀) 추출 + 경량 Delaunay(Bowyer–Watson, 의존성0) 삼각망(초록 mesh) + 12세그먼트 점선 격자·측정 링·무게중심, 라이브 스캔 애니메이션 + 계측 readout. 분석 모드 한정 계측색(초록/빨강) 허용, 그 외 모노크롬. 렌더러와 좌표계 일치 (`components/overlay-feedback/AnalysisOverlay.jsx`)

## 10. Navigation (Global) — 페이지 간 이동

- GNB: 반응형 글로벌 네비게이션 바. 데스크탑 메뉴 / 모바일 Drawer (`components/navigation/GNB.jsx`)
- NavMenu: 네비게이션 메뉴 (`components/navigation/NavMenu.jsx`)
- SlidingHighlightMenu: 슬라이딩 하이라이트 메뉴. hover 시 layoutId 기반 인디케이터 이동, background/underline, horizontal/vertical (`components/navigation/SlidingHighlightMenu.jsx`)

## 11. KineticTypography (Interactive) — 텍스트 애니메이션 효과

- RandomRevealText: 랜덤 순서 blur 리빌 타이포그래피. Fisher-Yates 셔플 기반 (`components/kinetic-typography/RandomRevealText.jsx`)
- ScrambleText: 텍스트 스크램블 전환 효과. requestAnimationFrame 기반 (`components/kinetic-typography/ScrambleText.jsx`)
- ScrollRevealText: 스크롤 진행에 따른 텍스트 순차 리빌 (`components/kinetic-typography/ScrollRevealText.jsx`)

## 13. ContentTransition (Interactive) — 섹션 간 전환

- HorizontalScrollContainer: 세로 스크롤→가로 이동 변환 컨테이너. 픽셀 기반 DOM 측정, Framer Motion (`components/content-transition/HorizontalScrollContainer.jsx`)

## 12. Scroll (Interactive) — 스크롤 기반 효과

- VideoScrubbing: 스크롤 기반 비디오 스크러빙 (`components/scroll/VideoScrubbing.jsx`)
- ScrollScaleContainer: 뷰포트 노출 비율 연동 스케일 컨테이너. Framer Motion useScroll + useTransform (`components/scroll/ScrollScaleContainer.jsx`)

## 14. Motion (Interactive) — 스토리텔링 모션

- FadeTransition: 기본 opacity 전환 애니메이션. 등장/퇴장 페이드 + 방향 슬라이드, IntersectionObserver 자동 트리거 (`components/motion/FadeTransition.jsx`)
- LogogramChamber: 안개 낀 서리 유리 챔버 무대. CSS 노이즈 레이어 3장 드리프트(20~40s), RatioContainer 정방형 재활용, isFullscreen이면 부모를 가득 채우는 안개 공간(absolute inset 0), reduced-motion 대응 (`components/motion/LogogramChamber.jsx`)
- LogogramRendererSvg: Heptapod B 로고그램 SVG 렌더러. LogogramModel(`src/utils/heptapod/MODEL.md`) 입력, 가변폭 리본 폴리곤 + feTurbulence 잉크 번짐 + 3층 농담, 결정론 보장, 회전 클립 등장 연출 (`components/motion/LogogramRendererSvg.jsx`)
- LogogramRendererCanvas: Heptapod B 입자 형성 렌더러. 파리 떼 군집 응집 모션(딜레이+사인파 jitter+easing 수렴), radial gradient 스프라이트 질감, 완성 후 가장자리 영구 미세 진동, SVG 렌더러와 동일 형태 해석 (`components/motion/LogogramRendererCanvas.jsx`)
- LogogramRendererWebgl: Heptapod B GPU 유체 렌더러 (3단계 최종). Stable Fluids(advection→curl noise→Jacobi 투영) + 형태 앵커 주입으로 가장자리만 숨쉬는 평형, WebGL2+EXT_color_buffer_float 필요·실패 시 onContextLost 폴백, SVG 렌더러와 동일 형태 해석 (`components/motion/LogogramRendererWebgl.jsx`)
- PerspectiveTransition: 3D 원근 회전 전환. 뒤로 누워있다가 세워지는 효과, CSS perspective + rotateX, IntersectionObserver 자동 트리거 (`components/motion/PerspectiveTransition.jsx`)
- MarqueeContainer: 무한 루프 수평 흐름 컨테이너. CSS keyframes 기반 (`components/motion/MarqueeContainer.jsx`)

## 15. DynamicColor (Interactive) — 동적 색상 변화

- GradientOverlay: Three.js WebGL 스크롤 반응형 그라데이션 배경. Simplex Noise + 필름 그레인 (`components/dynamic-color/GradientOverlay.jsx`)
- GradientOverlayDynamic: Next.js 동적 import 래퍼 (ssr: false). 페이지에서 사용 시 이것을 import (`components/dynamic-color/GradientOverlayDynamic.jsx`)

---

## Common (유틸리티)

- Indicator: 범용 인디케이터 (`common/ui/Indicator.jsx`)
- Placeholder: 스토리 예제용 FPO 플레이스홀더 시스템. Box/Image/Media/Text/Line/Paragraph/Card 서브컴포넌트 (`common/ui/Placeholder.jsx`)
- FilterBar: 필터 바 (`components/templates/FilterBar.jsx`)
- HeptapodEncoderPage: Heptapod B Encoder 메인 페이지. 풀스크린 안개 챔버 + 비네트 + 분석 스크림, 가역 인코딩(`buildModelReversible`) — 이름을 손실 없이 형태에 인코딩하고 우상단 status의 DECODE 행으로 형태→원본 복원을 증명, 깊이 내비게이션(N레벨 fractal — 문단↔문장↔단어↔글자, splitText 재귀 분할. 로고그램 클릭 시 하위 격자로 드릴다운, 경로 브레드크럼으로 복귀, 글자 hover 시 글리프 중앙에 원본). ANALYSIS 모드 시 "문자→수→형태설정→형태" 설명을 화면에 분배 오버레이(좌측 ①②글자·수 / 우측 ③형태설정 / 중앙 글리프 데이터 콜아웃 GlyphCallouts / 하단 가역결론), AnalysisOverlay는 showMesh=false로 프레임만. 데스크톱은 오버레이·모바일은 RAW DATA 모달(`inspect`) fallback (데이터↔형태 연관), 용량 초과 시 길이 가드. 사운드(`ambientAudio`)·`?` 자동 의문형·분석 토글 (`components/templates/HeptapodEncoderPage.jsx`)
