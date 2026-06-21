import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Placeholder, { placeholderSvg } from '../../common/ui/Placeholder';
import { CustomCard } from './CustomCard';

export default {
  title: 'Component/3. Card/CustomCard',
  component: CustomCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
## CustomCard

미디어 영역과 콘텐츠 영역으로 구성된 기본 카드 컴포넌트.
ImageCard, MoodboardCard 등 다양한 카드 컴포넌트의 기반이 됩니다.

### 레이아웃 타입
- **vertical**: 미디어가 위, 콘텐츠가 아래 (기본값)
- **horizontal**: 미디어와 콘텐츠가 좌우 배치
- **overlay**: 미디어 위에 콘텐츠가 오버레이

### 미디어 비율
- \`1/1\`: 정사각형
- \`4/3\`: 표준 사진 비율
- \`16/9\`: 와이드스크린
- \`21/9\`: 울트라와이드
- \`auto\`: 원본 이미지 비율 유지
        `,
      },
    },
  },
  argTypes: {
    layout: {
      control: 'select',
      options: ['vertical', 'horizontal', 'overlay'],
      description: '카드 레이아웃 타입',
    },
    mediaPosition: {
      control: 'select',
      options: ['start', 'end'],
      description: '미디어 위치',
    },
    mediaRatio: {
      control: 'select',
      options: ['1/1', '4/3', '16/9', '21/9', 'auto'],
      description: '미디어 영역 비율',
    },
    contentPadding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: '콘텐츠 영역 패딩',
    },
    contentAlign: {
      control: 'select',
      options: ['start', 'center', 'end'],
      description: '콘텐츠 정렬',
    },
    isInteractive: {
      control: 'boolean',
      description: '호버 인터랙션 효과',
    },
  },
};

/**
 * 기본 Vertical 레이아웃
 */
export const Default = {
  args: {
    layout: 'vertical',
    mediaSrc: placeholderSvg(600, 338),
    mediaAlt: 'Sample image',
    mediaRatio: '16/9',
    contentPadding: 'md',
  },
  render: (args) => (
    <CustomCard { ...args } sx={ { width: 320 } }>
      <Typography variant="h6" sx={ { fontWeight: 600, mb: 1 } }>
        카드 제목
      </Typography>
      <Typography variant="body2" color="text.secondary">
        CustomCard는 다양한 레이아웃을 지원하는 기본 카드 컴포넌트입니다.
      </Typography>
    </CustomCard>
  ),
};

/**
 * Horizontal 레이아웃
 */
export const Horizontal = {
  render: () => (
    <CustomCard
      layout="horizontal"
      mediaSrc={ placeholderSvg(600, 600) }
      mediaRatio="1/1"
      contentPadding="md"
      sx={ { width: 480 } }
    >
      <Typography variant="h6" sx={ { fontWeight: 600, mb: 1 } }>
        Horizontal 레이아웃
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={ { mb: 2 } }>
        미디어와 콘텐츠가 좌우로 배치됩니다.
      </Typography>
      <Button variant="outlined" size="small" sx={ { textTransform: 'none' } }>
        자세히 보기
      </Button>
    </CustomCard>
  ),
};

/**
 * Horizontal - 미디어 오른쪽
 */
export const HorizontalMediaEnd = {
  render: () => (
    <CustomCard
      layout="horizontal"
      mediaPosition="end"
      mediaSrc={ placeholderSvg(600, 600) }
      mediaRatio="1/1"
      contentPadding="md"
      sx={ { width: 480 } }
    >
      <Typography variant="h6" sx={ { fontWeight: 600, mb: 1 } }>
        미디어가 오른쪽에
      </Typography>
      <Typography variant="body2" color="text.secondary">
        mediaPosition=&quot;end&quot;로 미디어를 오른쪽에 배치합니다.
      </Typography>
    </CustomCard>
  ),
};

/**
 * Overlay 레이아웃
 */
export const Overlay = {
  render: () => (
    <CustomCard
      layout="overlay"
      mediaSrc={ placeholderSvg(600, 450) }
      contentPadding="lg"
      sx={ { width: 400, height: 300 } }
    >
      <Typography variant="h5" sx={ { fontWeight: 700, mb: 1 } }>
        Overlay 레이아웃
      </Typography>
      <Typography variant="body2" sx={ { opacity: 0.9 } }>
        미디어 위에 콘텐츠가 오버레이됩니다. 그라데이션 배경으로 텍스트 가독성을 확보합니다.
      </Typography>
    </CustomCard>
  ),
};

/**
 * 다양한 미디어 비율
 */
export const MediaRatios = {
  render: () => (
    <Box sx={ { display: 'flex', gap: 2, flexWrap: 'wrap' } }>
      { ['1/1', '4/3', '16/9', '21/9'].map((ratio) => (
        <CustomCard
          key={ ratio }
          mediaSrc={ placeholderSvg(400, 400) }
          mediaRatio={ ratio }
          contentPadding="sm"
          sx={ { width: 200 } }
        >
          <Typography variant="body2" sx={ { fontWeight: 600 } }>
            { ratio }
          </Typography>
        </CustomCard>
      )) }
    </Box>
  ),
};

