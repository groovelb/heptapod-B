import { createElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ArchiveFamilySymbol from './ArchiveFamilySymbol';
import { ARCHIVE_FAMILY_SYMBOLS } from '../../data/archiveFamilySymbols';

export default {
  title: 'Custom Component/5. Data Display/ArchiveFamilySymbol', component: ArchiveFamilySymbol, tags: ['autodocs'],
  parameters: { docs: { description: { component: '기본 계열의 방향성을 단일 링에 표현하는 저작된 상징입니다. 도래는 바깥 방향, 수용은 안쪽 방향, 상호성은 안팎 방향을 함께 사용합니다. 개인 이름·평균 표식·영화의 공식 문자·공개 DB 기록이 아닙니다. 기존 ArchiveGlyph/Canvas 입자 형성과 감소 모션을 재사용합니다. 세 상징은 기본 계열 외에 추가 의미가 붙지 않는 형태로 검증합니다.' } } },
  decorators: [(Story) => <Box sx={ { bgcolor: 'custom.chamber.fog', p: 2 } }>{ createElement(Story) }</Box>],
  argTypes: {
    familyId: { control: 'select', options: ['arrival', 'reception', 'reciprocity'], description: '단일 패턴으로 시각화할 기본 계열' },
    sx: { control: 'object', description: 'MUI 표면 스타일' },
  },
  args: { familyId: 'arrival', sx: { maxWidth: 420 } },
};

export const Default = {};
export const Families = {
  render: (args) => <Box sx={ { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 3 } }>
    { Object.values(ARCHIVE_FAMILY_SYMBOLS).map((symbol) => <Box key={ symbol.familyId } sx={ { textAlign: 'center', color: 'custom.chamber.ink' } }>
      <ArchiveFamilySymbol { ...args } familyId={ symbol.familyId } />
      <Typography sx={ { fontFamily: "'Cinzel', 'Noto Serif KR', Georgia, serif", fontSize: 22 } }>{ symbol.label }</Typography>
      <Typography sx={ { fontSize: 13, mt: 1 } }>{ symbol.cue }</Typography>
    </Box>) }
  </Box>,
};
