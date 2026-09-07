import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useI18n } from '../../i18n/useI18n.js';
import { ARCHETYPE_FAMILIES } from '../../data/heptapodArchetypeCatalog.js';
import { MEANING_CATALOG } from '../../data/heptapodMeaningCatalog.js';

const textSx = { fontSize: 14, lineHeight: 1.85, overflowWrap: 'anywhere' };
const labelSx = { fontSize: 11, lineHeight: 1.7, mb: 0.75 };

/** The same deployed JSON narrative in Create and Archive. No classification,
 * fetching or local selection; only complete catalog types receive combination copy.
 */
export default function ArchetypeNarrative({ archetype, familyId = archetype?.familyId, showFamily = true, variant = 'full', sx }) {
  const { t, localize } = useI18n();
  const family = ARCHETYPE_FAMILIES[familyId];
  if (!family && !archetype) return null;
  return <Box data-narrative-type={ archetype?.id } sx={ { display: 'grid', gap: 2.5, minWidth: 0, ...sx } }>
    { showFamily && family && <Box component="section" data-narrative-family={ family.id }>
      <Typography component="h3" sx={ labelSx }>{ t('archetypeNarrative.family') } · { localize(family.title) }</Typography>
      <Typography sx={ textSx }>{ localize(family.story) }</Typography>
    </Box> }
    { archetype && <>
      <Box component="section" data-narrative-composition={ archetype.modifierIds.join('+') || 'none' }>
        <Typography component="h3" sx={ labelSx }>{ t(archetype.modifierIds.length ? 'archetypeNarrative.composition' : 'archetypeNarrative.base') }
          { archetype.modifierIds.length > 0 && ` · ${archetype.modifierIds.map((id) => localize(MEANING_CATALOG[id].label)).join(' · ')}` }</Typography>
        <Typography sx={ textSx }>{ localize(archetype.composition) }</Typography>
      </Box>
      <Box component="section">
        <Typography component="h3" sx={ labelSx }>{ t('archetypeNarrative.story') }</Typography>
        <Typography data-archetype-narrative sx={ textSx }>{ localize(archetype.story) }</Typography>
      </Box>
      { variant === 'full' && <>
        { ['traits', 'moments'].map((field) => <Box component="section" key={ field } data-narrative-field={ field }>
          <Typography component="h3" sx={ labelSx }>{ t(`archetypeNarrative.${field}`) }</Typography>
          <Box component="ul" sx={ { m: 0, pl: 2, display: 'grid', gap: 0.75 } }>
            { archetype[field].map((sentence) => <Typography component="li" key={ sentence } sx={ textSx }>{ localize(sentence) }</Typography>) }
          </Box>
        </Box>) }
        { ['tension', 'question'].map((field) => <Box component="section" key={ field } data-narrative-field={ field }>
          <Typography component="h3" sx={ labelSx }>{ t(`archetypeNarrative.${field}`) }</Typography>
          <Typography sx={ textSx }>{ localize(archetype[field]) }</Typography>
        </Box>) }
        <Box component="section" data-narrative-field="relations">
          <Typography component="h3" sx={ labelSx }>{ t('archetypeNarrative.relations') }</Typography>
          { archetype.relations.map((relation) => <Typography key={ relation.targetMeaningKey } sx={ { ...textSx, '& + p': { mt: 1 } } }>{ localize(relation.reading) }</Typography>) }
        </Box>
        { ['distinction', 'motto'].map((field) => <Box component="section" key={ field } data-narrative-field={ field }>
          <Typography component="h3" sx={ labelSx }>{ t(`archetypeNarrative.${field}`) }</Typography>
          <Typography sx={ textSx }>{ localize(archetype[field]) }</Typography>
        </Box>) }
      </> }
    </> }
  </Box>;
}
