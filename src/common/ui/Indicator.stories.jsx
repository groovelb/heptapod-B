import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Indicator } from './Indicator';

/**
 * Story 컴포넌트: AllVariants 데모
 */
function AllVariantsDemo() {
  const [current, setCurrent] = useState(1);
  const total = 5;

  const handlePrev = () => setCurrent((p) => (p > 0 ? p - 1 : total - 1));
  const handleNext = () => setCurrent((p) => (p < total - 1 ? p + 1 : 0));

  const variants = ['dot', 'line', 'dash', 'fraction', 'progress'];

  return (
    <Box sx={ { p: 4, minWidth: 400 } }>
      <Stack spacing={ 4 }>
        <Stack direction="row" spacing={ 2 } justifyContent="center">
          <Button variant="outlined" size="small" onClick={ handlePrev }>
            Prev
          </Button>
          <Button variant="outlined" size="small" onClick={ handleNext }>
            Next
          </Button>
        </Stack>

        { variants.map((variant) => (
          <Stack key={ variant } spacing={ 1 } alignItems="center">
            <Typography
              variant="caption"
              sx={ { color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 } }
            >
              { variant }
            </Typography>
            <Box
              sx={ {
                p: 2,
                backgroundColor: variant === 'fraction' || variant === 'progress'
                  ? 'grey.900'
                  : 'grey.100',
                borderRadius: 1,
                minWidth: variant === 'progress' ? 200 : 'auto',
              } }
            >
              <Indicator
                total={ total }
                current={ current }
                variant={ variant }
                activeColor={ variant === 'fraction' || variant === 'progress' ? 'common.white' : 'primary.main' }
                inactiveColor={ variant === 'fraction' || variant === 'progress' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)' }
                onClick={ variant !== 'fraction' && variant !== 'progress' ? setCurrent : undefined }
              />
            </Box>
          </Stack>
        )) }
      </Stack>
    </Box>
  );
}

/**
 * Story 컴포넌트: Vertical 데모
 */
function VerticalDemo() {
  const [current, setCurrent] = useState(1);

  return (
    <Stack direction="row" spacing={ 6 } sx={ { p: 4 } }>
      { ['dot', 'line', 'dash'].map((variant) => (
        <Stack key={ variant } spacing={ 1 } alignItems="center">
          <Typography variant="caption" sx={ { color: 'text.secondary' } }>
            { variant }
          </Typography>
          <Box sx={ { p: 2, backgroundColor: 'grey.100', borderRadius: 1 } }>
            <Indicator
              total={ 5 }
              current={ current }
              variant={ variant }
              direction="vertical"
              activeColor="primary.main"
              inactiveColor="rgba(0,0,0,0.25)"
              onClick={ setCurrent }
            />
          </Box>
        </Stack>
      )) }
    </Stack>
  );
}

/**
 * Story 컴포넌트: DarkTheme 데모
 */
function DarkThemeDemo() {
  const [current, setCurrent] = useState(2);

  return (
    <Box
      sx={ {
        p: 6,
        backgroundColor: 'grey.900',
        borderRadius: 2,
        minWidth: 400,
      } }
    >
      <Stack spacing={ 4 } alignItems="center">
        { ['dot', 'line', 'dash', 'fraction', 'progress'].map((variant) => (
          <Box key={ variant } sx={ { width: variant === 'progress' ? '80%' : 'auto' } }>
            <Indicator
              total={ 5 }
              current={ current }
              variant={ variant }
              activeColor="common.white"
              inactiveColor="rgba(255,255,255,0.35)"
              onClick={ variant !== 'fraction' && variant !== 'progress' ? setCurrent : undefined }
            />
          </Box>
        )) }
      </Stack>
    </Box>
  );
}

/**
 * Story 컴포넌트: Interactive 데모
 */
function InteractiveDemo() {
  const [current, setCurrent] = useState(0);

  return (
    <Box sx={ { p: 4, textAlign: 'center' } }>
      <Typography variant="body2" sx={ { mb: 3, color: 'text.secondary' } }>
        Click on any indicator to navigate
      </Typography>
      <Indicator
        total={ 7 }
        current={ current }
        variant="dash"
        size="lg"
        activeColor="primary.main"
        inactiveColor="rgba(0,0,0,0.2)"
        onClick={ setCurrent }
      />
      <Typography variant="h4" sx={ { mt: 4, fontWeight: 600 } }>
        Slide { current + 1 }
      </Typography>
    </Box>
  );
}

export default {
  title: 'Common/Indicator',
  component: Indicator,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
## Indicator

A visual indicator component for carousels, sliders, and pagination.
Supports multiple visual styles (dot, line, dash, fraction, progress) with smooth animations.

### Features
- Multiple variants: dot, line, dash, fraction, progress
- Horizontal and vertical orientation
- Keyboard navigation support
- Accessible with ARIA attributes
- Customizable colors and sizes
        `,
      },
    },
  },
  argTypes: {
    total: {
      control: { type: 'number', min: 1, max: 20 },
      description: 'Total number of items',
    },
    current: {
      control: { type: 'number', min: 0, max: 19 },
      description: 'Current active index (0-based)',
    },
    variant: {
      control: 'select',
      options: ['dot', 'line', 'dash', 'fraction', 'progress'],
      description: 'Visual style of the indicator',
    },
    direction: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: 'Layout direction',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Size of indicator elements',
    },
    activeColor: {
      control: 'color',
      description: 'Color for active state',
    },
    inactiveColor: {
      control: 'color',
      description: 'Color for inactive state',
    },
    gap: {
      control: { type: 'number', min: 0.5, max: 3, step: 0.5 },
      description: 'Spacing between indicator items',
    },
    hasAnimation: {
      control: 'boolean',
      description: 'Enable/disable animations',
    },
    hasHoverEffect: {
      control: 'boolean',
      description: 'Enable/disable hover effects',
    },
  },
};

/**
 * Default dot style indicator
 */
export const Default = {
  args: {
    total: 5,
    current: 2,
    variant: 'dot',
    direction: 'horizontal',
    size: 'md',
    activeColor: '#1976d2',
    inactiveColor: 'rgba(0, 0, 0, 0.3)',
    hasAnimation: true,
    hasHoverEffect: true,
  },
};

/**
 * Interactive demo with all variants
 */
export const AllVariants = {
  render: () => <AllVariantsDemo />,
};

/**
 * Size comparison
 */
export const Sizes = {
  render: () => {
    const sizes = ['sm', 'md', 'lg'];

    return (
      <Stack spacing={4} alignItems="center" sx={{ p: 4 }}>
        {sizes.map((size) => (
          <Stack key={size} spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {size.toUpperCase()}
            </Typography>
            <Indicator
              total={5}
              current={2}
              variant="dot"
              size={size}
              activeColor="primary.main"
              inactiveColor="rgba(0,0,0,0.25)"
            />
          </Stack>
        ))}
      </Stack>
    );
  },
};

/**
 * Vertical orientation
 */
export const Vertical = {
  render: () => <VerticalDemo />,
};

/**
 * Dark theme usage (for overlays)
 */
export const DarkTheme = {
  render: () => <DarkThemeDemo />,
};

/**
 * Clickable indicator example
 */
export const Interactive = {
  render: () => <InteractiveDemo />,
};
