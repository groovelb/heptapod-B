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
- **메타데이터·분석**: 덩어리 수·가닥 수·무게중심·링 상태의 고정 네 줄(각 32px). ANALYSIS 전환 시 제목·행 수·패널 높이·액션 위치를 유지합니다. 분석은 Archive와 같은 유형명·짧은 서사를 먼저 보여주고 도래/수용/상호성·동시성/여백/잔향을 재사용합니다. 의미 선택 → 공통 정의 → 이 표식의 방향·틈·먹 위치와 실제 부위 강조. 데스크톱은 페이지 제목 아래에 분석 레일을 세로 배치하고 하단 입력의 실측 높이만큼 공간을 확보합니다. 컬럼 전체가 아닌 설명 본문만 스크롤합니다. 모바일도 원본 표식 위에 분석선을 겹치고, 같은 챔버 배경의 하단 패널에 의미 설명을 표시합니다. 검정 전체 화면 Dialog나 두 번째 표식을 만들지 않습니다. 초록 mesh·빨간 정점·순차 스캔·비프는 시각 후킹으로 유지합니다. 의미 선택은 표식과 분석 효과를 재시작하지 않습니다.
- **결과 액션**: 모바일은 기존 button 타이포(14px)와 createCta 토큰의 44px 높이·8px 간격·최대 17rem 폭으로 분석하기 / Heptapod 등록 및 공유 두 버튼만 표시합니다. PC는 공통 outlined 버튼·editorialAction(17px)·48px 높이와 메타데이터·군집 이름·Heptapod 아카이빙·공개 후 내 표식 링크를 유지합니다. 이 군집 보기 버튼은 Create와 등록·공유 팝업에서 표시하지 않습니다. 공개·공유는 하나의 버튼이며 공개 완료 후 Share로 바뀌어 기존 공유 창에서 링크를 확인합니다. SAVE와 Compare another name은 표시하지 않습니다.
- **중앙 하단**: 기존 이름 입력과 타이핑 프리뷰. 모바일 키보드 완료/Enter로 유효한 이름을 확정한 뒤 키보드를 닫습니다. 한글 조합 중 Enter와 잘못된 입력은 확정하지 않습니다. 최초 진입 시 키보드를 자동으로 열지 않습니다.
- **모바일 배치**: md 미만에서만 표식 → 입력 → 두 44px 액션을 세로로 배치하며 하단 메타데이터 제목·값·군집·Archive 링크·추가 공개 링크는 렌더링하지 않습니다. 분석 ON이면 원본 표식의 같은 좌표에 초록 라인이 겹치며 액션 아래 투명 판독 패널이 나타납니다. 동일한 분석 버튼으로 OFF할 수 있고 GNB와 공유 버튼도 그대로 접근 가능합니다. 가로 화면과 키보드가 열린 상태에서도 문서 스크롤로 접근할 수 있습니다. md 이상에서는 기존 중앙 표식·우상단 4행 오버레이와 하단 입력을 유지합니다.

### 동작
- 기존 Canvas 형성과 안개 효과, 감소 모션 설정을 유지합니다.
- 모바일과 PC 모두 원래 Canvas·안개를 정지하거나 재생성하지 않고 반투명 스크림·분석선만 겹칩니다. 별도 Dialog·중복 Canvas·분석용 스크롤 잠금을 만들지 않으며, 의미 선택은 원본 표식의 관측 부위를 강조합니다.
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
