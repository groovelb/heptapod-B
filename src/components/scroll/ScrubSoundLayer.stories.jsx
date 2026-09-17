import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { HERO_SCRUB_TIMELINE } from '../../data/heptapodScrubTimeline';
import useScrubSoundEngine from './useScrubSoundEngine';

export default {
  title: 'Section/ScrubSoundLayer',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          '랜딩의 사운드 구획이다. 화면에 보이는 요소가 아니라 스크롤 위치에 결속된 레이어라서, 여기서는 스크롤 대신 슬라이더로 진행도를 넣는 얇은 데모를 붙였다.',
          '엔진은 베드 루프 하나와 마디 클립 여섯 개를 받아 현재 진행도가 속한 마디의 클립을 그 지점부터 재생한다. 슬라이더를 멈추면 클립이 잦아들고 베드만 남는다.',
          '소리를 켜는 것은 사용자의 명시적 동작이다. 자동으로 열지 않는다.',
        ].join('\n\n'),
      },
    },
  },
};

/**
 * 스크럽 사운드 데모 (이 스토리 전용)
 *
 * Props:
 * @param {Array} clips - 타임라인 클립 목록 [Required]
 *
 * Example usage:
 * <SoundLayerDemo clips={ HERO_SCRUB_TIMELINE.clips } />
 */
function SoundLayerDemo({ clips }) {
  const [progress, setProgress] = useState(0);
  const engine = useScrubSoundEngine(clips);
  const activeIndex = clips.findIndex((clip) => progress >= clip.startNorm && progress <= clip.endNorm);

  return (
    <Stack spacing={ 3 }>
      <Stack direction="row" spacing={ 2 } alignItems="center">
        <Button variant="outlined" onClick={ engine.isEnabled ? engine.disable : engine.enable }>
          { engine.isEnabled ? 'SOUND ON' : 'SOUND OFF' }
        </Button>
        <Typography variant="caption" sx={ { fontFamily: 'monospace', color: 'text.secondary' } }>
          { engine.isLoading ? '버퍼 로드 중' : `진행도 ${progress.toFixed(3)} · 마디 ${activeIndex >= 0 ? clips[activeIndex].id : '없음'}` }
        </Typography>
      </Stack>

      <Box sx={ { maxWidth: 560 } }>
        <Slider
          value={ progress }
          min={ 0 }
          max={ 1 }
          step={ 0.001 }
          onChange={ (event, value) => {
            setProgress(value);
            engine.handleProgress(value);
          } }
        />
        <Typography variant="caption" color="text.secondary">
          슬라이더가 스크롤을 대신한다. 값이 멈추면 클립이 잦아들고 베드만 남는다.
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={ { fontWeight: 600, width: 80 } }>마디</TableCell>
              <TableCell sx={ { fontWeight: 600 } }>진행도 구간</TableCell>
              <TableCell sx={ { fontWeight: 600 } }>클립 파일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { clips.map((clip, index) => (
              <TableRow key={ clip.id } selected={ index === activeIndex }>
                <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, fontWeight: 600 } }>{ clip.id }</TableCell>
                <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>
                  { `${clip.startNorm.toFixed(3)} ~ ${clip.endNorm.toFixed(3)}` }
                </TableCell>
                <TableCell sx={ { fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' } }>
                  { `/heptapod-b-encoder/audio/clips/${clip.id}.mp3` }
                </TableCell>
              </TableRow>
            )) }
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary">
        베드 루프: /heptapod-b-encoder/audio/bed-loop.mp3
      </Typography>
    </Stack>
  );
}

/** 진행도를 넣으면 그 지점의 소리가 난다 */
export const Default = {
  render: () => <SoundLayerDemo clips={ HERO_SCRUB_TIMELINE.clips } />,
};
