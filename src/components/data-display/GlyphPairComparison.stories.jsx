import GlyphPairComparison from './GlyphPairComparison';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { relateGlyphs } from '../../utils/heptapod/relateGlyphs';
import { compareGlyphMeanings } from '../../utils/heptapod/interpretGlyphMeaning';

function glyph(name) {
  const model = buildArchiveModel(name);
  return { id: `story-${name}`, display_name: name, canonical_name: model.meta.canonicalName, is_interrogative: Boolean(model.questionHook), encoder_version: 2, model_data: model };
}
const left = glyph('Louise');
const right = glyph('Hannah');
const variant = glyph('Louise?');
const unrelated = glyph('Abbott');
const noCommonMeaning = glyph('明月');

export default {
  title: 'Custom Component/5. Data Display/GlyphPairComparison', component: GlyphPairComparison, tags: ['autodocs'],
  parameters: { docs: { description: { component: '모바일에서 손상된 모델의 대체 표시도 셀 너비에 맞춥니다. 정상 표식과 PC 배치는 유지합니다. 이름을 실제로 변환한 모델 쌍의 공명을 비교합니다. 선택적 의미 비교는 프로젝트의 형태 해석이며 정밀 공명과 별도 탭·근거를 사용합니다. 의미 보기에서 번호는 각 모델의 실제 관측 지점이며 서로 정확히 대응한다는 뜻이 아닙니다. 의미 정보가 없는 기존 호출은 그대로 정밀 공명만 표시합니다. 공유 시 현재 reading과 reason을 전달하며 네트워크를 사용하지 않습니다.' } } },
  argTypes: {
    leftGlyph: { control: 'object', description: '왼쪽 DB 형태 Glyph' },
    rightGlyph: { control: 'object', description: '오른쪽 DB 형태 Glyph' },
    relations: { control: 'object', description: 'relateGlyphs의 실제 결과' },
    meaningComparison: { control: 'object', description: 'compareGlyphMeanings의 별도 의미 비교 결과. 생략 시 읽기 토글 없음' },
    initialView: { control: 'select', options: ['precision', 'meaning'], description: '비제어 초기 보기. 의미 정보가 없으면 precision' },
    view: { control: 'select', options: [undefined, 'precision', 'meaning'], description: '선택적 제어 보기. 제공 시 onViewChange로 부모 상태 변경' },
    onViewChange: { action: 'reading-change', description: '선택한 reading 문자열 전달' },
    onExplore: { action: 'explore-id', description: '탐색할 Glyph ID' },
    onShare: { action: 'share-comparison', description: '현재 {reading, reason} 공유. 미제공 시 숨김' },
    sharing: { control: 'boolean', description: '공유 준비 중' },
    sx: { control: 'object', description: '추가 MUI sx' },
  },
  args: { leftGlyph: left, rightGlyph: right, relations: relateGlyphs(left, right), initialView: 'precision', sharing: false, sx: { maxWidth: 760 } },
};

export const Default = {};
export const QuestionVariant = { args: { rightGlyph: variant, relations: relateGlyphs(left, variant) } };
export const NoRelations = { args: { rightGlyph: unrelated, relations: relateGlyphs(left, unrelated) } };
export const SameGlyph = { args: { rightGlyph: left, relations: [] } };
export const LocalComparison = { args: { rightGlyph: { ...right, id: 'local', is_local: true }, onShare: undefined } };
export const MeaningPartial = { args: { meaningComparison: compareGlyphMeanings(left.model_data, right.model_data), initialView: 'meaning' } };
export const SameMeaningDifferentForm = { args: { rightGlyph: unrelated, relations: relateGlyphs(left, unrelated), meaningComparison: compareGlyphMeanings(left.model_data, unrelated.model_data), initialView: 'meaning' } };
export const NoCommonMeaning = { args: { rightGlyph: noCommonMeaning, relations: relateGlyphs(left, noCommonMeaning), meaningComparison: compareGlyphMeanings(left.model_data, noCommonMeaning.model_data), initialView: 'meaning' } };
// Intentionally malformed model fixture. It is not generated archive evidence.
export const MeaningInvalid = { args: { rightGlyph: { id: 'invalid-fixture', display_name: 'Invalid model fixture', model_data: {} }, relations: [], meaningComparison: compareGlyphMeanings(left.model_data, {}), initialView: 'meaning' } };
