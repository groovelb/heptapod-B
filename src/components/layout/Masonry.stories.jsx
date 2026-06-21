import Masonry from '@mui/lab/Masonry';
import Box from '@mui/material/Box';
import Placeholder from '../../common/ui/Placeholder';

/**
 * 랜덤 높이 생성 (Masonry 효과 시연용)
 */
const heights = [150, 90, 180, 120, 200, 100, 160, 130, 170, 110, 140, 190];

export default {
  title: 'Component/8. Layout/Masonry',
  component: Masonry,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## Masonry [MUI]

\`@mui/lab\`의 Masonry 컴포넌트입니다. **Pinterest 스타일**의 가변 높이 그리드 레이아웃을 구현합니다.

### Grid와의 차이점

| Grid | Masonry |
|------|---------|
| Flexbox 기반 | CSS columns 기반 |
| 행 높이 균등 | 개별 아이템 높이 유지 |
| 가로 → 세로 순서 | 세로 → 가로 순서 |
| 일반 레이아웃 | 이미지 갤러리, 카드 목록 |

### 사용 시나리오
- 이미지 갤러리 (다양한 비율)
- 카드 목록 (다양한 콘텐츠 길이)
- Pinterest/Behance 스타일 레이아웃

### 주요 Props

| Prop | 타입 | 설명 |
|------|------|------|
| \`columns\` | number \\| object | 컬럼 수 (반응형 지원) |
| \`spacing\` | number | 아이템 간 간격 (8px 단위) |
| \`defaultColumns\` | number | SSR용 기본 컬럼 수 |
| \`defaultSpacing\` | number | SSR용 기본 간격 |
        `,
      },
    },
  },
  argTypes: {
    columns: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6],
      description: '컬럼 수를 지정합니다.',
      table: {
        type: { summary: 'number | object' },
        defaultValue: { summary: '4' },
      },
    },
    spacing: {
      control: 'select',
      options: [0, 1, 2, 3, 4],
      description: '아이템 간 간격 (8px 단위)',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '1' },
      },
    },
  },
};

/** 기본 Masonry - 다양한 높이의 아이템 */
export const Default = {
  args: {
    columns: 4,
    spacing: 2,
  },
  render: ({ columns, spacing }) => (
    <Box sx={ { width: '100%' } }>
      <Masonry columns={ columns } spacing={ spacing }>
        { heights.map((height, index) => (
          <Placeholder.Box key={ index } label={ `${index + 1}` } height={ height } />
        )) }
      </Masonry>
    </Box>
  ),
};

/** 반응형 컬럼 - 브레이크포인트별 컬럼 수 */
export const Responsive = {
  render: () => (
    <Box sx={ { width: '100%' } }>
      <Masonry columns={ { xs: 1, sm: 2, md: 3, lg: 4 } } spacing={ 2 }>
        { heights.map((height, index) => (
          <Placeholder.Box key={ index } label={ `${index + 1}` } height={ height } />
        )) }
      </Masonry>
    </Box>
  ),
};

/** 이미지 갤러리 - 실제 이미지로 Masonry 효과 */
export const ImageGallery = {
  render: () => (
    <Box sx={ { width: '100%' } }>
      <Masonry columns={ { xs: 2, sm: 3, md: 4 } } spacing={ 2 }>
        { Array.from({ length: 8 }, (_, i) => (
          <Placeholder.Media key={ i } index={ i } category="abstract" />
        )) }
      </Masonry>
    </Box>
  ),
};

/** Spacing 비교 */
export const SpacingComparison = {
  render: () => (
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 4 } }>
      { [1, 2, 3].map((spacing) => (
        <Box key={ spacing }>
          <Box sx={ { mb: 1, fontWeight: 600 } }>spacing={ spacing }</Box>
          <Masonry columns={ 4 } spacing={ spacing }>
            { [100, 80, 120, 90].map((height, index) => (
              <Placeholder.Box key={ index } label={ `${index + 1}` } height={ height } />
            )) }
          </Masonry>
        </Box>
      )) }
    </Box>
  ),
};

/** 컬럼 수 비교 */
export const ColumnsComparison = {
  render: () => (
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 4 } }>
      { [2, 3, 4, 5].map((columns) => (
        <Box key={ columns }>
          <Box sx={ { mb: 1, fontWeight: 600 } }>columns={ columns }</Box>
          <Masonry columns={ columns } spacing={ 1 }>
            { heights.slice(0, 8).map((height, index) => (
              <Placeholder.Box key={ index } label={ `${index + 1}` } height={ height } />
            )) }
          </Masonry>
        </Box>
      )) }
    </Box>
  ),
};
