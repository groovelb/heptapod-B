import { sourceText as t } from '../i18n/messages.js';
import { MEANING_VERSION, MORPHOLOGY_VERSION } from '../data/heptapodMeaningCatalog.js';
import { computeArchiveMeanings } from '../utils/heptapod/groupArchiveMeanings.js';

const PUBLIC_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAMPLE_LIMIT = 200;
const knownProviders = new WeakMap();

function assertActive(signal) {
  if (signal?.aborted) throw Object.assign(new Error(t('archiveMeanings.meaningReadingCancelled')), { name: 'AbortError' });
}

function assertRows(rows) {
  if (!Array.isArray(rows)) throw new Error(t('archiveMeanings.aPublicSampleIsNeededToRead'));
}

async function selectPublicSample(rows, signal) {
  assertRows(rows);
  const distinct = new Map();
  let sampleTruncated = false;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row?.is_public === true && typeof row.id === 'string' && PUBLIC_ID.test(row.id) && !distinct.has(row.id)) {
      if (distinct.size === SAMPLE_LIMIT) { sampleTruncated = true; break; }
      distinct.set(row.id, row);
    }
    if (index % 64 === 63) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      assertActive(signal);
    }
  }
  assertActive(signal);
  const selected = [...distinct.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { selected, sampleTruncated, sampleAtLimit: selected.length === SAMPLE_LIMIT };
}

function incompatibleResponse() {
  return new Error(t('archiveMeanings.theMeaningResponseDoesNotMatchThe'));
}

/** Compare the full versioned DTO with its local, model-derived reference.
 * This rejects foreign IDs, fabricated membership/counts, unsafe anchors and
 * changed readings under an unchanged interpretation version.
 */
function assertSameDto(actual, expected) {
  let visited = 0;
  function visit(value, reference, depth = 0) {
    visited += 1;
    if (visited > 150000 || depth > 32) throw incompatibleResponse();
    if (reference === null || typeof reference !== 'object') {
      if (typeof value === 'number' && !Number.isFinite(value)) throw incompatibleResponse();
      if (value !== reference) throw incompatibleResponse();
      return;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value) !== Array.isArray(reference)) throw incompatibleResponse();
    if (Array.isArray(reference)) {
      if (value.length !== reference.length) throw incompatibleResponse();
      for (let index = 0; index < reference.length; index += 1) visit(value[index], reference[index], depth + 1);
      return;
    }
    const keys = Object.keys(reference);
    if (Object.keys(value).length !== keys.length) throw incompatibleResponse();
    for (const key of keys) {
      if (!Object.hasOwn(value, key)) throw incompatibleResponse();
      visit(value[key], reference[key], depth + 1);
    }
  }
  visit(actual, expected);
}

async function validateResponse(rows, result, signal) {
  assertActive(signal);
  if (result?.meaningVersion !== MEANING_VERSION || result?.morphologyVersion !== MORPHOLOGY_VERSION) {
    throw new Error(t('archiveMeanings.theMeaningRulesVersionDoesNotMatch'));
  }
  const expected = await computeArchiveMeanings(rows, { signal });
  assertActive(signal);
  assertSameDto(result, expected);
  return result;
}

/** Local meaning reads never initialize a client or make a network/auth/write request. */
export const localArchiveMeaningProvider = {
  async getMeanings(rows, { signal } = {}) {
    assertActive(signal);
    assertRows(rows);
    const result = await computeArchiveMeanings(rows, { signal });
    assertActive(signal);
    return result;
  },
};
knownProviders.set(localArchiveMeaningProvider, { mode: 'local', read: localArchiveMeaningProvider.getMeanings });

/** Only explicitly injected invoke may perform an API call; names/models stay local. */
export function createApiMeaningProvider({ invoke }) {
  if (typeof invoke !== 'function') throw new Error(t('archiveMeanings.specifyTheFunctionUsedToCallThe'));
  const provider = {
    async getMeanings(rows, { signal } = {}) {
      assertActive(signal);
      const { selected, sampleTruncated, sampleAtLimit } = await selectPublicSample(rows, signal);
      const result = await invoke({ glyphIds: selected.map((row) => row.id),
        meaningVersion: MEANING_VERSION, morphologyVersion: MORPHOLOGY_VERSION,
        sampleTruncated, sampleAtLimit }, signal);
      assertActive(signal);
      await validateResponse(rows, result, signal);
      // An injected transport must not retain a mutable reference to validated state.
      return structuredClone(result);
    },
  };
  knownProviders.set(provider, { mode: 'api', read: provider.getMeanings });
  return provider;
}

/** Validate every injected provider against exactly the current public sample. */
export async function readArchiveMeanings(rows, { signal, provider = localArchiveMeaningProvider } = {}) {
  assertActive(signal);
  assertRows(rows);
  if (typeof provider?.getMeanings !== 'function') throw new Error(t('archiveMeanings.checkTheMeaningProvider'));
  const known = knownProviders.get(provider);
  const reader = provider.getMeanings;
  const registered = known?.read === reader;
  let result = await reader.call(provider, rows, { signal });
  assertActive(signal);
  // Registered local reads are the domain calculation itself; registered API
  // reads already compare once. Overridden/custom providers cross this boundary.
  if (!registered) {
    await validateResponse(rows, result, signal);
    result = structuredClone(result);
  }
  assertActive(signal);
  return { ...result, computationMode: registered ? known.mode : 'api' };
}
