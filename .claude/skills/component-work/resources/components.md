# Components

Vibe Dictionary 텍소노미 v0.4 기반 분류. 번호는 텍소노미 카테고리 번호.

### 모바일 성능 보완 · 2026-09-08

- 2026-09-09 사용자 요청으로 모바일 Lenis 재활성화. 터치 포인터는 Archive를 포함한 모든 경로에서 syncTouch 사용. prefers-reduced-motion에서는 네이티브 스크롤 유지. Landing/Canvas 뷰는 각각 lazy 로드.
- HeptapodHeroIntro 모바일 영상은 전용 8컷 조립본 1080×1920·24fps·GOP 6. 같은 영상의 첫 프레임 포스터를 사용하고 선택된 영상과 함께 고정한다. PC Topaz 소스는 유지한다.
- ResonanceFieldPage는 md 미만 기본 목록, 안전 영역·44px 버튼 적용. RelationInspector와 SocialShareDialog는 모바일 안전 영역/동적 높이 대응.

### 모바일 적용 기준 · 2026-09-06

아래 기존 PC 배치 설명은 md(900px) 이상에서 유지한다. md 미만의 최신 동작은 다음과 같다.

- HeptapodHeroIntro: PC 6.4셀 유지, 모바일 4.85셀·타이틀 분산 0.3셀. 영상/캡션/자동 재생은 실제 측정한 svh 트랙 좌표를 공유한다. VideoScrubbing의 optional `mobilePlayback=false`를 모바일만 켜서 seek/준비/제스처 복구와 실제 ended 상태 확인을 적용한다. 실제 완주 후 Canvas replace 계약 유지.
- HeptapodEncoderPage: 모바일만 표식 → 입력 → 분석·등록 및 공유 두 44px 액션의 문서 흐름으로 배치. 하단 메타데이터·군집·Archive·추가 공개 링크는 PC에서만 표시. 모바일 분석도 원본 표식 위 초록 라인·관측 부위 오버레이와 하단 투명 판독 패널을 사용하며 전체 화면 Dialog·중복 Canvas 없이 같은 버튼으로 OFF. 공유 창은 유지. valid Enter/Done/form submit 후 blur, IME/invalid 입력은 유지. visualViewport의 가림을 확인해 입력을 스크롤로 노출하고 pinch 확대는 건드리지 않는다. PC 중앙 표식·우상단 4행·Enter 포커스는 유지.
- ArchetypeMotto: JSON 한마디를 editorialQuote blockquote로 표시. Archive/Create/공유 상세 유형 제목 바로 아래에 배치하고 본문에서 중복하지 않음 (`components/data-display/ArchetypeMotto.jsx`)
- ArchetypeNarrative: showMotto로 부모 제목 아래 인용문과 중복 방지. 특징·상황 목록은 editorial.listItem 토큰의 테두리 원 불릿과 내어쓰기로 표시. spacing="archive"는 목록 간격, archiveDetail은 구역 안쪽 패딩·소제목·목록 간격 확장과 본문 크기 정체성 문장을 제공하며 Create의 default 간격은 유지. bold 페이지·섹션 제목, 20/24px editorialLead, editorialBody/Label/Quote 등 시맨틱 타이포와 measure/sectionGap/rule 레이아웃 토큰으로 읽기 위계를 구성. 배포 JSON v5에서 반복 도입을 덜고 이름 뜻과 행동을 직접 설명. createAnalysis는 Create 전용 문단·구역 간격 사용. showIdentity 기본 true, 이미 reading을 보여주는 피드는 false. full은 특징·상황·긴장·질문·관계·차이·한마디까지 표시하며 compact는 조합과 핵심 서사. Create/Archive 공용, 데이터·분류·네트워크 소유하지 않음 (`components/data-display/ArchetypeNarrative.jsx`)
- ArchiveDepthExplorer: 루트의 빈 nav는 공간을 차지하지 않으며, 페이지 상단 여백은 archivePage 토큰으로 관리. 상단 sticky 내비게이션은 모든 탐색 단계에서 투명 배경. 진입 원 아래 군집 대표 설명, 내부 상단 군집 전체 설명을 표시. 모든 폭에서 군집 원 3개와 각각의 짧은 설명·개수를 한 그룹으로 배치. 시간순 전체 목록은 하단 텍스트 버튼으로 열며, 긴 군집 서사는 뎁스 안에 유지. ArchiveArchetypeFeed는 상징과 텍스트 행을 분리하고 설명의 640px 읽기 축을 공유한다. MyArchivePage는 모바일 좌우/하단 안전영역을 확보한다.
- AppGNB·PublishDialog: 모바일 좌우 노치, 12px 다이얼로그 여백·동적 최대 높이·44px 닫기 영역. GlyphDetailPage는 긴 이름/지문 줄바꿈과 축소 가능한 메타 그리드, ArchiveComparePage는 세로 입력/유효 제출 blur, GlyphPairComparison은 손상 모델 대체 표시도 모바일 셀 너비에 맞춘다.
- 각 상세 story와 `docs/heptapod-b-encoder/20-mobile-optimization.md`에 대응 범위·검증 한계를 기록한다. 브라우저 픽셀/실기기 키보드 검증을 수행한 것은 아니다.

