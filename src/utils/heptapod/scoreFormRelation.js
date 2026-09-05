/** v3: actual morphology, with strict whole-form and independently evidenced motifs. */
import { angleDistance, clamp01, harmonicSimilarity, profileSimilarity } from './morphology.js';

const DEGREE = Math.PI / 180;
/** Fixed editorial/measurement thresholds; never lowered to fill a graph. */
export const MORPHOLOGY_THRESHOLDS = Object.freeze({
  wholeScore: 0.86,
  wholeHarmonic: 0.72,
  wholeInk: 0.74,
  wholeBranchAngle: 30 * DEGREE,
  wholeSpikeDifference: 2,
  wholeIntensityRatio: 0.60,
  wholeGapWidthRatio: 0.60,
  motifBranchAngle: 15 * DEGREE,
  motifIntensityRatio: 0.75,
  motifConeDifference: 0.20,
  minimumBranchSpikes: 6,
  minimumBranchIntensity: 0.35,
  motifOpeningAngle: 15 * DEGREE,
  motifOpeningWidthRatio: 0.80,
  motifInk: 0.90,
  observedProfile: 0.86,
  observedPeakAngle: 15 * DEGREE,
});
export const FORM_THRESHOLD = MORPHOLOGY_THRESHOLDS.wholeScore;
export const FORM_MAX_PER_NODE = 6;
const ratio = (a, b) => Math.max(a, b) <= 0 ? 1 : Math.min(a, b) / Math.max(a, b);
const cleanScore = (value) => Number(clamp01(value).toFixed(12));

function branchPair(a, b, indexA, indexB) {
  const angleDifference = angleDistance(a.ang, b.ang);
  const intensityRatio = ratio(a.intensity, b.intensity);
  const coneDifference = Math.abs(a.coneSpread - b.coneSpread);
  const sameDirection = a.dirBias === b.dirBias;
  const spikeDifference = Math.abs(a.spikeN - b.spikeN);
  // Canvas particles do not read cluster.type. Its former .22 weight is assigned
  // to rendered angle (+.10), intensity (+.06) and cone spread (+.06).
  const score = 0.14 * clamp01(1 - spikeDifference / 7)
    + 0.36 * clamp01(1 - angleDifference / (Math.PI / 2)) + 0.18 * Number(sameDirection)
    + 0.18 * intensityRatio + 0.14 * clamp01(1 - coneDifference / 0.7);
  const distinctive = a.spikeN >= MORPHOLOGY_THRESHOLDS.minimumBranchSpikes
    && b.spikeN >= MORPHOLOGY_THRESHOLDS.minimumBranchSpikes
    && Math.min(a.intensity, b.intensity) >= MORPHOLOGY_THRESHOLDS.minimumBranchIntensity;
  return {
    indexA, indexB,
    slotA: a.slotIndex, slotB: b.slotIndex, angA: a.ang, angB: b.ang,
    spikeA: a.spikeN, spikeB: b.spikeN, directionA: a.dirBias, directionB: b.dirBias,
    score: cleanScore(score), angleDifference, intensityRatio, coneDifference,
    broadMatch: distinctive && sameDirection
      && spikeDifference <= MORPHOLOGY_THRESHOLDS.wholeSpikeDifference
      && angleDifference <= MORPHOLOGY_THRESHOLDS.wholeBranchAngle
      && intensityRatio >= MORPHOLOGY_THRESHOLDS.wholeIntensityRatio,
    motif: distinctive && sameDirection && spikeDifference === 0
      && angleDifference <= MORPHOLOGY_THRESHOLDS.motifBranchAngle
      && intensityRatio >= MORPHOLOGY_THRESHOLDS.motifIntensityRatio
      && coneDifference <= MORPHOLOGY_THRESHOLDS.motifConeDifference,
  };
}

