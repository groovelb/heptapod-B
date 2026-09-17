import { createTheme } from '@mui/material/styles';

/**
 * 문서 전용 중립 테마.
 *
 * 제품 디자인 시스템 토큰과 분리한다. 서체는 Pretendard, 색은 무채색, 배경은 없다.
 * 스토리북 Docs 페이지의 EditorialDocument가 기본값으로 쓴다.
 */

export const DOCUMENT_FONT_CSS =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

export const DOCUMENT_FONT_FAMILY =
  '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", sans-serif';

export const documentTheme = createTheme({
  palette: {
    mode: 'light',
    text: { primary: '#141414', secondary: '#6F6F6F' },
    divider: '#E3E3E3',
    background: { default: '#FFFFFF', paper: '#FFFFFF' },
  },
  typography: {
    fontFamily: DOCUMENT_FONT_FAMILY,
    h1: { fontFamily: DOCUMENT_FONT_FAMILY, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.02 },
    h3: {
      fontFamily: DOCUMENT_FONT_FAMILY,
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.25,
    },
    h4: {
      fontFamily: DOCUMENT_FONT_FAMILY,
      fontSize: 'clamp(1.5rem, 2.6vw, 2rem)',
      fontWeight: 400,
      letterSpacing: '-0.015em',
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: DOCUMENT_FONT_FAMILY,
      fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
      fontWeight: 500,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    h6: { fontFamily: DOCUMENT_FONT_FAMILY, fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: '1rem', lineHeight: 1.8 },
    body2: { fontSize: '0.875rem', lineHeight: 1.7 },
    overline: { fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' },
  },
  shape: { borderRadius: 0 },
});

export default documentTheme;
