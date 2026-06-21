import { forwardRef } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

/**
 * StickyAsideCenterLayout 컴포넌트
 *
 * 대칭 3열 그리드 레이아웃.
 * 좌측 aside는 sticky로 고정되고, 메인 콘텐츠는 페이지 기준 시각적 정중앙에 위치한다.
 * 우측에는 aside와 동일 크기의 빈 영역이 생겨 좌우 대칭을 유지한다.
 *
 * 동작 흐름:
 * 1. 좌측 aside 콘텐츠가 sticky로 스크롤 시 고정된다
 * 2. 중앙 children 콘텐츠가 페이지 정중앙에 배치된다
 * 3. 우측 빈 영역이 aside와 동일 크기로 시각적 균형을 맞춘다
 * 4. 모바일(md 미만)에서는 aside가 상단, children이 하단으로 스택된다
 *
 * Props:
 * @param {React.ReactNode} aside - 좌측 사이드바 콘텐츠 [Required]
 * @param {React.ReactNode} children - 중앙 메인 콘텐츠 [Required]
 * @param {number} centerSize - 중앙 콘텐츠 그리드 크기 (1-12) [Optional, 기본값: 8]
 *   - aside와 빈 영역은 (12 - centerSize) / 2로 자동 계산
 *   - 예: centerSize=8 → aside:2, center:8, empty:2
 *   - 예: centerSize=6 → aside:3, center:6, empty:3
 * @param {number} stickyTop - aside sticky 위치 (px) [Optional, 기본값: 88]
 * @param {number} spacing - 그리드 간격 [Optional, 기본값: 2]
 * @param {object} asideSx - aside 영역 추가 스타일 [Optional]
 * @param {object} contentSx - 콘텐츠 영역 추가 스타일 [Optional]
 * @param {object} sx - 컨테이너 추가 스타일 [Optional]
 *
 * Example usage:
 * <StickyAsideCenterLayout aside={<FilterMenu />} centerSize={6}>
 *   <ProductGrid products={products} />
 * </StickyAsideCenterLayout>
 */
const StickyAsideCenterLayout = forwardRef(function StickyAsideCenterLayout({
  aside,
  children,
  centerSize = 8,
  stickyTop = 88,
  spacing = 2,
  asideSx,
  contentSx,
  sx,
  ...props
}, ref) {
  /** aside와 빈 영역 크기 계산 (대칭) */
  const sideSize = (12 - centerSize) / 2;

  return (
    <Box ref={ ref } sx={ sx } { ...props }>
      <Grid container spacing={ spacing }>
        {/* 좌측: Aside (sticky) */}
        <Grid size={ { xs: 12, md: sideSize } }>
          <Box
            sx={ {
              position: 'sticky',
              top: stickyTop,
              alignSelf: 'flex-start',
              ...asideSx,
            } }
          >
            { aside }
          </Box>
        </Grid>

        {/* 중앙: Content (페이지 기준 시각적 정중앙) */}
        <Grid size={ { xs: 12, md: centerSize } }>
          <Box sx={ contentSx }>
            { children }
          </Box>
        </Grid>

        {/* 우측: 빈 영역 (aside와 대칭), 모바일에서 숨김 */}
        <Grid
          size={ { md: sideSize } }
          sx={ { display: { xs: 'none', md: 'block' } } }
        />
      </Grid>
    </Box>
  );
});

export default StickyAsideCenterLayout;