## 참조 문서

### 성능 보완 · 2026-09-06

- VideoScrubbing: `bufferAheadSeconds=0`·`playbackBufferSeconds=0`은 기존 준비 동작을 유지하며 히어로는 각각 3초·6초의 연속 버퍼를 확인한다. 마지막 buffered.end 값으로 전체 로딩을 완료 처리하지 않으며 시작 준비율과 미로딩 seek의 waiting 상태를 전달한다. 브라우저 paused-preload 제한 시 준비된 프레임으로 시작을 허용하고 파일 전체를 Blob으로 복제하지 않는다. 오류 재로드의 `emptied/loadstart`에서 취소된 seek 잠금과 대기 목표를 초기화한다. 마지막 완료 위치 복원 중에는 스크롤 seek를 차단하며 실제 ended·PC/모바일 타이밍 계약은 유지한다.
- HeptapodEncoderPage: 하위 표식 모델은 실제 분해 진입 시 생성하고, 타이핑 프리뷰는 마지막 글자별로 memoize한다. 유효성 검사는 기존 validateName을 직접 사용해 버리는 완성 모델을 만들지 않는다. 모바일 가림 보정 RAF는 blur 후 스크롤하지 않는다. 배치·분석·형성은 유지한다.
- LogogramRendererCanvas: 불변 모델 객체별 WeakMap으로 결정론적 입자·vapor 기하만 재사용한다. 일반/감소 모션 입자는 분리하고 Canvas·색상 스프라이트·형성 시간·가시성 상태는 개별 인스턴스에 유지한다. 형태를 바꿀 때는 새 모델 객체를 전달한다.
- 점검 근거와 브라우저 평가 게이트: `docs/heptapod-b-encoder/21-performance-audit.md`.

### 지속 렌더링 보완

- LogogramRendererCanvas의 `isPaused=false`는 isActive와 별개로 RAF만 멈춘다. 버퍼·형성 진행·완료 상태를 보존하고 화면 밖/숨긴 탭 조건과 함께 판정한다. 초기 pause와 반복 복귀도 형성을 재시작하지 않는다.
- LogogramChamber의 `isPaused=false`는 여섯 drift·두 zoom·dive의 animationPlayState만 변경한다. Create 분석은 모바일·PC 모두 원본 Canvas·챔버가 보이는 오버레이이므로 정지하지 않는다. 모바일 분석용 중복 Canvas는 제거했다.
- paintVapor는 일회성 안개가 전부 만료된 뒤 순환 입자만 검사한다. 원본 인덱스/경계/되감기와 그리기 결과는 보존하며 입자 수·DPR·FPS는 낮추지 않는다.
- VideoScrubbing은 자동 재생·숨김 상태의 불필요한 RAF 예약을 차단하고 의도적 숨김 정지에서 현재 위치를 복구한다. 검증된 히어로 소스만 `scrubFrameRate=24`로 같은 프레임 seek를 생략하며 일반 소스의 기본 시간 계약은 유지한다.
- 작업 계약·검증 한계·후속 단계: `docs/heptapod-b-encoder/22-sustained-render-work.md`.

