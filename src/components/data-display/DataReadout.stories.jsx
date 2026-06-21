import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { encode } from '../../utils/heptapod/encode';
import { buildModel } from '../../utils/heptapod/buildModel';
import DataReadout from './DataReadout';

/** 실제 인코딩 엔진으로 모델 생성 (mock 금지 — encode + buildModel 사용) */
function modelFor(name) {
  return buildModel(encode(name));
}

const SAMPLE_NAMES = ['김민준', 'LOUISE', 'ABBOT', '이수현', 'IAN'];

export default {
  title: 'Component/5. Data Display/DataReadout',
  component: DataReadout,
  tags: ['autodocs'],
  argTypes: {
    model: {
      control: false,
      description: 'LogogramModel (encode + buildModel 산출물)',
    },
    renderConfig: {
      control: 'object',
      description: '렌더 설정 ({ tier, reducedMotion, reasons })',
    },
    isCollapsed: {
      control: 'boolean',
      description: '접힌 상태 — 12슬롯 시각화·타입 시퀀스 생략',
    },
  },
  parameters: {
    backgrounds: {
      default: 'chamber-dark',
      values: [{ name: 'chamber-dark', value: '#0c100f' }],
    },
  },
};

/** 기본 — 실제 모델 기반 리드아웃 */
export const Default = {
  args: {
    model: modelFor('김민준'),
    renderConfig: { tier: 'svg', reducedMotion: false },
    isCollapsed: false,
  },
  render: (args) => (
    <Box sx={ { p: 6, backgroundColor: 'background.default', display: 'flex', justifyContent: 'center' } }>
      <DataReadout { ...args } />
    </Box>
  ),
};

/** 접힌 상태 — 핵심 값만, 슬롯 시각화·타입 시퀀스 생략 */
export const Collapsed = {
  args: {
    model: modelFor('LOUISE'),
    renderConfig: { tier: 'webgl', reducedMotion: false },
    isCollapsed: true,
  },
  render: (args) => (
    <Box sx={ { p: 6, backgroundColor: 'background.default', display: 'flex', justifyContent: 'center' } }>
      <DataReadout { ...args } />
    </Box>
  ),
};

/** 이름을 순환하며 값 전환 스크램블 연출을 보여주는 데모 컴포넌트 */
function ValueTransitionDemo() {
  const [index, setIndex] = useState(0);
  const model = modelFor(SAMPLE_NAMES[index]);

  return (
    <Box sx={ { p: 6, backgroundColor: 'background.default', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 } }>
      <Button
        variant="outlined"
        size="small"
        onClick={ () => setIndex((i) => (i + 1) % SAMPLE_NAMES.length) }
      >
        { `NEXT: ${SAMPLE_NAMES[(index + 1) % SAMPLE_NAMES.length]}` }
      </Button>
      <DataReadout model={ model } renderConfig={ { tier: 'svg', reducedMotion: false } } />
    </Box>
  );
}

/** 이름 전환 — 값이 바뀔 때 스크램블 전환 연출 (연구 장비 톤) */
export const ValueTransition = {
  render: () => <ValueTransitionDemo />,
};
