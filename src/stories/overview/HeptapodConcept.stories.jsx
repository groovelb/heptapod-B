import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {
  DocumentTitle,
  PageContainer,
  SectionTitle,
} from '../../components/storybookDocumentation';
import { HERO_STORY_BEATS, HERO_VIDEO_DURATION } from '../../data/heptapodHeroStory';
import { HERO_SCRUB_TIMELINE } from '../../data/heptapodScrubTimeline';
import { MEANING_BASE_IDS, MEANING_MODIFIER_IDS } from '../../data/heptapodMeaningCatalog';
import { ARCHETYPE_CATALOG } from '../../data/heptapodArchetypeCatalog';
import docSummary from '../../../docs/heptapod-b-encoder/01-project-summary.md?raw';
import docVisual from '../../../docs/heptapod-b-encoder/03-visual-direction.md?raw';
import docShot from '../../../docs/heptapod-b-encoder/05-hero-cinematic-prompt-template.md?raw';

export default {
  title: 'Overview/Heptapod B/10 Concept & Flow',
  parameters: {
    layout: 'padded',
  },
};

/** 중복 제거한 정렬 목록 */
const uniqueSorted = (matches) => [...new Set(matches || [])].sort();

/**
 * 문서 원문에서 헤딩 바로 아래 한 덩어리를 뽑는다. 원문을 복사하지 않고 raw import 에서 계산한다.
 *
 * @param {string} source - 마크다운 원문 [Required]
 * @param {string} heading - 찾을 헤딩 줄 [Required]
 * @param {number} lines - 가져올 최대 줄 수 [Optional, 기본값: 4]
 * @returns {string} 헤딩 아래 본문 줄을 이은 문자열
 */
function extractUnderHeading(source, heading, lines = 4) {
  const at = source.indexOf(heading);
  if (at < 0) return '';
  return source
    .slice(at + heading.length)
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .slice(0, lines)
    .map((line) => line.replace(/^>\s?/, '').trim())
    .join(' ');
}

