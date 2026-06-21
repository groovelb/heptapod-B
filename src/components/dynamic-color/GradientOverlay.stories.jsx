import { useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import GradientOverlay from './GradientOverlay';

export default {
  title: 'Interactive/15. DynamicColor/GradientOverlay',
  component: GradientOverlay,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    colorLight: {
      control: 'color',
      description: '밝은 영역 hex 색상',
    },
    colorDark: {
      control: 'color',
      description: '어두운 영역 hex 색상',
    },
    isGrain: {
      control: 'boolean',
      description: '필름 그레인 효과 여부',
    },
    grainIntensity: {
      control: { type: 'range', min: 0, max: 0.1, step: 0.005 },
      description: '필름 그레인 강도',
    },
    scrollOutRef: {
      control: false,
      description: 'outro 구간 기준 요소의 React ref',
    },
  },
};

/** 섹션 플레이스홀더 */
const Section = ({ label, height = '100vh', sx = {} }) => (
  <Box
    sx={ {
      height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      zIndex: 2,
      ...sx,
    } }
  >
    <Typography
      variant="h3"
      sx={ {
        fontWeight: 700,
        color: 'common.white',
        mixBlendMode: 'difference',
      } }
    >
      { label }
    </Typography>
  </Box>
);

export const Default = {
  args: {
    isGrain: true,
    grainIntensity: 0.035,
  },
  render: (args) => (
    <Box>
      <GradientOverlay { ...args } />
      <Section label="Hero" />
      <Section label="Section 1" />
      <Section label="Section 2" />
    </Box>
  ),
};

/** outro 스크롤 전환 데모 */
const WithOutroDemo = () => {
  const outroRef = useRef(null);

  return (
    <Box>
      <GradientOverlay scrollOutRef={ outroRef } />
      <Section label="Hero" />
      <Section label="Section 1" />
      <Section label="Section 2" />
      <Box ref={ outroRef }>
        <Section label="Outro" />
      </Box>
    </Box>
  );
};

export const WithOutro = {
  render: () => <WithOutroDemo />,
};

export const CustomColors = {
  render: () => (
    <Box>
      <GradientOverlay colorLight="#fce4ec" colorDark="#880e4f" />
      <Section label="Hero" />
      <Section label="Section 1" />
      <Section label="Section 2" />
    </Box>
  ),
};
