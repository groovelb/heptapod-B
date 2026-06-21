import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Placeholder from './Placeholder';

export default {
  title: 'Common/Placeholder',
  component: Placeholder.Box,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: '영역 라벨 텍스트',
    },
    width: {
      control: 'text',
      description: '폭 (px 또는 CSS 값)',
    },
    height: {
      control: { type: 'number', min: 40, max: 600 },
      description: '높이 (px)',
    },
  },
};

/** 기본 Box */
export const Default = {
  args: {
    label: 'Content Area',
    height: 120,
  },
  render: (args) => (
    <Placeholder.Box { ...args } />
  ),
};

/** 모든 서브컴포넌트 한눈에 보기 */
export const AllSubComponents = {
  render: () => (
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 5 } }>
      {/* Box */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Placeholder.Box
        </Typography>
        <Box sx={ { display: 'flex', gap: 2 } }>
          <Placeholder.Box label="Panel A" height={ 100 } sx={ { flex: 1 } } />
          <Placeholder.Box label="Panel B" height={ 100 } sx={ { flex: 1 } } />
          <Placeholder.Box label="Panel C" height={ 100 } sx={ { flex: 1 } } />
        </Box>
      </Box>

      {/* Image */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Placeholder.Image
        </Typography>
        <Box sx={ { display: 'flex', gap: 2, alignItems: 'flex-start' } }>
          <Placeholder.Image ratio="16/9" width={ 240 } />
          <Placeholder.Image ratio="4/3" width={ 180 } />
          <Placeholder.Image ratio="1/1" width={ 120 } />
          <Placeholder.Image ratio="3/4" width={ 120 } />
        </Box>
      </Box>

      {/* Text */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Placeholder.Text
        </Typography>
        <Box sx={ { display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 400 } }>
          <Placeholder.Text variant="heading" />
          <Placeholder.Text variant="body" />
          <Placeholder.Text variant="body" width="80%" />
          <Placeholder.Text variant="caption" />
        </Box>
      </Box>

      {/* Line */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Placeholder.Line
        </Typography>
        <Box sx={ { display: 'flex', flexDirection: 'column', gap: 1, maxWidth: 400 } }>
          <Placeholder.Line length="full" />
          <Placeholder.Line length="long" />
          <Placeholder.Line length="medium" />
          <Placeholder.Line length="short" />
        </Box>
      </Box>

      {/* Paragraph */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Placeholder.Paragraph
        </Typography>
        <Box sx={ { maxWidth: 400 } }>
          <Placeholder.Paragraph lines={ 4 } />
        </Box>
      </Box>

      {/* Card */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Placeholder.Card
        </Typography>
        <Box sx={ { display: 'flex', gap: 2, alignItems: 'flex-start' } }>
          <Placeholder.Card ratio="16/9" lines={ 2 } sx={ { width: 280 } } />
          <Placeholder.Card ratio="4/3" lines={ 3 } sx={ { width: 240 } } />
          <Placeholder.Card ratio="1/1" lines={ 1 } sx={ { width: 200 } } />
        </Box>
      </Box>
    </Box>
  ),
};

/** 레이아웃 데모 시나리오 — Grid + Box 조합 */
export const LayoutExample = {
  render: () => (
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 4 } }>
      <Typography variant="overline" color="text.secondary">
        Grid Layout
      </Typography>
      <Grid container spacing={ 2 }>
        <Grid size={ { xs: 12, md: 8 } }>
          <Placeholder.Box label="Main Content" height={ 300 } />
        </Grid>
        <Grid size={ { xs: 12, md: 4 } }>
          <Box sx={ { display: 'flex', flexDirection: 'column', gap: 2 } }>
            <Placeholder.Box label="Widget A" height={ 140 } />
            <Placeholder.Box label="Widget B" height={ 140 } />
          </Box>
        </Grid>
        <Grid size={ { xs: 6, md: 3 } }>
          <Placeholder.Box label="Card 1" height={ 100 } />
        </Grid>
        <Grid size={ { xs: 6, md: 3 } }>
          <Placeholder.Box label="Card 2" height={ 100 } />
        </Grid>
        <Grid size={ { xs: 6, md: 3 } }>
          <Placeholder.Box label="Card 3" height={ 100 } />
        </Grid>
        <Grid size={ { xs: 6, md: 3 } }>
          <Placeholder.Box label="Card 4" height={ 100 } />
        </Grid>
      </Grid>
    </Box>
  ),
};

/** 카드 데모 시나리오 — Image + Text 조합 */
export const CardExample = {
  render: () => (
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 4 } }>
      <Typography variant="overline" color="text.secondary">
        Card Compositions
      </Typography>
      <Grid container spacing={ 3 }>
        <Grid size={ { xs: 12, sm: 6, md: 4 } }>
          <Placeholder.Card ratio="16/9" lines={ 2 } />
        </Grid>
        <Grid size={ { xs: 12, sm: 6, md: 4 } }>
          <Placeholder.Card ratio="4/3" lines={ 3 } />
        </Grid>
        <Grid size={ { xs: 12, sm: 6, md: 4 } }>
          <Placeholder.Card ratio="1/1" lines={ 1 } />
        </Grid>
      </Grid>

      <Typography variant="overline" color="text.secondary" sx={ { mt: 2 } }>
        Manual Composition
      </Typography>
      <Box sx={ { display: 'flex', gap: 3, maxWidth: 600 } }>
        <Placeholder.Image ratio="1/1" width={ 120 } />
        <Box sx={ { flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, justifyContent: 'center' } }>
          <Placeholder.Text variant="heading" />
          <Placeholder.Paragraph lines={ 2 } />
          <Placeholder.Text variant="caption" />
        </Box>
      </Box>
    </Box>
  ),
};