### 분류 참조

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
- GlyphNode: 저장 모델의 실제 입자 기하를 재사용하는 정적 Canvas 표식. 화면 200px 근처에서만 기하 생성·1회 그리기, 동일 잉크 스프라이트 공유, Observer 해제. 키보드 선택·긴 이름 접근성 (`components/data-display/GlyphNode.jsx`)
- ArchiveGlyph: 입력 모델의 뷰포트 진입 Canvas 형성. 이름은 원 중앙에 크게 표시하며 긴 이름은 줄바꿈·크기 조절한다. analysis로 초록 mesh·스캔, anchors로 실제 관측 위치, fragmentAnchors로 원본 관측 부위만 드러낸다. nameComponent는 상세 h1 지원. 분석/의미 선택으로 Canvas를 다시 만들지 않고 숨긴 목록의 폭 0 보고도 기존 크기를 보존한다. 손상 모델 가드·Observer 해제·감소 모션 유지 (`components/data-display/ArchiveGlyph.jsx`)
- ArchiveFamilySymbol: 도래/수용/상호성의 방향성을 각각 하나의 저작된 링 패턴으로 표시. 동일 외곽·질감에서 가지 방향만 차별화하며 추가 의미 없음 검증. 개인 이름/평균 표식이 아니고 공개 정체성·소속·개수에 포함하지 않음. ArchiveGlyph 생성 효과 재사용 (`components/data-display/ArchiveFamilySymbol.jsx`)
- ArchetypeMotto: JSON 한마디를 editorialQuote blockquote로 표시. Archive/Create/공유 상세 유형 제목 바로 아래에 배치하고 본문에서 중복하지 않음 (`components/data-display/ArchetypeMotto.jsx`)
- ArchetypeNarrative: showMotto로 부모 제목 아래 인용문과 중복 방지. 특징·상황 목록은 editorial.listItem 토큰의 테두리 원 불릿과 내어쓰기로 표시. spacing="archive"는 목록 간격, archiveDetail은 구역 안쪽 패딩·소제목·목록 간격 확장과 본문 크기 정체성 문장을 제공하며 Create의 default 간격은 유지. bold 페이지·섹션 제목, 20/24px editorialLead, editorialBody/Label/Quote 등 시맨틱 타이포와 measure/sectionGap/rule 레이아웃 토큰으로 읽기 위계를 구성. 배포 JSON v5에서 반복 도입을 덜고 이름 뜻과 행동을 직접 설명. createAnalysis는 Create 전용 문단·구역 간격 사용. showIdentity 기본 true, 이미 reading을 보여주는 피드는 false. full은 특징·상황·긴장·질문·관계·차이·한마디까지 표시하며 compact는 조합과 핵심 서사. Create/Archive 공용, 데이터·분류·네트워크 소유하지 않음 (`components/data-display/ArchetypeNarrative.jsx`)
- ArchiveDepthExplorer: 루트의 빈 nav는 공간을 차지하지 않으며, 페이지 상단 여백은 archivePage 토큰으로 관리. 진입 원 아래 군집 대표 설명, 내부 상단 군집 전체 설명을 표시. 내부 뒤로 가기·경로·정렬·공유 바를 GNB 아래 sticky로 고정. ResizeObserver로 측정한 높이를 왼쪽 인덱스와 앵커 여백에 반영. 군집 원 3개에 각각 짧은 설명·개수를 붙이고 시간순 전체 목록은 하단 텍스트 버튼으로 제공. 긴 군집 서사는 뎁스 안에 유지하며, 계열 → 유형별 피드 → 선택 상세 화면으로 탐색. 상세 시 목록을 hidden/inert로 유지하고 복귀 시 구성원 포커스 복원. 독립 상세용 detailOnly=true는 숨긴 목록을 마운트하지 않고 동일 상세·내비게이션을 재사용. 시간순 상세도 로드한 공개 모델 전체에서 같은 정확한 유형을 연결한다. 모달·Next·Compare·메타 탭·중간 유형 포털 없이 기존 group/AND/status 범위와 partial 표식을 유지 (`components/data-display/ArchiveDepthExplorer.jsx`)
- ArchiveSelectedGlyph: 모바일 설명 구간에서 단일 원본 표식·뒤로가기·공유만 배경 없이 내비게이션 대신 축소 고정. 분석·메타 시각화와 조작부는 축소 상태에서 숨기고 원위치 복귀 시 선택 상태 복원. 원래 높이를 유지하고 짧은 페이드·위치 이동으로 전환. 낮은 화면은 44px 표식, 설명 종료 시 고정 해제. archiveObservation 시멘틱 토큰과 useArchiveMobileObservation 훅 사용. 선택 상태 오버라인 없이 유형 제목부터 표시. 표식·제목 열 상단 정렬, 내비게이션 뒤 공통 contentInset 사용. 모바일은 제목·quote → 표식·분석 버튼 → 관측 칩·설명 순서의 단일 DOM, 공통 부위 비교는 한 열로 표시. JSON의 상위 군집·조합 및 유형 전체 원고를 표시. 원본 표식과 중앙 h1 이름, 설명 끝까지 sticky인 표식 열과 그 아래 Create형 사각 테두리·ON/OFF 분석 버튼 첫 행과 메타 시각화 칩 다음 행을 가운데 정렬(안내·아이콘 제거, 조작부 높이 실측으로 표식 크기 보정), 제목 아래 한마디 인용문, 자기 자신을 제외한 같은 유형 구성원 목록, 공통 의미별 실제 부위 그리드. 그리드는 선택 표식+최대 두 구성원을 원본 좌표에서 mask로 표시하며 유형별 동일 형태라고 주장하지 않는다. singleton/미확인 상태에는 공통성을 만들지 않음. 로컬 DTO 입력, URL/분류 소유권은 부모 (`components/data-display/ArchiveSelectedGlyph.jsx`)
- ArchiveArchetypeFeed: chronological DTO에서는 군집 없이 전체 공개 표식·등록 시간을 표시. 실제 구성원이 있는 정확한 유형만 저작 상징·제목·정체성·JSON 조합 설명과 핵심 서사와 함께 세로 배열. 실제 표식 모바일 2열/데스크톱 3열, untyped는 유형을 강제하지 않고 뒤에 유지. API·라우팅·분류 계산 없이 projection DTO 소비 (`components/data-display/ArchiveArchetypeFeed.jsx`)
- ResonanceList: 이웃 ID별 복수 근거 목록, 설명/중심 이동 분리, loading/error/empty 구분 (`components/data-display/ResonanceList.jsx`)
- ResonanceMap: 선택한 중심의 1-hop 관측 지도, 모바일6/데스크톱12, 항상 목록 전환 가능 (`components/data-display/ResonanceMap.jsx`)
- ArchiveClusterExplorer: 공개 표본의 중첩 형태 군집 선택·미소속 범위·구성원 비교. 전체 형상/같은 가지/열린 틈+먹 패턴 분리, 군집 전용 근거로 GlyphPairComparison 재사용. 순수 표시·provider와 분리 (`components/data-display/ArchiveClusterExplorer.jsx`)
- ArchiveMeaningExplorer: 기본 의미 단일 선택·추가 의미 AND·복합 의미 exact·부분/미확인 필터. 공개 그룹 구성원 두 개 선택 비교·필터 공유. `filterMeaningGlyphs`로 갤러리와 동일 소속 판정. 정밀 공명과 분리한 순수 표시 (`components/data-display/ArchiveMeaningExplorer.jsx`)
- GlyphMeaningSummary: createReading 간격·투명 readingScrollbar 사용. fitHeight는 전체 칼럼에 스크롤 없이 제목 아래 본문에 남은 높이를 배분. 실제 모델의 의미·관측 근거. reading은 독립 토글 칩(selectedObservationIds/onToggleObservation)으로 여러 부위를 함께 표시하고 근거를 함께 읽음. 표식 전체에서 고유한 번호로 시각화·설명 대응. summary/compact 유지, reading은 공통 유형명·JSON v3의 상위 군집·조합 및 전체 서사와 기존 의미 정의·개별 방향/틈/먹 위치를 고정 높이로 읽음. 인코더·개인 확대·공유 상세가 카탈로그/buildMeaningReading을 재사용. partial/invalid 유형 강제 없음. 실제 anchors·fg·선택 해제 유지 (`components/data-display/GlyphMeaningSummary.jsx`)
- GlyphClusterLink: showLink=false이면 군집 이름만 표시하며 Create와 Create 공유창에서 이동 링크를 숨김. 실제 해석의 정확한 소속 군집명과 해당 Archive 그룹 링크. 공유 상세·내 표식·등록 완료 팝업에서 재사용. compact/비라우터 Storybook 지원, 불완전 판독에는 임의의 군집 링크를 만들지 않음 (`components/data-display/GlyphClusterLink.jsx`)
- GlyphPairComparison: 두 모델의 정밀 공명 비교와 optional meaningComparison 기반 의미 읽기를 분리. controlled view·보기별 공유, 실제 anchors 표시. 의미 번호는 각 표식의 독립 관측이며 정밀 대응점/점수가 아님. 기존 props만 전달하면 v3 정밀 비교 유지 (`components/data-display/GlyphPairComparison.jsx`)
- ResonancePreview: 표시 모델의 의미 요약·의미군 탐색 링크와 로컬 비교 Dialog. 상세와 동일 판독기, 의미/정밀 분리. 입력은 서버에 보내지 않음. 컴포넌트·스토리는 보존하되 현재 인코더 기본 패널에서는 제외 (`components/data-display/ResonancePreview.jsx`)

