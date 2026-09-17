import { CaptionPreview } from '../../../stories/scrub/CaptionPreview';
import { captionArgTypes, captionArgs } from '../../../stories/scrub/captionControls';
import FlipReflowCaption from './FlipReflowCaption';

export default {
  title: 'Custom Component/3. Hero Scrub/FlipReflowCaption',
  component: FlipReflowCaption,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: '뒤집힘 변주. 세로 기둥이 글자별로 90도 돌아 문장 자리로 재배치된다 스크롤이 움직이는 비트 로컬 진행도를 컨트롤로 대신 넣는다.' } },
  },
  argTypes: {
    ...captionArgTypes,
    f: { control: false, description: '비트 로컬 진행도 MotionValue' },
    beat: { control: false, description: 'HERO_STORY_BEATS 항목' },
  },
  args: { ...captionArgs, beatId: 'B4' },
  render: (args) => <CaptionPreview component={ FlipReflowCaption } { ...args } />,
};

/** 등장 중간 */
export const Default = {};

/** 등장 직전 */
export const BeforeEnter = { args: { entry: 0.05 } };

/** 퇴장 구간 */
export const Leaving = { args: { entry: 0.95 } };

/** 모션 감소 설정 */
export const Reduced = { args: { reduced: true } };
