import Typography from '@mui/material/Typography';
import { useI18n } from '../../i18n/useI18n';

/** One authored name motto, placed directly below its type title. */
export default function ArchetypeMotto({ archetype, sx }) {
  const { t, localize } = useI18n();
  if (!archetype?.motto) return null;
  return <Typography component="blockquote" data-narrative-field="motto" aria-label={ t('archetypeNarrative.motto') }
    sx={ { m: 0, typography: 'editorialQuote', mt: (theme) => theme.editorial.paragraphGap, ...sx } }>
    “{ localize(archetype.motto) }”
  </Typography>;
}
