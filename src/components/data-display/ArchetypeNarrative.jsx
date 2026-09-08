import { Children, Fragment } from 'react';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import LineGrid from '../layout/LineGrid';
import Typography from '@mui/material/Typography';
import ArchetypeMotto from './ArchetypeMotto';
import { useI18n } from '../../i18n/useI18n.js';
import { ARCHETYPE_FAMILIES } from '../../data/heptapodArchetypeCatalog.js';
import { MEANING_CATALOG } from '../../data/heptapodMeaningCatalog.js';

const flattenSections = (children) => Children.toArray(children).flatMap((child) => child.type === Fragment ? flattenSections(child.props.children) : [child]);
const pairedFields = new Set(['traits', 'moments', 'tension', 'question']);

const textSx = { typography: 'editorialBody' };

/** The same deployed JSON narrative in Create and Archive. No classification,
 * fetching or local selection; only complete catalog types receive combination copy.
 */
export default function ArchetypeNarrative({ archetype, familyId = archetype?.familyId, showFamily = true, showIdentity = true, showMotto = true, variant = 'full', spacing = 'default', sx }) {
  const { t, localize } = useI18n();
  const theme = useTheme();
  const family = ARCHETYPE_FAMILIES[familyId];
  const isDetail = spacing === 'archiveDetail';
  const isCreate = spacing === 'createAnalysis';
  const labelSx = { typography: isDetail ? 'editorialSectionTitle' : 'editorialLabel', mb: (theme) => isDetail ? theme.editorial.archiveReading.labelGap : isCreate ? theme.editorial.createReading.labelGap : theme.editorial.labelGap };
  const sectionSx = (theme) => ({ ...(!isDetail ? theme.editorial.rule : {}), minWidth: 0,
    ...(isDetail ? { px: theme.editorial.archiveReading.inset, py: theme.editorial.archiveReading.padding } : { pt: isCreate ? theme.editorial.createReading.sectionPadding : theme.editorial.sectionPadding }),
  });
  const itemGap = (theme) => isDetail ? theme.editorial.archiveReading.itemGap : isCreate ? theme.editorial.createReading.itemGap : theme.editorial.itemGap;
  if (!family && !archetype) return null;
  const content = <>
    { archetype && showMotto && variant === 'full' && <ArchetypeMotto archetype={ archetype } sx={ { mt: 0 } } /> }
    { archetype && showIdentity && <Typography data-narrative-identity sx={ { typography: isDetail ? 'editorialBody' : 'editorialLead', ...(isDetail ? { px: (theme) => theme.editorial.archiveReading.inset, py: (theme) => theme.editorial.archiveReading.padding } : { pb: (theme) => spacing === 'archive' ? 0 : theme.editorial.leadSpace }) } }>{ localize(archetype.reading) }</Typography> }
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
      <Box sx={ sectionSx } component="section" data-narrative-story>
        <Typography component="h3" sx={ labelSx }>{ t('archetypeNarrative.story') }</Typography>
        <Typography data-archetype-narrative sx={ textSx }>{ localize(archetype.story) }</Typography>
      </Box>
      { variant === 'full' && <>
        { ['traits', 'moments'].map((field) => <Box sx={ sectionSx } component="section" key={ field } data-narrative-field={ field }>
          <Typography component="h3" sx={ labelSx }>{ t(`archetypeNarrative.${field}`) }</Typography>
          <Box component="ul" role="list" sx={ { m: 0, p: 0, listStyle: 'none', display: 'grid', gap: itemGap } }>
            { archetype[field].map((sentence) => <Typography component="li" key={ sentence } sx={ (theme) => ({ ...textSx, ...theme.editorial.listItem }) }>{ localize(sentence) }</Typography>) }
          </Box>
        </Box>) }
        { ['tension', 'question'].map((field) => <Box sx={ sectionSx } component="section" key={ field } data-narrative-field={ field }>
          <Typography component="h3" sx={ labelSx }>{ t(`archetypeNarrative.${field}`) }</Typography>
          <Typography sx={ textSx }>{ localize(archetype[field]) }</Typography>
        </Box>) }
        <Box sx={ sectionSx } component="section" data-narrative-field="relations">
          <Typography component="h3" sx={ labelSx }>{ t('archetypeNarrative.relations') }</Typography>
          { archetype.relations.map((relation) => <Typography key={ relation.targetMeaningKey } sx={ { ...textSx, '& + p': { mt: itemGap } } }>{ localize(relation.reading) }</Typography>) }
        </Box>
        <Box sx={ sectionSx } component="section" data-narrative-field="distinction">
          <Typography component="h3" sx={ labelSx }>{ t('archetypeNarrative.distinction') }</Typography>
          <Typography sx={ textSx }>{ localize(archetype.distinction) }</Typography>
        </Box>
      </> }
    </> }
  </>;
  const layoutSx = { maxWidth: (theme) => theme.editorial.measure, minWidth: 0, ...sx };
  if (isDetail) return <LineGrid container gap={ theme.editorial.archiveReading.gridGap } borderColor="custom.chamber.ink" data-narrative-type={ archetype?.id } sx={ layoutSx }>
    {flattenSections(content).map((child, index) => {
      const paired = child.props['data-narrative-composition'] !== undefined || child.props['data-narrative-story'] !== undefined
        || pairedFields.has(child.props['data-narrative-field']);
      return <Grid key={ `${index}:${child.key}` } size={ paired ? theme.editorial.archiveReading.cellSize : 12 } sx={ { minWidth: 0 } }>{child}</Grid>;
    })}
  </LineGrid>;
  return <Box data-narrative-type={ archetype?.id } sx={ { display: 'grid',
    gap: (theme) => isCreate ? theme.editorial.createReading.sectionGap : spacing === 'archive' ? theme.editorial.archivePage.narrativeGap : theme.editorial.sectionGap,
    ...layoutSx,
  } }>{content}</Box>;
}
