import { createElement } from 'react';
import Box from '@mui/material/Box';
import ResonancePreview from './ResonancePreview';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';

export default {
  title: 'Custom Component/5. Data Display/ResonancePreview', component: ResonancePreview, tags: ['autodocs'],
  parameters: { docs: { description: { component: '현재 표시 모델의 의미 요약과 같은 의미군 탐색 링크를 제공하고, 넓은 대화상자에서 의미·정밀 공명을 구분해 비교합니다. 전달된 모델을 재생성하지 않고 모든 이름 비교를 로컬 처리합니다. 한글 조합 중 Enter는 제출하지 않습니다. 페이지와 동일한 의미 판독기를 사용합니다.' } } },
  decorators: [(Story) => <Box sx={ { bgcolor: 'custom.chamber.fog', p: 2, maxWidth: 720 } }>{ createElement(Story) }</Box>],
  argTypes: {
    primaryName: { control: 'text', description: '현재 표시 이름' },
    primaryModel: { control: 'object', description: '현재 표시 모델. 제공 시 재생성 금지' },
    fg: { control: 'color', description: '전경색. 기본 chamber.ink' },
  },
  args: { primaryName: 'Louise', primaryModel: buildArchiveModel('Louise') },
};

export const Default = {};
export const KoreanName = { args: { primaryName: '민준', primaryModel: buildArchiveModel('민준') } };
