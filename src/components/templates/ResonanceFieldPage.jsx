import AppGNB from '../navigation/AppGNB';
import { useI18n } from '../../i18n/useI18n.js';
import { sourceText as t } from '../../i18n/messages.js';
import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useGlyph } from '../../hooks/data/useGlyph';
import { useGlyphRelations } from '../../hooks/data/useGlyphRelations';
import ResonanceMap from '../data-display/ResonanceMap';
import ResonanceList from '../data-display/ResonanceList';
import RelationInspector from '../overlay-feedback/RelationInspector';
import { groupResonanceRows, glyphLabel } from '../../utils/heptapod/resonanceView';

const FILTERS = [['ALL', t('resonanceFieldPage.all')], ['branch', t('glyphPairComparison.branchStructure')], ['opening', t('glyphPairComparison.opening')], ['ink', t('glyphPairComparison.inkDistribution')], ['ring', t('glyphPairComparison.ringContour')], ['VARIANT', t('glyphPairComparison.questionVariant')]];

/** Public, sampled one-hop relationships. Node IDs—not names—control navigation. */
export default function ResonanceFieldPage({ client }) {
  const { localize, t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { glyph, loading, error, refetch } = useGlyph(id, { client });
  const relationQuery = useGlyphRelations(id, { client });
  const [filter, setFilter] = useState('ALL');
  const [inspectedId, setInspectedId] = useState(null);
  const [view, setView] = useState(null);
  const neighbors = useMemo(() => groupResonanceRows(relationQuery.relations, {
    limit: 24, types: filter === 'VARIANT' ? ['VARIANT'] : [],
    kinds: filter === 'ALL' || filter === 'VARIANT' ? [] : [filter],
  }), [relationQuery.relations, filter]);
  const inspected = neighbors.find((neighbor) => neighbor.id === inspectedId);
  const listView = view ? view === 'list' : mobile || reduced;
  const explore = (neighborId) => { setInspectedId(null); navigate(`/field/${neighborId}`); };

  return (
    <Box component="main" sx={ { minHeight: '100vh', bgcolor: 'custom.chamber.fog', color: 'custom.chamber.ink', px: { xs: 2, sm: 4 }, py: 4,
      [theme.breakpoints.down('md')]: {
        minHeight: '100dvh', overflowWrap: 'anywhere',
        pl: 'max(16px, env(safe-area-inset-left, 0px))', pr: 'max(16px, env(safe-area-inset-right, 0px))',
        pb: 'max(24px, env(safe-area-inset-bottom, 0px))', '& .MuiButton-root': { minHeight: 44 },
      } } }>
      <AppGNB />
      <Box sx={ { maxWidth: 880, mx: 'auto' } }>
        <Box component="nav" aria-label={ t('resonanceFieldPage.formResonanceMapNavigation') } sx={ { display: 'flex', justifyContent: 'space-between', mb: 3 } }>
          <Button component={ RouterLink } to={ `/glyph/${id}` } color="inherit">{ t('archiveComparePage.backToGlyph') }</Button>
          <Button component={ RouterLink } to="/archive" color="inherit">{ t('archiveComparePage.archive') }</Button>
        </Box>
        {loading ? <CircularProgress color="inherit" aria-label={ t('resonanceFieldPage.loadingGlyph') } /> : error || !glyph ? (
          <Alert severity={ error ? 'error' : 'info' } action={ error ? <Button onClick={ refetch } color="inherit">{ t('archiveClusterExplorer.tryAgain') }</Button> : null }>
            {error ? t('resonanceFieldPage.theGlyphCouldNotBeLoaded') : t('resonanceFieldPage.thisGlyphDoesNotExistOrIs')}
          </Alert>
        ) : (
          <>
            <Typography component="h1" variant="h4" sx={ { fontFamily: "'Noto Serif KR', Georgia, serif", overflowWrap: 'anywhere' } }>{glyphLabel(glyph)}{ t('resonanceFieldPage.sGlyphDiscoveredResonance') }</Typography>
            <Typography variant="body2" sx={ { mt: 2, mb: 3, lineHeight: 1.8, opacity: 0.75 } }>{ t('resonanceFieldPage.discoverSimilarFeaturesInTheBranchesOpenings') }{!relationQuery.loading && !relationQuery.error && t('resonanceFieldPage.basedOnPublicGlyphsCompared', { p0: relationQuery.sampleSize || 0 })}
              {relationQuery.mappingStatus === 'partial-sample' && t('resonanceFieldPage.someModelsCouldNotBeReadAnd')}
            </Typography>
            <Box sx={ { display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 } } role="group" aria-label={ t('resonanceFieldPage.filterByObservedFormFeature') }>
              {FILTERS.map(([value, label]) => <Button key={ value } color="inherit" variant={ filter === value ? 'outlined' : 'text' } aria-pressed={ filter === value } onClick={ () => { setFilter(value); setInspectedId(null); } }>{localize(label)}</Button>)}
            </Box>
            {listView && <Button color="inherit" onClick={ () => setView('map') } sx={ { mb: 2 } }>{ t('resonanceMap.mapView') }</Button>}
            {listView || relationQuery.loading || relationQuery.error || !neighbors.length ? (
              <ResonanceList centerName={ glyphLabel(glyph) } relations={ neighbors } loading={ relationQuery.loading }
                error={ relationQuery.error } onRetry={ relationQuery.refetch } onInspect={ (neighbor) => setInspectedId(neighbor.id) } onNodeSelect={ explore }
                emptyMessage={ filter === 'ALL' ? t('resonanceFieldPage.noExplainableResonanceInFormWasFound') : t('resonanceFieldPage.noGlyphsResonateInThisFeatureWithin') } />
            ) : (
              <ResonanceMap key={ `${id}:${filter}` } centerModel={ glyph.model_data } centerName={ glyphLabel(glyph) } relations={ neighbors }
                onInspect={ (neighbor) => setInspectedId(neighbor.id) } onNodeSelect={ explore } width={ 720 } height={ 640 } sx={ { mx: 'auto' } } />
            )}
            <Typography variant="caption" sx={ { display: 'block', mt: 2, opacity: 0.8 } }>{ t('resonanceFieldPage.wholeFormResonanceAndLocalStructureResonance') }</Typography>
            <Button component={ RouterLink } to={ `/compare/${id}` } color="inherit" sx={ { mt: 3 } }>{ t('resonanceFieldPage.encodeMyNameAndCompare') }</Button>
            <RelationInspector open={ !!inspected } relation={ inspected ? { ...inspected, leftGlyph: glyph, nameA: glyphLabel(glyph), nameB: inspected.name } : null }
              onClose={ () => setInspectedId(null) } onExplore={ explore } onCompare={ (neighborId) => navigate(`/compare/${id}/${neighborId}`) } />
          </>
        )}
      </Box>
    </Box>
  );
}