## 6. In-page Navigation — 페이지 내 탐색

- ArchiveFeedIndex: 데스크톱 44px 왼쪽 sticky 원형 앵커 인덱스, 모바일 상단 가로 인덱스. 인덱스 실측 높이를 앵커 여백에 반영하고 현재 항목을 가로/세로로 따라 스크롤. 작은 원 크기=상대 구성원 분량, 채움=현재 위치, 하단 숫자=현재/전체 구간. 유형명·개수는 hover/focus/터치 길게 누르기 툴팁에만 표시. {id,targetId,label,count} items와 sx 소비. 44px 클릭 영역·Lenis/네이티브 이동·모션 감소 즉시 이동·대상 포커스·자체 스크롤·구간 감지/resize/RAF 해제. 필터/라우트/모델 변경 없음 (`components/in-page-navigation/ArchiveFeedIndex.jsx`)
- CategoryTab: 카테고리 탭 (`components/in-page-navigation/CategoryTab.jsx`)
- Tabs: MUI Tabs 컴포넌트 [MUI]

## 7. Input & Control — 사용자 입력

- GlyphObservationChips: 실제 관측 entries와 selectedIds/onToggle을 받는 독립 다중 토글. 선택적 analysisToggle을 같은 그룹·동일한 스타일로 표시. 아이콘·안내 문구 없는 텍스트·채움색·native button·aria-pressed·한영 안내. Create/Archive/공유 상세 공용이며 설명 패널이나 분류 상태를 소유하지 않음 (`components/input/GlyphObservationChips.jsx`)

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

