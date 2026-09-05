import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Placeholder from '../../common/ui/Placeholder';
import GlyphDetailPage from './GlyphDetailPage';
import { createArchiveStoryClient, ARCHIVE_STORY_GLYPHS, ARCHIVE_STORY_IDS } from '../../test-fixtures/archiveClient';

export default {
  title: 'Page/Response Archive/GlyphDetailPage', component: GlyphDetailPage, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', route: `/glyph/${ARCHIVE_STORY_IDS.left}`, docs: { description: { component: '저장된 Heptapod B 표식과 형태가 공명하는 다른 표식의 미리보기입니다. 관측 부위를 확인하고 내 이름을 변환해 비교합니다. 표식 없음·형태 공명 없음·조회 실패는 별도 메모리 응답으로 재현합니다.' } } },
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
