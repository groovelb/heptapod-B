import { forwardRef } from 'react';
import Box from '@mui/material/Box';
import { GNB } from '../navigation/GNB';

/**
 * AppShell 컴포넌트
 *
 * 반응형 레이아웃 쉘. GNB(헤더)와 메인 영역으로 구성된다.
 * GNB가 반응형 네비게이션(Header + Drawer)을 처리한다.
 *
 * Props:
 * @param {node} logo - 로고 영역 (항상 표시) [Optional]
 * @param {node} headerPersistent - 헤더에 항상 표시될 요소 [Optional]
 * @param {node} headerCollapsible - 모바일에서 드로어로 이동할 요소 [Optional]
 * @param {node} drawerHeader - 드로어 상단 커스텀 요소 [Optional]
 * @param {node} drawerFooter - 드로어 하단 커스텀 요소 [Optional]
 * @param {node} children - 메인 콘텐츠 영역 [Required]
 * @param {string} breakpoint - 반응형 전환 브레이크포인트 ('sm' | 'md' | 'lg') [Optional, 기본값: 'md']
 * @param {number} headerHeight - 헤더 높이 (px) [Optional, 기본값: 64]
 * @param {number} drawerWidth - 드로어 너비 (px) [Optional, 기본값: 280]
 * @param {boolean} hasHeaderBorder - 헤더 하단 보더 [Optional, 기본값: true]
 * @param {boolean} isHeaderSticky - 헤더 고정 [Optional, 기본값: true]
 * @param {boolean} isHeaderTransparent - 헤더 투명 배경 [Optional, 기본값: false]
 * @param {object} sx - 추가 스타일 [Optional]
 *
 * Example usage:
 * <AppShell
 *   logo={<Logo />}
 *   headerPersistent={<SearchBar />}
 *   headerCollapsible={<NavMenu items={menuItems} />}
 *   breakpoint="md"
 * >
 *   <MainContent />
 * </AppShell>
 */
const AppShell = forwardRef(function AppShell({
  logo,
  headerPersistent,
  headerCollapsible,
  drawerHeader,
  drawerFooter,
  children,
  breakpoint = 'md',
  headerHeight = 64,
  drawerWidth = 280,
  hasHeaderBorder = true,
  isHeaderSticky = true,
  isHeaderTransparent = false,
  sx,
  ...props
}, ref) {
  return (
    <Box
      ref={ref}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        ...sx,
      }}
      {...props}
    >
      {/* GNB */}
      <GNB
        logo={logo}
        navContent={headerCollapsible}
        persistent={headerPersistent}
        drawerHeader={drawerHeader}
        drawerFooter={drawerFooter}
        breakpoint={breakpoint}
        height={headerHeight}
        drawerWidth={drawerWidth}
        hasBorder={hasHeaderBorder}
        isSticky={isHeaderSticky}
        isTransparent={isHeaderTransparent}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Box>
  );
});

export { AppShell };
