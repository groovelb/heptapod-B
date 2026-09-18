import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
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
import { HERO_STORY_BEATS, HERO_VIDEO_DURATION, HERO_POSTER_SRC } from '../../data/heptapodHeroStory';
import { HERO_SCRUB_TIMELINE } from '../../data/heptapodScrubTimeline';
import { MEANING_BASE_IDS, MEANING_MODIFIER_IDS } from '../../data/heptapodMeaningCatalog';
import { ARCHETYPE_CATALOG } from '../../data/heptapodArchetypeCatalog';
import defaultTheme from '../../styles/themes/default.js';
import docSummary from '../../../docs/heptapod-b-encoder/01-project-summary.md?raw';
import docVisual from '../../../docs/heptapod-b-encoder/03-visual-direction.md?raw';
import docShot from '../../../docs/heptapod-b-encoder/05-hero-cinematic-prompt-template.md?raw';
import docStoryline from '../../../docs/heptapod-b-encoder/06-hero-storyline.md?raw';
import docEncoderSpec from '../../../docs/heptapod-b-encoder/10-encoder-v2-spec.md?raw';
import docModel from '../../utils/heptapod/MODEL.md?raw';

export default {
  title: 'Overview/Heptapod B/10 Concept & Flow',
  parameters: {
    layout: 'padded',
  },
};

/** 중복 제거한 정렬 목록 */
const uniqueSorted = (matches) => [...new Set(matches || [])].sort();

/** 원문을 그대로 렌더하는 Appendix MDX 페이지. 값을 손으로 적지 않고 이 표에서만 참조한다 */
const APPENDIX_DOCS = {
  hero: { label: '05 원문: Hero Cinematic Prompt Template', id: 'overview-heptapod-b-appendix-hero-cinematic-prompt-template--docs' },
  storyline: { label: '06 원문: Hero Storyline', id: 'overview-heptapod-b-appendix-hero-storyline--docs' },
  scrubSound: { label: '07 원문: Scroll Scrub Sound Plan', id: 'overview-heptapod-b-appendix-scroll-scrub-sound-plan--docs' },
};

/** 기획 문서 MDX 페이지 (원문 렌더) */
const PLANNING_DOCS = [
  { label: '01 Project Summary', id: 'overview-heptapod-b-01-project-summary--docs' },
  { label: '02 UX Flow', id: 'overview-heptapod-b-02-ux-flow--docs' },
  { label: '03 Visual Direction', id: 'overview-heptapod-b-03-visual-direction--docs' },
];

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

/** 원문의 em dash 앞뒤 공백까지 잡는 패턴. 이 파일에 em dash 문자를 적지 않기 위해 코드포인트로 만든다 */
const EM_DASH_PATTERN = new RegExp('\\s*' + String.fromCharCode(0x2014) + '\\s*', 'g');

/**
 * 원문 라벨을 화면용으로 다듬는다. 백틱과 em dash 를 지우고 공백을 줄인다.
 *
 * @param {string} text - 문서 원문 조각 [Required]
 * @returns {string} 다듬은 문자열
 */
