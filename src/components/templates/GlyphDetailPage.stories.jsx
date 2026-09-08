import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Placeholder from '../../common/ui/Placeholder';
import GlyphDetailPage from './GlyphDetailPage';
import { createArchiveStoryClient, ARCHIVE_STORY_GLYPHS, ARCHIVE_STORY_IDS } from '../../test-fixtures/archiveClient';

export default {
  title: 'Page/Response Archive/GlyphDetailPage', component: GlyphDetailPage, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', route: `/glyph/${ARCHIVE_STORY_IDS.left}`, docs: { description: { component: '아카이브와 동일한 ArchiveDepthExplorer·ArchiveSelectedGlyph를 사용합니다. 안개 배경, 중앙 이름 표식, 유형 제목·서사, 분석 토글·관측 칩, 같은 유형 목록과 공통 부위 비교, 모바일 축소 관찰 동작을 공유합니다. 독립 상세 경로에서는 숨겨진 전체 목록을 마운트하지 않습니다. UUID 공유·비교·관계 탐색 링크와 조회 실패·버전 미지원 처리를 유지합니다.' } } },
  decorators: [(Story, context) => (
    <MemoryRouter initialEntries={ [context.parameters.route] } key={ context.parameters.route }>
      <Routes><Route path="/glyph/:id" element={ createElement(Story) } /><Route path="*" element={ <Placeholder.Box label="선택한 비교 또는 관계 탐색 화면" /> } /></Routes>
    </MemoryRouter>
  )],
  argTypes: { client: { control: false, description: '실제 모델·관계 응답을 제공하는 메모리 클라이언트' } },
  args: { client: createArchiveStoryClient() },
};

export const Default = {};
export const NoRelations = { args: { client: createArchiveStoryClient({ glyphs: ARCHIVE_STORY_GLYPHS.filter((glyph) => [ARCHIVE_STORY_IDS.left, ARCHIVE_STORY_IDS.unrelated].includes(glyph.id)) }) } };
export const Unavailable = { parameters: { route: `/glyph/${ARCHIVE_STORY_IDS.hidden}` }, args: { client: createArchiveStoryClient() } };
export const Loading = { args: { client: createArchiveStoryClient({ pending: ['glyphs', 'archive-relations'] }) } };
export const UnsupportedVersion = { parameters: { route: `/glyph/${ARCHIVE_STORY_IDS.left}?reading=meaning&mv=999` } };
export const MobileDetail = { parameters: { viewport: { value: 'mobile1' } } };
