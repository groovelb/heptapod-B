import { useEffect, useState, useRef } from 'react';
import Box from '@mui/material/Box';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const INITIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

/**
 * ScrambleText 컴포넌트
 *
 * 텍스트가 전환될 때 글자가 랜덤 문자로 뒤섞였다가 순차적으로 확정되는 키네틱 타이포그래피.
 * requestAnimationFrame 기반으로 부드러운 스크램블 애니메이션 구현.
 *
 * 동작 흐름:
 * 1. (isInitialScramble 활성 시) 마운트 직후 initialCharset 문자로 스크램블 후 확정
 * 2. text prop이 변경되면 charset 문자로 스크램블 애니메이션이 시작된다
 * 3. 각 글자가 랜덤 문자로 빠르게 교체된다
 * 4. 왼쪽부터 순차적으로 최종 글자로 확정된다
 * 5. duration 시간이 지나면 모든 글자가 확정되어 애니메이션이 완료된다
 *
 * Props:
 * @param {string} text - 표시할 텍스트 [Required]
 * @param {number} duration - 스크램블 애니메이션 소요 시간 (ms) [Optional, 기본값: 800]
 * @param {boolean} isTrigger - 애니메이션 트리거 여부 [Optional, 기본값: true]
 * @param {boolean} isInitialScramble - 최초 마운트 시 스크램블 효과 여부 [Optional, 기본값: false]
 * @param {string} initialCharset - 최초 등장 스크램블에 사용할 문자 집합 [Optional, 기본값: '!@#$%^&*()_+-=[]{}|;:,.<>?/~`']
 * @param {string} charset - 텍스트 전환 스크램블에 사용할 문자 집합 [Optional, 기본값: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
 * @param {string} variant - MUI Typography variant [Optional, 기본값: 'body1']
 * @param {object} sx - MUI sx 스타일 [Optional]
 *
 * Example usage:
 * <ScrambleText text="Hello World" duration={1000} />
 * <ScrambleText text="Design" isInitialScramble initialCharset="※◆●▲■" />
 */
function ScrambleText({
  text,
  duration = 800,
  isTrigger = true,
  isInitialScramble = false,
  initialCharset = INITIAL_CHARS,
  charset = CHARS,
  variant = 'body1',
  sx = {},
}) {
  const [displayText, setDisplayText] = useState(
    isInitialScramble ? '' : text
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const prevTextRef = useRef(text);
  const frameRef = useRef(0);

  /** 스크램블 애니메이션 공통 로직 */
  const runScramble = (targetText, fromLength, chars) => {
    setIsAnimating(true);
    const startTime = performance.now();
    const maxLength = Math.max(fromLength, targetText.length);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      /** 왼쪽부터 순차적으로 글자 확정 */
      const settledCount = Math.floor(progress * targetText.length);

      let result = '';
      for (let i = 0; i < maxLength; i++) {
        if (i < settledCount) {
          result += targetText[i] || '';
        } else if (i < targetText.length) {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }

      setDisplayText(result);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayText(targetText);
        setIsAnimating(false);
        prevTextRef.current = targetText;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
  };

  /** 최초 마운트 시 스크램블 효과 */
  useEffect(() => {
    if (!isInitialScramble) return;
    runScramble(text, text.length, initialCharset);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  /** text 변경 시 스크램블 애니메이션 실행 */
  useEffect(() => {
    if (!isTrigger || text === prevTextRef.current) return;

    runScramble(text, prevTextRef.current.length, charset);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [text, isTrigger, duration, charset]);

  /** 초기 렌더링 시 텍스트 설정 (isInitialScramble이 아닌 경우) */
  useEffect(() => {
    if (!isAnimating && !isInitialScramble) {
      setDisplayText(text);
      prevTextRef.current = text;
    }
  }, []);

  return (
    <Box
      component="span"
      sx={ {
        typography: variant,
        ...sx,
      } }
    >
      { displayText }
    </Box>
  );
}

export default ScrambleText;
