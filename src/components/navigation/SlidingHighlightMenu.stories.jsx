import Box from '@mui/material/Box';
import { SlidingHighlightMenu } from './SlidingHighlightMenu';

export default {
  title: 'Component/10. Navigation/SlidingHighlightMenu',
  component: SlidingHighlightMenu,
  tags: ['autodocs'],
  argTypes: {
    indicator: {
      control: 'radio',
      options: ['background', 'underline'],
      description: '인디케이터 스타일',
    },
    direction: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: '메뉴 방향',
    },
  },
};

const sampleItems = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'services', label: 'Services' },
  { id: 'contact', label: 'Contact' },
];

export const Default = {
  args: {
    items: sampleItems,
    indicator: 'background',
    direction: 'horizontal',
  },
};

export const Underline = {
  args: {
    items: sampleItems,
    indicator: 'underline',
    direction: 'horizontal',
  },
};

export const Vertical = {
  render: () => (
    <Box sx={ { width: 200 } }>
      <SlidingHighlightMenu
        items={ sampleItems }
        direction="vertical"
      />
    </Box>
  ),
};

export const VerticalUnderline = {
  render: () => (
    <Box sx={ { width: 200 } }>
      <SlidingHighlightMenu
        items={ sampleItems }
        indicator="underline"
        direction="vertical"
      />
    </Box>
  ),
};

export const ManyItems = {
  args: {
    items: [
      { id: 'home', label: 'Home' },
      { id: 'products', label: 'Products' },
      { id: 'solutions', label: 'Solutions' },
      { id: 'pricing', label: 'Pricing' },
      { id: 'resources', label: 'Resources' },
      { id: 'blog', label: 'Blog' },
      { id: 'careers', label: 'Careers' },
    ],
    indicator: 'background',
    direction: 'horizontal',
  },
};
