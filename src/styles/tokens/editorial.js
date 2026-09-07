/** Semantic reading roles. Components consume roles, never local type scales.
 * rem preserves reader zoom; desktop sizes use the project's breakpoint token.
 */
export function createEditorialTokens({ typography, breakpoints }) {
  const desktop = `@media (min-width:${breakpoints.values.md}px)`;
  const sans = typography.fontFamily;
  const serif = "'Cinzel', 'Noto Serif KR', Georgia, serif";
  const role = (size, large, options = {}) => ({
    fontFamily: sans, fontWeight: typography.fontWeightRegular, fontSize: size,
    lineHeight: 1.75, letterSpacing: '0', overflowWrap: 'anywhere',
    [desktop]: { fontSize: large }, ...options,
  });
  return {
    typography: {
      editorialBody: role('1.125rem', '1.25rem'),
      editorialLead: role('1.5rem', '2rem', { fontWeight: typography.fontWeightMedium, lineHeight: 1.5, letterSpacing: '-0.02em' }),
      editorialTitle: role('1.875rem', '2.5rem', { fontFamily: serif, lineHeight: 1.3, letterSpacing: '-0.02em' }),
      editorialDisplay: role('2.25rem', '3.5rem', { fontFamily: serif, lineHeight: 1.25, letterSpacing: '-0.025em' }),
      editorialPortal: role('1.25rem', '1.875rem', { fontFamily: serif, lineHeight: 1.4 }),
      editorialLabel: role('1rem', '1.0625rem', { fontWeight: typography.fontWeightBold, lineHeight: 1.5 }),
      editorialMeta: role('0.9375rem', '1rem', { lineHeight: 1.6 }),
      editorialQuote: role('1.5rem', '2rem', { fontFamily: serif, lineHeight: 1.5 }),
      editorialAction: role('1rem', '1.0625rem', { fontWeight: typography.fontWeightMedium, lineHeight: 1.5 }),
    },
    layout: {
      measure: '40rem', wideMeasure: '48rem', spread: '80rem',
      detailColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 2fr) minmax(0, 3fr)' },
      sectionGap: { xs: 7, md: 10 }, sectionPadding: { xs: 1.5, md: 2 },
      sectionBreak: { xs: 10, md: 14 },
      labelGap: 0.75, paragraphGap: 1, itemGap: 1,
      spreadGap: { xs: 4, md: 8 }, leadSpace: { xs: 1, md: 2 },
      readingViewport: 'min(30rem, 48svh)', railMeasure: 'clamp(18rem, 28vw, 24rem)',
      rule: { borderTop: 1, borderColor: 'currentColor' },
      archiveFigure: {
        top: 'calc(80px + var(--archive-navigation-height, 48px) + env(safe-area-inset-top, 0px) + 1rem)',
        maxWidth: 'min(100%, max(10rem, calc(100svh - var(--archive-figure-top) - 5rem)))',
      },
      observationChip: { borderRadius: '999px', minHeight: 44, height: 'auto', py: 0.75, px: 0.5 },
    },
  };
}
