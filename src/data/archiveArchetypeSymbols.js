import { ARCHETYPE_CATALOG } from './heptapodArchetypeCatalog.js';

/** Authored type symbols. These are NOT people, encoded names, or averages.
 * No public IDs, owner or consent fields; never append symbols to public rows.
 * Direction, opposing focuses, opening and ink peaks use the existing grammar.
 */
function freezeTree(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeTree);
    Object.freeze(value);
  }
  return value;
}
const rad = (degrees) => degrees * Math.PI / 180;
const DIRECTIONS = { arrival: [1, 1], reception: [-1, -1], reciprocity: [1, -1] };

function createSymbol(archetype) {
  const has = (id) => archetype.modifierIds.includes(id);
  // Both arrangements keep a recognizable pair; only the opposed pair means
  // simultaneity. Gap and ink locations do not obscure the measured peaks.
  const angles = (has('simultaneity') ? [270, 90] : [270, 330]).map(rad);
  const clusters = angles.map((ang, index) => ({
    ang, I: [1.1, 0.98][index], spikeN: 8, dirBias: DIRECTIONS[archetype.familyId][index],
    coneSpread: 0.22, type: 'spike',
  }));
  const model = {
    meta: { hash: 0x485042, kind: 'archetype-symbol', symbolVersion: 1 },
    ring: { weightCenterAngle: angles[0] },
    harmonics: [{ k: 2, amp: 0.018, phase: 1.2 }, { k: 3, amp: 0.008, phase: 0.7 }],
    pressure: [{ k: 1, amp: 0.07, phase: 0.4 }],
    strands: [
      { off: -0.45, w: 1.2, a: 0.78, wobPh: 0.6, thin: 0 },
      { off: 0.55, w: 0.92, a: 0.56, wobPh: 1.9, thin: 0 },
      { off: 0.85, w: 0.6, a: 0.38, wobPh: 2.8, thin: 0.35 },
    ],
    clusters, main: clusters[0],
    inkLoads: (has('trace') ? [270, 90] : [270]).map((degrees) => ({
      ang: rad(degrees), width: 0.2, strength: 0.7,
    })),
    dropZones: [], spreadPh: 0.7,
    gap: has('openness') ? { ang: rad(180), half: rad(12) } : null,
    questionHook: null,
  };
  return freezeTree({ model });
}

const SYMBOLS = Object.freeze(Object.fromEntries(Object.values(ARCHETYPE_CATALOG)
  .map((archetype) => [archetype.meaningKey, createSymbol(archetype)])));

export function getArchiveArchetypeSymbol(meaningKey) {
  return Object.hasOwn(SYMBOLS, meaningKey) ? SYMBOLS[meaningKey] : null;
}
