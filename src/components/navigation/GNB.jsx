import { useI18n } from '../../i18n/useI18n.js';
import { useState, useEffect, useId, forwardRef, createContext, useContext } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import LanguageSwitcher from './LanguageSwitcher';
import { LenisContext } from '../../utils/lenisContext';

/**
 * GNB Context
 */
const GNBContext = createContext({
  isDrawerOpen: false,
  toggleDrawer: () => {},
  closeDrawer: () => {},
  isMobile: false,
});

export const useGNB = () => useContext(GNBContext);

/**
 * GNB 컴포넌트
 *
 * 반응형 GNB (Global Navigation Bar).
 * 데스크탑에서는 헤더에 네비게이션을 표시하고,
 * 모바일에서는 햄버거 메뉴 + 드로어로 전환된다.
 *
 * Props:
 * @param {node} logo - 로고 영역 (항상 표시) [Optional]
 * @param {node} navContent - 네비게이션 콘텐츠 (반응형 전환 대상) [Optional]
 * @param {node} persistent - 헤더에 항상 표시될 요소 [Optional]
 * @param {node} drawerHeader - 드로어 상단 커스텀 요소 [Optional]
 * @param {node} drawerFooter - 드로어 하단 커스텀 요소 [Optional]
 * @param {string} breakpoint - 반응형 전환 브레이크포인트 ('sm' | 'md' | 'lg') [Optional, 기본값: 'md']
 * @param {number} height - 헤더 높이 (px) [Optional, 기본값: 64]
 * @param {number} drawerWidth - 드로어 너비 (px) [Optional, 기본값: 280]
 * @param {boolean} hasBorder - 헤더 하단 보더 [Optional, 기본값: true]
 * @param {boolean} isFixed - 뷰포트 상단 고정 (사용처에서 본문 높이 확보) [Optional, 기본값: false]
 * @param {string} resetKey - 경로 변경 시 열린 Drawer 초기화 [Optional]
 * @param {object} drawerSx - Drawer 배경·전경 스타일 [Optional]
 * @param {boolean} isSticky - 헤더 고정 [Optional, 기본값: true]
 * @param {boolean} isTransparent - 헤더 투명 배경 [Optional, 기본값: false]
 * @param {boolean} showLanguageSwitcher - 언어 선택 표시 [Optional, 기본값: true]
 * @param {object} sx - 추가 스타일 [Optional]
 *
 * Example usage:
 * <GNB
 *   logo={<Logo />}
 *   navContent={<NavMenu items={menuItems} />}
 *   persistent={<SearchBar />}
 * />
 */
const GNB = forwardRef(function GNB({
  logo,
  navContent,
  persistent,
  drawerHeader,
  drawerFooter,
  breakpoint = 'md',
  height = 64,
  drawerWidth = 280,
  hasBorder = true,
  isSticky = true,
  isTransparent = false,
  showLanguageSwitcher = true,
  isFixed = false,
  resetKey = 'default',
  drawerSx,
  sx,
  ...props
}, ref) {
  const { t } = useI18n();
  const [drawerState, setDrawerState] = useState({ key: resetKey, open: false });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(breakpoint));
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const drawerId = useId();
  const lenis = useContext(LenisContext);
  const isDrawerOpen = isMobile && drawerState.key === resetKey && drawerState.open;
  // Forget the old route's open state, including when Back/Forward reuses its key.
  if (drawerState.key !== resetKey) setDrawerState({ key: resetKey, open: false });

  const toggleDrawer = () => setDrawerState((prev) => ({ key: resetKey, open: !prev.open }));
  const closeDrawer = () => setDrawerState((prev) => ({ ...prev, open: false }));

  useEffect(() => {
    const query = window.matchMedia(theme.breakpoints.down(breakpoint).replace('@media ', ''));
    const closeOnDesktop = (event) => { if (!event.matches) setDrawerState((prev) => ({ ...prev, open: false })); };
    query.addEventListener('change', closeOnDesktop);
    return () => query.removeEventListener('change', closeOnDesktop);
  }, [theme, breakpoint]);

  useEffect(() => {
    if (!isDrawerOpen || !lenis) return undefined;
    const wasStopped = lenis.isStopped;
    lenis.stop();
    return () => { if (!wasStopped) lenis.start(); };
  }, [isDrawerOpen, lenis]);

  /**
   * 헤더 스타일
   */
  const headerStyles = {
    position: isFixed ? 'fixed' : isSticky ? 'sticky' : 'relative',
    top: 0,
    left: 0,
    right: 0,
    zIndex: theme.zIndex.appBar,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height,
    px: { xs: 2, sm: 3, md: 4 },
    backgroundColor: isTransparent ? 'transparent' : 'background.paper',
    borderBottom: hasBorder ? '1px solid' : 'none',
    borderColor: 'divider',
    backdropFilter: isTransparent ? 'blur(12px)' : 'none',
    ...sx,
  };

  /**
   * 드로어 콘텐츠
   */
  const renderDrawerContent = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      {/* Drawer Header */}
      <Box
        onClick={(event) => { if (event.target.closest('a')) closeDrawer(); }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: height,
          pt: 'env(safe-area-inset-top, 0px)',
          px: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        {drawerHeader || logo}
        <IconButton
          onClick={closeDrawer}
          size="small"
          sx={{ color: 'inherit', width: 44, height: 44, borderRadius: 0 }}
          aria-label={ t('gNB.closeMenu') }
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Drawer Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 2,
          px: 2,
        }}
      >
        {navContent}
      </Box>

      {/* Drawer Footer */}
      {drawerFooter && (
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          {drawerFooter}
        </Box>
      )}
    </Box>
  );

  return (
    <GNBContext.Provider value={{ isDrawerOpen, toggleDrawer, closeDrawer, isMobile }}>
      {/* Header */}
      <Box ref={ref} component="header" sx={headerStyles} {...props}>
        {/* Left: Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          {logo}
        </Box>

        {/* Right: Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, md: 2 }, flexShrink: 0 }}>
          {!isMobile && navContent}
          {showLanguageSwitcher && <LanguageSwitcher />}
          {/* Persistent (always visible) */}
          {persistent}

          {/* Mobile: Hamburger menu */}
          {isMobile && navContent && (
            <IconButton
              onClick={toggleDrawer}
              size="medium"
              aria-label={ t('gNB.openMenu') }
              aria-expanded={isDrawerOpen}
              aria-controls={isDrawerOpen ? drawerId : undefined}
              aria-haspopup="dialog"
              sx={{ color: 'inherit', width: 44, height: 44, borderRadius: 0 }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={closeDrawer}
        transitionDuration={reducedMotion ? 0 : undefined}
        slotProps={{ paper: { id: drawerId, role: 'dialog', 'aria-modal': true, 'aria-label': t('gNB.openMenu'), 'data-lenis-prevent': true } }}
        sx={{
          '& .MuiDrawer-paper': {
            width: `min(${drawerWidth}px, 100vw)`,
            boxSizing: 'border-box',
            borderRadius: 0,
            backgroundImage: 'none',
            ...drawerSx,
          },
        }}
      >
        {renderDrawerContent()}
      </Drawer>
    </GNBContext.Provider>
  );
});

export { GNB };
