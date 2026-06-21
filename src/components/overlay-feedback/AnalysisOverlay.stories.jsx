import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import AnalysisOverlay from './AnalysisOverlay';
import LogogramRendererSvg from '../motion/LogogramRendererSvg';
import LogogramChamber from '../motion/LogogramChamber';
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
  title: 'Interactive/9. Overlay & Feedback/AnalysisOverlay',
  component: AnalysisOverlay,
  tags: ['autodocs'],
  argTypes: {
    model: {
      control: false,
      description: 'LogogramModel (encode → buildModel 산출물). 스토리에서는 name arg로 실제 생성',
    },
    size: {
      control: { type: 'number', min: 200, max: 720, step: 20 },
      description: 'SVG 정방형 한 변 (px) — 렌더러와 동일 값으로 사용',
    },
    isVisible: {
      control: 'boolean',
      description: '표시 여부 (전환 시 opacity + 미세 scale 페이드)',
    },
    name: {
      control: 'text',
      description: '(스토리 전용) 로고그램으로 인코딩할 이름 — 같은 이름은 항상 같은 구조',
    },
  },
  parameters: {
    backgrounds: {
      default: 'chamber-fog',
      values: [
        { name: 'chamber-fog', value: '#dfe3e6' },
        { name: 'chamber-dark', value: '#0c100f' },
      ],
    },
  },
};

/**
 * 오버레이 단독 — 모델 구조 확인용. 잉크 로고그램 없이 분할선·슬롯 마커·유형
 * 코드·무게중심·측정 링만 안개색 무대 위에 표시한다 (해독 장치의 골격).
 */
export const Default = {
  args: {
    name: '김민준',
    size: 420,
    isVisible: true,
  },
  render: (args) => (
    <Box sx={ { p: 6, backgroundColor: 'background.default', display: 'flex', justifyContent: 'center' } }>
      <Box
        sx={ {
          position: 'relative',
          display: 'inline-flex',
          backgroundColor: 'custom.chamber.fog',
          p: 4,
        } }
      >
        {/* 단독 표시이므로 동일 크기의 빈 정방형 위에 오버레이만 올린다 */}
        <Box sx={ { width: args.size, height: args.size } } />
        <Box sx={ { position: 'absolute', inset: (theme) => theme.spacing(4) } }>
          <AnalysisOverlay
            model={ modelOf(args.name) }
            size={ args.size }
            isVisible={ args.isVisible }
          />
        </Box>
      </Box>
    </Box>
  ),
};

/**
 * 토글로 오버레이를 페이드 인/아웃하는 데모 — 렌더러와 동일 좌표계 중첩.
 *
 * @param {string} name - 인코딩할 이름 [Required]
 * @param {number} size - 렌더러·오버레이 공통 size (px) [Required]
 */
function OverRendererDemo({ name, size }) {
  const [isOn, setIsOn] = useState(true);
  const model = modelOf(name);
  return (
    <Stack spacing={ 3 } alignItems="center" sx={ { p: 6, backgroundColor: 'background.default' } }>
      <FormControlLabel
        control={ <Switch checked={ isOn } onChange={ (e) => setIsOn(e.target.checked) } /> }
        label="분석 오버레이"
        sx={ { color: 'text.secondary', fontFamily: 'monospace' } }
      />
      <Box
        sx={ {
          position: 'relative',
          display: 'inline-flex',
          backgroundColor: 'custom.chamber.fog',
          p: 4,
        } }
      >
        <LogogramRendererSvg model={ model } size={ size } />
        <Box sx={ { position: 'absolute', inset: (theme) => theme.spacing(4) } }>
          <AnalysisOverlay model={ model } size={ size } isVisible={ isOn } />
        </Box>
      </Box>
    </Stack>
  );
}

/**
 * 렌더러 위 겹침 — LogogramRendererSvg와 동일 좌표계로 정확히 중첩. 토글로
 * 오버레이만 페이드 인/아웃 시켜 "심어둔 디자인 장치"임을 드러낸다.
 */
export const OverRenderer = {
  args: {
    name: 'Louise',
    size: 440,
  },
  render: (args) => <OverRendererDemo name={ args.name } size={ args.size } />,
};

/**
 * 챔버 풀 조합 데모 — 서리 유리 챔버 무대 위에 로고그램 + 오버레이를 올린다.
 *
 * @param {string} name - 인코딩할 이름 [Required]
 */
function InChamberDemo({ name }) {
  const [isOn, setIsOn] = useState(true);
  const model = modelOf(name);
  const innerSize = 320;
  return (
    <Stack spacing={ 3 } alignItems="center" sx={ { p: 6, backgroundColor: 'background.default' } }>
      <FormControlLabel
        control={ <Switch checked={ isOn } onChange={ (e) => setIsOn(e.target.checked) } /> }
        label="분석 오버레이"
        sx={ { color: 'text.secondary', fontFamily: 'monospace' } }
      />
      <LogogramChamber ratio="1:1" maxWidth="480px">
        <Box sx={ { position: 'relative', display: 'inline-flex' } }>
          <LogogramRendererSvg model={ model } size={ innerSize } />
          <AnalysisOverlay model={ model } size={ innerSize } isVisible={ isOn } />
        </Box>
      </LogogramChamber>
    </Stack>
  );
}

/**
 * 챔버 풀 조합 — 안개 낀 서리 유리 챔버(LogogramChamber) 무대 위에 로고그램과
 * 분석 오버레이가 함께 떠오르는 최종 연출. 토글로 해독 모드를 켜고 끈다.
 */
export const InChamber = {
  args: {
    name: 'Heptapod',
  },
  render: (args) => <InChamberDemo name={ args.name } />,
  parameters: {
    layout: 'fullscreen',
  },
};
