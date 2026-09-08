import { useI18n } from '../../i18n/useI18n.js';
import { useId } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import GlyphNode from '../data-display/GlyphNode';
import GlyphPairComparison, { RelationEvidence } from '../data-display/GlyphPairComparison';
import { isMorphologyRelation } from '../../utils/heptapod/resonanceView';

/**
 * RelationInspector — 한 이웃의 복수 근거를 읽고 비교·탐색으로 이어가는 패널.
 * @param {object} relation - 이웃 + nameA/nameB, leftGlyph/neighborGlyph, 실제 형태 근거 배열
 * @param {boolean} open - 패널 열림
 * @param {function} onClose - 닫기
 * @param {function} onExplore - 중심으로 이동할 이웃 ID
 * @param {function} onCompare - 비교할 이웃 ID
 */
export default function RelationInspector({ relation, open, onClose, onExplore, onCompare }) {
  const { t } = useI18n();
  const titleId = useId();
  const theme = useTheme();
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const fog = theme.palette.custom?.chamber?.fog || theme.palette.background.paper;
  if (!relation) return null;
  const evidence = (relation.relations?.length ? relation.relations : [relation]).filter(isMorphologyRelation);
  const neighborName = relation.nameB || relation.name;
  const canCompare = relation.leftGlyph?.model_data && relation.neighborGlyph?.model_data;
  const actionSx = { minHeight: 44, color: ink, borderColor: alpha(ink, 0.4), justifyContent: 'center' };
  return (
    <Drawer anchor="right" open={ open } onClose={ onClose } slotProps={ {
      paper: {
        role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId,
        sx: { width: { xs: '100%', sm: canCompare ? 600 : 400 }, maxWidth: '100vw', bgcolor: fog, color: ink, backgroundImage: 'none' },
      },
    } }>
      <Box sx={ { p: { xs: 2.5, sm: 3 }, display: 'flex', flexDirection: 'column', minHeight: '100%', boxSizing: 'border-box',
        [theme.breakpoints.down('md')]: {
          pt: 'max(20px, env(safe-area-inset-top, 0px))', pb: 'max(20px, env(safe-area-inset-bottom, 0px))',
          pl: 'max(20px, env(safe-area-inset-left, 0px))', pr: 'max(20px, env(safe-area-inset-right, 0px))',
          overflowWrap: 'anywhere',
        } } }>
        <Box sx={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 } }>
          <Typography component="h2" id={ titleId } sx={ { fontSize: '1.1rem', fontWeight: 500 } }>{ t('relationInspector.resonanceFoundInGlyphs') }</Typography>
          <IconButton onClick={ onClose } aria-label={ t('relationInspector.closeFormObservations') } sx={ { color: ink, minWidth: 44, minHeight: 44 } }><CloseIcon /></IconButton>
        </Box>
        <Typography variant="body2" sx={ { mb: 2, overflowWrap: 'anywhere' } }>{ relation.nameA } · { neighborName }</Typography>
        { canCompare ? <GlyphPairComparison leftGlyph={ relation.leftGlyph } rightGlyph={ relation.neighborGlyph } relations={ evidence } sx={ { p: 0 } } /> : (
          <>
            { relation.model && <GlyphNode model={ relation.model } size={ 132 } label={ neighborName } sx={ { alignSelf: 'center', mb: 2 } } /> }
            { evidence.map((item, index) => <RelationEvidence key={ `${item.relationType}-${index}` } relation={ item } />) }
            { evidence.length === 0 && <Typography variant="body2">{ t('relationInspector.noFormObservationsAreAvailableYet') }</Typography> }
          </>
        ) }
        <Box sx={ { mt: 'auto', pt: 3, display: 'flex', flexDirection: 'column', gap: 1 } }>
          { onCompare && relation.id && <Button variant="outlined" onClick={ () => onCompare(relation.id) } sx={ actionSx }>{ t('relationInspector.compareBothGlyphsUpClose') }</Button> }
          { onExplore && relation.id && <Button onClick={ () => onExplore(relation.id) } sx={ actionSx }>{ t('glyphPairComparison.exploreFromThisGlyph') }</Button> }
        </Box>
      </Box>
    </Drawer>
  );
}
