/**
 * Heptapod B Encoder — 히어로 인트로 스토리 데이터 (상수)
 *
 * 스크롤 스크러빙 히어로 인트로의 컨텐츠를 상수화한 모듈.
 * 세계관(헵타포드 B) · 영상 스토리(Shot 02→11, 47s) · 메인 체험(인코더)을 잇는
 * 비트별 카피와, 비트가 차지하는 스크롤 길이(셀 가중치)를 정의한다.
 *
 * 카피 정책:
 * - headline: Cinzel 영문 (HERO_HEADLINE_FONT)
 * - body: 한글 본문
 *
 * 스크롤 구조 (docs/heptapod-b-encoder/07-scroll-scrub-sound-plan.md):
 * - 트랙 = 타이틀 셀(HERO_TITLE_CELLS) + 비트 셀(각 beat.cells) — 1셀 = 100vh
 * - 타이틀 셀에서는 영상이 첫 프레임에 고정, 비트 셀에서 영상 구간 [video]이 스크럽된다
 * - 트랙 뒤 핸드오프 스페이서(HERO_HANDOFF_VH)에서 고정 캔버스(인코더)가 제자리 fade-in
 * - 파생 타임라인(startNorm/endNorm/cellStart)은 src/data/heptapodScrubTimeline.js 가 계산
 *
 * 상세 기획: docs/heptapod-b-encoder/06-hero-storyline.md (비트·카피), 07 (스크럽·사운드)
 */

/** 스크럽 영상 (scripts/build-hero-scrub.mjs 산출물 — GOP 6, 오디오 포함이나 스크럽은 muted) */
export const HERO_VIDEO_SRC = '/heptapod-b-encoder/hero-scrub/hero-scrub-1920.mp4';
/** 모바일(md 미만) 스크럽 영상 */
export const HERO_VIDEO_SRC_MOBILE = '/heptapod-b-encoder/hero-scrub/hero-scrub-960.mp4';
/** 포스터(첫 프레임) — 영상 준비 전 오버레이 */
export const HERO_POSTER_SRC = '/heptapod-b-encoder/hero-scrub/hero-scrub-poster.jpg';

/** 스크럽 사운드 — 베드 루프 / 비트 클립 디렉토리 (클립 파일명 = beat.id + .mp3) */
export const HERO_AUDIO_BED_SRC = '/heptapod-b-encoder/audio/bed-loop.mp3';
export const HERO_AUDIO_CLIP_BASE = '/heptapod-b-encoder/audio/clips';

/** 영상 길이(초) — ffprobe 실측값 */
export const HERO_VIDEO_DURATION = 47.08;

/**
 * 타이틀 셀 수 (100vh 단위) — 이 거리만큼 영상이 첫 프레임에 고정된다.
 * 0 = 정지 구간 없음: 첫 스크롤부터 영상이 스크럽되고, 타이틀은 그 위에서 흩어진다(타이틀 소실도 스크럽의 일부).
 * (타이틀 박스 자체는 첫 뷰포트 100vh 에 중앙 배치 — 셀 수와 무관)
 */
export const HERO_TITLE_CELLS = 0;

/** 핸드오프 스페이서 높이(vh) — 스크럽 완주 후 인코더 캔버스가 제자리 fade-in 하는 스크롤 거리 */
export const HERO_HANDOFF_VH = 120;

/** 마스터 타이틀 (타이틀 셀) */
export const HERO_MASTER_TITLE = 'HEPTAPOD B';

/** START / SKIP 컨트롤 라벨 */
export const HERO_START_LABEL = '▶ START';
export const HERO_SKIP_LABEL = 'SKIP INTRO →';

/**
 * 헤드라인 폰트 스택 — Cinzel (index.html 에서 로드). 보조 serif 폴백.
 */
export const HERO_HEADLINE_FONT = "'Cinzel', 'Fraunces', Georgia, serif";

