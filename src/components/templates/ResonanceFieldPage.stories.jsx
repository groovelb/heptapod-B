import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Placeholder from '../../common/ui/Placeholder';
import ResonanceFieldPage from './ResonanceFieldPage';
import { createArchiveStoryClient, ARCHIVE_STORY_GLYPHS, ARCHIVE_STORY_IDS } from '../../test-fixtures/archiveClient';

export default {
  title: 'Page/Response Archive/ResonanceFieldPage', component: ResonanceFieldPage, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: '변환된 표식의 형태 공명을 탐색합니다. 가지 구조·개구부·잉크 분포·링 윤곽 필터가 해당 관측 이유를 먼저 보여주며 실제 부위를 나란히 확인하고 다른 표식으로 이동할 수 있습니다.' } } },
  decorators: [(Story) => (
    <MemoryRouter initialEntries={ [`/field/${ARCHIVE_STORY_IDS.left}`] }>
      <Routes><Route path="/field/:id" element={ createElement(Story) } /><Route path="*" element={ <Placeholder.Box label="선택한 표식 또는 비교 화면" /> } /></Routes>
    </MemoryRouter>
  )],
  argTypes: { client: { control: false, description: '표식·관계를 반환하는 메모리 클라이언트' } },
  args: { client: createArchiveStoryClient() },
};

export const Default = {};
export const NoRelations = { args: { client: createArchiveStoryClient({ glyphs: ARCHIVE_STORY_GLYPHS.filter((glyph) => [ARCHIVE_STORY_IDS.left, ARCHIVE_STORY_IDS.unrelated].includes(glyph.id)) }) } };
export const Loading = { args: { client: createArchiveStoryClient({ pending: ['archive-relations'] }) } };
export const Error = { args: { client: createArchiveStoryClient({ failures: { 'archive-relations': '관계 계산 응답을 불러오지 못했습니다.' } }) } };
