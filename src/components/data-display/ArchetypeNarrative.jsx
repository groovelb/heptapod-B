import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ArchetypeMotto from './ArchetypeMotto';
import { useI18n } from '../../i18n/useI18n.js';
import { ARCHETYPE_FAMILIES } from '../../data/heptapodArchetypeCatalog.js';
import { MEANING_CATALOG } from '../../data/heptapodMeaningCatalog.js';

const textSx = { typography: 'editorialBody' };
const labelSx = { typography: 'editorialLabel', mb: (theme) => theme.editorial.labelGap };
const sectionSx = (theme) => ({ ...theme.editorial.rule, pt: theme.editorial.sectionPadding });

/** The same deployed JSON narrative in Create and Archive. No classification,
 * fetching or local selection; only complete catalog types receive combination copy.
 */
export default function ArchetypeNarrative({ archetype, familyId = archetype?.familyId, showFamily = true, showIdentity = true, showMotto = true, variant = 'full', sx }) {
  const { t, localize } = useI18n();
  const family = ARCHETYPE_FAMILIES[familyId];
  if (!family && !archetype) return null;
  return <Box data-narrative-type={ archetype?.id } sx={ { display: 'grid', gap: (theme) => theme.editorial.sectionGap, maxWidth: (theme) => theme.editorial.measure, minWidth: 0, ...sx } }>
    { archetype && showMotto && variant === 'full' && <ArchetypeMotto archetype={ archetype } sx={ { mt: 0 } } /> }
    { archetype && showIdentity && <Typography data-narrative-identity sx={ { typography: 'editorialLead', pb: (theme) => theme.editorial.leadSpace } }>{ localize(archetype.reading) }</Typography> }
    { showFamily && family && <Box sx={ sectionSx } component="section" data-narrative-family={ family.id }>
      <Typography component="h3" sx={ labelSx }>{ t('archetypeNarrative.family') } · { localize(family.title) }</Typography>
      <Typography sx={ textSx }>{ localize(family.story) }</Typography>
    </Box> }
    { archetype && <>
      <Box sx={ sectionSx } component="section" data-narrative-composition={ archetype.modifierIds.join('+') || 'none' }>
        <Typography component="h3" sx={ labelSx }>{ t(archetype.modifierIds.length ? 'archetypeNarrative.composition' : 'archetypeNarrative.base') }
          { archetype.modifierIds.length > 0 && ` · ${archetype.modifierIds.map((id) => localize(MEANING_CATALOG[id].label)).join(' · ')}` }</Typography>
        <Typography sx={ textSx }>{ localize(archetype.composition) }</Typography>
      </Box>
      <Box sx={ sectionSx } component="section">
        <Typography component="h3" sx={ labelSx }>{ t('archetypeNarrative.story') }</Typography>
        <Typography data-archetype-narrative sx={ textSx }>{ localize(archetype.story) }</Typography>
      </Box>
      { variant === 'full' && <>
        { ['traits', 'moments'].map((field) => <Box sx={ sectionSx } component="section" key={ field } data-narrative-field={ field }>
          <Typography component="h3" sx={ labelSx }>{ t(`archetypeNarrative.${field}`) }</Typography>
          <Box component="ul" sx={ { m: 0, pl: 2, display: 'grid', gap: (theme) => theme.editorial.itemGap } }>
            { archetype[field].map((sentence) => <Typography component="li" key={ sentence } sx={ textSx }>{ localize(sentence) }</Typography>) }
          </Box>
        </Box>) }
        { ['tension', 'question'].map((field) => <Box sx={ sectionSx } component="section" key={ field } data-narrative-field={ field }>
          <Typography component="h3" sx={ labelSx }>{ t(`archetypeNarrative.${field}`) }</Typography>
          <Typography sx={ textSx }>{ localize(archetype[field]) }</Typography>
        </Box>) }
        <Box sx={ sectionSx } component="section" data-narrative-field="relations">
          <Typography component="h3" sx={ labelSx }>{ t('archetypeNarrative.relations') }</Typography>
          { archetype.relations.map((relation) => <Typography key={ relation.targetMeaningKey } sx={ { ...textSx, '& + p': { mt: (theme) => theme.editorial.paragraphGap } } }>{ localize(relation.reading) }</Typography>) }
        </Box>
        <Box sx={ sectionSx } component="section" data-narrative-field="distinction">
          <Typography component="h3" sx={ labelSx }>{ t('archetypeNarrative.distinction') }</Typography>
          <Typography sx={ textSx }>{ localize(archetype.distinction) }</Typography>
        </Box>
      </> }
    </> }
  </Box>;
}
