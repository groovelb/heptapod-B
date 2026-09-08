/** Semantic reading roles. Components consume roles, never local type scales.
 * rem preserves reader zoom; desktop sizes use the project's breakpoint token.
 */
export function createEditorialTokens({ typography, breakpoints }) {
  const desktop = `@media (min-width:${breakpoints.values.md}px)`;
  const archiveNavigationHeight = 48;
  const archiveContentInset = '1rem';
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
      editorialLead: role('1.25rem', '1.5rem', { lineHeight: 1.65, letterSpacing: '-0.01em' }),
      editorialTitle: role('1.875rem', '2.5rem', { fontFamily: serif, fontWeight: typography.fontWeightBold, lineHeight: 1.3, letterSpacing: '-0.02em' }),
      editorialDisplay: role('2.25rem', '3.5rem', { fontFamily: serif, fontWeight: typography.fontWeightBold, lineHeight: 1.25, letterSpacing: '-0.025em' }),
      editorialPortal: role('1.25rem', '1.875rem', { fontFamily: serif, fontWeight: typography.fontWeightBold, lineHeight: 1.4 }),
      editorialPortalCompact: role('1rem', '1.875rem', { fontFamily: serif, fontWeight: typography.fontWeightBold, lineHeight: 1.4 }),
      editorialLabel: role('1rem', '1.0625rem', { fontWeight: typography.fontWeightBold, lineHeight: 1.5 }),
      editorialMeta: role('0.9375rem', '1rem', { lineHeight: 1.6 }),
      editorialQuote: role('1.5rem', '2rem', { fontFamily: serif, lineHeight: 1.5 }),
      editorialCta: role('1.125rem', '1.125rem', { fontWeight: typography.fontWeightBold, lineHeight: 1.4 }),
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
      archiveReading: {
        inset: { xs: 2, md: 3 }, padding: { xs: 3, md: 4 },
        labelGap: { xs: 2, md: 2.5 }, itemGap: { xs: 2, md: 2.5 },
      },
      visualizationControls: { gap: 1.5, padding: { xs: 2, md: 3 } },
      createReading: {
        inset: { xs: 2, md: 2.5 }, dialogInset: 3, compactHeight: 480,
        railTop: 'calc(100px + env(safe-area-inset-top, 0px))', railBottom: 172, controlsBottom: 44, controlsGap: 3,
        groupGap: 3, sectionGap: { xs: 4, md: 5 },
        sectionPadding: { xs: 2, md: 2.5 },
        labelGap: { xs: 1.25, md: 1.5 }, paragraphGap: { xs: 1.5, md: 2 },
        itemGap: { xs: 1.25, md: 1.5 }, scrollInset: 1.5,
      },
      readingScrollbar: { size: 6 },
      createCta: {
        minHeight: { xs: 44, md: 48 }, px: { xs: 1.5, md: 2 },
        py: { xs: 0.75, md: 1 }, gap: { xs: 1, md: 1.5 }, width: '17rem',
      },
      listItem: {
        position: 'relative', paddingInlineStart: '1.25em',
        '&::before': {
          content: '""', position: 'absolute', insetInlineStart: 0,
          // Align the ring with the first line of editorialBody (1.75 line height).
          top: '0.675em', width: '0.4em', height: '0.4em', boxSizing: 'border-box',
          border: '1px solid', borderColor: 'currentColor', borderRadius: '50%',
        },
      },
      archivePage: {
        // Archive rhythm is independent of Create's long-form analysis.
        // Add sectionPadding to narrativeGap: approximately 32/48px between blocks.
        narrativeGap: { xs: 2.5, md: 4 }, sectionBreak: { xs: 8, md: 12 },
        groupGap: { xs: 4, md: 6 }, columnGap: { xs: 3, md: 6 },
        gutter: { xs: 2, sm: 3, md: 5 }, bottomInset: { xs: 4, md: 6 },
        indexSize: 44, indexGap: 2, indexClearance: 2,
        portalSize: '24rem', comparisonSize: '18rem',
        navigationHeight: archiveNavigationHeight,
        navigationTop: { xs: 'calc(64px + env(safe-area-inset-top, 0px))', md: 'calc(80px + env(safe-area-inset-top, 0px))' },
        rootInset: { xs: '1.5rem', md: '2rem' }, contentInset: archiveContentInset, introGap: 2,
      },
      archiveFigure: {
        top: `calc(80px + var(--archive-navigation-height, ${archiveNavigationHeight}px) + env(safe-area-inset-top, 0px) + ${archiveContentInset})`,
        maxHeight: `calc(100svh - var(--archive-figure-top) - ${archiveContentInset})`,
        maxWidth: 'min(100%, max(10rem, calc(100svh - var(--archive-figure-top) - var(--archive-figure-controls-height, 4rem) - 1rem)))',
      },
      archiveObservation: {
        glyphSize: 56, minimalGlyphSize: 44, targetSize: 44, gap: 1, inset: 0.5,
        compactHeight: 64, minimalHeight: 52, viewportFraction: 1 / 3,
        boundaryTolerance: 16,
      },
      observationChip: { borderRadius: '999px', minHeight: 44, height: 'auto', py: 0.75, px: 0.5 },
    },
  };
}
