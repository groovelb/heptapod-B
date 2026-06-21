import Box from '@mui/material/Box';
import Placeholder from '../../common/ui/Placeholder';
import { HorizontalScrollContainer } from './HorizontalScrollContainer';

export default {
  title: 'Interactive/13. ContentTransition/HorizontalScrollContainer',
  component: HorizontalScrollContainer,
  tags: ['autodocs'],
  argTypes: {
    gap: {
      control: 'text',
      description: '슬라이드 간 간격 (CSS 단위)',
    },
    padding: {
      control: 'text',
      description: '좌우 패딩 (CSS 단위)',
    },
    backgroundColor: {
      control: 'color',
      description: '배경색',
    },
    onScrollProgress: {
      action: 'scrollProgress',
      description: '스크롤 진행도 콜백 (0-1)',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    gap: '24px',
    padding: '40px',
  },
  render: (args) => (
    <Box>
      <Placeholder.Box label="Scroll Down" height="50vh" sx={ { backgroundColor: 'grey.50' } } />

      <HorizontalScrollContainer { ...args }>
        { Array.from({ length: 10 }, (_, i) => (
          <HorizontalScrollContainer.Slide key={ i }>
            <Placeholder.Box label={ `Slide ${i + 1}` } width={ 360 } height={ 240 } />
          </HorizontalScrollContainer.Slide>
        )) }
      </HorizontalScrollContainer>

      <Placeholder.Box label="End of Section" height="50vh" sx={ { backgroundColor: 'grey.50' } } />
    </Box>
  ),
};

export const WideSlides = {
  render: () => (
    <Box>
      <Placeholder.Box label="Scroll Down" height="30vh" />

      <HorizontalScrollContainer gap="32px" padding="48px">
        { Array.from({ length: 8 }, (_, i) => (
          <HorizontalScrollContainer.Slide key={ i }>
            <Placeholder.Box label={ `Panel ${i + 1}` } width={ 600 } height={ 320 } />
          </HorizontalScrollContainer.Slide>
        )) }
      </HorizontalScrollContainer>

      <Placeholder.Box label="End of Section" height="30vh" />
    </Box>
  ),
};

export const ManyItems = {
  render: () => (
    <Box>
      <Placeholder.Box label="Scroll Down" height="30vh" />

      <HorizontalScrollContainer gap="16px" padding="32px" backgroundColor="grey.900">
        { Array.from({ length: 15 }, (_, i) => (
          <HorizontalScrollContainer.Slide key={ i }>
            <Placeholder.Box label={ `Item ${i + 1}` } width={ 280 } height={ 180 } />
          </HorizontalScrollContainer.Slide>
        )) }
      </HorizontalScrollContainer>

      <Placeholder.Box label="End of Section" height="30vh" />
    </Box>
  ),
};
