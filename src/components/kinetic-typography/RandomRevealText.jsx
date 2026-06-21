import { useEffect, useState, useMemo } from 'react';
import Box from '@mui/material/Box';

/**
 * RandomRevealText 컴포넌트
 *
 * 텍스트의 각 글자를 랜덤 순서로 blur에서 선명하게 전환하며 노출하는 키네틱 타이포그래피.
 * Fisher-Yates 셔플로 랜덤 순서를 생성하고, stagger 간격으로 순차 reveal.
 *
 * 동작 흐름:
 * 1. 컴포넌트가 마운트되면 공백을 제외한 글자의 랜덤 순서를 생성한다
 * 2. delay 후 stagger 간격으로 각 글자가 순차적으로 나타난다
 * 3. 각 글자는 blur(12px) + opacity(0) → blur(0) + opacity(1) 전환
 * 4. 모든 글자가 reveal되면 애니메이션이 완료된다
 *
 * Props:
 * @param {string} text - 표시할 텍스트 [Required]
 * @param {number} delay - 애니메이션 시작 지연 시간 (ms) [Optional, 기본값: 300]
 * @param {number} stagger - 글자 간 reveal 간격 (ms) [Optional, 기본값: 80]
 * @param {string} variant - MUI Typography variant [Optional, 기본값: 'body1']
 * @param {object} sx - MUI sx 스타일 [Optional]
 *
 * Example usage:
 * <RandomRevealText text="Hello World" delay={500} stagger={60} />
 */
function RandomRevealText({
  text,
  delay = 300,
  stagger = 80,
  variant = 'body1',
  sx = {},
}) {
  const [revealedIndices, setRevealedIndices] = useState(new Set());

  /** 공백을 제외한 글자의 랜덤 순서 생성 (Fisher-Yates shuffle) */
  const randomOrder = useMemo(() => {
    const indices = text
      .split('')
      .map((char, i) => (char !== ' ' ? i : -1))
      .filter((i) => i !== -1);

    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [text]);

  /** stagger 간격으로 순차적 reveal 타이머 설정 */
  useEffect(() => {
    const timeouts = [];

    randomOrder.forEach((charIndex, orderIndex) => {
      const timeout = setTimeout(() => {
        setRevealedIndices((prev) => new Set([...prev, charIndex]));
      }, delay + orderIndex * stagger);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach((t) => clearTimeout(t));
  }, [randomOrder, delay, stagger]);

  return (
    <Box
      component="span"
      sx={ {
        typography: variant,
        ...sx,
      } }
    >
      { text.split('').map((char, index) => {
        const isRevealed = char === ' ' || revealedIndices.has(index);
        return (
          <Box
            component="span"
            key={ index }
            sx={ {
              display: 'inline-block',
              opacity: isRevealed ? 1 : 0,
              filter: isRevealed ? 'blur(0px)' : 'blur(12px)',
              transition: 'opacity 1.2s ease-out, filter 1.2s ease-out',
              minWidth: char === ' ' ? '0.3em' : undefined,
            } }
          >
            { char }
          </Box>
        );
      }) }
    </Box>
  );
}

export default RandomRevealText;
