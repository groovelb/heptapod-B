import { useEffect, useId, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useI18n } from '../../i18n/useI18n';
import { getGlyphArchetype } from '../../data/heptapodArchetypeCatalog';
import { buildMeaningReading } from '../../utils/heptapod/buildMeaningReading';
import { glyphLabel } from '../../utils/heptapod/resonanceView';
import ArchiveGlyph from './ArchiveGlyph';
import GlyphObservationChips from '../input/GlyphObservationChips';
import ArchetypeNarrative from './ArchetypeNarrative';
import ArchetypeMotto from './ArchetypeMotto';

const headingSx = { typography: 'editorialTitle' };

/** One person's stored form, followed by exact-type peers and observed fragments.
 * Interpretation DTOs are supplied by the parent; this view never classifies names.
 */
export default function ArchiveSelectedGlyph({ glyph, interpretation, interpretations = {}, members = [], onSelect }) {
  const { locale, localize, t } = useI18n();
  const ref = useRef(null);
  const controlsRef = useRef(null);
  const analysisId = useId();
  const [analysis, setAnalysis] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const entries = buildMeaningReading(interpretation, locale);
  const selectedAnchors = entries.filter((entry) => selectedIds.includes(entry.id)).flatMap((entry) => entry.anchors);
  const type = getGlyphArchetype(interpretation);
  const peers = members.filter((member) => member.id !== glyph.id);
  // Keep the complete peer list below; the fragment matrix samples two peers so
  // desktop compares side by side and narrow screens stack readable samples.
  const samples = [glyph, ...peers.slice(0, 2)];
  const sampleReadings = samples.map((sample) => buildMeaningReading(sample.id === glyph.id ? interpretation : interpretations[sample.id], locale));
  const shared = entries.filter((entry) => entry.anchors.length && sampleReadings.every((reading) => reading.some((item) => item.meaningId === entry.meaningId && item.anchors.length)));
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return undefined;
    const figure = controls.parentElement;
    const update = () => figure.style.setProperty('--archive-figure-controls-height', `${Math.ceil(controls.getBoundingClientRect().height)}px`);
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(controls);
    return () => { observer?.disconnect(); figure.style.removeProperty('--archive-figure-controls-height'); };
  }, []);

  return <Box ref={ ref } tabIndex={ -1 } component="section" aria-label={ t('archiveDepthExplorer.selectedGlyphDetail') } data-selected-glyph-detail
    sx={ { maxWidth: (theme) => theme.editorial.spread, mx: 'auto', pt: (theme) => theme.editorial.archivePage.contentInset, pb: (theme) => theme.editorial.archivePage.bottomInset, '&:focus': { outline: 'none' } } }>
    <Box data-archive-detail-layout sx={ {
      display: 'grid', gridTemplateColumns: (theme) => theme.editorial.detailColumns,
      gridTemplateAreas: { xs: '"heading" "figure" "reading"', md: '"figure heading" "figure reading"' },
      // A flexible body row keeps the heading at its own content height even
      // when the spanning figure is taller than a short/unconfirmed reading.
      gridTemplateRows: { xs: 'auto auto auto', md: 'auto minmax(0, 1fr)' },
      columnGap: (theme) => theme.editorial.archivePage.columnGap,
      rowGap: (theme) => theme.editorial.paragraphGap, alignItems: 'start',
    } }>
      <Box component="header" data-archive-detail-heading sx={ {
        gridArea: 'heading', minWidth: 0, maxWidth: (theme) => theme.editorial.measure,
        px: (theme) => theme.editorial.archiveReading.inset,
        mb: (theme) => ({ xs: theme.editorial.archivePage.groupGap.xs - theme.editorial.paragraphGap, md: 0 }),
      } }>
        <Typography component="h2" sx={ { ...headingSx, m: 0 } }>{ localize(type?.title || interpretation?.title) || t('glyphMeaningSummary.thisMeaningCannotBeReadYet') }</Typography>
        <ArchetypeMotto archetype={ type } sx={ { mt: (theme) => theme.editorial.archiveReading.labelGap } } />
      </Box>
      <Box data-archive-sticky-figure sx={ { gridArea: 'figure', position: { xs: 'static', md: 'sticky' }, alignSelf: 'start', minWidth: 0,
        '--archive-figure-top': (theme) => theme.editorial.archiveFigure.top, top: 'var(--archive-figure-top)',
        maxHeight: (theme) => ({ md: theme.editorial.archiveFigure.maxHeight }), overflowY: { md: 'auto' },
      } }>
        <Box id={ analysisId }>
          <ArchiveGlyph glyph={ glyph } showName nameComponent="h1" maxSize={ 520 } analysis={ analysis } anchors={ selectedAnchors }
            sx={ { maxWidth: (theme) => ({ xs: '100%', md: theme.editorial.archiveFigure.maxWidth }) } } />
        </Box>
        <Box ref={ controlsRef } data-archive-figure-controls sx={ { display: 'grid', justifyItems: 'center', gap: (theme) => theme.editorial.visualizationControls.gap, p: (theme) => theme.editorial.visualizationControls.padding } }>
          <Button data-selected-analysis-toggle aria-pressed={ analysis } aria-controls={ analysisId }
            onClick={ () => setAnalysis((open) => !open) } variant="text"
            sx={ (theme) => ({
              typography: 'editorialAction', fontFamily: theme.typography.custom.mono.fontFamily,
              minHeight: theme.editorial.observationChip.minHeight, borderRadius: 0,
              width: 'fit-content',
              px: theme.editorial.archiveReading.inset,
              color: 'custom.chamber.ink', border: '1px solid',
              borderColor: alpha(theme.palette.custom.chamber.ink, analysis ? 0.5 : 0.2),
              justifyContent: 'center', gap: theme.editorial.archivePage.introGap,
              '&:hover': { bgcolor: alpha(theme.palette.custom.chamber.ink, 0.06), borderColor: alpha(theme.palette.custom.chamber.ink, 0.6) },
            }) }>
            <span>{ t('heptapodEncoderPage.analysis2') }</span>
            <span>{ t(analysis ? 'heptapodEncoderPage.on' : 'heptapodEncoderPage.off') }</span>
          </Button>
          <GlyphObservationChips entries={ entries } selectedIds={ selectedIds }
            sx={ { justifyContent: 'center' } }
            onToggle={ (entry) => setSelectedIds((ids) => ids.includes(entry.id) ? ids.filter((id) => id !== entry.id) : [...ids, entry.id]) } />
        </Box>
      </Box>
      <Box data-archive-reading-column sx={ { gridArea: 'reading', minWidth: 0, maxWidth: (theme) => theme.editorial.measure } }>
        { type && <ArchetypeNarrative archetype={ type } showMotto={ false } spacing="archiveDetail" /> }
      </Box>
    </Box>

    <Box component="section" aria-label={ t('archiveDepthExplorer.sameTypeGlyphs') } sx={ { mt: (theme) => theme.editorial.archivePage.sectionBreak } }>
      <Typography component="h2" sx={ headingSx }>{ t('archiveDepthExplorer.sameTypeGlyphs') }</Typography>
      <Typography sx={ { mt: (theme) => theme.editorial.paragraphGap, typography: 'editorialMeta' } }>{ !type ? t('archiveDepthExplorer.typeUnconfirmed')
        : peers.length ? t('archiveDepthExplorer.sameTypeCount', { count: peers.length }) : t('archiveDepthExplorer.noTypePeers') }</Typography>
      { peers.length > 0 && <Box sx={ { display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, columnGap: (theme) => theme.editorial.archivePage.columnGap, rowGap: (theme) => theme.editorial.archivePage.groupGap, mt: (theme) => theme.editorial.archivePage.introGap } }>
        { peers.map((peer) => <Box key={ peer.id } data-same-type-glyph={ peer.id }><ArchiveGlyph glyph={ peer } showName onSelect={ onSelect } /></Box>) }
      </Box> }
    </Box>

    { peers.length > 0 && shared.length > 0 && <Box component="section" aria-label={ t('archiveDepthExplorer.sharedPatternGrid') } data-shared-pattern-grid sx={ { mt: (theme) => theme.editorial.archivePage.sectionBreak } }>
      <Typography component="h2" sx={ headingSx }>{ t('archiveDepthExplorer.sharedPatternGrid') }</Typography>
      <Typography sx={ { mt: (theme) => theme.editorial.paragraphGap, typography: 'editorialBody' } }>{ t('archiveDepthExplorer.sharedPatternIntro', { count: samples.length }) }</Typography>
      { shared.map((entry) => <Box key={ entry.meaningId } data-shared-meaning={ entry.meaningId } sx={ { mt: (theme) => theme.editorial.archivePage.narrativeGap, pt: (theme) => theme.editorial.sectionPadding, borderTop: '1px solid', borderColor: 'divider' } }>
        <Typography component="h3" sx={ { typography: 'editorialLabel' } }>{ entry.label }</Typography>
        <Typography sx={ { mt: (theme) => theme.editorial.labelGap, typography: 'editorialBody', maxWidth: (theme) => theme.editorial.measure } }>{ entry.definition }</Typography>
        <Box data-shared-pattern-samples sx={ {
          display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: `repeat(${samples.length}, minmax(0, 1fr))` },
          columnGap: (theme) => theme.editorial.archivePage.columnGap,
          rowGap: (theme) => theme.editorial.archivePage.groupGap,
          mt: (theme) => theme.editorial.archivePage.introGap,
        } }>
          { samples.map((sample, index) => {
            const observation = sampleReadings[index].find((item) => item.meaningId === entry.meaningId);
            return <Box component="figure" key={ sample.id } data-shared-pattern-glyph={ sample.id } data-fragment-anchor-count={ observation.anchors.length } sx={ { m: 0, minWidth: 0, width: '100%', maxWidth: (theme) => theme.editorial.archivePage.comparisonSize, justifySelf: 'center' } }>
              <ArchiveGlyph glyph={ sample } fragmentAnchors={ observation.anchors } maxSize={ 300 } />
              <Typography component="figcaption" sx={ { mt: (theme) => theme.editorial.paragraphGap, typography: 'editorialMeta', textAlign: 'center', overflowWrap: 'anywhere' } }>{ glyphLabel(sample) }</Typography>
            </Box>;
          }) }
        </Box>
      </Box>) }
    </Box> }
  </Box>;
}
