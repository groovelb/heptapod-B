import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';
import { useI18n } from '../../i18n/useI18n';

/** Independent visualization toggles. No reading panel, classification or local selection. */
export default function GlyphObservationChips({ entries = [], selectedIds = [], onToggle, analysisToggle, fg, sx }) {
  const { t } = useI18n();
  const theme = useTheme();
  const ink = fg || theme.palette.custom.chamber.ink;
  const toggles = [
    ...(analysisToggle ? [{ id: 'analysis', label: t('archiveDepthExplorer.analysis'), active: analysisToggle.active,
      onClick: analysisToggle.onToggle, attributes: { 'data-selected-analysis-toggle': true, 'aria-controls': analysisToggle.controlsId } }] : []),
    ...entries.map((entry) => ({ id: `meaning:${entry.id}`, label: entry.label, active: selectedIds.includes(entry.id),
      onClick: onToggle ? () => onToggle(entry) : undefined, attributes: { 'data-reading-meaning': entry.meaningId } })),
  ];
  if (!toggles.length) return null;
  return (
    <Box data-observation-chips role="group" aria-label={ t(analysisToggle ? 'archiveDepthExplorer.visualizations' : 'meaningReading.choose') }
      sx={ { display: 'flex', flexWrap: 'wrap', gap: theme.editorial.visualizationControls.gap, ...sx } }>
      { toggles.map(({ id, label, active, onClick, attributes }) => {
        const foreground = active ? theme.palette.getContrastText(ink) : ink;
        return <Chip key={ id } component="button" type="button" clickable disabled={ !onClick }
          { ...attributes } aria-pressed={ active } label={ label } onClick={ onClick }
          variant={ active ? 'filled' : 'outlined' }
          sx={ { ...theme.editorial.observationChip, typography: 'editorialAction', color: foreground,
            bgcolor: active ? ink : 'transparent', border: 1, borderColor: active ? ink : alpha(ink, 0.45),
            '& .MuiChip-label': { whiteSpace: 'normal' },
            '&:hover, &.Mui-focusVisible': { bgcolor: active ? ink : alpha(ink, 0.08) },
            '&:focus-visible': { outline: `2px solid ${ink}`, outlineOffset: 2 },
          } } />;
      }) }
    </Box>
  );
}
