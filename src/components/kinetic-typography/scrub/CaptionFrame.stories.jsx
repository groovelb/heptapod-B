import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CaptionFrame from './CaptionFrame';
import { HERO_STORY_BEATS } from '../../../data/heptapodHeroStory';
import { HERO_SCRUB_TIMELINE } from '../../../data/heptapodScrubTimeline';
import { headlineSx } from './captionStyles';

/**
 * 격자 배치만 확인하는 미리보기.
 *
 * Props:
 * @param {string} beatId - 비트 id [Required]
 * @param {string} placement - 격자 구역 [Required]
 * @param {number} captionAt - 비트 안의 시점 0~1 [Required]
 * @param {number} anchorY - 뷰포트 높이 비율 [Required]
 *
 * Example usage:
 * <Preview beatId="B0" placement="left" captionAt={ 0.5 } anchorY={ 0.5 } />
 */
function Preview({ beatId, placement, captionAt, anchorY }) {
  const index = Math.max(0, HERO_STORY_BEATS.findIndex((beat) => beat.id === beatId));
  const beat = HERO_STORY_BEATS[index];
  const clip = HERO_SCRUB_TIMELINE.clips[index];
  return (
    <Box sx={ { position: 'relative', minHeight: '260vh', bgcolor: 'custom.chamber.fog' } }>
      <Box sx={ { position: 'fixed', inset: 0, pointerEvents: 'none', borderTop: '1px dashed', borderBottom: '1px dashed', borderColor: 'divider' } } />
      <CaptionFrame
        clip={ clip }
        scrubCells={ HERO_SCRUB_TIMELINE.scrubCells }
        placement={ placement }
        captionAt={ captionAt }
        anchorY={ anchorY }
      >
        <Typography component="div" sx={ { ...headlineSx({}), fontSize: 'clamp(24px, 4vw, 56px)' } }>
          { beat.headline }
        </Typography>
      </CaptionFrame>
    </Box>
  );
}

export default {
  title: 'Custom Component/3. Hero Scrub/CaptionFrame',
  component: CaptionFrame,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '캡션이 놓일 자리를 정하는 층이다. 트랙 셀 좌표에서 이 비트의 자리를 계산하고, 12컬럼 관측 격자의 좌·우·중앙 세 구역 중 하나에 세운다. 글자의 움직임은 여기서 다루지 않는다.',
      },
    },
  },
  argTypes: {
    beatId: { control: 'select', options: HERO_STORY_BEATS.map((beat) => beat.id), description: '비트 선택' },
    placement: { control: 'inline-radio', options: ['left', 'right', 'center'], description: '격자 구역' },
    captionAt: { control: { type: 'range', min: 0, max: 1, step: 0.05 }, description: '비트 안에서 캡션이 화면을 지나는 시점' },
    anchorY: { control: { type: 'range', min: 0, max: 1, step: 0.02 }, description: '캡션 중심의 뷰포트 높이 비율' },
    clip: { control: false },
    scrubCells: { control: false },
    children: { control: false },
    sticky: { control: false },
    style: { control: false },
  },
  args: { beatId: 'B0', placement: 'left', captionAt: 0.5, anchorY: 0.5 },
  render: (args) => <Preview { ...args } />,
};

/** 좌측 구역 */
export const Default = {};

/** 우측 구역 */
export const Right = { args: { beatId: 'B1', placement: 'right' } };

/** 중앙 구역 */
export const Center = { args: { beatId: 'B2', placement: 'center' } };
