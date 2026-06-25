import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

import { defaultTheme as theme } from './styles/themes';
import HeptapodEncoderPage from './components/templates/HeptapodEncoderPage';
import HeptapodHeroIntro from './components/templates/HeptapodHeroIntro';

/** 공유 URL(?name=)로 진입했는지 — 그렇다면 인트로 없이 인코더만 노출한다 */
function hasSharedName() {
  if (typeof window === 'undefined') return false;
  return Boolean(new URLSearchParams(window.location.search).get('name'));
}

/**
 * App 컴포넌트
 *
 * Heptapod B Encoder 앱 진입점.
 * ThemeProvider(모노크롬 다크 테마) + CssBaseline 위에 라우터를 올린다.
 *
 * 기본 라우트는 히어로 인트로(560vh 스크럽 트랙)를 노출하고, 스크럽이 끝나는
 * 지점에서 영상을 fade-out / 인코더 캔버스를 fade-in하는 **디졸브 매치컷**으로
 * 넘긴다. 인코더는 인트로의 children(크로스페이드 타깃)으로 항상 마운트되어 있어
 * 스테이지 측정(ResizeObserver) 등 마운트 effect가 정상 동작한다. 위로 다시
 * 스크롤하면 디졸브가 역전된다(왕복). ?name= 쿼리 진입은 인트로를 생략하고
 * 인코더가 직접 쿼리를 읽어 재현한다 (결정론 공유).
 */
function App() {
  const sharedName = hasSharedName();

  /**
   * Lenis 스무스 스크롤 — 휠/터치를 감속 보간해 부드럽게 한다. 네이티브 scrollY를 갱신하므로
   * 기존 스크럽(VideoScrubbing의 window.scrollY)과 Framer useScroll이 그대로 따라온다.
   * prefers-reduced-motion 시 비활성(접근성).
   */
  useEffect(() => {
    if (
      typeof window === 'undefined'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined;
    }
    const lenis = new Lenis();
    let rafId = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <ThemeProvider theme={ theme }>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route
            index
            element={
              sharedName ? (
                <HeptapodEncoderPage />
              ) : (
                <HeptapodHeroIntro>
                  <HeptapodEncoderPage />
                </HeptapodHeroIntro>
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