/**
 * 카피 비트 목록.
 *
 * @typedef {Object} HeroBeat
 * @property {string} id        - 비트 식별자 (B0~B5). 사운드 클립 파일명과 동일
 * @property {string} shot      - 대응 영상 샷 범위
 * @property {[number, number]} video - 대응 영상 시간 구간 [start, end] (초)
 * @property {number} cells     - 이 비트가 차지하는 스크롤 셀 수 (1 = 100vh). 읽기 비트↑, 액션 비트↓
 * @property {?string} headline - Cinzel 영문 헤드라인 (null = 무카피)
 * @property {?string} body     - 한글 본문 (null = 무카피)
 * @property {boolean} isEmphasis - 핵심 명제 비트 여부 (타이포 강조 + 중앙 배치)
 * @property {boolean} [onLight] - 밝은(화이트아웃) 배경 위 다크 텍스트 여부 (기본 false)
 * @property {'seam'|'ring'|'mirror'|'scramble'|'rotate'|'flipReflow'|'type'} kinetic - 키네틱 변주 (docs 08 §2)
 * @property {'left'|'right'|'center'} placement - 12컬럼 격자 구역
 * @property {number} [captionAt] - 캡션 중심이 화면 anchorY 를 지나는 시점 — 비트 구간 안의 비율 0~1 (기본 0.5 = 중간).
 *   영상 싱크(cells)와 분리된 연출 값: 캡션만 당기거나 늦출 때 이 값만 바꾼다
 * @property {number} [anchorY] - 캡션 중심의 뷰포트 높이 비율 (기본 0.5)
 */
export const HERO_STORY_BEATS = [
  {
    id: 'B0',
    shot: '02',
    video: [0, 4],
    cells: 0.8,
    headline: 'They Arrived',
    body: '그들은 도착했고, 먼저 말을 건넸다.',
    isEmphasis: false,
    kinetic: 'seam',
    placement: 'left',
    captionAt: 0.6, // 타이틀이 흩어지는 동안(첫 0.45vh) 겹치지 않게 살짝 뒤로
    anchorY: 0.52,
  },
  {
    id: 'B1',
    shot: '02→03',
    video: [4, 12],
    cells: 1.25, // 느린 리프트 대기 — 읽기 적합
    headline: 'A Sentence, All at Once',
    body: '그들의 문장은 한 번에 그려진다. 시작도 끝도 없이, 하나의 원으로.',
    isEmphasis: false,
    kinetic: 'ring',
    placement: 'right',
    anchorY: 0.56,
  },
  {
    id: 'B2',
    shot: '03→07',
    video: [12, 23],
    cells: 1.0,
    headline: 'No Before, No After',
    body: '먼저와 나중이\n같은 순간에 존재한다.', // '\n' = 거울 대칭 위/아래 줄
    isEmphasis: false,
    kinetic: 'mirror',
    placement: 'center',
    captionAt: 0.35, // 어둠 진입 직후 — 늦게 뜨던 걸 당김
    anchorY: 0.5,
  },
  {
    id: 'B3',
    shot: '07→09',
    video: [23, 29],
    cells: 1.25, // 억제된 상승 — 명제 비트, 읽기 최적
    headline: 'Not Translation, but Encoding',
    body: '당신의 이름은 소리로 옮겨지지 않는다. 다만 하나의 사고로 응축된다.',
    isEmphasis: true,
    kinetic: 'scramble',
    placement: 'center',
    anchorY: 0.6, // 위쪽 멀리 접촉면(작은 타깃)을 비워 둔다
  },
  {
    id: 'B4',
    shot: '09→10',
    video: [29, 35],
    cells: 0.9, // 중력 전환 — 비주얼 우선
    headline: 'Perspective Inverts',
    body: '벽이 바닥이 되는 곳에서, 관점이 뒤집힌다.',
    isEmphasis: false,
    kinetic: 'flipReflow', // 세로 기둥 → 글자별 90° 뒤집힘 → 문장 자리로 재배치 (rotate = 덩어리 회전 구버전)
    placement: 'center',
    captionAt: 0.2, // 중력 전환이 시작될 때 이미 떠 있어야 한다 — 일찍
    anchorY: 0.52,
  },
  {
    // 마지막 챕터 — 걷기 + 화이트아웃 확대(11 샷)를 한 큐로.
    id: 'B5',
    shot: '10→11',
    video: [35, 47.08],
    cells: 1.2,
    headline: 'Your Turn to Answer',
    body: '그들의 문장이 완성되고 빛이 차오른다.\n이제, 당신이 답할 차례입니다.', // '\n' 뒤 문장이 타자된다
    isEmphasis: false,
    onLight: false,
    kinetic: 'type',
    placement: 'center',
    anchorY: 0.5,
  },
];

/** 카피가 있는 비트만 (렌더 편의) */
export const HERO_COPY_BEATS = HERO_STORY_BEATS.filter(
  (beat) => beat.headline || beat.body,
);
