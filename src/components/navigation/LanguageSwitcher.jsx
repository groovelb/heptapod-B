import { useId, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import { useI18n } from '../../i18n/useI18n.js';
import { LANGUAGE_MODES } from '../../i18n/locale.js';

/** Shared language control for desktop/mobile headers. System follows OS preference. */
export default function LanguageSwitcher({ sx }) {
  const { locale, languageMode, setLanguageMode, t } = useI18n();
  const [anchor, setAnchor] = useState(null);
  const id = useId();
  return <>
    <IconButton id={ `${id}-button` } aria-label={ t('locale.label') } title={ t('locale.label') } aria-haspopup="menu"
      aria-controls={ anchor ? id : undefined } aria-expanded={ Boolean(anchor) }
      onClick={ (event) => setAnchor(event.currentTarget) }
      sx={ {
        color: 'inherit', width: 44, height: 44, p: 1.25, borderRadius: 0, flexShrink: 0,
        bgcolor: anchor ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
        '&.Mui-focusVisible': { outline: '1px solid currentColor', outlineOffset: -2 },
        ...sx,
      } }>
      <LanguageOutlinedIcon sx={ { fontSize: 20 } } />
    </IconButton>
    <Menu id={ id } anchorEl={ anchor } open={ Boolean(anchor) } onClose={ () => setAnchor(null) }
      anchorOrigin={ { vertical: 'bottom', horizontal: 'right' } }
      transformOrigin={ { vertical: 'top', horizontal: 'right' } }
      slotProps={ {
        paper: { elevation: 0, sx: {
          mt: 1, minWidth: 184, borderRadius: 0, border: '1px solid', borderColor: 'divider',
          bgcolor: 'background.paper', backgroundImage: 'none', color: 'text.primary',
          boxShadow: (theme) => theme.customShadows?.md ?? theme.shadows[1],
        } },
        list: { 'aria-labelledby': `${id}-button`, sx: { p: 0.5 } },
      } }>
      { LANGUAGE_MODES.map((mode) => <MenuItem key={ mode } role="menuitemradio"
        aria-checked={ languageMode === mode } selected={ languageMode === mode }
        lang={ mode === 'system' ? locale : mode }
        onClick={ () => { setLanguageMode(mode); setAnchor(null); } }
        sx={ {
          minHeight: { xs: 44, sm: 44 }, px: 1.5, gap: 2, justifyContent: 'space-between',
          borderRadius: 0, fontSize: '0.75rem', letterSpacing: '0.05em',
          fontFamily: (theme) => theme.typography.custom?.mono?.fontFamily ?? theme.typography.fontFamily,
          color: 'text.secondary',
          '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
          '&.Mui-selected': { bgcolor: 'action.selected', color: 'text.primary', fontWeight: 500 },
          '&.Mui-selected:hover': { bgcolor: 'action.focus' },
          '&.Mui-focusVisible': { bgcolor: 'action.focus', color: 'text.primary', outline: '1px solid', outlineColor: 'divider', outlineOffset: -1 },
        } }>
        { t(`locale.${mode}`) }
        <CheckOutlinedIcon aria-hidden="true" sx={ { fontSize: 16, visibility: languageMode === mode ? 'visible' : 'hidden' } } />
      </MenuItem>) }
    </Menu>
  </>;
}
