import { useId } from 'react';
import Box from '@mui/material/Box';
import Placeholder from '../../common/ui/Placeholder';
import ArchiveFeedIndex from './ArchiveFeedIndex';

function Preview(args) {
  const prefix = useId();
  const items = args.items.map((item) => ({ ...item, targetId: `${prefix}-${item.id}` }));
  return <Box sx={ { display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr)', gap: 3, bgcolor: 'custom.chamber.fog', color: 'custom.chamber.ink', p: 2 } }>
    <ArchiveFeedIndex { ...args } items={ items } />
    <Box>{ items.map((item) => <Box key={ item.id } id={ item.targetId } tabIndex={ -1 } sx={ { minHeight: `${Math.max(1, item.count / 3) * 30}vh`, scrollMarginTop: 128 } }>
      <Placeholder.Box label={ `${item.label} · ${item.count}` } height={ 240 } />
    </Box>) }</Box>
  </Box>;
}

export default {
  title: 'Custom Component/6. In-page Navigation/ArchiveFeedIndex', component: ArchiveFeedIndex, tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: '작은 원을 피드 순서대로 배치한 44px 너비의 왼쪽 sticky 앵커 인덱스입니다. 원 크기는 구성원 수에 따른 상대 분량, 채움은 현재 위치입니다. 유형명·개수는 hover/키보드 focus/터치 길게 누르기의 툴팁에서만 표시합니다. 숫자는 현재 순서/전체 구간 수만 표시합니다. 기존 Lenis 또는 네이티브 스크롤을 쓰며 모션 감소 시 즉시 이동합니다. 클릭 영역은 원보다 큰 44px이고 긴 인덱스는 자체 스크롤로 접근합니다. 예제 분량은 표시용 데이터이며 공개 통계가 아닙니다.' } } },
  argTypes: {
    items: { control: 'object', description: '피드 순서의 {id,targetId,label,count} 배열. targetId는 마운트된 이동 대상 DOM ID' },
    sx: { control: 'object', description: 'sticky nav의 MUI sx 확장' },
  },
  args: { items: [{ id: 'first', label: '첫 신호', count: 3 }, { id: 'time', label: '시간의 전령', count: 12 }, { id: 'threshold', label: '문턱의 개척자', count: 6 }], sx: {} },
};
export const Default = { render: (args) => <Preview { ...args } /> };
export const Empty = { args: { items: [] } };
