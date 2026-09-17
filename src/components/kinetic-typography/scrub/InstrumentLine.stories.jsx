import { useEffect } from 'react';
import { useMotionValue } from 'framer-motion';
import Box from '@mui/material/Box';
import InstrumentLine from './InstrumentLine';
import { HERO_STORY_BEATS, HERO_VIDEO_DURATION } from '../../../data/heptapodHeroStory';
import { HERO_SCRUB_TIMELINE } from '../../../data/heptapodScrubTimeline';

/**
 * 계기 라인 미리보기.
 *
 * Props:
 * @param {string} beatId - 비트 id [Required]
 * @param {number} entry - 비트 로컬 진행도 [Required]
 * @param {string} mode - 'seed' 또는 'slots' [Required]
 * @param {boolean} reduced - 모션 감소 [Optional]
 * @param {boolean} onLight - 밝은 배경 여부 [Optional]
 *
 * Example usage:
 * <Preview beatId="B0" entry={ 0.5 } mode="seed" />
 */
function Preview({ beatId, entry, mode, reduced, onLight }) {
  const index = Math.max(0, HERO_STORY_BEATS.findIndex((beat) => beat.id === beatId));
  const clip = HERO_SCRUB_TIMELINE.clips[index];
  const f = useMotionValue(entry);
  const progress = useMotionValue(clip.startNorm + (clip.endNorm - clip.startNorm) * entry);
  useEffect(() => {
    f.set(entry);
    progress.set(clip.startNorm + (clip.endNorm - clip.startNorm) * entry);
  }, [entry, clip, f, progress]);
  return (
    <Box sx={ { minHeight: '40vh', display: 'flex', alignItems: 'center', px: { xs: 3, md: 6 }, bgcolor: onLight ? 'custom.chamber.fogHi' : 'custom.chamber.fog' } }>
      <InstrumentLine
        progress={ progress }
        f={ f }
        total={ HERO_VIDEO_DURATION }
        beat={ HERO_STORY_BEATS[index] }
        mode={ mode }
        reduced={ reduced }
        onLight={ onLight }
      />
    </Box>
  );
}

export default {
  title: 'Custom Component/3. Hero Scrub/InstrumentLine',
  component: InstrumentLine,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '캡션 옆에 붙는 계기 표기다. 모노스페이스로 샷 번호와 타임코드, 슬롯 상태를 적어 인트로가 관측 기록처럼 읽히게 한다.',
      },
    },
  },
  argTypes: {
    beatId: { control: 'select', options: HERO_STORY_BEATS.map((beat) => beat.id), description: '비트 선택' },
    entry: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: '비트 로컬 진행도' },
    mode: { control: 'inline-radio', options: ['seed', 'slots'], description: 'seed 는 빈 슬롯, slots 는 진행도에 따라 채운다' },
    reduced: { control: 'boolean', description: '모션 감소 설정' },
    onLight: { control: 'boolean', description: '밝은 배경 위 다크 텍스트' },
    progress: { control: false },
    f: { control: false },
    total: { control: false },
    beat: { control: false },
  },
  args: { beatId: 'B0', entry: 0.5, mode: 'seed', reduced: false, onLight: false },
  render: (args) => <Preview { ...args } />,
};

/** 빈 슬롯 */
export const Default = {};

/** 진행도에 따라 채워지는 슬롯 */
export const Slots = { args: { mode: 'slots', entry: 0.75 } };

/** 밝은 배경 */
export const OnLight = { args: { onLight: true } };