- HeroAffordance: 랜딩 하단의 로딩·스크롤·자동 재생·버퍼링·재시도 안내. 스크롤 구간 안내 상시 표시, 자동 재생·로딩 시 해당 안내로 교체(동시 표시 없음), 모바일 위로 밀기·모션 감소·한영 locale·화이트아웃 명도 전환, 생성 모드 진입 시 제거 (`components/overlay-feedback/HeroAffordance.jsx`)

- Dialog: MUI Dialog 컴포넌트 [MUI]
- SocialShareDialog: X·Threads·Facebook 작성 링크와 명시적 링크 복사. native share/에어드롭 호출 없음. public payload 입력, onCopy 주입 가능 (`components/overlay-feedback/SocialShareDialog.jsx`)
- PublishDialog: showClusterLink로 Create의 군집 이동을 숨기고 소속 이름은 유지. 공유 의도일 때 소셜 선택 즉시 표시. 기기 공유 제거. 명시적 공개 동의·익명 소유권 안내, pending/success/error. 완료 후 공개 URL·군집명/이동·보관 안내·페이지 열기·독립 복사 제공. 소셜 공유는 X·Threads·Facebook 선택 및 지원 기기의 다른 앱 공유, 자동 복사 폴백 없음. publishedResult로 완료 화면 재진입, onCopy/interpretation/canShareWithApps 주입. 복사 실패 시 수동 선택 안내, 공유 취소·실패에도 완료 유지 (`components/overlay-feedback/PublishDialog.jsx`)
- RelationInspector: 선택한 두 표식의 형태 관측 Drawer. leftGlyph/neighborGlyph가 있으면 GlyphPairComparison으로 실제 대응 부위 표시, 크게 비교/중심 이동 (`components/overlay-feedback/RelationInspector.jsx`)
- GlyphObservationOverlay: 실제 렌더러 좌표의 부위별 번호·원·호 표시. fg 지원, 가까운 번호는 리더 선으로 분리하되 관측 좌표는 유지. Archive의 생성 애니메이션과 GlyphPairComparison에서 같은 표시부 재사용 (`components/overlay-feedback/GlyphObservationOverlay.jsx`)
- AnalysisOverlay: Heptapod B 울프럼 포렌식 화면 재현. 모델에서 특징점(빨강 vertex, 클러스터 주변 조밀) 추출 + 경량 Delaunay(Bowyer–Watson, 의존성0) 삼각망(초록 mesh) + 12세그먼트 점선 격자·측정 링·무게중심, 라이브 스캔 애니메이션 + 계측 readout. 분석 모드 한정 계측색(초록/빨강) 허용, 그 외 모노크롬. showVertices=false는 빨간 정점을 숨김. Archive는 showVertices/showFrame/showReadout=false로 초록 선만 표시. showReadout=false는 수치/기술 캡션만 숨기고 초록 mesh·빨강 vertex·스캔과 onScan은 유지. 의미 설명/관측 강조와 병용 (`components/overlay-feedback/AnalysisOverlay.jsx`)

