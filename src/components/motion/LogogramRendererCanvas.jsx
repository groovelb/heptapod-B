import { useEffect, useMemo, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import {
  generateParticles, generateVapor, makeSprites, makeVaporSprites,
  drawInkParticle, paintStatic, paintVapor, stampStreaks, easeOutCubic, SIZE0,
} from '../../utils/heptapod/logogramParticles';

/**
 * Heptapod B 로고그램 Canvas 2D 렌더러 — 방향성 스윕 × 연기 질감 (v2.1)
 *
 * 형성 서사 (영화 VFX — Hybride/Louis Morin 방식의 Canvas 번역):
 * 스윕 헤드가 링을 따라 진행하며(방향성, v2 delayOf) 그 자리에서 연기가
 * 피어오르고(vapor), 연기가 소산한 자리에 잉크가 타겟 형태로 settle한다.
 * 완성 후에도 vapor가 영구히 미세 순환한다 ("remains in movement constantly").
 *
 * 2레이어 합성 (잉크/안개 분리 — Hybride 합성 구조 모사):
 * - L1 vapor: 1/2 해상도 오프스크린. clearRect 대신 저알파 destination-out
 *   fade → 잔상이 기체의 소산·모션 블러가 된다. 업스케일 시 자연 소프트닝
 *   (실시간 ctx.filter blur 금지 — 성능 정석)
 * - L2 ink: 입자 본체. 형성 중 매 프레임 드로우, 완성 후 오프스크린 1회
 *   합성 후 blit (저비용 평형 루프)
 *
 * 결정론: 입자·vapor 스케줄 전부 model.meta.hash 유도 (Math.random 미사용).
 * vapor 잔상만 프레임레이트 의존(근사) — 형태·잉크·PNG는 엄밀 결정론.
 *
 * Props:
 * @param {object} model - LogogramModel (encode → buildModel 산출물) [Required]
 * @param {number} size - 캔버스 정방형 한 변 (px) [Optional, 기본값: 480]
 * @param {string} inkColor - 잉크 색 [Optional, 기본값: theme custom.chamber.ink → '#15171a' 폴백]
 * @param {boolean} isActive - 형성 애니메이션 시작 여부 (false면 빈 무대) [Optional, 기본값: true]
 * @param {function} onFormationComplete - 형성 완료 시 호출 [Optional]
 *
 * Example usage:
 * const model = buildModel(encode('Louise'));
 * <LogogramRendererCanvas model={model} size={480} onFormationComplete={handleDone} />
 */
function LogogramRendererCanvas({
  model,
  size = 480,
  inkColor,
  isActive = true,
  timeScale = 1,
  onFormationComplete,
}) {
  const theme = useTheme();
  const canvasRef = useRef(null);
  const completeRef = useRef(onFormationComplete);

  const ink = inkColor || theme.palette.custom?.chamber?.ink || '#15171a';

  const prefersReduced = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const built = useMemo(
    () => generateParticles(model, prefersReduced),
    [model, prefersReduced],
  );
  const vapor = useMemo(() => generateVapor(model), [model]);

  /** 콜백 최신화 — 애니메이션 effect 의존성에 콜백을 넣지 않기 위한 ref 동기화 */
  useEffect(() => {
    completeRef.current = onFormationComplete;
  }, [onFormationComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d');
    // 720-space → 표시 size, dpr 결합
    const sc = (size / SIZE0) * dpr;
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    ctx.clearRect(0, 0, SIZE0, SIZE0);

    if (!isActive) {
      return undefined;
    }

    const sprites = makeSprites(ink);
    const { particles, totalMs } = built;

    // reduced-motion: vapor·형성 생략, 즉시 정적 완성형
    if (prefersReduced) {
      paintStatic(ctx, particles, sprites);
      completeRef.current?.();
      return undefined;
    }

    const vaporSprites = makeVaporSprites(ink);

    // L1 vapor 레이어 — 1/2 해상도 오프스크린 (업스케일 자연 블러 + 픽셀 1/4)
    const vaporCanvas = document.createElement('canvas');
    const vaporPx = Math.max(160, Math.round((size * dpr) / 2));
    vaporCanvas.width = vaporPx;
    vaporCanvas.height = vaporPx;
    const vctx = vaporCanvas.getContext('2d');
    const vsc = vaporPx / SIZE0;
    vctx.setTransform(vsc, 0, 0, vsc, 0, 0);

    // 완성 후 잉크 평형용 오프스크린 (1회 합성 → blit)
    let settledInk = null;

    let raf = 0;
    let done = false;
    const t0 = performance.now();

    const tick = (now) => {
      const t = (now - t0) * timeScale; // timeScale>1이면 형성이 빠르게 감김 (프리뷰용)

      // ── L1 vapor: 소산(잔상 fade) → 분출 ──────────────────────────
      vctx.globalCompositeOperation = 'destination-out';
      vctx.fillStyle = 'rgba(0,0,0,0.085)';
      vctx.fillRect(0, 0, SIZE0, SIZE0);
      vctx.globalCompositeOperation = 'source-over';
      paintVapor(vctx, vapor.puffs, t, vaporSprites.puff);
      if (t < totalMs) {
        stampStreaks(vctx, particles, t, vaporSprites.streak);
      }

      // ── 합성: vapor → ink ─────────────────────────────────────────
      ctx.clearRect(0, 0, SIZE0, SIZE0);
      ctx.drawImage(vaporCanvas, 0, 0, SIZE0, SIZE0);

      if (t < totalMs) {
        // 형성 중 — 전 입자 드로우
        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          const e = (t - p.t0) / p.dur;
          if (e < 0) continue;
          drawInkParticle(ctx, p, sprites, easeOutCubic(Math.min(1, e)));
        }
        ctx.globalAlpha = 1;
      } else {
        // 완성 — 잉크는 고정(1회 합성 blit), vapor만 영구 순환
        if (!settledInk) {
          settledInk = document.createElement('canvas');
          settledInk.width = canvas.width;
          settledInk.height = canvas.height;
          const sctx = settledInk.getContext('2d');
          sctx.setTransform(sc, 0, 0, sc, 0, 0);
          paintStatic(sctx, particles, sprites);
        }
        ctx.drawImage(settledInk, 0, 0, SIZE0, SIZE0);
        if (!done) {
          done = true;
          completeRef.current?.();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [built, vapor, size, ink, isActive, prefersReduced, timeScale]);

  return (
    <Box component="span" sx={ { display: 'inline-flex', lineHeight: 0 } }>
      <canvas
        ref={ canvasRef }
        role="img"
        aria-label={ `Heptapod B logogram: ${model.meta.name}` }
        style={ { width: size, height: size, display: 'block' } }
      />
    </Box>
  );
}

export default LogogramRendererCanvas;
