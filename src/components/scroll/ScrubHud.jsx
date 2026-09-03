import Box from '@mui/material/Box';

/**
 * ScrubHud 컴포넌트
 *
 * 스크럽 트랙 콘텐츠 레이어 안에서 뷰포트 하단에 머무는 HUD 포지셔너.
 * 비트 카운터·SOUND 토글이 공유하던 sticky 배치 로직(하단 고정 + dvh 대응 +
 * 히어로 첫 뷰포트 제외)을 한 곳으로 모은다.
 *
 * 동작 흐름:
 * 1. 사용자가 스크럽 구간을 스크롤하면 HUD가 뷰포트 하단(bottomPx 위)에 계속 떠 있다
 * 2. 히어로 셀(첫 100vh)에서는 나타나지 않는다(타이틀 전용 뷰포트 보장)
 * 3. align에 따라 좌/우 하단 코너에 정렬된다 - 내부 배치는 children이 결정
 *
 * Props:
 * @param {React.ReactNode} children - HUD 내용물 [Required]
 * @param {string} align - 수평 정렬 'left' | 'right' [Optional, 기본값: 'right']
 * @param {number} bottomPx - 뷰포트 하단에서 HUD 상단까지 거리(px) [Optional, 기본값: 88]
 * @param {boolean} hasHeroGap - 히어로 첫 뷰포트에서 HUD 미노출 여부 [Optional, 기본값: true]
 * @param {string} heroGap - 미노출 거리 (CSS 길이) [Optional, 기본값: '100dvh']
 * @param {string} viewportHeight - 세로 기준 단위(100vh | 100dvh | 100svh) [Optional, 기본값: 100dvh]
 * @param {object} sx - 병합할 MUI sx 스타일 (내부 flex 배치 등) [Optional]
 *
 * Example usage:
 * <ScrubHud align="right" bottomPx={ 88 } sx={ { display: 'flex', flexDirection: 'column' } }>
 *   <Counter />
 * </ScrubHud>
 */
function ScrubHud({ children, align = 'right', bottomPx = 88, hasHeroGap = true, heroGap = '100dvh', sx = {} }) {
  const VIEWPORT = '100dvh';

  return (
    <Box
      sx={ {
        position: 'sticky',
        top: `calc(${VIEWPORT} - ${bottomPx}px - max(env(safe-area-inset-bottom), 0px))`,
        ...(hasHeroGap && { mt: heroGap }),
        // 동적 뷰포트 단위 지원 브라우저용 오버라이드(한 블록에 top·mt 를 함께 — 키 중복 금지)
        '@supports (height: 100dvh)': {
          top: `calc(${VIEWPORT} - ${bottomPx}px - max(env(safe-area-inset-bottom), 0px))`,
          ...(hasHeroGap ? { mt: heroGap } : {}),
        },
        ...(align === 'right'
          ? {
            mr: {
              xs: `calc(4vw + max(env(safe-area-inset-right), 0px))`,
              md: `calc(6vw + max(env(safe-area-inset-right), 0px))`,
            },
          }
          : {
            ml: {
              xs: `calc(4vw + max(env(safe-area-inset-left), 0px))`,
              md: `calc(6vw + max(env(safe-area-inset-left), 0px))`,
            },
          }),
        minWidth: 0,
        ...sx,
      } }
    >
      { children }
    </Box>
  );
}

export default ScrubHud;
