import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';

/**
 * SoundFab 컴포넌트
 *
 * 화면 우측 하단에 고정되는 사운드 토글 — **컨테이너 없이 아이콘만** 보인다.
 * 배경 판을 그리지 않으므로, 밝은/어두운 프레임 위를 지나도 늘 보이도록
 * `mix-blend-mode: difference`로 뒤 배경과 반전시킨다(흰 아이콘 → 흰 배경 위 검정, 검정 배경 위 흰색).
 * 켜짐/꺼짐은 아이콘(스피커/뮤트)으로만 구분한다.
 *
 * **히어로가 끝나면 사라진다.** heroSelector(기본 #immersive)를 IntersectionObserver로 관측해
 * 그 섹션이 뷰포트에서 벗어나면(=히어로 통과) 페이드아웃한다. 스크럽 사운드 자체가
 * 히어로 구간의 것이므로 컨트롤도 그 구간에만 둔다.
 *
 * 오디오 언락·재생은 상위(useScrubSoundEngine)가 갖고, 이 컴포넌트는 표시 + onToggle만 한다.
 *
 * Props:
 * @param {boolean} isEnabled - 사운드 켜짐 여부 [Optional, 기본값: false]
 * @param {boolean} isLoading - 언락/로드 중 여부(비활성) [Optional, 기본값: false]
 * @param {function} onToggle - 토글 핸들러 () => void [Required]
 * @param {string} heroSelector - 히어로 섹션 셀렉터(이 섹션을 벗어나면 숨김) [Optional, 기본값: '#immersive']
 * @param {object} sx - 병합할 MUI sx 스타일 [Optional]
 *
 * Example usage:
 * <SoundFab isEnabled={ soundOn } onToggle={ toggleSound } />
 */
export function SoundFab({
  isEnabled = false,
  isLoading = false,
  onToggle,
  heroSelector = '#immersive',
  sx,
}) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [inHero, setInHero] = useState(true);

  useEffect(() => {
    const el = document.querySelector(heroSelector);
    if (!el) return undefined;
    const observer = new IntersectionObserver(([entry]) => setInHero(entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [heroSelector]);

  return (
    <Box
      component="button"
      type="button"
      onClick={onToggle}
      disabled={isLoading}
      aria-pressed={isEnabled}
      aria-label={isEnabled ? 'Mute sound' : 'Enable sound'}
      aria-hidden={!inHero}
      sx={{
        position: 'fixed',
        right: { xs: 12, md: 20 },
        bottom: { xs: 12, md: 20 },
        zIndex: (theme) => theme.zIndex.tooltip,
        // 컨테이너 없음 — 배경·보더 없이 아이콘만. 터치 타깃만 패딩으로 확보(투명).
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1.25,
        m: 0,
        background: 'none',
        border: 'none',
        cursor: isLoading ? 'default' : 'pointer',
        // 흰 아이콘 + difference → 밝은/어두운 배경 양쪽에서 반전돼 늘 보인다
        color: '#fff',
        mixBlendMode: 'difference',
        // 히어로를 벗어나면 숨김
        opacity: inHero ? (isLoading ? 0.5 : 1) : 0,
        pointerEvents: inHero ? 'auto' : 'none',
        visibility: inHero ? 'visible' : 'hidden',
        transition: prefersReducedMotion ? 'none' : 'opacity 240ms linear',
        '& svg': { fontSize: { xs: 26, md: 28 } },
        '&:focus-visible': { outline: '2px solid #fff', outlineOffset: 2 },
        ...sx,
      }}
    >
      {isEnabled ? <VolumeUpRoundedIcon /> : <VolumeOffRoundedIcon />}
    </Box>
  );
}

export default SoundFab;
