import { useState } from 'react';
import Placeholder from '../../common/ui/Placeholder';
import HeptapodHeroIntro from './HeptapodHeroIntro';

/** Presentation-only completion demo. Production navigation belongs to LandingRoute. */
function CompletionDemo(args) {
  const [complete, setComplete] = useState(false);
  if (complete) return <Placeholder.Box label="Canvas route · /canvas" sx={ { minHeight: '100vh' } } />;
  return <HeptapodHeroIntro { ...args } onComplete={ () => { setComplete(true); args.onComplete?.(); } } />;
}

export default {
  title: 'Template/HeptapodHeroIntro',
  component: HeptapodHeroIntro,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: '영상 랜딩 전용입니다. 4K 소스를 유지하며 시작 위치 3초·마지막 자동 재생 최대 6초의 연속 버퍼를 준비합니다. 브라우저 사전 로딩 제한에서는 네이티브 재생으로 이어가며 스크롤 탐색 중 버퍼 부족도 waiting 안내로 표시합니다. 영상과 포스터는 Topaz 업스케일 v2로 고정하며 비교 토글은 제거했습니다. 마지막 C08에는 승인된 스크린 내부 연기를 유지합니다. 공통 fixed GNB에 Story·Create·Archive, 언어·사운드를 배치하며 모바일은 Drawer로 전환합니다. 명시적 페이지 이동은 즉시 처리하고 자동 전환은 실제 완주를 기다립니다. START·양방향 스크럽·자동 재생·로딩/오류/재시도 안내와 마지막 캡션 퇴장을 유지합니다. 우하단 섹션 인디케이터는 트랙 끝에서도 뷰포트에 고정되며 마지막 캡션과 함께 사라집니다. 실제 재생 완료와 퇴장 효과가 끝나면 onComplete를 한 번 호출합니다. Canvas를 children으로 미리 마운트하지 않습니다. 앱의 LandingRoute가 /canvas 자동 이동을 담당하며 이 스토리는 완료 상태 자리표시자만 보여줍니다. 재생 실패·감소 모션으로 실제 영상 완주를 건너뛰지 않습니다.' } },
  },
  argTypes: {
    onComplete: { action: 'complete', description: '실제 영상 완주 + 마지막 캡션 퇴장 뒤 한 번 호출. 라우터를 직접 알지 않음' },
  },
};

export const Default = { render: (args) => <CompletionDemo { ...args } /> };

/** Use the actual viewport: mobile is an independent 4.85-cell timeline, desktop remains 6.4. */
export const Mobile = {
  ...Default,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  parameters: { docs: { description: { story: 'md 미만은 4.85셀 터치 페이싱·안정적인 svh 좌표를 사용합니다. 주소창 높이가 변해도 영상과 캡션의 트랙 시계가 일치하며 실제 ended 뒤 Canvas 완료 콜백이 실행됩니다. PC의 6.4셀·42초 자동 재생 경계는 유지합니다.' } } },
};
