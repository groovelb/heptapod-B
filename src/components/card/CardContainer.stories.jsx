import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { CardContainer } from './CardContainer';
import Placeholder from '../../common/ui/Placeholder';

export default {
  title: 'Component/3. Card/CardContainer',
  component: CardContainer,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
## CardContainer

자주 사용되는 카드 스타일을 미리 정의한 래퍼 컴포넌트.
CustomCard, ImageCard 등 다양한 카드 컴포넌트의 기반 컨테이너입니다.

### Variant 타입
- **outlined**: 테두리가 있는 기본 스타일 (기본값)
- **elevation**: 그림자가 있는 스타일
- **ghost**: 배경/테두리 없는 투명 스타일
- **filled**: 배경색이 채워진 스타일
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['outlined', 'elevation', 'ghost', 'filled'],
      description: '카드 스타일 변형',
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: '내부 패딩',
    },
    radius: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: '모서리 둥글기',
    },
    isInteractive: {
      control: 'boolean',
      description: '호버 효과 활성화',
    },
    isSelected: {
      control: 'boolean',
      description: '선택 상태 표시',
    },
  },
};

/**
 * 기본 CardContainer
 */
export const Default = {
  args: {
    variant: 'outlined',
    padding: 'md',
    radius: 'md',
    isInteractive: false,
    isSelected: false,
  },
  render: (args) => (
    <CardContainer { ...args } sx={ { width: 320 } }>
      <Typography variant="h6" sx={ { fontWeight: 600, mb: 1 } }>
        카드 제목
      </Typography>
      <Typography variant="body2" color="text.secondary">
        CardContainer는 다양한 variant를 지원하는 기본 카드 래퍼입니다.
      </Typography>
    </CardContainer>
  ),
};

/**
 * Variant 비교
 */
export const Variants = {
  render: () => (
    <Stack direction="row" spacing={ 2 } flexWrap="wrap" useFlexGap>
      { ['outlined', 'elevation', 'ghost', 'filled'].map((variant) => (
        <CardContainer
          key={ variant }
          variant={ variant }
          padding="md"
          sx={ { width: 200 } }
        >
          <Typography variant="subtitle2" sx={ { fontWeight: 600, mb: 0.5 } }>
            { variant }
          </Typography>
          <Typography variant="body2" color="text.secondary">
            variant=&quot;{ variant }&quot;
          </Typography>
        </CardContainer>
      )) }
    </Stack>
  ),
};

/**
 * Padding 비교
 */
export const Paddings = {
  render: () => (
    <Stack direction="row" spacing={ 2 } alignItems="flex-start">
      { ['none', 'sm', 'md', 'lg'].map((padding) => (
        <CardContainer
          key={ padding }
          variant="outlined"
          padding={ padding }
          sx={ { width: 150 } }
        >
          <Typography variant="body2" sx={ { fontWeight: 600 } }>
            padding: { padding }
          </Typography>
          <Chip label="Tag" size="small" sx={ { mt: 1 } } />
        </CardContainer>
      )) }
    </Stack>
  ),
};

/**
 * Radius 비교
 */
export const RadiusOptions = {
  render: () => (
    <Stack direction="row" spacing={ 2 }>
      { ['none', 'sm', 'md', 'lg'].map((radius) => (
        <CardContainer
          key={ radius }
          variant="elevation"
          padding="md"
          radius={ radius }
          sx={ { width: 150 } }
        >
          <Typography variant="body2" sx={ { fontWeight: 600 } }>
            radius: { radius }
          </Typography>
        </CardContainer>
      )) }
    </Stack>
  ),
};

/**
 * Interactive 상태
 */
export const Interactive = {
  render: () => (
    <Stack direction="row" spacing={ 2 }>
      { ['outlined', 'elevation', 'ghost', 'filled'].map((variant) => (
        <CardContainer
          key={ variant }
          variant={ variant }
          padding="md"
          isInteractive
          onClick={ () => console.log(`${variant} clicked!`) }
          sx={ { width: 180 } }
        >
          <Typography variant="subtitle2" sx={ { fontWeight: 600, mb: 0.5 } }>
            Interactive
          </Typography>
          <Typography variant="body2" color="text.secondary">
            { variant } + hover
          </Typography>
        </CardContainer>
      )) }
    </Stack>
  ),
};

