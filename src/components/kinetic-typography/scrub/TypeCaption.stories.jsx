import { useEffect } from 'react';
import { useMotionValue } from 'framer-motion';
import Box from '@mui/material/Box';
import TypeCaption from './TypeCaption';
import { HERO_STORY_BEATS, HERO_VIDEO_DURATION } from '../../../data/heptapodHeroStory';
import { useI18n } from '../../../i18n/useI18n';

function Preview({ entry, exit, reduced }) {
  const { localize } = useI18n();
  const f = useMotionValue(entry);
  const exitProgress = useMotionValue(exit);
  const progress = useMotionValue(0.99);
  useEffect(() => { f.set(entry); exitProgress.set(exit); }, [entry, exit, f, exitProgress]);
  const source = HERO_STORY_BEATS.at(-1);
  const beat = { ...source, headline: localize(source.headline), body: localize(source.body) };
  return (
    <Box sx={ { minHeight: '100vh', display: 'flex', alignItems: 'center', px: { xs: 3, md: 6 }, bgcolor: 'custom.chamber.fog' } }>
      <TypeCaption f={ f } progress={ progress } total={ HERO_VIDEO_DURATION } beat={ beat } reduced={ reduced } exitProgress={ exitProgress } />
    </Box>
  );
}

export default {
  title: 'Custom Component/11. Kinetic Typography/TypeCaption',
  component: TypeCaption,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: '마지막 씬의 기존 blur 등장·타자 효과를 유지합니다. 등장 완료 후 문구를 유지하며 퇴장 진행도에 따라 글자가 랜덤 순서로 흐려지고 사라집니다.' } } },
  argTypes: {
    entry: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: '등장·타자 진행도' },
    exit: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: '랜덤 blur·opacity 퇴장 진행도' },
    reduced: { control: 'boolean', description: '모션 감소 설정' },
    f: { control: false, description: '등장 진행도 MotionValue' },
    progress: { control: false, description: '영상 진행도 MotionValue' },
    total: { control: false, description: '영상 길이(초)' },
    beat: { control: false, description: 'locale을 적용한 마지막 씬 텍스트' },
    exitProgress: { control: false, description: '화면 전환에 연결되는 퇴장 MotionValue' },
  },
  args: { entry: 1, exit: 0, reduced: false },
  render: (args) => <Preview { ...args } />,
};

export const Default = {};
export const FadingOut = { args: { exit: 0.55 } };
export const Gone = { args: { exit: 1 } };