/** At most 3! assignments; array order is not a shape feature. */
function matchBranches(a, b) {
  const allPairs = a.flatMap((left, i) => b.map((right, j) => branchPair(left, right, i, j)));
  if (!a.length || !b.length) return { score: a.length === b.length ? 1 : 0, pairs: [], allPairs };
  const swapped = a.length > b.length;
  const shortLength = Math.min(a.length, b.length);
  const longLength = Math.max(a.length, b.length);
  let bestSum = -1; let bestPairs = [];
  function visit(index, used, sum, pairs) {
    if (index === shortLength) {
      if (sum > bestSum) { bestSum = sum; bestPairs = pairs; }
      return;
    }
    for (let j = 0; j < longLength; j += 1) {
      if (used.has(j)) continue;
      const indexA = swapped ? j : index;
      const indexB = swapped ? index : j;
      const pair = allPairs[indexA * b.length + indexB];
      visit(index + 1, new Set([...used, j]), sum + pair.score, [...pairs, pair]);
    }
  }
  visit(0, new Set(), 0, []);
  return { score: bestSum / longLength, pairs: bestPairs, allPairs };
}

function compareOpening(a, b) {
  if (!a || !b) return { score: a === b ? 1 : 0, compatible: !a && !b, motif: false };
  const distance = angleDistance(a.ang, b.ang);
  const widthRatio = ratio(a.half, b.half);
  return {
    score: 0.60 * clamp01(1 - distance / (Math.PI / 2)) + 0.40 * widthRatio,
    angleDifference: distance, widthRatio,
    compatible: distance <= MORPHOLOGY_THRESHOLDS.wholeBranchAngle
      && widthRatio >= MORPHOLOGY_THRESHOLDS.wholeGapWidthRatio,
    motif: distance <= MORPHOLOGY_THRESHOLDS.motifOpeningAngle
      && widthRatio >= MORPHOLOGY_THRESHOLDS.motifOpeningWidthRatio,
  };
}

function correspondingPeaks(a = [], b = []) {
  const pairs = a.flatMap((left) => b.map((right) => ({
    left, right, distance: angleDistance(left.ang, right.ang),
  }))).filter((pair) => pair.distance <= MORPHOLOGY_THRESHOLDS.observedPeakAngle);
  pairs.sort((x, y) => (y.left.prominence + y.right.prominence) - (x.left.prominence + x.right.prominence)
    || x.distance - y.distance);
  return pairs[0] || null;
}

function branchObservation(pair) {
  const direction = pair.directionA === 1 ? '바깥으로 뻗는' : '안쪽으로 향하는';
  const detail = pair.spikeA === pair.spikeB ? '가시 ' + pair.spikeA + '개와 배치 각도가'
    : '가시 수와 배치 각도가';
  return {
    kind: 'branch',
    reason: direction + ' 가지에서 ' + detail + ' 닮았습니다.',
    similarity: pair.score,
    anchorA: { ang: pair.angA, clusterIndex: pair.indexA },
    anchorB: { ang: pair.angB, clusterIndex: pair.indexB },
  };
}

/** score stays the whole-form score even when a local motif is sufficient.
 * UI ranking of local motifs uses components.motifScore, never an inflated score. */
