import { useState } from 'react';
import ArchiveMeaningExplorer from './ArchiveMeaningExplorer';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { groupArchiveMeanings } from '../../utils/heptapod/groupArchiveMeanings';

const glyphs = ['Louise', 'Hannah', 'Louise?', 'Abbott', 'Ian', 'Ava', '민준', '민수', '明月', 'Louis', 'Mia', 'Noah', 'Olivia', 'Liam', 'Emma', 'Sophia', 'Ethan', 'Amelia'].map((name, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, display_name: name, is_public: true, model_data: buildArchiveModel(name),
}));
const meanings = groupArchiveMeanings(glyphs);
const emptyFilter = { base: null, modifiers: [], groupId: null, status: 'all' };
// Explicit malformed-data fixture only for the unknown-state controls.
const mixedGlyphs = [...glyphs, { id: '00000000-0000-4000-8000-000000000999', display_name: 'Invalid model fixture', is_public: true, model_data: {} }];

function ControlledExplorer(args) {
  const [filter, setFilter] = useState(args.filter);
  return <ArchiveMeaningExplorer { ...args } filter={ filter } onFilterChange={ (next) => {
    setFilter(next);
    args.onFilterChange?.(next);
  } } />;
}

export default {
  title: 'Custom Component/5. Data Display/ArchiveMeaningExplorer', component: ArchiveMeaningExplorer, tags: ['autodocs'],
  parameters: { docs: { description: { component: '네트워크 없이 실제 생성 모델을 판독한 의미군입니다. 기본 의미 하나와 추가 의미 AND 조건, 정확히 같은 복합 의미군, 판독 상태를 선택합니다. 1개짜리 의미군도 그대로 유지합니다. 구성원이 둘 이상인 그룹에서는 이름으로 두 표식을 선택해 의미 비교로 이동할 수 있습니다. 같은 ID를 고르면 비교가 비활성화됩니다. 숫자는 현재 불러온 표본에 한정하며 정밀 형태 공명 점수가 아닙니다. filterMeaningGlyphs를 부모 갤러리와 공유합니다.' } } },
  argTypes: {
    meanings: { control: 'object', description: 'groupArchiveMeanings/provider의 검증된 집계 DTO' },
    glyphs: { control: 'object', description: '현재 불러온 공개 표식 모델' },
    filter: { control: 'object', description: 'base 1개, modifiers AND, groupId exact, status all/partial/invalid' },
    loading: { control: 'boolean', description: '의미 판독 중. 기존 결과 대신 진행 상태 표시' },
    error: { control: 'text', description: '판독 오류. 오류가 있으면 이전 필터는 표시하지 않음' },
    onRetry: { action: 'retry', description: '부모에 다시 시도 요청' },
    onFilterChange: { action: 'filter-change', description: '변경된 전체 filter 객체 전달' },
    onShare: { action: 'share-filter', description: '현재 filter 복사본 전달. 미제공 시 공유 숨김' },
    onCompare: { action: 'compare-meaning-members', description: '선택한 두 공개 구성원의 (leftId, rightId). 미제공 시 선택·비교 UI 숨김' },
  },
  args: { glyphs, meanings, filter: emptyFilter, loading: false, error: null },
};

export const Default = { render: (args) => <ControlledExplorer { ...args } /> };
export const SingleMemberGroup = { args: { filter: { ...emptyFilter, groupId: meanings.groups.find((group) => group.memberIds.length === 1)?.id || meanings.groups[0]?.id } } };
export const CompareGroupMembers = {
  args: { filter: { ...emptyFilter, groupId: meanings.groups.find((group) => group.memberIds.length >= 2)?.id } },
  render: (args) => <ControlledExplorer { ...args } />,
};
export const PartialAndUnknown = {
  args: { glyphs: mixedGlyphs, meanings: groupArchiveMeanings(mixedGlyphs), filter: { ...emptyFilter, status: 'partial' } },
  render: (args) => <ControlledExplorer { ...args } />,
};
export const Empty = { args: { glyphs: [], meanings: groupArchiveMeanings([]) } };
export const Loading = { args: { meanings: null, loading: true } };
export const Error = { args: { meanings: null, error: '형태에서 의미를 읽는 작업을 완료하지 못했어요.' } };
