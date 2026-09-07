import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link, useInRouterContext } from 'react-router-dom';
import { useI18n } from '../../i18n/useI18n';
import { getGlyphArchetype } from '../../data/heptapodArchetypeCatalog';
import { archiveMeaningPath } from '../../utils/heptapod/shareArchive';

/** Exact membership from the same interpretation as the archive feed.
 * <GlyphClusterLink interpretation={interpretation} compact />
 */
export default function GlyphClusterLink({ interpretation, compact = false, showLink = true, sx = {} }) {
  const { t, localize } = useI18n();
  const routed = useInRouterContext();
  const archetype = getGlyphArchetype(interpretation);
  const path = archetype ? archiveMeaningPath({ groupId: archetype.id }) : null;
  return <Box data-glyph-cluster={ archetype?.id || 'unconfirmed' } sx={ { color: 'inherit', ...sx } }>
    <Typography sx={ { fontSize: 11, lineHeight: 1.6, opacity: 0.75 } }>{t('glyphCluster.label')}</Typography>
    <Typography data-glyph-cluster-name sx={ { fontSize: compact ? 13 : 20, lineHeight: 1.6, overflowWrap: 'anywhere' } }>
      {archetype ? localize(archetype.title) : t('glyphCluster.unconfirmed')}
    </Typography>
    {path && showLink && <Button data-glyph-cluster-link component={ routed ? Link : 'a' } { ...(routed ? { to: path } : { href: path }) }
      sx={ { minHeight: 44, px: 0, color: 'inherit', borderRadius: 0, fontSize: compact ? 12 : 14, textTransform: 'none', textDecoration: 'underline', textUnderlineOffset: '4px' } }>
      {t('glyphCluster.explore')}
    </Button>}
  </Box>;
}
