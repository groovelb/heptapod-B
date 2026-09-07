import { createElement } from 'react';
import Box from '@mui/material/Box';
import ArchiveArchetypeFeed from './ArchiveArchetypeFeed';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph.js';
import { groupArchiveMeanings } from '../../utils/heptapod/groupArchiveMeanings.js';
import { buildArchiveArchetypeFeed } from '../../utils/heptapod/buildArchiveArchetypeFeed.js';

const glyphs = ['Louise', 'Hannah', 'Ian', 'Abbott', 'Costello', '민준', '서연', 'Louis', 'Mia', 'Noah', 'Olivia', 'Liam', 'Emma', 'Sophia', 'Ethan', 'Amelia', 'Louise?'].map((name, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  display_name: name, is_public: true, model_data: buildArchiveModel(name),
}));
const meanings = groupArchiveMeanings(glyphs);
const familyId = [...new Set(Object.values(meanings.interpretations).map((item) => item.baseMeaning))]
  .sort((left, right) => meanings.groups.filter((item) => item.meaningIds.includes(right)).length
    - meanings.groups.filter((item) => item.meaningIds.includes(left)).length)[0];
const members = glyphs.filter((glyph) => meanings.interpretations[glyph.id].baseMeaning === familyId);
const feed = buildArchiveArchetypeFeed(members, meanings);
const partialMeanings = { ...meanings, interpretations: { ...meanings.interpretations,
  [members[0].id]: { ...meanings.interpretations[members[0].id], status: 'partial', meaningKey: null,
    modifiers: { ...meanings.interpretations[members[0].id].modifiers, trace: null } },
} };

export default {
  title: 'Custom Component/5. Data Display/ArchiveArchetypeFeed', component: ArchiveArchetypeFeed, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: '본문·핵심 문장·제목·소제목·보조 정보에 editorial 시맨틱 타이포를 적용하고, 줄 길이·여백·구분선도 테마 토큰으로 관리합니다. 유형 제목 아래에 JSON 메타데이터 조합 설명과 핵심 서사를 표시합니다. 모든 화면에서 유형 상징·제목·서사를 세로로 쌓아 640px 본문 시작선을 통일합니다. Archive 전용 간격으로 설명 블록과 다음 유형 사이를 구분합니다. 하나의 계열에 속한 실제 구성원을 정확한 유형별로 이어 보여주는 세로 피드입니다. 유형의 저작 상징·이름·한 문장 설명 아래 사람의 표식을 곧바로 표시하며, 유형 탭·빈 유형·관측 집계를 추가하지 않습니다. 데스크톱 왼쪽 44px·모바일 상단 가로 sticky 인덱스의 작은 원은 유형 순서와 상대 분량을 나타내고 현재 원만 채웁니다. 유형명과 개수는 툴팁에서만 표시하고 선택하면 같은 피드 안으로 이동합니다. 상징은 구성원 수나 전후 이동에 포함되지 않습니다. 모바일 2열·데스크톱 3열과 기존 Canvas 형성을 사용합니다. 예제는 로컬에서 만든 실제 이름 모델과 명시적인 부분 판독 DTO만 사용합니다.' } } },
  decorators: [(Story) => <Box sx={ { minHeight: '100svh', px: { xs: 2, md: 5 }, color: 'custom.chamber.ink', bgcolor: 'custom.chamber.fog' } }>{ createElement(Story) }</Box>],
  argTypes: {
    feed: { control: 'object', description: '순수 projection의 sections/untypedGlyphs/glyphs. 실제 구성원만 포함' },
    onSelect: { action: 'select-member', description: '개인 표식을 선택할 때 UUID 전달' },
    sx: { control: 'object', description: '피드 외부 컨테이너의 MUI sx' },
  },
  args: { feed, sx: {} },
};

export const Docs = {};
export const Partial = { args: { feed: buildArchiveArchetypeFeed(members, partialMeanings) } };
export const Empty = { args: { feed: buildArchiveArchetypeFeed([], meanings) } };

export const Narrow = { decorators: [(Story) => <Box sx={ { maxWidth: 358, mx: 'auto' } }>{ createElement(Story) }</Box>] };
