import Box from '@mui/material/Box';
import Placeholder from '../../common/ui/Placeholder';
import LogogramChamber from './LogogramChamber';

export default {
  title: 'Interactive/14. Motion/LogogramChamber',
  component: LogogramChamber,
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: false,
      description: '챔버 위에 올릴 로고그램 렌더러 (children)',
    },
    ratio: {
      control: 'text',
      description: "무대 비율 (RatioContainer ratio — '1:1' | 'phi' | number 등)",
    },
    maxWidth: {
      control: 'text',
      description: '챔버 최대 너비',
    },
    isActive: {
      control: 'boolean',
      description: '안개 드리프트 동작 여부 (false면 정적 안개)',
    },
  },
  parameters: {
    backgrounds: {
      default: 'chamber-dark',
      values: [{ name: 'chamber-dark', value: '#0c100f' }],
    },
  },
};

/** 기본 — 빈 챔버 (안개만, 렌더러 없음). 다크 배경 위에서 홀로 밝다. */
export const Default = {
  args: {
    ratio: '1:1',
    maxWidth: '480px',
    isActive: true,
  },
  render: (args) => (
    <Box sx={ { p: 6, backgroundColor: 'background.default', display: 'flex', justifyContent: 'center' } }>
      <LogogramChamber { ...args } />
    </Box>
  ),
};

/** 플레이스홀더 콘텐츠 — 렌더러가 마운트될 자리를 FPO 블록으로 표현 */
export const WithContent = {
  args: {
    ratio: '1:1',
    maxWidth: '480px',
    isActive: true,
  },
  render: (args) => (
    <Box sx={ { p: 6, backgroundColor: 'background.default', display: 'flex', justifyContent: 'center' } }>
      <LogogramChamber { ...args }>
        <Placeholder.Box
          label="Logogram Renderer"
          width="62%"
          height="62%"
          sx={ { backgroundColor: 'transparent', borderColor: 'custom.chamber.ink' } }
        />
      </LogogramChamber>
    </Box>
  ),
};

/** 드리프트 ON/OFF 비교 — 좌: 안개 미세 드리프트, 우: 정적 안개 */
export const DriftComparison = {
  render: () => (
    <Box
      sx={ {
        p: 6,
        backgroundColor: 'background.default',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 4,
        alignItems: 'start',
      } }
    >
      <Box>
        <Box sx={ { mb: 1, color: 'text.secondary', fontFamily: 'monospace', fontSize: 12 } }>
          isActive: true (drift)
        </Box>
        <LogogramChamber ratio="1:1" isActive>
          <Placeholder.Box label="DRIFT ON" sx={ { backgroundColor: 'transparent', borderColor: 'custom.chamber.ink' } } />
        </LogogramChamber>
      </Box>
      <Box>
        <Box sx={ { mb: 1, color: 'text.secondary', fontFamily: 'monospace', fontSize: 12 } }>
          isActive: false (static)
        </Box>
        <LogogramChamber ratio="1:1" isActive={ false }>
          <Placeholder.Box label="DRIFT OFF" sx={ { backgroundColor: 'transparent', borderColor: 'custom.chamber.ink' } } />
        </LogogramChamber>
      </Box>
    </Box>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};
