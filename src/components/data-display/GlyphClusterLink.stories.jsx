import { createElement } from 'react';
import Box from '@mui/material/Box';
import GlyphClusterLink from './GlyphClusterLink';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { interpretGlyphMeaning } from '../../utils/heptapod/interpretGlyphMeaning';

export default {
  title: 'Custom Component/5. Data Display/GlyphClusterLink', component: GlyphClusterLink, tags: ['autodocs'],
  parameters: { docs: { description: { component: '공개 페이지와 내 표식에 동일한 군집 이름·이동 링크를 표시합니다. Create에서는 showLink=false로 군집 이름만 표시합니다. Archive와 같은 정확한 분류 키를 사용하며 부분 판독에는 군집을 추정하지 않습니다.' } } },
  decorators: [(Story) => <Box sx={ { color: 'custom.chamber.ink', bgcolor: 'custom.chamber.fog', p: 3 } }>{createElement(Story)}</Box>],
  argTypes: { showLink: { control: 'boolean', description: '군집 이동 링크 표시. Create는 false' }, interpretation: { control: 'object' }, compact: { control: 'boolean' }, sx: { control: 'object' } },
  args: { interpretation: interpretGlyphMeaning(buildArchiveModel('Louise')) },
};
export const Default = {};
export const Compact = { args: { compact: true } };
export const Unconfirmed = { args: { interpretation: { status: 'partial' } } };
