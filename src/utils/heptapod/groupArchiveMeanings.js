import { sourceText as t } from '../../i18n/messages.js';
import {
  MEANING_VERSION, MORPHOLOGY_VERSION, MEANING_BASE_IDS, MEANING_MODIFIER_IDS, MEANING_CATALOG,
} from '../../data/heptapodMeaningCatalog.js';
import { interpretGlyphMeaning } from './interpretGlyphMeaning.js';

const SAMPLE_LIMIT = 200;
const PUBLIC_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const compareIds = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const LABELS = {
  open: t('glyphDetailPage.openRing'), closed: t('glyphDetailPage.closedRing'), outward: t('groupArchiveMeanings.outward'), inward: t('groupArchiveMeanings.inward'), mixed: t('groupArchiveMeanings.inwardAndOutward'),
  single: t('groupArchiveMeanings.singleFocus'), near: t('groupArchiveMeanings.closeArrangement'), opposed: t('groupArchiveMeanings.opposingArrangement'), distributed: t('groupArchiveMeanings.dispersedArrangement'),
  concentrated: t('groupArchiveMeanings.oneInkPeak'),
};

function morphologyText(morphology) {
  const ink = morphology.ink === 'distributed' ? t('groupArchiveMeanings.multipleInkPeaks') : LABELS.concentrated;
  return {
    title: [LABELS[morphology.ring], LABELS[morphology.direction],
      t('groupArchiveMeanings.focuses', { p0: morphology.focusCount }), LABELS[morphology.arrangement], ink].join(' · '),
    reading: t('groupArchiveMeanings.focusesIn', { p0: LABELS[morphology.ring], p1: LABELS[morphology.direction], p2: morphology.focusCount })
      + t('groupArchiveMeanings.classifiedAs', { p0: LABELS[morphology.arrangement], p1: ink }),
  };
}

/** Shared generator makes synchronous and cooperatively cancellable results identical. */
function* meaningSteps(rows) {
  if (!Array.isArray(rows)) throw new TypeError(t('groupArchiveMeanings.aListOfPublicGlyphsIsRequired'));
  const seen = new Set();
  const selected = [];
  let sampleTruncated = false;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row?.is_public === true && typeof row.id === 'string' && PUBLIC_ID.test(row.id)
      && !seen.has(row.id)) {
      seen.add(row.id);
      if (selected.length === SAMPLE_LIMIT) {
        sampleTruncated = true;
        break;
      }
      selected.push(row);
    }
    // Also yield while inspecting an input with many private or repeated rows.
    if (i % 64 === 63) yield;
  }
  selected.sort((a, b) => compareIds(a.id, b.id));
  const interpretations = {};
  const groups = new Map();
  const morphologyGroups = new Map();
  const families = [...MEANING_BASE_IDS, ...MEANING_MODIFIER_IDS]
    .map((id) => ({ ...MEANING_CATALOG[id], memberIds: [] }));
  const partialIds = [];
  const invalidIds = [];
  for (let i = 0; i < selected.length; i += 1) {
    const { id, model_data: model } = selected[i];
    const interpretation = interpretGlyphMeaning(model);
    interpretations[id] = interpretation;
    if (interpretation.status === 'invalid') invalidIds.push(id);
    else {
      if (interpretation.status === 'partial') partialIds.push(id);
      for (const family of families) {
        if (interpretation.meaningIds.includes(family.id)) family.memberIds.push(id);
      }
      if (interpretation.status === 'complete') {
        const key = interpretation.meaningKey;
        if (!groups.has(key)) groups.set(key, {
          id: key, title: interpretation.title, reading: interpretation.reading,
          meaningIds: [...interpretation.meaningIds], memberIds: [],
        });
        groups.get(key).memberIds.push(id);
      }
      const morphology = interpretation.morphology;
      if (morphology.status === 'complete') {
        const key = morphology.morphologyKey;
        if (!morphologyGroups.has(key)) morphologyGroups.set(key, {
          id: key, ...morphologyText(morphology), memberIds: [],
        });
        morphologyGroups.get(key).memberIds.push(id);
      }
    }
    if (i % 8 === 7) yield;
  }
  return {
    meaningVersion: MEANING_VERSION, morphologyVersion: MORPHOLOGY_VERSION,
    sampleSize: selected.length, analyzedCount: selected.length - invalidIds.length,
    sampleLimit: SAMPLE_LIMIT, sampleTruncated, sampleAtLimit: selected.length === SAMPLE_LIMIT,
    interpretations,
    groups: [...groups.values()].sort((a, b) => compareIds(a.id, b.id)),
    families,
    morphologyGroups: [...morphologyGroups.values()].sort((a, b) => compareIds(a.id, b.id)),
    partialIds, invalidIds,
  };
}

/** Public sample only. Local/private model interpretation is a separate API. */
export function groupArchiveMeanings(rows) {
  const steps = meaningSteps(rows);
  let result = steps.next();
  while (!result.done) result = steps.next();
  return result.value;
}

function checkAborted(signal) {
  if (!signal?.aborted) return;
  const error = new Error(t('groupArchiveMeanings.meaningGroupCalculationCancelled'));
  error.name = 'AbortError';
  throw error;
}

/** No network; yield in bounded chunks so changing a sample can cancel stale work. */
export async function computeArchiveMeanings(rows, { signal } = {}) {
  checkAborted(signal);
  const steps = meaningSteps(rows);
  for (;;) {
    checkAborted(signal);
    const result = steps.next();
    checkAborted(signal);
    if (result.done) return result.value;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
