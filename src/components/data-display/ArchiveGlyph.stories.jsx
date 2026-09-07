import { createElement } from 'react';
import Box from '@mui/material/Box';
import ArchiveGlyph from './ArchiveGlyph';
import { ARCHIVE_STORY_GLYPHS } from '../../test-fixtures/archiveClient';

export default {
  title: 'Custom Component/5. Data Display/ArchiveGlyph', component: ArchiveGlyph, tags: ['autodocs'],
  parameters: { docs: { description: { component: '실제 저장 모델의 입자 형성을 재사용하는 공통 표식입니다. 군집 안에서는 장식 표식, 구성원 화면에서는 이름이 붙은 키보드 버튼입니다. 뷰포트 지연 생성·백그라운드 정지·감소 모션을 유지합니다.' } } },
  decorators: [(Story) => <Box sx={ { width: '100%', maxWidth: 420, p: 2, bgcolor: 'custom.chamber.fog' } }>{ createElement(Story) }</Box>],
  argTypes: {
    glyph: { control: 'object', description: '표시할 공개 모델' },
    onSelect: { action: 'select-glyph', description: '제공하면 접근 가능한 버튼, 미제공이면 장식 표식' },
    showName: { control: 'boolean', description: '실제 이름을 표식 중앙에 크게 표시' },
    nameComponent: { control: 'select', options: ['span', 'h1'], description: '상세의 이름은 h1, 목록은 span' },
    analysis: { control: 'boolean', description: '초록 분석 라인만 겹침. 정점·좌표 프레임·계측 문구는 숨김' },
    fragmentAnchors: { control: 'object', description: '지정한 관측 주변의 원본 Canvas 부분만 표시' },
    maxSize: { control: { type: 'number', min: 80, max: 600 }, description: 'Canvas 최대 크기' },
    anchors: { control: 'object', description: '선택한 의미의 실제 관측 좌표. Canvas와 같은 정방형에서 강조' },
    sx: { control: 'object', description: 'MUI 표면 스타일' },
  },
  args: { glyph: ARCHIVE_STORY_GLYPHS.find((glyph) => glyph.is_public), showName: true, maxSize: 420 },
};
export const Default = {};
export const ClusterSample = { args: { showName: false, onSelect: undefined } };
export const Analysis = { args: { analysis: true } };
export const MissingModel = { args: { glyph: { id: 'unavailable', display_name: '아직 도착하지 않은 응답', model_data: null } } };