/**
 * Auto 비율 (원본 유지)
 */
export const AutoRatio = {
  render: () => (
    <Box sx={ { display: 'flex', gap: 2, alignItems: 'flex-start' } }>
      <CustomCard
        mediaSrc={ placeholderSvg(600, 400) }
        mediaRatio="auto"
        contentPadding="sm"
        sx={ { width: 200 } }
      >
        <Typography variant="body2" sx={ { fontWeight: 600 } }>
          가로 이미지 (auto)
        </Typography>
      </CustomCard>
      <CustomCard
        mediaSrc={ placeholderSvg(400, 600) }
        mediaRatio="auto"
        contentPadding="sm"
        sx={ { width: 200 } }
      >
        <Typography variant="body2" sx={ { fontWeight: 600 } }>
          세로 이미지 (auto)
        </Typography>
      </CustomCard>
    </Box>
  ),
};

/**
 * overlaySlot 사용 예시
 */
export const WithOverlaySlot = {
  render: () => (
    <CustomCard
      mediaSrc={ placeholderSvg(400, 300) }
      mediaRatio="4/3"
      contentPadding="sm"
      overlaySlot={
        <Box
          sx={ {
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
          } }
        >
          <IconButton
            size="small"
            sx={ {
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': { bgcolor: 'white' },
            } }
          >
            <FavoriteBorderIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            sx={ {
              bgcolor: 'primary.main',
              color: 'white',
              boxShadow: 1,
              '&:hover': { bgcolor: 'primary.dark' },
            } }
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      }
      sx={ { width: 280 } }
    >
      <Typography variant="body2" sx={ { fontWeight: 600 } }>
        overlaySlot 사용
      </Typography>
      <Typography variant="caption" color="text.secondary">
        미디어 위에 액션 버튼 오버레이
      </Typography>
    </CustomCard>
  ),
};

/**
 * mediaSlot 사용 예시 (커스텀 미디어)
 */
export const WithMediaSlot = {
  render: () => (
    <CustomCard
      mediaSlot={
        <Box
          sx={ {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: '2px',
            width: '100%',
            aspectRatio: '1/1',
            backgroundColor: 'grey.200',
          } }
        >
          { [0, 1, 2, 3].map((i) => (
            <Placeholder.Media
              key={ i }
              index={ i }
              sx={ { width: '100%', height: '100%' } }
            />
          )) }
        </Box>
      }
      contentPadding="md"
      sx={ { width: 280 } }
    >
      <Typography variant="subtitle1" sx={ { fontWeight: 700 } }>
        커스텀 미디어 슬롯
      </Typography>
      <Typography variant="body2" color="text.secondary">
        2×2 썸네일 그리드
      </Typography>
    </CustomCard>
  ),
};

/**
 * Interactive 카드
 */
export const Interactive = {
  render: () => (
    <CustomCard
      mediaSrc={ placeholderSvg(600, 338) }
      mediaRatio="16/9"
      contentPadding="md"
      isInteractive
      onClick={ () => console.log('Card clicked!') }
      overlaySlot={
        <Box
          sx={ {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          } }
        >
          <IconButton
            sx={ {
              bgcolor: 'rgba(0,0,0,0.6)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
            } }
          >
            <PlayArrowIcon fontSize="large" />
          </IconButton>
        </Box>
      }
      sx={ { width: 320 } }
    >
      <Typography variant="h6" sx={ { fontWeight: 600, mb: 0.5 } }>
        Interactive 카드
      </Typography>
      <Typography variant="body2" color="text.secondary">
        마우스를 올리면 호버 효과가 적용됩니다.
      </Typography>
    </CustomCard>
  ),
};

/**
 * 콘텐츠 없는 카드
 */
export const MediaOnly = {
  render: () => (
    <Box sx={ { display: 'flex', gap: 2 } }>
      <CustomCard
        mediaSrc={ placeholderSvg(300, 300) }
        mediaRatio="1/1"
        sx={ { width: 150 } }
      />
      <CustomCard
        mediaSrc={ placeholderSvg(400, 300) }
        mediaRatio="4/3"
        sx={ { width: 200 } }
      />
      <CustomCard
        mediaSrc={ placeholderSvg(480, 270) }
        mediaRatio="16/9"
        sx={ { width: 240 } }
      />
    </Box>
  ),
};

/**
 * 콘텐츠 패딩 비교
 */
export const ContentPaddings = {
  render: () => (
    <Box sx={ { display: 'flex', gap: 2 } }>
      { ['none', 'sm', 'md', 'lg'].map((padding) => (
        <CustomCard
          key={ padding }
          mediaSrc={ placeholderSvg(360, 203) }
          mediaRatio="16/9"
          contentPadding={ padding }
          sx={ { width: 180 } }
        >
          <Typography variant="body2" sx={ { fontWeight: 600 } }>
            padding: { padding }
          </Typography>
          <Box sx={ { display: 'flex', gap: 0.5, mt: 0.5 } }>
            <Chip label="Tag" size="small" />
          </Box>
        </CustomCard>
      )) }
    </Box>
  ),
};
