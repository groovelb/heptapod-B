import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { DocumentTitle, PageContainer, SectionTitle } from '../storybookDocumentation';
import { HighlightedTypography, Highlight } from '.';

export default {
  title: 'Component/1. Typography/HighlightedTypography',
  component: HighlightedTypography,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## HighlightedTypography

텍스트 내 특정 단어나 구문을 다양한 스타일로 강조할 수 있는 컴포넌트.

### 용도
- 중요한 단어나 구문 강조
- 밑줄, 배경, 형광펜, 원 효과 적용
- 스크롤 트리거 애니메이션
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['body1', 'body2', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    },
    component: {
      control: { type: 'text' },
    },
    animated: {
      control: { type: 'boolean' },
    },
    threshold: {
      control: { type: 'number', min: 0, max: 1, step: 0.1 },
    },
  },
};

/** 기본 사용 - HighlightedTypography props 조절 */
export const Default = {
  args: {
    variant: 'h4',
    component: 'p',
    animated: false,
    threshold: 0.5,
  },
  render: (args) => (
    <HighlightedTypography
      variant={args.variant}
      component={args.component}
      animated={args.animated}
      threshold={args.threshold}
    >
      This is a <Highlight type="background">highlighted</Highlight> text example.
    </HighlightedTypography>
  ),
};

/** Highlight 컴포넌트 props 조절 */
export const HighlightPlayground = {
  args: {
    type: 'background',
    color: 'primary.main',
    textColor: 'auto',
    animated: false,
    delay: 0,
    duration: 600,
  },
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['underline', 'background', 'marker', 'circle'],
    },
    color: {
      control: { type: 'select' },
      options: ['primary.main', 'secondary.main', 'error.main', 'warning.main', 'success.main', '#FF0000', '#00FF00', '#0000FF', '#000000', '#FFFF00'],
    },
    textColor: {
      control: { type: 'select' },
      options: ['auto', '#FFFFFF', 'inherit'],
    },
    animated: {
      control: { type: 'boolean' },
    },
    delay: {
      control: { type: 'number', min: 0, max: 2000, step: 100 },
    },
    duration: {
      control: { type: 'number', min: 100, max: 2000, step: 100 },
    },
  },
  render: (args) => (
    <HighlightedTypography variant="h4" animated={args.animated}>
      This text has a{' '}
      <Highlight
        type={args.type}
        color={args.color}
        textColor={args.textColor}
        animated={args.animated}
        delay={args.delay}
        duration={args.duration}
      >
        highlighted word
      </Highlight>{' '}
      in it.
    </HighlightedTypography>
  ),
};

