import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LogogramChamber from './LogogramChamber';
import LogogramRendererWebgl from './LogogramRendererWebgl';
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

export default {
  title: 'Interactive/14. Motion/LogogramRendererWebgl',
  component: LogogramRendererWebgl,
  tags: ['autodocs'],
  argTypes: {
    model: { control: false },
    size: { control: { type: 'range', min: 240, max: 720, step: 40 } },
    inkColor: { control: 'color' },
    isActive: { control: 'boolean' },
    simScale: { control: { type: 'range', min: 0.25, max: 0.5, step: 0.05 } },
    onFormationComplete: { control: false },
    onContextLost: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'GPU 유체 시뮬레이션(Stable Fluids) 기반 3단계 렌더러. 로고그램 형태를 '
          + '밀도 소스로 주입해 잉크가 형태를 띤 채 가장자리만 숨쉬는 평형을 만든다. '
          + 'WebGL2 + EXT_color_buffer_float 불가 시 onContextLost로 폴백을 위임한다. '
          + 'prefers-reduced-motion 시 시뮬레이션 없이 정적 완성형을 표시한다.',
      },
    },
  },
};

/**
 * WebGL 미지원 환경 폴백 데모 래퍼 — onContextLost 시 Canvas 렌더러로 강등.
 *
 * @param {object} props - { name, ...rendererProps }
 * @returns {JSX.Element} 렌더러
 */
function FallbackDemo({ name, ...rest }) {
  const [isLost, setIsLost] = useState(false);
  const model = modelOf(name);
  if (isLost) {
    return <LogogramRendererCanvas model={ model } { ...rest } />;
  }
  return (
    <LogogramRendererWebgl
      model={ model }
      onContextLost={ () => setIsLost(true) }
      { ...rest }
    />
  );
}

/** 기본 — 유체 형성 후 가장자리 호흡 평형 */
export const Default = {
  args: {
    size: 480,
    isActive: true,
    simScale: 0.5,
  },
  render: (args) => <FallbackDemo name="김민준" { ...args } />,
};

/** 챔버 조합 — 밝은 안개 무대 위 유체 잉크 */
export const InChamber = {
  render: () => (
    <Box sx={ { maxWidth: 560 } }>
      <LogogramChamber>
        <FallbackDemo name="Louise" size={ 460 } />
      </LogogramChamber>
    </Box>
  ),
};

/** 시뮬레이션 해상도 비교 — 1/2 vs 1/4 (성능·디테일 트레이드오프) */
export const SimResolutionComparison = {
  render: () => (
    <Box sx={ { display: 'flex', gap: 4, flexWrap: 'wrap' } }>
      { [0.5, 0.25].map((scale) => (
        <Box key={ scale } sx={ { textAlign: 'center' } }>
          <FallbackDemo name="Heptapod" size={ 400 } simScale={ scale } />
          <Typography
            variant="caption"
            sx={ { display: 'block', mt: 1, color: 'text.secondary' } }
          >
            simScale { scale } (그리드 { Math.round(400 * scale) }px)
          </Typography>
        </Box>
      )) }
    </Box>
  ),
};
