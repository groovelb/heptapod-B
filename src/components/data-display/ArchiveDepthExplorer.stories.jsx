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
  parameters: { layout: 'fullscreen', docs: { description: { component: '모바일 상세에서 원래 표식이 지나가면 내비게이션 대신 배경 없는 원본 표식·뒤로가기·공유 한 줄만 축소 고정합니다. 분석·메타 시각화는 큰 표식에서만 표시합니다. 작은 표식으로 복귀하며 선택 상태를 유지합니다. 루트의 빈 내비게이션은 높이를 차지하지 않습니다. 페이지 제목은 GNB 뒤 24/32px, 깊이 제목과 상세는 실제 내비게이션 뒤 공통 16px에서 시작합니다. 상단 내비게이션 바는 모든 탐색 단계에서 투명 배경을 유지합니다. 군집 원은 모든 화면에서 첫 행 3개, 시간순 원은 다음 중앙에 한 줄 제목으로 표시합니다. 군집 대표 설명은 데스크톱에서 같은 높이에 정렬하고 모바일에서는 시간순 원 다음 전체 폭의 이름·설명 행으로 제공합니다. 깊이 안에서는 상위 군집 설명 다음에 조합별 추가 설명과 유형 서사를 표시합니다. 뒤로 가기·현재 경로·정렬·공유 바는 GNB 아래에 sticky로 유지됩니다. 바가 줄바꿈되면 데스크톱 세로·모바일 가로 인덱스와 앵커 여백도 실제 높이에 맞춥니다. 군집 설명·유형 제목·본문은 640px 정렬축을 공유합니다. 유형별 실제 구성원 피드에서 원 중앙의 이름을 선택하면 상세 화면으로 전환합니다. 모달·Next·Compare 없이 초록 분석 효과와 의미 선택, 같은 정확한 유형의 다른 표식, 공통 의미별 실제 부위 그리드를 표시합니다. 목록은 숨긴 채 마운트를 유지하고 돌아오면 원래 구성원으로 포커스를 복원합니다. 실제 URL·스크롤 복원은 MyArchivePage의 책임입니다. 부분 판독 표식의 유형을 강제하지 않으며, 저작 상징은 사람/평균 표식이 아닙니다. 형성·감소 모션 유지. 로컬 DTO만 사용하며 네트워크·DB·오디오는 없습니다.' } } },
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

export const NarrowHome = { decorators: [(Story) => <Box sx={ { maxWidth: 358, mx: 'auto' } }>{ createElement(Story) }</Box>], render: Docs.render };

export const MobileReading = {
  ...OnePerson,
  parameters: { docs: { description: { story: '900px 미만 화면에서 설명까지 스크롤하면 축소 관찰 영역이 나타납니다. 투명 배경·분석 및 메타 시각화 숨김, 큰 표식으로 복귀 시 선택 복원, 설명 끝에서 고정 해제를 확인합니다. 낮은 화면에서는 작은 표식을 한 단계 더 줄입니다.' } } },
};
