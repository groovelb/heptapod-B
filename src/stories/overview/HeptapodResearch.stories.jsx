import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
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
import { EditorialDocument } from '../../components/storybookDocumentation/EditorialDocument';
import promptTemplate from '../../../docs/heptapod-b-encoder/05-hero-cinematic-prompt-template.md?raw';
import remasterManifest from '../../../docs/heptapod-b-encoder/remaster/still-remaster-manifest.json';
import { ASSEMBLY_STEPS } from './assemblySteps';

export default {
  title: 'Overview/Heptapod B/08 Domain Knowledge & Research',
  parameters: {
    layout: 'padded',
  },
};

/**
 * 도메인 지식 학습 데이터.
 * 이 프로젝트가 헵타포드 B 문자 체계와 아카이브 의미 체계를 다루려고 모은 자료다.
 * flow 는 그 자료가 흘러간 상수·모듈, story 는 결과가 보이는 스토리다.
 */
const KNOWLEDGE_ROWS = [
  {
    name: '문자 정량표 F1~F8',
    what: '링, 획 폭, 가닥, 가지, 비산의 수치 범위',
    source: 'docs 03 4절 (원문 03 1.2)',
    flow: 'utils/heptapod/buildModel.js',
    story: { label: '05 Logogram Data', id: 'overview-heptapod-b-05-logogram-data--default' },
  },
  {
    name: '인코딩 단서 S1~S4',
    what: '복잡도, 자모 대응, 화행 표시, 하한',
    source: 'docs 03 4절 (원문 03 1.3)',
    flow: 'reversibleCodec.js · reversibleModel.js',
    story: { label: '09 Encoder Pipeline', id: 'overview-heptapod-b-09-encoder-pipeline--default' },
  },
  {
    name: '질감 단서 T1~T5',
    what: '농담 감쇠, 확산, 비산, 잉크 색, 배경',
    source: 'docs 03 4절 (원문 03 1.4)',
    flow: 'logogramParticles.js · 렌더러 3종',
    story: { label: 'LogogramRendererCanvas', id: 'custom-component-2-glyph-renderer-logogramrenderercanvas--default' },
  },
  {
    name: '모델 계약 MODEL.md',
    what: '렌더러 3종이 읽는 필드와 불변 조건',
    source: 'src/utils/heptapod/MODEL.md',
    flow: 'buildModel.js · verify.mjs',
    story: { label: '05 Logogram Data', id: 'overview-heptapod-b-05-logogram-data--default' },
  },
  {
    name: '의미군 규칙 v1',
    what: '기본 의미 3종과 추가 의미 3종의 판정 기준',
    source: 'docs 18 · heptapodMeaningCatalog.js',
    flow: 'classifyGlyphMorphology.js · interpretGlyphMeaning.js',
    story: { label: '05 Logogram Data', id: 'overview-heptapod-b-05-logogram-data--default' },
  },
  {
    name: '유형 카탈로그 24',
    what: '의미 조합 24개의 키와 제목',
    source: 'docs 19 · heptapodArchetypeCatalog.js',
    flow: 'buildArchiveArchetypeFeed.js',
    story: { label: 'ArchiveArchetypeFeed', id: 'custom-component-5-archive-feed-archivearchetypefeed--docs' },
  },
  {
    name: '유형 서사 원고 v5',
    what: '계열 3, 유형 24의 한영 원고 전문',
    source: 'archetypeNarratives.json · docs 23~25',
    flow: 'ArchetypeNarrative · ArchetypeMotto',
    story: { label: '06 Content Data', id: 'overview-heptapod-b-06-content-data--default' },
  },
  {
    name: '저작 상징 모델 28',
    what: '계열 3, 유형 24, 시간순 1의 안내용 형태',
    source: 'archiveFamilySymbols.js · archiveArchetypeSymbols.js',
    flow: 'glyph-symbols/v1 PNG 56장',
    story: { label: '05 Logogram Data', id: 'overview-heptapod-b-05-logogram-data--default' },
  },
  {
    name: '히어로 프롬프트 템플릿',
    what: '레퍼런스 역할, 연속성 락, 확정 11샷',
    source: 'docs 05',
    flow: 'hero-motion 생성본 · hero-scenes 스틸',
    story: { label: '07 Assets', id: 'overview-heptapod-b-07-assets--default' },
  },
  {
    name: '인트로 카피와 비트',
    what: '6마디의 카피, 영상 구간, 셀 가중치',
    source: 'docs 06 · heptapodHeroStory.js',
    flow: 'heptapodScrubTimeline.js · 캡션 변주 7종',
    story: { label: '06 Content Data', id: 'overview-heptapod-b-06-content-data--default' },
  },
  {
    name: '리마스터 매니페스트',
    what: '입력 스틸 12, 클립 8, 이음매 4의 원본 대조',
    source: 'docs remaster/still-remaster-manifest.json',
    flow: 'hero-scrub-v2-topaz 교체 판단',
    story: { label: '07 Assets', id: 'overview-heptapod-b-07-assets--default' },
  },
  {
    name: 'UI 레이아웃 분류 체계',
    what: '아키타입 id 목록과 콘텐츠 신호 값',
    source: 'docs/taxonomy-v0.4.md · layoutTaxonomyData.js',
    flow: 'docs 03 2절 레이아웃 전략',
    story: { label: '03 Visual Direction', id: 'overview-heptapod-b-03-visual-direction--docs' },
  },
  {
    name: '카드용 서체',
    what: 'Cinzel 과 Noto Serif KR 의 외곽선',
    source: 'public/og/Cinzel*.ttf · NotoSerifKR-Bold.otf',
    flow: 'lib/og/card.js 링크 미리보기',
    story: { label: '07 Assets', id: 'overview-heptapod-b-07-assets--default' },
  },
  {
    name: '영화 레퍼런스 캡처',
    what: '챔버 기하, 스케일, 중력 전환, 안개 접촉',
    source: '저장소 밖 (개인 파일)',
    flow: 'docs 05 레퍼런스 역할 표',
    story: null,
  },
];

