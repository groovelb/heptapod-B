import { useEffect } from 'react';
import { useMotionValue } from 'framer-motion';
import Box from '@mui/material/Box';
import InkLetters from './InkLetters';
import { ORDER } from './inkMotion';
import { headlineSx } from './captionStyles';

/**
 * 진행도 하나로 글자 스태거를 확인하는 미리보기.
 *
 * Props:
 * @param {string} text - 표시할 문구 [Required]
 * @param {number} entry - 비트 로컬 진행도 [Required]
 * @param {number} exit - 퇴장 진행도 [Required]
 * @param {string} orderName - ORDER 키 [Required]
 * @param {string} unit - 'char' 또는 'word' [Required]
 * @param {number} letterSpan - 한 단위의 등장 길이 비율 [Required]
 * @param {boolean} reduced - 모션 감소 [Optional]
 *
 * Example usage:
 * <Preview text="they arrived" entry={ 0.2 } orderName="centerOut" />
 */
function Preview({ text, entry, exit, orderName, unit, letterSpan, reduced }) {
  const f = useMotionValue(entry);
  const exitProgress = useMotionValue(exit);
  useEffect(() => { f.set(entry); exitProgress.set(exit); }, [entry, exit, f, exitProgress]);
  return (
    <Box sx={ { minHeight: '60vh', display: 'flex', alignItems: 'center', px: { xs: 3, md: 6 }, bgcolor: 'custom.chamber.fog' } }>
      <Box sx={ headlineSx({}) }>
        <InkLetters
          f={ f }
          text={ text }
          unit={ unit }
          order={ ORDER[orderName] }
          letterSpan={ letterSpan }
          reduced={ reduced }
          exitProgress={ exitProgress }
        />
      </Box>
    </Box>
  );
}

export default {
  title: 'Custom Component/3. Hero Scrub/InkLetters',
  component: InkLetters,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '캡션 변주 여섯 종이 공유하는 글자 층이다. 문구를 글자나 어절로 쪼개 등장 창을 나눠 주고, 번짐과 자간으로만 들어오고 나간다. 슬라이드와 바운스를 쓰지 않는다.',
      },
    },
  },
  argTypes: {
    text: { control: 'text', description: '표시할 문구' },
    entry: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: '비트 로컬 진행도' },
    exit: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, description: '랜덤 퇴장 진행도' },
    orderName: { control: 'inline-radio', options: ['leftToRight', 'centerOut', 'edgesIn', 'none'], description: '스태거 순서' },
    unit: { control: 'inline-radio', options: ['char', 'word'], description: '스태거 단위. 한글 본문은 어절' },
    letterSpan: { control: { type: 'range', min: 0.1, max: 1, step: 0.05 }, description: '한 단위의 등장 길이 비율' },
    reduced: { control: 'boolean', description: '모션 감소 설정' },
    f: { control: false },
    order: { control: false },
    enter: { control: false },
    exitProgress: { control: false },
  },
  args: { text: 'they arrived', entry: 0.2, exit: 0, orderName: 'leftToRight', unit: 'char', letterSpan: 0.45, reduced: false },
  render: (args) => <Preview { ...args } />,
};

/** 왼쪽에서 오른쪽으로 */
export const Default = {};

/** 중앙에서 양끝으로 */
export const CenterOut = { args: { orderName: 'centerOut', entry: 0.18 } };

/** 한글 본문은 어절 단위 */
export const KoreanWords = { args: { text: '그들이 먼저 말을 걸었다', unit: 'word', entry: 0.25 } };

/** 랜덤 순서로 흩어지는 퇴장 */
export const Leaving = { args: { entry: 1, exit: 0.6 } };
