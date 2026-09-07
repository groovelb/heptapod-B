import { useEffect, useId, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
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
  const analysisId = useId();
  const [analysis, setAnalysis] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const entries = buildMeaningReading(interpretation, locale);
  const selectedAnchors = entries.filter((entry) => selectedIds.includes(entry.id)).flatMap((entry) => entry.anchors);
  const type = getGlyphArchetype(interpretation);
  const peers = members.filter((member) => member.id !== glyph.id);
  // Keep the complete peer list below; the fragment matrix samples two peers so
  // all three forms remain readable together even on a narrow screen.
  const samples = [glyph, ...peers.slice(0, 2)];
  const sampleReadings = samples.map((sample) => buildMeaningReading(sample.id === glyph.id ? interpretation : interpretations[sample.id], locale));
  const shared = entries.filter((entry) => entry.anchors.length && sampleReadings.every((reading) => reading.some((item) => item.meaningId === entry.meaningId && item.anchors.length)));
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);

  return <Box ref={ ref } tabIndex={ -1 } component="section" aria-label={ t('archiveDepthExplorer.selectedGlyphDetail') } data-selected-glyph-detail
    sx={ { maxWidth: (theme) => theme.editorial.spread, mx: 'auto', pt: (theme) => theme.editorial.archivePage.contentInset, pb: { xs: 5, md: 10 }, '&:focus': { outline: 'none' } } }>
    <Box sx={ { display: 'grid', gridTemplateColumns: (theme) => theme.editorial.detailColumns, gap: (theme) => theme.editorial.spreadGap, alignItems: 'start' } }>
      <Box data-archive-sticky-figure sx={ { position: { xs: 'static', md: 'sticky' }, alignSelf: 'start', minWidth: 0,
        '--archive-figure-top': (theme) => theme.editorial.archiveFigure.top, top: 'var(--archive-figure-top)',
      } }>
        <Box id={ analysisId }>
          <ArchiveGlyph glyph={ glyph } showName nameComponent="h1" maxSize={ 520 } analysis={ analysis } anchors={ selectedAnchors }
            sx={ { maxWidth: (theme) => ({ xs: '100%', md: theme.editorial.archiveFigure.maxWidth }) } } />
        </Box>
        <Button data-selected-analysis-toggle aria-pressed={ analysis } aria-controls={ analysisId }
          onClick={ () => setAnalysis((open) => !open) }
          sx={ { display: 'flex', mx: 'auto', color: 'inherit', typography: 'editorialAction', minHeight: 44, mt: (theme) => theme.editorial.paragraphGap, px: 0, borderBottom: '1px solid', borderRadius: 0, textTransform: 'none' } }>
          { t(analysis ? 'archiveDepthExplorer.hideAnalysis' : 'archiveDepthExplorer.showAnalysis') }
        </Button>
      </Box>
      <Box data-archive-reading-column sx={ { minWidth: 0 } }>
        <Typography sx={ { typography: 'editorialMeta' } }>{ t('archiveDepthExplorer.selectedGlyph') }</Typography>
        <Typography component="h2" sx={ { ...headingSx, mt: 1 } }>{ localize(type?.title || interpretation?.title) || t('glyphMeaningSummary.thisMeaningCannotBeReadYet') }</Typography>
        <ArchetypeMotto archetype={ type } />
        <GlyphObservationChips entries={ entries } selectedIds={ selectedIds }
          onToggle={ (entry) => setSelectedIds((ids) => ids.includes(entry.id) ? ids.filter((id) => id !== entry.id) : [...ids, entry.id]) } />
        { type && <ArchetypeNarrative archetype={ type } showMotto={ false } sx={ { mt: (theme) => theme.editorial.paragraphGap } } /> }
      </Box>
    </Box>

    <Box component="section" aria-label={ t('archiveDepthExplorer.sameTypeGlyphs') } sx={ { mt: (theme) => theme.editorial.sectionBreak } }>
      <Typography component="h2" sx={ headingSx }>{ t('archiveDepthExplorer.sameTypeGlyphs') }</Typography>
      <Typography sx={ { mt: 1, typography: 'editorialMeta' } }>{ !type ? t('archiveDepthExplorer.typeUnconfirmed')
        : peers.length ? t('archiveDepthExplorer.sameTypeCount', { count: peers.length }) : t('archiveDepthExplorer.noTypePeers') }</Typography>
      { peers.length > 0 && <Box sx={ { display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: 2, md: 3 }, mt: 2 } }>
        { peers.map((peer) => <Box key={ peer.id } data-same-type-glyph={ peer.id }><ArchiveGlyph glyph={ peer } showName onSelect={ onSelect } /></Box>) }
      </Box> }
    </Box>

    { peers.length > 0 && shared.length > 0 && <Box component="section" aria-label={ t('archiveDepthExplorer.sharedPatternGrid') } data-shared-pattern-grid sx={ { mt: (theme) => theme.editorial.sectionBreak } }>
      <Typography component="h2" sx={ headingSx }>{ t('archiveDepthExplorer.sharedPatternGrid') }</Typography>
      <Typography sx={ { mt: 1, mb: 3, typography: 'editorialBody' } }>{ t('archiveDepthExplorer.sharedPatternIntro', { count: samples.length }) }</Typography>
      { shared.map((entry) => <Box key={ entry.meaningId } data-shared-meaning={ entry.meaningId } sx={ { py: 3, borderTop: '1px solid', borderColor: 'divider' } }>
        <Typography component="h3" sx={ { typography: 'editorialLabel' } }>{ entry.label }</Typography>
        <Typography sx={ { mt: 0.75, typography: 'editorialBody', maxWidth: (theme) => theme.editorial.measure } }>{ entry.definition }</Typography>
        <Box sx={ { display: 'grid', gridTemplateColumns: `repeat(${samples.length}, minmax(0, 1fr))`, gap: { xs: 1, md: 4 }, mt: 2 } }>
          { samples.map((sample, index) => {
            const observation = sampleReadings[index].find((item) => item.meaningId === entry.meaningId);
            return <Box component="figure" key={ sample.id } data-shared-pattern-glyph={ sample.id } data-fragment-anchor-count={ observation.anchors.length } sx={ { m: 0, minWidth: 0 } }>
              <ArchiveGlyph glyph={ sample } fragmentAnchors={ observation.anchors } maxSize={ 300 } />
              <Typography component="figcaption" sx={ { mt: 1, typography: 'editorialMeta', textAlign: 'center', overflowWrap: 'anywhere' } }>{ glyphLabel(sample) }</Typography>
            </Box>;
          }) }
        </Box>
      </Box>) }
    </Box> }
  </Box>;
}
