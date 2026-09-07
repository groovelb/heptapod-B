import { useId } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import { alpha, useTheme } from '@mui/material/styles';
import { useI18n } from '../../i18n/useI18n';

/** Independent visualization toggles. No reading panel, classification or local selection. */
export default function GlyphObservationChips({ entries = [], selectedIds = [], onToggle, fg, sx }) {
  const { t } = useI18n();
  const theme = useTheme();
  const helpId = useId();
  const ink = fg || theme.palette.custom.chamber.ink;
  if (!entries.length) return null;
  return (
      <Box sx={ sx } data-observation-chips>
        <Typography id={ helpId } sx={ { typography: 'editorialMeta', mt: theme.editorial.paragraphGap } }>{ t('meaningReading.toggleHelp') }</Typography>
        <Box role="group" aria-label={ t('meaningReading.choose') } aria-describedby={ helpId }
          sx={ { display: 'flex', flexWrap: 'wrap', gap: theme.editorial.itemGap, mt: theme.editorial.labelGap, mb: theme.editorial.paragraphGap } }>
          { entries.map((entry) => {
            const active = selectedIds.includes(entry.id);
            const foreground = active ? theme.palette.getContrastText(ink) : ink;
            return <Chip key={ entry.id } component="button" type="button" clickable disabled={ !onToggle }
              data-reading-meaning={ entry.meaningId } aria-pressed={ active }
              icon={ active ? <VisibilityOutlined /> : <VisibilityOffOutlined /> } label={ entry.label }
              onClick={ () => onToggle?.(entry) }
              variant={ active ? 'filled' : 'outlined' }
              sx={ { ...theme.editorial.observationChip, typography: 'editorialAction', color: foreground,
                bgcolor: active ? ink : 'transparent', border: 1, borderColor: active ? ink : alpha(ink, 0.45),
                '& .MuiChip-icon': { color: 'inherit', fontSize: 'inherit' },
                '& .MuiChip-label': { whiteSpace: 'normal' },
                '&:hover, &.Mui-focusVisible': { bgcolor: active ? ink : alpha(ink, 0.08) },
                '&:focus-visible': { outline: `2px solid ${ink}`, outlineOffset: 2 },
              } } />;
          }) }
        </Box>
      </Box>
  );
}
