import { useState } from 'react';
import Box from '@mui/material/Box';
import FilterBar from './FilterBar';

const TAGS = ['동시성', '여백', '잔향'];

/**
 * 검색어와 태그 상태를 들고 있는 미리보기.
 *
 * Props:
 * @param {number} resultCount - 결과 수 표시 [Required]
 *
 * Example usage:
 * <Preview resultCount={ 24 } />
 */
function Preview({ resultCount }) {
  const [searchValue, setSearchValue] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  return (
    <Box sx={ { p: 3 } }>
      <FilterBar
        searchValue={ searchValue }
        onSearchChange={ setSearchValue }
        availableTags={ TAGS }
        selectedTags={ selectedTags }
        onTagToggle={ (tag) => setSelectedTags((tags) => (
          tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag]
        )) }
        onClearFilters={ () => { setSearchValue(''); setSelectedTags([]); } }
        sortBy={ sortBy }
        onSortChange={ setSortBy }
        viewMode={ viewMode }
        onViewModeChange={ setViewMode }
        resultCount={ resultCount }
      />
    </Box>
  );
}

export default {
  title: 'Custom Component/8. Adapted Starter/FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '스타터킷의 필터 바를 문구 사전에 맞춰 고친 것이다. 태그 체계를 접으면서 현재 화면에서는 쓰지 않는다. 아카이브가 다시 필터를 열게 되면 추가 의미 세 가지가 여기 들어갈 후보다.',
      },
    },
  },
  argTypes: {
    resultCount: { control: { type: 'number', min: 0, max: 200 }, description: '결과 수' },
    searchValue: { control: false },
    onSearchChange: { control: false },
    availableTags: { control: false },
    selectedTags: { control: false },
    onTagToggle: { control: false },
    onClearFilters: { control: false },
    sortBy: { control: false },
    onSortChange: { control: false },
    viewMode: { control: false },
    onViewModeChange: { control: false },
    sx: { control: false },
  },
  args: { resultCount: 24 },
  render: (args) => <Preview { ...args } />,
};

/** 기본 상태 */
export const Default = {};

/** 결과 없음 */
export const NoResult = { args: { resultCount: 0 } };
