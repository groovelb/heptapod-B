import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { RatioContainer } from '../container/RatioContainer';
import { chamberSurfaceSx } from '../../styles/chamberSurface';

/**
 * feTurbulence를 data URI로 구운 저해상 안개 노이즈 텍스처.
 * baseFrequency가 낮을수록 큰 구름 덩어리, 높을수록 미세 입자.
 * (03-visual-direction §1.4 T2: baseFrequency 0.012~0.03 등급)
 *
 * @param {number} baseFrequency - feTurbulence 주파수 (낮을수록 큰 덩어리) [Required]
 * @param {number} numOctaves - 옥타브 수 (디테일 층위) [Required]
 * @param {number} seed - feTurbulence 시드 (레이어별 패턴 분리) [Required]
 * @returns {string} data:image/svg+xml data URI
 */
function fogNoiseSvg(baseFrequency, numOctaves, seed) {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">',
    '<filter id="n">',
    `<feTurbulence type="fractalNoise" baseFrequency="${baseFrequency}" numOctaves="${numOctaves}" seed="${seed}" stitchTiles="stitch"/>`,
    // Neutral grain: the shared surface supplies the sampled video color.
    '<feColorMatrix type="saturate" values="0"/>',
    '</filter>',
    '<rect width="240" height="240" filter="url(#n)"/>',
    '</svg>',
  ].join('');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** 안개 노이즈 레이어 3장 — 큰 덩어리 → 중간 결 → 미세 입자 (컴포넌트 외부 상수) */
const FOG_LAYER_LARGE = fogNoiseSvg(0.012, 2, 7);
const FOG_LAYER_MID = fogNoiseSvg(0.022, 3, 19);
const FOG_LAYER_FINE = fogNoiseSvg(0.05, 2, 41);

/** 배경 Z-dive 지속 시간 (ms) — 문자 생성 시 안개가 화면 안쪽으로 가속하는 1회 버스트 */
const DIVE_MS = 1300;

/** 평상시 상시 전진 주기 (ms) — 한 겹이 한 번 안으로 줌인하는 시간 (작을수록 빠름).
 *  우선 확실히 보이는 강도로 둠 — 동작 확인 후 천천히로 올린다(값↑ = 느림). */
const CREEP_MS = 8000;

/**
 * 평상시 상시 전진 키프레임 — 안개가 끊임없이 안으로(scale up) 빨려든다.
 * 핵심: opacity를 대부분 구간(15~85%)에서 1로 유지(flat-top)해, 보이는 겹이
 * scale 1→2.1을 끝까지 통과하며 줌하도록 한다. opacity 피크가 중간 스케일이면
 * 두 겹의 평균 스케일이 고정돼 "멈춰" 보이므로 금지. 이음새(0%/100%)에서만 0으로
 * 떨구고, 같은 키프레임을 절반 위상차로 두 겹 겹쳐 그 짧은 이음새를 서로 가린다.
 */
const zoomKeyframes = {
  '@keyframes fogZoom': {
    '0%': { transform: 'scale(1)', opacity: 0 },
    '15%': { transform: 'scale(1.16)', opacity: 1 },
    '85%': { transform: 'scale(1.93)', opacity: 1 },
    '100%': { transform: 'scale(2.1)', opacity: 0 },
  },
};

/**
 * 배경 Z-dive 키프레임 — 문자 생성 순간 안개가 안쪽으로 "확" 가속해 들어간다.
 * 단조 전진(scale 1→1.32)만 — 뒤로 가는(scale 축소) 구간 없음 = bounce 없음.
 * front-load(ease-out)는 animation shorthand의 타이밍 함수로 줘서 Enter 직후
 * 즉시 빠르게 나갔다 감속한다. forwards로 끝값(1.32)을 유지(다음 생성 시 리셋).
 */
const diveKeyframes = {
  '@keyframes fogDiveIn': {
    '0%': { transform: 'scale(1)' },
    '100%': { transform: 'scale(1.32)' },
  },
};

/** 느린 드리프트 키프레임 — transform만 사용, linear 무한 루프 (GPU 합성 단계) */
const driftKeyframes = {
  '@keyframes chamberDriftA': {
    '0%': { transform: 'translate3d(0, 0, 0) scale(1.25)' },
    '100%': { transform: 'translate3d(-6%, 4%, 0) scale(1.25)' },
  },
  '@keyframes chamberDriftB': {
    '0%': { transform: 'translate3d(0, 0, 0) scale(1.4)' },
    '100%': { transform: 'translate3d(5%, -5%, 0) scale(1.4)' },
  },
  '@keyframes chamberDriftC': {
    '0%': { transform: 'translate3d(0, 0, 0) scale(1.15)' },
    '100%': { transform: 'translate3d(-4%, -3%, 0) scale(1.15)' },
  },
};

