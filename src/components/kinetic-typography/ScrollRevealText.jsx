import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * ScrollRevealText 컴포넌트
 *
 * 스크롤 진행에 따라 텍스트의 각 글자가 순차적으로 드러나는 스크롤 리빌 효과.
 * 문장 단위로 분리하여 각 문장을 별도 블록으로 표시.
 *
 * 동작 흐름:
 * 1. 컴포넌트가 뷰포트에 진입하면 스크롤 위치 추적을 시작한다
 * 2. 스크롤 진행률(0~1)에 따라 글자가 왼쪽부터 순차적으로 나타난다
 * 3. 비활성 글자는 투명도가 낮고, 활성 글자는 완전히 표시된다
 * 4. 뷰포트 중앙을 지나면 모든 글자가 활성화된다
 *
 * Props:
 * @param {string} text - 표시할 텍스트 [Required]
 * @param {string} activeColor - 활성화된 글자 색상 [Optional, 기본값: 'text.primary']
 * @param {string} inactiveColor - 비활성 글자 색상 [Optional, 기본값: 'text.disabled']
 * @param {string} variant - MUI Typography variant [Optional, 기본값: 'h4']
 * @param {object} sx - MUI sx 스타일 [Optional]
 *
 * Example usage:
 * <ScrollRevealText text="스크롤하면 텍스트가 나타납니다. 문장 단위로 분리됩니다." />
 */
function ScrollRevealText({
  text,
  activeColor = 'text.primary',
  inactiveColor = 'text.disabled',
  variant = 'h4',
  sx = {},
}) {
  const containerRef = useRef(null);
  const [progress, setProgress] = useState(0);

  /** 스크롤 위치 기반 진행률 계산 (requestAnimationFrame throttle) */
  useEffect(() => {
    let ticking = false;

    const updateProgress = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const start = windowHeight * 0.8;
      const end = -rect.height * 0.3;
      const current = rect.top;

      let newProgress = (start - current) / (start - end);
      newProgress = Math.max(0, Math.min(1, newProgress));

      setProgress(newProgress);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /** 문장 단위 분리 ('. ' 기준) */
  const sentences = text.split('. ').map((s, i, arr) =>
    i < arr.length - 1 ? s + '.' : s
  );

  /** 전체 글자 수 계산 */
  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
  const revealedCount = Math.floor(totalChars * progress);

  let charCounter = 0;

  return (
    <Box ref={ containerRef } sx={ sx }>
      { sentences.map((sentence, sIdx) => (
        <Typography
          key={ sIdx }
          variant={ variant }
          sx={ {
            lineHeight: 1.9,
            mb: { xs: 2, md: 3 },
            wordBreak: 'keep-all',
          } }
        >
          { sentence.split('').map((char, cIdx) => {
            const isRevealed = charCounter < revealedCount;
            charCounter++;
            return (
              <Box
                component="span"
                key={ cIdx }
                sx={ {
                  color: isRevealed ? activeColor : inactiveColor,
                  transition: 'color 0.15s ease-out',
                } }
              >
                { char }
              </Box>
            );
          }) }
        </Typography>
      )) }
    </Box>
  );
}

export default ScrollRevealText;
