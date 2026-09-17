import { CaptionPreview } from '../../../stories/scrub/CaptionPreview';
import { captionArgTypes, captionArgs } from '../../../stories/scrub/captionControls';
import RingCaption from './RingCaption';

export default {
  title: 'Custom Component/3. Hero Scrub/RingCaption',
  component: RingCaption,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: '링 변주. 본문이 표식 링의 왼쪽을 지나며 위로 패럴럭스 이동한다 스크롤이 움직이는 비트 로컬 진행도를 컨트롤로 대신 넣는다.' } },
  },
  argTypes: {
    ...captionArgTypes,
    f: { control: false, description: '비트 로컬 진행도 MotionValue' },
    beat: { control: false, description: 'HERO_STORY_BEATS 항목' },
  },
  args: { ...captionArgs, beatId: 'B1' },
  render: (args) => <CaptionPreview component={ RingCaption } { ...args } />,
};

/** 등장 중간 */
export const Default = {};

/** 등장 직전 */
export const BeforeEnter = { args: { entry: 0.05 } };

/** 퇴장 구간 */
export const Leaving = { args: { entry: 0.95 } };

/** 모션 감소 설정 */
export const Reduced = { args: { reduced: true } };
