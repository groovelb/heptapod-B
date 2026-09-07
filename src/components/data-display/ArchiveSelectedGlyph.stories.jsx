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
  parameters: { layout: 'fullscreen', docs: { description: { component: '표식과 제목 열은 공통 상단선에 정렬하며 제목 열의 추가 패딩을 두지 않습니다. 데스크톱 표식 열은 설명 끝까지 sticky이며, 분석 버튼은 표식 아래에 둡니다. 메타데이터 칩을 처음부터 표시하고 독립적으로 여러 부위를 켭니다. 분석은 원래 표식 위 초록 선만 토글하며 기존 제목·서사를 교체하거나 추가 설명 패널을 열지 않습니다. 본문·핵심 문장·제목·소제목·보조 정보에 editorial 시맨틱 타이포를 적용하고, 줄 길이·여백·구분선도 테마 토큰으로 관리합니다. JSON의 상위 군집·조합 설명과 유형의 특징·상황·긴장·질문·관계·차이·한마디를 표시합니다. 기존 설명 자리에 24유형별 장문 서사(v3)를 표시합니다. 원 중앙의 실제 이름과 표식, 초록 분석 효과와 관측 선택, 같은 정확한 유형의 구성원, 공통 의미별 원본 부위 그리드. 모달과 Next/Compare는 없습니다. 그리드는 선택 표식과 최대 두 구성원을 원본 좌표 그대로 보여줍니다. 로컬 공개 fixture만 사용합니다.' } } },
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
