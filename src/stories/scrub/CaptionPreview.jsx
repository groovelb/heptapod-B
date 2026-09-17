import { useEffect } from 'react';
import { useMotionValue } from 'framer-motion';
import Box from '@mui/material/Box';
import { HERO_STORY_BEATS, HERO_VIDEO_DURATION } from '../../data/heptapodHeroStory';
import { HERO_SCRUB_TIMELINE } from '../../data/heptapodScrubTimeline';
import { useI18n } from '../../i18n/useI18n';

/**
 * 비트 로컬 진행도를 영상 진행도로 옮긴다. 계기 타임코드가 이 값을 읽는다.
 *
 * @param {number} index - 비트 순번 [Required]
 * @param {number} f - 비트 로컬 진행도 0~1 [Required]
 * @returns {number} 영상 진행도 0~1
 */
function videoProgress(index, f) {
  const clip = HERO_SCRUB_TIMELINE.clips[index];
  if (!clip) return 0;
  return clip.startNorm + (clip.endNorm - clip.startNorm) * f;
}

/**
 * 스크럽 캡션 변주 미리보기.
 * 실제 화면에서는 스크롤이 f 를 움직인다. 여기서는 컨트롤이 그 자리를 대신한다.
 *
 * Props:
 * @param {React.ElementType} component - 캡션 변주 컴포넌트 [Required]
 * @param {string} beatId - HERO_STORY_BEATS 의 id [Optional, 기본값: 'B0']
 * @param {number} entry - 비트 로컬 진행도 [Optional, 기본값: 0.5]
 * @param {number} exit - 퇴장 진행도 [Optional, 기본값: 0]
 * @param {boolean} reduced - 모션 감소 [Optional, 기본값: false]
 * @param {boolean} onLight - 밝은 배경 여부 [Optional, 기본값: false]
 *
 * Example usage:
 * <CaptionPreview component={ SeamCaption } beatId="B0" entry={ 0.5 } />
 */
export function CaptionPreview(props) {
  const { component: Caption, beatId = 'B0', entry = 0.5, exit = 0, reduced = false, onLight = false } = props;
  const { localize } = useI18n();
  const index = Math.max(0, HERO_STORY_BEATS.findIndex((beat) => beat.id === beatId));
  const source = HERO_STORY_BEATS[index];
  const f = useMotionValue(entry);
  const exitProgress = useMotionValue(exit);
  const progress = useMotionValue(videoProgress(index, entry));

  useEffect(() => {
    f.set(entry);
    exitProgress.set(exit);
    progress.set(videoProgress(index, entry));
  }, [entry, exit, index, f, exitProgress, progress]);

  const beat = {
    ...source,
    onLight,
    headline: localize(source.headline),
    body: localize(source.body),
  };

  return (
    <Box
      sx={ {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        px: { xs: 3, md: 6 },
        bgcolor: onLight ? 'custom.chamber.fogHi' : 'custom.chamber.fog',
      } }
    >
      <Caption
        f={ f }
        progress={ progress }
        total={ HERO_VIDEO_DURATION }
        beat={ beat }
        reduced={ reduced }
        exitProgress={ exitProgress }
      />
    </Box>
  );
}

export default CaptionPreview;
