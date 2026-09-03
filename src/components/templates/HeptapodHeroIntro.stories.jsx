import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import HeptapodHeroIntro from './HeptapodHeroIntro';

/**
 * 스크롤 스크러빙 기반 히어로 인트로.
 * START 를 눌러야 스크롤이 풀리고(클릭 = 사운드 언락), 이후 스크롤 위치가 영상을 양방향으로
 * 스크럽한다. 비트별 샘플 사운드가 스크롤 위치에 매핑되고, 캡션은 트랙 좌표에 실배치되어
 * 자연 스크롤로 지나간다. 마지막에 children(라이브 인코더)이 제자리 fade-in 하며,
 * children 에는 audioActive 가 주입된다. 여기서는 인코더 대신 안개 캔버스 자리표시자를 사용한다.
 * (Lenis 는 App 이 제공 — 스토리북에서는 네이티브 스크롤로 동작)
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