/** docs 원문과 데이터에서 계산한 수치. 손으로 적지 않는다. */
const COUNTS = {
  shots: (docShot.match(/^### Shot \d+/gm) || []).length,
  refs: uniqueSorted(docVisual.match(/REF-\d{2}/g)).length,
  formRules: uniqueSorted(docVisual.match(/\bF[1-8]\b/g)).length,
  textureRules: uniqueSorted(docVisual.match(/\bT[1-5]\b/g)).length,
  beats: HERO_STORY_BEATS.length,
  duration: HERO_VIDEO_DURATION,
  cells: HERO_SCRUB_TIMELINE.scrubCells,
  meanings: MEANING_BASE_IDS.length + MEANING_MODIFIER_IDS.length,
  archetypes: Object.keys(ARCHETYPE_CATALOG).length,
};

/** 01 문서의 한 줄 요약. 원문을 raw import 에서 뽑는다. */
const ONE_LINER = extractUnderHeading(docSummary, '## 1. 한 줄 요약', 1);

/** 웨비나 슬라이드(cases.js, content.js)에서 옮긴 컨셉. 값은 슬라이드 SSOT 를 그대로 쓴다. */
const CONCEPT = {
  experiment: 'Extreme domain learning',
  subtitle: '도메인 영역의 고강도 학습을 통한 재현',
  desc: '고도화된 세계관과 도메인을 리버스 엔지니어링해서 시각화',
  approach: '재료 먼저',
  frame: { name: '분해 가능한 단위', oneLiner: '씬으로 쪼개고 화면에 찍히는 것만 적습니다' },
  metaLearning: '내가 영화 특수효과 전문가인가? 아닙니다.',
};

/**
 * 기획에서 화면까지의 흐름.
 * doc 은 문서 헤딩, artifact 는 저장소 파일, stories 는 그 단계를 보는 스토리 링크 목록이다.
 * 01~03 은 MDX 문서 페이지라 id 가 `--docs` 로 끝난다.
 */
const FLOW_ROWS = [
  {
    stage: '기획',
    decided: '번역이 아니라 결정론적 인코더로 포지셔닝. 다루는 대상 8종과 핵심 과업 5개를 이름까지 확정',
    doc: 'docs 01 · 1절, 2절, 4.2절, 5절',
    artifact: 'docs/heptapod-b-encoder/01-project-summary.md',
    stories: [
      { label: '01 Project Summary', id: 'overview-heptapod-b-01-project-summary--docs' },
    ],
  },
  {
    stage: 'UX',
    decided: '과업 5개와 1:1인 시나리오, 대상 8종의 속성과 영속성, 이름 사전, 컴포넌트 리스트',
    doc: 'docs 02 · 1절, 3.1절, 3.2절, 5절',
    artifact: 'docs/heptapod-b-encoder/02-ux-flow.md',
    stories: [
      { label: '02 UX Flow', id: 'overview-heptapod-b-02-ux-flow--docs' },
    ],
  },
  {
    stage: '비주얼 디렉션',
    decided: '모노크롬 다크와 밝은 안개의 이중 구조, 역할 팔레트와 타이포, 에셋 유형 5종의 FORMAT·LOOK·SUBJECT',
    doc: 'docs 03 · 1절, 3절, 4절, 4.1절',
    artifact: 'src/styles/themes/default.js',
    stories: [
      { label: '03 Visual Direction', id: 'overview-heptapod-b-03-visual-direction--docs' },
      { label: 'Style / Colors', id: 'style-colors--palette' },
    ],
  },
  {
    stage: '재료 준비',
    decided: `레퍼런스 ${COUNTS.refs}종에서 뽑은 수치를 프롬프트로 쓰고, 히어로를 ${COUNTS.shots}샷으로 생성해 스크럽 자산으로 굽는다`,
    doc: 'docs 05 · 2.2절, 6절, 7절 · docs 07 · 5절',
    artifact: 'public/heptapod-b-encoder/hero-scenes · scripts/build-hero-scrub.mjs',
    stories: [
      { label: '07 Assets', id: 'overview-heptapod-b-07-assets--default' },
    ],
  },
  {
    stage: '화면',
    decided: `랜딩은 비트 ${COUNTS.beats}마디의 스크럽 시네마틱, 캔버스는 이름에서 표식과 의미 판독까지`,
    doc: 'docs 06 · 6절 · docs 13',
    artifact: 'src/components/templates/HeptapodEncoderPage.jsx',
    stories: [
      { label: 'HeptapodEncoderPage', id: 'page-response-archive-heptapodencoderpage--default' },
    ],
  },
];

/** 컨셉 증거 표. status 는 '있음' | '파생' | '없음'. */
const EVIDENCE_ROWS = [
  {
    id: 'E1',
    item: '도메인 리서치 자료 목록',
    source: 'docs 03 4.1절 REF-01~08 · 08 페이지 원작 조사 표',
    status: '있음',
    note: '원본 이미지 폴더 reference/langauge/ 는 저장소에 없다. 분석 결과만 남았다',
  },
  {
    id: 'E2',
    item: '리서치에서 뽑은 규칙과 수치',
    source: `docs 03 4절 F1~F${COUNTS.formRules} · T1~T${COUNTS.textureRules} · S1~S4 · docs 10 · MODEL.md`,
    status: '있음',
    note: 'MODEL.md 머리말이 수치 범위의 근거로 docs 03 4절을 직접 가리킨다',
  },
  {
    id: 'E3',
    item: '규칙이 코드가 된 자리',
    source: 'src/utils/heptapod/ buildModel.js · encode.js · reversibleCodec.js · logogramParticles.js',
    status: '있음',
    note: '09 Encoder Pipeline 이 같은 모듈을 그대로 호출해 중간 산출물을 보여 준다',
  },
  {
    id: 'E4',
    item: '원작에 있는 것과 더한 것의 구분',
    source: '08 페이지 원작 조사 표와 확장 표 · docs 01 2절 · docs 18',
    status: '있음',
    note: '이 페이지는 중복 표를 만들지 않고 08 로 넘긴다',
  },
  {
    id: 'E5',
    item: '메타 학습 질문의 근거',
    source: '아래 메타 학습 근거 표 (docs 05 · 07 · 03 4절 · 10 에서 파생)',
    status: '파생',
    note: '저장소에 전문가 여부를 묻는 자기 평가 문장은 없다. 슬라이드의 서사다',
  },
  {
    id: 'E6',
    item: '학습 자료가 AI 입력으로 들어간 흔적',
    source: 'CLAUDE.md · .claude/rules 4종 · .claude/skills 8종 · .claude/agents 1종',
    status: '있음',
    note: '전부 범용 규칙이다. 헵타포드 도메인 전용 rule 이나 skill 은 없고 도메인 입력은 docs 와 MODEL.md 가 맡는다',
  },
];

/** 리서치 자료에서 규칙을 거쳐 코드에 닿는 경로 */
const RESEARCH_TO_CODE_ROWS = [
  {
    material: `레퍼런스 ${COUNTS.refs}종의 문자 형태`,
    rule: `조형 정량표 F1~F${COUNTS.formRules} (R 단위 범위)`,
    code: 'src/utils/heptapod/buildModel.js · MODEL.md',
    story: { label: '05 Logogram Data', id: 'overview-heptapod-b-05-logogram-data--default' },
  },
  {
    material: '같은 레퍼런스의 잉크 번짐과 비산',
    rule: `질감 단서 T1~T${COUNTS.textureRules} (농담 3층, 확산 폭, 산포)`,
    code: 'src/utils/heptapod/logogramParticles.js · 렌더러 3종',
    story: { label: 'LogogramRendererCanvas', id: 'custom-component-2-glyph-renderer-logogramrenderercanvas--default' },
  },
  {
    material: '문자 체계 관찰 (비선형, 복잡도, 화행)',
    rule: '인코딩 단서 S1~S4와 Encoder v2 스펙',
    code: 'src/utils/heptapod/encode.js · reversibleCodec.js',
    story: { label: '09 Encoder Pipeline', id: 'overview-heptapod-b-09-encoder-pipeline--default' },
  },
  {
    material: '영화 컷의 물리와 스케일만 참조',
    rule: `연속성 락과 ${COUNTS.shots}샷 씬 구조, 샷 변수 슬롯`,
    code: 'public/heptapod-b-encoder/hero-scenes',
    story: { label: '07 Assets', id: 'overview-heptapod-b-07-assets--default' },
  },
  {
    material: '앞선 프로젝트(oneir)의 스크럽 기법 이식',
    rule: `비트 ${COUNTS.beats}마디의 셀 가중치와 GOP 6 재인코딩`,
    code: 'src/data/heptapodScrubTimeline.js · scripts/build-hero-scrub.mjs',
    story: { label: 'VideoScrubbing', id: 'custom-component-3-hero-scrub-videoscrubbing--default' },
  },
  {
    material: '원작에 없는 자리 (형태에서 뜻을 읽는 규칙)',
    rule: `의미군 v1 ${COUNTS.meanings}종과 유형 ${COUNTS.archetypes}개`,
    code: 'src/data/heptapodMeaningCatalog.js · heptapodArchetypeCatalog.js',
    story: { label: 'ArchiveMeaningExplorer', id: 'custom-component-5-archive-feed-archivemeaningexplorer--default' },
  },
];

/**
 * 메타 학습 근거.
 * slide 가 true 인 행은 cases.js metaLearning 이 직접 이름을 댄 요소다.
 */
const META_LEARNING_ROWS = [
  {
    need: '씬 구성',
    slide: true,
    learned: `docs 05 2.2절 확정 ${COUNTS.shots}샷 · docs 06 2절 영상 타임라인 실측`,
    applied: `public/heptapod-b-encoder/hero-scenes · heptapodHeroStory.js (${COUNTS.duration}초 상수)`,
    story: { label: 'HeptapodHeroIntro', id: 'template-heptapodherointro--default' },
  },
  {
    need: '스크롤과 영상 시간의 관계',
    slide: true,
    learned: 'docs 07 8절 결정 · docs 06 4절 스크롤 메커니즘',
    applied: `heptapodScrubTimeline.js (트랙 ${COUNTS.cells}셀) · VideoScrubbing.jsx`,
    story: { label: 'VideoScrubbing', id: 'custom-component-3-hero-scrub-videoscrubbing--default' },
  },
  {
    need: '글리프 생성 규칙',
    slide: true,
    learned: 'docs 03 4절 비고 S1~S4 · docs 10 2절 Encoder v2 스펙',
    applied: 'encode.js · buildModel.js · MODEL.md 계약',
    story: { label: '09 Encoder Pipeline', id: 'overview-heptapod-b-09-encoder-pipeline--default' },
  },
  {
    need: '조형과 질감 수치',
    slide: false,
    learned: `docs 03 4절 절차 생성 표식 블록 (F1~F${COUNTS.formRules}, T1~T${COUNTS.textureRules})`,
    applied: 'logogramParticles.js · LogogramRendererSvg/Canvas/Webgl',
    story: { label: '05 Logogram Data', id: 'overview-heptapod-b-05-logogram-data--default' },
  },
  {
    need: '스크럽 사운드 샘플링',
    slide: false,
    learned: 'docs 07 5절 사운드 샘플링 계획 · docs 04',
    applied: 'public/heptapod-b-encoder/audio/clips · useScrubSoundEngine.js',
    story: { label: 'ScrubSoundLayer', id: 'section-scrubsoundlayer--default' },
  },
  {
    need: '형태에서 읽는 의미',
    slide: false,
    learned: `docs 18 규칙 · docs 19 유형 ${COUNTS.archetypes}개`,
    applied: 'classifyGlyphMorphology.js · interpretGlyphMeaning.js',
    story: { label: 'AnalysisOverlay', id: 'custom-component-4-canvas-analysis-analysisoverlay--default' },
  },
];

/** 저장소에 없어서 이 페이지가 보여 주지 못하는 것 */
const GAP_ROWS = [
  {
    item: '레퍼런스 원본 이미지',
    detail: 'docs 03 4.1절이 가리키는 reference/langauge/ 폴더가 저장소에 없다. REF 표의 참고 포인트와 채택 결과만 남았다',
  },
  {
    item: '영화 장면 캡처',
    detail: '08 페이지가 저장소 밖 개인 파일이라고 적었다. 이 페이지도 캡처를 싣지 않고 관찰 결과만 표로 쓴다',
  },
  {
    item: '무드보드와 업스케일 비교 화면',
    detail: 'docs 의 HTML 세 편이 추적하지 않는 output/ 경로를 가리킨다. 목록은 08 페이지의 보여 주지 못하는 것 절에 있다',
  },
  {
    item: '도메인 전용 AI 규칙',
    detail: '.claude/rules 와 skills 는 코드 컨벤션과 디자인 시스템 같은 범용 규칙뿐이다. 문자 규칙을 담은 rule 이나 skill 은 없다',
  },
];

/** 슬라이드 사고 지도(thinking/heptapod-b.js)의 결정 중 이 컨셉과 닿는 것 */
const THINKING_ROWS = [
  { id: 'A2', label: '로고그램 조형을 R 단위 정량표로', basis: `리서치에서 규칙으로: F1~F${COUNTS.formRules}` },
  { id: 'A3', label: '자모 유닛 수가 가지와 클러스터 수', basis: '리서치에서 규칙으로: S1~S4' },
  { id: 'A6', label: '영화 컷은 물리와 스케일만 참조', basis: '메타 학습 근거: 씬 구성' },
  { id: 'A7', label: `히어로를 ${COUNTS.shots}샷 씬 단위로 확정`, basis: '프레임: 분해 가능한 단위' },
  { id: 'A8', label: '스크롤이 영상 시간을 스크럽', basis: '메타 학습 근거: 스크롤과 영상 시간의 관계' },
  { id: 'A10', label: '형태에서 이름을 되돌리는 가역 코덱', basis: '메타 학습 근거: 글리프 생성 규칙' },
];

const STATUS_COLOR = { 있음: 'success', 파생: 'info', 없음: 'default' };

/**
 * 다른 스토리로 가는 링크
 *
 * Props:
 * @param {string} id - 스토리 id [Required]
 * @param {node} children - 링크 텍스트 [Required]
 *
 * Example usage:
 * <StoryLink id="overview-heptapod-b-08-domain-knowledge-research--default">08</StoryLink>
 */
function StoryLink({ id, children }) {
  return (
    <a href={ `?path=/story/${id}` } target="_top">{ children }</a>
  );
}

/**
 * 표 한 벌을 그린다. 열 정의와 행을 받아 08 페이지와 같은 밀도로 그린다.
 *
 * Props:
 * @param {Array} columns - { key, label, width, mono } 배열 [Required]
 * @param {Array} rows - 데이터 행 배열 [Required]
 * @param {function} renderCell - (row, column) 을 받아 셀 내용을 돌려주는 함수 [Optional]
 *
 * Example usage:
 * <DocTable columns={ FLOW_COLUMNS } rows={ FLOW_ROWS } />
 */
function DocTable({ columns, rows, renderCell }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            { columns.map((column) => (
              <TableCell key={ column.key } sx={ { fontWeight: 600, width: column.width } }>
                { column.label }
              </TableCell>
            )) }
          </TableRow>
        </TableHead>
        <TableBody>
          { rows.map((row, index) => (
            <TableRow key={ row.id || row.stage || row.need || row.material || row.item || index } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
              { columns.map((column) => (
                <TableCell
                  key={ column.key }
                  sx={ {
                    fontSize: column.mono ? 11 : 12,
                    fontFamily: column.mono ? 'monospace' : undefined,
                    color: column.mono ? 'text.secondary' : undefined,
                    fontWeight: column.bold ? 600 : undefined,
                    verticalAlign: 'top',
                  } }
                >
                  { renderCell ? renderCell(row, column) : row[column.key] }
                </TableCell>
              )) }
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const FLOW_COLUMNS = [
  { key: 'stage', label: '단계', width: 110, bold: true },
  { key: 'decided', label: '여기서 정한 것' },
  { key: 'doc', label: '문서', width: 170, mono: true },
  { key: 'artifact', label: '남긴 것', width: 230, mono: true },
  { key: 'stories', label: '보는 곳', width: 170 },
];

const EVIDENCE_COLUMNS = [
  { key: 'id', label: 'id', width: 50, mono: true },
  { key: 'item', label: '항목', width: 190, bold: true },
  { key: 'source', label: '저장소 근거', mono: true },
  { key: 'status', label: '상태', width: 70 },
  { key: 'note', label: '비고' },
];

const RESEARCH_COLUMNS = [
  { key: 'material', label: '리서치 자료', width: 200, bold: true },
  { key: 'rule', label: '뽑아낸 규칙' },
  { key: 'code', label: '코드와 데이터', mono: true },
  { key: 'story', label: '보는 곳', width: 170 },
];

const META_COLUMNS = [
  { key: 'need', label: '필요했던 요소', width: 180, bold: true },
  { key: 'learned', label: '어디서 배웠나 (문서)' },
  { key: 'applied', label: '어디에 넣었나 (코드·데이터)', mono: true },
  { key: 'story', label: '보는 곳', width: 170 },
];

const GAP_COLUMNS = [
  { key: 'item', label: '없는 것', width: 220, bold: true },
  { key: 'detail', label: '대신 무엇으로 갈음했나' },
];

const THINKING_COLUMNS = [
  { key: 'id', label: '결정', width: 60, mono: true },
  { key: 'label', label: '라벨', width: 280, bold: true },
  { key: 'basis', label: '이 페이지의 근거' },
];

/** 공통 셀 렌더러: story 는 링크, status 는 Chip, 그 밖은 문자열 */
const renderCell = (row, column) => {
  if (column.key === 'stories') {
    return (
      <Stack spacing={ 0.5 }>
        { row.stories.map((story) => (
          <StoryLink key={ story.id } id={ story.id }>{ story.label }</StoryLink>
        )) }
      </Stack>
    );
  }
  if (column.key === 'story') {
    if (row.story) return <StoryLink id={ row.story.id }>{ row.story.label }</StoryLink>;
    return <Box component="span" sx={ { color: 'text.disabled' } }>없음</Box>;
  }
  if (column.key === 'status') {
    return <Chip size="small" label={ row.status } color={ STATUS_COLOR[row.status] } variant="outlined" />;
  }
  if (column.key === 'need') {
    return (
      <Stack spacing={ 0.5 }>
        <Box component="span">{ row.need }</Box>
        { row.slide && <Chip size="small" label="슬라이드" variant="outlined" sx={ { alignSelf: 'flex-start', height: 18, fontSize: 10 } } /> }
      </Stack>
    );
  }
  return row[column.key];
};

/** 웨비나 실험 C-7 의 컨셉이 이 저장소에서 확인되는 자리 */
export const Default = {
  render: () => (
    <>
      <DocumentTitle
        title="Concept & Flow"
        status="Available"
        note="실험 Extreme domain learning, 갈래 재료 먼저. 기획에서 화면까지의 흐름과 컨셉 증거"
        brandName="Design System"
        systemName="Heptapod B"
        version="1.0"
      />
      <PageContainer>
        <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
          Concept & Flow
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>
          웨비나가 이 예제에 붙인 컨셉이 저장소에서 어디로 확인되는지 한 장에 모았다. 원작 조사의 상세는 08, 인코더 중간 산출물은 09 가 맡고 이 페이지는 흐름, 증거, 메타 학습 근거만 다룬다.
        </Typography>
        <Stack direction="row" spacing={ 2 } sx={ { mb: 4 } } flexWrap="wrap" useFlexGap>
          <Typography variant="body2">
            <StoryLink id="overview-heptapod-b-08-domain-knowledge-research--default">
              08 Domain Knowledge &amp; Research (원작 조사와 확장, 규칙 원문)
            </StoryLink>
          </Typography>
          <Typography variant="body2">
            <StoryLink id="overview-heptapod-b-09-encoder-pipeline--default">
              09 Encoder Pipeline (이름에서 표식까지의 중간 산출물)
            </StoryLink>
          </Typography>
        </Stack>

        <SectionTitle
          title="웨비나 컨셉"
          description="슬라이드 데이터(cases.js, content.js)에 적힌 값을 그대로 옮겼다. 아래 표들이 이 값의 저장소 근거다."
        />
        <Box sx={ { mb: 4, p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'action.hover' } }>
          <Stack direction="row" spacing={ 1 } sx={ { mb: 1.5 } } flexWrap="wrap" useFlexGap>
            <Chip size="small" label={ CONCEPT.experiment } color="primary" variant="outlined" />
            <Chip size="small" label={ `갈래 ${CONCEPT.approach}` } variant="outlined" />
            <Chip size="small" label={ `프레임 ${CONCEPT.frame.name}` } variant="outlined" />
          </Stack>
          <Typography variant="subtitle2" sx={ { fontWeight: 700, mb: 0.5 } }>{ CONCEPT.subtitle }</Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>{ CONCEPT.desc }</Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>
            { `프레임: ${CONCEPT.frame.oneLiner}` }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 2 } }>
            { `메타 학습 질문: ${CONCEPT.metaLearning}` }
          </Typography>
          <Typography variant="body2" sx={ { mb: 1 } }>
            이 예제가 컨셉의 증거인 이유: docs 01 2절이 원작의 문자는 연출이 먼저였고 체계는 사후에 정리됐다고 적고, 같은 순서로 형태를 먼저 관찰해 규칙으로 되돌리는 역설계를 프로젝트의 방법으로 삼았다. 그 역설계의 결과가 docs 03 4절의 조형과 질감과 인코딩 수치표이고, MODEL.md 머리말이 수치 범위의 근거로 그 절을 직접 가리킨다. 영상도 같은 방식이라 docs 05 2.2절이 히어로를 { COUNTS.shots }샷으로 쪼갰고 그 샷이 public/heptapod-b-encoder/hero-scenes 의 파일로 남았다.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            { `01 문서의 한 줄 요약: ${ONE_LINER}` }
          </Typography>
        </Box>

        <SectionTitle
          title="흐름: 기획에서 화면까지"
          description="다섯 단계마다 그 단계에서 정한 것, 남긴 파일, 스토리북에서 보는 자리를 잇는다. 01~03 은 MDX 문서 페이지라 링크 주소가 docs 로 끝난다."
        />
        <DocTable columns={ FLOW_COLUMNS } rows={ FLOW_ROWS } renderCell={ renderCell } />

        <SectionTitle
          title="컨셉 증거"
          description="실험 C-7 이 요구하는 항목을 저장소 파일로 확인한 결과다. 근거를 댈 수 없으면 없음으로 적는다."
        />
        <DocTable columns={ EVIDENCE_COLUMNS } rows={ EVIDENCE_ROWS } renderCell={ renderCell } />

        <SectionTitle
          title="리서치에서 규칙으로, 규칙에서 코드로"
          description="관찰을 수치로 고정하고 그 수치를 모듈 파라미터로 옮긴 경로다. 각 행의 상세는 08 Domain Knowledge & Research 에 있다."
        />
        <DocTable columns={ RESEARCH_COLUMNS } rows={ RESEARCH_TO_CODE_ROWS } renderCell={ renderCell } />

        <SectionTitle
          title="메타 학습 근거"
          description="슬라이드의 메타 학습 질문이 말한 필요한 요소를 저장소 문서와 코드로 되짚었다. 슬라이드 표시가 붙은 세 행이 cases.js 가 직접 이름을 댄 요소다."
        />
        <DocTable columns={ META_COLUMNS } rows={ META_LEARNING_ROWS } renderCell={ renderCell } />
        <Stack spacing={ 0.5 } sx={ { mb: 4 } }>
          <Typography variant="caption" color="text.secondary">
            { `수치는 전부 import 한 데이터와 문서 원문에서 계산했다. 확정 샷 ${COUNTS.shots}, 레퍼런스 ${COUNTS.refs}, 비트 ${COUNTS.beats}, 영상 ${COUNTS.duration}초, 트랙 ${COUNTS.cells}셀, 의미 ${COUNTS.meanings}종, 유형 ${COUNTS.archetypes}개.` }
          </Typography>
          <Typography variant="caption" color="text.secondary">
            저장소에는 전문가 여부를 묻는 문장이 없다. 위 표는 그 질문이 가리키는 요소마다 학습의 자취가 문서와 코드로 남아 있는지만 확인한다.
          </Typography>
        </Stack>

        <SectionTitle
          title="없는 것"
          description="컨셉 항목 중 저장소에서 확인하지 못한 것과, 대신 무엇으로 갈음했는지."
        />
        <DocTable columns={ GAP_COLUMNS } rows={ GAP_ROWS } renderCell={ renderCell } />

        <SectionTitle
          title="슬라이드 사고 지도 대응"
          description="발표 슬라이드의 사고 지도(thinking/heptapod-b.js)에 적힌 결정 중 이 컨셉과 닿는 여섯 개다. 라벨은 그 파일의 값이다."
        />
        <DocTable columns={ THINKING_COLUMNS } rows={ THINKING_ROWS } renderCell={ renderCell } />

        <Typography variant="caption" color="text.secondary" sx={ { display: 'block' } }>
          이 페이지의 모든 표는 저장소의 문서, 데이터, 스크립트에서 파생했다. 저장소 밖 자료는 쓰지 않았다.
        </Typography>
      </PageContainer>
    </>
  ),
};
