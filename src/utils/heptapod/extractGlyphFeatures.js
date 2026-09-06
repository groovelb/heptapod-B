import { sourceText as t } from '../../i18n/messages.js';
/** Extract only measured morphology from the stored render model. */
import { TAU, normalizeAngle, sampleProfile, waveAt, pressureAt, loadAt, dryAt, visiblePeaks } from './morphology.js';

function slotOfAngle(ang) {
  const k = Math.round((ang - (3 * Math.PI) / 2) / (Math.PI / 6));
  return ((k % 12) + 12) % 12;
}
const TYPE_TO_LINEAGE = { wisp: 'Drift', hook: 'Return', blob: 'Mass', spike: 'Reach' };
function quadrantOf(ang) {
  const a = normalizeAngle(ang);
  if (a >= (5 * Math.PI) / 4 && a < (7 * Math.PI) / 4) return 'Crown';
  if (a < Math.PI / 4 || a >= (7 * Math.PI) / 4) return 'Wake';
  if (a >= Math.PI / 4 && a < (3 * Math.PI) / 4) return 'Root';
  return 'Veil';
}
function deriveContourLineage(model) {
  const primary = TYPE_TO_LINEAGE[model.main?.type] || 'Mass';
  // Legacy classification label only. This metadata is NOT an ink observation.
  const quadrant = quadrantOf(model.ring.weightCenterAngle);
  return { primary, quadrant, label: primary + ' · ' + quadrant };
}
function range(value, lo, hi) {
  return typeof value === 'number' && Number.isFinite(value) && value >= lo && value <= hi;
}
function validModel(model) {
  const list = (value, maximum, test) => Array.isArray(value) && value.length <= maximum && value.every(test);
  const angle = (value) => range(value, -TAU * 4, TAU * 4);
  const harmonic = (value) => value && Number.isInteger(value.k) && range(value.k, 1, 8)
    && range(value.amp, 0, 2) && angle(value.phase);
  return model?.ring && model.meta && range(model.meta.hash, 0, 4294967295)
    && angle(model.ring.weightCenterAngle)
    && list(model.harmonics, 8, (h) => harmonic(h) && h.amp <= 0.1)
    && list(model.pressure, 8, harmonic)
    && list(model.strands, 5, (s) => s && range(s.w, 0, 2) && range(s.a, 0, 1)
      && range(s.off, -2, 2) && angle(s.wobPh) && range(s.thin, 0, 1))
    && list(model.clusters, 3, (c) => c && angle(c.ang) && range(c.I, 0, 2)
      && Number.isInteger(c.spikeN) && range(c.spikeN, 0, 13) && [-1, 1].includes(c.dirBias)
      && range(c.coneSpread, 0, 2))
    && list(model.inkLoads, 4, (z) => z && angle(z.ang) && range(z.width, 0.001, 2) && range(z.strength, 0, 2))
    && list(model.dropZones, 4, (z) => z && angle(z.ang) && range(z.width, 0.001, 2))
    && angle(model.spreadPh)
    && (!model.gap || (angle(model.gap.ang) && range(model.gap.half, 0.001, Math.PI)))
    && (!model.questionHook || (angle(model.questionHook.ang) && [-1, 1].includes(model.questionHook.curl)
      && range(model.questionHook.len, 0.001, 100)));
}

export function extractGlyphFeatures(model) {
  if (!validModel(model)) throw new TypeError(t('extractGlyphFeatures.theGlyphSStoredFormDataCould'));
  const harmonics = model.harmonics.map((h) => ({ k: h.k, amp: h.amp, phase: normalizeAngle(h.phase) }));
  const gap = model.gap ? { ang: normalizeAngle(model.gap.ang), half: model.gap.half } : null;
  return {
    harmonics,
    gap,
    strandCount: model.strands.length,
    // Kept for legacy analysis diagnostics, never used as measured ink density.
    weightCenterAngle: model.ring.weightCenterAngle,
    clusters: model.clusters.map((c, clusterIndex) => ({
      clusterIndex, type: c.type, spikeN: c.spikeN,
      slot: slotOfAngle(c.ang), slotIndex: slotOfAngle(c.ang),
      ang: normalizeAngle(c.ang), dirBias: c.dirBias, intensity: c.I, coneSpread: c.coneSpread,
    })),
    clusterCount: model.clusters.length,
    pressureProfile: sampleProfile((ang) => pressureAt(model, ang) - 0.7),
    inkProfile: sampleProfile((ang) => loadAt(model, ang)),
    dryProfile: sampleProfile((ang) => dryAt(model, ang)),
    ringPeaks: visiblePeaks((ang) => 1 + waveAt(harmonics, ang), gap, 0.002),
    pressurePeaks: visiblePeaks((ang) => pressureAt(model, ang), gap, 0.15),
    inkPeaks: visiblePeaks((ang) => loadAt(model, ang), gap, 0.1),
    questionHook: model.questionHook ? { ...model.questionHook, ang: normalizeAngle(model.questionHook.ang) } : null,
    contourLineage: deriveContourLineage(model),
  };
}
// Public guard for display surfaces: do not send malformed models to Canvas.
export { slotOfAngle, quadrantOf, deriveContourLineage, validModel as isRenderableGlyphModel };
