import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import HeptapodEncoderPage from '../../components/templates/HeptapodEncoderPage';
import { createArchiveStoryClient } from '../../test-fixtures/archiveClient';

export default {
  title: 'Page/HeptapodEncoder',
  component: HeptapodEncoderPage,
  tags: ['autodocs'],
  decorators: [(Story) => <MemoryRouter initialEntries={ ['/canvas'] }>{createElement(Story)}</MemoryRouter>],
  argTypes: {
    audioActive: { control: 'boolean', description: '인트로의 음악 재생 게이트. 스토리에서는 외부 음원을 로드하지 않도록 false를 유지하세요.' },
    session: { control: false, description: '앱 라우트가 보관하는 메모리 세션. 단독 스토리는 별도 보존 없음' },
    client: { control: false, description: '공개 API 대신 사용하는 로컬 메모리 transport' },
    initialName: { control: 'text', description: '처음 마운트할 때 표시하는 v2 이름. 결과/빈 상태 스토리로 전환하세요.' },
    initialEncoderVersion: { control: 'select', options: [1, 2], description: 'Canvas 라우트의 기존 공유 표식 재현 버전. 새 생성은 v2' },
  },
  args: { audioActive: false, client: createArchiveStoryClient(), initialName: 'Louise' },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Heptapod B Encoder — 메인 인코더 페이지

독립된 /canvas 라우트에서 이름 입력부터 표식·분석·공유까지 담당합니다. / 영상 랜딩이 실제 재생 완료 후 이 페이지로 이동하며, 인코더는 랜딩 안에 미리 마운트하지 않습니다. Heptapod 아카이빙 버튼은 기존 /archive 라우트로 이동합니다.

### 구성 (기존 풀스크린 + 오버레이 유지)
- **챔버**: 전체 화면의 안개와 중앙 표식 형성. 표식을 눌러 하위 단위로 분해할 수 있습니다.
- **공통 GNB**: Story·Create·Archive 이동, 언어·사운드 아이콘. 모바일은 오른쪽 Drawer. 제목·분해 안내·메타데이터는 헤더 아래 배치. 앱 라우트에서는 입력·생성 결과·분석·분해 상태를 세션 동안 복원.
- **메타데이터·분석**: 덩어리 수·가닥 수·무게중심·링 상태의 고정 네 줄(각 32px). ANALYSIS 전환 시 제목·행 수·패널 높이·액션 위치를 유지합니다. 분석은 Archive와 같은 유형명·짧은 서사를 먼저 보여주고 도래/수용/상호성·동시성/여백/잔향을 재사용합니다. 의미 선택 → 공통 정의 → 이 표식의 방향·틈·먹 위치와 실제 부위 강조. 데스크톱은 좌측 레일, 모바일은 같은 내용을 Dialog로 보여줍니다. 수식·코드 설명만 바꾸며 초록 mesh·빨간 정점·순차 스캔·비프는 시각 후킹으로 유지합니다. 의미 선택은 표식과 분석 효과를 재시작하지 않습니다.
- **결과 액션**: 분석하기 / Heptapod 등록 및 공유 / Heptapod 아카이빙 세 가지 진입만 남깁니다. 공개·공유는 하나의 버튼이며 공개 완료 후 Share로 바뀝니다. SAVE, 하단 의미 설명·의미군 링크·Compare another name은 인코더 패널에서 제거합니다.
- **중앙 하단**: 기존 이름 입력과 타이핑 프리뷰. Enter 또는 모바일 키보드 이동 키로 확정합니다.

### 동작
- 기존 Canvas 형성과 안개 효과, 감소 모션 설정을 유지합니다.
- Publish and share는 먼저 공개 동의를 받고, 완료 뒤 새로운 클릭으로 공유합니다. 링크에는 공개 UUID만 담기며 단일 네이티브 공유 문구도 같은 유형명·서사를 씁니다. 기존 OG 이미지는 변경하지 않습니다.
- 공개 성공 후 현재 결과 화면을 유지하며, 공유 실패·취소가 재공개를 유발하지 않습니다.
- 현재 스토리는 메모리 클라이언트만 사용하며 인증·공개 API를 호출하지 않습니다.
        `,
      },
    },
  },
};

export const Default = {
  render: (args) => <HeptapodEncoderPage key={ `${args.initialName}:${args.initialEncoderVersion}` } { ...args } />,
};
export const Empty = { ...Default, args: { initialName: '' } };
export const PartialReading = { ...Default, args: { initialName: 'Hannah' } };
export const NonReversibleReading = { ...Default, args: { initialName: 'Alexandria Alexandria Alexandria' } };
export const PublishFailure = { ...Default, args: { client: createArchiveStoryClient({ failures: { 'archive-publish': '공개하지 못했어요. 이름과 표식은 그대로 유지됩니다.' } }) } };
