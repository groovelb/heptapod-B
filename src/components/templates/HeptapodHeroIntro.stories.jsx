import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import HeptapodHeroIntro from './HeptapodHeroIntro';

/**
 * 스테이지 세그먼트 재생 기반 스크롤리텔링 인트로.
 * 스크롤을 내리면 각 스토리 섹션이 뷰포트 중앙에 들어올 때 영상의 해당 세그먼트가
 * 소리와 함께 재생되고, 끝 프레임에서 정지해 다음 스테이지를 기다린다(자연 스크롤).
 * 마지막에 children(라이브 인코더)으로 이어지며, children에는 audioActive가 주입된다.
 * 여기서는 인코더 대신 안개 캔버스 자리표시자를 사용한다.
 */
function EncoderPlaceholder() {
  return (
    <Box
      sx={ {
        width: '100%',
        height: '100%',
        minHeight: '100vh',
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
  );
}

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
      description: '인트로 끝에 이어질 라이브 인코더. audioActive가 주입된다',
    },
  },
};

export const Default = {
  render: () => (
    <HeptapodHeroIntro>
      <EncoderPlaceholder />
    </HeptapodHeroIntro>
  ),
};