export function scoreFormRelation(featuresA, featuresB) {
  const branches = matchBranches(featuresA.clusters, featuresB.clusters);
  const harmonicSim = harmonicSimilarity(featuresA.harmonics, featuresB.harmonics);
  const opening = compareOpening(featuresA.gap, featuresB.gap);
  const pressureSim = profileSimilarity(featuresA.pressureProfile, featuresB.pressureProfile);
  const inkLoadSim = profileSimilarity(featuresA.inkProfile, featuresB.inkProfile);
  const dryBreakSim = profileSimilarity(featuresA.dryProfile, featuresB.dryProfile);
  const inkScore = 0.50 * pressureSim + 0.35 * inkLoadSim + 0.15 * dryBreakSim;
  const wholeScore = cleanScore(0.40 * branches.score + 0.25 * harmonicSim + 0.25 * inkScore + 0.10 * opening.score);
  const localBranches = branches.allPairs.filter((pair) => pair.motif).sort((a, b) => b.score - a.score
    || a.angA - b.angA || a.angB - b.angB);

  const inkCandidates = [
    { similarity: pressureSim, pair: correspondingPeaks(featuresA.pressurePeaks, featuresB.pressurePeaks),
      profile: 'pressure', reason: '두 표식에서 필압이 강해지는 구간의 위치와 변화가 닮았습니다.' },
    { similarity: inkLoadSim, pair: correspondingPeaks(featuresA.inkPeaks, featuresB.inkPeaks),
      profile: 'ink-load', reason: '두 표식에서 먹이 고이는 구간의 방향과 분포가 닮았습니다.' },
  ].filter((item) => item.pair && item.similarity >= MORPHOLOGY_THRESHOLDS.observedProfile)
    .sort((a, b) => b.similarity - a.similarity);
  const ink = inkCandidates[0];
  const openingInkMotif = Boolean(opening.motif && ink
    && inkScore >= MORPHOLOGY_THRESHOLDS.motifInk && ink.similarity >= MORPHOLOGY_THRESHOLDS.motifInk);
  const wholeForm = wholeScore >= FORM_THRESHOLD && harmonicSim >= MORPHOLOGY_THRESHOLDS.wholeHarmonic
    && inkScore >= MORPHOLOGY_THRESHOLDS.wholeInk && opening.compatible
    && featuresA.clusters.length > 0 && featuresA.clusters.length === featuresB.clusters.length
    && branches.pairs.every((pair) => pair.broadMatch);
  const sharedMotif = localBranches.length > 0 || openingInkMotif;
  const level = wholeForm ? 'whole-form' : sharedMotif ? 'shared-motif' : 'none';

  const observations = [];
  const branchEvidence = localBranches.length ? localBranches : wholeForm
    ? branches.pairs.filter((pair) => pair.broadMatch).sort((a, b) => b.score - a.score) : [];
  // Avoid two labels describing the same branch when several equal matches exist.
  const usedA = new Set(); const usedB = new Set();
  for (const pair of branchEvidence) {
    if (usedA.has(pair.indexA) || usedB.has(pair.indexB) || observations.length >= 2) continue;
    observations.push(branchObservation(pair));
    usedA.add(pair.indexA); usedB.add(pair.indexB);
  }
  if (opening.motif) observations.push({
    kind: 'opening', reason: '두 표식의 열린 구간이 비슷한 방향에 있고, 열린 폭도 닮았습니다.',
    similarity: cleanScore(opening.score),
    anchorA: { ang: featuresA.gap.ang, half: featuresA.gap.half },
    anchorB: { ang: featuresB.gap.ang, half: featuresB.gap.half },
  });
  if (ink) observations.push({
    kind: 'ink', reason: ink.reason, similarity: cleanScore(ink.similarity), profile: ink.profile,
    anchorA: { ang: ink.pair.left.ang }, anchorB: { ang: ink.pair.right.ang },
  });
  const ring = correspondingPeaks(featuresA.ringPeaks, featuresB.ringPeaks);
  if (ring && harmonicSim >= MORPHOLOGY_THRESHOLDS.observedProfile) observations.push({
    kind: 'ring', reason: '바깥으로 부푼 링 구간의 방향과 굴곡이 닮았습니다.',
    similarity: cleanScore(harmonicSim),
    anchorA: { ang: ring.left.ang }, anchorB: { ang: ring.right.ang },
  });
  const motifKind = localBranches.length ? 'branch' : openingInkMotif ? 'opening-ink' : null;
  const motifScore = cleanScore(Math.max(localBranches[0]?.score || 0,
    openingInkMotif ? Math.sqrt(opening.score * inkScore) : 0));
  return {
    score: wholeScore,
    pass: (wholeForm || sharedMotif) && observations.length > 0,
    components: {
      level, wholeScore, motifScore, motifKind,
      clusterScore: cleanScore(branches.score), ringScore: cleanScore(harmonicSim),
      harmonicSim: cleanScore(harmonicSim), gapSim: cleanScore(opening.score),
      inkScore: cleanScore(inkScore), pressureSim: cleanScore(pressureSim),
      inkLoadSim: cleanScore(inkLoadSim), dryBreakSim: cleanScore(dryBreakSim),
      observations: observations.slice(0, 4),
      matchedClusters: branches.pairs,
      // Diagnostic counts are never used as a relation gate or ink observation.
      strandSim: clamp01(1 - Math.abs(featuresA.strandCount - featuresB.strandCount) / 2),
      strandCounts: [featuresA.strandCount, featuresB.strandCount],
      gapsOpen: [Boolean(featuresA.gap), Boolean(featuresB.gap)],
      openingAngleDifference: opening.angleDifference ?? null,
      openingWidthRatio: opening.widthRatio ?? null,
    },
  };
}
export default scoreFormRelation;