## 10. Navigation (Global) — 페이지 간 이동

- LanguageSwitcher: 지구본 아이콘으로 여는 시스템 설정/한국어/영어 메뉴. 모노크롬·직각·헤어라인·모노 타이포와 선택 체크 표시. OS 언어 초기화·선택 저장·기존 입력 보존, GNB와 앱 상단에서 공유 (`components/navigation/LanguageSwitcher.jsx`)

- AppGNB: 사운드 상태 기본 켜짐. Story·Create·Archive 공통 fixed GNB. 모바일 64px·데스크톱 80px + 안전 영역, md 미만 전체 화면 Drawer·40–72px 메뉴 타이포, 활성 경로·언어·페이지별 사운드. Canvas 세션 복원 유지. Archive 메뉴는 항상 최상위 /archive에서 새 방문을 시작하며, 해당 방문의 내부 뒤로가기만 이전 뎁스/스크롤을 복원. 헤더는 투명하고 overlay로 본문 간격 제어, tone 배경은 Drawer에 적용하고 dark overlay 헤더에만 그라데이션 사용 (`components/navigation/AppGNB.jsx`)
- GNB: isFixed·resetKey·drawerSx로 앱 헤더 재사용, Drawer 경로/화면폭 변경 닫기 및 Lenis 잠금 복원. 기본 언어 전환 표시(showLanguageSwitcher), 반응형 글로벌 네비게이션 바. 데스크탑 메뉴 / 모바일 Drawer (`components/navigation/GNB.jsx`)
- NavMenu: 네비게이션 메뉴 (`components/navigation/NavMenu.jsx`)
- SlidingHighlightMenu: 슬라이딩 하이라이트 메뉴. hover 시 layoutId 기반 인디케이터 이동, background/underline, horizontal/vertical (`components/navigation/SlidingHighlightMenu.jsx`)

## 11. KineticTypography (Interactive) — 텍스트 애니메이션 효과

