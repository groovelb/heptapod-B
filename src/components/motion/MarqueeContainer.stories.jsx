import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Placeholder from '../../common/ui/Placeholder';
import MarqueeContainer from './MarqueeContainer';

export default {
  title: 'Interactive/14. Motion/MarqueeContainer',
  component: MarqueeContainer,
  tags: ['autodocs'],
  argTypes: {
    speed: {
      control: { type: 'number', min: 1, max: 60 },
      description: '한 사이클 완료 시간 (초, 클수록 느림)',
    },
    direction: {
      control: 'select',
      options: ['left', 'right'],
      description: '스크롤 방향',
    },
    isPauseOnHover: {
      control: 'boolean',
      description: '호버 시 일시정지 여부',
    },
    gap: {
      control: { type: 'number', min: 0, max: 10 },
      description: '아이템 간 간격 (theme.spacing 단위)',
    },
    isScrollScrub: {
      control: 'boolean',
      description: '스크롤 스크러빙 모드 (스크롤 위치에 따라 이동)',
    },
  },
};

/** 키워드 태그 — 디자인 시스템 맥락 */
const keywords = [
  'Typography', 'Layout', 'Motion', 'Color System',
  'Spacing', 'Elevation', 'Iconography', 'Grid',
];

/** 파트너 로고 블록 — 클라이언트/협업사 로고 플레이스홀더 */
const partners = [
  { name: 'STUDIO A', accent: 'primary.main' },
  { name: 'FORMA', accent: 'secondary.main' },
  { name: 'GRIDWORK', accent: 'primary.main' },
  { name: 'TONECRAFT', accent: 'secondary.main' },
  { name: 'PIXEL LAB', accent: 'primary.main' },
  { name: 'ARCHETYPE', accent: 'secondary.main' },
];

/** 갤러리 이미지 인덱스 배열 */
const galleryIndices = [0, 1, 2, 3, 4, 5];

export const Default = {
  args: {
    speed: 20,
    direction: 'left',
    isPauseOnHover: true,
    gap: 2,
  },
  render: (args) => (
    <MarqueeContainer { ...args }>
      { keywords.map((label) => (
        <Chip key={ label } label={ label } variant="outlined" />
      )) }
    </MarqueeContainer>
  ),
};

export const Variants = {
  render: () => (
    <Box sx={ { display: 'flex', flexDirection: 'column', gap: 6 } }>
      {/* 키워드 태그 흐름 */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Keyword Tags
        </Typography>
        <MarqueeContainer speed={ 15 } gap={ 2 }>
          { keywords.map((label) => (
            <Chip key={ label } label={ label } variant="outlined" />
          )) }
        </MarqueeContainer>
      </Box>

      {/* 반대 방향 + 채워진 태그 */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Reverse Direction
        </Typography>
        <MarqueeContainer speed={ 18 } direction="right" gap={ 2 }>
          { keywords.map((label) => (
            <Chip
              key={ label }
              label={ label }
              sx={ { backgroundColor: 'secondary.main', color: 'white' } }
            />
          )) }
        </MarqueeContainer>
      </Box>

      {/* 파트너 로고 블록 */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Partner Logos
        </Typography>
        <MarqueeContainer speed={ 25 } gap={ 3 }>
          { partners.map((p) => (
            <Box
              key={ p.name }
              sx={ {
                width: 140,
                height: 56,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              } }
            >
              <Typography
                variant="caption"
                sx={ {
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: p.accent,
                } }
              >
                { p.name }
              </Typography>
            </Box>
          )) }
        </MarqueeContainer>
      </Box>

      {/* 이미지 갤러리 흐름 */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={ { mb: 1, display: 'block' } }>
          Image Gallery
        </Typography>
        <MarqueeContainer speed={ 30 } gap={ 1 }>
          { galleryIndices.map((i) => (
            <Placeholder.Media
              key={ i }
              index={ i }
              category="abstract"
              size="small"
              width={ 160 }
              height={ 100 }
            />
          )) }
        </MarqueeContainer>
      </Box>
    </Box>
  ),
};

export const ScrollScrub = {
  render: () => (
    <Box sx={ { height: '300vh', pt: 20 } }>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={ { mb: 2, display: 'block', textAlign: 'center' } }
      >
        Scroll to Scrub
      </Typography>

      {/* 이미지 갤러리 — 스크롤에 연동 */}
      <MarqueeContainer isScrollScrub gap={ 1 }>
        { galleryIndices.map((i) => (
          <Placeholder.Media
            key={ i }
            index={ i }
            category="abstract"
            size="medium"
            width={ 240 }
            height={ 150 }
          />
        )) }
      </MarqueeContainer>

      {/* 반대 방향 파트너 로고 — 스크롤에 연동 */}
      <Box sx={ { mt: 3 } }>
        <MarqueeContainer isScrollScrub direction="right" gap={ 3 }>
          { partners.map((p) => (
            <Box
              key={ p.name }
              sx={ {
                width: 140,
                height: 56,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              } }
            >
              <Typography
                variant="caption"
                sx={ {
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: p.accent,
                } }
              >
                { p.name }
              </Typography>
            </Box>
          )) }
        </MarqueeContainer>
      </Box>
    </Box>
  ),
};
