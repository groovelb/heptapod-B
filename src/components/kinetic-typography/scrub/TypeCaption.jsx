import { useCallback, useSyncExternalStore } from 'react';
import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';
import { cancelFrame, frame, motion, useTransform } from 'framer-motion';
import { bodySx, headlineSx } from './captionStyles';
import { EASE, INK_DARK, INK_LIGHT, useInkReveal } from './inkMotion';
import InkLetters from './InkLetters';
import InstrumentLine from './InstrumentLine';

const blink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
`;

/** 타자 창(f) */
const TYPE_WINDOW = [0.5, 0.9];
const ALREADY_VISIBLE = [-1, 0];
const HELD_EXIT = [2, 3];

/**
 * TypeCaption (B5 · Your Turn to Answer — 핸드오프)
 *
 * exitProgress 지정 시 헤드라인·첫 문장의 기존 blur 등장과 마지막 문장의 타자 효과를 유지하고,
 * 모두 읽을 수 있게 붙잡아 둔 뒤 화면 전환 때 글자별 랜덤 blur/opacity로 퇴장한다.
 * exitProgress 미지정 시 헤드라인은 f 0.55→0.95 에서 안개 속으로 흩어진다.
 * 본문 첫 문장은 보통 등장 후 잦아들고, 마지막 문장 `이제, 당신이 답할 차례입니다.` 는 f 0.5→0.9 에서
 * 타자되듯 한 글자씩 찍힌다(표시 글자 수 = f 매핑). 끝에 남는 블록 커서의 깜빡임이 유일한 시간 기반 모션이며,
 * 핸드오프에서 인코더 입력창 커서로 매치컷된다. 색은 f(프레임 휘도 프록시)에 따라 잉크색으로 반전.
 *
 * Props:
 * @param {import('framer-motion').MotionValue<number>} f [Required]
 * @param {import('framer-motion').MotionValue<number>} progress [Required]
 * @param {number} total [Required]
 * @param {object} beat - body 에 '\n' 로 두 문장을 나눈다 [Required]
 * @param {boolean} reduced
 * @param {import('framer-motion').MotionValue<number>} exitProgress - 지정 시 기존 등장 후 유지, 화면 전환에 맞춰 랜덤 퇴장 [Optional]
 */
function TypeCaption({ f, progress, total, beat, reduced = false, exitProgress }) {
  const [line1, line2 = ''] = String(beat.body || '').split('\n');
  const chars = Array.from(line2);

  const spacing = useTransform(f, [0.55, 0.95], [0.02, 0.14], { ease: EASE.out });
  const headSpacing = useTransform(spacing, (s) => `${s.toFixed(3)}em`);
  const headInk = useInkReveal(f, { enter: [0, 0.3], exit: exitProgress ? HELD_EXIT : [0.55, 0.95], reduced });
  const line1Ink = useInkReveal(f, { enter: [0.1, 0.4], exit: exitProgress ? HELD_EXIT : [0.5, 0.7], reduced });
  const color = useTransform(exitProgress ? progress : f, exitProgress ? [0.9, 0.99] : [0.45, 0.85], [INK_LIGHT, INK_DARK]);
  const shadowOpacity = useTransform(exitProgress ? progress : f, exitProgress ? [0.9, 0.99] : [0.45, 0.85], [0.5, 0]);
  const textShadow = useTransform(shadowOpacity, (o) => `0 1px 14px rgba(8,12,11,${o.toFixed(2)})`);
  const cursorOpacity = useTransform(exitProgress ?? f, [0, 0.25], [1, 0]);

  const subscribe = useCallback((notify) => {
    // 파생 MotionValue가 부모 렌더에서 갱신되어도 자식 알림은 다음 프레임에 전달한다.
    const unsubscribe = f.on('change', () => frame.update(notify));
    return () => { unsubscribe(); cancelFrame(notify); };
  }, [f]);
  const getCount = useCallback(() => reduced ? chars.length : Math.round(
    Math.max(0, Math.min(1, (f.get() - TYPE_WINDOW[0]) / (TYPE_WINDOW[1] - TYPE_WINDOW[0]))) * chars.length,
  ), [f, reduced, chars.length]);
  const count = useSyncExternalStore(subscribe, getCount, getCount);
  const typed = chars.slice(0, count).join('');
  const colorStyle = reduced ? { color: INK_DARK, textShadow: 'none' } : { color, textShadow };

  return (
    <Box sx={ { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' } }>
      <Box
        component={ motion.h2 }
        style={ reduced || exitProgress ? { ...headInk, ...colorStyle } : { ...headInk, letterSpacing: headSpacing, ...colorStyle } }
        sx={ { ...headlineSx({ onLight: beat.onLight, maxWidth: '22ch' }), textAlign: 'center' } }
      >
        <InkLetters f={ f } text={ beat.headline } enter={ [0, 0.3] } reduced={ reduced } exitProgress={ exitProgress } />
      </Box>
      <Box
        component={ motion.p }
        style={ { ...line1Ink, ...colorStyle } }
        sx={ { ...bodySx({ onLight: beat.onLight, maxWidth: '32em' }), textAlign: 'center', mt: 2 } }
      >
        { exitProgress ? <InkLetters f={ f } text={ line1 } enter={ ALREADY_VISIBLE } reduced={ reduced } exitProgress={ exitProgress } /> : line1 }
      </Box>
      <Box
        component={ motion.p }
        style={ colorStyle }
        sx={ {
          ...bodySx({ emphasis: true, onLight: beat.onLight, maxWidth: '32em' }),
          textAlign: 'center',
          mt: 1,
          minHeight: '1.7em',
          whiteSpace: exitProgress ? 'normal' : 'pre',
        } }
        aria-label={ line2 }
      >
        { exitProgress ? <InkLetters f={ f } text={ typed } enter={ ALREADY_VISIBLE } reduced={ reduced } exitProgress={ exitProgress } /> : typed }
        { count > 0 && (
          <Box
            component={ motion.span }
            style={ exitProgress ? { opacity: cursorOpacity } : undefined }
            aria-hidden
          >
            <Box
              component="span"
              sx={ {
                display: 'inline-block',
                width: '0.55em',
                height: '1.1em',
                verticalAlign: '-0.2em',
                ml: '0.08em',
                backgroundColor: 'currentColor',
                animation: reduced ? 'none' : `${blink} 1s steps(1) infinite`,
              } }
            />
          </Box>
        ) }
      </Box>
      <InstrumentLine progress={ progress } f={ f } total={ total } beat={ beat } mode="slots" reduced={ reduced } onLight={ beat.onLight } />
    </Box>
  );
}

export default TypeCaption;