/** 로고그램 조형 정량표 (03-visual-direction.md 4절) */
const FORM_RULES = [
  { id: 'F1', axis: '링 윤곽', value: '타원율 0.92~1.00, 반지름 변조 0.03~0.08R' },
  { id: 'F2', axis: '획 폭', value: '최세 0.02R, 평균 0.04~0.06R, 응집부 0.15~0.30R' },
  { id: 'F3', axis: '멀티 가닥', value: '1~4가닥, 이격 0~0.10R' },
  { id: 'F4', axis: '덩어리', value: '1~6개, 무게중심으로 편중' },
  { id: 'F5', axis: '가지', value: '길이 0.10~0.40R, 안팎 비율 2 대 8' },
  { id: 'F6', axis: '말단과 비산', value: '고임 최대 0.35R, 비산점 0.01~0.03R 5~15개' },
  { id: 'F7', axis: '링 개구부', value: '최대 60도, 출현율 3%' },
  { id: 'F8', axis: '이탈 루프', value: '0.3~0.6R' },
];

/** 인코딩 규칙 단서 */
const ENCODING_RULES = [
  { id: 'S1', axis: '복잡도', value: '의미 단위 수에 비례. 짧은 이름은 단순, 긴 이름은 조밀' },
  { id: 'S2', axis: '자모 대응', value: '같은 자모는 같은 가지 유형으로 돌아온다' },
  { id: 'S3', axis: '화행 표시', value: '정해진 자리의 장식으로만 표시한다' },
  { id: 'S4', axis: '하한', value: '아무리 단순해도 링은 유지하고 가지는 3개 이상' },
];

