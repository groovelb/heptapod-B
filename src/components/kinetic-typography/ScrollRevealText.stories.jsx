import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ScrollRevealText from './ScrollRevealText';

export default {
  title: 'Interactive/11. KineticTypography/ScrollRevealText',
  component: ScrollRevealText,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    text: {
      control: 'text',
      description: '표시할 텍스트 (". "으로 문장 분리)',
    },
    activeColor: {
      control: 'text',
      description: '활성화된 글자 색상 (MUI 테마 토큰)',
    },
    inactiveColor: {
      control: 'text',
      description: '비활성 글자 색상 (MUI 테마 토큰)',
    },
    variant: {
      control: 'select',
      options: ['h2', 'h3', 'h4', 'h5', 'h6', 'body1', 'body2'],
      description: 'MUI Typography variant',
    },
  },
};

/** 스크롤 영역 래퍼 */
const ScrollArea = ({ children, height = '250vh' }) => (
  <Box sx={ { minHeight: height } }>
    <Box sx={ { height: '40vh' } } />
    { children }
    <Box sx={ { height: '60vh' } } />
  </Box>
);

const sampleText = 'Design is not just what it looks like and feels like. Design is how it works. The details are not the details. They make the design.';

export const Default = {
  args: {
    text: sampleText,
    activeColor: 'text.primary',
    inactiveColor: 'text.disabled',
    variant: 'h4',
  },
  render: (args) => (
    <ScrollArea>
      <Box sx={ { maxWidth: 800, mx: 'auto', px: 3 } }>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 2, display: 'block' } }>
          Scroll down to reveal text
        </Typography>
        <ScrollRevealText { ...args } />
      </Box>
    </ScrollArea>
  ),
};

export const DarkBackground = {
  render: () => (
    <ScrollArea height="300vh">
      <Box
        sx={ {
          backgroundColor: 'secondary.main',
          py: 10,
          px: 3,
        } }
      >
        <Box sx={ { maxWidth: 800, mx: 'auto' } }>
          <ScrollRevealText
            text="Less is more. Simplicity is the ultimate sophistication. Good design is as little design as possible."
            activeColor="common.white"
            inactiveColor="grey.700"
            variant="h3"
          />
        </Box>
      </Box>
    </ScrollArea>
  ),
};

export const MultipleBlocks = {
  render: () => (
    <ScrollArea height="400vh">
      <Box sx={ { maxWidth: 800, mx: 'auto', px: 3, display: 'flex', flexDirection: 'column', gap: 12 } }>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={ { mb: 2, display: 'block' } }>
            Section 1
          </Typography>
          <ScrollRevealText
            text="Typography is the craft of endowing human language with a durable visual form."
            variant="h4"
          />
        </Box>

        <Box>
          <Typography variant="overline" color="text.secondary" sx={ { mb: 2, display: 'block' } }>
            Section 2
          </Typography>
          <ScrollRevealText
            text="White space is to be regarded as an active element, not a passive background."
            variant="h5"
            activeColor="primary.main"
          />
        </Box>

        <Box>
          <Typography variant="overline" color="text.secondary" sx={ { mb: 2, display: 'block' } }>
            Section 3
          </Typography>
          <ScrollRevealText
            text="The grid system is an aid, not a guarantee. It permits a number of possible uses and each designer can look for a solution appropriate to his personal style."
            variant="body1"
          />
        </Box>
      </Box>
    </ScrollArea>
  ),
};
