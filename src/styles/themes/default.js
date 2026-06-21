/**
 * Default Theme
 *
 * 프로젝트의 기본 디자인 토큰을 정의하는 표준 테마입니다.
 * 피그마의 Design Tokens / Variables와 동일한 역할입니다.
 *
 * ## 핵심 철학 (Heptapod B Encoder — 모노크롬 다크)
 * - **Sharp Corners**: borderRadius 0 (날카로운 모서리)
 * - **Dimmed Shadow**: offset 없이 blur만 사용하는 은은한 그림자
 * - **Chamber Black**: 관찰자 공간은 어둠 (그린 언더톤 #0c100f)
 * - **Pure Monochrome**: 유채색 전면 배제, 안개빛 무채 스펙트럼만 사용
 */

import { createTheme } from '@mui/material/styles';
import { grey } from '@mui/material/colors';

// ============================================================
// 1. Color Tokens (색상 토큰)
// ============================================================
const palette = {
  mode: 'dark',
  // 브랜드 색상 (안개빛 모노크롬)
  primary: {
    light: '#c9d2d8',
    main: '#aebcc4', // 안개 블루-그레이 — 인터랙티브 요소
    dark: '#8da0ac',
    contrastText: '#0c100f',
  },
  secondary: {
    light: '#6e7f7d',
    main: '#4a5a58', // 틸-그레이 — 보조 요소·비활성 상태
    dark: '#2f3b39',
    contrastText: '#e8ecec',
  },

  // 상태 색상 (Feedback) — 순수 모노크롬 확정, 유채색 전면 배제.
  // 경고·에러는 고명도 백 + 모노스페이스 라벨(WARNING:/ERROR:)로 구분.
  error: {
    light: '#e8ecec',
    main: '#e8ecec',
    dark: '#c9cfd4',
    contrastText: '#0c100f',
  },
  warning: {
    light: '#e8ecec',
    main: '#e8ecec',
    dark: '#c9cfd4',
    contrastText: '#0c100f',
  },
  success: {
    light: '#e8ecec',
    main: '#e8ecec',
    dark: '#c9cfd4',
    contrastText: '#0c100f',
  },
  info: {
    light: '#e8ecec',
    main: '#e8ecec',
    dark: '#c9cfd4',
    contrastText: '#0c100f',
  },

  // 텍스트 색상 (순백 금지 — 한색 백)
  text: {
    primary: '#e8ecec',
    secondary: '#8a9694',
    disabled: 'rgba(232, 236, 236, 0.38)',
  },

  // 배경 색상 (관찰자 공간 = 어둠, 그린 언더톤)
  background: {
    default: '#0c100f',
    paper: '#131715',
  },

  // 구분선 (1px 헤어라인, 거의 사라질 듯한 존재감)
  divider: 'rgba(232, 236, 236, 0.08)',

  // 액션 상태
  action: {
    active: 'rgba(232, 236, 236, 0.54)',
    hover: 'rgba(232, 236, 236, 0.04)',
    selected: 'rgba(232, 236, 236, 0.08)',
    disabled: 'rgba(232, 236, 236, 0.26)',
    disabledBackground: 'rgba(232, 236, 236, 0.12)',
    focus: 'rgba(232, 236, 236, 0.12)',
  },

  // Grey 스케일
  grey: {
    50: grey[50],
    100: grey[100],
    200: grey[200],
    300: grey[300],
    400: grey[400],
    500: grey[500],
    600: grey[600],
    700: grey[700],
    800: grey[800],
    900: grey[900],
  },

  // 챔버 전용 커스텀 네임스페이스 (밝은 안개 + 잉크 — UI 다크와 분리)
  custom: {
    chamber: {
      fog: '#dfe3e6',
      ink: '#1c2226',
      fogDeep: '#c9cfd4',
    },
  },
};

