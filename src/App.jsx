import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { defaultTheme as theme } from './styles/themes';
import HeptapodEncoderPage from './components/templates/HeptapodEncoderPage';

/**
 * App 컴포넌트
 *
 * Heptapod B Encoder 앱 진입점.
 * ThemeProvider(모노크롬 다크 테마) + CssBaseline 위에 라우터를 올리고,
 * 기본 라우트는 메인 인코더 페이지를 렌더한다. ?name= 쿼리는 페이지가
 * 직접 읽어 동일 로고그램을 재현한다 (결정론 공유).
 */
function App() {
  return (
    <ThemeProvider theme={ theme }>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route index element={ <HeptapodEncoderPage /> } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
