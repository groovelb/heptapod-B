/** Renderer-space measurements. Angles are radians, 0 = right, increasing clockwise. */
export const TAU = Math.PI * 2;
export const PROFILE_SAMPLES = 180;
export const clamp01 = (value) => Math.max(0, Math.min(1, value));
export const normalizeAngle = (angle) => ((angle % TAU) + TAU) % TAU;
export function angleDistance(a, b) {
  const distance = Math.abs(a - b) % TAU;
  return Math.min(distance, TAU - distance);
}

export function waveAt(harmonics, angle) {
  return harmonics.reduce((sum, harmonic) => sum + harmonic.amp * Math.sin(harmonic.k * angle + harmonic.phase), 0);
}

// These functions reproduce pressureAt/loadAt and the dry-brush pinch in
// logogramParticles.js. They are profiles, not measured image-pixel density.
export const pressureAt = (model, angle) => Math.max(0.04, 0.7 + waveAt(model.pressure, angle));
export const loadAt = (model, angle) => model.inkLoads.reduce((sum, zone) => {
  const distance = angleDistance(angle, zone.ang);
  return sum + zone.strength * Math.exp(-(distance * distance) / (2 * zone.width * zone.width));
}, 0);
export function dryAt(model, angle) {
  let pinch = 1;
  for (const zone of model.dropZones) {
    const u = clamp01(angleDistance(angle, zone.ang) / zone.width);
    pinch = Math.min(pinch, u * u * (3 - 2 * u));
  }
  return 1 - pinch;
}

export const sampleProfile = (fn) => Array.from({ length: PROFILE_SAMPLES }, (_, index) => fn(index * TAU / PROFILE_SAMPLES));

/** Scale-sensitive normalized L2 distance; common radius/pressure baselines are
 * excluded by callers. Reversing the arguments cannot change the score. */
export function profileSimilarity(a, b) {
  const length = Math.max(a.length, b.length);
  let normA = 0; let normB = 0; let difference = 0;
  for (let i = 0; i < length; i += 1) {
    const left = a[i] || 0; const right = b[i] || 0;
    normA += left * left; normB += right * right;
    difference += (left - right) ** 2;
  }
  const scale = Math.sqrt(normA) + Math.sqrt(normB);
  return scale < 1e-12 ? 1 : clamp01(1 - Math.sqrt(difference) / scale);
}

/** Harmonic coefficients retain BOTH actual phase and amplitude. No slot bins. */
export function harmonicSimilarity(a, b) {
  const coefficients = (harmonics) => {
    const result = new Map();
    for (const harmonic of harmonics) {
      const previous = result.get(harmonic.k) || [0, 0];
      result.set(harmonic.k, [previous[0] + harmonic.amp * Math.cos(harmonic.phase),
        previous[1] + harmonic.amp * Math.sin(harmonic.phase)]);
    }
    return result;
  };
  const left = coefficients(a); const right = coefficients(b);
  const frequencies = [...new Set([...left.keys(), ...right.keys()])].sort((x, y) => x - y);
  return profileSimilarity(frequencies.flatMap((k) => left.get(k) || [0, 0]),
    frequencies.flatMap((k) => right.get(k) || [0, 0]));
}

/** Refine actual local maxima to sub-sample angles, and discard maxima inside
 * the opening. A constant circle/profile has no observation-worthy extremum. */
export function visiblePeaks(fn, gap, minProminence) {
  const step = TAU / PROFILE_SAMPLES;
  const samples = sampleProfile(fn);
  const minimum = Math.min(...samples);
  if (Math.max(...samples) - minimum < minProminence) return [];
  const peaks = [];
  for (let i = 0; i < samples.length; i += 1) {
    if (samples[i] <= samples[(i + samples.length - 1) % samples.length]
      || samples[i] < samples[(i + 1) % samples.length]) continue;
    let lo = (i - 1) * step; let hi = (i + 1) * step;
    for (let iteration = 0; iteration < 32; iteration += 1) {
      const oneThird = lo + (hi - lo) / 3;
      const twoThirds = hi - (hi - lo) / 3;
      if (fn(oneThird) < fn(twoThirds)) lo = oneThird;
      else hi = twoThirds;
    }
    const ang = normalizeAngle((lo + hi) / 2);
    const value = fn(ang);
    if ((!gap || angleDistance(ang, gap.ang) > gap.half + 0.01)
      && value - minimum >= minProminence) peaks.push({ ang, value, prominence: value - minimum });
  }
  return peaks.sort((a, b) => b.value - a.value || a.ang - b.ang).slice(0, 4);
}

/** Exact equality of the body fields consumed by generateParticles(), with its
 * meta.hash seed checked separately. The renderer does not read cluster.type,
 * cluster.ph/slot, main, jamo, slots, branches or ring metadata. Excluding those
 * non-rendered labels also keeps VARIANT invariant under a name/type relabel. */
export function sameRenderedBody(a, b) {
  if ((a.meta.hash >>> 0) !== (b.meta.hash >>> 0)) return false;
  let visited = 0;
  function same(left, right, depth = 0) {
    if (++visited > 4096 || depth > 10) return false;
    if (left === right) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    if (Array.isArray(left) && (left.length !== right.length || left.length > 256)) return false;
    const keysA = Object.keys(left).sort(); const keysB = Object.keys(right).sort();
    if (keysA.length !== keysB.length || keysA.length > 256) return false;
    return keysA.every((key, i) => key === keysB[i] && same(left[key], right[key], depth + 1));
  }
  const body = (model) => ({
    harmonics: model.harmonics.map(({ k, amp, phase }) => ({ k, amp, phase })),
    pressure: model.pressure.map(({ k, amp, phase }) => ({ k, amp, phase })),
    strands: model.strands.map(({ off, w, a, wobPh, thin }) => ({ off, w, a, wobPh, thin })),
    spreadPh: model.spreadPh,
    dropZones: model.dropZones.map(({ ang, width }) => ({ ang, width })),
    inkLoads: model.inkLoads.map(({ ang, width, strength }) => ({ ang, width, strength })),
    gap: model.gap ? { ang: model.gap.ang, half: model.gap.half } : null,
    clusters: model.clusters.map(({ ang, I, dirBias, spikeN, coneSpread }) => ({ ang, I, dirBias, spikeN, coneSpread })),
  });
  return same(body(a), body(b));
}
