import { useId, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useI18n } from '../../i18n/useI18n.js';
import { getArchiveArchetypeSymbol } from '../../data/archiveArchetypeSymbols.js';
import ArchiveGlyph from './ArchiveGlyph';
import ArchetypeNarrative from './ArchetypeNarrative';
import ArchiveFeedIndex from '../in-page-navigation/ArchiveFeedIndex';

const EMPTY = [];

const gridSx = {
  display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
  columnGap: { xs: 2, md: 6 }, rowGap: { xs: 4, md: 6 }, alignItems: 'start',
};

function Members({ glyphs, onSelect, showDate = false }) {
  const { locale } = useI18n();
  return <Box sx={ gridSx }>{ glyphs.map((glyph) => (
    <Box key={ glyph.id } data-archive-member={ glyph.id } sx={ { minWidth: 0 } }>
      <ArchiveGlyph glyph={ glyph } showName onSelect={ onSelect } />
      { showDate && Number.isFinite(Date.parse(glyph.created_at)) && <Typography component="time" dateTime={ glyph.created_at }
        sx={ { display: 'block', textAlign: 'center', typography: 'editorialMeta', mt: 1, fontVariantNumeric: 'tabular-nums' } }>
        { new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(glyph.created_at)) }
      </Typography> }
    </Box>
  )) }</Box>;
}

/** Authored type headings introduce real members, never an extra navigation
 * layer. The feed projection owns exact membership and stable dialog order.
 */
export default function ArchiveArchetypeFeed({ feed, onSelect, sx }) {
  const { localize, t } = useI18n();
  const theme = useTheme();
  const sections = feed?.sections || EMPTY;
  const untypedGlyphs = feed?.untypedGlyphs || EMPTY;
  const prefix = useId();
  const items = useMemo(() => [
    ...sections.map(({ id, archetype, glyphs }, index) => ({ id, targetId: `${prefix}-type-${index}`, label: localize(archetype.title), count: glyphs.length })),
    ...(untypedGlyphs.length ? [{ id: 'untyped', targetId: `${prefix}-untyped`, label: t('archiveIndex.other'), count: untypedGlyphs.length }] : []),
  ], [sections, untypedGlyphs, prefix, localize, t]);
  if (feed?.chronological) return <Box data-archive-timeline sx={ { maxWidth: theme.editorial.spread, mx: 'auto', pt: theme.editorial.archivePage.groupGap, pb: theme.editorial.archivePage.bottomInset, ...sx } }>
    <Members glyphs={ feed.glyphs } onSelect={ onSelect } showDate />
  </Box>;
  const indexColumn = `${theme.editorial.archivePage.indexSize}px`;
  const anchorInset = theme.spacing(theme.editorial.archivePage.indexClearance);
  const stickyTop = {
    xs: `calc(${theme.editorial.archivePage.navigationTop.xs} + var(--archive-navigation-height, 0px))`,
    md: `calc(${theme.editorial.archivePage.navigationTop.md} + var(--archive-navigation-height, 0px))`,
  };
  return <Box data-archetype-feed="true" sx={ { maxWidth: theme.editorial.spread, mx: 'auto', pt: theme.editorial.archivePage.groupGap, pb: theme.editorial.archivePage.bottomInset,
    '--archive-index-top': stickyTop,
    '--archive-anchor-offset': {
      xs: `calc(${stickyTop.xs} + var(--archive-index-height, ${indexColumn}) + ${anchorInset})`,
      md: `calc(${stickyTop.md} + ${anchorInset})`,
    },
    display: { xs: 'block', md: 'grid' }, gridTemplateColumns: { md: items.length ? `${indexColumn} minmax(0, 1fr) ${indexColumn}` : 'minmax(0, 1fr)' },
    columnGap: theme.editorial.archivePage.indexGap, rowGap: theme.editorial.archivePage.indexClearance, alignItems: 'start', ...sx } }>
    <ArchiveFeedIndex items={ items } />
    <Box data-archive-feed-content sx={ { minWidth: 0, mt: { xs: items.length ? theme.editorial.archivePage.indexClearance : 0, md: 0 } } }>
    { sections.map(({ id, archetype, glyphs }, index) => {
      const symbol = getArchiveArchetypeSymbol(archetype.meaningKey);
      const title = localize(archetype.title);
      return <Box component="section" key={ id } id={ items[index].targetId } tabIndex={ -1 } aria-label={ title } data-archetype-section={ archetype.meaningKey }
        sx={ { scrollMarginTop: 'var(--archive-anchor-offset)', '&:focus': { outline: 'none' }, '& + section': { mt: (theme) => theme.editorial.archivePage.sectionBreak } } }>
        <Box component="header" sx={ {
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: (theme) => theme.editorial.paragraphGap, mb: (theme) => theme.editorial.sectionPadding,
          maxWidth: (theme) => theme.editorial.measure, mx: 'auto',
        } }>
          { symbol && <Box role="img" aria-label={ t('archiveArchetypeFeed.authoredSymbol', { title }) }
            data-archetype-symbol={ archetype.meaningKey }
            sx={ { width: { xs: 88, sm: 112, md: 140 }, flexShrink: 0 } }>
            <ArchiveGlyph glyph={ { model_data: symbol.model } } maxSize={ 140 } />
          </Box> }
          <Box sx={ { minWidth: 0 } }>
            <Typography component="h2" sx={ { m: 0, typography: 'editorialTitle' } }>{ title }</Typography>
            <Typography sx={ { mt: (theme) => theme.editorial.paragraphGap, typography: 'editorialLead' } }>{ localize(archetype.reading) }</Typography>
          </Box>
        </Box>
        <ArchetypeNarrative archetype={ archetype } showFamily={ false } showIdentity={ false } variant="compact" spacing="archive"
          sx={ { maxWidth: (theme) => theme.editorial.measure, mx: 'auto', mb: theme.editorial.archivePage.groupGap } } />
        <Members glyphs={ glyphs } onSelect={ onSelect } />
      </Box>;
    }) }
    { untypedGlyphs.length > 0 && <Box id={ `${prefix}-untyped` } tabIndex={ -1 } aria-label={ t('archiveIndex.other') } sx={ { mt: sections.length ? theme.editorial.archivePage.sectionBreak : 0, scrollMarginTop: 'var(--archive-anchor-offset)', '&:focus': { outline: 'none' } } }>
      <Members glyphs={ untypedGlyphs } onSelect={ onSelect } />
    </Box> }
    </Box>
  </Box>;
}
