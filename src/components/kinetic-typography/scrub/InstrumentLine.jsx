import { useRef } from 'react';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { motion, useMotionValueEvent } from 'framer-motion';
import { instrumentSx } from './captionStyles';
import { timecode, useInkReveal } from './inkMotion';

const SLOTS = 12;

/**
 * InstrumentLine 컴포넌트
 *
 * 캡션 아래 모노 계기 한 줄 — 실제 영상 타임코드와 12슬롯이 스크럽에 따라 갱신된다(ref.textContent, 리렌더 없음).
 * 인코더 리드아웃(시드·12슬롯)과 같은 언어로 본편 UI 와 연결한다. B3·B5 에만 붙인다(결정 2).
 *
 * Props:
 * @param {import('framer-motion').MotionValue<number>} progress - 영상 진행도 [Required]
 * @param {import('framer-motion').MotionValue<number>} f - 비트 로컬 진행도 [Required]
 * @param {number} total - 영상 길이(초) [Required]
 * @param {object} beat - 비트 데이터(shot) [Required]
 * @param {'seed'|'slots'} mode - 'seed': 이름 없음(빈 슬롯) / 'slots': f 에 따라 슬롯 채움 [Optional, 기본값: 'seed']
 * @param {boolean} reduced
 * @param {boolean} onLight
 */
function InstrumentLine({ progress, f, total, beat, mode = 'seed', reduced = false, onLight = false }) {
  const theme = useTheme();
  const monoFont = theme.typography?.custom?.mono?.fontFamily || 'monospace';
  const ref = useRef(null);
  const ink = useInkReveal(f, { enter: [0.3, 0.55], reduced });

  const label = (p, fv) => {
    const tc = timecode(p, total);
    if (mode === 'slots') {
      const filled = Math.round(Math.max(0, Math.min(1, fv)) * SLOTS);
      const slots = '●'.repeat(filled) + '○'.repeat(SLOTS - filled);
      return `SHOT ${beat.shot} · ${tc} · ${slots}${filled === SLOTS ? ' · your turn' : ''}`;
    }
    return `SHOT ${beat.shot} · ${tc} · seed —— · slots ${'○'.repeat(SLOTS)}`;
  };

  useMotionValueEvent(progress, 'change', (p) => {
    if (ref.current) ref.current.textContent = label(p, f.get());
  });

  return (
    <Box
      component={ motion.p }
      ref={ ref }
      style={ ink }
      sx={ { ...instrumentSx(monoFont, onLight), mt: 2 } }
    >
      { label(progress.get(), f.get()) }
    </Box>
  );
}

export default InstrumentLine;
