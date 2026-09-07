import { createElement } from 'react';
import Box from '@mui/material/Box';
import ArchetypeMotto from './ArchetypeMotto';
import { ARCHETYPE_CATALOG } from '../../data/heptapodArchetypeCatalog';

export default {
  title: 'Custom Component/5. Data Display/ArchetypeMotto', component: ArchetypeMotto, tags: ['autodocs'],
  parameters: { docs: { description: { component: '유형 제목 바로 아래에 놓는 내 이름 한마디. 배포 JSON의 motto를 현재 언어로 표시하는 blockquote이며 editorialQuote 타이포를 사용합니다.' } } },
  decorators: [(Story) => <Box sx={ { p: 3, bgcolor: 'custom.chamber.fog', color: 'custom.chamber.ink' } }>{ createElement(Story) }</Box>],
  argTypes: {
    archetype: { control: 'object', description: 'motto를 가진 실제 유형 항목' },
    sx: { control: 'object', description: '추가 MUI sx' },
  },
  args: { archetype: ARCHETYPE_CATALOG['meaning-v1:reception:none'] },
};
export const Docs = {};
