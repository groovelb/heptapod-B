import { createElement } from 'react';
import Box from '@mui/material/Box';
import GlyphNode from './GlyphNode';
import GlyphRenderScope from './GlyphRenderScope';
import { ARCHIVE_FAMILY_SYMBOLS } from '../../data/archiveFamilySymbols';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';

export default {
  title: 'Custom Component/5. Data Display/GlyphNode', component: GlyphNode, tags: ['autodocs'],
  parameters: { docs: { description: { component: '모바일은 이미지, PC와 개인 상세는 기존 정지 Canvas를 사용합니다. DB UUID가 있으면 공개 확인 API를 사용하고 미저장 모델은 Worker에서 한 번 생성합니다. 화면 200px 근처에서 기하 생성과 그리기를 한 번 실행하고 같은 잉크 스프라이트를 공유합니다. 네트워크와 애니메이션 없이 표식·선택·데이터 누락을 확인합니다.' } } },
  decorators: [(Story) => <Box sx={ { p: 3, bgcolor: 'custom.chamber.fog', display: 'inline-flex' } }>{ createElement(Story) }</Box>],
  argTypes: {
    model: { control: 'object', description: '실제 저장 모델' },
    glyphId: { control: 'text', description: '공개 DB UUID. 로컬 모델에는 생략' },
    size: { control: { type: 'number', min: 32, max: 320 }, description: '정방형 크기 px' },
    label: { control: 'text', description: '표시 이름과 접근성 이름' },
    isSelected: { control: 'boolean', description: '선택 상태' },
    onClick: { action: 'selected', description: '선택 동작. Enter/Space도 지원' },
    sx: { control: 'object', description: '추가 MUI sx' },
  },
  args: { model: buildArchiveModel('Louise'), size: 120, label: 'Louise', isSelected: false },
};

export const Default = {};
export const Selected = { args: { isSelected: true } };
export const MissingModel = { args: { model: null } };

export const MobileImage = { args: { model: ARCHIVE_FAMILY_SYMBOLS.arrival.model }, decorators: [(Story) => <GlyphRenderScope mode="static">{ createElement(Story) }</GlyphRenderScope>] };
