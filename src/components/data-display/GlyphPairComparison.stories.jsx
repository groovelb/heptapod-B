import GlyphPairComparison from './GlyphPairComparison';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { relateGlyphs } from '../../utils/heptapod/relateGlyphs';

function glyph(name) {
  const model = buildArchiveModel(name);
  return { id: `story-${name}`, display_name: name, canonical_name: model.meta.canonicalName, is_interrogative: Boolean(model.questionHook), encoder_version: 2, model_data: model };
}
const left = glyph('Louise');
const right = glyph('Hannah');
const variant = glyph('Louise?');
const unrelated = glyph('Abbott');

export default {
  title: 'Custom Component/5. Data Display/GlyphPairComparison', component: GlyphPairComparison, tags: ['autodocs'],
  parameters: { docs: { description: { component: '이름을 실제로 변환한 모델 쌍의 공명을 비교합니다. 관측 부위를 선택하면 양쪽 실제 가지·개구부·링·잉크 위치에 같은 번호를 표시합니다. 전체 형태와 일부 구조의 공명을 구분하며 철자 유사도는 사용하지 않습니다. 공유·탐색은 전달된 콜백만 실행합니다.' } } },
  argTypes: {
    leftGlyph: { control: 'object', description: '왼쪽 DB 형태 Glyph' },
    rightGlyph: { control: 'object', description: '오른쪽 DB 형태 Glyph' },
    relations: { control: 'object', description: 'relateGlyphs의 실제 결과' },
    onExplore: { action: 'explore-id', description: '탐색할 Glyph ID' },
    onShare: { action: 'share-comparison', description: '비교 공유. 미제공 시 숨김' },
    sharing: { control: 'boolean', description: '공유 준비 중' },
    sx: { control: 'object', description: '추가 MUI sx' },
  },
  args: { leftGlyph: left, rightGlyph: right, relations: relateGlyphs(left, right), sharing: false, sx: { maxWidth: 760 } },
};

export const Default = {};
export const QuestionVariant = { args: { rightGlyph: variant, relations: relateGlyphs(left, variant) } };
export const NoRelations = { args: { rightGlyph: unrelated, relations: relateGlyphs(left, unrelated) } };
export const SameGlyph = { args: { rightGlyph: left, relations: [] } };
export const LocalComparison = { args: { rightGlyph: { ...right, id: 'local', is_local: true }, onShare: undefined } };
