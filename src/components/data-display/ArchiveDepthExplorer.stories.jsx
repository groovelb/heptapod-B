import { createElement, useState } from 'react';
import Box from '@mui/material/Box';
import ArchiveDepthExplorer from './ArchiveDepthExplorer';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { groupArchiveMeanings } from '../../utils/heptapod/groupArchiveMeanings';
import { EMPTY_ARCHIVE_FILTER } from '../../utils/heptapod/archiveDepthView';

const glyphs = ['Louise', 'Hannah', 'Ian', 'Abbott', 'Costello', '민준', '서연', 'Louis', 'Mia', 'Noah', 'Olivia', 'Liam', 'Emma', 'Sophia', 'Ethan', 'Amelia', 'Louise?'].map((name, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  display_name: name, is_public: true, created_at: new Date(Date.UTC(2026, 8, 1, index)).toISOString(), model_data: buildArchiveModel(name),
}));
const meanings = groupArchiveMeanings(glyphs);
const family = [...new Set(Object.values(meanings.interpretations).map((item) => item.baseMeaning))]
  .sort((left, right) => meanings.groups.filter((item) => item.meaningIds.includes(right)).length
    - meanings.groups.filter((item) => item.meaningIds.includes(left)).length)[0];
const firstMember = glyphs.find((glyph) => meanings.interpretations[glyph.id].baseMeaning === family);
// A local partial DTO intentionally retains a real model without forcing a type.
const partialMeanings = { ...meanings, interpretations: { ...meanings.interpretations,
  [firstMember.id]: { ...meanings.interpretations[firstMember.id], status: 'partial', meaningKey: null,
    modifiers: { ...meanings.interpretations[firstMember.id].modifiers, trace: null } },
} };

function InteractiveDepth(args) {
  const [selection, setSelection] = useState({ filter: args.filter, focusedId: args.focusedId, order: args.order });
  return <ArchiveDepthExplorer { ...args } { ...selection }
    onOrderChange={ (order) => setSelection({ filter: EMPTY_ARCHIVE_FILTER, focusedId: null, order }) }
    onFilterChange={ (filter) => { setSelection({ filter, focusedId: null, order: null }); args.onFilterChange?.(filter); } }
    onFocusGlyph={ (focusedId) => { setSelection((previous) => ({ ...previous, focusedId })); args.onFocusGlyph?.(focusedId); } } />;
}

export default {
  title: 'Custom Component/5. Data Display/ArchiveDepthExplorer', component: ArchiveDepthExplorer, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: '뒤로 가기·현재 경로·정렬·공유 바는 GNB 아래에 sticky로 유지됩니다. 바가 줄바꿈되면 왼쪽 인덱스와 앵커 여백도 실제 높이에 맞춥니다. 모바일은 계열·시간순 진입을 2열로, PC는 기존 3개 계열과 둘째 행 중앙 시간순 진입으로 표시합니다. 군집 3개는 첫 행, 시간순 보기 원은 둘째 행 중앙입니다. 유형별 실제 구성원 피드에서 원 중앙의 이름을 선택하면 상세 화면으로 전환합니다. 모달·Next·Compare 없이 초록 분석 효과와 의미 선택, 같은 정확한 유형의 다른 표식, 공통 의미별 실제 부위 그리드를 표시합니다. 목록은 숨긴 채 마운트를 유지하고 돌아오면 원래 구성원으로 포커스를 복원합니다. 실제 URL·스크롤 복원은 MyArchivePage의 책임입니다. 부분 판독 표식의 유형을 강제하지 않으며, 저작 상징은 사람/평균 표식이 아닙니다. 형성·감소 모션 유지. 로컬 DTO만 사용하며 네트워크·DB·오디오는 없습니다.' } } },
  decorators: [(Story) => <Box sx={ { minHeight: '100svh', px: { xs: 2, md: 5 }, bgcolor: 'custom.chamber.fog' } }>{ createElement(Story) }</Box>],
  argTypes: {
    order: { control: 'select', options: [null, 'newest', 'oldest'], description: 'null은 군집, 나머지는 전체 등록 시간순' },
    onOrderChange: { action: 'change-order', description: '전체 보기·군집 보기 전환' },
    glyphs: { control: 'object', description: '불러온 공개 모델. 구성원 표식을 직접 렌더링' },
    meanings: { control: 'object', description: '검증된 의미 판독 DTO. 계산은 상위 책임' },
    filter: { control: 'object', description: 'URL과 동일한 base/modifiers/groupId/status 범위' },
    focusedId: { control: 'text', description: '현재 범위 안에서 크게 볼 표식 UUID' },
    onFilterChange: { action: 'navigate-depth', description: '상위/하위 깊이로 이동' },
    onFocusGlyph: { action: 'focus-person', description: '선택 표식 상세 화면으로 전환. null이면 목록 복귀' },
    onShare: { action: 'share-space', description: '현재 깊이의 공개 링크 공유' },
  },
  args: { glyphs, meanings, filter: EMPTY_ARCHIVE_FILTER, focusedId: null },
};

export const Docs = { render: (args) => <InteractiveDepth key={ JSON.stringify([args.filter, args.focusedId, args.order]) } { ...args } /> };
export const InsideFamily = { args: { filter: { ...EMPTY_ARCHIVE_FILTER, base: family } }, render: Docs.render };
export const Partial = { args: { filter: { ...EMPTY_ARCHIVE_FILTER, base: family }, meanings: partialMeanings }, render: Docs.render };
export const OnePerson = { args: { filter: { ...EMPTY_ARCHIVE_FILTER, base: family }, focusedId: firstMember.id }, render: Docs.render };
export const Empty = { args: { glyphs: [], meanings: groupArchiveMeanings([]) } };

export const Chronological = { args: { order: 'newest' }, render: Docs.render };
export const OldestFirst = { args: { order: 'oldest' }, render: Docs.render };
