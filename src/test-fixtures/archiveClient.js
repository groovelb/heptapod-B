/** Story/test-only archive transport. Never imports Supabase, fetches, or redirects. */
import { buildArchiveModel, ARCHIVE_ENCODER_VERSION } from '../utils/heptapod/archiveGlyph.js';
import { extractGlyphFeatures } from '../utils/heptapod/extractGlyphFeatures.js';
import { relateGlyphs, RELATION_ALGORITHM_VERSION } from '../utils/heptapod/relateGlyphs.js';

const CREATED_AT = '2026-09-05T00:00:00.000Z';
const uuid = (index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
export const ARCHIVE_STORY_USER = { id: uuid(100), is_anonymous: true };

function makeGlyph(name, index, isPublic = true) {
  const model = buildArchiveModel(name);
  const features = extractGlyphFeatures(model);
  return {
    id: uuid(index), canonical_name: model.meta.canonicalName,
    is_interrogative: Boolean(model.questionHook), encoder_version: ARCHIVE_ENCODER_VERSION,
    model_data: model, feature_vector: features, is_public: isPublic,
    contour_primary: features.contourLineage.primary,
    contour_quadrant: features.contourLineage.quadrant,
    contour_label: features.contourLineage.label, created_at: CREATED_AT,
  };
}

export const ARCHIVE_STORY_GLYPHS = [
  makeGlyph('Louise', 1), makeGlyph('Hannah', 2), makeGlyph('Louise?', 3),
  makeGlyph('Abbott', 4), makeGlyph('민준', 5), makeGlyph('민수', 6),
  makeGlyph('明月', 7), makeGlyph('Louise Banks', 8, false), makeGlyph('Louis', 9),
];
export const ARCHIVE_STORY_IDS = {
  left: uuid(1), right: uuid(2), variant: uuid(3), unrelated: uuid(4), hidden: uuid(8), spellingOnly: uuid(9),
};

/**
 * Inject into a page's client prop. Every instance owns its own rows/session.
 * pending=['glyphs'] keeps that query loading until unmount; failures maps an
 * endpoint/table/auth action to a message. Both cases preserve existing rows.
 */
export function createArchiveStoryClient({
  glyphs = ARCHIVE_STORY_GLYPHS,
  contributions,
  user = ARCHIVE_STORY_USER,
  pending = [],
  failures = {},
} = {}) {
  let records = glyphs.map((glyph) => ({ ...glyph }));
  let currentUser = user ? { ...user } : null;
  let responses = contributions === undefined
    ? records.slice(0, 2).map((glyph, index) => ({
      id: uuid(200 + index), glyph_id: glyph.id, user_id: ARCHIVE_STORY_USER.id,
      display_name: index === 0 ? 'Louise' : 'Hannah', context_tags: [],
      created_at: CREATED_AT, withdrawn_at: null,
    })) : contributions.map((response) => ({ ...response }));
  const subscribers = new Set();
  const calls = [];
  const session = () => currentUser ? { user: { ...currentUser } } : null;
  const notify = (event) => subscribers.forEach((callback) => callback(event, session()));

  async function respond(key, operation, signal) {
    calls.push(key);
    if (failures[key]) return { data: null, error: new Error(failures[key]) };
    if (pending.includes('*') || pending.includes(key)) {
      return new Promise((resolve) => {
        const abort = () => resolve({ data: null, error: new Error('Story request cancelled') });
        if (signal?.aborted) abort();
        else signal?.addEventListener('abort', abort, { once: true });
      });
    }
    if (signal?.aborted) return { data: null, error: new Error('Story request cancelled') };
    try { return { data: operation(), error: null }; }
    catch (error) { return { data: null, error }; }
  }

  function relationsFor(id) {
    const center = records.find((glyph) => glyph.id === id && glyph.is_public);
    if (!center) throw new Error('공개된 표식을 찾을 수 없습니다.');
    const candidates = records.filter((glyph) => glyph.id !== id && glyph.is_public);
    const relations = candidates.flatMap((neighbor) => relateGlyphs(center, neighbor).map((match) => ({
      id: `${id}:${neighbor.id}:${match.relationType}`,
      glyph_a_id: match.sourceId, glyph_b_id: match.targetId,
      relation_type: match.relationType, score: match.score,
      score_components: match.components, reasons: match.reasons, evidence: match.evidence,
      algorithm_version: match.algorithmVersion, is_directed: match.directed,
      computed_at: CREATED_AT, evidence_source: 'current-sample', neighborGlyph: neighbor,
      direction: match.sourceId === neighbor.id ? 'reverse' : 'forward',
    })));
    return { relations, mappingStatus: 'current-sample', sampleSize: candidates.length, sampleLimit: 500,
      algorithmVersion: RELATION_ALGORITHM_VERSION, skippedModels: 0, computedAt: CREATED_AT };
  }

  return {
    calls,
    auth: {
      getSession: () => respond('auth', () => ({ session: session() })),
      onAuthStateChange: (callback) => {
        subscribers.add(callback);
        return { data: { subscription: { unsubscribe: () => subscribers.delete(callback) } } };
      },
      signInAnonymously: () => respond('auth', () => {
        currentUser = { ...ARCHIVE_STORY_USER };
        notify('SIGNED_IN');
        return { user: { ...currentUser }, session: session() };
      }),
      linkIdentity: () => respond('auth', () => {
        currentUser = { ...(currentUser || ARCHIVE_STORY_USER), is_anonymous: false };
        notify('USER_UPDATED');
        return { user: { ...currentUser } };
      }),
      signInWithOAuth: () => respond('auth', () => {
        currentUser = { ...ARCHIVE_STORY_USER, is_anonymous: false };
        notify('SIGNED_IN');
        return { user: { ...currentUser } };
      }),
      signOut: () => respond('auth', () => { currentUser = null; notify('SIGNED_OUT'); return {}; }),
    },
    from(table) {
      const filters = [];
      const orders = [];
      let limit = Infinity;
      let single = false;
      let signal;
      const query = {
        select: () => query,
        eq: (key, value) => { filters.push((row) => row[key] === value); return query; },
        is: (key, value) => { filters.push((row) => row[key] === value); return query; },
        order: (key, { ascending = true } = {}) => { orders.push({ key, ascending }); return query; },
        limit: (value) => { limit = value; return query; },
        maybeSingle: () => { single = true; return query; },
        abortSignal: (value) => { signal = value; return query; },
        then(resolve, reject) {
          return respond(table, () => {
            if (!['glyphs', 'glyph_contributions'].includes(table)) throw new Error(`Unsupported story table: ${table}`);
            const rows = (table === 'glyphs' ? records : responses).filter((row) => filters.every((filter) => filter(row)));
            rows.sort((left, right) => {
              for (const { key, ascending } of orders) {
                if (left[key] !== right[key]) return (left[key] > right[key] ? 1 : -1) * (ascending ? 1 : -1);
              }
              return 0;
            });
            const result = rows.slice(0, limit).map((row) => table === 'glyph_contributions'
              ? { ...row, glyph: records.find((glyph) => glyph.id === row.glyph_id) || null } : { ...row });
            return single ? result[0] || null : result;
          }, signal).then(resolve, reject);
        },
      };
      return query;
    },
    functions: {
      invoke: (name, { body, signal } = {}) => respond(name, () => {
        if (name === 'archive-relations') return relationsFor(body.glyphId);
        if (name === 'archive-publish') {
          if (!body.consented || !currentUser) throw new Error('이름 공개 동의와 세션이 필요합니다.');
          const candidate = makeGlyph(body.displayName, records.length + 20);
          let glyph = records.find((record) => record.canonical_name === candidate.canonical_name
            && record.is_interrogative === candidate.is_interrogative && record.encoder_version === candidate.encoder_version);
          const isNew = !glyph;
          if (!glyph) { glyph = candidate; records.push(glyph); }
          glyph.is_public = true;
          const existing = responses.find((response) => response.glyph_id === glyph.id && response.user_id === currentUser.id);
          const response = { id: existing?.id || uuid(300 + responses.length), glyph_id: glyph.id, user_id: currentUser.id,
            display_name: body.displayName, context_tags: body.contextTags || [], created_at: CREATED_AT, withdrawn_at: null };
          responses = existing ? responses.map((item) => item.id === existing.id ? response : item) : [...responses, response];
          return { glyphId: glyph.id, isNew, mappingStatus: 'on-demand' };
        }
        if (name === 'archive-unpublish') {
          if (!currentUser) throw new Error('공개할 때 사용한 세션이 필요합니다.');
          const owned = responses.filter((response) => response.glyph_id === body.glyphId && response.user_id === currentUser.id && !response.withdrawn_at);
          if (!owned.length) throw new Error('철회할 내 응답을 찾을 수 없습니다.');
          responses = responses.map((response) => owned.includes(response) ? { ...response, withdrawn_at: CREATED_AT } : response);
          const publicRemains = responses.some((response) => response.glyph_id === body.glyphId && !response.withdrawn_at);
          records = records.map((glyph) => glyph.id === body.glyphId ? { ...glyph, is_public: publicRemains } : glyph);
          return { glyphId: body.glyphId, withdrawn: owned.length, isPublic: publicRemains };
        }
        throw new Error(`Unsupported story function: ${name}`);
      }, signal),
    },
  };
}
