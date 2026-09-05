import { createElement } from 'react';
import Box from '@mui/material/Box';
import ResonancePreview from './ResonancePreview';
import { buildArchiveModel } from '../../utils/heptapod/archiveGlyph';

export default {
  title: 'Custom Component/5. Data Display/ResonancePreview', component: ResonancePreview, tags: ['autodocs'],
  parameters: { docs: { description: { component: '비교하기는 넓은 대화상자(모바일 전체 화면)로 열립니다. Hannah(실제 변환 후 가지 공명), Louis(철자는 비슷하지만 형태 무관계), 기호만 입력(검증 실패)을 확인할 수 있습니다. 전달된 모델로 로컬 비교하며 한글 조합 중 Enter는 제출하지 않습니다.' } } },
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