// ============================================================
// 2. Typography Tokens (타이포그래피 토큰)
// ============================================================
const typography = {
  // 기본 폰트 패밀리
  fontFamily: [
    '"Pretendard Variable"',
    'Pretendard',
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'Roboto',
    '"Helvetica Neue"',
    '"Segoe UI"',
    '"Apple SD Gothic Neo"',
    '"Noto Sans KR"',
    '"Malgun Gothic"',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
    'sans-serif',
  ].join(','),

  // 헤딩 폰트 패밀리
  headingFontFamily: '"Outfit", "Pretendard Variable", Pretendard, sans-serif',

  // 폰트 크기 기준
  fontSize: 14,
  htmlFontSize: 16,

  // 폰트 굵기
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,

  // 헤딩 스타일
  // 헤드라인 — 포스터의 와이드 트래킹 세장형 타이포. 가늘고 넓게, 절제된 크기.
  h1: {
    fontFamily: '"Outfit", "Pretendard Variable", Pretendard, sans-serif',
    fontWeight: 300,
    fontSize: 'clamp(32px, 5vw, 56px)',
    lineHeight: 1.2,
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
  },
  h2: {
    fontFamily: '"Outfit", "Pretendard Variable", Pretendard, sans-serif',
    fontWeight: 300,
    fontSize: 'clamp(26px, 4vw, 40px)',
    lineHeight: 1.25,
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
  },
  h3: {
    fontFamily: '"Outfit", "Pretendard Variable", Pretendard, sans-serif',
    fontWeight: 400,
    fontSize: 'clamp(22px, 3vw, 30px)',
    lineHeight: 1.3,
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
  },
  h4: {
    fontFamily: '"Outfit", "Pretendard Variable", Pretendard, sans-serif',
    fontWeight: 700,
    fontSize: '1.5rem',      // 24px
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h5: {
    fontFamily: '"Outfit", "Pretendard Variable", Pretendard, sans-serif',
    fontWeight: 700,
    fontSize: '1.25rem',     // 20px
    lineHeight: 1.4,
    letterSpacing: '0',
  },
  h6: {
    fontFamily: '"Outfit", "Pretendard Variable", Pretendard, sans-serif',
    fontWeight: 600,
    fontSize: '1.125rem',    // 18px
    lineHeight: 1.4,
    letterSpacing: '0',
  },

  // 본문 스타일
  body1: {
    fontSize: '1rem',        // 16px
    lineHeight: 1.6,
    letterSpacing: '0',
  },
  body2: {
    fontSize: '0.875rem',    // 14px
    lineHeight: 1.6,
    letterSpacing: '0',
  },

  // 부제목
  subtitle1: {
    fontSize: '1rem',        // 16px
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '0.01em',
  },
  subtitle2: {
    fontSize: '0.875rem',    // 14px
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '0.01em',
  },

  // 기타
  button: {
    fontSize: '0.875rem',    // 14px
    fontWeight: 600,
    lineHeight: 1.75,
    letterSpacing: '0.02em',
    textTransform: 'none',   // 대문자 변환 비활성화
  },
  caption: {
    fontSize: '0.75rem',     // 12px
    lineHeight: 1.5,
    letterSpacing: '0.02em',
  },
  overline: {
    fontSize: '0.75rem',     // 12px
    fontWeight: 600,
    lineHeight: 2,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },

  // 데이터 리드아웃 (신규) — 군사 과학 연구 장비의 분석 화면 톤
  custom: {
    mono: {
      fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
      fontSize: '0.75rem',     // 12px (11~13px 권장)
      lineHeight: 1.5,
      letterSpacing: '0.05em',
    },
  },
};

// ============================================================
// 3. Spacing Token (간격 토큰)
// ============================================================
const spacing = 8; // 기본 단위: 8px

// ============================================================
// 4. Shape Token (모양 토큰)
// ============================================================
const shape = {
  borderRadius: 0, // Sharp corners (0px)
};

// ============================================================
// 5. Shadow Tokens (그림자 토큰)
// ============================================================
const customShadows = {
  none: 'none',
  sm: '0 0 12px rgba(0, 0, 0, 0.06)',
  md: '0 0 16px rgba(0, 0, 0, 0.08)',
  lg: '0 0 20px rgba(0, 0, 0, 0.10)',
  xl: '0 0 24px rgba(0, 0, 0, 0.12)',
};

// ============================================================
// 6. Breakpoints (브레이크포인트)
// ============================================================
const breakpoints = {
  values: {
    xs: 0,      // 모바일
    sm: 600,    // 태블릿 세로
    md: 900,    // 태블릿 가로
    lg: 1200,   // 데스크톱
    xl: 1536,   // 대형 데스크톱
  },
};

// ============================================================
// 7. Z-Index (레이어 순서)
// ============================================================
const zIndex = {
  mobileStepper: 1000,
  fab: 1050,
  speedDial: 1050,
  appBar: 1100,
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
};

// ============================================================
// 8. Transitions (전환 효과)
// ============================================================
const transitions = {
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
};

// ============================================================
// 9. Component Overrides (컴포넌트 오버라이드)
// ============================================================
const components = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        scrollbarWidth: 'thin',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        boxShadow: customShadows.lg,
      },
      elevation0: {
        boxShadow: customShadows.none,
      },
      elevation1: {
        boxShadow: customShadows.sm,
      },
      elevation2: {
        boxShadow: customShadows.md,
      },
      elevation3: {
        boxShadow: customShadows.lg,
      },
      elevation4: {
        boxShadow: customShadows.xl,
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 0,
        textTransform: 'none',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 0,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 4,
      },
    },
  },
};

