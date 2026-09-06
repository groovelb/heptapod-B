import { MORPHOLOGY_VERSION } from '../../data/heptapodMeaningCatalog.js';
import { extractGlyphFeatures } from './extractGlyphFeatures.js';
import { TAU, angleDistance } from './morphology.js';

const NEAR_ARC = Math.PI / 2;
const OPPOSED_ANGLE = Math.PI * 5 / 6;
// Compensate arithmetic noise only (about 6e-9 degrees), never widen a category.
const ANGULAR_EPSILON = 1e-10;

function invalidMorphology() {
  return {
    morphologyVersion: MORPHOLOGY_VERSION,
    status: 'invalid', ring: null, direction: null, focusCount: null,
    arrangement: null, ink: null, inkPeakCount: null, morphologyKey: null,
    focuses: [], gap: null, inkPeaks: [], maxFocusDistance: null,
    minimumCoveringArc: null, furthestPair: null, hasOpposedPair: null,
  };
}

/** Classification of the body only; errors are data states, never exceptions. */
export function classifyGlyphMorphology(model) {
  let features;
  try {
    if (!model || typeof model !== 'object' || Array.isArray(model)) return invalidMorphology();
    // The question hook is not part of this reading, including its validation.
    features = extractGlyphFeatures({ ...model, questionHook: null });
  } catch { return invalidMorphology(); }

  // Deliberately omit source names, type labels and contour/weight-center metadata.
  const focuses = features.clusters.map(({ ang, dirBias, clusterIndex }) => ({ ang, dirBias, clusterIndex }));
  const focusCount = focuses.length;
  const directions = new Set(focuses.map((focus) => focus.dirBias));
  const direction = !focusCount ? null : directions.size > 1 ? 'mixed'
    : directions.has(1) ? 'outward' : 'inward';
  let maxFocusDistance = focusCount ? 0 : null;
  let furthestPair = null;
  for (let i = 0; i < focusCount; i += 1) {
    for (let j = i + 1; j < focusCount; j += 1) {
      const distance = angleDistance(focuses[i].ang, focuses[j].ang);
      if (furthestPair === null || distance > maxFocusDistance) {
        maxFocusDistance = distance;
        furthestPair = [focuses[i].clusterIndex, focuses[j].clusterIndex];
      }
    }
  }
  let minimumCoveringArc = focusCount ? 0 : null;
  if (focusCount > 1) {
    const angles = focuses.map((focus) => focus.ang).sort((a, b) => a - b);
    let largestGap = 0;
    for (let i = 0; i < angles.length; i += 1) {
      const next = i === angles.length - 1 ? angles[0] + TAU : angles[i + 1];
      largestGap = Math.max(largestGap, next - angles[i]);
    }
    minimumCoveringArc = Math.max(0, TAU - largestGap);
  }
  const hasOpposedPair = !focusCount ? null : maxFocusDistance + ANGULAR_EPSILON >= OPPOSED_ANGLE;
  const arrangement = !focusCount ? null : focusCount === 1 ? 'single'
    : minimumCoveringArc <= NEAR_ARC + ANGULAR_EPSILON ? 'near'
      : hasOpposedPair ? 'opposed' : 'distributed';
  const gap = features.gap ? { ...features.gap } : null;
  const ring = gap ? 'open' : 'closed';
  const inkPeaks = features.inkPeaks.filter((peak) => Number.isFinite(peak.ang)
    && Number.isFinite(peak.value) && Number.isFinite(peak.prominence) && peak.prominence > 0)
    .map(({ ang, value, prominence }) => ({ ang, value, prominence }));
  const inkPeakCount = inkPeaks.length;
  const ink = !inkPeakCount ? null : inkPeakCount === 1 ? 'concentrated' : 'distributed';
  const status = focusCount && inkPeakCount ? 'complete' : 'partial';
  const morphologyKey = status === 'complete'
    ? `morphology-v${MORPHOLOGY_VERSION}:${ring}:${direction}:${focusCount}:${arrangement}:${ink}` : null;
  return {
    morphologyVersion: MORPHOLOGY_VERSION,
    status, ring, direction, focusCount, arrangement, ink, inkPeakCount, morphologyKey,
    focuses, gap, inkPeaks, maxFocusDistance, minimumCoveringArc, furthestPair, hasOpposedPair,
  };
}