/** 질감 단서 */
const TEXTURE_RULES = [
  { id: 'T1', axis: '농담', value: '중심선 최농에서 외곽으로 지수 감쇠 (0.95 / 0.5 / 0.15)' },
  { id: 'T2', axis: '가장자리', value: '기체처럼 풀림, 확산 폭 0.05~0.15R' },
  { id: 'T3', axis: '비산점', value: '무게중심 주변 가우시안 산포, 거리에 따라 크기와 밀도 감소' },
  { id: 'T4', axis: '잉크 색', value: '완전 검정이 아닌 회흑. 회색을 따로 칠하지 않고 알파로만' },
  { id: 'T5', axis: '배경', value: '정지된 순백을 쓰지 않는다' },
];

/** 산출물 대응표: 문서에서 데이터와 에셋까지 */
const PIPELINE_ROWS = [
  {
    stage: '1. 프롬프트 템플릿',
    artifact: 'docs/05-hero-cinematic-prompt-template.md',
    result: '레퍼런스 역할 7종, 연속성 락, 확정 11샷',
  },
  {
    stage: '2. 스토리보드',
    artifact: 'docs/hero-storyboard.html (3.0MB)',
    result: '샷별 미리보기와 생성 제출 기록',
  },
  {
    stage: '3. 샷 생성',
    artifact: 'public/heptapod-b-encoder/hero-motion/ · hero-scenes/',
    result: '영상 시도본 24묶음, 스틸 63장',
  },
  {
    stage: '4. 리마스터 계획',
    artifact: 'docs/remaster/ 문서 12 + still-remaster-manifest.json',
    result: '고유 입력 스틸 12, 클립 8, 대조 필요 이음매 4',
  },
  {
    stage: '5. 카피',
    artifact: 'docs/06-hero-storyline.md → src/data/heptapodHeroStory.js',
    result: '비트 6마디의 카피, 영상 구간, 셀 가중치',
  },
  {
    stage: '6. 타임라인',
    artifact: 'src/data/heptapodScrubTimeline.js',
    result: '셀 좌표와 진행도 구간 (넓은 화면 6.4셀, 좁은 화면 4.85셀)',
  },
  {
    stage: '7. 스크럽 빌드',
    artifact: 'scripts/build-hero-scrub.mjs',
    result: 'hero-scrub/ 영상 2벌, 포스터, 마디 클립 6개와 베드 루프',
  },
  {
    stage: '8. 업스케일과 교체',
    artifact: 'assets/heptapod-hero-v2/ + scripts/prepare-hero-video.mjs',
    result: 'hero-scrub-v2-topaz/ 와 hero-scrub-v2-mobile/ (현재 화면이 쓰는 것)',
  },
];

/** 저장소에 없어서 보여 주지 못하는 산출물 */
const MISSING_ARTIFACTS = [
  {
    file: 'docs/midjourney-moodboard.html',
    reason: '이미지가 output/heptapod-remaster-midjourney/ 를 가리킨다. 그 경로는 추적하지 않고 이미지 파일도 남아 있지 않다',
  },
  {
    file: 'docs/hero-topaz-upscale-comparison.html',
    reason: '업스케일 전후 비교본이 output/heptapod-remaster-v2/ 에 있다. 저장소 밖이라 비교 화면을 띄울 수 없다',
  },
  {
    file: 'docs/hero-storyboard-v2-comparison.html',
    reason: '같은 이유로 프레임 이미지가 없다',
  },
];

/**
 * 도메인 지식 표
 *
 * Props:
 * @param {Array} rows - KNOWLEDGE_ROWS [Required]
 *
 * Example usage:
 * <KnowledgeTable rows={ KNOWLEDGE_ROWS } />
 */
