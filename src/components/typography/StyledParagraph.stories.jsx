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
import {
  StyledParagraph,
  PullQuote,
} from '.';

export default {
  title: 'Component/1. Typography/StyledParagraph',
  component: StyledParagraph,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## StyledParagraph

왼쪽 장식 라인과 Drop Cap을 지원하는 인용/강조 문단 컴포넌트.

### 용도
- 인용문 강조
- 섹션 도입부 텍스트
- 중요 정보 하이라이트
        `,
      },
    },
  },
  argTypes: {
    children: {
      control: { type: 'text' },
      description: '문단 텍스트',
    },
    variant: {
      control: { type: 'select' },
      options: ['h4', 'h5', 'h6', 'body1', 'body2'],
      description: 'Typography variant',
    },
    dropCap: {
      control: { type: 'boolean' },
      description: '첫 글자 확대 (Drop Cap, 2줄 높이, 자동 float)',
    },
    styleColor: {
      control: { type: 'select' },
      options: ['primary.main', 'secondary.main', 'text.primary', 'text.secondary', 'error.main', 'warning.main', 'success.main'],
      description: 'Drop Cap 및 장식 라인 색상',
    },
    align: {
      control: { type: 'select' },
      options: ['left', 'center', 'right', 'justify'],
      description: '텍스트 정렬',
    },
    maxWidth: {
      control: { type: 'number' },
      description: '최대 너비 (ch 단위)',
    },
  },
};

const sampleText = {
  short: 'Design systems enable teams to build better products faster by making design reusable.',
  medium: 'A design system is a collection of reusable components, guided by clear standards, that can be assembled together to build any number of applications. It serves as a single source of truth for product teams.',
  long: 'Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing, and adjusting the space between pairs of letters. The term typography is also applied to the style, arrangement, and appearance of the letters, numbers, and symbols created by the process.',
  korean: '디자인 시스템은 재사용 가능한 컴포넌트와 명확한 표준으로 구성된 집합으로, 어떤 수의 애플리케이션이든 구축할 수 있습니다. 제품 팀을 위한 단일 진실 공급원(Single Source of Truth) 역할을 합니다.',
};

/** 기본 사용 */
export const Default = {
  args: {
    children: sampleText.medium,
    variant: 'h5',
    dropCap: false,
    styleColor: 'primary.main',
    align: 'left',
    maxWidth: 65,
  },
};

/** 문서 및 데모 */
export const Documentation = {
  render: () => (
    <>
      <DocumentTitle
        title="StyledParagraph"
        status="Available"
        note="Quote style paragraph with decoration line"
        brandName="Typography"
        systemName="Starter Kit"
        version="2.0"
      />
      <PageContainer>
        <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
          StyledParagraph
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={ { mb: 4 } }>
          왼쪽 장식 라인과 Drop Cap을 지원하는 인용/강조 문단 컴포넌트입니다.
          styleColor로 장식 라인과 Drop Cap 색상을 동시에 제어합니다.
        </Typography>

        <SectionTitle title="Props" description="StyledParagraph 컴포넌트의 Props 목록입니다." />
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
                <TableCell>string</TableCell>
                <TableCell>-</TableCell>
                <TableCell>문단 텍스트 (필수)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>variant</TableCell>
                <TableCell>&apos;h4&apos; | &apos;h5&apos; | &apos;h6&apos; | &apos;body1&apos; | &apos;body2&apos;</TableCell>
                <TableCell>&apos;h5&apos;</TableCell>
                <TableCell>Typography variant</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>dropCap</TableCell>
                <TableCell>boolean</TableCell>
                <TableCell>false</TableCell>
                <TableCell>첫 글자 확대 (Drop Cap, 2줄 높이, 자동 float)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>styleColor</TableCell>
                <TableCell>string</TableCell>
                <TableCell>&apos;primary.main&apos;</TableCell>
                <TableCell>Drop Cap 및 장식 라인 색상</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>maxWidth</TableCell>
                <TableCell>number | string</TableCell>
                <TableCell>65</TableCell>
                <TableCell>최대 너비 (ch 단위 또는 CSS 값)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={ { fontFamily: 'monospace' } }>align</TableCell>
                <TableCell>&apos;left&apos; | &apos;center&apos; | &apos;right&apos; | &apos;justify&apos;</TableCell>
                <TableCell>&apos;left&apos;</TableCell>
                <TableCell>텍스트 정렬</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <SectionTitle title="Basic Usage" description="기본 사용 예시입니다." />
        <Box sx={ { p: 3, border: '1px solid', borderColor: 'divider' } }>
          <StyledParagraph>
            { sampleText.medium }
          </StyledParagraph>
        </Box>

        <SectionTitle title="Drop Cap" description="첫 글자가 2줄 높이로 확대됩니다." />
        <Box sx={ { p: 3, border: '1px solid', borderColor: 'divider' } }>
          <StyledParagraph dropCap>
            { sampleText.long }
          </StyledParagraph>
        </Box>

        <SectionTitle title="Style Color" description="styleColor로 장식 라인과 Drop Cap 색상을 동시에 제어합니다." />
        <Stack spacing={ 4 }>
          <Box sx={ { p: 3, border: '1px solid', borderColor: 'divider' } }>
            <Typography variant="caption" sx={ { mb: 1, display: 'block', color: 'text.secondary' } }>
              primary.main (기본값)
            </Typography>
            <StyledParagraph dropCap styleColor="primary.main">
              { sampleText.medium }
            </StyledParagraph>
          </Box>
          <Box sx={ { p: 3, border: '1px solid', borderColor: 'divider' } }>
            <Typography variant="caption" sx={ { mb: 1, display: 'block', color: 'text.secondary' } }>
              secondary.main
            </Typography>
            <StyledParagraph dropCap styleColor="secondary.main">
              { sampleText.medium }
            </StyledParagraph>
          </Box>
          <Box sx={ { p: 3, border: '1px solid', borderColor: 'divider' } }>
            <Typography variant="caption" sx={ { mb: 1, display: 'block', color: 'text.secondary' } }>
              error.main
            </Typography>
            <StyledParagraph dropCap styleColor="error.main">
              { sampleText.medium }
            </StyledParagraph>
          </Box>
        </Stack>

        <SectionTitle title="PullQuote" description="저자 정보를 포함한 인용문 컴포넌트입니다." />
        <Box sx={ { p: 3, border: '1px solid', borderColor: 'divider' } }>
          <PullQuote author="Steve Jobs">
            Design is not just what it looks like and feels like. Design is how it works.
          </PullQuote>
        </Box>

        <SectionTitle title="PullQuote with Drop Cap" description="Drop Cap이 적용된 인용문입니다." />
        <Box sx={ { p: 3, border: '1px solid', borderColor: 'divider' } }>
          <PullQuote author="Dieter Rams" dropCap styleColor="secondary.main">
            Good design is as little design as possible. Less, but better, because it concentrates on the essential aspects.
          </PullQuote>
        </Box>

        <SectionTitle title="Korean Text" description="한글 텍스트 예시입니다." />
        <Box sx={ { p: 3, border: '1px solid', borderColor: 'divider' } }>
          <StyledParagraph dropCap>
            { sampleText.korean }
          </StyledParagraph>
        </Box>

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
          {`// 기본 사용
<StyledParagraph>
  Your quote text here...
</StyledParagraph>

// Drop Cap과 색상 지정
<StyledParagraph dropCap styleColor="secondary.main">
  Lorem ipsum dolor sit amet...
</StyledParagraph>

// PullQuote with author
<PullQuote author="Steve Jobs">
  Design is how it works.
</PullQuote>`}
        </Box>
      </PageContainer>
    </>
  ),
};
