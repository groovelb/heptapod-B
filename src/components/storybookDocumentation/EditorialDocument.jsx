import { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Markdown } from '@storybook/addon-docs/blocks';

import { documentTheme, DOCUMENT_FONT_CSS } from './documentTheme';

const NUMBERED_H2 = /^(\d+)\.\s+(.+)$/;
const NUMBERED_H3 = /^(\d+\.\d+)\s+(.+)$/;

/** Pretendard를 한 번만 로드한다 (프로젝트가 따로 로드하지 않는 경우 대비) */
function usePretendard() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.querySelector('link[data-editorial-font="pretendard"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = DOCUMENT_FONT_CSS;
    link.dataset.editorialFont = 'pretendard';
    document.head.appendChild(link);
  }, []);
}

/**
 * children이 단일 문자열일 때만 그 문자열을 돌려준다. 아니면 null.
 */
const textOf = (children) => {
  if (typeof children === 'string') return children;
  if (Array.isArray(children) && children.length === 1 && typeof children[0] === 'string') {
    return children[0];
  }
  return null;
};

/** 작은 대문자 느낌의 라벨. 섹션 번호, 문서 종류에 쓴다 */
function Overline({ children, sx }) {
  return (
    <Typography
      component="span"
      variant="overline"
      sx={ { display: 'block', lineHeight: 1, color: 'text.secondary', ...sx } }
    >
      { children }
    </Typography>
  );
}

/** H1: "{프로젝트명}: {문서명}"을 프로젝트명 라벨 + 문서명 큰 제목으로 나눈다 */
function Masthead({ children }) {
  const text = textOf(children);
  const hasKind = Boolean(text && text.includes(':'));
  const name = hasKind ? text.slice(0, text.indexOf(':')).trim() : null;
  const kind = hasKind ? text.slice(text.indexOf(':') + 1).trim() : children;
  return (
    <Box component="header" sx={ { mb: 5 } }>
      { name && <Overline sx={ { mb: 3 } }>{ name }</Overline> }
      <Typography variant="h1" component="h1" sx={ { fontSize: 'clamp(2.75rem, 6vw, 4.5rem)', m: 0, color: 'text.primary' } }>
        { kind }
      </Typography>
    </Box>
  );
}

const LEAD_PREFIX = '이 문서가 결정하는 것';

/**
 * 인용 블록. 두 가지로 나뉜다.
 * - H1 바로 아래 문서 설명("이 문서가 결정하는 것: …"으로 시작): 리드 한 줄 + 캡션. 테두리 없음
 * - 그 외(01의 한 줄 요약 등): 큰 풀 쿼트
 */
function Quote({ children }) {
  const paragraphs = Array.isArray(children) ? children : [children];
  const raw = paragraphs
    .map((child) => (typeof child === 'string' ? child : textOf(child?.props?.children)))
    .filter(Boolean)
    .join('\n');
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return <Box sx={ { m: 0, mb: 6 } }>{ children }</Box>;
  }
  if (lines[0].startsWith(LEAD_PREFIX)) {
    const [lead, ...rest] = lines;
    return (
      <Box sx={ { m: 0, mb: 8, maxWidth: '64ch' } }>
        <Typography variant="h6" component="p" sx={ { fontWeight: 400, lineHeight: 1.5, mb: 1.5, color: 'text.primary' } }>
          { lead }
        </Typography>
        { rest.map((line) => (
          <Typography key={ line } variant="body2" color="text.secondary">
            { line }
          </Typography>
        )) }
      </Box>
    );
  }
  return (
    <Box sx={ { m: 0, my: 6 } }>
      <Box
        component="span"
        aria-hidden="true"
        sx={ {
          display: 'block',
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '5rem',
          lineHeight: 0.5,
          color: 'text.secondary',
          mb: 3,
          userSelect: 'none',
        } }
      >
        { '“' }
      </Box>
      { lines.map((line) => (
        <Typography key={ line } variant="h4" component="p" sx={ { m: 0, color: 'text.primary' } }>
          { line }
        </Typography>
      )) }
    </Box>
  );
}

/** H2: "n. 제목"은 번호 라벨 + 큰 제목. 번호 없는 H2(결정 현황)는 한 단계 작게 */
function SectionHeading({ children }) {
  const text = textOf(children);
  const match = text ? text.match(NUMBERED_H2) : null;
  if (!match) {
    return (
      <Typography variant="h6" component="h2" sx={ { mt: 0, mb: 3, color: 'text.primary' } }>
        { children }
      </Typography>
    );
  }
  return (
    <Box component="h2" sx={ { m: 0, mb: 5 } }>
      <Overline sx={ { mb: 2.5 } }>{ match[1].padStart(2, '0') }</Overline>
      <Typography variant="h3" component="span" sx={ { display: 'block', color: 'text.primary' } }>
        { match[2] }
      </Typography>
    </Box>
  );
}

/** H3: "n.m 제목"은 작은 번호 + 소제목 */
function SubHeading({ children }) {
  const text = textOf(children);
  const match = text ? text.match(NUMBERED_H3) : null;
  return (
    <Typography
      variant="h6"
      component="h3"
      sx={ { display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 7, mb: 2.5, color: 'text.primary' } }
    >
      { match && (
        <Box component="span" sx={ { fontSize: '0.75em', fontWeight: 400, color: 'text.secondary' } }>
          { match[1] }
        </Box>
      ) }
      <span>{ match ? match[2] : children }</span>
    </Typography>
  );
}

