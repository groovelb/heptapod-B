import ResonanceList from './ResonanceList';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { relateGlyphs } from '../../utils/heptapod/relateGlyphs';

function glyph(name) {
  const model = buildArchiveModel(name);
  return { id: `story-${name}`, canonical_name: model.meta.canonicalName, is_interrogative: Boolean(model.questionHook), encoder_version: 2, model_data: model };
}
const center = glyph('Louise');
const neighbors = ['Hannah', 'Louise?', 'Louis'].map((name) => {
  const neighbor = glyph(name);
  const relations = relateGlyphs(center, neighbor);
  return { id: neighbor.id, name, model: neighbor.model_data, ...relations[0], relations };
}).filter((neighbor) => neighbor.relations.length);

export default {
  title: 'Custom Component/5. Data Display/ResonanceList', component: ResonanceList, tags: ['autodocs'],
  parameters: { docs: { description: { component: '실제 변환 모델에서 관측한 가지·개구부·잉크·링의 공명을 이웃 ID별로 표시합니다. 전체 형태와 일부 구조의 공명을 구분하며, 관측 부위 확인과 중심 이동은 별도 동작입니다.' } } },
  argTypes: {
    centerName: { control: 'text', description: '중심 이름' },
    relations: { control: 'object', description: 'ID별 이웃과 v3 형태 관측 근거' },
    onNodeSelect: { action: 'explore-id', description: '탐색할 이웃 ID' },
    onInspect: { action: 'inspect-neighbor', description: '선택한 이웃 데이터' },
    loading: { control: 'boolean', description: '불러오는 중' },
    error: { control: 'text', description: '실패 상태. 무관계와 별개' },
    onRetry: { action: 'retry', description: '재시도' },
    emptyMessage: { control: 'text', description: '조회 범위를 설명하는 빈 상태 문장' },
    sx: { control: 'object', description: '추가 MUI sx' },
  },
  args: { centerName: 'Louise', relations: neighbors, loading: false, error: null, sx: { maxWidth: 640 } },
};

export const Default = {};
export const NoRelations = { args: { relations: [] } };
export const Loading = { args: { loading: true } };
export const Error = { args: { error: 'Network unavailable' } };
