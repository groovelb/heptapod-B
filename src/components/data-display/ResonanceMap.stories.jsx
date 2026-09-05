import ResonanceMap from './ResonanceMap';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';
import { relateGlyphs } from '../../utils/heptapod/relateGlyphs';

function glyph(name) {
  const model = buildArchiveModel(name);
  return { id: `story-${name}`, canonical_name: model.meta.canonicalName, is_interrogative: Boolean(model.questionHook), encoder_version: 2, model_data: model };
}
const center = glyph('Louise');
const neighbors = ['Louis', 'Louise?', 'Abbott', 'Costello', 'Ian', 'Hannah', 'Henry', 'Maya', 'Mina', 'Nora', 'Oliver', 'Sofia', 'Amelia', 'Ethan', 'Liam', 'Noah', 'Emma', 'Ava', 'Isla', 'Leo', 'Felix', 'Oscar', 'Theo', 'Aurora', 'Luna', 'Alice', 'Clara', 'Iris', 'Rowan', 'Julia', '유진', '민준', '민수', '지민', '서윤', '아린', '지우', '가온', '서연', '하윤', '서준', '시우', '은우', '수아', '민서', '예린', '하늘', '다온', '지안', '도윤', '김민준', '박하늘', '明月', '星', '遥', '美咲', '葵', '阳', '李华', '陈晨'].map((name) => {
  const neighbor = glyph(name);
  const relations = relateGlyphs(center, neighbor);
  return { id: neighbor.id, name, model: neighbor.model_data, ...relations[0], relations };
}).filter((neighbor) => neighbor.relations.length);

export default {
  title: 'Custom Component/5. Data Display/ResonanceMap', component: ResonanceMap, tags: ['autodocs'],
  parameters: { docs: { description: { component: '여러 이름을 실제로 변환한 뒤 형태 공명이 발견된 표식만 표시합니다. 최대 12개(좁은 화면 6개)의 이웃을 배치하며 선 무늬는 관측 부위를 뜻합니다. 노드 거리는 유사도나 공명의 강도를 나타내지 않습니다.' } } },
  argTypes: {
    centerModel: { control: 'object', description: '실제 중심 표식 모델' },
    centerName: { control: 'text', description: '중심 이름' },
    relations: { control: 'object', description: 'ID별 이웃과 v3 실제 형태 관측' },
    onNodeSelect: { action: 'explore-id', description: '중심을 이동할 이웃 ID' },
    onInspect: { action: 'inspect-neighbor', description: '선택한 이웃의 근거' },
    width: { control: { type: 'number', min: 280, max: 960 }, description: '최대 지도 폭 px' },
    height: { control: { type: 'number', min: 320, max: 960 }, description: '지도 비율 기준 높이 px' },
    sx: { control: 'object', description: '추가 MUI sx' },
  },
  args: { centerModel: center.model_data, centerName: 'Louise', relations: neighbors, width: 560, height: 560 },
};

export const Default = {};
export const NoRelations = { args: { relations: [] } };
export const NarrowLayout = { args: { width: 320, height: 360 } };
