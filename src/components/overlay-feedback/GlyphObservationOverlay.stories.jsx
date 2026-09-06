import Box from '@mui/material/Box';
import GlyphNode from '../data-display/GlyphNode';
import GlyphObservationOverlay from './GlyphObservationOverlay';
import { ARCHIVE_STORY_GLYPHS } from '../../test-fixtures/archiveClient';

const model = ARCHIVE_STORY_GLYPHS[0].model_data;
export default {
  title: 'Custom Component/Overlay Feedback/GlyphObservationOverlay', component: GlyphObservationOverlay, tags: ['autodocs'],
  parameters: { docs: { description: { component: '원래 표식의 Canvas 좌표를 유지한 관측 부위 표시입니다. 표식을 돌리거나 형태를 변형하지 않습니다. 아카이브의 생성 애니메이션과 정적 쌍 비교 위에 같은 표시부를 사용합니다.' } } },
  argTypes: {
    model: { control: 'object', description: '관측 대상의 실제 저장 모델' },
    anchors: { control: 'object', description: '부위 종류·각도·가지 인덱스·표시 번호' },
    fg: { control: 'color', description: '분석 모드 전경색. 미지정 시 Archive 잉크색' },
  },
  decorators: [(Story, context) => <Box sx={ { position: 'relative', width: 248 } }><GlyphNode model={ context.args.model } size={ 248 } sx={ { p: 0, border: 0 } } /><Story /></Box>],
  args: { model, anchors: [{ kind: 'branch', clusterIndex: 0, ang: model.clusters[0].ang, number: 1 }] },
};
export const Default = {};
export const NoObservation = { args: { anchors: [] } };
