import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Placeholder from '../../common/ui/Placeholder';
import GlyphDetailPage from './GlyphDetailPage';
import { createArchiveStoryClient, ARCHIVE_STORY_GLYPHS, ARCHIVE_STORY_IDS } from '../../test-fixtures/archiveClient';

export default {
  title: 'Page/Response Archive/GlyphDetailPage', component: GlyphDetailPage, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', route: `/glyph/${ARCHIVE_STORY_IDS.left}`, docs: { description: { component: '공통 fixed GNB에서 Archive를 활성 표시하고 모바일 Drawer를 제공합니다. 본문의 문맥별 뒤로가기는 유지합니다. 저장된 표식의 소속 군집 이름과 해당 군집으로 이동하는 링크를 표시합니다. 의미 해석과 정밀 공명을 분리합니다. 의미 근거를 선택하면 실제 모델의 해당 부위를 표시하고 같은 의미군으로 이동할 수 있습니다. 동일한 판독기를 아카이브·로컬 비교와 공유합니다. 표식 없음·정밀 공명 없음·조회 실패는 별도 메모리 응답으로 재현합니다.' } } },
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
export const RelationError = { args: { client: createArchiveStoryClient({ failures: { 'archive-relations': '연결을 불러오지 못했습니다.' } }) } };
