import { useState } from 'react';
import GlyphMeaningSummary from './GlyphMeaningSummary';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { interpretGlyphMeaning } from '../../utils/heptapod/interpretGlyphMeaning';

const complete = interpretGlyphMeaning(buildArchiveModel('Louise'));
const partial = interpretGlyphMeaning(buildArchiveModel('Hannah'));

function SelectableSummary(args) {
  const [selection, setSelection] = useState(args.selectedObservationIds || []);
  return <GlyphMeaningSummary { ...args } selectedObservationIds={ selection } onToggleObservation={ (observation) => {
    setSelection((ids) => ids.includes(observation.id) ? ids.filter((id) => id !== observation.id) : [...ids, observation.id]);
    args.onToggleObservation?.(observation);
  } } />;
}

export default {
  title: 'Custom Component/5. Data Display/GlyphMeaningSummary', component: GlyphMeaningSummary, tags: ['autodocs'],
  parameters: { docs: { description: { component: '본문·핵심 문장·제목·소제목·보조 정보에 editorial 시맨틱 타이포를 적용하고, 줄 길이·여백·구분선도 테마 토큰으로 관리합니다. Create 분석은 createReading 토큰으로 제목·인용문·토글·문단·구역 간격을 나눕니다. fitHeight는 칼럼 높이를 제목과 남은 본문 영역에 배분하며 칼럼 자체에 스크롤을 만들지 않습니다. 스크롤 배경과 트랙은 투명하고 손잡이에 text.secondary 토큰을 사용합니다. JSON v5의 직접적인 설명을 읽습니다. 독립 토글 칩으로 여러 관측을 켜고 끄며 선택한 근거를 함께 읽습니다. 체크·채움색·aria-pressed로 켜짐을 표시합니다. 실제 모델에서 판독한 프로젝트의 의미와 형태 근거를 표시합니다. reading은 Archive와 같은 유형명과 조합별 간결한 서사(v5)를 기존 설명 영역에 보여주고 선택한 공통 의미의 개별 배치를 설명합니다. partial/invalid는 유형을 강제하지 않습니다. 스토리의 Louise는 완전 판독, Hannah는 먹 분포 일부가 미확인인 실제 생성 모델입니다. 선택 콜백으로 관측 객체와 실제 anchors를 부모에 전달합니다. 이 컴포넌트는 표식을 재생성하거나 네트워크를 요청하지 않습니다.' } } },
  argTypes: {
    interpretation: { control: 'object', description: 'interpretGlyphMeaning의 순수 판독 결과' },
    fitHeight: { control: 'boolean', description: '칼럼 높이에 맞춰 제목 아래 판독 영역만 스크롤' },
    compact: { control: 'boolean', description: '제목과 판독 상태만 간결하게 표시' },
    variant: { control: 'select', options: ['summary', 'reading'], description: '기존 요약 또는 여러 의미를 함께 켜고 끄는 칩과 고정 높이 판독. 선택은 부모가 관리' },
    fg: { control: 'color', description: '인코더의 어두운/밝은 배경에 맞춘 전경색. 기본 chamber.ink' },
    selectedObservationIds: { control: 'object', description: '함께 표시할 관측 ID 배열. 빈 배열이면 모두 꺼짐' },
    onToggleObservation: { action: 'toggle-observation', description: '누른 관측 객체. 부모가 해당 ID만 추가/제거하며 나머지 선택 유지' },
    onExplore: { action: 'explore-meaning', description: '현재 interpretation으로 의미군 탐색. 미제공 시 CTA 숨김' },
    sx: { control: 'object', description: '추가 MUI sx' },
  },
  args: { interpretation: complete, compact: false, selectedObservationIds: [], sx: { maxWidth: (theme) => theme.editorial.measure } },
};

export const Docs = {};
export const Reading = { args: { variant: 'reading', sx: { maxWidth: (theme) => theme.editorial.railMeasure } }, render: (args) => <SelectableSummary { ...args } /> };
export const Partial = { args: { interpretation: partial } };
export const Invalid = { args: { interpretation: interpretGlyphMeaning(null) } };
export const Compact = { args: { compact: true } };
