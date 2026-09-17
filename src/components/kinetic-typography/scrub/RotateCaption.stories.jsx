import { CaptionPreview } from '../../../stories/scrub/CaptionPreview';
import { captionArgTypes, captionArgs } from '../../../stories/scrub/captionControls';
import RotateCaption from './RotateCaption';

export default {
  title: 'Custom Component/3. Hero Scrub/RotateCaption',
  component: RotateCaption,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: '회전 변주. 덩어리째 도는 구버전이며 현재 비트는 FlipReflow 를 쓴다 스크롤이 움직이는 비트 로컬 진행도를 컨트롤로 대신 넣는다.' } },
  },
  argTypes: {
    ...captionArgTypes,
    f: { control: false, description: '비트 로컬 진행도 MotionValue' },
    beat: { control: false, description: 'HERO_STORY_BEATS 항목' },
  },
  args: { ...captionArgs, beatId: 'B4' },
  render: (args) => <CaptionPreview component={ RotateCaption } { ...args } />,
};

/** 등장 중간 */
export const Default = {};

/** 등장 직전 */
export const BeforeEnter = { args: { entry: 0.05 } };

/** 퇴장 구간 */
export const Leaving = { args: { entry: 0.95 } };

/** 모션 감소 설정 */
export const Reduced = { args: { reduced: true } };