/**
 * 안개 노이즈 레이어 3장 — 큰 덩어리 / 중간 결 / 미세 입자 (두 렌더 경로 공유).
 *
 * @param {object} layerBaseSx - 레이어 공통 스타일
 * @param {boolean} isActive - 드리프트 동작 여부
 * @returns {JSX.Element} 안개 레이어 프래그먼트
 */
/**
 * 안개 노이즈 3장(큰 덩어리/중간 결/미세 입자) — 평상시 느린 2D drift 부착.
 *
 * @param {object} layerBaseSx - 레이어 공통 스타일
 * @param {boolean} isActive - drift 동작 여부
 * @returns {JSX.Element} 3장 프래그먼트
 */
function fogStack(layerBaseSx, isActive, isPaused) {
  return (
    <>
      <Box
        className="chamber-fog-layer"
        sx={ {
          ...layerBaseSx,
          backgroundImage: `url("${FOG_LAYER_LARGE}")`,
          backgroundSize: '420px 420px',
          opacity: 0.18,
          mixBlendMode: 'soft-light',
          filter: 'blur(14px)',
          animation: isActive ? 'chamberDriftA 40s linear infinite alternate' : 'none',
          animationPlayState: isPaused ? 'paused' : 'running',
          zIndex: 0,
        } }
      />
      <Box
        className="chamber-fog-layer"
        sx={ {
          ...layerBaseSx,
          backgroundImage: `url("${FOG_LAYER_MID}")`,
          backgroundSize: '300px 300px',
          opacity: 0.1,
          mixBlendMode: 'soft-light',
          filter: 'blur(8px)',
          animation: isActive ? 'chamberDriftB 31s linear infinite alternate' : 'none',
          animationPlayState: isPaused ? 'paused' : 'running',
          zIndex: 0,
        } }
      />
      <Box
        className="chamber-fog-layer"
        sx={ {
          ...layerBaseSx,
          backgroundImage: `url("${FOG_LAYER_FINE}")`,
          backgroundSize: '180px 180px',
          opacity: 0.035,
          mixBlendMode: 'overlay',
          filter: 'blur(2px)',
          animation: isActive ? 'chamberDriftC 24s linear infinite alternate' : 'none',
          animationPlayState: isPaused ? 'paused' : 'running',
          zIndex: 1,
        } }
      />
    </>
  );
}

function renderLayers(layerBaseSx, isActive, diveKey = 0, isPaused = false) {
  /** 평상시 전진 한 겹 — fogZoom 무한 루프 + delay로 위상차. 정적 환경(reduced)은 1겹 고정 */
  const creepLayerSx = (delayMs) => ({
    ...zoomKeyframes,
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    transformOrigin: '50% 45%',
    animation: `fogZoom ${CREEP_MS}ms linear infinite`,
    animationDelay: `${delayMs}ms`,
    animationPlayState: isPaused ? 'paused' : 'running',
    '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 1, transform: 'none' },
  });

  // 정적(reduced-motion): 크로스페이드 없이 단일 스택 — 안개 농도 2배 방지
  if (!isActive) {
    return fogStack(layerBaseSx, false, isPaused);
  }

  return (
    // 바깥(burst) 래퍼 — 문자 생성 시 가속(fogDiveIn). diveKey 변경 시 remount되어
    // 1회 재생되고, 안쪽 creep transform과 합성되어 "상시 전진이 확 빨라지는" 가속이 된다.
    <Box
      key={ diveKey }
      className="chamber-fog-dive"
      sx={ {
        ...diveKeyframes,
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        transformOrigin: '50% 45%',
        // front-load ease-out — Enter 직후 즉시 빠르게 나갔다 감속, 뒤로 안 감(forwards)
        animation: diveKey > 0 ? `fogDiveIn ${DIVE_MS}ms cubic-bezier(0.05, 0.7, 0.1, 1) forwards` : 'none',
        animationPlayState: isPaused ? 'paused' : 'running',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      } }
    >
      {/* 평상시 상시 전진 — 같은 fogZoom을 절반 위상차로 두 겹 크로스페이드(끊김 없는 연속 줌) */}
      <Box className="chamber-fog-zoom" sx={ creepLayerSx(0) }>{ fogStack(layerBaseSx, isActive, isPaused) }</Box>
      <Box className="chamber-fog-zoom" sx={ creepLayerSx(-CREEP_MS / 2) }>{ fogStack(layerBaseSx, isActive, isPaused) }</Box>
    </Box>
  );
}

