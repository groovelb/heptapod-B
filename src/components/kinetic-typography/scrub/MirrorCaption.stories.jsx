import { CaptionPreview } from '../../../stories/scrub/CaptionPreview';
import { captionArgTypes, captionArgs } from '../../../stories/scrub/captionControls';
import MirrorCaption from './MirrorCaption';

export default {
  title: 'Custom Component/3. Hero Scrub/MirrorCaption',
  component: MirrorCaption,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: '거울 변주. 본문의 줄바꿈을 기준으로 위아래가 대칭으로 맞물린다 스크롤이 움직이는 비트 로컬 진행도를 컨트롤로 대신 넣는다.' } },
  },
  argTypes: {
    ...captionArgTypes,
    f: { control: false, description: '비트 로컬 진행도 MotionValue' },
    beat: { control: false, description: 'HERO_STORY_BEATS 항목' },
  },
  args: { ...captionArgs, beatId: 'B2' },
  render: (args) => <CaptionPreview component={ MirrorCaption } { ...args } />,
};

/** 등장 중간 */
export const Default = {};

/** 등장 직전 */
export const BeforeEnter = { args: { entry: 0.05 } };

/** 퇴장 구간 */
export const Leaving = { args: { entry: 0.95 } };

/** 모션 감소 설정 */
export const Reduced = { args: { reduced: true } };