// ============================================================
// Theme 생성
// ============================================================
const defaultTheme = createTheme({
  palette,
  typography,
  spacing,
  shape,
  breakpoints,
  zIndex,
  transitions,
  components,
});

// 커스텀 속성 추가 (타입 확장 없이 접근 가능하도록)
defaultTheme.customShadows = customShadows;

/**
 * 대시보드 스타일 설정 (Default)
 */
defaultTheme.dashboard = {
  style: 'default',
  iconStyle: 'outlined',
  iconWeight: 400,
  cardBorderRadius: 0,
  cardColors: [
    'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 100%)',
    'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 100%)',
    'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 100%)',
    'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 100%)',
    'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 100%)',
    'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 100%)',
  ],
  subCardColors: [
    'linear-gradient(to bottom, #FAFAFA 0%, #FAFAFA 100%)',
    'linear-gradient(to bottom, #FAFAFA 0%, #FAFAFA 100%)',
    'linear-gradient(to bottom, #FAFAFA 0%, #FAFAFA 100%)',
    'linear-gradient(to bottom, #FAFAFA 0%, #FAFAFA 100%)',
    'linear-gradient(to bottom, #FAFAFA 0%, #FAFAFA 100%)',
    'linear-gradient(to bottom, #FAFAFA 0%, #FAFAFA 100%)',
  ],
  textColor: palette.text.primary,
  textSecondary: palette.text.secondary,
  textShadow: '0 0 0 rgba(0, 0, 0, 0)',
  backdropFilter: 'blur(0px)',
  WebkitBackdropFilter: 'blur(0px)',
  border: '1px solid transparent',
  borderColor: 'transparent',
  shadow: customShadows.lg,
  subBorder: '1px solid rgba(0, 0, 0, 0.06)',
  subShadow: '0 0 0 rgba(0, 0, 0, 0)',
  subBackdropFilter: 'blur(0px)',
  subBorderRadius: 0,
  dividerColor: 'rgba(0, 0, 0, 0.12)',
  progressHeight: 6,
  progressTrackColor: 'rgba(0, 0, 0, 0.08)',
  progressBarColor: palette.primary.main,
  progressGradient: false,
  progressBorderRadius: 0,
  background: '#FFFFFF',
  atmosphere: 'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 100%)',
  atmosphereOpacity: 0,
  accentColor: palette.primary.main,
  accentColors: {
    wind: '#4DB6AC',
    humidity: '#FFB74D',
    uvIndex: '#FF8A65',
    pressure: '#64B5F6',
  },
  blobs: null,
};

export default defaultTheme;

// 개별 토큰 내보내기 (문서화용)
export {
  palette,
  typography,
  spacing,
  shape,
  customShadows,
  breakpoints,
  zIndex,
  transitions,
  components,
};
