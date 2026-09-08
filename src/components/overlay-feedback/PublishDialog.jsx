import { useI18n } from '../../i18n/useI18n.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import SvgIcon from '@mui/material/SvgIcon';
import LinkIcon from '@mui/icons-material/Link';
import XIcon from '@mui/icons-material/X';
import FacebookIcon from '@mui/icons-material/Facebook';
import GlyphClusterLink from '../data-display/GlyphClusterLink';
import { archiveSharePath, archiveShareUrl, archiveSocialLinks, copyArchiveLink } from '../../utils/heptapod/shareArchive.js';

/**
 * PublishDialog — 로고그램을 공개 아카이브에 게시하기 전 확인 다이얼로그
 *
 * @param {boolean} open - 다이얼로그 열림 여부 [Required]
 * @param {function} onClose - 닫기 콜백 [Required]
 * @param {string} glyphName - 인코딩된 이름 [Required]
 * @param {object} model - 현재 표식의 실제 모델 [Required]
 * @param {function} onPublish - 게시 실행 콜백 [Optional]
 * @param {'publish'|'share'} intent - 공개 후 공유할 의도. 기본 publish.
 * @param {'archive'|'stay'} completion - 완료 안내 문구. 두 모드 모두 링크 보관 및 페이지 열기 제공.
 * @param {object} publishedResult - 이미 완료한 공개 결과. 다시 열어도 동의/등록을 반복하지 않음.
 * @param {function} onCopy - 공개 URL 복사 콜백. 기본 Clipboard API.
 * @param {object} interpretation - 소셜 공유에 사용할 현재 표식 해석.
 *
 * Example usage:
 * <PublishDialog open={ publishOpen } onClose={ () => setPublishOpen(false) } glyphName="Louise" model={ model } onPublish={ handlePublish } />
 */