- RandomRevealText: 랜덤 순서 blur 리빌 타이포그래피. Fisher-Yates 셔플 기반 (`components/kinetic-typography/RandomRevealText.jsx`)
- ScrambleCaption: 결정론적 24단계 기호 변환. MotionValue는 외부 저장소로 읽고 React 알림을 다음 애니메이션 프레임에 전달하여 부모 렌더 중 상태 변경을 방지한다. 역스크롤·모션 감소 전환과 구독 해제를 지원한다 (`components/kinetic-typography/scrub/ScrambleCaption.jsx`)
- TypeCaption: 마지막 씬의 blur 등장·타자 효과. `exitProgress` 지정 시 본문을 유지하다 글자별 랜덤 blur/opacity로 퇴장한다. InkLetters의 선택적 퇴장 MotionValue를 공유하며, ScrubCaption·CaptionFrame의 sticky 모드로 중앙 고정 (`components/kinetic-typography/scrub/TypeCaption.jsx`)
- ScrambleText: 텍스트 스크램블 전환 효과. requestAnimationFrame 기반 (`components/kinetic-typography/ScrambleText.jsx`)
- ScrollRevealText: 스크롤 진행에 따른 텍스트 순차 리빌 (`components/kinetic-typography/ScrollRevealText.jsx`)

## 13. ContentTransition (Interactive) — 섹션 간 전환

- HorizontalScrollContainer: 세로 스크롤→가로 이동 변환 컨테이너. 픽셀 기반 DOM 측정, Framer Motion (`components/content-transition/HorizontalScrollContainer.jsx`)

## 12. Scroll (Interactive) — 스크롤 기반 효과

- VideoScrubbing: 스크롤 기반 비디오 스크러빙(단일 video를 progress에 따라 연속 seek). 레이아웃 메트릭을 한 번만 측정·캐시해 **per-frame 강제 리플로우 제거**(역스크럽 점핑 방지), per-frame엔 scrollY만 읽음. `onPlaybackStateChange`로 loading/ready/waiting/playing/error 전달, `mediaRef`로 실제 재생 위치를 복원해 재시도, 자동 재생 진입 시 현재 프레임에서 연속 재생 (`components/scroll/VideoScrubbing.jsx`)
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

