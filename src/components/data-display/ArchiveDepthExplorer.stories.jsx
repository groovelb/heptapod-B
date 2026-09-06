import { createElement, useState } from 'react';
import Box from '@mui/material/Box';
import ArchiveDepthExplorer from './ArchiveDepthExplorer';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { groupArchiveMeanings } from '../../utils/heptapod/groupArchiveMeanings';
import { EMPTY_ARCHIVE_FILTER } from '../../utils/heptapod/archiveDepthView';

const glyphs = ['Louise', 'Hannah', 'Ian', 'Abbott', 'Costello', '민준', '서연', 'Louis', 'Mia', 'Noah', 'Olivia', 'Liam', 'Emma', 'Sophia', 'Ethan', 'Amelia', 'Louise?'].map((name, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  display_name: name, is_public: true, model_data: buildArchiveModel(name),
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
  const [selection, setSelection] = useState({ filter: args.filter, focusedId: args.focusedId });
  return <ArchiveDepthExplorer { ...args } { ...selection }
    onFilterChange={ (filter) => { setSelection({ filter, focusedId: null }); args.onFilterChange?.(filter); } }
    onFocusGlyph={ (focusedId) => { setSelection((previous) => ({ ...previous, focusedId })); args.onFocusGlyph?.(focusedId); } } />;
}

export default {
  title: 'Custom Component/5. Data Display/ArchiveDepthExplorer', component: ArchiveDepthExplorer, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: '기본 계열 상징을 선택하면 고유한 유형명·서사·저작 상징과 실제 구성원 표식이 세로 피드로 이어집니다. 메타 탭이나 별도 유형 선택 깊이가 없으며, 실제 구성원이 있는 정확한 유형만 표시합니다. 부분 판독 표식은 별도 메뉴·유형명 없이 유지합니다. 개인 Dialog의 전후 이동은 피드 순서와 같고, 닫으면 기존 Canvas·스크롤이 유지됩니다. 저작 상징은 사람이나 평균 표식이 아닙니다. 공간 공유 아이콘·관측 부위 강조·형성 효과·감소 모션을 보존합니다. 로컬 판독 DTO만 사용하는 표시 스토리이며 네트워크·DB·오디오는 없습니다.' } } },
  decorators: [(Story) => <Box sx={ { minHeight: '100svh', px: { xs: 2, md: 5 }, bgcolor: 'custom.chamber.fog' } }>{ createElement(Story) }</Box>],
  argTypes: {
    glyphs: { control: 'object', description: '불러온 공개 모델. 구성원 표식을 직접 렌더링' },
    meanings: { control: 'object', description: '검증된 의미 판독 DTO. 계산은 상위 책임' },
    filter: { control: 'object', description: 'URL과 동일한 base/modifiers/groupId/status 범위' },
    focusedId: { control: 'text', description: '현재 범위 안에서 크게 볼 표식 UUID' },
    onFilterChange: { action: 'navigate-depth', description: '상위/하위 깊이로 이동' },
    onFocusGlyph: { action: 'focus-person', description: '같은 공간에서 사람의 표식을 크게 보기. null이면 확대 닫기' },
    onInspectGlyph: { action: 'inspect-glyph', description: '선택한 표식의 상세 연결로 이동' },
    onCompare: { action: 'compare-glyphs', description: '현재 구성원 두 표식 비교' },
    onShare: { action: 'share-space', description: '현재 깊이의 공개 링크 공유' },
    shareNotice: { control: 'text', description: '확대된 표식 안에서 알리는 공유 완료 상태' },
    shareError: { control: 'text', description: '확대된 표식 안에서 알리는 공유 실패 상태' },
  },
  args: { glyphs, meanings, filter: EMPTY_ARCHIVE_FILTER, focusedId: null, shareNotice: '', shareError: '' },
};

export const Docs = { render: (args) => <InteractiveDepth key={ JSON.stringify([args.filter, args.focusedId]) } { ...args } /> };
export const InsideFamily = { args: { filter: { ...EMPTY_ARCHIVE_FILTER, base: family } }, render: Docs.render };
export const Partial = { args: { filter: { ...EMPTY_ARCHIVE_FILTER, base: family }, meanings: partialMeanings }, render: Docs.render };
export const OnePerson = { args: { filter: { ...EMPTY_ARCHIVE_FILTER, base: family }, focusedId: firstMember.id }, render: Docs.render };
export const Empty = { args: { glyphs: [], meanings: groupArchiveMeanings([]) } };