function cleanLabel(text) {
  return String(text || '')
    .replace(/`/g, '')
    .replace(EM_DASH_PATTERN, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 헤딩 아래 첫 코드 블록의 줄을 꺼낸다. 펜스 줄(언어 태그)은 버린다.
 *
 * @param {string} source - 마크다운 원문 [Required]
 * @param {string} heading - 찾을 헤딩 줄 [Required]
 * @returns {string[]} 코드 블록의 비어 있지 않은 줄
 */
function extractCodeBlock(source, heading) {
  const start = source.indexOf(heading);
  if (start < 0) return [];
  const open = source.indexOf('```', start);
  const close = source.indexOf('```', open + 3);
  if (open < 0 || close < 0) return [];
  return source.slice(source.indexOf('\n', open) + 1, close).split('\n').map((line) => line.trim()).filter(Boolean);
}

/**
 * `라벨:` 줄과 그 아래 본문으로 이뤄진 코드 블록을 항목 목록으로 바꾼다.
 * 05 문서의 마스터 프롬프트(6절)와 샷 슬롯(7절)이 이 형식이다.
 *
 * @param {string} source - 마크다운 원문 [Required]
 * @param {string} heading - 찾을 헤딩 줄 [Required]
 * @returns {Array<{ key: string, text: string }>} 라벨과 본문 쌍
 */
function extractLabeledBlock(source, heading) {
  const items = [];
  extractCodeBlock(source, heading).forEach((line) => {
    const label = line.match(/^([A-Z][A-Za-z ]*):$/);
    if (label) {
      items.push({ key: label[1], text: '' });
      return;
    }
    if (items.length === 0) return;
    const last = items[items.length - 1];
    last.text = last.text ? `${ last.text } ${ line }` : line;
  });
  return items;
}

/**
 * 조건에 맞는 첫 줄을 원문에서 찾는다.
 *
 * @param {string} source - 마크다운 원문 [Required]
 * @param {RegExp} pattern - 찾을 줄의 패턴 [Required]
 * @returns {string} 찾은 줄(없으면 빈 문자열)
 */
function findLine(source, pattern) {
  return source.split('\n').find((line) => pattern.test(line.trim())) || '';
}

/** MODEL.md 1절 스키마 코드 블록의 줄 */
const MODEL_SCHEMA_LINES = extractCodeBlock(docModel, '## 1. 전체 스키마');

/**
 * MODEL.md 스키마에서 한 필드의 줄과 원문 주석을 찾는다. 규칙 라벨은 이 주석을 그대로 쓴다.
 *
 * @param {string} key - 스키마 필드 이름 (예: 'branchCount') [Required]
 * @returns {{ line: string, comment: string }} 원문 줄과 주석
 */
function modelField(key) {
  const line = MODEL_SCHEMA_LINES.find((item) => item.startsWith(`"${ key }"`)) || '';
  const comment = line.split('//')[1] || '';
  return { line, comment: cleanLabel(comment) };
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
  timelineRows: docStoryline.split('\n').filter((line) => /^\|\s*\d{2}[–-]\d{2}s\s*\|/.test(line)).length,
  outputTargets: (docShot
    .slice(docShot.indexOf('- Active front sequence targets:'), docShot.indexOf('- Inactive sequence target'))
    .match(/`public\/heptapod-b-encoder\/hero-scenes\/.*`/g) || []).length,
};

/** 06 문서가 적은 활성 샷 구간(Shot 02→11). 반복 횟수는 이 범위에서 센다. */
const SHOT_RANGE = docStoryline.match(/Shot (\d+)→(\d+)/);
const SHOT_SPAN = SHOT_RANGE ? Number(SHOT_RANGE[2]) - Number(SHOT_RANGE[1]) + 1 : 0;

/** 01 문서의 한 줄 요약. 원문을 raw import 에서 뽑는다. */
const ONE_LINER = extractUnderHeading(docSummary, '## 1. 한 줄 요약', 1);

/** theme 토큰 값. 손으로 적지 않고 theme 객체에서 읽는다 (src/styles/themes/default.js) */
const PAL = defaultTheme.palette;
const TOKENS = {
  ink: { path: 'custom.chamber.ink', value: PAL.custom.chamber.ink },
  fog: { path: 'custom.chamber.fog', value: PAL.custom.chamber.fog },
  chamber: { path: 'background.default', value: PAL.background.default },
  mono: { path: 'typography.custom.mono', value: defaultTheme.typography.custom.mono.fontSize },
  radius: { path: 'shape.borderRadius', value: String(defaultTheme.shape.borderRadius) },
};

/** 의사결정 흐름 격자의 열. 왼쪽 결정이 오른쪽 값이 된다. */
const STAGES = [
  { key: 'research', label: '리서치', doc: '08 원작 조사', story: 'overview-heptapod-b-08-domain-knowledge-research--default' },
  { key: 'rule', label: '규칙', doc: 'docs 03 4절 · 10 · MODEL.md', story: 'overview-heptapod-b-03-visual-direction--docs' },
  { key: 'data', label: '데이터', doc: 'src/data · docs 18', story: 'overview-heptapod-b-05-logogram-data--default' },
  { key: 'visual', label: '비주얼 디렉션', doc: 'docs 03 3절 · default.js', story: 'style-colors--palette' },
  { key: 'pipeline', label: '프롬프트 · 파이프라인', doc: 'docs 05 · src/utils/heptapod', story: 'overview-heptapod-b-09-encoder-pipeline--default' },
  { key: 'screen', label: '화면', doc: 'src/components', story: 'page-response-archive-heptapodencoderpage--default' },
];

/**
 * 의사결정 흐름 격자의 행. 스레드 하나가 결정 하나의 전파 경로다.
 * 노드는 짧은 라벨만 두고 근거 절은 ref 에 둔다. null 은 그 단계에 결정이 없다는 뜻.
 */
const FLOW_THREADS = [
  {
    key: 'form', name: '문자 형태', stripe: PAL.primary.main,
    nodes: [
      { label: '로고그램 원화의 번진 원, 여러 가닥, 비산점', ref: 'docs 03 4.1절 REF-01·02·04' },
      { label: `조형 F1~F${ COUNTS.formRules }, 질감 T1~T${ COUNTS.textureRules } 를 R 단위 범위로`, ref: 'docs 03 4절' },
      { label: '저작 표식 이미지와 모델 JSON 직렬화 계약', ref: 'lib/glyphImages authoredManifest · contract' },
      { label: '잉크색과 챔버 안개 단계', ref: `${ TOKENS.ink.path } ${ TOKENS.ink.value } · ${ TOKENS.fog.value }` },
      { label: 'buildModel 이 F·T 범위를 파라미터로 고정', ref: 'buildModel.js · logogramParticles.js' },
      { label: '렌더러 3종이 같은 모델 계약만 읽는다', ref: 'MODEL.md 머리말' },
    ],
  },
  {
    key: 'name', name: '이름 인코딩', stripe: PAL.primary.dark,
    nodes: [
      { label: '소리와 형태의 대응표가 없어 음역은 불가', ref: 'docs 01 2절' },
      { label: 'branchCount = clamp(NFD 자모 수, 3, 9)', ref: 'MODEL.md meta · docs 10 [S1/S4]' },
      { label: '지원 문자 범위와 가역 코덱 사전', ref: 'docs 10 1.3절 · reversibleCodec.js' },
      { label: '계측 리드아웃은 모노 토큰으로', ref: `${ TOKENS.mono.path } ${ TOKENS.mono.value } · docs 03 3.2절` },
      { label: 'encode 시드에서 buildModel 12슬롯 모델로', ref: 'encode.js · buildModel.js' },
      { label: '이름 입력에서 표식까지 한 화면', ref: 'HeptapodEncoderPage.jsx' },
    ],
  },
  {
    key: 'chamber', name: '챔버 연출', stripe: PAL.secondary.light,
    nodes: [
      { label: '안개 막, 어두운 수직 결, 저채도 35mm 질감', ref: 'docs 03 4.1절 REF-03·05~07' },
      { label: '연속성 락: FORMAT·LOOK 고정, 슬롯 4개만 교체', ref: 'docs 05 2.0절 · 3절' },
      { label: `비트 ${ COUNTS.beats }마디 셀 가중치, 영상 ${ COUNTS.duration }초`, ref: 'heptapodHeroStory.js · heptapodScrubTimeline.js' },
      { label: '챔버 블랙 배경과 상시 느린 안개 전진', ref: `${ TOKENS.chamber.path } ${ TOKENS.chamber.value } · docs 03 3.3절` },
      { label: `샷 슬롯 4종으로 활성 ${ SHOT_SPAN }샷 생성`, ref: 'docs 05 7절 · 10절' },
      { label: '스크럽 영상이 챔버 안개로 매치컷', ref: 'VideoScrubbing.jsx · LogogramChamber.jsx' },
    ],
  },
  {
    key: 'archive', name: '응답과 아카이브', stripe: PAL.text.secondary,
    nodes: [
      { label: '그들이 먼저 건넨 말, 막 앞에서의 응답', ref: 'docs 02 1.1절 · docs 06 1절' },
      { label: '형태에서 읽은 것만 말한다: 도래·수용·상호성', ref: 'docs 18 · docs 23 4절' },
      { label: `의미 ${ COUNTS.meanings }종, 유형 ${ COUNTS.archetypes }개 카탈로그`, ref: 'heptapodMeaningCatalog.js · heptapodArchetypeCatalog.js' },
      { label: '의미 칩만 알약형, 나머지 모서리는 각지게', ref: `${ TOKENS.radius.path } ${ TOKENS.radius.value } · docs 03 3.3절` },
      { label: 'classifyGlyphMorphology 에서 의미 판독으로', ref: 'interpretGlyphMeaning.js' },
      { label: '공개 아카이브 피드와 공명 지도', ref: 'ArchiveMeaningExplorer · ResonanceMap' },
    ],
  },
];

/**
 * 히어로 프롬프트 템플릿 블록.
 * 05 6절 마스터 프롬프트의 다섯 덩어리는 샷이 바뀌어도 그대로고, 7절 슬롯 4개만 교체된다.
 */
const HERO_FIXED_LABELS = {
  Background: '배경: 매우 높은 매트 블랙 내부와 광막',
  Subject: '인물·리프트·장비의 연속성 고정',
  Details: '35mm 아날로그 질감, 저대비, 스케일 관계',
  'Use case': '용도: 인코더 챔버로 매치컷되는 히어로 스틸',
  Constraints: '금지 목록: 영화 프레임 복제, 오렌지 의상, 램프·통로',
};

const HERO_BLOCKS = [
  ...extractLabeledBlock(docShot, '## 6. Master Prompt Template').map((item) => ({
    label: HERO_FIXED_LABELS[item.key] || item.key,
    from: `docs 05 6절 ${ item.key }`,
    line: item.text,
  })),
  ...extractLabeledBlock(docShot, '## 7. Shot Variable Slots').map((item) => ({
    label: `${ item.key } 선택지 ${ item.text.split('|').length }개`,
    slot: `{${ item.key }}`,
    from: 'docs 05 7절',
    line: item.text,
  })),
];

/**
 * 이름 인코더 템플릿 블록.
 * 라벨은 MODEL.md 스키마 주석과 docs 10 원문 줄을 그대로 쓴다.
 * slot 이 있는 블록은 이름마다 값이 바뀌고, 없는 블록은 모든 이름에서 같은 계약이다.
 */
const ENCODER_BLOCKS = [
  { key: 'name', slot: 'meta.name' },
  { key: 'hash', slot: 'meta.hash' },
  { key: 'nfdCount', slot: 'meta.nfdCount' },
  { key: 'branchCount', slot: 'meta.branchCount' },
  { key: 'radius' },
  { key: 'slots' },
  { key: 'active', slot: 'slots[].active' },
  { key: 'jamo', slot: 'branches[].jamo' },
  { key: 'type', slot: 'branches[].type' },
  { key: 'direction' },
  { key: 'clusterCount', slot: 'meta.clusterCount' },
  { key: 'splatter' },
  { key: 'questionHook', slot: 'questionHook' },
]
  .map((item) => {
    const field = modelField(item.key);
    return field.line ? { ...item, label: field.comment, from: 'MODEL.md 1절', line: field.line } : null;
  })
  .filter(Boolean)
  .concat([
    {
      label: cleanLabel(findLine(docEncoderSpec, /^- 본체\(body\)에서/).replace(/^-\s*/, '')),
      from: 'docs 10 2.5절',
      line: findLine(docEncoderSpec, /^- 본체\(body\)에서/),
    },
    {
      label: cleanLabel((findLine(docModel, /^\| 결정론 \|/).split('|')[2] || '')),
      from: 'MODEL.md 0절',
      line: findLine(docModel, /^\| 결정론 \|/),
    },
  ]);

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
    source: '위 격자의 규칙 열과 템플릿 구성 (docs 05 · 07 · 03 4절 · 10 에서 파생)',
    status: '파생',
    note: '저장소에 전문가 여부를 묻는 자기 평가 문장은 없다. 슬라이드의 서사다',
    story: [APPENDIX_DOCS.hero, APPENDIX_DOCS.scrubSound],
  },
  {
    id: 'E6',
    item: '학습 자료가 AI 입력으로 들어간 흔적',
    source: 'CLAUDE.md · .claude/rules 4종 · .claude/skills 8종 · .claude/agents 1종',
    status: '있음',
    note: '전부 범용 규칙이다. 헵타포드 도메인 전용 rule 이나 skill 은 없고 도메인 입력은 docs 와 MODEL.md 가 맡는다',
  },
];