/** 문서 및 데모 */
export const Documentation = {
  render: () => (
    <>
      <DocumentTitle
        title="HighlightedTypography"
        status="Available"
        note="Text highlighting effect component"
        brandName="Typography"
        systemName="Starter Kit"
        version="1.0"
      />
      <PageContainer>
        <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
          HighlightedTypography
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={ { mb: 4 } }>
          텍스트 내 특정 단어나 구문을 다양한 스타일로 강조합니다.
          Compound component 패턴으로 Highlight 컴포넌트와 함께 사용합니다.
        </Typography>

        <SectionTitle title="Props" description="HighlightedTypography 컴포넌트의 Props 목록입니다." />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={ { fontWeight: 600 } }>Prop</TableCell>
                <TableCell sx={ { fontWeight: 600 } }>Type</TableCell>
                <TableCell sx={ { fontWeight: 600 } }>Default</TableCell>
                <TableCell sx={ { fontWeight: 600 } }>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>children</TableCell>
                <TableCell>ReactNode</TableCell>
                <TableCell>-</TableCell>
                <TableCell>텍스트와 Highlight 컴포넌트 조합</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>variant</TableCell>
                <TableCell>string</TableCell>
                <TableCell>&apos;body1&apos;</TableCell>
                <TableCell>타이포그래피 variant</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>animated</TableCell>
                <TableCell>boolean</TableCell>
                <TableCell>false</TableCell>
                <TableCell>viewport 진입 시 애니메이션 활성화</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>threshold</TableCell>
                <TableCell>number</TableCell>
                <TableCell>0.5</TableCell>
                <TableCell>Intersection Observer threshold</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <SectionTitle title="Highlight Props" description="Highlight 하위 컴포넌트의 Props입니다." />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={ { fontWeight: 600 } }>Prop</TableCell>
                <TableCell sx={ { fontWeight: 600 } }>Type</TableCell>
                <TableCell sx={ { fontWeight: 600 } }>Default</TableCell>
                <TableCell sx={ { fontWeight: 600 } }>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>type</TableCell>
                <TableCell>&apos;underline&apos; | &apos;background&apos; | &apos;marker&apos; | &apos;circle&apos;</TableCell>
                <TableCell>-</TableCell>
                <TableCell>강조 유형 (필수)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>color</TableCell>
                <TableCell>string</TableCell>
                <TableCell>&apos;primary.main&apos;</TableCell>
                <TableCell>강조 색상</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>animated</TableCell>
                <TableCell>boolean</TableCell>
                <TableCell>false</TableCell>
                <TableCell>draw 애니메이션 활성화</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>delay</TableCell>
                <TableCell>number</TableCell>
                <TableCell>0</TableCell>
                <TableCell>애니메이션 지연 (ms)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>duration</TableCell>
                <TableCell>number</TableCell>
                <TableCell>600</TableCell>
                <TableCell>애니메이션 지속 시간 (ms)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>textColor</TableCell>
                <TableCell>string</TableCell>
                <TableCell>&apos;auto&apos;</TableCell>
                <TableCell>텍스트 색상 (&apos;auto&apos;: 배경 밝기에 따라 자동 결정)</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <SectionTitle title="Highlight Types" description="네 가지 강조 스타일을 제공합니다." />
        <Stack spacing={ 4 }>
          <Box>
            <Typography variant="subtitle2" sx={ { mb: 1, color: 'text.secondary' } }>
              Underline - 밑줄 효과
            </Typography>
            <HighlightedTypography variant="h5">
              We believe in <Highlight type="underline">innovation</Highlight> and <Highlight type="underline">creativity</Highlight>.
            </HighlightedTypography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={ { mb: 1, color: 'text.secondary' } }>
              Background - 배경색 효과
            </Typography>
            <HighlightedTypography variant="h5">
              Our <Highlight type="background">mission</Highlight> is to build <Highlight type="background">better products</Highlight>.
            </HighlightedTypography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={ { mb: 1, color: 'text.secondary' } }>
              Marker - 형광펜 효과
            </Typography>
            <HighlightedTypography variant="h5">
              This feature is <Highlight type="marker">absolutely essential</Highlight> for our users.
            </HighlightedTypography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={ { mb: 1, color: 'text.secondary' } }>
              Circle - 손으로 그린 원 효과
            </Typography>
            <HighlightedTypography variant="h5">
              The <Highlight type="circle">key insight</Highlight> changed everything.
            </HighlightedTypography>
          </Box>
        </Stack>

        <SectionTitle title="Animated Examples" description="스크롤하여 애니메이션을 확인하세요." />
        <Box sx={ { height: 100 } } />
        <Stack spacing={ 6 }>
          <Box sx={ { p: 4, border: '1px solid', borderColor: 'divider' } }>
            <HighlightedTypography variant="h4" animated>
              We are <Highlight type="underline" animated delay={ 0 }>passionate</Highlight> about
              creating <Highlight type="marker" animated delay={ 300 }>exceptional</Highlight> experiences
              that <Highlight type="circle" animated delay={ 600 }>inspire</Highlight> people.
            </HighlightedTypography>
          </Box>

          <Box sx={ { p: 4, border: '1px solid', borderColor: 'divider' } }>
            <HighlightedTypography variant="body1" animated>
              디자인 시스템은 <Highlight type="background" animated>일관성</Highlight>을 유지하면서
              <Highlight type="underline" animated delay={ 200 }>효율적인</Highlight> 개발을 가능하게 합니다.
              이를 통해 <Highlight type="marker" animated delay={ 400 }>사용자 경험</Highlight>을 개선하고
              <Highlight type="circle" animated delay={ 600 }>브랜드 아이덴티티</Highlight>를 강화할 수 있습니다.
            </HighlightedTypography>
          </Box>
        </Stack>

        <SectionTitle title="Usage Example" description="코드 사용 예시입니다." />
        <Box
          component="pre"
          sx={ {
            backgroundColor: 'grey.100',
            p: 3,
            fontSize: 13,
            fontFamily: 'monospace',
            overflow: 'auto',
            lineHeight: 1.6,
          } }
        >
          {`<HighlightedTypography variant="h4" animated>
  We are <Highlight type="underline" animated delay={0}>passionate</Highlight> about
  creating <Highlight type="marker" animated delay={300}>exceptional</Highlight> experiences
  that <Highlight type="circle" animated delay={600}>inspire</Highlight> people.
</HighlightedTypography>`}
        </Box>
      </PageContainer>
    </>
  ),
};
