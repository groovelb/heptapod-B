import { useI18n } from '../../i18n/useI18n.js';
import { useId, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useInRouterContext } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import GlyphPairComparison from './GlyphPairComparison';
import GlyphMeaningSummary from './GlyphMeaningSummary';
import { interpretGlyphMeaning, compareGlyphMeanings } from '../../utils/heptapod/interpretGlyphMeaning';
import { archiveMeaningPath } from '../../utils/heptapod/shareArchive';
import { normalizeName } from '../../utils/heptapod/normalizeName';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { relateGlyphs } from '../../utils/heptapod/relateGlyphs';

function localGlyph(name, model, id) {
  return {
    id, display_name: name, is_local: true,
    canonical_name: model.meta.canonicalName || normalizeName(name).canonicalName,
    is_interrogative: Boolean(model.questionHook),
    encoder_version: model.meta.encoderVersion || 1,
    model_data: model,
  };
}

/**
 * ResonancePreview — 현재 표시 모델을 기준으로 다른 이름을 로컬에서 비교한다.
 * @param {string} primaryName - 현재 이름
 * @param {object} primaryModel - 실제 표시 모델. 제공하면 절대 재생성하지 않는다.
 * @param {string} fg - 선택 전경색 (기본 챔버 ink 토큰)
 */
export default function ResonancePreview({ primaryName, primaryModel, fg }) {
  const { localize, t } = useI18n();
  const hasRouter = useInRouterContext();
  const theme = useTheme();
  const ink = fg || theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const fog = theme.palette.custom?.chamber?.fog || theme.palette.background.paper;
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();
  const composingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [compareName, setCompareName] = useState('');
  const [submittedName, setSubmittedName] = useState('');
  const primaryMeaning = useMemo(() => primaryModel ? interpretGlyphMeaning(primaryModel) : null, [primaryModel]);
  const meaningPath = primaryMeaning?.meaningKey ? archiveMeaningPath({ groupId: primaryMeaning.meaningKey }) : null;
  const result = useMemo(() => {
    if (!submittedName) return null;
    try {
      const leftModel = primaryModel || buildArchiveModel(primaryName);
      const rightModel = buildArchiveModel(submittedName);
      const leftGlyph = localGlyph(primaryName, leftModel, 'local-primary');
      const rightGlyph = localGlyph(submittedName, rightModel, 'local-comparison');
      return { leftGlyph, rightGlyph, relations: relateGlyphs(leftGlyph, rightGlyph), meaningComparison: compareGlyphMeanings(leftModel, rightModel) };
    } catch (error) {
      return { error: error.message || t('resonancePreview.thisNameCouldNotBeComparedCheck') };
    }
  }, [primaryName, primaryModel, submittedName, t]);
  const buttonSx = { minHeight: 44, color: ink, borderColor: alpha(ink, 0.35), fontSize: '0.8rem' };
  const close = () => {
    setIsOpen(false);
    setCompareName('');
    setSubmittedName('');
    composingRef.current = false;
  };

  return (
    <>
      { primaryMeaning && <GlyphMeaningSummary interpretation={ primaryMeaning } compact fg={ ink } sx={ { mb: 1 } } /> }
      { meaningPath && <Button component={ hasRouter ? RouterLink : 'a' } { ...(hasRouter ? { to: meaningPath } : { href: meaningPath }) } fullWidth sx={ buttonSx }>{ t('resonancePreview.glyphsWithTheSameMeaning') }</Button> }
      <Button variant="outlined" fullWidth onClick={ () => setIsOpen(true) } sx={ buttonSx }>{ t('resonancePreview.compareAnotherName') }</Button>
      <Dialog open={ isOpen } onClose={ close } fullScreen={ fullScreen } fullWidth maxWidth="md" aria-labelledby={ titleId }
        slotProps={ { paper: { sx: { bgcolor: fog, color: ink, backgroundImage: 'none' } } } }
      >
        <DialogTitle id={ titleId } sx={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 } }>
          <Typography component="span" sx={ { fontSize: '1.1rem', fontWeight: 500 } }>{ t('resonancePreview.betweenNames') }</Typography>
          <Button onClick={ close } aria-label={ t('resonancePreview.closeNameComparison') } sx={ buttonSx }>{ t('archiveClusterExplorer.close') }</Button>
        </DialogTitle>
        <DialogContent>
          { primaryMeaning && <GlyphMeaningSummary interpretation={ primaryMeaning } fg={ ink } sx={ { mb: 3 } } /> }
          <Typography variant="body2" sx={ { mb: 2, lineHeight: 1.7 } }>{ t('resonancePreview.encodeAnotherNameInHeptapodBTo') }{ primaryName }{ t('resonancePreview.sGlyph') }</Typography>
          <Box component="form"
            onKeyDown={ (event) => {
              if (event.key === 'Enter' && (composingRef.current || event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
            } }
            onSubmit={ (event) => {
              event.preventDefault();
              if (!composingRef.current) setSubmittedName(compareName.trim());
            } }
          >
        <TextField autoFocus label={ t('resonancePreview.nameToCompare') } value={ compareName } fullWidth size="small" variant="outlined"
          onChange={ (event) => { setCompareName(event.target.value); setSubmittedName(''); } }
          error={ Boolean(result?.error) } helperText={ localize(result?.error) || t('resonancePreview.namesAreComparedOnlyOnThisDevice') }
          slotProps={ {
            htmlInput: {
              autoComplete: 'off', maxLength: 128,
              onCompositionStart: () => { composingRef.current = true; },
              onCompositionEnd: () => { composingRef.current = false; },
            },
            formHelperText: { role: result?.error ? 'alert' : undefined },
          } }
          sx={ {
            '& .MuiInputBase-root, & .MuiInputLabel-root, & .MuiFormHelperText-root': { color: ink },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(ink, 0.4) },
            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: ink },
            '& .MuiInputLabel-root.Mui-focused': { color: ink },
          } }
        />
        <Button type="submit" variant="outlined" disabled={ !compareName.trim() } sx={ { ...buttonSx, mt: 1.5 } }>{ t('resonancePreview.compare') }</Button>
          </Box>
          <Box aria-live="polite">
            { result && !result.error && <GlyphPairComparison key={ `${primaryName}:${submittedName}` } leftGlyph={ result.leftGlyph } rightGlyph={ result.rightGlyph } relations={ result.relations }
              meaningComparison={ result.meaningComparison } initialView="meaning" sx={ { px: 0, pb: 0, pt: 3 } } /> }
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
