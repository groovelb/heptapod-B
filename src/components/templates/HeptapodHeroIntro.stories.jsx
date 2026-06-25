import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import HeptapodHeroIntro from './HeptapodHeroIntro';

/**
 * 영상 스크러빙 기반 히어로 인트로.
 * 스크롤을 내리면 외계 비행체 진입 영상(Shot 02→11)이 프레임 단위로 스크럽되며
 * 세계관 카피 비트(B0~B6)가 순차 노출되고, 막바지에서 영상이 fade-out·캔버스
 * (children)가 fade-in하는 디졸브 매치컷으로 넘어간다. 위로 다시 스크롤하면 역전된다.
 *
 * 캔버스에서 마우스 휠로 스크롤하면 동작을 확인할 수 있다.
 * children에는 라이브 인코더가 들어가며, 여기서는 안개 캔버스 자리표시자로 대체했다.
 * prefers-reduced-motion 환경에서는 정지 안개 + 핵심 카피 + ENTER 오버레이로 대체된다.
 */
export default {
  title: 'Template/HeptapodHeroIntro',
  component: HeptapodHeroIntro,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    children: {
      control: false,
      description: '디졸브로 떠오를 캔버스(라이브 인코더). 여기서는 자리표시자 사용',
    },
    onEnter: {
      action: 'enter',
      description: 'SKIP/ENTER 시 호출되는 보조 콜백 (트랙 끝으로 스크롤)',
    },
  },
};

export const Default = {
  render: (args) => (
    <HeptapodHeroIntro { ...args }>
      <Box
        sx={ {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'custom.chamber.fog',
        } }
      >
        <Typography
          sx={ {
            fontFamily: 'custom.serif.fontFamily',
            color: 'custom.chamber.ink',
            letterSpacing: '0.2em',
          } }
        >
          ENCODER CANVAS
        </Typography>
      </Box>
    </HeptapodHeroIntro>
  ),
};
