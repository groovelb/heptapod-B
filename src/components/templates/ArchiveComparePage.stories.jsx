import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Placeholder from '../../common/ui/Placeholder';
import ArchiveComparePage from './ArchiveComparePage';
import { createArchiveStoryClient, ARCHIVE_STORY_IDS } from '../../test-fixtures/archiveClient';

const pairRoute = `/compare/${ARCHIVE_STORY_IDS.left}/${ARCHIVE_STORY_IDS.right}`;
export default {
  title: 'Page/Response Archive/ArchiveComparePage', component: ArchiveComparePage, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', route: pairRoute, docs: { description: { component: '이름을 변환한 두 Heptapod B 모델의 실제 형태 공명을 비교합니다. 이름 입력은 새로운 표식을 만드는 출발점이고, 관측 근거는 가지·개구부·잉크·링입니다. 메모리 클라이언트만 사용하며 실제 DB에는 접근하지 않습니다.' } } },
  decorators: [(Story, context) => (
    <MemoryRouter initialEntries={ [context.parameters.route] } key={ context.parameters.route }>
      <Routes><Route path="/compare/:leftId/:rightId?" element={ createElement(Story) } /><Route path="*" element={ <Placeholder.Box label="선택한 탐색 목적지 · 이 스토리 범위 밖의 화면" /> } /></Routes>
    </MemoryRouter>
  )],
  argTypes: { client: { control: false, description: '스토리 전용 메모리 클라이언트. 외부 통신 없음' } },
  args: { client: createArchiveStoryClient() },
};

export const Default = {};
export const ComparisonInvitation = { parameters: { route: `/compare/${ARCHIVE_STORY_IDS.left}` }, args: { client: createArchiveStoryClient() } };
export const NoRelations = { parameters: { route: `/compare/${ARCHIVE_STORY_IDS.left}/${ARCHIVE_STORY_IDS.unrelated}` }, args: { client: createArchiveStoryClient() } };
export const Unavailable = { parameters: { route: `/compare/${ARCHIVE_STORY_IDS.left}/${ARCHIVE_STORY_IDS.hidden}` }, args: { client: createArchiveStoryClient() } };
export const Error = { args: { client: createArchiveStoryClient({ failures: { glyphs: '표식 조회에 실패했습니다.' } }) } };
