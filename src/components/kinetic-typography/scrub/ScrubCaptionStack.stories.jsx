import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { HERO_STORY_BEATS } from '../../../data/heptapodHeroStory';
import { HERO_SCRUB_TIMELINE } from '../../../data/heptapodScrubTimeline';
import { PLACEMENT, headlineSx, bodySx } from './captionStyles';

export default {
  title: 'Section/ScrubCaptionStack',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component: [
          '랜딩 스크럽 트랙의 캡션 구획이다. 비트 6마디가 트랙 좌표에 실배치되어 영상 위를 지나간다.',
          '실제 화면에서는 스크롤 진행도가 각 캡션의 번짐과 자간을 움직이지만, 여기서는 진행도 없이 타이포와 격자 배치만 정지 상태로 보여 준다.',
          '변주 컴포넌트(SeamCaption, RingCaption, MirrorCaption, ScrambleCaption, FlipReflowCaption, TypeCaption)는 같은 타이포 위에서 등장과 퇴장 방식만 달리한다.',
        ].join('\n\n'),
      },
    },
  },
  argTypes: {
    scale: { control: { type: 'number', min: 0.3, max: 1, step: 0.05 }, description: '타이포 축소 배율. 1이면 실제 크기' },
  },
  args: { scale: 0.45 },
};

/** 셀 좌표를 붙인 캡션 한 장 */
function CaptionRow({ beat, clip, scale }) {
  const placement = PLACEMENT[beat.placement] || PLACEMENT.center;
  return (
    <Box
      sx={ {
        borderTop: '1px solid',
        borderColor: 'divider',
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: placement.alignItems,
        textAlign: placement.textAlign,
      } }
    >
      <Typography variant="caption" sx={ { fontFamily: 'monospace', color: 'text.secondary', mb: 1 } }>
        { `${beat.id} · shot ${beat.shot} · ${beat.kinetic} · ${beat.placement} · cells ${beat.cells} · track ${clip.cellStart.toFixed(2)}~${clip.cellEnd.toFixed(2)}` }
      </Typography>
      <Box sx={ { transform: `scale(${scale})`, transformOrigin: placement.textAlign === 'right' ? 'right top' : placement.textAlign === 'center' ? 'top' : 'left top', width: '100%' } }>
        <Box sx={ { ...headlineSx({ emphasis: beat.isEmphasis, onLight: beat.onLight }) } }>
          { beat.headline }
        </Box>
        <Box sx={ { ...bodySx({ emphasis: beat.isEmphasis, onLight: beat.onLight }), whiteSpace: 'pre-line', mt: 2 } }>
          { beat.body }
        </Box>
      </Box>
    </Box>
  );
}

/** 비트 6마디의 캡션 스택 */
export const Default = {
  render: ({ scale }) => (
    <Box sx={ { backgroundColor: 'background.default', px: { xs: 2, md: 6 }, py: 4 } }>
      <Typography variant="body2" color="text.secondary" sx={ { mb: 2 } }>
        { `트랙 ${HERO_SCRUB_TIMELINE.scrubCells}셀(1셀 = 100vh) · 비트 ${HERO_STORY_BEATS.length}마디. 진행도 없이 정지 상태로 그린다.` }
      </Typography>
      <Stack>
        { HERO_STORY_BEATS.map((beat, index) => (
          <CaptionRow key={ beat.id } beat={ beat } clip={ HERO_SCRUB_TIMELINE.clips[index] } scale={ scale } />
        )) }
      </Stack>
    </Box>
  ),
};
