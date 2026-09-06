import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Placeholder from '../../common/ui/Placeholder';
import MyArchivePage from './MyArchivePage';
import { createArchiveStoryClient } from '../../test-fixtures/archiveClient';

export default {
  title: 'Page/Response Archive/MyArchivePage', component: MyArchivePage, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', route: '/archive', docs: { description: { component: '기본 계열 상징 → 유형별 실제 구성원 피드 → 개인 확대 흐름입니다. 24개 카탈로그 중 구성원이 있는 유형만 상징·제목·짧은 서사 아래에 나열합니다. 메타 탭·개수 분포·중간 유형 선택은 없고 정확한 유형에 개인을 한 번만 표시합니다. partial은 유형을 강제하지 않고 남깁니다. 기존 group/AND/status 범위는 유지하며 신규 meta URL은 생성하지 않습니다. 확대 Dialog에서 기존 피드·Canvas·스크롤을 유지합니다. 관측 기록·내 응답·미판독 흔적의 별도 진입 UI와 전용 조회·집계는 제거했습니다. 이전 관측 URL도 Drawer 없이 표식 공간을 엽니다. 공개 모델 및 meaningProvider 경계, Canvas 형성·Lenis를 보존합니다. 헤더는 화면 상단에 fixed로 고정하고 본문에 헤더 높이와 안전 영역만큼 간격을 확보합니다. Story·Create·Archive 이동과 언어·사운드 아이콘을 제공하며 모바일은 오른쪽 Drawer로 전환합니다. 별도 작성 유도 CTA는 표시하지 않습니다. 앱에서는 필터 URL과 스크롤 위치를 복원합니다. 메모리 클라이언트만 사용하며 앱 Lenis는 단독 스토리에 주입하지 않습니다.' } } },
  decorators: [(Story, context) => (
    <MemoryRouter initialEntries={ [context.parameters.route] } key={ context.parameters.route }>
      <Routes><Route path="/archive" element={ createElement(Story) } /><Route path="*" element={ <Placeholder.Box label="선택한 표식의 상세 화면" /> } /></Routes>
    </MemoryRouter>
  )],
  argTypes: {
    client: { control: false, description: '공개 표본을 반환하는 메모리 클라이언트' },
    meaningProvider: { control: false, description: '의미 판독 provider 주입. 기본값은 무네트워크 local provider' },
  },
  args: { client: createArchiveStoryClient() },
};

export const Default = {};
export const Empty = { args: { client: createArchiveStoryClient({ glyphs: [] }) } };
export const Loading = { args: { client: createArchiveStoryClient({ pending: ['glyphs'] }) } };
export const Error = { args: { client: createArchiveStoryClient({ failures: { glyphs: '아카이브 조회에 실패했습니다.' } }) } };
// An old observation-mode URL still opens the field, never the retired Drawer.
export const LegacyLink = { parameters: { route: '/archive?view=precision' } };
