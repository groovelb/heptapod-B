import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import RandomRevealText from './RandomRevealText';

export default {
  title: 'Interactive/11. KineticTypography/RandomRevealText',
  component: RandomRevealText,
  tags: ['autodocs'],
  argTypes: {
    text: {
      control: 'text',
      description: '표시할 텍스트',
    },
    delay: {
      control: { type: 'number', min: 0, max: 2000, step: 100 },
      description: '애니메이션 시작 지연 시간 (ms)',
    },
    stagger: {
      control: { type: 'number', min: 10, max: 200, step: 10 },
      description: '글자 간 reveal 간격 (ms)',
    },
    variant: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body1', 'body2'],
      description: 'MUI Typography variant',
    },
  },
};

export const Default = {
  args: {
    text: 'Design is the silent ambassador of your brand.',
    delay: 300,
    stagger: 80,
    variant: 'h4',
  },
};

/** 리마운트로 애니메이션 반복 재생 */
const ReplayDemo = () => {
  const [key, setKey] = useState(0);

  return (
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 3 } }>
      <Button
        variant="outlined"
        onClick={ () => setKey((k) => k + 1) }
        sx={ { alignSelf: 'flex-start' } }
      >
        Replay
      </Button>
      <RandomRevealText
        key={ key }
        text="Creativity takes courage."
        variant="h3"
        delay={ 200 }
        stagger={ 60 }
      />
    </Box>
  );
};

export const Replay = {
  render: () => <ReplayDemo />,
};

export const Variants = {
  render: () => (
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 6 } }>
      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Headline (h2) — slow reveal
        </Typography>
        <RandomRevealText
          text="LESS IS MORE"
          variant="h2"
          delay={ 500 }
          stagger={ 120 }
          sx={ { fontWeight: 900, letterSpacing: '0.05em' } }
        />
      </Box>

      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Body (body1) — fast reveal
        </Typography>
        <RandomRevealText
          text="The details are not the details. They make the design."
          variant="body1"
          delay={ 200 }
          stagger={ 30 }
        />
      </Box>

      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Caption (body2) — default timing
        </Typography>
        <RandomRevealText
          text="Good design is obvious. Great design is transparent."
          variant="body2"
          delay={ 300 }
          stagger={ 50 }
          sx={ { color: 'text.secondary' } }
        />
      </Box>
    </Box>
  ),
};
