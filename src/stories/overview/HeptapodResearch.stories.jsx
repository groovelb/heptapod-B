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

/** 원작 조사: 영화, 언어, 세계관에서 무엇을 보고 무엇을 가져왔나 */
const SOURCE_RESEARCH = [
  {
    group: '영화',
    subject: 'Arrival (2016, 드니 빌뇌브)',
    intro: '문자의 생김새와 챔버의 공기를 화면에서 직접 관찰했다. 캡처는 저장소에 두지 않고 분석 결과만 남겼다.',
    rows: [
      {
        topic: '로고그램 원화',
        observed: '로고그램 36자 사전 이미지와 원화 시트 18점. 잉크가 번진 원, 여러 가닥, 비산점 (REF-01, 02, 04)',
        adopted: 'F1~F8 조형 범위와 T1~T5 질감 규칙. buildModel 파라미터의 출처',
        source: 'docs 03 4.1절',
      },
      {
        topic: '문자 제작 방식',
        observed: '원작의 문자는 연출이 먼저였고 체계는 사후에 정리됐다',
        adopted: '같은 순서로 역설계한다. 형태를 먼저 관찰해 규칙으로 되돌리고 그 과정을 콘텐츠로 삼는다',
        source: 'docs 01 2절',
      },
      {
        topic: '챔버 연출',
        observed: '안개 막, 어두운 수직 결 텍스처, 틸 그레이 안개, 저채도 35mm 질감 (REF-03, 05, 06, 07)',
        adopted: '어두운 UI 색과 틸 그레이 안개 토큰. 히어로 영상 Shot 02→11의 진입·상승·중력 전환 여정',
        source: 'docs 03 1절·4절, docs 05',
      },
      {
        topic: '의상 색',
        observed: '방호복 오렌지에서 유채색 액센트 후보를 뽑았다',
        adopted: '채택하지 않았다. 잉크와 안개의 무채색만 남긴다',
        source: 'docs 03 4.1절 비고',
      },
      {
        topic: '포스터 타이포',
        observed: '와이드 트래킹 세리프와 잉크 대비 (REF-08)',
        adopted: '화면의 세리프 표기(Cinzel)와 넓은 자간',
        source: 'docs 03 3.2절',
      },
      {
        topic: '음원',
        observed: '챔버의 저역 드론과 접촉 장면의 정적',
        adopted: '원작 음원은 쓰지 않는다. 저역 드론 베드와 마디 클립을 합성한다',
        source: 'docs 03 4절, docs 07',
      },
    ],
  },
  {
    group: '언어',
    subject: '헵타포드 B (문자 체계)',
    intro: '헵타포드 A(말)와 B(글)는 별개 체계다. 이 프로젝트는 B만 다루고, B가 무엇을 할 수 없는지를 먼저 정리했다.',
    rows: [
      {
        topic: '표기 단위',
        observed: '문장 하나가 원 하나. 획에 순서가 없고 한 번에 읽는 동시적 사고 단위 (의미문자, 비선형 정서법)',
        adopted: '이름 하나를 로고그램 하나로 응축한다. 글자를 늘어놓지 않는다',
        source: 'docs 01 1절, docs 06 1절',
      },
      {
        topic: '표음 대응',
        observed: '소리와 형태의 대응표가 없어 이름의 음역은 원리적으로 불가능하다',
        adopted: '번역기가 아니라 결정론적 인코더로 포지셔닝한다. 한계를 먼저 밝힌다',
        source: 'docs 01 2절',
      },
      {
        topic: '복잡도',
        observed: '복잡도는 의미 단위 수에 비례한다 (S1)',
        adopted: 'branchCount = clamp(NFD 자모 수, 3, 9). 짧은 이름은 단순, 긴 이름은 조밀',
        source: 'MODEL.md meta, docs 10',
      },
      {
        topic: '자모 대응',
        observed: '같은 자모는 같은 가지 유형으로 돌아온다 (S2)',
        adopted: '자모를 슬롯과 가지 유형에 고정 매핑. 같은 입력은 같은 형태 (결정론)',
        source: 'docs 10 1.2절',
      },
      {
        topic: '화행 표시',
        observed: '의문·진술 같은 화행은 정해진 자리의 장식으로만 표시한다 (S3)',
        adopted: '의문형 분리 규칙. 본체 형태는 바꾸지 않는다',
        source: 'docs 10 2.5절',
      },
      {
        topic: '하한',
        observed: '아무리 단순해도 링은 유지하고 가지는 3개 이상이다 (S4)',
        adopted: '한 글자 이름도 링과 가지 3개를 갖는다',
        source: 'MODEL.md',
      },
    ],
  },
  {
    group: '세계관',
    subject: '테드 창 「당신 인생의 이야기」(1998)와 영화의 시간 개념',
    intro: '문자를 배우면 시간을 동시에 지각하게 된다는 설정이 카피와 의미 체계의 뼈대다.',
    rows: [
      {
        topic: '비선형 시간',
        observed: '언어가 시간 지각을 바꾼다(사피어-워프). 시작과 끝을 함께 보는 의식',
        adopted: '히어로 카피 6마디로 점진 주입. 의미 체계의 동시성(떨어진 초점의 공존)',
        source: 'docs 06 1절, docs 18',
      },
      {
        topic: '첫 접촉',
        observed: '그들이 먼저 건넨 말과 막 앞에서의 응답',
        adopted: '랜딩은 세계관 수용, 인코더는 응답. 이름은 당신의 첫 단어',
        source: 'docs 02 1.1절, docs 06',
      },
      {
        topic: '응답의 방향',
        observed: '건네는 쪽과 받는 쪽, 그리고 주고받는 관계',
        adopted: '기본 의미 3종: 도래·수용·상호성. 초점 방향(+1/-1)으로 판정',
        source: 'docs 18, docs 23 4절',
      },
      {
        topic: '해석의 규율',
        observed: '영화에는 이름을 문자로 옮기는 공식 규칙도, 이름의 뜻도 없다',
        adopted: '형태에서 읽은 것만 말한다. 어원·성격·궁합·운명은 말하지 않고 모든 해석 화면에 면책 문구를 둔다',
        source: 'docs 02 1.1절, docs 23, i18n',
      },
    ],
  },
];

