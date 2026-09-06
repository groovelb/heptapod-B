import Box from '@mui/material/Box';
import { CX0, CY0, R0, SIZE0 } from '../../utils/heptapod/logogramParticles';

/** Renderer-coordinate marks, shared by the animated archive and pair comparison.
 * @param {object} model - 실제 저장 표식 모델
 * @param {Array} anchors - kind/ang/clusterIndex/half/number를 가진 관측 지점
 * @param {string} fg - 선택적 전경색. 기본 Archive 잉크색
 */
export default function GlyphObservationOverlay({ model, anchors = [], fg }) {
  if (!model?.harmonics || !anchors.length) return null;
  const point = (ang, offset = 0) => {
    const radius = model.harmonics.reduce((value, harmonic) => value
      + R0 * harmonic.amp * Math.sin(harmonic.k * ang + harmonic.phase), R0);
    return { x: (CX0 + (radius + offset) * Math.cos(ang)) / SIZE0 * 100,
      y: (CY0 + (radius + offset) * Math.sin(ang)) / SIZE0 * 100 };
  };
  // Nearby focuses can share almost the same angle. Move only the number,
  // never the observed point, and connect it back to the actual renderer position.
  const labels = [];
  const placeLabel = (ang) => {
    let label = point(ang, 56);
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const turn = Math.ceil(attempt / 2) * (attempt % 2 ? 1 : -1) * 0.22;
      label = point(ang + turn, 56 + Math.floor(attempt / 24) * 32);
      if (labels.every((previous) => Math.hypot(previous.x - label.x, previous.y - label.y) >= 8)) break;
    }
    labels.push(label);
    return label;
  };
  return (
    <Box component="svg" data-glyph-observations viewBox="0 0 100 100" aria-hidden="true" sx={ { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', color: fg || 'custom.chamber.ink' } }>
      { anchors.filter((anchor) => Number.isFinite(anchor.ang)).map((anchor, index) => {
        const cluster = anchor.kind === 'branch' ? model.clusters[anchor.clusterIndex] : null;
        const offset = cluster ? cluster.dirBias * (9 + cluster.I * 15) * 0.18 : 0;
        const location = point(anchor.ang, offset);
        const label = placeLabel(anchor.ang);
        const half = anchor.half ?? Math.PI / 18;
        const arc = Array.from({ length: 25 }, (_, step) => {
          const p = point(anchor.ang - half + 2 * half * step / 24);
          return `${p.x},${p.y}`;
        }).join(' ');
        const number = anchor.number ?? index + 1;
        return <g key={ `${anchor.kind}-${number}` } data-kind={ anchor.kind } data-observation-index={ number }>
          { !['branch', 'question'].includes(anchor.kind) && <polyline points={ arc } fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /> }
          <circle cx={ location.x } cy={ location.y } r="7" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
          <line x1={ location.x } y1={ location.y } x2={ label.x } y2={ label.y } stroke="currentColor" strokeWidth="0.2" />
          <text x={ label.x } y={ label.y } textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize="5">{ number }</text>
        </g>;
      }) }
    </Box>
  );
}
