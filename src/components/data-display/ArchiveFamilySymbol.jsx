import { useI18n } from '../../i18n/useI18n.js';
import Box from '@mui/material/Box';
import { getArchiveFamilySymbol } from '../../data/archiveFamilySymbols';
import ArchiveGlyph from './ArchiveGlyph';

/** One authored pattern per base family. Reuses viewport-triggered formation,
 * never substitutes an invented participant or contributes to group counts.
 */
export default function ArchiveFamilySymbol({ familyId, sx }) {
  const { localize, t } = useI18n();
  const symbol = getArchiveFamilySymbol(familyId);
  if (!symbol) return null;
  return (
    <Box role="img" aria-label={ t('archiveFamilySymbol.familySymbolThisIsNotAPersonal', { p0: localize(symbol.label), p1: localize(symbol.cue) }) }
      data-family-symbol={ familyId } sx={ { width: '100%', ...sx } }>
      <ArchiveGlyph glyph={ symbol.surface } maxSize={ 420 } />
    </Box>
  );
}
