import { useId, useState } from 'react';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import { useI18n } from '../../i18n/useI18n.js';
import { LANGUAGE_MODES } from '../../i18n/locale.js';

/** Shared language control for desktop/mobile headers. System follows OS preference. */
export default function LanguageSwitcher({ sx }) {
  const { locale, languageMode, setLanguageMode, t } = useI18n();
  const [anchor, setAnchor] = useState(null);
  const id = useId();
  return <>
    <Button id={ `${id}-button` } aria-label={ t('locale.label') } aria-haspopup="menu"
      aria-controls={ anchor ? id : undefined } aria-expanded={ Boolean(anchor) }
      onClick={ (event) => setAnchor(event.currentTarget) }
      startIcon={ <TranslateRoundedIcon /> }
      sx={ { color: 'inherit', minWidth: 64, minHeight: 44, px: 1, fontSize: '0.75rem', flexShrink: 0, ...sx } }>
      { locale.toUpperCase() }
    </Button>
    <Menu id={ id } anchorEl={ anchor } open={ Boolean(anchor) } onClose={ () => setAnchor(null) }
      slotProps={ { list: { 'aria-labelledby': `${id}-button` } } }>
      { LANGUAGE_MODES.map((mode) => <MenuItem key={ mode } role="menuitemradio"
        aria-checked={ languageMode === mode } selected={ languageMode === mode }
        lang={ mode === 'system' ? locale : mode }
        onClick={ () => { setLanguageMode(mode); setAnchor(null); } }
        sx={ { minHeight: 44 } }>
        { t(`locale.${mode}`) }
      </MenuItem>) }
    </Menu>
  </>;
}
