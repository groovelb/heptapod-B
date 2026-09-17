/**
 * 조립 순서 9단계.
 *
 * 08 Research 와 Custom Component/0. Hierarchy 가 같은 목록을 쓴다.
 * 한 곳만 고치면 둘이 함께 바뀐다.
 * stories 의 id 값은 빌드된 `storybook-static/index.json` 의 story id 와 같아야 한다.
 */
export const ASSEMBLY_STEPS = [
  {
    step: 1,
    title: '리서치',
    what: '영화의 문자와 챔버를 관찰해 형태 규칙과 색을 수치로 고정한다',
    where: 'docs/heptapod-b-encoder/03-visual-direction.md 4절 · 05-hero-cinematic-prompt-template.md',
    stories: [
      { label: '08 Domain Knowledge', id: 'overview-heptapod-b-08-domain-knowledge-research--default' },
      { label: '03 Visual Direction', id: 'overview-heptapod-b-03-visual-direction--docs' },
    ],
  },
  {
    step: 2,
    title: '인코더 모델',
    what: '이름을 다듬고 검증해 시드로 바꾸고, 시드에서 표식 기하를 결정론으로 만든다',
    where: 'src/utils/heptapod/normalizeName.js · encode.js · buildModel.js · reversibleModel.js',
    stories: [
      { label: '09 Encoder Pipeline', id: 'overview-heptapod-b-09-encoder-pipeline--default' },
      { label: 'GlyphModel', id: 'custom-component-1-encoder-model-glyphmodel--default' },
      { label: '05 Logogram Data', id: 'overview-heptapod-b-05-logogram-data--default' },
    ],
  },
  {
    step: 3,
    title: '렌더러',
    what: '같은 모델을 기기 등급에 따라 Canvas, SVG, WebGL 세 가지로 그린다',
    where: 'src/components/motion/LogogramRenderer*.jsx · LogogramChamber.jsx',
    stories: [
      { label: 'LogogramRendererCanvas', id: 'custom-component-2-glyph-renderer-logogramrenderercanvas--default' },
      { label: 'LogogramRendererSvg', id: 'custom-component-2-glyph-renderer-logogramrenderersvg--default' },
      { label: 'LogogramRendererWebgl', id: 'custom-component-2-glyph-renderer-logogramrendererwebgl--default' },
      { label: 'LogogramChamber', id: 'custom-component-2-glyph-renderer-logogramchamber--default' },
    ],
  },
  {
    step: 4,
    title: '히어로 영상 파이프라인',
    what: '프롬프트 템플릿에서 스토리보드, 샷 생성, 리마스터를 거쳐 스크럽용 영상을 굽는다',
    where: 'docs 05 · hero-storyboard.html · remaster/ · scripts/build-hero-scrub.mjs',
    stories: [
      { label: '08 Domain Knowledge', id: 'overview-heptapod-b-08-domain-knowledge-research--default' },
      { label: '07 Assets', id: 'overview-heptapod-b-07-assets--default' },
    ],
  },
  {
    step: 5,
    title: '스크롤 스크럽과 캡션, 사운드',
    what: '스크롤 위치 하나로 영상 재생 위치와 캡션, 소리를 같은 지점에 묶는다',
    where: 'src/components/scroll/ · src/components/kinetic-typography/scrub/',
    stories: [
      { label: 'VideoScrubbing', id: 'custom-component-3-hero-scrub-videoscrubbing--default' },
      { label: 'ScrubCaptionStack', id: 'section-scrubcaptionstack--default' },
      { label: 'ScrubSoundLayer', id: 'section-scrubsoundlayer--default' },
      { label: 'ScrubCaption', id: 'custom-component-3-hero-scrub-scrubcaption--default' },
      { label: 'ScrubHud', id: 'section-scrubhud--default' },
      { label: '06 Content Data', id: 'overview-heptapod-b-06-content-data--default' },
    ],
  },
  {
    step: 6,
    title: '랜딩과 캔버스 화면',
    what: '인트로를 완주하면 생성 화면으로 넘기고, 거기서 이름을 받아 표식을 세운다',
    where: 'src/components/templates/HeptapodHeroIntro.jsx · HeptapodEncoderPage.jsx',
    stories: [
      { label: 'HeptapodHeroIntro', id: 'template-heptapodherointro--default' },
      { label: 'HeptapodEncoderPage', id: 'page-response-archive-heptapodencoderpage--default' },
    ],
  },
  {
    step: 7,
    title: '아카이브 분류',
    what: '저장된 형태만 읽어 의미군을 판독하고 유형 24개로 묶어 피드를 만든다',
    where: 'src/utils/heptapod/interpretGlyphMeaning.js · buildArchiveArchetypeFeed.js',
    stories: [
      { label: 'ArchiveDepthExplorer', id: 'custom-component-5-archive-feed-archivedepthexplorer--docs' },
      { label: 'ArchiveArchetypeFeed', id: 'custom-component-5-archive-feed-archivearchetypefeed--docs' },
      { label: 'ArchiveSelectedGlyph', id: 'custom-component-5-archive-feed-archiveselectedglyph--default' },
      { label: '05 Logogram Data', id: 'overview-heptapod-b-05-logogram-data--default' },
    ],
  },
  {
    step: 8,
    title: '공개와 공유',
    what: '동의를 받아 공개하고, 링크 미리보기 카드와 정지 표식 이미지를 만든다',
    where: 'src/lib/og/ · src/lib/glyphImages/ · scripts/generate-og-samples.mjs',
    stories: [
      { label: 'PublishDialog', id: 'custom-component-6-publish-share-publishdialog--docs' },
      { label: 'SocialShareDialog', id: 'custom-component-6-publish-share-socialsharedialog--docs' },
      { label: 'StaticGlyphImage', id: 'custom-component-2-glyph-renderer-staticglyphimage--default' },
      { label: '07 Assets', id: 'overview-heptapod-b-07-assets--default' },
    ],
  },
  {
    step: 9,
    title: 'Next 라우트',
    what: '서버 라우트 7개가 메타데이터를 그리고 같은 화면들을 주소에 건다',
    where: 'app/ · src/routes/',
    stories: [
      { label: '04 Project Structure', id: 'overview-heptapod-b-04-project-structure--default' },
      { label: '0. Hierarchy', id: 'custom-component-0-hierarchy--default' },
      { label: '02 UX Flow', id: 'overview-heptapod-b-02-ux-flow--docs' },
    ],
  },
];

export default ASSEMBLY_STEPS;
