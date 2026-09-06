import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import HeptapodEncoderPage from '../../components/templates/HeptapodEncoderPage';
import { createArchiveStoryClient } from '../../test-fixtures/archiveClient';

export default {
  title: 'Page/HeptapodEncoder',
  component: HeptapodEncoderPage,
  tags: ['autodocs'],
  decorators: [(Story) => <MemoryRouter>{createElement(Story)}</MemoryRouter>],
  argTypes: {
    audioActive: { control: 'boolean', description: '인트로의 음악 재생 게이트. 스토리에서는 외부 음원을 로드하지 않도록 false를 유지하세요.' },
    client: { control: false, description: '공개 API 대신 사용하는 로컬 메모리 transport' },
    initialName: { control: 'text', description: '처음 마운트할 때 표시하는 v2 이름. 결과/빈 상태 스토리로 전환하세요.' },
  },
  args: { audioActive: false, client: createArchiveStoryClient(), initialName: 'Louise' },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Heptapod B Encoder — 메인 인코더 페이지

이름 입력부터 로고그램 출력까지 전체 경험을 잇는 풀 페이지 템플릿입니다.

### 구성 (기존 풀스크린 + 오버레이 유지)
- **챔버**: 전체 화면의 안개와 중앙 표식 형성. 표식을 눌러 하위 단위로 분해할 수 있습니다.
- **좌상단 / 우상단**: 타이틀·음악 / 언어 컨트롤과 메타데이터 오버레이.
- **메타데이터·분석**: 덩어리 수·가닥 수·무게중심·링 상태의 고정 네 줄(각 32px). ANALYSIS 전환 시 제목·행 수·패널 높이·액션 위치를 유지합니다. 데스크톱은 실제 형태 콜아웃과 상세 분석, 모바일은 기존 RAW DATA 상세 Dialog를 같은 ANALYSIS 버튼에서 엽니다.
- **결과 액션**: ANALYSIS / Publish and share / Archive 세 가지 진입만 남깁니다. 공개·공유는 하나의 버튼이며 공개 완료 후 Share로 바뀝니다. SAVE, 하단 의미 설명·의미군 링크·Compare another name은 인코더 패널에서 제거합니다.
- **중앙 하단**: 기존 이름 입력과 타이핑 프리뷰. Enter 또는 모바일 키보드 이동 키로 확정합니다.

### 동작
- 기존 Canvas 형성과 안개 효과, 감소 모션 설정을 유지합니다.
- Publish and share는 먼저 공개 동의를 받고, 완료 뒤 새로운 클릭으로 공유합니다. 링크에는 공개 UUID만 담깁니다.
- 공개 성공 후 현재 결과 화면을 유지하며, 공유 실패·취소가 재공개를 유발하지 않습니다.
- 현재 스토리는 메모리 클라이언트만 사용하며 인증·공개 API를 호출하지 않습니다.
        `,
      },
    },
  },
};

export const Default = {
  render: (args) => <HeptapodEncoderPage key={ args.initialName } { ...args } />,
};
export const Empty = { ...Default, args: { initialName: '' } };
export const PublishFailure = { ...Default, args: { client: createArchiveStoryClient({ failures: { 'archive-publish': '공개하지 못했어요. 이름과 표식은 그대로 유지됩니다.' } }) } };