/** 이 프로젝트의 확장: 원작에 없는 것을 어떻게 더했나 */
const EXTENSION_ROWS = [
  {
    area: '이름 인코더',
    source: '문자의 생김새와 비선형이라는 설정',
    added: 'NFD 자모 → xmur3 해시 → 12슬롯 가지·덩어리 모델. 같은 이름은 항상 같은 형태',
    docs: 'docs 10, MODEL.md',
    story: { label: '09 Encoder Pipeline', id: 'overview-heptapod-b-09-encoder-pipeline--default' },
  },
  {
    area: '렌더러 3종',
    source: '잉크 질감의 정지 이미지',
    added: 'SVG·Canvas·WebGL이 같은 모델을 읽는 단일 계약. 기기 성능에 따른 품질 단계',
    docs: 'docs 13, 21, 28',
    story: { label: 'LogogramRendererCanvas', id: 'custom-component-2-glyph-renderer-logogramrenderercanvas--default' },
  },
  {
    area: '의미군 v1',
    source: '없음. 문자에서 뜻을 읽는 규칙은 영화에 없다',
    added: '도래·수용·상호성 + 동시성·여백·잔향. 이름이 아니라 저장된 형태만 판독',
    docs: 'docs 18',
    story: { label: 'ArchiveMeaningExplorer', id: 'custom-component-5-archive-feed-archivemeaningexplorer--default' },
  },
  {
    area: '유형 서사',
    source: '없음',
    added: '3계열 24유형의 한영 원고. 세계관 안의 역할로 쓰고 성격 판정은 하지 않는다',
    docs: 'docs 19, 23~25',
    story: { label: 'ArchiveArchetypeFeed', id: 'custom-component-5-archive-feed-archivearchetypefeed--docs' },
  },
  {
    area: '계열·유형 상징',
    source: '없음',
    added: '같은 문법으로 저작한 안내용 형태. 같은 판독기로 의도한 의미가 나오는지 확인',
    docs: 'archiveFamilySymbols.js',
    story: { label: 'ArchiveFamilySymbol', id: 'custom-component-5-archive-feed-archivefamilysymbol--default' },
  },
  {
    area: '공명',
    source: '없음',
    added: '형태의 공통 구조로 표식끼리 연결. 철자 비교나 관계 추정은 하지 않는다',
    docs: 'docs 15~17',
    story: { label: 'ResonanceMap', id: 'custom-component-5-archive-feed-resonancemap--default' },
  },
  {
    area: '공개 아카이브',
    source: '없음',
    added: '동의 기반 공개, 링크 공유, 가입 없는 기록. 동의 전에는 서버로 보내지 않는다',
    docs: 'docs 09, 11, 12',
    story: { label: 'ResonanceFieldPage', id: 'page-response-archive-resonancefieldpage--default' },
  },
  {
    area: '히어로 시네마틱',
    source: '챔버로 들어가는 장면',
    added: '자체 생성한 11샷 47초 영상과 스크럽 사운드. 스크롤로 진입·상승·중력 전환을 되감는다',
    docs: 'docs 05~07',
    story: { label: 'HeptapodHeroIntro', id: 'template-heptapodherointro--default' },
  },
  {
    area: '정지 표식과 공유 카드',
    source: '없음',
    added: '같은 모델에서 뽑은 정지 PNG와 1200×630 공유 카드. 한국어와 영어 두 벌',
    docs: 'docs 26, 27, 30, 31',
    story: { label: 'StaticGlyphImage', id: 'custom-component-2-glyph-renderer-staticglyphimage--default' },
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
 * 원작 조사 표: 한 그룹(영화·언어·세계관)의 관찰과 채택
 *
 * Props:
 * @param {object} group - SOURCE_RESEARCH 의 한 항목 [Required]
 *
 * Example usage:
 * <SourceResearchTable group={ SOURCE_RESEARCH[0] } />
 */
function SourceResearchTable({ group }) {
  return (
    <Box sx={ { mb: 4 } }>
      <Stack direction="row" spacing={ 1.5 } alignItems="baseline" sx={ { mb: 0.5 } }>
        <Typography variant="subtitle1" sx={ { fontWeight: 700 } }>{ group.group }</Typography>
        <Typography variant="body2" color="text.secondary">{ group.subject }</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={ { display: 'block', mb: 1.5 } }>{ group.intro }</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={ { fontWeight: 600, width: 120 } }>조사한 것</TableCell>
              <TableCell sx={ { fontWeight: 600 } }>관찰</TableCell>
              <TableCell sx={ { fontWeight: 600 } }>프로젝트에 가져온 것</TableCell>
              <TableCell sx={ { fontWeight: 600, width: 150 } }>출처</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { group.rows.map((row) => (
              <TableRow key={ row.topic } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
                <TableCell sx={ { fontSize: 12, fontWeight: 600, verticalAlign: 'top' } }>{ row.topic }</TableCell>
                <TableCell sx={ { fontSize: 12, verticalAlign: 'top' } }>{ row.observed }</TableCell>
                <TableCell sx={ { fontSize: 12, verticalAlign: 'top' } }>{ row.adopted }</TableCell>
                <TableCell sx={ { fontFamily: 'monospace', fontSize: 11, color: 'text.secondary', verticalAlign: 'top' } }>{ row.source }</TableCell>
              </TableRow>
            )) }
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

/**
 * 확장 표: 원작에 있는 것과 이 프로젝트가 더한 것
 *
 * Props:
 * @param {Array} rows - EXTENSION_ROWS [Required]
 *
 * Example usage:
 * <ExtensionTable rows={ EXTENSION_ROWS } />
 */
function ExtensionTable({ rows }) {
  return (
    <TableContainer sx={ { mb: 2 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600, width: 140 } }>영역</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 200 } }>원작에 있는 것</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>이 프로젝트가 더한 것</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 150 } }>근거 문서</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 170 } }>보이는 곳</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { rows.map((row) => (
            <TableRow key={ row.area } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
              <TableCell sx={ { fontSize: 12, fontWeight: 600, verticalAlign: 'top' } }>{ row.area }</TableCell>
              <TableCell sx={ { fontSize: 12, color: 'text.secondary', verticalAlign: 'top' } }>{ row.source }</TableCell>
              <TableCell sx={ { fontSize: 12, verticalAlign: 'top' } }>{ row.added }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 11, color: 'text.secondary', verticalAlign: 'top' } }>{ row.docs }</TableCell>
              <TableCell sx={ { fontSize: 12, verticalAlign: 'top' } }>
                <a href={ `?path=/story/${row.story.id}` } target="_top">{ row.story.label }</a>
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
          note="원작 조사(영화·언어·세계관), 프로젝트의 확장, 형태 규칙, 히어로 영상 파이프라인"
          brandName="Design System"
          systemName="Heptapod B"
          version="1.0"
        />
        <PageContainer>
          <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
            Domain Knowledge & Research
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 4 } }>
            언어를 형상화하려고 영화, 헵타포드 B 문자, 소설의 세계관을 조사한 것과 거기서 이 프로젝트가 확장한 것. 그 다음은 관찰을 수치로 고정한 규칙, 그 규칙으로 쓴 프롬프트, 스토리보드와 리마스터 계획, 화면이 쓰는 영상까지의 경로다.
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
            title="원작 조사: 영화, 언어, 세계관"
            description="언어를 형상화하기 전에 영화의 화면, 헵타포드 B의 문자 규칙, 소설과 영화의 시간 개념을 나눠 조사했다. 각 행은 무엇을 봤고 그것이 프로젝트의 어떤 결정이 됐는지를 잇는다."
          />
          { SOURCE_RESEARCH.map((group) => (
            <SourceResearchTable key={ group.group } group={ group } />
          )) }
          <Stack spacing={ 0.5 } sx={ { mb: 4 } }>
            <Typography variant="caption" color="text.secondary">
              저장소 밖 사실: 영화 Arrival(2016)은 테드 창의 「당신 인생의 이야기」(1998)를 각색했다. 영화의 로고그램은 프로덕션 디자인 팀이 잉크 얼룩에서 출발해 약 100자의 사전으로 정리했고, 문자 분석에는 스티븐 울프럼과 크리스토퍼 울프럼이 참여했다. 위 표의 근거는 docs 에 남은 관찰뿐이고 이 사실들은 배경으로만 참고했다.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              헵타포드 A(말)는 다루지 않는다. 화면의 소리는 형태를 설명하지 않고 공간만 채운다.
            </Typography>
          </Stack>

          <SectionTitle
            title="이 프로젝트의 확장"
            description="원작은 문자의 생김새와 비선형이라는 설정만 준다. 이름을 형태로 바꾸는 규칙, 형태에서 뜻을 읽는 규칙, 유형과 서사, 공명, 공개 아카이브는 전부 이 프로젝트가 더한 것이다. 원작의 문법을 확장한 프로젝트 고유 해석이라는 태도를 모든 화면이 유지한다."
          />
          <ExtensionTable rows={ EXTENSION_ROWS } />
          <Stack spacing={ 0.5 } sx={ { mb: 4 } }>
            <Typography variant="caption" color="text.secondary">
              확장의 순서는 인코더(형태) → 렌더러(질감) → 의미군(판독) → 유형·서사(해석) → 공명·아카이브(관계) → 히어로·공유(경험)다. 각 단계의 구현은 Custom Component 의 1~5 그룹과 Page 에 있다.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              어느 확장도 원작의 공식 번역이나 이름·성격의 판정을 주장하지 않는다. 의미와 유형은 형태에 붙인 해석이고, 공명은 형태의 공통 구조만 본다.
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
