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
    docs: { description: { component: '영상 랜딩 전용입니다. 공통 fixed GNB에 Story·Create·Archive, 언어·사운드·SKIP을 배치하며 모바일은 Drawer로 전환합니다. 명시적 페이지 이동은 즉시 처리하고 자동 전환은 실제 완주를 기다립니다. START·양방향 스크럽·자동 재생·로딩/오류/재시도 안내와 마지막 캡션 퇴장을 유지합니다. 실제 재생 완료와 퇴장 효과가 끝나면 onComplete를 한 번 호출합니다. Canvas를 children으로 미리 마운트하지 않습니다. 앱의 LandingRoute가 /canvas 자동 이동을 담당하며 이 스토리는 완료 상태 자리표시자만 보여줍니다. SKIP·재생 실패·감소 모션으로 실제 영상 완주를 건너뛰지 않습니다.' } },
  },
  argTypes: {
    onComplete: { action: 'complete', description: '실제 영상 완주 + 마지막 캡션 퇴장 뒤 한 번 호출. 라우터를 직접 알지 않음' },
  },
};

export const Default = { render: (args) => <CompletionDemo { ...args } /> };
