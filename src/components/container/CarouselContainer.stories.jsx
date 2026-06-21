import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Placeholder from '../../common/ui/Placeholder';
import { CarouselContainer } from './CarouselContainer';

/**
 * 데모용 샘플 아이템 생성
 */
const createSampleItems = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Item ${i + 1}`,
  }));

const sampleItems = createSampleItems(8);

/**
 * 기본 아이템 렌더러 — Placeholder.Box 기반
 */
const DefaultItemRenderer = (item) => (
  <Placeholder.Box label={ item.title } height={ 180 } />
);

/**
 * 카드 스타일 아이템 렌더러 — Placeholder.Card 기반
 */
const CardItemRenderer = (item) => (
  <Placeholder.Card ratio="16/9" lines={ 2 } />
);

/**
 * Story 컴포넌트: ResponsiveDemo
 */
function ResponsiveDemo() {
  return (
    <Box sx={{ width: '100%', maxWidth: 1200 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        화면 크기에 따라 보이는 아이템 수가 변경됩니다. (xs:1, sm:2, md:3, lg:4)
      </Typography>
      <CarouselContainer
        items={sampleItems}
        renderItem={DefaultItemRenderer}
        visible={{ xs: 1, sm: 2, md: 3, lg: 4 }}
        gap={16}
      />
    </Box>
  );
}

/**
 * Story 컴포넌트: WithDividerDemo
 */
function WithDividerDemo() {
  return (
    <Box sx={{ width: '100%', maxWidth: 1000 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        아이템 사이에 구분선이 표시됩니다.
      </Typography>
      <CarouselContainer
        items={sampleItems}
        renderItem={CardItemRenderer}
        visible={{ xs: 1, sm: 2, md: 3 }}
        gap={24}
        hasDivider
        dividerColor="rgba(0,0,0,0.12)"
      />
    </Box>
  );
}

/**
 * Story 컴포넌트: OutsideNavigationDemo
 */
function OutsideNavigationDemo() {
  return (
    <Box sx={{ width: '100%', maxWidth: 900, px: 8 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        네비게이션 버튼이 컨테이너 바깥에 위치합니다.
      </Typography>
      <CarouselContainer
        items={sampleItems}
        renderItem={DefaultItemRenderer}
        visible={{ xs: 1, sm: 2, md: 3 }}
        gap={16}
        navPosition="outside"
      />
    </Box>
  );
}

/**
 * Story 컴포넌트: IndexChangeDemo
 */
function IndexChangeDemo() {
  const [index, setIndex] = useState(0);

  return (
    <Box sx={{ width: '100%', maxWidth: 1000 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          현재 인덱스:
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
          {index}
        </Typography>
      </Stack>
      <CarouselContainer
        items={sampleItems}
        renderItem={CardItemRenderer}
        visible={{ xs: 1, sm: 2, md: 3 }}
        gap={20}
        onIndexChange={setIndex}
      />
    </Box>
  );
}

/**
 * Story 컴포넌트: StepDemo
 */
function StepDemo() {
  return (
    <Box sx={{ width: '100%', maxWidth: 1000 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        step=2: 한 번에 2개씩 이동합니다.
      </Typography>
      <CarouselContainer
        items={createSampleItems(12)}
        renderItem={DefaultItemRenderer}
        visible={{ xs: 2, sm: 3, md: 4 }}
        gap={16}
        step={2}
      />
    </Box>
  );
}

/**
 * Story 컴포넌트: NoNavigationDemo
 */
function NoNavigationDemo() {
  return (
    <Box sx={{ width: '100%', maxWidth: 1000 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        네비게이션 버튼이 숨겨진 상태입니다. 터치 스와이프 등 다른 방식으로 제어할 때 사용합니다.
      </Typography>
      <CarouselContainer
        items={sampleItems.slice(0, 4)}
        renderItem={CardItemRenderer}
        visible={{ xs: 1, sm: 2, md: 4 }}
        gap={16}
        hasNavigation={false}
      />
    </Box>
  );
}

export default {
  title: 'Component/2. Container/CarouselContainer',
  component: CarouselContainer,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## CarouselContainer

반응형 멀티 아이템 캐러셀 컨테이너 컴포넌트입니다.

### 특징
- 브레이크포인트별 노출 개수 설정
- 부드러운 슬라이드 애니메이션
- 아이템 간 구분선 지원
- 네비게이션 버튼 위치 커스터마이징
- 인덱스 변경 콜백 지원
        `,
      },
    },
  },
  argTypes: {
    items: {
      description: '렌더링할 아이템 배열',
      table: {
        type: { summary: 'Array' },
      },
    },
    renderItem: {
      description: '아이템 렌더러 함수 (item, index) => ReactNode',
      table: {
        type: { summary: 'function' },
      },
    },
    visible: {
      description: '브레이크포인트별 노출 개수 {xs, sm, md, lg, xl}',
      control: 'object',
      table: {
        type: { summary: 'object' },
        defaultValue: { summary: '{xs:1, sm:2, md:3, lg:4}' },
      },
    },
    gap: {
      description: '아이템 간 간격 (px)',
      control: { type: 'number', min: 0, max: 48 },
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: 16 },
      },
    },
    step: {
      description: '한 번에 이동할 아이템 수',
      control: { type: 'number', min: 1, max: 5 },
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: 1 },
      },
    },
    hasNavigation: {
      description: '네비게이션 버튼 표시 여부',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    hasDivider: {
      description: '아이템 사이 구분선 표시 여부',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    dividerColor: {
      description: '구분선 색상',
      control: 'color',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'divider' },
      },
    },
    navPosition: {
      description: '네비게이션 버튼 위치',
      control: 'radio',
      options: ['inside', 'outside'],
      table: {
        type: { summary: "'inside' | 'outside'" },
        defaultValue: { summary: 'inside' },
      },
    },
    onIndexChange: {
      description: '인덱스 변경 콜백 함수',
      table: {
        type: { summary: '(index: number) => void' },
      },
    },
  },
};

/**
 * 기본 캐러셀 - 반응형 아이템 노출
 */
export const Default = {
  args: {
    items: sampleItems,
    renderItem: DefaultItemRenderer,
    visible: { xs: 1, sm: 2, md: 3, lg: 4 },
    gap: 16,
    step: 1,
    hasNavigation: true,
    hasDivider: false,
    navPosition: 'inside',
  },
};

/**
 * 반응형 데모 - 화면 크기에 따른 변화
 */
export const Responsive = {
  render: () => <ResponsiveDemo />,
};

/**
 * 구분선이 있는 캐러셀
 */
export const WithDivider = {
  render: () => <WithDividerDemo />,
};

/**
 * 외부 네비게이션 버튼
 */
export const OutsideNavigation = {
  render: () => <OutsideNavigationDemo />,
};

/**
 * 인덱스 변경 콜백 데모
 */
export const WithIndexChange = {
  render: () => <IndexChangeDemo />,
};

/**
 * Step 설정 데모 - 한 번에 여러 개 이동
 */
export const StepMovement = {
  render: () => <StepDemo />,
};

/**
 * 네비게이션 숨김
 */
export const NoNavigation = {
  render: () => <NoNavigationDemo />,
};
