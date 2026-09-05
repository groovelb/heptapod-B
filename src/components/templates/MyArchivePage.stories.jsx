import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Placeholder from '../../common/ui/Placeholder';
import MyArchivePage from './MyArchivePage';
import { createArchiveStoryClient } from '../../test-fixtures/archiveClient';

export default {
  title: 'Page/Response Archive/MyArchivePage', component: MyArchivePage, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: '이름을 변환한 Heptapod B 표식의 공개 아카이브입니다. 입장 후 각 카드가 뷰포트에 들어오면 기존 Canvas의 연기·잉크 형성 효과로 그려집니다. 감소 모션에서는 즉시 완성형입니다. 카드에서 닮은 표식 탐색으로 진입합니다. 실제 로컬 인코더 모델만 제공하며 입장 후 각 조회 상태를 확인할 수 있습니다. 앱의 Lenis는 이 페이지 단독 스토리에는 주입하지 않습니다.' } } },
  decorators: [(Story) => (
    <MemoryRouter initialEntries={ ['/archive'] }>
      <Routes><Route path="/archive" element={ createElement(Story) } /><Route path="*" element={ <Placeholder.Box label="선택한 표식의 상세 화면" /> } /></Routes>
    </MemoryRouter>
  )],
  argTypes: { client: { control: false, description: '공개 표본을 반환하는 메모리 클라이언트' } },
  args: { client: createArchiveStoryClient() },
};

export const Default = {};
export const Empty = { args: { client: createArchiveStoryClient({ glyphs: [] }) } };
export const Loading = { args: { client: createArchiveStoryClient({ pending: ['glyphs'] }) } };
export const Error = { args: { client: createArchiveStoryClient({ failures: { glyphs: '아카이브 조회에 실패했습니다.' } }) } };
