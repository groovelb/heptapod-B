import AppGNB from '../navigation/AppGNB';
import { useI18n } from '../../i18n/useI18n.js';
import { useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useGlyph } from '../../hooks/data/useGlyph';
import { usePublish } from '../../hooks/data/usePublish';
import { buildArchiveModel, ARCHIVE_ENCODER_VERSION } from '../../utils/heptapod/archiveGlyph';
import { normalizeName } from '../../utils/heptapod/normalizeName';
import { relateGlyphs } from '../../utils/heptapod/relateGlyphs';
import { glyphLabel, getMorphologyObservations, isMorphologyRelation } from '../../utils/heptapod/resonanceView';
import { exportPairCard, shareArchive, parseArchiveMeaningSearch } from '../../utils/heptapod/shareArchive';
import { compareGlyphMeanings } from '../../utils/heptapod/interpretGlyphMeaning';
import GlyphNode from '../data-display/GlyphNode';
import GlyphPairComparison from '../data-display/GlyphPairComparison';
import PublishDialog from '../overlay-feedback/PublishDialog';

/** Public pair links and private, local comparisons use the same rendered models. */
export default function ArchiveComparePage({ client }) {
  const { locale, localize, t } = useI18n();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { leftId, rightId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { unsupportedVersion } = parseArchiveMeaningSearch(searchParams.toString());
  const readingView = unsupportedVersion || searchParams.get('reading') === 'precision' ? 'precision' : 'meaning';
  const changeReading = (reading) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    next.set('reading', reading);
    if (!unsupportedVersion) next.set('mv', '1');
    return next;
  }, { replace: true });
  const leftState = useGlyph(leftId, { client });
  const rightState = useGlyph(rightId || null, { client });
  const { publish } = usePublish({ client });
  const composing = useRef(false);
  const [draft, setDraft] = useState('');
  const [localName, setLocalName] = useState('');
  const [inputError, setInputError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const localGlyph = useMemo(() => {
    if (!localName) return null;
    try {
      const normalized = normalizeName(localName);
      return { id: 'local', canonical_name: normalized.canonicalName, is_interrogative: normalized.isInterrogative,
        encoder_version: ARCHIVE_ENCODER_VERSION, model_data: buildArchiveModel(localName) };
    } catch { return null; }
  }, [localName]);
  const left = leftState.glyph;
  const right = localGlyph || rightState.glyph;
  const comparison = useMemo(() => {
    if (!left || !right) return { relations: [], error: '' };
    try { return { relations: relateGlyphs(left, right).filter(isMorphologyRelation), error: '' }; }
    catch { return { relations: [], error: t('archiveComparePage.thisGlyphSFormDataCouldNot') }; }
  }, [left, right, t]);
  const meaningComparison = useMemo(() => left && right ? compareGlyphMeanings(left.model_data, right.model_data) : null, [left, right]);
  const shareReason = comparison.relations.flatMap(getMorphologyObservations)[0]?.reason
    || comparison.relations.find((relation) => relation.relationType === 'VARIANT')?.reasons?.[0];
  const selectedShareReason = readingView === 'meaning' ? localize(meaningComparison?.reason) : shareReason;
  const runAction = async (action) => {
    if (sharing) return;
    setSharing(true);
    setActionError('');
    setNotice('');
    try {
      const result = await action();
      if (result === 'copied') setNotice(t('archiveComparePage.publicLinkCopied'));
      else if (result === 'shared') setNotice(t('archiveComparePage.openedTheShareDialog'));
    } catch (error) { setActionError(error.message || t('archiveComparePage.tryAgain')); }
    finally { setSharing(false); }
  };
  const compareLocal = (event) => {
    event.preventDefault();
    if (composing.current) return;
    try {
      buildArchiveModel(draft);
      setLocalName(draft.trim());
      setInputError('');
      setNotice(t('archiveComparePage.yourEncodedNameWasComparedOnThis'));
      if (isMobile) event.currentTarget.querySelector('input')?.blur();
    } catch (error) { setInputError(error.message); }
  };
  const loading = leftState.loading || (!!rightId && rightState.loading);
  const unavailable = leftState.error || (rightId && rightState.error) || (!loading && (!left || (!!rightId && !rightState.glyph)));
  return (
    <Box component="main" sx={ { minHeight: '100vh', bgcolor: 'custom.chamber.fog', color: 'custom.chamber.ink', px: { xs: 2, md: 5 }, py: 3,
      [theme.breakpoints.down('md')]: { minHeight: '100dvh', pb: 'max(24px, env(safe-area-inset-bottom, 0px))', overflowWrap: 'anywhere' } } }>
      <AppGNB />
      <Box component="nav" aria-label={ t('archiveComparePage.comparisonNavigation') } sx={ { display: 'flex', justifyContent: 'space-between', mb: 4, '& .MuiButton-root': { color: 'inherit', minHeight: 44 } } }>
        <Button component={ RouterLink } to={ `/glyph/${leftId}` }>{ t('archiveComparePage.backToGlyph') }</Button>
        <Button component={ RouterLink } to="/archive">{ t('archiveComparePage.archive') }</Button>
      </Box>
      <Box sx={ { maxWidth: 1060, mx: 'auto' } }>
        <Typography component="h1" variant="h4" sx={ { fontFamily: '"Cinzel", "Noto Serif KR", serif', mb: 1 } }>{ t('archiveComparePage.betweenTwoGlyphs') }</Typography>
        <Typography sx={ { mb: 3 } }>{ t('archiveComparePage.exploreStructuresWithSharedMeaningsAndFeatures') }</Typography>
        {loading ? <Box role="status" sx={ { py: 8, textAlign: 'center' } }><CircularProgress color="inherit" /><Typography>{ t('archiveComparePage.loadingPublicGlyphs') }</Typography></Box> : unavailable ? (
          <Alert severity="info">{ t('archiveComparePage.thisGlyphIsPrivateOrCouldNot') }<Button onClick={ () => { leftState.refetch?.(); rightState.refetch?.(); } }>{ t('archiveClusterExplorer.tryAgain') }</Button></Alert>
        ) : (
          <>
            {comparison.error && <Alert severity="error" sx={ { mb: 2 } }>{localize(comparison.error)}</Alert>}
            {unsupportedVersion && <Alert severity="info" sx={ { mb: 2 } }>{ t('archiveComparePage.theMeaningRulesInThisLinkAre') }</Alert>}
            {right ? (
              <GlyphPairComparison leftGlyph={ left } rightGlyph={ right } relations={ comparison.relations }
                meaningComparison={ unsupportedVersion ? undefined : meaningComparison } view={ readingView } initialView={ readingView } onViewChange={ changeReading }
                onExplore={ (id) => id !== 'local' && navigate(`/field/${id}`) }
                onShare={ !localGlyph ? (selection = {}) => runAction(() => shareArchive({ left, right, reason: selection.reason || selectedShareReason },
                  { locale, reading: selection.reading || readingView, meaningVersion: 1 })) : undefined }
                sharing={ sharing } />
            ) : !right && <Box sx={ { display: 'flex', justifyContent: 'center', py: 2 } }><GlyphNode model={ left.model_data } size={ 240 } label={ glyphLabel(left) } /></Box>}
            {right && !comparison.error && <Box sx={ { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, my: 2 } }>
              <Button disabled={ sharing } onClick={ () => runAction(() => exportPairCard(left, right, selectedShareReason, { reading: readingView, meaningVersion: 1, locale })) } sx={ { color: 'inherit', minHeight: 44 } }>{ t('archiveComparePage.saveComparisonImage') }</Button>
              {localGlyph && <Button onClick={ () => setPublishOpen(true) } sx={ { color: 'inherit', minHeight: 44, borderBottom: '1px solid' } }>{ t('archiveComparePage.publishMyResponseAndCreateALink') }</Button>}
              {localGlyph && rightId && <Button onClick={ () => { setLocalName(''); setNotice(''); } } sx={ { color: 'inherit', minHeight: 44 } }>{ t('archiveComparePage.returnToTheSharedComparison') }</Button>}
            </Box>}
            <Box component="form" onSubmit={ compareLocal } sx={ { mt: 5, py: 3, borderTop: '1px solid', borderColor: 'custom.chamber.ink', maxWidth: 620, mx: 'auto' } }>
              <Typography component="h2" variant="h6" sx={ { mb: 1 } }>{ t('archiveComparePage.whichGlyphsWillResonateWithYourName') }</Typography>
              <Typography sx={ { mb: 2 } }>{ t('archiveComparePage.encodeYourNameAsAHeptapodB') }</Typography>
              <Box sx={ { display: 'flex', gap: 1, alignItems: 'start',
                [theme.breakpoints.down('md')]: { flexDirection: 'column', '& > .MuiButton-root': { width: '100%' } } } }>
                <TextField label={ t('archiveComparePage.nameToEncode') } value={ draft } onChange={ (event) => setDraft(event.target.value) } error={ !!inputError } helperText={ localize(inputError) } fullWidth
                  onCompositionStart={ () => { composing.current = true; } } onCompositionEnd={ () => { composing.current = false; } }
                  onKeyDown={ (event) => { if (event.key === 'Enter' && (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) event.preventDefault(); } }
                  sx={ { '& .MuiInputBase-root, & .MuiInputLabel-root': { color: 'custom.chamber.ink' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'custom.chamber.ink' } } } />
                <Button type="submit" disabled={ !draft.trim() } sx={ { color: 'inherit', minHeight: 56, whiteSpace: 'nowrap' } }>{ t('archiveComparePage.encodeAndCompare') }</Button>
              </Box>
            </Box>
          </>
        )}
        {notice && <Typography role="status" sx={ { mt: 2, textAlign: 'center' } }>{localize(notice)}</Typography>}
        {actionError && <Alert severity="error" sx={ { mt: 2 } }>{localize(actionError)}</Alert>}
      </Box>
      <PublishDialog key={ `${leftId}:${localName}` } open={ publishOpen } onClose={ () => setPublishOpen(false) } glyphName={ localName }
        model={ localGlyph?.model_data } onPublish={ ({ consented }) => publish({ displayName: localName, consented }) }
        onPublished={ ({ glyphId }) => { setLocalName(''); setNotice(''); navigate(`/compare/${leftId}/${glyphId}`); } } />
    </Box>
  );
}