/**
 * Selected 상태
 */
export const Selected = {
  render: () => (
    <Stack direction="row" spacing={ 2 }>
      <CardContainer variant="outlined" padding="md" sx={ { width: 180 } }>
        <Typography variant="subtitle2" sx={ { fontWeight: 600 } }>
          Normal
        </Typography>
        <Typography variant="body2" color="text.secondary">
          isSelected=false
        </Typography>
      </CardContainer>
      <CardContainer variant="outlined" padding="md" isSelected sx={ { width: 180 } }>
        <Typography variant="subtitle2" sx={ { fontWeight: 600 } }>
          Selected
        </Typography>
        <Typography variant="body2" color="text.secondary">
          isSelected=true
        </Typography>
      </CardContainer>
    </Stack>
  ),
};

/**
 * 실제 사용 예시 - 상품 카드
 */
export const ProductExample = {
  render: () => (
    <CardContainer
      variant="outlined"
      padding="md"
      isInteractive
      onClick={ () => console.log('Product clicked') }
      sx={ { width: 280 } }
    >
      <Placeholder.Media
        index={ 0 }
        ratio="16/9"
        sx={ {
          width: '100%',
          height: 160,
          borderRadius: 1,
          mb: 2,
        } }
      />
      <Box sx={ { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 } }>
        <Typography variant="subtitle1" sx={ { fontWeight: 600 } }>
          프리미엄 무선 이어폰
        </Typography>
        <Chip label="NEW" size="small" color="primary" />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={ { mb: 2 } }>
        고품질 사운드와 편안한 착용감
      </Typography>
      <Box sx={ { display: 'flex', alignItems: 'baseline', gap: 1 } }>
        <Typography variant="h6" color="primary" sx={ { fontWeight: 700 } }>
          ₩89,000
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={ { textDecoration: 'line-through' } }>
          ₩120,000
        </Typography>
      </Box>
    </CardContainer>
  ),
};

/**
 * 실제 사용 예시 - 통계 카드
 */
export const StatExample = {
  render: () => (
    <Stack direction="row" spacing={ 2 }>
      <CardContainer variant="elevation" padding="md" sx={ { minWidth: 180 } }>
        <Typography variant="overline" color="text.secondary">
          총 방문자
        </Typography>
        <Typography variant="h4" sx={ { fontWeight: 700 } }>
          12,543
        </Typography>
        <Typography variant="caption" color="success.main">
          +12.5% 지난 주 대비
        </Typography>
      </CardContainer>
      <CardContainer variant="elevation" padding="md" sx={ { minWidth: 180 } }>
        <Typography variant="overline" color="text.secondary">
          신규 가입
        </Typography>
        <Typography variant="h4" sx={ { fontWeight: 700 } }>
          847
        </Typography>
        <Typography variant="caption" color="error.main">
          -3.2% 지난 주 대비
        </Typography>
      </CardContainer>
    </Stack>
  ),
};

/**
 * 실제 사용 예시 - 선택 가능한 옵션
 */
export const SelectableOptions = {
  render: () => (
    <Stack direction="row" spacing={ 2 }>
      { ['Basic', 'Pro', 'Enterprise'].map((plan, index) => (
        <CardContainer
          key={ plan }
          variant="outlined"
          padding="md"
          isInteractive
          isSelected={ index === 1 }
          onClick={ () => console.log(`${plan} selected`) }
          sx={ { width: 160 } }
        >
          <Typography variant="subtitle1" sx={ { fontWeight: 700, mb: 0.5 } }>
            { plan }
          </Typography>
          <Typography variant="h5" sx={ { fontWeight: 700, mb: 1 } }>
            ${ index === 0 ? '9' : index === 1 ? '29' : '99' }
            <Typography component="span" variant="body2" color="text.secondary">
              /mo
            </Typography>
          </Typography>
          <Button
            variant={ index === 1 ? 'contained' : 'outlined' }
            size="small"
            fullWidth
            sx={ { textTransform: 'none' } }
          >
            { index === 1 ? 'Current' : 'Select' }
          </Button>
        </CardContainer>
      )) }
    </Stack>
  ),
};