/**
 * LogogramChamber 컴포넌트
 *
 * 어두운 UI 속에서 홀로 밝은, 안개 낀 서리 유리 챔버. 영화 Arrival의
 * "어두운 관찰 공간에서 밝은 안개 스크린을 바라보는" 핵심 구도를 무대로 이식한다.
 * 로고그램 렌더러를 children으로 받아 정방형 무대 위에 올린다.
 *
 * 안개 구현 (CSS 전용 — Three.js GradientOverlay와 무관, 03-visual-direction 기획 결정):
 * 색은 현재 히어로 영상 마지막 프레임의 PC·모바일 실측 팔레트를 공유한다.
 * 1. chamberSurfaceSx의 블루그레이 명암 위에 중성 SVG feTurbulence 노이즈 3장을 약하게 겹친다.
 * 2. 각 레이어는 blur + 느린 transform drift(주기 24~40s, linear 무한 루프)로 미세하게 살아 움직인다
 * 3. 밝은 상단·중앙과 어두운 하단·오른쪽을 공통 표면에서 처리하며 추가 비네트를 중첩하지 않는다.
 * 4. prefers-reduced-motion 시 모든 drift가 정지한다 (CSS @media)
 *
 * Props:
 * @param {React.ReactNode} children - 챔버 위에 올릴 로고그램 렌더러 [Required]
 * @param {string|number} ratio - 무대 비율 (RatioContainer ratio — '1:1' | 'phi' | number 등) [Optional, 기본값: '1:1']
 * @param {string} maxWidth - 챔버 최대 너비 [Optional]
 * @param {boolean} isActive - 안개 드리프트 동작 여부 (false면 정적 안개) [Optional, 기본값: true]
 * @param {boolean} isPaused - 완전히 가려진 동안 기존 CSS 애니메이션의 위상만 정지. 재마운트 없이 이어 재생 [Optional, 기본값: false]
 * @param {boolean} isFullscreen - 비율 컨테이너 대신 부모를 가득 채우는 안개 공간 (absolute inset 0) [Optional, 기본값: false]
 * @param {number} diveKey - 값이 바뀔 때마다 안개가 화면 안쪽으로 가속 진입(Z-dive) 1회 재생 [Optional, 기본값: 0]
 * @param {object} sx - 추가 스타일 오버라이드 [Optional]
 *
 * Example usage:
 * <LogogramChamber>
 *   <LogogramRenderer model={model} />
 * </LogogramChamber>
 * <LogogramChamber isFullscreen>
 *   <LogogramRenderer model={model} />
 * </LogogramChamber>
 */
function LogogramChamber({
  children,
  ratio = '1:1',
  maxWidth,
  isActive = true,
  isPaused = false,
  isFullscreen = false,
  diveKey = 0,
  sx = {},
}) {
  const theme = useTheme();
  /** 레이어 공통 — 절대 위치로 무대 전체를 덮고, 동작 시에만 drift 애니메이션 부착 */
  const layerBaseSx = {
    position: 'absolute',
    inset: '-25%',
    backgroundRepeat: 'repeat',
    pointerEvents: 'none',
  };

  /** 공통 챔버 표면 스타일 — 정방형/풀스크린 양쪽에서 동일 */
  const chamberSx = {
    ...driftKeyframes,
    ...chamberSurfaceSx(theme),
    '@media (prefers-reduced-motion: reduce)': {
      '& .chamber-fog-layer': {
        animation: 'none',
      },
    },
    ...sx,
  };

  if (isFullscreen) {
    return (
      <Box data-chamber-paused={ isPaused } sx={ { position: 'absolute', inset: 0, overflow: 'hidden', ...chamberSx } }>
        { renderLayers(layerBaseSx, isActive, diveKey, isPaused) }
        <Box
          sx={ {
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          } }
        >
          { children }
        </Box>
      </Box>
    );
  }

  return (
    <RatioContainer
      data-chamber-paused={ isPaused }
      ratio={ ratio }
      maxWidth={ maxWidth }
      isContained
      background="custom.chamber.fog"
      sx={ chamberSx }
    >
      { renderLayers(layerBaseSx, isActive, diveKey, isPaused) }
      {/* 로고그램 렌더러 무대 — 안개 레이어 위, 비네트 아래 */}
      <Box
        sx={ {
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        } }
      >
        { children }
      </Box>
    </RatioContainer>
  );
}

export default LogogramChamber;
