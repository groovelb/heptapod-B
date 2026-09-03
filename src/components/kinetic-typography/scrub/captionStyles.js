/**
 * captionStyles — 스크럽 캡션 공통 타이포·배치 sx (08 §1 격자·타입·색)
 */
import { alpha } from '@mui/material/styles';
import { HERO_HEADLINE_FONT } from '../../../data/heptapodHeroStory';
import { COPY_SHADOW, INK_DARK, INK_LIGHT } from './inkMotion';

/** 12컬럼 관측 격자의 3구역 — 좌(A) / 우(B) / 중앙(C) */
export const PLACEMENT = {
  left: {
    left: { xs: 0, md: '8vw' },
    right: { xs: 0, md: 'auto' },
    width: { xs: '100%', md: 'min(84vw, 1040px)' },
    textAlign: { xs: 'center', md: 'left' },
    alignItems: { xs: 'center', md: 'flex-start' },
  },
  right: {
    left: { xs: 0, md: 'auto' },
    right: { xs: 0, md: '8vw' },
    width: { xs: '100%', md: 'min(84vw, 1040px)' },
    textAlign: { xs: 'center', md: 'right' },
    alignItems: { xs: 'center', md: 'flex-end' },
  },
  center: {
    left: 0,
    right: 0,
    width: '100%',
    textAlign: 'center',
    alignItems: 'center',
  },
};

/**
 * 헤드라인 sx — Cinzel lowercase. 비트 간 크기 동일, 명제 비트만 한 단계↑.
 * @param {{ emphasis?: boolean, onLight?: boolean, size?: string, maxWidth?: string }} o
 */
export const headlineSx = ({ emphasis = false, onLight = false, size, maxWidth } = {}) => ({
  fontFamily: HERO_HEADLINE_FONT,
  fontWeight: emphasis ? 900 : 700,
  fontStyle: emphasis ? 'italic' : 'normal',
  fontSize: size || (emphasis ? 'clamp(40px, 6.4vw, 104px)' : 'clamp(36px, 5.6vw, 92px)'),
  lineHeight: 1.1,
  textTransform: 'lowercase',
  letterSpacing: '0.02em',
  color: onLight ? INK_DARK : INK_LIGHT,
  textShadow: onLight ? 'none' : COPY_SHADOW,
  m: 0,
  ...(maxWidth ? { maxWidth } : {}),
});

/** 본문 sx — Pretendard 400 / 강조 500 */
export const bodySx = ({ emphasis = false, onLight = false, maxWidth = '30em' } = {}) => ({
  fontWeight: emphasis ? 500 : 400,
  fontSize: 'clamp(18px, 2.6vw, 32px)',
  lineHeight: 1.7,
  color: onLight ? alpha(INK_DARK, 0.85) : alpha(INK_LIGHT, 0.85),
  textShadow: onLight ? 'none' : COPY_SHADOW,
  m: 0,
  maxWidth,
  wordBreak: 'keep-all', // 한글 어절 단위로만 줄바꿈 — 단어 중간에서 끊기지 않게
  overflowWrap: 'normal',
});

/** 계기(모노 리드아웃) sx */
export const instrumentSx = (monoFont, onLight = false) => ({
  fontFamily: monoFont,
  fontSize: 'clamp(11px, 0.9vw, 14px)',
  letterSpacing: '0.14em',
  lineHeight: 1.6,
  color: onLight ? alpha(INK_DARK, 0.7) : alpha(INK_LIGHT, 0.6),
  textShadow: onLight ? 'none' : COPY_SHADOW,
  whiteSpace: 'pre',
  m: 0,
});
