import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SoundFab from './SoundFab';

/**
 * 토글 상태를 들고 있는 미리보기.
 *
 * Props:
 * @param {boolean} initial - 처음 켜짐 여부 [Required]
 * @param {boolean} isLoading - 로드 중 여부 [Required]
 *
 * Example usage:
 * <Preview initial={ false } isLoading={ false } />
 */
function Preview({ initial, isLoading }) {
  const [isEnabled, setIsEnabled] = useState(initial);
  return (
    <Box id="immersive" sx={ { minHeight: '100vh', position: 'relative', bgcolor: 'background.default', p: 4 } }>
      <Typography variant="body2" color="text.secondary">
        { `현재 상태: ${isLoading ? '로드 중' : isEnabled ? 'SOUND ON' : 'SOUND OFF'}` }
      </Typography>
      <SoundFab isEnabled={ isEnabled } isLoading={ isLoading } onToggle={ () => setIsEnabled((value) => !value) } />
    </Box>
  );
}

export default {
  title: 'Custom Component/3. Hero Scrub/SoundFab',
  component: SoundFab,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '인트로 구간에서만 뜨는 소리 토글이다. 히어로 섹션을 벗어나면 스스로 숨는다. 소리는 이 버튼을 누르는 순간에만 열리고 자동으로 재생하지 않는다. 현재 랜딩은 같은 역할을 HeroAffordance 안에서 처리하고 있어 화면에 마운트되지 않는다.',
      },
    },
  },
  argTypes: {
    initial: { control: 'boolean', description: '처음 켜짐 여부' },
    isLoading: { control: 'boolean', description: '언락과 버퍼 로드 중' },
    isEnabled: { control: false },
    onToggle: { control: false },
    heroSelector: { control: false },
    sx: { control: false },
  },
  args: { initial: false, isLoading: false },
  render: (args) => <Preview { ...args } />,
};

/** 꺼진 상태 */
export const Default = {};

/** 켜진 상태 */
export const Enabled = { args: { initial: true } };

/** 버퍼 로드 중 */
export const Loading = { args: { isLoading: true } };
