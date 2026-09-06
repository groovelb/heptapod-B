import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Placeholder from '../../common/ui/Placeholder';
import ArchiveComparePage from './ArchiveComparePage';
import { createArchiveStoryClient, ARCHIVE_STORY_IDS } from '../../test-fixtures/archiveClient';

const pairRoute = `/compare/${ARCHIVE_STORY_IDS.left}/${ARCHIVE_STORY_IDS.right}`;
export default {
  title: 'Page/Response Archive/ArchiveComparePage', component: ArchiveComparePage, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', route: pairRoute, docs: { description: { component: '모바일에서는 입력·버튼을 세로 배치하며 유효한 제출 뒤에만 키보드를 닫습니다. IME와 PC 입력 동작은 유지합니다. 공통 fixed GNB에서 Archive를 활성 표시하고 모바일 Drawer를 제공합니다. 본문의 문맥별 뒤로가기는 유지합니다. 같은 의미로 읽히는 구조와 실제 정밀 공명을 별도 보기로 비교합니다. URL reading 값으로 보기와 공유·이미지 설명을 일치시킵니다. 의미 관측은 기존 FORM 관계에 추가하지 않습니다. 비공개 이름 입력은 로컬에서만 변환하며 메모리 클라이언트만 사용합니다.' } } },
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
