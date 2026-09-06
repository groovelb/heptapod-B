import { createElement } from 'react';
import Box from '@mui/material/Box';
import ArchiveSelectedGlyph from './ArchiveSelectedGlyph';
import { ARCHIVE_STORY_GLYPHS } from '../../test-fixtures/archiveClient';
import { groupArchiveMeanings } from '../../utils/heptapod/groupArchiveMeanings';
import { buildArchiveArchetypeFeed } from '../../utils/heptapod/buildArchiveArchetypeFeed';

const meanings = groupArchiveMeanings(ARCHIVE_STORY_GLYPHS);
const section = buildArchiveArchetypeFeed(ARCHIVE_STORY_GLYPHS, meanings).sections.find((item) => item.glyphs.length > 1);
const glyph = section.glyphs[0];

export default {
  title: 'Custom Component/5. Data Display/ArchiveSelectedGlyph', component: ArchiveSelectedGlyph, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: '원 중앙의 실제 이름과 표식, 초록 분석 효과와 관측 선택, 같은 정확한 유형의 구성원, 공통 의미별 원본 부위 그리드. 모달과 Next/Compare는 없습니다. 그리드는 선택 표식과 최대 두 구성원을 원본 좌표 그대로 보여줍니다. 로컬 공개 fixture만 사용합니다.' } } },
  decorators: [(Story) => <Box sx={ { p: { xs: 2, md: 5 }, bgcolor: 'custom.chamber.fog', color: 'custom.chamber.ink' } }>{ createElement(Story) }</Box>],
  argTypes: {
    glyph: { control: 'object', description: '선택한 공개 표식 모델' },
    interpretation: { control: 'object', description: '선택 표식의 의미 판독 DTO' },
    interpretations: { control: 'object', description: '구성원 UUID별 판독 DTO' },
    members: { control: 'object', description: '같은 정확한 유형의 공개 표식들' },
    onSelect: { action: 'select-member', description: '같은 유형의 다른 표식 상세로 이동' },
  },
  args: { glyph, interpretation: meanings.interpretations[glyph.id], interpretations: meanings.interpretations, members: section.glyphs },
};
export const Default = {};
export const OnlyMember = { args: { members: [glyph] } };
export const Unconfirmed = { args: { interpretation: null, members: [] } };
