import { useI18n } from '../../i18n/useI18n.js';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';

/**
 * PublishDialog — 로고그램을 공개 아카이브에 게시하기 전 확인 다이얼로그
 *
 * @param {boolean} open - 다이얼로그 열림 여부 [Required]
 * @param {function} onClose - 닫기 콜백 [Required]
 * @param {string} glyphName - 인코딩된 이름 [Required]
 * @param {object} model - 현재 표식의 실제 모델 [Required]
 * @param {function} onPublish - 게시 실행 콜백 [Optional]
 * @param {'publish'|'share'} intent - 공개 후 공유할 의도. 기본 publish.
 * @param {'archive'|'stay'} completion - 완료 후 Archive 진입 또는 현재 화면 유지. 기본 archive.
 * @param {function} onShare - 완료된 공개 결과를 받는 사용자 클릭 공유 콜백.
 *
 * Example usage:
 * <PublishDialog open={ publishOpen } onClose={ () => setPublishOpen(false) } glyphName="Louise" model={ model } onPublish={ handlePublish } />
 */
function PublishDialog({ open, onClose, glyphName, model, onPublish, onPublished, intent = 'publish', completion = 'archive', onShare }) {
  const { localize, t } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState('confirm');
  const [glyphId, setGlyphId] = useState(null);
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState(null);
  const [shareStatus, setShareStatus] = useState('');
  const [sharing, setSharing] = useState(false);
  const pending = useRef(false);
  const sharePending = useRef(false);
  const fg = '#e8e8e8';

  const monoSx = {
    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
    fontSize: '0.75rem',
    lineHeight: 1.5,
    letterSpacing: '0.05em',
  };

  const handlePublish = async () => {
    if (!consented || pending.current || step !== 'confirm') return;
    pending.current = true;
    setStep('publishing');
    setError('');
    try {
      const result = await onPublish?.({ consented: true });
      if (!result?.glyphId) throw new Error(t('publishDialog.publishingCouldNotBeCompletedYourName'));
      setGlyphId(result.glyphId);
      setPublished(result);
      setStep('done');
    } catch (err) {
      setError(err.message || t('publishDialog.anErrorOccurredWhilePublishingTryAgain'));
      setStep('confirm');
    } finally {
      pending.current = false;
    }
  };

  // A new click preserves native-share user activation after asynchronous publication.
  // Sharing failure stays in the done state: retry must never publish a second time.
  const handleShare = async () => {
    if (!published?.glyphId || !onShare || sharePending.current) return;
    sharePending.current = true;
    setSharing(true);
    setShareStatus('');
    setError('');
    try {
      const result = await onShare(published);
      if (['shared', 'copied', 'cancelled'].includes(result)) setShareStatus(result);
    } catch (err) {
      setError(err.message || t('encoderResult.shareFailed'));
    } finally {
      sharePending.current = false;
      setSharing(false);
    }
  };

  const handleClose = () => {
    if (pending.current || sharePending.current) return;
    setStep('confirm');
    setConsented(false);
    setGlyphId(null);
    setPublished(null);
    setError('');
    setShareStatus('');
    onClose();
  };

  return (
    <Dialog
      open={ open }
      onClose={ handleClose }
      disableEscapeKeyDown={ step === 'publishing' || sharing }
      aria-labelledby="archive-publish-title"
      maxWidth="sm"
      fullWidth
      slotProps={ {
        paper: {
          sx: {
            backgroundColor: 'rgba(12,16,15,0.97)',
            backgroundImage: 'none',
            border: `1px solid ${alpha(fg, 0.18)}`,
            borderRadius: 0,
            boxShadow: 'none',
            color: fg,
          },
        },
      } }
    >
      <Box sx={ { p: { xs: 3, sm: 4 } } }>
        <Box sx={ { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 3 } }>
          <Typography id="archive-publish-title" component="h2" sx={ { ...monoSx, color: fg, opacity: 0.95, letterSpacing: '0.24em', fontSize: '0.8rem', textTransform: 'uppercase' } }>{ t('publishDialog.publishToArchive') }</Typography>
          <Box
            component="button"
            onClick={ handleClose }
            disabled={ step === 'publishing' || sharing }
            aria-label={ t('publishDialog.closePublishingDialog') }
            sx={ { ...monoSx, background: 'none', border: 'none', cursor: 'pointer', color: fg, opacity: 0.6, fontSize: '0.7rem', '&:hover': { opacity: 1 } } }
          >
            ✕
          </Box>
        </Box>

        { step === 'confirm' && (
          <>
            {intent === 'share' && <Typography sx={ { fontSize: '0.85rem', lineHeight: 1.8, mb: 2 } }>{t('encoderResult.publishBeforeShare')}</Typography>}
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.9, fontSize: '0.9rem', mb: 2, lineHeight: 1.8 } }>
              { t('publishDialog.publishTheLogogramForToThePublic', { p0: glyphName }) }
            </Typography>

            <Box sx={ { borderTop: `1px solid ${alpha(fg, 0.15)}`, pt: 2, mb: 3 } }>
              { [
                t('publishDialog.yourNameAndGlyphWillBePublic'),
                t('publishDialog.theSameNameAndExpressionShareOne'),
                t('publishDialog.youCanWithdrawYourResponseFromMy'),
                t('publishDialog.clearingBrowserDataMayRemoveAccessTo'),
                t('publishDialog.imagesSavedByOthersAndPreviewsOn'),
              ].map((text, i) => (
                <Typography key={ i } component="p" sx={ { ...monoSx, color: fg, opacity: 0.8, fontSize: '0.8rem', lineHeight: 1.8, mb: 1 } }>
                  { `· ${text}` }
                </Typography>
              )) }
            </Box>

            {model?.meta?.encodingMode === 'deterministic' && <Typography sx={ { fontSize: '0.85rem', mb: 2 } }>{ t('publishDialog.thisGlyphIsReproducedFromTheFull') }</Typography>}
            <FormControlLabel sx={ { mb: 2 } } control={ <Checkbox checked={ consented } onChange={ (event) => setConsented(event.target.checked) } sx={ { color: fg, '&.Mui-checked': { color: fg } } } /> } label={ t('publishDialog.iAgreeToMakeMyNameAnd') } />
            {error && <Alert severity="error" sx={ { mb: 2 } }>{localize(error)}</Alert>}

            <Box sx={ { display: 'flex', gap: 1.5, justifyContent: 'flex-end' } }>
              <Button
                onClick={ handleClose }
                variant="text"
                sx={ { ...monoSx, color: fg, opacity: 0.5, fontSize: '0.62rem', letterSpacing: '0.14em', borderRadius: 0, '&:hover': { opacity: 0.8 } } }
              >{ t('publishDialog.cancel') }</Button>
              <Button
                onClick={ handlePublish }
                disabled={ !consented || !onPublish }
                variant="text"
                sx={ {
                  ...monoSx,
                  color: fg,
                  opacity: 0.95,
                  fontSize: '0.62rem',
                  letterSpacing: '0.18em',
                  borderRadius: 0,
                  border: `1px solid ${alpha(fg, 0.5)}`,
                  px: 3,
                  '&:hover': { backgroundColor: alpha(fg, 0.08), borderColor: alpha(fg, 0.7) },
                } }
              >{ t('publishDialog.publish') }</Button>
            </Box>
          </>
        ) }

        { step === 'publishing' && (
          <Box sx={ { textAlign: 'center', py: 4 } }>
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.6, fontSize: '0.7rem', letterSpacing: '0.2em' } }>{ t('publishDialog.publishing') }</Typography>
          </Box>
        ) }

        { step === 'done' && (
          <Box sx={ { textAlign: 'center', py: 3 } }>
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.95, fontSize: '0.72rem', letterSpacing: '0.12em', mb: 2 } }>
              { t('publishDialog.published', { p0: glyphName }) }
            </Typography>
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.8, fontSize: '0.75rem', mb: 3 } }>{ t(intent === 'share' ? 'encoderResult.readyToShare' : completion === 'stay' ? 'encoderResult.publishComplete' : 'publishDialog.yourGlyphIsSavedConnectionsAreShown') }</Typography>
            {error && <Alert severity="error" sx={ { mb: 2 } }>{localize(error)}</Alert>}
            {shareStatus && <Typography role="status" aria-live="polite" sx={ { fontSize: '0.8rem', mb: 2 } }>{t(`encoderResult.${shareStatus}`)}</Typography>}
            <Box sx={ { display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' } }>
              {intent === 'share' && onShare && (
                <Button onClick={ handleShare } disabled={ sharing } variant="outlined" sx={ { ...monoSx, minHeight: 44, color: fg, borderColor: alpha(fg, 0.5), borderRadius: 0, px: 3 } }>
                  {t(sharing ? 'encoderResult.sharing' : 'encoderResult.share')}
                </Button>
              )}
              { glyphId && completion === 'archive' && (
                <Button
                  onClick={ () => { const result = published; handleClose(); if (onPublished) onPublished(result); else navigate(`/glyph/${glyphId}`); } }
                  variant="text"
                  sx={ {
                    ...monoSx, color: fg, opacity: 0.95, fontSize: '0.62rem', letterSpacing: '0.16em', borderRadius: 0, border: `1px solid ${alpha(fg, 0.5)}`, px: 3, '&:hover': { backgroundColor: alpha(fg, 0.08), borderColor: alpha(fg, 0.7) },
                  } }
                >{ t('publishDialog.viewInArchive') }</Button>
              ) }
              <Button
                onClick={ handleClose }
                disabled={ sharing }
                variant="text"
                sx={ {
                  ...monoSx, color: fg, opacity: 0.6, fontSize: '0.62rem', letterSpacing: '0.16em', borderRadius: 0, '&:hover': { opacity: 0.9 },
                } }
              >{ t('publishDialog.close') }</Button>
            </Box>
          </Box>
        ) }
      </Box>
    </Dialog>
  );
}

export default PublishDialog;
