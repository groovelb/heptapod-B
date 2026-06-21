import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { DocumentTitle, PageContainer, SectionTitle } from '../../components/storybookDocumentation';

export default {
  title: 'Overview/Introduction',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## Starter Kit Basic

디자이너가 React + MUI + Storybook을 디자인 도구로 사용할 수 있는 개발 환경입니다.

### 핵심 목적
- Storybook 문서화를 통한 체계적인 UI 컴포넌트 관리
- 중앙 집중식 스타일 관리로 일관된 디자인 톤 유지
- 비즈니스 로직과 UI 디자인의 명확한 분리
        `,
      },
    },
  },
};

/** Documentation */
export const Doc = {
  render: () => (
    <>
      <DocumentTitle
        title="소개"
        status="Available"
        note="프로젝트 개요 및 핵심 개념"
        brandName="Design System"
        systemName="Starter Kit"
        version="1.0"
      />
      <PageContainer>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Starter Kit Basic
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          React + MUI + Storybook을 활용하는 디자이너를 위한 개발 환경
        </Typography>

        <SectionTitle title="기술 스택" />
        <TableContainer sx={{ mb: 4 }}>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '30%' }}>React</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>19.x</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>MUI (Material UI)</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>7.x</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Vite</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>7.x</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Storybook</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>10.x</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <SectionTitle title="핵심 목적" />
        <TableContainer sx={{ mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>목적</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>설명</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>UI 컴포넌트 관리</TableCell>
                <TableCell>Storybook으로 재사용 가능한 컴포넌트를 문서화하고 관리</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>디자인 일관성</TableCell>
                <TableCell>Theme을 통해 색상, 타이포그래피, 스타일을 중앙에서 관리</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>로직/UI 분리</TableCell>
                <TableCell>비즈니스 로직과 UI 디자인 작업의 명확한 분리</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <SectionTitle title="대상 사용자" />
        <TableContainer sx={{ mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>역할</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>활용 방식</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>디자이너</TableCell>
                <TableCell>Storybook으로 컴포넌트를 시각적으로 탐색 및 테스트. 코드 없이 Props 조정 가능.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>개발자</TableCell>
                <TableCell>체계적인 컴포넌트 구조와 스타일 가이드를 활용해 일관된 개발 진행.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <SectionTitle title="문서 구조" />
        <TableContainer sx={{ mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>섹션</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>설명</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Overview</TableCell>
                <TableCell>프로젝트 소개 및 가이드</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Style</TableCell>
                <TableCell>디자인 토큰: 색상, 타이포그래피, 아이콘</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Component</TableCell>
                <TableCell>재사용 가능한 UI 컴포넌트</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Custom Component</TableCell>
                <TableCell>프로젝트 특화 커스텀 컴포넌트</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Template</TableCell>
                <TableCell>컴포넌트 조합 템플릿</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Page</TableCell>
                <TableCell>전체 페이지 레이아웃</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <SectionTitle title="레이어 분리 원칙" />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>레이어</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>범위</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>특성</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>UI Layer (Storybook)</TableCell>
                <TableCell>순수 프레젠테이션 컴포넌트</TableCell>
                <TableCell>로직 없음, 시각 요소 전용, Props 제어, 디자이너 테스트 가능</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Logic Layer (App)</TableCell>
                <TableCell>비즈니스 로직</TableCell>
                <TableCell>상태 관리, API 호출, 이벤트 핸들링</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </PageContainer>
    </>
  ),
};
