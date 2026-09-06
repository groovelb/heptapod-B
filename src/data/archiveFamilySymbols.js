import { sourceText as t } from '../i18n/messages.js';
/** Authored navigation symbols, NOT encoded names, public glyphs, averages,
 * or new classification rules. Only cluster directions differ across symbols.
 * Closed ring, one ink peak, and non-opposed focuses avoid implying modifiers.
 * No UUID/is_public fields: these surfaces cannot become archive members.
 */
import { MEANING_CATALOG } from './heptapodMeaningCatalog.js';

function freezeTree(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeTree);
    Object.freeze(value);
  }
  return value;
}

const FOCUS_ANGLES = [260, 20, 130].map((degrees) => degrees * Math.PI / 180);
const DIRECTIONS = {
  arrival: [1, 1, 1],
  reception: [-1, -1, -1],
  reciprocity: [1, -1, 1],
};
const CUES = {
  arrival: t('archiveFamilySymbols.aTraceReachingOutward'),
  reception: t('archiveFamilySymbols.aTraceHeldInward'),
  reciprocity: t('archiveFamilySymbols.aTraceWhereInsideMeetsOutside'),
};

function createSymbol(familyId) {
  const clusters = FOCUS_ANGLES.map((ang, index) => ({
    ang, I: [1.1, 0.95, 1.03][index], spikeN: 8,
    dirBias: DIRECTIONS[familyId][index], coneSpread: 0.22, type: 'spike',
  }));
  // The shared renderer's v2 top-level model contract; no name-derived seed.
  const model = {
    meta: { hash: 0x485042, kind: 'family-symbol', symbolVersion: 1 },
    ring: { weightCenterAngle: FOCUS_ANGLES[0] },
    harmonics: [{ k: 2, amp: 0.018, phase: 1.2 }, { k: 3, amp: 0.008, phase: 0.7 }],
    pressure: [{ k: 1, amp: 0.07, phase: 0.4 }],
    strands: [
      { off: -0.45, w: 1.2, a: 0.78, wobPh: 0.6, thin: 0 },
      { off: 0.55, w: 0.92, a: 0.56, wobPh: 1.9, thin: 0 },
      { off: 0.85, w: 0.6, a: 0.38, wobPh: 2.8, thin: 0.35 },
    ],
    clusters, main: clusters[0],
    inkLoads: [{ ang: FOCUS_ANGLES[0], width: 0.35, strength: 0.32 }],
    dropZones: [], spreadPh: 0.7, gap: null, questionHook: null,
  };
  return freezeTree({ familyId, label: MEANING_CATALOG[familyId].label, cue: CUES[familyId],
    model, surface: { model_data: model } });
}

export const ARCHIVE_FAMILY_SYMBOLS = freezeTree(Object.fromEntries(
  Object.keys(DIRECTIONS).map((familyId) => [familyId, createSymbol(familyId)]),
));

export function getArchiveFamilySymbol(familyId) {
  return Object.hasOwn(ARCHIVE_FAMILY_SYMBOLS, familyId) ? ARCHIVE_FAMILY_SYMBOLS[familyId] : null;
}
