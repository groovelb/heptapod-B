import RelationInspector from './RelationInspector';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { relateGlyphs } from '../../utils/heptapod/relateGlyphs';

function glyph(name) {
  const model = buildArchiveModel(name);
  return { id: `story-${name}`, canonical_name: model.meta.canonicalName, is_interrogative: Boolean(model.questionHook), encoder_version: 2, model_data: model };
}
const left = glyph('Louise');
const right = glyph('Hannah');
const relations = relateGlyphs(left, right);
const variant = glyph('Louise?');
const variantRelations = relateGlyphs(left, variant);

export default {
  title: 'Custom Component/9. Overlay & Feedback/RelationInspector', component: RelationInspector, tags: ['autodocs'],
  parameters: { docs: { description: { component: '두 실제 표식을 나란히 놓고 형태 공명의 관측 부위를 확인합니다. 관측 설명·측정값·다른 표식으로의 중심 이동을 제공하며, 원본 이름은 각 표식의 라벨로만 표시합니다.' } } },
  argTypes: {
    relation: { control: 'object', description: 'leftGlyph·neighborGlyph·이름 라벨·v3 형태 관측 배열' },
    open: { control: 'boolean', description: '패널 열림' },
    onClose: { action: 'close', description: '닫기' },
    onExplore: { action: 'explore-id', description: '중심을 이동할 이웃 ID' },
    onCompare: { action: 'compare-id', description: '비교할 이웃 ID' },
  },
  args: { open: true, relation: { id: right.id, nameA: 'Louise', nameB: 'Hannah', leftGlyph: left, neighborGlyph: right, model: right.model_data, ...relations[0], relations } },
};

export const Default = {};
export const QuestionVariant = { args: { relation: { id: variant.id, nameA: 'Louise', nameB: 'Louise?', leftGlyph: left, neighborGlyph: variant, model: variant.model_data, ...variantRelations[0], relations: variantRelations } } };
export const Closed = { args: { open: false } };
export const MissingEvidence = { args: { relation: { id: right.id, nameA: 'Louise', nameB: 'Louise?', relationType: 'VARIANT', reasons: [], model: right.model_data } } };
