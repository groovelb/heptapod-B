import { useState } from 'react';
import GlyphMeaningSummary from './GlyphMeaningSummary';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { interpretGlyphMeaning } from '../../utils/heptapod/interpretGlyphMeaning';

const complete = interpretGlyphMeaning(buildArchiveModel('Louise'));
const partial = interpretGlyphMeaning(buildArchiveModel('Hannah'));

function SelectableSummary(args) {
  const [selection, setSelection] = useState(args.selectedObservationId);
  return <GlyphMeaningSummary { ...args } selectedObservationId={ selection } onSelectObservation={ (observation) => {
    setSelection(observation?.id || null);
    args.onSelectObservation?.(observation);
  } } />;
}

export default {
  title: 'Custom Component/5. Data Display/GlyphMeaningSummary', component: GlyphMeaningSummary, tags: ['autodocs'],
  parameters: { docs: { description: { component: '실제 모델에서 판독한 프로젝트의 의미와 형태 근거를 표시합니다. reading은 Archive와 같은 유형명·서사를 먼저 보여주고 선택한 공통 의미의 개별 배치를 설명합니다. partial/invalid는 유형을 강제하지 않습니다. 스토리의 Louise는 완전 판독, Hannah는 먹 분포 일부가 미확인인 실제 생성 모델입니다. 선택 콜백으로 관측 객체와 실제 anchors를 부모에 전달합니다. 이 컴포넌트는 표식을 재생성하거나 네트워크를 요청하지 않습니다.' } } },
  argTypes: {
    interpretation: { control: 'object', description: 'interpretGlyphMeaning의 순수 판독 결과' },
    compact: { control: 'boolean', description: '제목과 판독 상태만 간결하게 표시' },
    variant: { control: 'select', options: ['summary', 'reading'], description: '기존 요약 또는 한 의미씩 읽는 고정 높이 판독. 선택은 부모가 관리' },
    fg: { control: 'color', description: '인코더의 어두운/밝은 배경에 맞춘 전경색. 기본 chamber.ink' },
    selectedObservationId: { control: 'text', description: '부모가 선택한 관측 ID. null이면 표시 없음' },
    onSelectObservation: { action: 'select-observation', description: '관측 객체 또는 선택 해제 시 null. 부모가 실제 부위를 표시' },
    onExplore: { action: 'explore-meaning', description: '현재 interpretation으로 의미군 탐색. 미제공 시 CTA 숨김' },
    sx: { control: 'object', description: '추가 MUI sx' },
  },
  args: { interpretation: complete, compact: false, selectedObservationId: null, sx: { maxWidth: 680 } },
};

export const Default = {};
export const Reading = { args: { variant: 'reading', sx: { maxWidth: 280 } }, render: (args) => <SelectableSummary { ...args } /> };
export const Partial = { args: { interpretation: partial } };
export const Invalid = { args: { interpretation: interpretGlyphMeaning(null) } };
export const Compact = { args: { compact: true } };
