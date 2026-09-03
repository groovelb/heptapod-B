import Box from '@mui/material/Box';
import { motion } from 'framer-motion';
import CaptionFrame from './CaptionFrame';
import SeamCaption from './SeamCaption';
import RingCaption from './RingCaption';
import MirrorCaption from './MirrorCaption';
import ScrambleCaption from './ScrambleCaption';
import RotateCaption from './RotateCaption';
import FlipReflowCaption from './FlipReflowCaption';
import TypeCaption from './TypeCaption';
import { bodySx, headlineSx } from './captionStyles';
import { useTransform } from 'framer-motion';
import { useInkReveal } from './inkMotion';
import InkLetters from './InkLetters';

/** 기본(변형 없음) — kinetic 미지정 비트용: 잉크 등장·퇴장만 */
function StaticCaption({ f, beat, reduced }) {
  const ink = useInkReveal(f, { reduced });
  return (
    <Box component={ motion.div } style={ ink } sx={ { display: 'flex', flexDirection: 'column', alignItems: 'inherit' } }>
      { beat.headline && (
        <Box component="h2" sx={ headlineSx({ emphasis: beat.isEmphasis, onLight: beat.onLight }) }>
          <InkLetters f={ f } text={ beat.headline } reduced={ reduced } />
        </Box>
      ) }
      { beat.body && (
        <Box component="p" sx={ { ...bodySx({ emphasis: beat.isEmphasis, onLight: beat.onLight }), mt: 1.5 } }>
          { beat.body }
        </Box>
      ) }
    </Box>
  );
}

const KINETIC = {
  seam: SeamCaption,
  ring: RingCaption,
  mirror: MirrorCaption,
  scramble: ScrambleCaption,
  rotate: RotateCaption,
  flipReflow: FlipReflowCaption,
  type: TypeCaption,
};

/**
 * ScrubCaption 컴포넌트
 *
 * 비트 하나의 키네틱 캡션 디스패처. beat.kinetic 으로 변주 컴포넌트를 고르고, **캡션 화면 통과 진행도 g** 를 만들어 넘긴다.
 *
 * 안무 시계의 분리: g 는 영상 시계(비트 진행도)가 아니라 "이 캡션이 뷰포트 아래로 들어와(0) 위로 나가기까지(1)" 의
 * 트랙 스크롤 진행도다. 그래서 captionAt 으로 캡션을 비트 안에서 아무 시점에 놓아도 등장은 화면 하단에서,
 * 변형은 중앙 부근에서, 소실은 상단에서 일어난다. 영상·사운드·HUD 는 계속 영상 진행도(progress)를 쓴다.
 * 배치(트랙 좌표)는 CaptionFrame 이, 재질·타이밍은 inkMotion 이 강제하므로 변주 컴포넌트는 "순서·공간 변형"만 정한다.
 *
 * Props:
 * @param {object} beat - HERO_STORY_BEATS 항목 (kinetic / placement / captionAt / anchorY) [Required]
 * @param {object} clip - HERO_SCRUB_TIMELINE.clips 항목 [Required]
 * @param {import('framer-motion').MotionValue<number>} progress - 영상 진행도 (계기 타임코드용) [Required]
 * @param {import('framer-motion').MotionValue<number>} trackProgress - 트랙 스크롤 진행도 0~1 [Required]
 * @param {number} total - 영상 길이(초) [Required]
 * @param {number} scrubCells - 트랙 셀 수 [Required]
 * @param {boolean} reduced - prefers-reduced-motion [Optional]
 *
 * Example usage:
 * <ScrubCaption beat={ beat } clip={ clip } progress={ progress } trackProgress={ trackProgress } total={ 47.08 } scrubCells={ 6.9 } />
 */
function ScrubCaption({ beat, clip, progress, trackProgress, total, scrubCells, reduced = false }) {
  const captionAt = beat.captionAt ?? 0.5;
  const anchorY = beat.anchorY ?? 0.5;
  // 캡션 중심이 anchorY 를 지나는 트랙 좌표(셀). 1 뷰포트 = 1 셀이므로 화면 진입은 (1 − anchorY) 셀 전, 이탈은 anchorY 셀 후.
  const sCenter = clip.cellStart + clip.cells * captionAt;
  const g = useTransform(
    trackProgress,
    [(sCenter - (1 - anchorY)) / scrubCells, (sCenter + anchorY) / scrubCells],
    [0, 1],
  );
  const Variant = KINETIC[beat.kinetic] || StaticCaption;
  if (!beat.headline && !beat.body) return null;
  return (
    <CaptionFrame
      clip={ clip }
      scrubCells={ scrubCells }
      placement={ beat.placement }
      captionAt={ captionAt }
      anchorY={ anchorY }
    >
      <Variant f={ g } progress={ progress } total={ total } beat={ beat } clip={ clip } reduced={ reduced } />
    </CaptionFrame>
  );
}

export default ScrubCaption;
