import { useEffect } from 'react';
import { useMotionValue } from 'framer-motion';
import Box from '@mui/material/Box';
import HeroAffordance from './HeroAffordance';

function Preview({ videoProgress, ...args }) {
  const progress = useMotionValue(videoProgress);
  useEffect(() => { progress.set(videoProgress); }, [progress, videoProgress]);
  return (
    <Box sx={ { minHeight: '100vh', bgcolor: videoProgress >= 0.99 ? 'custom.chamber.fog' : 'custom.chamber.ink' } }>
      <HeroAffordance { ...args } progress={ progress } />
    </Box>
  );
}

export default {
  title: 'Custom Component/9. Overlay & Feedback/HeroAffordance',
  component: HeroAffordance,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: '랜딩 하단에서 현재 상태의 안내 하나만 표시합니다. 스크롤 구간에서는 스크롤 안내를 유지하고, 자동 재생·로딩이 시작되면 해당 안내로 교체합니다.' } } },
  argTypes: {
    state: { control: 'select', options: ['loading', 'scroll', 'playing', 'waiting', 'error', 'handoff'], description: '현재 안내 상태' },
    progress: { control: false, description: '전체 영상 진행도 MotionValue (0–1)' },
    videoProgress: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: '스토리용 영상 진행도' },
    loadProgress: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: '로딩 진행도 (0–1)' },
    isMobile: { control: 'boolean', description: '위로 밀기 안내' },
    reducedMotion: { control: 'boolean', description: '모션 감소 설정' },
    onRetry: { action: 'retry', description: '영상 재시도' },
  },
  args: { state: 'scroll', videoProgress: 0.5, loadProgress: 0.4, isMobile: false, reducedMotion: false },
  render: (args) => <Preview { ...args } />,
};

export const Default = {};
export const Autoplay = { args: { state: 'playing', videoProgress: 0.97 } };
export const Loading = { args: { state: 'loading', videoProgress: 0 } };
export const Retry = { args: { state: 'error' } };
