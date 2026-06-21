import Box from '@mui/material/Box';
import LogogramChamber from './LogogramChamber';
import LogogramRendererSvg from './LogogramRendererSvg';
import { encode } from '../../utils/heptapod/encode';
import { buildModel } from '../../utils/heptapod/buildModel';

/**
 * 이름 → LogogramModel — 실제 인코딩 파이프라인 (encode → buildModel, mock 금지).
 *
 * @param {string} name - 인코딩할 이름
 * @param {boolean} questionHook - 의문형 갈고리 포함 여부
 * @returns {object} LogogramModel
 */
function modelOf(name, questionHook = false) {
  return buildModel(encode(name), { questionHook });
}

/** 다양성 그리드 표본 — 한/영 · 장/단 혼합 (NFD 자모 수 1~17, 가지 3~9개 전 구간) */
const GRID_NAMES = [
  '윤',
  'Ian',
  '김민준',
  '이서연',
  'Louise',
  'Abbott',
  '박하늘',
  'Costello',
  'Heptapod',
  '정다은별',
  'Louise Banks',
  'Alexander Hamilton',
];

export default {
  title: 'Interactive/14. Motion/LogogramRendererSvg',
  component: LogogramRendererSvg,
  tags: ['autodocs'],
  argTypes: {
    model: {
      control: false,
      description: 'LogogramModel (encode → buildModel 산출물). 스토리에서는 name arg로 실제 생성',
    },
    size: {
      control: { type: 'number', min: 120, max: 960, step: 20 },
      description: 'SVG 정방형 한 변 (px)',
    },
    inkColor: {
      control: 'color',
      description: '잉크 색 (기본: theme custom.chamber.ink → #1c2226 폴백)',
    },
    isAnimated: {
      control: 'boolean',
      description: '각도 기준 회전 클리핑 등장 연출 여부',
    },
    onRenderComplete: {
      action: 'renderComplete',
      description: '렌더 완성(등장 연출 종료) 시 호출',
    },
    name: {
      control: 'text',
      description: '(스토리 전용) 로고그램으로 인코딩할 이름 — 같은 이름은 항상 같은 형상',
    },
    isQuestion: {
      control: 'boolean',
      description: '(스토리 전용) 의문형 갈고리 토글 — 본체 형상은 변하지 않는다',
    },
  },
  parameters: {
    backgrounds: {
      default: 'chamber-dark',
      values: [{ name: 'chamber-dark', value: '#0c100f' }],
    },
  },
};

/** 기본 — 단일 이름. 밝은 안개색 무대 위 잉크 로고그램 (다크 UI 속 밝은 챔버 구도) */
export const Default = {
  args: {
    name: '김민준',
    size: 420,
    isAnimated: false,
    isQuestion: false,
  },
  render: (args) => (
    <Box sx={ { p: 6, backgroundColor: 'background.default', display: 'flex', justifyContent: 'center' } }>
      <Box sx={ { backgroundColor: 'custom.chamber.fog', p: 4, display: 'inline-flex' } }>
        <LogogramRendererSvg
          model={ modelOf(args.name, args.isQuestion) }
          size={ args.size }
          inkColor={ args.inkColor }
          isAnimated={ args.isAnimated }
          onRenderComplete={ args.onRenderComplete }
        />
      </Box>
    </Box>
  ),
};

/** 다양성 그리드 — 한/영·장/단 이름 12개. 복잡도 ∝ 자모 수 (S1), 같은 자모 = 같은 경향 (S2) */
export const DiversityGrid = {
  render: () => (
    <Box
      sx={ {
        p: 6,
        backgroundColor: 'background.default',
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 3,
      } }
    >
      { GRID_NAMES.map((name) => (
        <Box key={ name }>
          <Box sx={ { backgroundColor: 'custom.chamber.fog', display: 'flex', justifyContent: 'center', p: 1 } }>
            <LogogramRendererSvg model={ modelOf(name) } size={ 200 } />
          </Box>
          <Box sx={ { mt: 1, color: 'text.secondary', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.05em' } }>
            { name } · { modelOf(name).meta.hashHex }
          </Box>
        </Box>
      )) }
    </Box>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/** 의문형 갈고리 비교 — 같은 이름의 평서형(좌) vs 의문형(우). 본체는 한 점도 변하지 않는다 */
export const QuestionHook = {
  args: {
    name: 'Louise',
    size: 360,
  },
  render: (args) => (
    <Box
      sx={ {
        p: 6,
        backgroundColor: 'background.default',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 4,
        justifyItems: 'center',
      } }
    >
      <Box>
        <Box sx={ { backgroundColor: 'custom.chamber.fog', p: 2, display: 'inline-flex' } }>
          <LogogramRendererSvg model={ modelOf(args.name, false) } size={ args.size } />
        </Box>
        <Box sx={ { mt: 1, color: 'text.secondary', fontFamily: 'monospace', fontSize: 12 } }>
          questionHook: false
        </Box>
      </Box>
      <Box>
        <Box sx={ { backgroundColor: 'custom.chamber.fog', p: 2, display: 'inline-flex' } }>
          <LogogramRendererSvg model={ modelOf(args.name, true) } size={ args.size } />
        </Box>
        <Box sx={ { mt: 1, color: 'text.secondary', fontFamily: 'monospace', fontSize: 12 } }>
          questionHook: true
        </Box>
      </Box>
    </Box>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/** 등장 연출 — 무게중심 각도에서 시작하는 회전 클리핑 등장 (이름을 바꾸면 다시 재생) */
export const AnimatedReveal = {
  args: {
    name: 'Louise Banks',
    size: 420,
    isAnimated: true,
  },
  render: (args) => (
    <Box sx={ { p: 6, backgroundColor: 'background.default', display: 'flex', justifyContent: 'center' } }>
      <Box sx={ { backgroundColor: 'custom.chamber.fog', p: 4, display: 'inline-flex' } }>
        <LogogramRendererSvg
          key={ `${args.name}-${args.size}` }
          model={ modelOf(args.name) }
          size={ args.size }
          isAnimated={ args.isAnimated }
          onRenderComplete={ args.onRenderComplete }
        />
      </Box>
    </Box>
  ),
};

/** 챔버 조합 — 안개 낀 서리 유리 챔버(LogogramChamber) 무대 위에 로고그램이 떠오른다 */
export const InChamber = {
  args: {
    name: 'Heptapod',
    isAnimated: true,
  },
  render: (args) => (
    <Box sx={ { p: 6, backgroundColor: 'background.default', display: 'flex', justifyContent: 'center' } }>
      <LogogramChamber ratio="1:1" maxWidth="480px">
        <LogogramRendererSvg
          key={ args.name }
          model={ modelOf(args.name) }
          size={ 320 }
          isAnimated={ args.isAnimated }
          onRenderComplete={ args.onRenderComplete }
        />
      </LogogramChamber>
    </Box>
  ),
};
