import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Placeholder from '../../common/ui/Placeholder';
import MyResponsesPage from './MyResponsesPage';
import { createArchiveStoryClient } from '../../test-fixtures/archiveClient';

export default {
  title: 'Page/Response Archive/MyResponsesPage', component: MyResponsesPage, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: '현재 익명 세션의 기여를 보관하고 공개를 철회하는 화면입니다. 조회·철회·계정 연결은 스토리 메모리에서만 동작합니다. 실제 로그인이나 DB 변경은 없습니다.' } } },
  decorators: [(Story) => (
    <MemoryRouter initialEntries={ ['/me'] }>
      <Routes><Route path="/me" element={ createElement(Story) } /><Route path="*" element={ <Placeholder.Box label="선택한 탐색 목적지 · 이 스토리 범위 밖의 화면" /> } /></Routes>
    </MemoryRouter>
  )],
  argTypes: { client: { control: false, description: '세션·내 응답·철회를 재현하는 메모리 클라이언트' } },
  args: { client: createArchiveStoryClient() },
};

export const Default = {};
export const NoResponses = { args: { client: createArchiveStoryClient({ contributions: [] }) } };
export const NoSession = { args: { client: createArchiveStoryClient({ user: null, contributions: [] }) } };
export const Error = { args: { client: createArchiveStoryClient({ failures: { glyph_contributions: '내 응답을 불러오지 못했습니다.' } }) } };
export const WithdrawalFailure = { args: { client: createArchiveStoryClient({ failures: { 'archive-unpublish': '철회하지 못했습니다. 내 응답은 그대로 유지됩니다.' } }) } };