function KnowledgeTable({ rows }) {
  return (
    <TableContainer sx={ { mb: 2 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600, width: 150 } }>데이터</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>무엇을 가르쳤나</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>출처</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>흘러간 곳</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 150 } }>보이는 곳</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { rows.map((row) => (
            <TableRow key={ row.name } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
              <TableCell sx={ { fontSize: 12, fontWeight: 600, verticalAlign: 'top' } }>{ row.name }</TableCell>
              <TableCell sx={ { fontSize: 12, verticalAlign: 'top' } }>{ row.what }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 11, color: 'text.secondary', verticalAlign: 'top' } }>{ row.source }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 11, color: 'text.secondary', verticalAlign: 'top' } }>{ row.flow }</TableCell>
              <TableCell sx={ { fontSize: 12, verticalAlign: 'top' } }>
                { row.story ? (
                  <a href={ `?path=/story/${row.story.id}` } target="_top">{ row.story.label }</a>
                ) : (
                  <Box component="span" sx={ { color: 'text.disabled' } }>없음</Box>
                ) }
              </TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 규칙 표
 *
 * Props:
 * @param {Array} rows - { id, axis, value } 배열 [Required]
 *
 * Example usage:
 * <RuleTable rows={ FORM_RULES } />
 */
function RuleTable({ rows }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600, width: 60 } }>id</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 140 } }>축</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>관찰에서 고정한 값</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { rows.map((row) => (
            <TableRow key={ row.id }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, fontWeight: 600 } }>{ row.id }</TableCell>
              <TableCell sx={ { fontSize: 13 } }>{ row.axis }</TableCell>
              <TableCell sx={ { fontSize: 13, color: 'text.secondary' } }>{ row.value }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 리마스터 스틸 표: 매니페스트 항목과 실제 입력 이미지
 *
 * Props:
 * @param {Array} frames - still-remaster-manifest.json 의 frames [Required]
 *
 * Example usage:
 * <FrameTable frames={ remasterManifest.frames } />
 */
function FrameTable({ frames }) {
  return (
    <Grid container spacing={ 1.5 } sx={ { mb: 4 } }>
      { frames.map((frame) => {
        const source = frame.source_paths?.[0];
        const url = source?.startsWith('public/') ? source.slice('public'.length) : null;
        return (
          <Grid key={ frame.id } size={ { xs: 6, sm: 4, md: 3 } }>
            <Stack spacing={ 0.5 }>
              <Box sx={ { width: '100%', aspectRatio: '16 / 9', backgroundColor: 'action.hover', overflow: 'hidden' } }>
                { url ? (
                  <Box
                    component="img"
                    src={ url }
                    alt={ `${frame.id} ${frame.name}` }
                    loading="lazy"
                    sx={ { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } }
                  />
                ) : null }
              </Box>
              <Typography variant="caption" sx={ { fontFamily: 'monospace', fontSize: 10, color: 'text.secondary', wordBreak: 'break-all' } }>
                { `${frame.id} · ${frame.name}` }
              </Typography>
              <Typography variant="caption" sx={ { fontSize: 10, color: 'text.disabled' } }>
                { `${frame.source_dimensions?.join('×') || '크기 미상'} · ${frame.status}` }
              </Typography>
            </Stack>
          </Grid>
        );
      }) }
    </Grid>
  );
}

/**
 * 키-값 표
 *
 * Props:
 * @param {Array} rows - [키, 값] 쌍 배열 [Required]
 *
 * Example usage:
 * <PairTable rows={ rows } />
 */
function PairTable({ rows }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600, width: 220 } }>필드</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>값</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { rows.map(([key, value]) => (
            <TableRow key={ key }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ key }</TableCell>
              <TableCell sx={ { fontSize: 13, color: 'text.secondary' } }>{ String(value) }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** 리서치에서 에셋까지: 관찰, 프롬프트, 스토리보드, 리마스터, 빌드 */
export const Default = {
  render: () => {
    const manifestRows = [
      ['version', remasterManifest.version],
      ['status', remasterManifest.status],
      ['target_dimensions', remasterManifest.target_dimensions.join(' × ')],
      ['target_is_assumption', remasterManifest.target_is_assumption],
      ['execution_route', remasterManifest.execution_route],
      ['source_of_truth', remasterManifest.source_of_truth],
      ['frames · clips · joins', `${remasterManifest.frames.length} · ${remasterManifest.clips.length} · ${remasterManifest.joins_requiring_comparison.length}`],
      ['generated_unique_count', remasterManifest.generated_unique_count],
      ['uhd_accepted_count', remasterManifest.uhd_accepted_count],
    ];

    return (
      <>
        <DocumentTitle
          title="Domain Knowledge & Research"
          status="Available"
          note="형태 규칙을 수치로 고정한 관찰과 히어로 영상 파이프라인"
          brandName="Design System"
          systemName="Heptapod B"
          version="1.0"
        />
        <PageContainer>
          <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
            Domain Knowledge & Research
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 4 } }>
            영화의 문자와 챔버를 관찰해 수치로 고정한 규칙, 그 규칙으로 쓴 프롬프트, 거기서 나온 스토리보드와 리마스터 계획, 그리고 화면이 쓰는 영상까지의 경로다.
          </Typography>

          <SectionTitle
            title="도메인 지식 학습 데이터"
            description="이 프로젝트가 헵타포드 B 문자 체계와 아카이브 의미 체계를 다루려고 모은 자료 전부다. 관찰에서 상수로, 상수에서 화면으로 이어진다."
          />
          <KnowledgeTable rows={ KNOWLEDGE_ROWS } />
          <Stack spacing={ 0.5 } sx={ { mb: 4 } }>
            <Typography variant="caption" color="text.secondary">
              F1~F8, S1~S4, T1~T5 의 값은 아래 세 표에 그대로 있다. 원문은 재작성 전 03 문서(git ref 4e08da7 이전)의 1.2~1.4절이다.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              의미군과 유형은 이름이 아니라 저장된 형태만 읽는다. 유형 서사는 세계관 안의 해석이고 사람의 성격을 판정하지 않는다.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              영화 레퍼런스 캡처는 저장소에 두지 않는다. 역할과 금지 사항만 docs 05 의 표로 남겼다.
            </Typography>
          </Stack>

          <SectionTitle
            title="조립 순서에서의 자리"
            description="이 문서는 1단계(리서치)와 4단계(히어로 영상 파이프라인)를 맡는다. 전체 순서는 Custom Component / 0. Hierarchy 에 있다."
          />
          <TableContainer sx={ { mb: 4 } }>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={ { fontWeight: 600, width: 60 } }>단계</TableCell>
                  <TableCell sx={ { fontWeight: 600, width: 200 } }>이름</TableCell>
                  <TableCell sx={ { fontWeight: 600 } }>하는 일</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                { ASSEMBLY_STEPS.map((step) => (
                  <TableRow
                    key={ step.step }
                    sx={ { backgroundColor: [1, 4].includes(step.step) ? 'action.hover' : 'transparent' } }
                  >
                    <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ step.step }</TableCell>
                    <TableCell sx={ { fontSize: 13, fontWeight: [1, 4].includes(step.step) ? 700 : 400 } }>{ step.title }</TableCell>
                    <TableCell sx={ { fontSize: 12, color: 'text.secondary' } }>{ step.what }</TableCell>
                  </TableRow>
                )) }
              </TableBody>
            </Table>
          </TableContainer>

          <SectionTitle
            title="레퍼런스 분석 · 로고그램 조형 (F1~F8)"
            description="영화의 문자 이미지에서 읽어 R(기준 반지름)로 정규화한 값이다. buildModel 의 파라미터 범위가 이 표에서 나왔다."
          />
          <RuleTable rows={ FORM_RULES } />

          <SectionTitle
            title="인코딩 규칙 단서 (S1~S4)"
            description="형태가 무엇을 담고 있어야 하는지에 대한 규칙이다. 이름 길이와 자모 대응, 화행 표시, 하한을 정한다."
          />
          <RuleTable rows={ ENCODING_RULES } />

          <SectionTitle
            title="질감 단서 (T1~T5)"
            description="잉크의 농담과 확산, 비산, 색과 배경 규칙이다. 렌더러 세 종이 같은 규칙을 따른다."
          />
          <RuleTable rows={ TEXTURE_RULES } />

          <SectionTitle
            title="무드보드"
            description="Midjourney 무드보드 HTML 은 저장소에 있지만 그 안의 이미지는 없다. 아래 한계 표를 참고한다."
          />

          <SectionTitle
            title="프롬프트 템플릿 (docs 05)"
            description="레퍼런스 역할, 프로젝트 연속성 락, 확정 11샷의 원문이다. docs/ 원본을 그대로 불러 그린다."
          />
          <Box sx={ { mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 } }>
            <EditorialDocument source={ promptTemplate } />
          </Box>

          <SectionTitle
            title="스토리보드"
            description="docs/hero-storyboard.html 을 public/research/ 로 복사해 그대로 띄운다. 3.0MB이고 미리보기 이미지가 문서 안에 들어 있다."
          />
          <Box
            component="iframe"
            src="/research/hero-storyboard.html"
            title="Hero storyboard"
            loading="lazy"
            sx={ { width: '100%', height: 720, border: '1px solid', borderColor: 'divider', mb: 4, backgroundColor: 'common.black' } }
          />

          <SectionTitle
            title="리마스터 계획"
            description="스틸을 3840×2160으로 다시 만들려던 계획이다. 상태는 해상도 조사에서 멈춤이고 목표 크기는 확정이 아니라 제안값이다."
          />
          <PairTable rows={ manifestRows } />

          <SectionTitle
            title="리마스터 입력 스틸"
            description="매니페스트의 고유 입력 12장이다. 아래 썸네일은 매니페스트가 원본으로 지정한 실제 파일이고, 재생성 결과물은 저장소에 없다."
          />
          <FrameTable frames={ remasterManifest.frames } />

          <SectionTitle
            title="산출물에서 데이터와 에셋까지"
            description="문서 한 장이 어떤 파일이 되어 화면에 도달하는지의 경로다."
          />
          <TableContainer sx={ { mb: 4 } }>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={ { fontWeight: 600, width: 150 } }>단계</TableCell>
                  <TableCell sx={ { fontWeight: 600 } }>산출물</TableCell>
                  <TableCell sx={ { fontWeight: 600 } }>결과</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                { PIPELINE_ROWS.map((row) => (
                  <TableRow key={ row.stage } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
                    <TableCell sx={ { fontSize: 12, fontWeight: 600 } }>{ row.stage }</TableCell>
                    <TableCell sx={ { fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' } }>{ row.artifact }</TableCell>
                    <TableCell sx={ { fontSize: 12 } }>{ row.result }</TableCell>
                  </TableRow>
                )) }
              </TableBody>
            </Table>
          </TableContainer>

          <SectionTitle
            title="보여 주지 못하는 것"
            description="저장소가 추적하지 않는 경로를 가리키는 문서다. 파일 자체는 남아 있지만 화면에 띄우면 빈 칸이 된다."
          />
          <TableContainer sx={ { mb: 4 } }>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={ { fontWeight: 600, width: 320 } }>문서</TableCell>
                  <TableCell sx={ { fontWeight: 600 } }>이유</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                { MISSING_ARTIFACTS.map((row) => (
                  <TableRow key={ row.file }>
                    <TableCell sx={ { fontFamily: 'monospace', fontSize: 11 } }>{ row.file }</TableCell>
                    <TableCell sx={ { fontSize: 12, color: 'text.secondary' } }>{ row.reason }</TableCell>
                  </TableRow>
                )) }
              </TableBody>
            </Table>
          </TableContainer>
        </PageContainer>
      </>
    );
  },
};
