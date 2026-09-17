import { useEffect } from 'react';
import { useMotionValue } from 'framer-motion';
import Box from '@mui/material/Box';
import ScrubCaption from './ScrubCaption';
import { HERO_STORY_BEATS, HERO_VIDEO_DURATION } from '../../../data/heptapodHeroStory';
import { HERO_SCRUB_TIMELINE } from '../../../data/heptapodScrubTimeline';

/**
 * 트랙 진행도 하나로 캡션 한 장을 세우는 미리보기.
 *
 * Props:
 * @param {string} beatId - 비트 id [Required]
 * @param {number} track - 트랙 진행도 0~1 [Required]
 * @param {boolean} reduced - 모션 감소 [Optional]
 *
 * Example usage:
 * <Preview beatId="B0" track={ 0.1 } />
 */
function Preview({ beatId, track, reduced }) {
  const index = Math.max(0, HERO_STORY_BEATS.findIndex((beat) => beat.id === beatId));
  const clip = HERO_SCRUB_TIMELINE.clips[index];
  const trackProgress = useMotionValue(track);
  const progress = useMotionValue(clip.startNorm);
  const exitProgress = useMotionValue(0);

  useEffect(() => {
    trackProgress.set(track);
    progress.set(clip.startNorm + (clip.endNorm - clip.startNorm) * 0.5);
  }, [track, clip, trackProgress, progress]);

  return (
    <Box sx={ { position: 'relative', minHeight: '200vh', bgcolor: 'custom.chamber.fog' } }>
      <ScrubCaption
        beat={ HERO_STORY_BEATS[index] }
        clip={ clip }
        progress={ progress }
        trackProgress={ trackProgress }
        total={ HERO_VIDEO_DURATION }
        scrubCells={ HERO_SCRUB_TIMELINE.scrubCells }
        reduced={ reduced }
        exitProgress={ exitProgress }
      />
    </Box>
  );
}

export default {
  title: 'Custom Component/3. Hero Scrub/ScrubCaption',
  component: ScrubCaption,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '비트 하나의 캡션 진입점이다. 비트의 kinetic 값을 보고 변주 컴포넌트를 고르고, 트랙 좌표에 맞는 자리에 세운다. 실제 화면에서는 스크롤이 트랙 진행도를 움직인다.',
      },
    },
  },
  argTypes: {
    beatId: { control: 'select', options: HERO_STORY_BEATS.map((beat) => beat.id), description: '비트 선택. 변주는 비트가 정한다' },
    track: { control: { type: 'range', min: 0, max: 1, step: 0.005 }, description: '트랙 전체 진행도' },
    reduced: { control: 'boolean', description: '모션 감소 설정' },
    beat: { control: false },
    clip: { control: false },
    progress: { control: false },
    trackProgress: { control: false },
    total: { control: false },
    scrubCells: { control: false },
  },
  args: { beatId: 'B0', track: 0.08, reduced: false },
  render: (args) => <Preview { ...args } />,
};

/** 첫 비트 */
export const Default = {};

/** 명제 비트 */
export const EmphasisBeat = { args: { beatId: 'B3', track: 0.6 } };

/** 마지막 비트 */
export const LastBeat = { args: { beatId: 'B5', track: 0.92 } };