- AppRoutes / EncoderRoutes / paths: 라우트 등록·랜딩 완료/Canvas 쿼리 어댑터·공통 경로 계약. `/` 실제 영상 종료 후 `/canvas` replace, Canvas의 Archive 클릭은 `/archive` push. 기존 이름·생성 쿼리 호환, 이름/버전 변경 시에만 입력 세션 재마운트. App의 provider·Lenis 수명과 분리 (`routes/`)
- Indicator: 범용 인디케이터 (`common/ui/Indicator.jsx`)
- Placeholder: 스토리 예제용 FPO 플레이스홀더 시스템. Box/Image/Media/Text/Line/Paragraph/Card 서브컴포넌트 (`common/ui/Placeholder.jsx`)
- FilterBar: 필터 바 (`components/templates/FilterBar.jsx`)
- MyArchivePage: 배경음악 기본 켜짐, 자동재생 재시도는 첫 pointer/keyboard 제스처에서 수행하고 끄면 재시도 리스너 해제. musicAutoplay로 초기값 주입. `/archive` 기본 상징 → 유형별 실제 구성원 피드. 선택 UUID·공유·뒤로 가기 및 기존 group/AND/status 범위 유지. 신규 meta URL/탭 정렬 제거. 단일 공개 표식 공유 문구는 공통 유형 카탈로그 사용. 관측 Drawer·내 응답·미판독 메뉴 복원 없음. meaningProvider·Canvas 형성·전역 Lenis·공용 AppGNB 유지 (`components/templates/MyArchivePage.jsx`)
- GlyphDetailPage: `/glyph/:id`에서 아카이브의 ArchiveDepthExplorer(detailOnly)·ArchiveSelectedGlyph를 재사용. 같은 챔버 배경·gutter·타이포·중앙 이름·유형 서사·분석/관측 칩·정확히 같은 유형의 표식과 부위 비교·모바일 축소 관찰을 표시. UUID를 바꾸면 분석/관측 선택 초기화. 공개 UUID 공유·비교/관계 링크, 조회 실패/재시도와 의미 버전 미지원 처리 유지 (`components/templates/GlyphDetailPage.jsx`)
- ResonanceFieldPage: `/field/:id` 가지/개구부/잉크/링/질문 변주 필터·현재 공개 표본·실제 관측 부위 선택·중심 이동, 모바일 기본 목록 (`components/templates/ResonanceFieldPage.jsx`)
- ArchiveComparePage: `/compare/:leftId/:rightId?` 공개/로컬 입력의 의미·정밀 비교. URL reading으로 보기와 공유·PNG 문구 일치, 미지원 의미 버전 차단, 공개 동의 유지 (`components/templates/ArchiveComparePage.jsx`)
- HeptapodHeroIntro: `/`의 독립 영상 인트로. 영상과 포스터는 v2(사용자 Topaz 3832×2160 업스케일본, C01–C07 원본 + 승인 C08 스크린 연기)로 고정하고 임시 비교 토글은 제거했다. 섹션 인디케이터는 트랙 밖 fixed 배치로 자동 재생 끝까지 위치를 유지하고 캡션 퇴장과 함께 사라진다. 준비 후 START로 스크롤 잠금을 해제하고 양방향 스크럽·비트 캡션·스크럽 사운드, 42초 지점부터 현재 프레임의 연속 재생을 유지한다. 실제 ended 후 마지막 캡션 퇴장·안개 전환을 마치면 onComplete를 한 번 호출하며 부모 라우트가 `/canvas`로 이동한다. children 인코더·audioActive 주입은 제거. 오류·모션 감소에서도 실제 완주가 필수이고 HeroAffordance가 각 재생 상태를 안내한다. 언마운트 시 영상·사운드·스크롤 구독 해제 (`components/templates/HeptapodHeroIntro.jsx`)
- HeptapodEncoderPage: `/canvas`의 독립 생성 화면. 기존 풀스크린 챔버·중앙 표식·우상단 오버레이 유지. 덩어리 수·가닥 수·무게중심·링 상태를 고정 네 줄(32px×4)로 표시하며 ANALYSIS 전환으로 행·제목·액션 위치를 바꾸지 않음. 우측 기능 라벨은 분석하기 / Heptapod 등록 및 공유 / Heptapod 아카이빙으로 제공. ANALYSIS는 초록 삼각망·빨간 정점·순차 스캔·비프를 유지하며 의미 기반 설명과 실제 anchor 강조를 병용. 데스크톱 좌측 레일/모바일 하단 투명 패널은 같은 공통 어휘·정의·개별 배치를 읽음. 모바일도 원본 표식 위에 분석선을 겹치며 별도 Dialog·중복 Canvas·원본 정지가 없다. 의미 선택은 스캔/Canvas를 재시작하지 않으며 같은 분석 버튼으로 OFF. SAVE·하단 의미 설명·의미군 링크·이름 비교는 제거. 문자 분해·타이핑 프리뷰·IME/검증·Canvas/Chamber·audioActive/음악 유지. 미공개는 동의·공개 후 새 Share 클릭으로 공유하며 공개 완료 뒤 같은 버튼은 재게시 없이 Share로 동작. 기존 v1 URL은 명시적 v2 재생성 후 공개. optional client/initialName/initialEncoderVersion으로 무네트워크 스토리 지원. 라우트에서 URL 진입값을 주입하고 랜딩 영상 수명과 분리 (`components/templates/HeptapodEncoderPage.jsx`)

- Create 분석·등록 CTA: 모바일은 기존 button 타이포(14px)와 createCta 높이 44px·간격 8px·최대 폭 17rem을 사용. PC는 기존 editorialCta 타이포(18px)·56px 높이·패딩·폭 유지. Create 좌측은 페이지 제목과 분석 레일을 같은 flex 칼럼에 배치하고 하단 입력 실측 높이를 확보하며 설명만 스크롤.
