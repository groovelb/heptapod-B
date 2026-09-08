import GlyphRenderScope from './GlyphRenderScope';
import ArchiveGlyph from './ArchiveGlyph';
import { ARCHIVE_FAMILY_SYMBOLS } from '../../data/archiveFamilySymbols';

export default {
  title: 'Custom Component/5. Data Display/GlyphRenderScope', component: GlyphRenderScope, tags: ['autodocs'],
  parameters: { docs: { description: { component: '개인 상세 하위 표식 전체의 live 예외를 지정하는 렌더 정책입니다. responsive는 900px 미만에 이미지를 사용하며 static은 스토리 검증 등에 사용합니다.' } } },
  argTypes: {
    mode: { control: 'select', options: ['live', 'responsive', 'static'], description: '하위 표식 렌더 정책' },
    children: { control: false, description: '렌더 정책을 공유할 표식/상세 컴포넌트' },
  },
  args: { mode: 'live' },
  render: (args) => <GlyphRenderScope { ...args }><ArchiveGlyph glyph={ ARCHIVE_FAMILY_SYMBOLS.arrival.surface } maxSize={ 256 } /></GlyphRenderScope>,
};
export const Default = {};
export const Static = { args: { mode: 'static' } };
