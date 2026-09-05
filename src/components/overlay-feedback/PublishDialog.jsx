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
 *
 * Example usage:
 * <PublishDialog open={ publishOpen } onClose={ () => setPublishOpen(false) } glyphName="Louise" model={ model } onPublish={ handlePublish } />
 */
function PublishDialog({ open, onClose, glyphName, model, onPublish, onPublished }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('confirm');
  const [glyphId, setGlyphId] = useState(null);
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState(null);
  const pending = useRef(false);
  const fg = '#e8e8e8';

  const monoSx = {
    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
    fontSize: '0.75rem',
    lineHeight: 1.5,
    letterSpacing: '0.05em',
  };

  const handlePublish = async () => {
    if (!consented || pending.current) return;
    pending.current = true;
    setStep('publishing');
    setError('');
    try {
      const result = await onPublish?.({ consented: true });
      if (!result?.glyphId) throw new Error('공개를 완료하지 못했습니다. 입력한 이름은 그대로 보관되어 있습니다.');
      setGlyphId(result.glyphId);
      setPublished(result);
      setStep('done');
    } catch (err) {
      setError(err.message || '공개 중 오류가 발생했습니다. 다시 시도해 주세요.');
      setStep('confirm');
    } finally {
      pending.current = false;
    }
  };

  const handleClose = () => {
    if (pending.current) return;
    setStep('confirm');
    setConsented(false);
    setGlyphId(null);
    setPublished(null);
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={ open }
      onClose={ handleClose }
      disableEscapeKeyDown={ step === 'publishing' }
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
          <Typography id="archive-publish-title" component="h2" sx={ { ...monoSx, color: fg, opacity: 0.95, letterSpacing: '0.24em', fontSize: '0.8rem', textTransform: 'uppercase' } }>
            Publish to Archive
          </Typography>
          <Box
            component="button"
            onClick={ handleClose }
            disabled={ step === 'publishing' }
            aria-label="공개 창 닫기"
            sx={ { ...monoSx, background: 'none', border: 'none', cursor: 'pointer', color: fg, opacity: 0.6, fontSize: '0.7rem', '&:hover': { opacity: 1 } } }
          >
            ✕
          </Box>
        </Box>

        { step === 'confirm' && (
          <>
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.9, fontSize: '0.9rem', mb: 2, lineHeight: 1.8 } }>
              { `"${glyphName}"의 로고그램을 공개 아카이브에 게시합니다.` }
            </Typography>

            <Box sx={ { borderTop: `1px solid ${alpha(fg, 0.15)}`, pt: 2, mb: 3 } }>
              { [
                '이름과 표식이 공개되며 다른 공개 표식과 연결을 분석합니다.',
                '같은 이름과 표현은 하나의 표식을 공유합니다.',
                '현재 세션의 ‘내가 남긴 응답’에서 공개를 철회할 수 있습니다.',
                '익명 세션은 브라우저 데이터를 지우면 접근을 잃을 수 있습니다. 오래 보관하려면 계정을 연결해 주세요.',
                '공유받은 사람이 저장한 이미지와 외부 서비스의 미리보기는 철회 후에도 남을 수 있습니다.',
              ].map((text, i) => (
                <Typography key={ i } component="p" sx={ { ...monoSx, color: fg, opacity: 0.8, fontSize: '0.8rem', lineHeight: 1.8, mb: 1 } }>
                  { `· ${text}` }
                </Typography>
              )) }
            </Box>

            {model?.meta?.encodingMode === 'deterministic' && <Typography sx={ { fontSize: '0.85rem', mb: 2 } }>이 표식은 이름 전체로 재현됩니다. 형태만으로 원문을 해독하는 방식은 지원하지 않습니다.</Typography>}
            <FormControlLabel sx={ { mb: 2 } } control={ <Checkbox checked={ consented } onChange={ (event) => setConsented(event.target.checked) } sx={ { color: fg, '&.Mui-checked': { color: fg } } } /> } label="이름과 표식의 공개 및 연결 분석에 동의합니다." />
            {error && <Alert severity="error" sx={ { mb: 2 } }>{error}</Alert>}

            <Box sx={ { display: 'flex', gap: 1.5, justifyContent: 'flex-end' } }>
              <Button
                onClick={ handleClose }
                variant="text"
                sx={ { ...monoSx, color: fg, opacity: 0.5, fontSize: '0.62rem', letterSpacing: '0.14em', borderRadius: 0, '&:hover': { opacity: 0.8 } } }
              >
                취소
              </Button>
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
              >
                공개하기
              </Button>
            </Box>
          </>
        ) }

        { step === 'publishing' && (
          <Box sx={ { textAlign: 'center', py: 4 } }>
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.6, fontSize: '0.7rem', letterSpacing: '0.2em' } }>
              PUBLISHING...
            </Typography>
          </Box>
        ) }

        { step === 'done' && (
          <Box sx={ { textAlign: 'center', py: 3 } }>
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.95, fontSize: '0.72rem', letterSpacing: '0.12em', mb: 2 } }>
              { `"${glyphName}" 게시 완료` }
            </Typography>
            <Typography component="p" sx={ { ...monoSx, color: fg, opacity: 0.5, fontSize: '0.6rem', mb: 3 } }>
              표식이 저장되었습니다. 연결은 공개 아카이브의 실제 표식과 비교해 표시합니다.
            </Typography>
            <Box sx={ { display: 'flex', gap: 1.5, justifyContent: 'center' } }>
              { glyphId && (
                <Button
                  onClick={ () => { const result = published; handleClose(); if (onPublished) onPublished(result); else navigate(`/glyph/${glyphId}`); } }
                  variant="text"
                  sx={ {
                    ...monoSx, color: fg, opacity: 0.95, fontSize: '0.62rem', letterSpacing: '0.16em', borderRadius: 0, border: `1px solid ${alpha(fg, 0.5)}`, px: 3, '&:hover': { backgroundColor: alpha(fg, 0.08), borderColor: alpha(fg, 0.7) },
                  } }
                >
                  VIEW IN ARCHIVE
                </Button>
              ) }
              <Button
                onClick={ handleClose }
                variant="text"
                sx={ {
                  ...monoSx, color: fg, opacity: 0.6, fontSize: '0.62rem', letterSpacing: '0.16em', borderRadius: 0, '&:hover': { opacity: 0.9 },
                } }
              >
                CLOSE
              </Button>
            </Box>
          </Box>
        ) }
      </Box>
    </Dialog>
  );
}

export default PublishDialog;
