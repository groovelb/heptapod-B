import { CX0, CY0, R0, SIZE0 } from './logogramParticles.js';

/** Reveal the stored glyph at observed renderer coordinates, without generating
 * a replacement symbol or treating shared meanings as identical geometry.
 */
export function glyphObservationMask(model, anchors = []) {
  if (!Array.isArray(model?.harmonics)) return 'none';
  const spots = anchors.filter((anchor) => Number.isFinite(anchor.ang)).flatMap((anchor) => {
    const half = anchor.half ?? 0;
    const angles = half ? [anchor.ang - half, anchor.ang, anchor.ang + half] : [anchor.ang];
    return angles.map((ang) => {
      const radius = model.harmonics.reduce((r, h) => r + R0 * h.amp * Math.sin(h.k * ang + h.phase), R0);
      const x = (CX0 + radius * Math.cos(ang)) / SIZE0 * 100;
      const y = (CY0 + radius * Math.sin(ang)) / SIZE0 * 100;
      return `radial-gradient(circle at ${x.toFixed(3)}% ${y.toFixed(3)}%, #000 8%, transparent 18%)`;
    });
  });
  return spots.length ? spots.join(', ') : 'linear-gradient(transparent, transparent)';
}
