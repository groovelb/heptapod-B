import { useEffect, useId, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useI18n } from '../../i18n/useI18n';
import { getGlyphArchetype } from '../../data/heptapodArchetypeCatalog';
import { buildMeaningReading } from '../../utils/heptapod/buildMeaningReading';
import { glyphLabel } from '../../utils/heptapod/resonanceView';
import ArchiveGlyph from './ArchiveGlyph';
import GlyphMeaningSummary from './GlyphMeaningSummary';

const SERIF = "'Cinzel', 'Noto Serif KR', Georgia, serif";
const headingSx = { fontFamily: SERIF, fontSize: { xs: 22, md: 28 }, fontWeight: 400 };

/** One person's stored form, followed by exact-type peers and observed fragments.
 * Interpretation DTOs are supplied by the parent; this view never classifies names.
 */
export default function ArchiveSelectedGlyph({ glyph, interpretation, interpretations = {}, members = [], onSelect }) {
  const { locale, localize, t } = useI18n();
  const ref = useRef(null);
  const analysisId = useId();
  const [analysis, setAnalysis] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const entries = buildMeaningReading(interpretation, locale);
  const selected = entries.find((entry) => entry.id === selectedId);
  const type = getGlyphArchetype(interpretation);
  const peers = members.filter((member) => member.id !== glyph.id);
  // Keep the complete peer list below; the fragment matrix samples two peers so
  // all three forms remain readable together even on a narrow screen.
  const samples = [glyph, ...peers.slice(0, 2)];
  const sampleReadings = samples.map((sample) => buildMeaningReading(sample.id === glyph.id ? interpretation : interpretations[sample.id], locale));
  const shared = entries.filter((entry) => entry.anchors.length && sampleReadings.every((reading) => reading.some((item) => item.meaningId === entry.meaningId && item.anchors.length)));
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);

  return <Box ref={ ref } tabIndex={ -1 } component="section" aria-label={ t('archiveDepthExplorer.selectedGlyphDetail') } data-selected-glyph-detail
    sx={ { maxWidth: 1120, mx: 'auto', pt: { xs: 2, md: 4 }, pb: { xs: 5, md: 10 }, '&:focus': { outline: 'none' } } }>
    <Box sx={ { display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: { xs: 2, md: 6 }, alignItems: 'start' } }>
      <ArchiveGlyph glyph={ glyph } showName nameComponent="h1" maxSize={ 520 } analysis={ analysis } anchors={ analysis ? selected?.anchors || [] : [] } />
      <Box sx={ { pt: { xs: 0, md: 5 } } }>
        <Typography sx={ { fontSize: 11, letterSpacing: '0.16em' } }>{ t('archiveDepthExplorer.selectedGlyph') }</Typography>
        <Typography component="h2" sx={ { ...headingSx, mt: 1 } }>{ localize(type?.title || interpretation?.title) || t('glyphMeaningSummary.thisMeaningCannotBeReadYet') }</Typography>
        { !analysis && type && <Typography sx={ { mt: 2, fontSize: 14, lineHeight: 1.85 } }>{ localize(type.reading) }</Typography> }
        <Button data-selected-analysis-toggle aria-pressed={ analysis } aria-expanded={ analysis } aria-controls={ analysisId }
          onClick={ () => setAnalysis((open) => !open) }
          sx={ { color: 'inherit', minHeight: 44, mt: 2, px: 0, borderBottom: '1px solid', borderRadius: 0, textTransform: 'none' } }>
          { t(analysis ? 'archiveDepthExplorer.hideAnalysis' : 'archiveDepthExplorer.showAnalysis') }
        </Button>
        <Box id={ analysisId } hidden={ !analysis } sx={ { mt: analysis ? 2 : 0 } }>
          { analysis && <GlyphMeaningSummary interpretation={ interpretation } variant="reading" selectedObservationId={ selectedId }
            onSelectObservation={ (entry) => setSelectedId(entry?.id || null) } /> }
        </Box>
      </Box>
    </Box>

    <Box component="section" aria-label={ t('archiveDepthExplorer.sameTypeGlyphs') } sx={ { mt: { xs: 5, md: 8 } } }>
      <Typography component="h2" sx={ headingSx }>{ t('archiveDepthExplorer.sameTypeGlyphs') }</Typography>
      <Typography sx={ { mt: 1, fontSize: 13 } }>{ !type ? t('archiveDepthExplorer.typeUnconfirmed')
        : peers.length ? t('archiveDepthExplorer.sameTypeCount', { count: peers.length }) : t('archiveDepthExplorer.noTypePeers') }</Typography>
      { peers.length > 0 && <Box sx={ { display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: 2, md: 3 }, mt: 2 } }>
        { peers.map((peer) => <Box key={ peer.id } data-same-type-glyph={ peer.id }><ArchiveGlyph glyph={ peer } showName onSelect={ onSelect } /></Box>) }
      </Box> }
    </Box>

    { peers.length > 0 && shared.length > 0 && <Box component="section" aria-label={ t('archiveDepthExplorer.sharedPatternGrid') } data-shared-pattern-grid sx={ { mt: { xs: 5, md: 8 } } }>
      <Typography component="h2" sx={ headingSx }>{ t('archiveDepthExplorer.sharedPatternGrid') }</Typography>
      <Typography sx={ { mt: 1, mb: 3, fontSize: 13, lineHeight: 1.8 } }>{ t('archiveDepthExplorer.sharedPatternIntro', { count: samples.length }) }</Typography>
      { shared.map((entry) => <Box key={ entry.meaningId } data-shared-meaning={ entry.meaningId } sx={ { py: 3, borderTop: '1px solid', borderColor: 'divider' } }>
        <Typography component="h3" sx={ { fontSize: 17, fontWeight: 400 } }>{ entry.label }</Typography>
        <Typography sx={ { mt: 0.75, fontSize: 13, lineHeight: 1.8, maxWidth: 680 } }>{ entry.definition }</Typography>
        <Box sx={ { display: 'grid', gridTemplateColumns: `repeat(${samples.length}, minmax(0, 1fr))`, gap: { xs: 1, md: 4 }, mt: 2 } }>
          { samples.map((sample, index) => {
            const observation = sampleReadings[index].find((item) => item.meaningId === entry.meaningId);
            return <Box component="figure" key={ sample.id } data-shared-pattern-glyph={ sample.id } data-fragment-anchor-count={ observation.anchors.length } sx={ { m: 0, minWidth: 0 } }>
              <ArchiveGlyph glyph={ sample } fragmentAnchors={ observation.anchors } maxSize={ 300 } />
              <Typography component="figcaption" sx={ { mt: 1, fontFamily: SERIF, fontSize: { xs: 12, md: 16 }, textAlign: 'center', overflowWrap: 'anywhere' } }>{ glyphLabel(sample) }</Typography>
            </Box>;
          }) }
        </Box>
      </Box>) }
    </Box> }
  </Box>;
}
