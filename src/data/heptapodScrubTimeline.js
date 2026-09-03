/**
 * Heptapod B Encoder — 히어로 스크럽 타임라인 (heptapodHeroStory 에서 파생)
 *
 * oneir `scrubTimeline.js` 의 clips 구조({ id, start, duration, startNorm, endNorm })에
 * 스크롤 셀 좌표(cells / cellStart / cellEnd)를 더한 것. 소스 오브 트루스는
 * HERO_STORY_BEATS 의 `video` + `cells` 이며 이 모듈은 계산만 한다.
 *
 * - startNorm/endNorm: 영상 진행도(0~1) 구간 — 사운드 엔진·HUD 카운터가 사용
 * - cellStart/cellEnd: 트랙 셀 좌표(1셀 = 100vh) — 캡션 배치·mapProgress 가 사용
 * - scrubCells: 타이틀 셀 + 전체 비트 셀 = 트랙 높이(vh/100)
 *
 * Example usage:
 * import { HERO_SCRUB_TIMELINE, mapTrackToVideo } from '../../data/heptapodScrubTimeline';
 * const videoProgress = mapTrackToVideo(HERO_SCRUB_TIMELINE, trackProgress);
 */
import {
  HERO_STORY_BEATS,
  HERO_TITLE_CELLS,
  HERO_VIDEO_DURATION,
} from './heptapodHeroStory';

/**
 * 비트 목록 → 스크럽 타임라인.
 *
 * @param {Array<object>} beats - HERO_STORY_BEATS 형태 [Optional]
 * @param {number} total - 영상 길이(초) [Optional]
 * @param {number} titleCells - 타이틀 셀 수 [Optional]
 * @returns {{ total: number, titleCells: number, scrubCells: number, clips: Array<object> }}
 */
export function buildScrubTimeline(
  beats = HERO_STORY_BEATS,
  total = HERO_VIDEO_DURATION,
  titleCells = HERO_TITLE_CELLS,
) {
  let cursor = titleCells;
  const clips = beats.map((beat, index) => {
    const [start, endRaw] = beat.video;
    const end = Math.min(endRaw, total);
    const cells = beat.cells ?? 1;
    const clip = {
      id: beat.id,
      index,
      start,
      duration: end - start,
      startNorm: start / total,
      endNorm: end / total,
      cells,
      cellStart: cursor,
      cellEnd: cursor + cells,
    };
    cursor += cells;
    return clip;
  });
  return { total, titleCells, scrubCells: cursor, clips };
}

/**
 * 트랙 진행도(0~1, 트랙 전체 스크롤 대비) → 영상 진행도(0~1).
 * 타이틀 셀은 0(첫 프레임 고정), 각 비트 셀은 해당 영상 구간에 선형 매핑(가중 piecewise-linear).
 *
 * @param {{ scrubCells: number, titleCells: number, clips: Array<object> }} timeline
 * @param {number} p - 트랙 진행도
 * @returns {number} 영상 진행도
 */
export function mapTrackToVideo(timeline, p) {
  const { scrubCells, titleCells, clips } = timeline;
  if (!clips.length) return p;
  const x = Math.min(1, Math.max(0, p)) * scrubCells;
  if (x <= titleCells) return clips[0].startNorm;
  const last = clips[clips.length - 1];
  if (x >= last.cellEnd) return last.endNorm;
  for (let i = 0; i < clips.length; i += 1) {
    const clip = clips[i];
    if (x < clip.cellEnd) {
      const f = (x - clip.cellStart) / clip.cells;
      return clip.startNorm + (clip.endNorm - clip.startNorm) * f;
    }
  }
  return last.endNorm;
}

/**
 * 영상 진행도가 속한 클립 인덱스 (HUD 카운터용). 경계는 다음 클립 귀속, 마지막만 끝점 포함.
 *
 * @param {Array<object>} clips
 * @param {number} p - 영상 진행도
 * @returns {number} 인덱스, 범위 밖이면 -1
 */
export function findClipIndex(clips, p) {
  for (let i = 0; i < clips.length; i += 1) {
    const { startNorm, endNorm } = clips[i];
    const isLast = i === clips.length - 1;
    if (p >= startNorm && (isLast ? p <= endNorm : p < endNorm)) return i;
  }
  return -1;
}

export const HERO_SCRUB_TIMELINE = buildScrubTimeline();

export default HERO_SCRUB_TIMELINE;
