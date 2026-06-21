import Box from '@mui/material/Box';
import { RatioContainer } from '../container/RatioContainer';

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
function renderLayers(layerBaseSx, isActive) {
  return (
    <>
      <Box
        className="chamber-fog-layer"
        sx={ {
          ...layerBaseSx,
          backgroundImage: `url("${FOG_LAYER_LARGE}")`,
          backgroundSize: '420px 420px',
          opacity: 0.5,
          mixBlendMode: 'multiply',
          filter: 'blur(14px)',
          animation: isActive ? 'chamberDriftA 40s linear infinite alternate' : 'none',
          zIndex: 0,
        } }
      />
      <Box
        className="chamber-fog-layer"
        sx={ {
          ...layerBaseSx,
          backgroundImage: `url("${FOG_LAYER_MID}")`,
          backgroundSize: '300px 300px',
          opacity: 0.32,
          mixBlendMode: 'multiply',
          filter: 'blur(8px)',
          animation: isActive ? 'chamberDriftB 31s linear infinite alternate' : 'none',
          zIndex: 0,
        } }
      />
      <Box
        className="chamber-fog-layer"
        sx={ {
          ...layerBaseSx,
          backgroundImage: `url("${FOG_LAYER_FINE}")`,
          backgroundSize: '180px 180px',
          opacity: 0.14,
          mixBlendMode: 'overlay',
          filter: 'blur(2px)',
          animation: isActive ? 'chamberDriftC 24s linear infinite alternate' : 'none',
          zIndex: 1,
        } }
      />
    </>
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
 * 1. custom.chamber.fog(#dfe3e6) 단색 베이스 위에 SVG feTurbulence 노이즈 3장을 겹친다
 * 2. 각 레이어는 blur + 느린 transform drift(주기 24~40s, linear 무한 루프)로 미세하게 살아 움직인다
 * 3. radial-gradient 비네트로 가장자리를 어둡게(fogDeep #c9cfd4) 눌러 서리 유리의 깊이감을 만든다
 * 4. prefers-reduced-motion 시 모든 drift가 정지한다 (CSS @media)
 *
 * Props:
 * @param {React.ReactNode} children - 챔버 위에 올릴 로고그램 렌더러 [Required]
 * @param {string|number} ratio - 무대 비율 (RatioContainer ratio — '1:1' | 'phi' | number 등) [Optional, 기본값: '1:1']
 * @param {string} maxWidth - 챔버 최대 너비 [Optional]
 * @param {boolean} isActive - 안개 드리프트 동작 여부 (false면 정적 안개) [Optional, 기본값: true]
 * @param {boolean} isFullscreen - 비율 컨테이너 대신 부모를 가득 채우는 안개 공간 (absolute inset 0) [Optional, 기본값: false]
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
  isFullscreen = false,
  sx = {},
}) {
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
    backgroundColor: 'custom.chamber.fog',
    // 서리 유리 표면 너머의 깊이감 — 중심은 밝게, 가장자리는 fogDeep로 가라앉음
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background:
        'radial-gradient(ellipse at 50% 45%, rgba(223,227,230,0) 35%, rgba(201,207,212,0.55) 100%)',
      // 가장자리 미세 비네트 (서리 유리 테두리)
      boxShadow: 'inset 0 0 64px 8px rgba(201,207,212,0.45)',
      zIndex: 2,
    },
    '@media (prefers-reduced-motion: reduce)': {
      '& .chamber-fog-layer': {
        animation: 'none',
      },
    },
    ...sx,
  };

  if (isFullscreen) {
    return (
      <Box sx={ { position: 'absolute', inset: 0, overflow: 'hidden', ...chamberSx } }>
        { renderLayers(layerBaseSx, isActive) }
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
      ratio={ ratio }
      maxWidth={ maxWidth }
      isContained
      background="custom.chamber.fog"
      sx={ chamberSx }
    >
      { renderLayers(layerBaseSx, isActive) }
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
