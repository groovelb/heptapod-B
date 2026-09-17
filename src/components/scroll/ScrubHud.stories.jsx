import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ScrubHud from './ScrubHud';

export default {
  title: 'Section/ScrubHud',
  component: ScrubHud,
  tags: ['autodocs'],
  argTypes: {
    align: { control: 'inline-radio', options: ['left', 'right'], description: '좌우 정렬' },
    bottomPx: { control: { type: 'number', min: 0, max: 200 }, description: '뷰포트 하단에서 HUD 상단까지 거리(px)' },
    hasHeroGap: { control: 'boolean', description: '첫 뷰포트에서 숨길지 여부' },
    children: { control: false },
  },
  args: { align: 'right', bottomPx: 88, hasHeroGap: false },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '랜딩 스크럽 트랙의 하단 HUD 구획. 마디 카운터와 소리 토글이 쓰던 sticky 배치(하단 고정, 동적 뷰포트 높이 대응, 첫 뷰포트 제외)를 한 곳에 모은다. 스토리에서는 첫 뷰포트 여백을 끄고 내용만 확인한다.',
      },
    },
  },
};

/** 마디 카운터와 진행바를 넣은 기본 배치 */
export const Default = {
  render: (args) => (
    <Box sx={ { minHeight: '140vh', backgroundColor: 'background.default', px: 2, py: 4 } }>
      <Typography variant="body2" color="text.secondary">
        스크롤하면 HUD가 하단에 머문다.
      </Typography>
      <ScrubHud { ...args }>
        <Typography variant="overline" sx={ { fontFamily: 'monospace' } }>03 / 06</Typography>
        <Box sx={ { width: 120, height: 1, backgroundColor: 'divider', mt: 1 } }>
          <Box sx={ { width: '50%', height: '100%', backgroundColor: 'primary.main' } } />
        </Box>
      </ScrubHud>
    </Box>
  ),
};
