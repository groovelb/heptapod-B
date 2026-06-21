import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Placeholder from '../../common/ui/Placeholder';
import StickyAsideCenterLayout from './StickyAsideCenterLayout';

export default {
  title: 'Component/8. Layout/StickyAsideCenterLayout',
  component: StickyAsideCenterLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    centerSize: {
      control: { type: 'number', min: 4, max: 10, step: 2 },
      description: '중앙 콘텐츠 그리드 크기 (1-12)',
    },
    stickyTop: {
      control: { type: 'number', min: 0, max: 200, step: 8 },
      description: 'aside sticky 위치 (px)',
    },
    spacing: {
      control: { type: 'number', min: 0, max: 8 },
      description: '그리드 간격',
    },
  },
};

/** 섹션 라벨 목록 */
const sectionLabels = [
  'Overview',
  'Getting Started',
  'Components',
  'Patterns',
  'Design Tokens',
  'Accessibility',
];

/** 사이드바 네비게이션 — Placeholder 기반 */
const AsideNav = () => (
  <Box sx={ { borderRight: '1px solid', borderColor: 'divider', pr: 2, py: 2 } }>
    <Placeholder.Text variant="caption" width="60%" sx={ { mb: 2, ml: 1 } } />
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 1 } }>
      { sectionLabels.map((label) => (
        <Placeholder.Box key={ label } label={ label } height={ 32 } sx={ { justifyContent: 'flex-start', px: 1.5 } } />
      )) }
    </Box>
  </Box>
);

/** 단일 섹션 블록 — 카드 그리드 + 텍스트로 충분한 높이 확보 */
const SectionBlock = ({ index }) => (
  <Box sx={ { mb: 6 } }>
    <Typography
      variant="h5"
      sx={ { mb: 3, fontFamily: '"Outfit", sans-serif', fontWeight: 700 } }
    >
      { sectionLabels[index % sectionLabels.length] }
    </Typography>

    <Placeholder.Paragraph lines={ 3 } sx={ { mb: 3 } } />

    <Grid container spacing={ 2 } sx={ { mb: 3 } }>
      { Array.from({ length: 4 }, (_, i) => (
        <Grid key={ i } size={ { xs: 6 } }>
          <Placeholder.Card ratio="4/3" lines={ 2 } />
        </Grid>
      )) }
    </Grid>

    <Placeholder.Paragraph lines={ 4 } sx={ { mb: 3 } } />

    <Placeholder.Media
      index={ index }
      category="abstract"
      size="medium"
      width="100%"
      height={ 240 }
    />

    <Placeholder.Paragraph lines={ 3 } sx={ { mt: 3 } } />
  </Box>
);

/** 메인 콘텐츠 — 6개 섹션으로 충분한 스크롤 거리 확보 */
const ContentSections = () => (
  <Box>
    { Array.from({ length: 6 }, (_, i) => (
      <SectionBlock key={ i } index={ i } />
    )) }
  </Box>
);

export const Default = {
  args: {
    centerSize: 8,
    stickyTop: 24,
    spacing: 2,
  },
  render: (args) => (
    <Box sx={ { p: 3 } }>
      <StickyAsideCenterLayout aside={ <AsideNav /> } { ...args }>
        <ContentSections />
      </StickyAsideCenterLayout>
    </Box>
  ),
};

export const NarrowCenter = {
  render: () => (
    <Box sx={ { p: 3 } }>
      <StickyAsideCenterLayout aside={ <AsideNav /> } centerSize={ 6 } stickyTop={ 24 }>
        <ContentSections />
      </StickyAsideCenterLayout>
    </Box>
  ),
};

export const SectionSeries = {
  render: () => (
    <Box sx={ { p: 3 } }>
      { sectionLabels.map((label, i) => (
        <StickyAsideCenterLayout
          key={ label }
          aside={
            <Box sx={ { borderRight: '1px solid', borderColor: 'divider', pr: 2, py: 2 } }>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={ { display: 'block', mb: 1 } }
              >
                Section { i + 1 }
              </Typography>
              <Typography variant="subtitle2" sx={ { fontWeight: 700, mb: 2 } }>
                { label }
              </Typography>
              <Placeholder.Paragraph lines={ 3 } />
              <Placeholder.Box label="Filter" height={ 28 } sx={ { mt: 2 } } />
              <Placeholder.Box label="Sort" height={ 28 } sx={ { mt: 1 } } />
            </Box>
          }
          centerSize={ 8 }
          stickyTop={ 24 }
          spacing={ 2 }
          sx={ {
            py: 6,
            borderBottom: i < sectionLabels.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
          } }
        >
          <Typography
            variant="h4"
            sx={ { mb: 3, fontFamily: '"Outfit", sans-serif', fontWeight: 700 } }
          >
            { label }
          </Typography>

          <Placeholder.Paragraph lines={ 3 } sx={ { mb: 3 } } />

          <Grid container spacing={ 2 } sx={ { mb: 3 } }>
            { Array.from({ length: 6 }, (_, j) => (
              <Grid key={ j } size={ { xs: 6, md: 4 } }>
                <Placeholder.Card ratio="4/3" lines={ 2 } />
              </Grid>
            )) }
          </Grid>

          <Placeholder.Paragraph lines={ 4 } sx={ { mb: 3 } } />

          <Placeholder.Media
            index={ i }
            category="abstract"
            size="medium"
            width="100%"
            height={ 280 }
          />

          <Placeholder.Paragraph lines={ 5 } sx={ { mt: 3 } } />
        </StickyAsideCenterLayout>
      )) }
    </Box>
  ),
};
