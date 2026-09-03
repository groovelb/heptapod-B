/**
 * Heptapod B Encoder — 히어로 인트로 스토리 데이터 (상수)
 *
 * 영상 스크러빙 기반 히어로 인트로의 컨텐츠를 상수화한 모듈.
 * 세계관(헵타포드 B) · 영상 스토리(Shot 02→11, 47s) · 메인 체험(인코더)을 잇는
 * 스크롤당 카피 비트를 정의한다.
 *
 * 카피 정책:
 * - headline: 모던 serif 영문 (HERO_HEADLINE_FONT)
 * - body: 한글 본문
 *
 * 상세 기획: docs/heptapod-b-encoder/06-hero-storyline.md
 * 영상 타임라인 근거: docs/heptapod-b-encoder/02-ux-flow.md 시나리오 0
 */

/**
 * 최종 히어로 영상 소스 (public 기준 절대경로).
 * 스테이지 세그먼트 재생 방식 — 오디오(AAC)가 들어있는 원본을 그대로 재생한다.
 * (예전 스크럽 방식의 무음 all-keyframe본 -scrub-1280-allkey.mp4 은 더 이상 사용 안 함)
 */
export const HERO_VIDEO_SRC =
  '/heptapod-b-encoder/hero-motion/kling-audio-01-final/kling-audio-01-final-hero-v1-source01v2-screenfillv4.mp4';

/** 영상 길이(초) — ffprobe 실측값 */
export const HERO_VIDEO_DURATION = 47.08;

/** sticky 스크롤 컨테이너 높이(vh) — 영상 1s ≈ 12vh 선형 매핑 */
export const HERO_SCROLL_VH = 560;

/** 모바일 축소 컨테이너 높이(vh) — 페이싱 보존용 분기 */
export const HERO_SCROLL_VH_MOBILE = 420;

/** 마스터 타이틀 (B0에서 페이드인) */
export const HERO_MASTER_TITLE = 'HEPTAPOD B';

/** SKIP 컨트롤 라벨 */
export const HERO_SKIP_LABEL = 'SKIP INTRO →';

/**
 * 헤드라인 폰트 스택 — 모던 serif (영문 전용).
 * theme typography.custom.serif 와 동기화. swappable.
 */
export const HERO_HEADLINE_FONT = "'Fraunces', 'Newsreader', Georgia, serif";

/**
 * 카피 비트 목록.
 *
 * @typedef {Object} HeroBeat
 * @property {string} id        - 비트 식별자 (B0~B5)
 * @property {string} shot      - 대응 영상 샷 범위
 * @property {[number, number]} scroll - 스크롤 진행도 노출 구간 [start, end] (0~1)
 * @property {[number, number]} video  - 대응 영상 시간 구간 [start, end] (초)
 * @property {?string} headline - 모던 serif 영문 헤드라인 (null = 무카피)
 * @property {?string} body     - 한글 본문 (null = 무카피)
 * @property {boolean} isEmphasis - 핵심 명제 비트 여부 (타이포 강조)
 * @property {boolean} [onLight] - 밝은(화이트아웃) 배경 위 다크 텍스트 여부 (기본 false)
 */
export const HERO_STORY_BEATS = [
  {
    id: 'B0',
    shot: '02',
    scroll: [0.0, 0.08],
    video: [0, 4],
    headline: 'They Arrived',
    body: '그들은 도착했고, 먼저 말을 건넸다.',
    isEmphasis: false,
  },
  {
    id: 'B1',
    shot: '02→03',
    scroll: [0.08, 0.25],
    video: [4, 12],
    headline: 'A Sentence, All at Once',
    body: '그들의 문장은 한 번에 그려진다. 시작도 끝도 없이, 하나의 원으로.',
    isEmphasis: false,
  },
  {
    id: 'B2',
    shot: '03→07',
    scroll: [0.25, 0.49],
    video: [12, 23],
    headline: 'No Before, No After',
    body: '먼저와 나중이 같은 순간에 존재한다.',
    isEmphasis: false,
  },
  {
    id: 'B3',
    shot: '07→09',
    scroll: [0.49, 0.62],
    video: [23, 29],
    headline: 'Not Translation, but Encoding',
    body: '당신의 이름은 소리로 옮겨지지 않는다. 다만 하나의 사고로 응축된다.',
    isEmphasis: true,
  },
  {
    id: 'B4',
    shot: '09→10',
    scroll: [0.62, 0.75],
    video: [29, 35],
    headline: 'Perspective Inverts',
    body: '벽이 바닥이 되는 곳에서, 관점이 뒤집힌다.',
    isEmphasis: false,
  },
  {
    // 마지막 챕터 — 화이트아웃 확대(11 샷)를 한 큐로. 스크롤 내리면 영상 [35→47]을 한 번에 재생.
    id: 'B5',
    shot: '10→11',
    scroll: [0.75, 1.0],
    video: [35, 47],
    headline: 'Your Turn to Answer',
    body: '그들의 문장이 완성되고 빛이 차오른다. 이제, 당신이 답할 차례입니다.',
    isEmphasis: false,
    onLight: false,
  },
];

/** 카피가 있는 비트만 (렌더 편의) */
export const HERO_COPY_BEATS = HERO_STORY_BEATS.filter(
  (beat) => beat.headline || beat.body,
);
