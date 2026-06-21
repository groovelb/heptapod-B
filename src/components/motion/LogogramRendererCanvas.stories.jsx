import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LogogramChamber from './LogogramChamber';
import LogogramRendererCanvas from './LogogramRendererCanvas';
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

/** 입자 수 비교 표본 — 모바일 하한(800) / 기본(2400) / 데스크톱 상한(4000) */
const PARTICLE_TIERS = [800, 2400, 4000];

export default {
  title: 'Interactive/14. Motion/LogogramRendererCanvas',
  component: LogogramRendererCanvas,
  tags: ['autodocs'],
  argTypes: {
    model: {
      control: false,
      description: 'LogogramModel (encode → buildModel 산출물). 스토리에서는 name arg로 실제 생성',
    },
    size: {
      control: { type: 'number', min: 120, max: 960, step: 20 },
      description: '캔버스 정방형 한 변 (px)',
    },
    inkColor: {
      control: 'color',
      description: '잉크 색 (기본: theme custom.chamber.ink → #1c2226 폴백)',
    },
    particleCount: {
      control: { type: 'number', min: 200, max: 6000, step: 100 },
      description: '입자 수 — 모바일 기준 2~3천 상한 권장',
    },
    isActive: {
      control: 'boolean',
      description: '형성 애니메이션 시작 여부. false→true 전환 시 처음부터 재생',
    },
    onFormationComplete: {
      action: 'formationComplete',
      description: '형성 완료(입자 응집 종료) 시 호출',
    },
    name: {
      control: 'text',
      description: '(스토리 전용) 로고그램으로 인코딩할 이름 — 같은 이름은 항상 같은 형성 애니메이션',
    },
  },
  parameters: {
    backgrounds: {
      default: 'chamber-dark',
      values: [{ name: 'chamber-dark', value: '#0c100f' }],
    },
  },
};

/**
 * 기본 형성 애니메이션 — 입자 군집이 미세 진동하며 응집해 문자를 형성한다.
 * 이름을 바꾸면 처음부터 다시 재생되고, 완성 후에도 가장자리 입자는 영구히 떨린다.
 */
export const Default = {
  args: {
    name: '김민준',
    size: 420,
    particleCount: 2400,
    isActive: true,
  },
  render: (args) => (
    <Box sx={ { p: 6, backgroundColor: 'background.default', display: 'flex', justifyContent: 'center' } }>
      <Box sx={ { backgroundColor: 'custom.chamber.fog', p: 4, display: 'inline-flex' } }>
        <LogogramRendererCanvas
          key={ `${args.name}-${args.size}-${args.particleCount}-${args.inkColor}` }
          model={ modelOf(args.name) }
          size={ args.size }
          inkColor={ args.inkColor }
          particleCount={ args.particleCount }
          isActive={ args.isActive }
          onFormationComplete={ args.onFormationComplete }
        />
      </Box>
    </Box>
  ),
};

/**
 * 입자 수 비교 — 800(모바일 하한) / 2400(기본) / 4000(데스크톱 상한).
 * 같은 이름·같은 시드이므로 밀도만 다르고 형태·모션 구조는 동일하다.
 */
export const ParticleCountComparison = {
  args: {
    name: 'Louise',
  },
  render: (args) => (
    <Box
      sx={ {
        p: 6,
        backgroundColor: 'background.default',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        gap: 3,
        justifyItems: 'center',
      } }
    >
      { PARTICLE_TIERS.map((tier) => (
        <Box key={ tier }>
          <Box sx={ { backgroundColor: 'custom.chamber.fog', p: 2, display: 'inline-flex' } }>
            <LogogramRendererCanvas
              key={ `${args.name}-${tier}` }
              model={ modelOf(args.name) }
              size={ 260 }
              particleCount={ tier }
            />
          </Box>
          <Box sx={ { mt: 1, color: 'text.secondary', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.05em' } }>
            particleCount: { tier }
          </Box>
        </Box>
      )) }
    </Box>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/** 챔버 조합 — 안개 낀 서리 유리 챔버(LogogramChamber) 무대 위에서 입자가 응집한다 */
export const InChamber = {
  args: {
    name: 'Heptapod',
    isActive: true,
    particleCount: 2400,
  },
  render: (args) => (
    <Box sx={ { p: 6, backgroundColor: 'background.default', display: 'flex', justifyContent: 'center' } }>
      <LogogramChamber ratio="1:1" maxWidth="480px">
        <LogogramRendererCanvas
          key={ args.name }
          model={ modelOf(args.name) }
          size={ 320 }
          particleCount={ args.particleCount }
          isActive={ args.isActive }
          onFormationComplete={ args.onFormationComplete }
        />
      </LogogramChamber>
    </Box>
  ),
};

/**
 * prefers-reduced-motion 대응 — OS가 동작 줄이기를 요청하면 형성 애니메이션과
 * 완성 후 미세 진동을 전부 생략하고 즉시 완성 정적 렌더만 보여준다.
 *
 * 시뮬레이션 방법 (컴포넌트가 OS 미디어 쿼리를 직접 읽으므로 환경에서 켜야 한다):
 * - Chrome DevTools → Rendering 탭 → "Emulate CSS media feature prefers-reduced-motion"
 * - macOS: 시스템 설정 → 손쉬운 사용 → 디스플레이 → 동작 줄이기
 * - Windows: 설정 → 접근성 → 시각 효과 → 애니메이션 효과 끄기
 */
export const ReducedMotion = {
  args: {
    name: 'Costello',
  },
  render: (args) => (
    <Box sx={ { p: 6, backgroundColor: 'background.default' } }>
      <Box sx={ { display: 'flex', justifyContent: 'center' } }>
        <Box sx={ { backgroundColor: 'custom.chamber.fog', p: 4, display: 'inline-flex' } }>
          <LogogramRendererCanvas
            key={ args.name }
            model={ modelOf(args.name) }
            size={ 360 }
            onFormationComplete={ args.onFormationComplete }
          />
        </Box>
      </Box>
      <Box sx={ { mt: 3, maxWidth: 560, mx: 'auto' } }>
        <Typography variant="body2" color="text.secondary">
          이 스토리는 별도 prop 없이 OS의 prefers-reduced-motion 설정을 그대로 따른다.
          동작 줄이기가 켜져 있으면 입자 형성·미세 진동 없이 즉시 완성 상태로 그려진다.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={ { mt: 1 } }>
          시뮬레이션: Chrome DevTools의 Rendering 탭에서 prefers-reduced-motion을
          reduce로 에뮬레이션한 뒤 스토리를 다시 마운트(이름 변경)하면 확인할 수 있다.
        </Typography>
      </Box>
    </Box>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};
