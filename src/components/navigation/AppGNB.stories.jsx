import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import Box from '@mui/material/Box';
import AppGNB from './AppGNB';
import Placeholder from '../../common/ui/Placeholder';

function NavigationDemo(args) {
  const [soundOn, setSoundOn] = useState(args.soundOn ?? true);
  return <Box sx={ { minHeight: '180vh', bgcolor: args.tone === 'dark' ? 'background.default' : 'custom.chamber.fog' } }>
    <AppGNB { ...args } soundOn={ soundOn } onToggleSound={ () => setSoundOn((value) => !value) } />
    <Placeholder.Box label="Page content" sx={ { minHeight: '100vh' } } />
  </Box>;
}

export default {
  title: 'Custom Component/10. Navigation/AppGNB', component: AppGNB, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: '모바일 가로 화면의 좌우 노치 안전영역을 반영하며 PC 패딩은 유지합니다. Story·Create·Archive 공통 fixed GNB. 모바일 64px·데스크톱 80px와 안전 영역을 사용합니다. md 미만에서 링크는 오른쪽에서 열리는 전체 화면 Drawer로 이동하며 메뉴는 화면 너비에 따라 40–72px로 표시합니다. 언어·사운드 아이콘은 상단에 유지합니다. 기존 GNB의 Drawer·포커스·스크롤 잠금을 재사용합니다. Archive 메뉴는 항상 /archive 최상위와 새 스크롤 기록으로 진입하며, 내부 뒤로가기는 이전 뎁스 주소와 위치를 복원합니다. Archive 첫 화면에서 다시 눌러도 새 방문으로 스크롤을 초기화하고 현재 히스토리를 교체합니다. Create 입력 복원은 유지합니다.' } } },
  decorators: [(Story, context) => <MemoryRouter initialEntries={ [context.parameters.route || '/canvas'] }><Story /></MemoryRouter>],
  argTypes: {
    overlay: { control: 'boolean', description: '콘텐츠 위에 겹침. false이면 본문 간격 확보. 헤더는 투명하며 dark overlay에서만 그라데이션 적용' },
    tone: { control: 'select', options: ['light', 'dark'], description: '페이지 배경에 맞는 전경과 Drawer 톤' },
    soundOn: { control: 'boolean', description: '현재 페이지 사운드 상태. 기본 켜짐' },
    soundLoading: { control: 'boolean', description: '사운드 준비 중 버튼 비활성화' },
    onToggleSound: { action: 'sound', description: '기존 페이지 오디오 토글. 없으면 사운드 아이콘 생략' },
    children: { control: false, description: '페이지별 추가 컨트롤' },
  },
};
export const Default = { render: (args) => <NavigationDemo { ...args } /> };
export const Story = { args: { overlay: true, tone: 'dark' }, parameters: { route: '/' }, render: (args) => <NavigationDemo { ...args } /> };
export const Archive = { parameters: { route: '/archive' }, render: (args) => <NavigationDemo { ...args } /> };
export const ArchiveDetail = { parameters: { route: '/glyph/example' }, render: (args) => <NavigationDemo { ...args } /> };
