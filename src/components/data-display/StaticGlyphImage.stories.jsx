import { createElement } from 'react';
import Box from '@mui/material/Box';
import StaticGlyphImage from './StaticGlyphImage';
import { ARCHIVE_FAMILY_SYMBOLS, ARCHIVE_TIMELINE_SYMBOL } from '../../data/archiveFamilySymbols';

export default {
  title: 'Custom Component/5. Data Display/StaticGlyphImage', component: StaticGlyphImage, tags: ['autodocs'],
  parameters: { docs: { description: { component: '크기를 예약한 투명 PNG 표식입니다. 저작 표식은 번들 manifest, 공개 UUID는 원본 모델로 Worker에서 256px 표식을 먼저 표시하고, 접근 확인 API 이미지가 디코딩되면 교체합니다. 미저장 모델은 로컬 Worker 이미지를 유지합니다. 실패해도 Canvas를 시작하지 않습니다. 이 스토리는 로컬 저작 자산만 표시합니다.' } } },
  decorators: [(Story) => <Box sx={ { width: 256, bgcolor: 'custom.chamber.fog' } }>{ createElement(Story) }</Box>],
  argTypes: {
    model: { control: 'object', description: '저장된 원본 모델' },
    glyphId: { control: 'text', description: '공개 DB UUID. 미저장 모델에는 생략' },
    size: { control: 'number', description: 'CSS 표시 크기. 128 이하 256px, 그 이상 512px 이미지 선택' },
    alt: { control: 'text', description: '장식 표식이면 빈 문자열' },
    sx: { control: 'object', description: '정방형 표면 MUI 스타일' },
  },
  args: { model: ARCHIVE_FAMILY_SYMBOLS.arrival.model, size: 256, alt: 'Arrival' },
};
export const Default = {};
export const Timeline = { args: { model: ARCHIVE_TIMELINE_SYMBOL.model_data, alt: 'All by time' } };
