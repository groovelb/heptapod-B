import { useId, useRef, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { useI18n } from '../../i18n/useI18n';
import { copyArchiveLink, socialShareLinks } from '../../utils/heptapod/shareArchive';

/** Opens only the social site chosen by the reader. Never invokes the OS share sheet. */
export default function SocialShareDialog({ payload, onClose, onCopy }) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const input = useRef(null);
  const pending = useRef(false);
  const [copyStatus, setCopyStatus] = useState('');
  const copy = async () => {
    if (pending.current || !payload) return;
    pending.current = true;
    try { if (onCopy) await onCopy(payload.url); else await copyArchiveLink(payload.url, { locale }); setCopyStatus('copied'); }
    catch { setCopyStatus('manual'); input.current?.focus(); input.current?.select(); }
    finally { pending.current = false; }
  };
  const close = () => { setCopyStatus(''); onClose(); };
  return <Dialog open={ Boolean(payload) } onClose={ close } aria-labelledby={ titleId } maxWidth="xs" fullWidth
    slotProps={ { paper: { sx: (theme) => ({
      [theme.breakpoints.down('md')]: {
        m: '12px', width: 'calc(100% - 24px)',
        maxHeight: 'calc(100dvh - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
      },
    }) } } }>
    { payload && <Box sx={ { p: { xs: 2, sm: 3 }, overflowWrap: 'anywhere' } } data-social-share-dialog>
      <Typography id={ titleId } component="h2" sx={ { typography: 'editorialTitle' } }>{ t('publishDialog.socialShare') }</Typography>
      <Typography sx={ { typography: 'editorialBody', mt: 1 } }>{ t('publishDialog.chooseSocial') }</Typography>
      <Box sx={ { display: 'flex', flexWrap: 'wrap', gap: 1, my: 3 } }>
        { socialShareLinks(payload).map(({ id, label, href }) => <Button key={ id } component="a" href={ href }
          target="_blank" rel="noopener noreferrer" data-social-network={ id } variant="outlined"
          sx={ { minHeight: 44, typography: 'editorialAction', color: 'text.primary', borderColor: 'text.secondary' } }>{ label }</Button>) }
      </Box>
      <TextField fullWidth inputRef={ input } value={ payload.url } label={ t('publishDialog.publicUrl') }
        slotProps={ { input: { readOnly: true }, htmlInput: { onFocus: (event) => event.target.select() } } } />
      { copyStatus && <Typography role="status" sx={ { typography: 'editorialMeta', mt: 1 } }>{ t(copyStatus === 'manual' ? 'publishDialog.copyManually' : 'glyphDetailPage.shareLinkCopied') }</Typography> }
      <Box sx={ { display: 'flex', justifyContent: 'space-between', gap: 1, mt: 2 } }>
        <Button data-social-copy onClick={ copy } sx={ { minHeight: 44 } }>{ t('publishDialog.copyLink') }</Button>
        <Button data-social-close onClick={ close } sx={ { minHeight: 44 } }>{ t('publishDialog.close') }</Button>
      </Box>
    </Box> }
  </Dialog>;
}
