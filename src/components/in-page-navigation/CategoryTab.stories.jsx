import { useState } from 'react';
import Box from '@mui/material/Box';
import CategoryTab from './CategoryTab';

const CATEGORIES = [
  { id: 'arrival', label: '도래' },
  { id: 'reception', label: '수용' },
  { id: 'reciprocity', label: '상호성' },
];

/**
 * 선택 상태를 들고 있는 미리보기.
 *
 * Props:
 * @param {string} initial - 처음 선택한 id [Required]
 *
 * Example usage:
 * <Preview initial="arrival" />
 */
function Preview({ initial }) {
  const [selected, setSelected] = useState(initial);
  return (
    <Box sx={ { p: 3 } }>
      <CategoryTab categories={ CATEGORIES } selected={ selected } onChange={ setSelected } />
    </Box>
  );
}

export default {
  title: 'Custom Component/8. Adapted Starter/CategoryTab',
  component: CategoryTab,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '스타터킷의 카테고리 탭을 이 프로젝트의 문구 사전에 맞춰 고친 것이다. 현재 아카이브는 탭 대신 계열 상징과 유형 피드를 쓰기 때문에 화면에 마운트되지 않는다. 여기서는 계열 세 개를 예시로 넣었다.',
      },
    },
  },
  argTypes: {
    initial: { control: 'inline-radio', options: CATEGORIES.map((item) => item.id), description: '처음 선택한 계열' },
    categories: { control: false },
    selected: { control: false },
    onChange: { control: false },
    sx: { control: false },
  },
  args: { initial: 'arrival' },
  render: (args) => <Preview { ...args } />,
};

/** 첫 계열 선택 */
export const Default = {};

/** 다른 계열 선택 */
export const Reciprocity = { args: { initial: 'reciprocity' } };
