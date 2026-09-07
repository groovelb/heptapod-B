import { createElement, useState } from 'react';
import Box from '@mui/material/Box';
import GlyphObservationChips from './GlyphObservationChips';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { interpretGlyphMeaning } from '../../utils/heptapod/interpretGlyphMeaning';
import { buildMeaningReading } from '../../utils/heptapod/buildMeaningReading';

const entries = buildMeaningReading(interpretGlyphMeaning(buildArchiveModel('Louise')));
function InteractiveChips(args) {
  const [selectedIds, setSelectedIds] = useState(args.selectedIds);
  return <GlyphObservationChips { ...args } selectedIds={ selectedIds } onToggle={ (entry) => {
    setSelectedIds((ids) => ids.includes(entry.id) ? ids.filter((id) => id !== entry.id) : [...ids, entry.id]);
    args.onToggle?.(entry);
  } } />;
}

export default {
  title: 'Custom Component/7. Input & Control/GlyphObservationChips',
  component: GlyphObservationChips, tags: ['autodocs'],
  parameters: { docs: { description: { component: '각 메타데이터를 독립적으로 켜고 끄는 다중 토글 칩. 체크·채움색·aria-pressed로 상태를 표시하고, 선택 배열과 실제 시각화는 부모가 관리합니다. 분석 패널이나 서사를 만들지 않아 Archive의 기존 설명과 함께 사용할 수 있습니다.' } } },
  decorators: [(Story) => <Box sx={ { p: 3, bgcolor: 'custom.chamber.fog', color: 'custom.chamber.ink' } }>{ createElement(Story) }</Box>],
  argTypes: {
    entries: { control: 'object', description: 'buildMeaningReading으로 만든 현 언어의 관측 항목' },
    selectedIds: { control: 'object', description: '현재 켜진 관측 ID 배열' },
    onToggle: { action: 'toggle', description: '누른 관측 객체. 부모가 해당 ID만 추가/제거' },
    fg: { control: 'color', description: '전경색. 기본 chamber.ink' },
    sx: { control: 'object', description: '추가 MUI sx' },
  },
  args: { entries, selectedIds: [] },
};
export const Docs = { render: (args) => <InteractiveChips { ...args } /> };
export const SeveralOn = { args: { selectedIds: entries.map((entry) => entry.id) }, render: (args) => <InteractiveChips { ...args } /> };