/** 웨비나 슬라이드(cases.js, content.js)에서 옮긴 컨셉. 값은 슬라이드 SSOT 를 그대로 쓴다. */
const CONCEPT = {
  experiment: 'Extreme domain learning',
  subtitle: '도메인 영역의 고강도 학습을 통한 재현',
  desc: '고도화된 세계관과 도메인을 리버스 엔지니어링해서 시각화',
  approach: '재료 먼저',
  frame: { name: '분해 가능한 단위', oneLiner: '씬으로 쪼개고 화면에 찍히는 것만 적습니다' },
  metaLearning: '내가 영화 특수효과 전문가인가? 아닙니다.',
};

/** 저장소에 없어서 이 페이지가 보여 주지 못하는 것 */
const GAP_ROWS = [
  {
    item: '레퍼런스 원본 이미지',
    detail: 'docs 03 4.1절이 가리키는 reference/langauge/ 폴더가 저장소에 없다. REF 표의 참고 포인트와 채택 결과만 남았다',
  },
  {
    item: '영화 장면 캡처',
    detail: '08 페이지가 저장소 밖 개인 파일이라고 적었다. 이 페이지도 캡처를 싣지 않고 관찰 결과만 격자에 쓴다',
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
  { id: 'A2', label: '로고그램 조형을 R 단위 정량표로', basis: `격자 문자 형태 스레드: F1~F${COUNTS.formRules} 규칙 열` },
  { id: 'A3', label: '자모 유닛 수가 가지와 클러스터 수', basis: '인코더 템플릿: branchCount 블록' },
  { id: 'A6', label: '영화 컷은 물리와 스케일만 참조', basis: '격자 챔버 연출 스레드: 연속성 락 규칙 열' },
  { id: 'A7', label: `히어로를 ${COUNTS.shots}샷 씬 단위로 확정`, basis: '히어로 프롬프트 템플릿: SHOT 슬롯 선택지' },
  { id: 'A8', label: '스크롤이 영상 시간을 스크럽', basis: `격자 챔버 연출 스레드: 트랙 ${COUNTS.cells}셀 데이터 열` },
  { id: 'A10', label: '형태에서 이름을 되돌리는 가역 코덱', basis: '격자 이름 인코딩 스레드: 가역 코덱 데이터 열' },
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
 * 격자 셀 하나. 결정 라벨과 근거를 짧게 보여 준다.
 *
 * Props:
 * @param {object} node - { label, ref } 또는 null. null 이면 그 단계에 결정이 없다 [Required]
 * @param {string} stripe - 스레드 색 [Required]
 *
 * Example usage:
 * <FlowCell node={ FLOW_THREADS[0].nodes[0] } stripe={ FLOW_THREADS[0].stripe } />
 */
function FlowCell({ node, stripe }) {
  if (!node) {
    return <Box sx={ { minHeight: 64, border: 1, borderStyle: 'dashed', borderColor: 'divider', opacity: 0.5 } } />;
  }
  return (
    <Box sx={ { minHeight: 64, borderLeft: 4, borderColor: stripe, backgroundColor: 'action.hover', px: 1, py: 0.75 } }>
      <Typography variant="caption" component="div" sx={ { fontWeight: 600, lineHeight: 1.35 } }>{ node.label }</Typography>
      <Typography variant="caption" component="div" color="text.secondary" sx={ { fontFamily: 'monospace', fontSize: 10, lineHeight: 1.4 } }>
        { node.ref }
      </Typography>
    </Box>
  );
}

/**
 * 템플릿 블록 하나. 슬롯이 있으면 채운 색, 없으면 외곽선(고정부).
 *
 * Props:
 * @param {object} block - { label, slot?, from, line } [Required]
 *
 * Example usage:
 * <TemplateBlock block={ HERO_BLOCKS[0] } />
 */
function TemplateBlock({ block }) {
  const isSlot = Boolean(block.slot);
  return (
    <Box
      title={ block.line }
      sx={ {
        px: 1, py: 0.5, mb: 0.5,
        border: 1,
        borderColor: isSlot ? 'secondary.main' : 'divider',
        backgroundColor: isSlot ? 'secondary.main' : 'transparent',
        color: isSlot ? 'secondary.contrastText' : 'text.primary',
      } }
    >
      <Stack direction="row" spacing={ 1 } alignItems="baseline" justifyContent="space-between">
        <Typography variant="caption" sx={ { fontWeight: isSlot ? 700 : 500, lineHeight: 1.4 } }>
          { block.label }
          { isSlot && (
            <Box component="span" sx={ { fontFamily: 'monospace', ml: 0.5 } }>{ block.slot }</Box>
          ) }
        </Typography>
        <Typography variant="caption" sx={ { fontSize: 10, opacity: 0.75, whiteSpace: 'nowrap' } }>
          { block.from }
        </Typography>
      </Stack>
    </Box>
  );
}

/**
 * 템플릿 한 벌: 입력 → 블록 스택 → 출력.
 *
 * Props:
 * @param {string} title - 템플릿 이름 [Required]
 * @param {string} repeat - 반복 횟수 설명 [Required]
 * @param {Array} inputs - 왼쪽 입력 문자열 목록 [Required]
 * @param {Array} blocks - TemplateBlock 에 넘길 블록 목록 [Required]
 * @param {string} outputSrc - 오른쪽 결과 이미지 경로 [Optional, 기본값: '']
 * @param {string} outputLabel - 결과 설명 [Required]
 * @param {Array} outputLinks - 결과를 보는 스토리 링크 목록 [Optional, 기본값: []]
 *
 * Example usage:
 * <TemplateStack title="히어로 시네마틱 프롬프트" repeat="× 10 샷" inputs={ [] } blocks={ HERO_BLOCKS } outputLabel="히어로 스틸" />
 */
function TemplateStack({ title, repeat, inputs, blocks, outputSrc = '', outputLabel, outputLinks = [] }) {
  return (
    <Grid container spacing={ 2 } alignItems="stretch">
      <Grid size={ { xs: 12, md: 3 } }>
        <Typography variant="overline" color="text.secondary">입력</Typography>
        { inputs.map((text) => (
          <Typography key={ text } variant="caption" component="div" sx={ { fontFamily: 'monospace', fontSize: 11, py: 0.25 } }>
            { text }
          </Typography>
        )) }
      </Grid>
      <Grid size={ { xs: 12, md: 6 } }>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="overline" color="text.secondary">{ title }</Typography>
          <Typography variant="caption" color="text.secondary">{ repeat }</Typography>
        </Stack>
        { blocks.map((block) => <TemplateBlock key={ `${ block.from }-${ block.label }` } block={ block } />) }
      </Grid>
      <Grid size={ { xs: 12, md: 3 } }>
        <Typography variant="overline" color="text.secondary">출력</Typography>
        { outputSrc && (
          <Box
            component="img"
            src={ outputSrc }
            alt={ outputLabel }
            sx={ { width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', backgroundColor: 'background.default', display: 'block', mb: 0.5 } }
          />
        ) }
        <Typography variant="caption" color="text.secondary" component="div">{ outputLabel }</Typography>
        <Stack spacing={ 0.25 } sx={ { mt: 0.5 } }>
          { outputLinks.map((link) => (
            <Typography key={ link.id } variant="caption" component="div">
              <StoryLink id={ link.id }>{ link.label }</StoryLink>
            </Typography>
          )) }
        </Stack>
      </Grid>
    </Grid>
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
 * <DocTable columns={ EVIDENCE_COLUMNS } rows={ EVIDENCE_ROWS } />
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
            <TableRow key={ row.id || row.item || index } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
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

const EVIDENCE_COLUMNS = [
  { key: 'id', label: 'id', width: 50, mono: true },
  { key: 'item', label: '항목', width: 190, bold: true },
  { key: 'source', label: '저장소 근거', mono: true },
  { key: 'status', label: '상태', width: 70 },
  { key: 'note', label: '비고' },
  { key: 'story', label: '원문', width: 150 },
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
  if (column.key === 'story') {
    if (Array.isArray(row.story)) {
      return (
        <Stack spacing={ 0.5 }>
          { row.story.map((story) => (
            <StoryLink key={ story.id } id={ story.id }>{ story.label }</StoryLink>
          )) }
        </Stack>
      );
    }
    if (row.story) return <StoryLink id={ row.story.id }>{ row.story.label }</StoryLink>;
    return <Box component="span" sx={ { color: 'text.disabled' } }>없음</Box>;
  }
  if (column.key === 'status') {
    return <Chip size="small" label={ row.status } color={ STATUS_COLOR[row.status] } variant="outlined" />;
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
        note="실험 Extreme domain learning, 갈래 재료 먼저. 의사결정 흐름과 반복 템플릿의 구성"
        brandName="Design System"
        systemName="Heptapod B"
        version="1.0"
      />
      <PageContainer>
        <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
          Concept &amp; Flow
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>
          웨비나가 이 예제에 붙인 컨셉이 저장소에서 어디로 확인되는지 도식 두 장으로 모았다. 원작 조사의 상세는 08, 인코더 중간 산출물은 09 가 맡는다.
        </Typography>
        <Stack direction="row" spacing={ 2 } sx={ { mb: 4 } } flexWrap="wrap" useFlexGap>
          <Typography variant="body2">
            <StoryLink id="overview-heptapod-b-08-domain-knowledge-research--default">
              08 Domain Knowledge &amp; Research
            </StoryLink>
          </Typography>
          <Typography variant="body2">
            <StoryLink id="overview-heptapod-b-09-encoder-pipeline--default">
              09 Encoder Pipeline
            </StoryLink>
          </Typography>
          { PLANNING_DOCS.map((doc) => (
            <Typography key={ doc.id } variant="body2">
              <StoryLink id={ doc.id }>{ doc.label }</StoryLink>
            </Typography>
          )) }
        </Stack>

        <SectionTitle
          title="웨비나 컨셉"
          description="슬라이드 데이터(cases.js, content.js)에 적힌 값을 그대로 옮겼다. 아래 도식이 이 값의 저장소 근거다."
        />
        <Box sx={ { mb: 4, p: 2.5, border: '1px solid', borderColor: 'divider', backgroundColor: 'action.hover' } }>
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
          <Typography variant="body2" sx={ { mt: 1.5 } }>
            영상 프롬프트 원문:
            {' '}
            <StoryLink id={ APPENDIX_DOCS.hero.id }>{ APPENDIX_DOCS.hero.label }</StoryLink>
            {' · '}
            <StoryLink id={ APPENDIX_DOCS.storyline.id }>{ APPENDIX_DOCS.storyline.label }</StoryLink>
            {' · '}
            <StoryLink id={ APPENDIX_DOCS.scrubSound.id }>{ APPENDIX_DOCS.scrubSound.label }</StoryLink>
          </Typography>
        </Box>

        <SectionTitle
          title="의사결정 흐름"
          description="왼쪽 관찰이 오른쪽 값이 된다. 스레드 하나가 결정 하나의 전파 경로다."
        />
        <Box sx={ { overflowX: 'auto', mb: 1 } }>
          <Box sx={ { display: 'grid', gridTemplateColumns: '92px repeat(6, minmax(170px, 1fr))', columnGap: 1, rowGap: 1, minWidth: 1180 } }>
            <Box />
            { STAGES.map((stage) => (
              <Box key={ stage.key } sx={ { borderBottom: 2, borderColor: 'primary.main', pb: 0.5 } }>
                <Typography variant="subtitle2">
                  <StoryLink id={ stage.story }>{ stage.label }</StoryLink>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={ { fontFamily: 'monospace', fontSize: 10 } }>{ stage.doc }</Typography>
              </Box>
            )) }
            { FLOW_THREADS.map((thread) => (
              <React.Fragment key={ thread.key }>
                <Box sx={ { display: 'flex', alignItems: 'center' } }>
                  <Typography variant="subtitle2" sx={ { color: thread.stripe } }>
                    { thread.name }
                  </Typography>
                </Box>
                { thread.nodes.map((node, index) => (
                  <FlowCell key={ `${ thread.key }-${ STAGES[index].key }` } node={ node } stripe={ thread.stripe } />
                )) }
              </React.Fragment>
            )) }
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" component="div" sx={ { mb: 4 } }>
          열 제목은 그 단계를 보는 스토리로 이어진다. 점선 칸은 그 단계에 결정이 없다는 뜻이고, 토큰 값은 theme 객체에서 읽는다.
        </Typography>

        <SectionTitle
          title="템플릿 구성"
          description="반복해서 쓰는 템플릿 두 벌이다. 외곽선 블록은 모든 반복에서 같은 고정부, 채운 블록은 값이 바뀌는 슬롯이다."
        />
        <Stack spacing={ 4 } sx={ { mb: 2 } }>
          <TemplateStack
            title="히어로 시네마틱 프롬프트 (docs 05)"
            repeat={ `× ${ SHOT_SPAN } 샷 (06 Shot 02→11)` }
            inputs={ [
              `06 2절 타임라인 구간 ${ COUNTS.timelineRows }개`,
              '05 2.2절 샷별 확정 설명',
              '05 7절 슬롯 선택지 4종',
              '05 2.0절 연속성 락',
            ] }
            blocks={ HERO_BLOCKS }
            outputSrc={ HERO_POSTER_SRC }
            outputLabel={ `히어로 스크럽 영상 ${ COUNTS.duration }초의 포스터 프레임. 05 10절 출력 경로 ${ COUNTS.outputTargets }개` }
            outputLinks={ [
              { label: 'HeptapodHeroIntro', id: 'template-heptapodherointro--default' },
              { label: 'VideoScrubbing', id: 'custom-component-3-hero-scrub-videoscrubbing--default' },
            ] }
          />
          <TemplateStack
            title="이름 인코더 (MODEL.md · docs 10)"
            repeat="× 입력 이름마다 1벌"
            inputs={ [
              '이름 문자열',
              cleanLabel(findLine(docEncoderSpec, /^최대 grapheme 수:/)),
              'NFD 정규화 자모 유닛 (encode.js)',
              cleanLabel(findLine(docEncoderSpec, /^- `\?` \(U\+003F\)/).replace(/^-\s*/, '')),
            ] }
            blocks={ ENCODER_BLOCKS }
            outputSrc="/heptapod-b-encoder/hero-scenes/s07-logogram-response-plate/ui-capture.png"
            outputLabel="로고그램 응답 화면. 파일은 05 10절 출력 경로에 있다"
            outputLinks={ [
              { label: 'LogogramRendererSvg', id: 'custom-component-2-glyph-renderer-logogramrenderersvg--default' },
              { label: 'LogogramRendererCanvas', id: 'custom-component-2-glyph-renderer-logogramrenderercanvas--default' },
              { label: 'LogogramRendererWebgl', id: 'custom-component-2-glyph-renderer-logogramrendererwebgl--default' },
            ] }
          />
        </Stack>
        <Stack direction="row" spacing={ 2 } sx={ { mb: 1 } } flexWrap="wrap" useFlexGap>
          <Chip size="small" variant="outlined" label="고정 블록: 반복해도 같은 자리" />
          <Chip size="small" color="secondary" label="슬롯: 샷이나 이름마다 값이 바뀜" />
        </Stack>
        <Typography variant="caption" color="text.secondary" component="div" sx={ { mb: 4 } }>
          블록 라벨과 슬롯 개수는 05 문서 원문과 MODEL.md 스키마 주석에서 뽑았다. 블록에 마우스를 올리면 원문 줄이 보인다.
        </Typography>

        <SectionTitle
          title="컨셉 증거"
          description="실험 C-7 이 요구하는 항목을 저장소 파일로 확인한 결과다. 근거를 댈 수 없으면 없음으로 적는다."
        />
        <DocTable columns={ EVIDENCE_COLUMNS } rows={ EVIDENCE_ROWS } renderCell={ renderCell } />

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
          이 페이지의 도식과 표는 저장소의 문서, 데이터, 스크립트에서 파생했다. 저장소 밖 자료는 쓰지 않았다.
        </Typography>
      </PageContainer>
    </>
  ),
};
