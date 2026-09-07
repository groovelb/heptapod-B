import { useEffect, useState } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

import { defaultTheme as theme } from './styles/themes';
import { LenisContext } from './utils/lenisContext';
import AppRoutes from './routes/AppRoutes';
import { APP_PATHS } from './routes/paths';
import LocaleProvider from './i18n/LocaleProvider';

/** Shared providers and the route-dependent scroll lifetime.
 * Landing and Canvas mount independently through AppRoutes.
 */
function AppContent() {
  const { pathname } = useLocation();
  // Lenis 인스턴스를 상태로 보관 → 컨텍스트로 내려 인트로가 스크롤 잠금/해제에 사용.
  const [lenis, setLenis] = useState(null);

  /**
   * Lenis 스무스 스크롤 — 휠/터치를 감속 보간해 부드럽게 한다. 네이티브 scrollY를 갱신하므로
   * Framer useScroll이 그대로 따라온다. prefers-reduced-motion 시 비활성(접근성).
   */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, 0);
      return undefined;
    }
    // Archive is a reading surface: less wheel lag and native touch scrolling.
    // Query-based archive depths share this instance and the same scroll profile.
    const isArchive = pathname.replace(/\/+$/, '') === APP_PATHS.archive;
    const instance = new Lenis({
      lerp: isArchive ? 0.12 : 0.05,
      wheelMultiplier: isArchive ? 1 : 0.65,
      touchMultiplier: isArchive ? 1 : 0.9,
      smoothWheel: true,
      syncTouch: !isArchive,
      syncTouchLerp: 0.075, // 플릭 관성 감쇠 — 데스크톱보다 약간 높게(모바일 플릭 관성 유지)
      // Dialog/Drawer 내부는 네이티브 스크롤, 문서 전체는 기존 Lenis 감쇠 유지.
      allowNestedScroll: true,
    });
    instance.scrollTo(0, { immediate: true, force: true });
    setLenis(instance);
    let rafId = requestAnimationFrame(function raf(time) {
      instance.raf(time);
      rafId = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(rafId);
      instance.destroy();
      setLenis(null);
    };
  }, [pathname]);

  return (
    <ThemeProvider theme={ theme }>
      <CssBaseline />
      {/* 스크롤바 전역 숨김 — 동작 여부와 무관하게 항상 안 보이게 */}
      <GlobalStyles
        styles={ {
          'html, body': { scrollbarWidth: 'none', msOverflowStyle: 'none' },
          'html::-webkit-scrollbar, body::-webkit-scrollbar': {
            display: 'none',
            width: 0,
            height: 0,
          },
        } }
      />
      <LenisContext.Provider value={ lenis }>
        <AppRoutes />
      </LenisContext.Provider>
    </ThemeProvider>
  );
}

function App() {
  return <LocaleProvider><BrowserRouter><AppContent /></BrowserRouter></LocaleProvider>;
}

export default App;
