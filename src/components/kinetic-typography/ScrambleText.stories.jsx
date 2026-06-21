import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ScrambleText from './ScrambleText';

export default {
  title: 'Interactive/11. KineticTypography/ScrambleText',
  component: ScrambleText,
  tags: ['autodocs'],
  argTypes: {
    text: {
      control: 'text',
      description: '표시할 텍스트',
    },
    duration: {
      control: { type: 'number', min: 100, max: 3000, step: 100 },
      description: '스크램블 애니메이션 소요 시간 (ms)',
    },
    isTrigger: {
      control: 'boolean',
      description: '애니메이션 트리거 여부',
    },
    isInitialScramble: {
      control: 'boolean',
      description: '최초 마운트 시 스크램블 효과 여부',
    },
    initialCharset: {
      control: 'text',
      description: '최초 등장 스크램블에 사용할 특수기호 문자 집합',
    },
    charset: {
      control: 'text',
      description: '텍스트 전환 스크램블에 사용할 문자 집합',
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
    text: 'DESIGN SYSTEM',
    duration: 800,
    isTrigger: true,
    isInitialScramble: true,
    variant: 'h3',
  },
};

/** 텍스트 전환 데모 */
const words = ['TYPOGRAPHY', 'LAYOUT', 'MOTION', 'COLOR', 'SPACING'];

const TextSwitchDemo = () => {
  const [index, setIndex] = useState(0);

  return (
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 3 } }>
      <Button
        variant="outlined"
        onClick={ () => setIndex((i) => (i + 1) % words.length) }
        sx={ { alignSelf: 'flex-start' } }
      >
        Next Word
      </Button>
      <ScrambleText
        text={ words[index] }
        variant="h2"
        duration={ 600 }
        sx={ { fontWeight: 900, letterSpacing: '0.08em' } }
      />
    </Box>
  );
};

export const TextSwitch = {
  render: () => <TextSwitchDemo />,
};

/** 최초 등장 스크램블 데모 */
const InitialScrambleDemo = () => {
  const [key, setKey] = useState(0);

  return (
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 4 } }>
      <Button
        variant="outlined"
        onClick={ () => setKey((k) => k + 1) }
        sx={ { alignSelf: 'flex-start' } }
      >
        Replay
      </Button>

      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Default initialCharset (!@#$%^&amp;*...)
        </Typography>
        <ScrambleText
          key={ `default-${key}` }
          text="HELLO WORLD"
          variant="h2"
          isInitialScramble
          sx={ { fontWeight: 900 } }
        />
      </Box>

      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Custom initialCharset (※◆●▲■◇○△□★)
        </Typography>
        <ScrambleText
          key={ `custom-${key}` }
          text="DESIGN SYSTEM"
          variant="h3"
          isInitialScramble
          initialCharset="※◆●▲■◇○△□★"
          duration={ 1200 }
          sx={ { fontWeight: 700 } }
        />
      </Box>

      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Binary initialCharset (01)
        </Typography>
        <ScrambleText
          key={ `binary-${key}` }
          text="KINETIC TYPE"
          variant="h4"
          isInitialScramble
          initialCharset="01"
          duration={ 1000 }
          sx={ { fontFamily: 'monospace' } }
        />
      </Box>
    </Box>
  );
};

export const InitialScramble = {
  render: () => <InitialScrambleDemo />,
};

/** duration · charset 변형 비교 */
const VariantsDemo = () => {
  const [key, setKey] = useState(0);

  return (
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 6 } }>
      <Button
        variant="outlined"
        onClick={ () => setKey((k) => k + 1) }
        sx={ { alignSelf: 'flex-start' } }
      >
        Replay All
      </Button>

      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Fast (400ms)
        </Typography>
        <ScrambleText
          key={ `fast-${key}` }
          text="FAST SCRAMBLE"
          variant="h3"
          duration={ 400 }
          isInitialScramble
          sx={ { fontWeight: 700 } }
        />
      </Box>

      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Slow (1500ms)
        </Typography>
        <ScrambleText
          key={ `slow-${key}` }
          text="SLOW REVEAL"
          variant="h4"
          duration={ 1500 }
          isInitialScramble
          sx={ { color: 'text.secondary' } }
        />
      </Box>

      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Custom Charset (숫자)
        </Typography>
        <ScrambleText
          key={ `num-${key}` }
          text="2025.01.01"
          variant="h4"
          duration={ 800 }
          isInitialScramble
          initialCharset="0123456789"
          charset="0123456789"
          sx={ { fontFamily: 'monospace' } }
        />
      </Box>
    </Box>
  );
};

export const Variants = {
  render: () => <VariantsDemo />,
};