const TAGLINE_PREFIX = /^태그라인\s*(?:\(선택\))?\s*:\s*/;

/** 문단. "태그라인: …"으로 시작하면 라벨 + 큰 글자로 그린다 */
function Paragraph({ children }) {
  const text = textOf(children);
  const match = text ? text.match(TAGLINE_PREFIX) : null;
  if (match) {
    return (
      <Box sx={ { mt: 5, mb: 2 } }>
        <Overline sx={ { mb: 1.5 } }>Tagline</Overline>
        <Typography variant="h5" component="p" sx={ { m: 0, color: 'text.primary' } }>
          { text.slice(match[0].length) }
        </Typography>
      </Box>
    );
  }
  return (
    <Typography variant="body1" sx={ { maxWidth: '72ch', mb: 2, color: 'text.primary' } }>
      { children }
    </Typography>
  );
}

/** 구분선: 섹션 사이의 얇은 괘선과 넉넉한 여백 */
function Rule() {
  return (
    <Box
      component="hr"
      sx={ { border: 0, borderTop: '1px solid', borderColor: 'divider', mx: 0, my: { xs: 8, md: 12 } } }
    />
  );
}

/** 표: 세로선 없이 가로 괘선만. 머리글은 라벨 톤 */
function Table({ children }) {
  return (
    <Box sx={ { overflowX: 'auto', my: 3 } }>
      <Box
        component="table"
        sx={ {
          width: '100%',
          borderCollapse: 'collapse',
          '& th': {
            textAlign: 'left',
            fontSize: '0.6875rem',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            pb: 1.5,
            pr: 3,
            borderBottom: '1px solid',
            borderColor: 'text.primary',
            whiteSpace: 'nowrap',
          },
          '& td': {
            verticalAlign: 'top',
            py: 1.75,
            pr: 3,
            fontSize: '0.9375rem',
            lineHeight: 1.6,
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
          },
          '& td:first-of-type': { fontWeight: 500 },
          '& th:last-of-type, & td:last-of-type': { pr: 0 },
        } }
      >
        { children }
      </Box>
    </Box>
  );
}

/** 코드: 펜스 블록은 괘선 상자, 인라인은 조용한 모노스페이스 */
function Code({ className, children }) {
  const isBlock = typeof className === 'string' && className.startsWith('lang-');
  if (isBlock) {
    return <code className={ className }>{ children }</code>;
  }
  return (
    <Box component="code" sx={ { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.875em' } }>
      { children }
    </Box>
  );
}

const listSx = { pl: 2.5, my: 2, maxWidth: '72ch', '& ul, & ol': { my: 1 } };

const overrides = {
  h1: { component: Masthead },
  h2: { component: SectionHeading },
  h3: { component: SubHeading },
  blockquote: { component: Quote },
  hr: { component: Rule },
  table: { component: Table },
  code: { component: Code },
  p: { component: Paragraph },
  ul: { component: Box, props: { component: 'ul', sx: listSx } },
  ol: { component: Box, props: { component: 'ol', sx: listSx } },
  li: { component: Typography, props: { component: 'li', variant: 'body1', sx: { mb: 1, color: 'text.primary' } } },
  strong: { component: 'strong', props: { style: { fontWeight: 600 } } },
  a: { component: 'a', props: { style: { color: 'inherit' } } },
  pre: {
    component: Box,
    props: {
      component: 'pre',
      sx: {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '0.8125rem',
        lineHeight: 1.7,
        p: 3,
        my: 3,
        color: 'text.primary',
        border: '1px solid',
        borderColor: 'divider',
        overflowX: 'auto',
      },
    },
  },
};

/**
 * EditorialDocument 컴포넌트
 *
 * 기획 문서(마크다운 원문)를 브랜드 북처럼 그린다. 스토리북 Docs 페이지 전용.
 * 문서 본문을 복사하지 않고 `docs/` 원본을 그대로 받는다.
 * 서체와 색은 제품 디자인 시스템과 분리된 문서 전용 테마(Pretendard, 무채색, 배경 없음)를 쓴다.
 * 글자색은 요소마다 문서 테마 값을 명시한다. 제품 테마가 다크(흰 글자)여도 전역 규칙에 밀리지 않기 위해서다.
 * 제목의 번호("## 1. …", "### 3.1 …")를 라벨로 분리하고, 표는 가로 괘선만 남긴다.
 *
 * Props:
 * @param {string} source - 마크다운 원문 (`import doc from '.../01-project-summary.md?raw'`) [Required]
 * @param {object} theme - 문서 테마 [Optional, 기본값: documentTheme]
 * @param {number} maxWidth - 본문 컨테이너 최대 폭(px) [Optional, 기본값: 960]
 *
 * Example usage:
 * <EditorialDocument source={ doc } />
 */
export function EditorialDocument({ source, theme = documentTheme, maxWidth = 960 }) {
  usePretendard();
  return (
    <ThemeProvider theme={ theme }>
      <Box sx={ { maxWidth, mx: 'auto', px: { xs: 3, md: 8 }, py: { xs: 6, md: 10 }, color: 'text.primary' } }>
        <Markdown options={ { overrides, forceBlock: true } }>{ source }</Markdown>
      </Box>
    </ThemeProvider>
  );
}

export default EditorialDocument;