function PublishDialog({ open, onClose, glyphName, model, interpretation, onPublish, onPublished, publishedResult, intent = 'publish', completion = 'archive', onCopy, showClusterLink = true }) {
  const { locale, localize, t } = useI18n();
  const theme = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState('confirm');
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState(null);
  const [copyNotice, setCopyNotice] = useState(false);
  const autoCopiedIds = useRef(new Set());
  const [copying, setCopying] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const pending = useRef(false);
  const copyPending = useRef(false);
  const urlInput = useRef(null);
  const completed = published || publishedResult;
  const glyphId = completed?.glyphId;
  const currentStep = glyphId ? 'done' : step;
  const publicUrl = glyphId ? archiveShareUrl(glyphId, undefined, { locale, endpoint: '' }) : '';
  const shareInput = { left: { id: glyphId, canonical_name: glyphName }, interpretation };
  const socialLinks = glyphId ? archiveSocialLinks(shareInput, { locale, endpoint: '' }) : [];
  const fg = '#e8e8e8';

  const monoSx = {
    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
    fontSize: '0.75rem',
    lineHeight: 1.5,
    letterSpacing: '0.05em',
  };

  const handlePublish = async () => {
    if (!consented || pending.current || currentStep !== 'confirm') return;
    pending.current = true;
    setStep('publishing');
    setError('');
    try {
      const result = await onPublish?.({ consented: true });
      if (!result?.glyphId) throw new Error(t('publishDialog.publishingCouldNotBeCompletedYourName'));
      setPublished(result);
      setStep('done');
    } catch (err) {
      setError(err.message || t('publishDialog.anErrorOccurredWhilePublishingTryAgain'));
      setStep('confirm');
    } finally {
      pending.current = false;
    }
  };

  const handleCopy = useCallback(async (automatic = false) => {
    if (!publicUrl || copyPending.current) return;
    copyPending.current = true;
    setCopying(true);
    setCopyStatus('');
    setCopyNotice(false);
    setError('');
    try {
      if (onCopy) await onCopy(publicUrl);
      else await copyArchiveLink(publicUrl, { locale });
      setCopyNotice(true);
    } catch {
      setCopyStatus('manual');
      if (!automatic) {
        urlInput.current?.focus();
        urlInput.current?.select();
      }
    } finally {
      copyPending.current = false;
      setCopying(false);
    }
  }, [publicUrl, locale, onCopy]);

  useEffect(() => {
    if (!open || !glyphId || autoCopiedIds.current.has(glyphId)) return;
    autoCopiedIds.current.add(glyphId);
    void handleCopy(true);
  }, [open, glyphId, handleCopy]);

  const handleClose = () => {
    if (pending.current || copyPending.current) return;
    setStep('confirm');
    setConsented(false);
    setPublished(null);
    setError('');
    setCopyStatus('');
    setCopyNotice(false);
    onClose();
  };

  return (
    <Dialog
      open={ open }
      onClose={ handleClose }
      disableEscapeKeyDown={ currentStep === 'publishing' || copying }
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
            [theme.breakpoints.down('md')]: {
              m: '12px', width: 'calc(100% - 24px)',
              maxHeight: 'calc(100dvh - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
              overflowWrap: 'anywhere',
            },
          },
        },
      } }
    >
      <Box sx={ { p: { xs: 3, sm: 4 }, [theme.breakpoints.down('md')]: { p: 2 } } }>
        <Box sx={ { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 3 } }>
          <Typography id="archive-publish-title" component="h2" sx={ { ...monoSx, color: fg, opacity: 0.95, letterSpacing: '0.24em', fontSize: '0.8rem', textTransform: 'uppercase' } }>{ t('publishDialog.publishToArchive') }</Typography>
          <Box
            component="button"
            onClick={ handleClose }
            disabled={ currentStep === 'publishing' || copying }
            aria-label={ t('publishDialog.closePublishingDialog') }
            sx={ { ...monoSx, background: 'none', border: 'none', cursor: 'pointer', color: fg, opacity: 0.6, fontSize: '0.7rem', '&:hover': { opacity: 1 },
              [theme.breakpoints.down('md')]: { minWidth: 44, minHeight: 44, flexShrink: 0 } } }
          >
            ✕
          </Box>
        </Box>

        { currentStep === 'confirm' && (
          <>
            {intent === 'share' && <Typography sx={ { fontSize: '0.85rem', lineHeight: 1.8, mb: 2 } }>{t('encoderResult.publishBeforeShare')}</Typography>}
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.9, fontSize: '0.9rem', mb: 2, lineHeight: 1.8 } }>
              { t('publishDialog.publishTheLogogramForToThePublic', { p0: glyphName }) }
            </Typography>

            <Box sx={ { borderTop: `1px solid ${alpha(fg, 0.15)}`, pt: 2, mb: 3 } }>
              { [
                t('publishDialog.yourNameAndGlyphWillBePublic'),
                t('publishDialog.theSameNameAndExpressionShareOne'),
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

        { currentStep === 'publishing' && (
          <Box sx={ { textAlign: 'center', py: 4 } }>
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.6, fontSize: '0.7rem', letterSpacing: '0.2em' } }>{ t('publishDialog.publishing') }</Typography>
          </Box>
        ) }

        { currentStep === 'done' && (
          <Box data-publish-complete sx={ { textAlign: 'center', py: 3 } }>
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.95, fontSize: '0.72rem', letterSpacing: '0.12em', mb: 2 } }>
              { t('publishDialog.published', { p0: glyphName }) }
            </Typography>
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.8, fontSize: '0.75rem', mb: 3 } }>{ t(intent === 'share' ? 'encoderResult.readyToShare' : completion === 'stay' ? 'encoderResult.publishComplete' : 'publishDialog.yourGlyphIsSavedConnectionsAreShown') }</Typography>
            {interpretation && <GlyphClusterLink interpretation={ interpretation } showLink={ showClusterLink } compact sx={ { mb: 2 } } />}
            <Typography id="archive-published-save-hint" sx={ { fontSize: '0.85rem', lineHeight: 1.8, mb: 2 } }>{t('publishDialog.saveLink')}</Typography>
            <Typography component="label" htmlFor="archive-published-url" sx={ { ...monoSx, display: 'block', textAlign: 'left', mb: 1 } }>{t('publishDialog.publicUrl')}</Typography>
            <Box component="input" id="archive-published-url" ref={ urlInput } readOnly value={ publicUrl }
              aria-describedby="archive-published-save-hint archive-published-copy-status"
              onFocus={ (event) => event.target.select() }
              sx={ { ...monoSx, boxSizing: 'border-box', width: '100%', minWidth: 0, minHeight: 44, p: 1.5, mb: 2, color: fg, bgcolor: 'transparent', border: `1px solid ${alpha(fg, 0.4)}`, borderRadius: 0, '&:focus-visible': { outline: `2px solid ${fg}`, outlineOffset: 2 } } } />
            <Typography id="archive-published-copy-status" role="status" aria-live="polite" sx={ { fontSize: '0.8rem', mb: copyStatus ? 2 : 0 } }>
              {copyStatus ? t('publishDialog.copyManually') : ''}
            </Typography>
            {error && <Alert severity="error" sx={ { mb: 2 } }>{localize(error)}</Alert>}
            <Button
              data-publish-open disabled={ copying } fullWidth
              onClick={ () => { const result = completed; handleClose(); if (onPublished) onPublished(result); else navigate(archiveSharePath(glyphId)); } }
              variant="contained"
              sx={ { ...monoSx, minHeight: 56, fontSize: '0.9rem', borderRadius: 0, bgcolor: fg, color: '#0c100f', boxShadow: 'none',
                '&:hover': { bgcolor: '#fff', boxShadow: 'none' } } }
            >{ t('publishDialog.openMyGlyph') }</Button>
            <Box id="archive-social-share" role="group" aria-label={ t('publishDialog.share') } sx={ { mt: 3, pt: 2, borderTop: `1px solid ${alpha(fg, 0.2)}` } }>
              <Typography sx={ { ...monoSx, mb: 1 } }>{t('publishDialog.share')}</Typography>
              <Box data-publish-share-row sx={ { display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', gap: 1 } }>
                <IconButton data-publish-copy onClick={ () => handleCopy() } disabled={ copying }
                  aria-label={ t('publishDialog.copyLink') } title={ t('publishDialog.copyLink') }
                  sx={ { color: 'common.white', width: 48, height: 48 } }><LinkIcon /></IconButton>
                {socialLinks.map(({ id, label, href }) => <IconButton key={ id } data-social-network={ id } component="a" href={ href }
                  target="_blank" rel="noopener noreferrer" aria-label={ label } title={ label }
                  sx={ { color: 'common.white', width: 48, height: 48 } }>
                  {id === 'x' ? <XIcon /> : id === 'facebook' ? <FacebookIcon /> : <SvgIcon viewBox="0 0 24 24">
                    <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                      d="M19.4 7.3C18.3 3.8 15.9 2 12 2 5.5 2 3 6.2 3 12s2.5 10 9 10c5.5 0 8.8-3.3 8.8-7.1 0-3.7-3.3-5.8-7.2-5.8-3.2 0-5.1 1.5-5.1 3.5 0 1.8 1.4 2.8 3.2 2.8 2.7 0 4.1-2 4.1-5.3 0-2.8-1.4-4.2-3.6-4.2-1.5 0-2.7.6-3.5 1.7" />
                  </SvgIcon>}
                </IconButton>)}
              </Box>
            </Box>
            <Box sx={ { mt: 2 } }>
              <Button
                onClick={ handleClose }
                disabled={ copying }
                variant="text"
                sx={ {
                  ...monoSx, color: fg, opacity: 0.6, fontSize: '0.62rem', letterSpacing: '0.16em', borderRadius: 0, '&:hover': { opacity: 0.9 },
                } }
              >{ t('publishDialog.close') }</Button>
            </Box>
          </Box>
        ) }
      </Box>
    <Snackbar open={ copyNotice } autoHideDuration={ 4000 } onClose={ (_, reason) => { if (reason !== 'clickaway') setCopyNotice(false); } }
      anchorOrigin={ { vertical: 'bottom', horizontal: 'center' } }>
      <Alert data-publish-copy-notice severity="success" variant="filled" onClose={ () => setCopyNotice(false) } sx={ { width: '100%' } }>
        {t('encoderResult.copied')}
      </Alert>
    </Snackbar>
    </Dialog>
  );
}

export default PublishDialog;
