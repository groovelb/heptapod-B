import { useEffect } from 'react';
import { useMotionValue } from 'framer-motion';
import Box from '@mui/material/Box';
import TitleDisperse from './TitleDisperse';
import { HERO_MASTER_TITLE } from '../../../data/heptapodHeroStory';

/**
 * 타이틀 소실 미리보기.
 *
 * Props:
 * @param {string} text - 표제 [Required]
 * @param {number} progress - 타이틀 셀 진행도 [Required]
 * @param {boolean} reduced - 모션 감소 [Optional]
 *
 * Example usage:
 * <Preview text="HEPTAPOD B" progress={ 0.3 } />
 */
function Preview({ text, progress, reduced }) {
  const t = useMotionValue(progress);
  useEffect(() => { t.set(progress); }, [progress, t]);
  return (
    <Box sx={ { minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'custom.chamber.fog' } }>
      <TitleDisperse text={ text } t={ t } reduced={ reduced } />
    </Box>
  );
}

export default {
  title: 'Custom Component/3. Hero Scrub/TitleDisperse',
  component: TitleDisperse,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '첫 화면의 표제가 스크럽과 함께 흩어지는 층이다. 타이틀 셀 진행도를 받아 글자마다 다른 속도로 멀어진다. 타이틀이 사라지는 것도 스크럽의 일부다.',
      },
    },
  },
  argTypes: {
    text: { control: 'text', description: '표제 문구' },
    progress: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: '타이틀 셀 진행도' },
    reduced: { control: 'boolean', description: '모션 감소 설정' },
    t: { control: false },
    sx: { control: false },
  },
  args: { text: HERO_MASTER_TITLE, progress: 0, reduced: false },
  render: (args) => <Preview { ...args } />,
};

/** 스크롤 전 */
export const Default = {};

/** 흩어지는 중 */
export const Dispersing = { args: { progress: 0.45 } };

/** 소실 직전 */
export const Gone = { args: { progress: 0.95 } };
