import { sourceText as t } from '../i18n/messages.js';
/** Archive transport. No authentication or name transmission happens on import. */
import { rememberArchiveSnapshot, getArchiveSnapshot, reconcileArchiveSnapshot, invalidateArchiveSnapshot } from './archiveSnapshot.js';
import { assertArchiveRequestActive, createApiRelationProvider, createLocalRelationProvider, resolveArchiveRelationsMode } from './archiveRelations.js';

export async function resolveArchiveClient(client) {
  const resolved = client === undefined
    ? await (await import('./supabase.js')).getSupabase()
    : await client;
  if (!resolved) throw new Error(t('archiveClient.theArchiveConnectionIsNotConfigured'));
  return resolved;
}

export async function invokeArchive(client, name, body, signal) {
  const { data, error } = await client.functions.invoke(name, { body, signal });
  if (error) {
    let message = error.message || t('archiveClient.theArchiveRequestFailed');
    if (error.context?.json) {
      try {
        const detail = await error.context.json();
        message = detail.error?.message || detail.message || message;
      } catch { /* Keep the original error for a non-JSON response. */ }
    }
    throw new Error(message);
  }
  if (!data || data.error) throw new Error(data?.error?.message || t('archiveClient.theArchiveResponseCouldNotBeVerified'));
  return data;
}

/** Called only by an explicit, consented publish operation. */
export async function publishArchiveGlyph(client, { displayName, contextTags = [], consented = false }) {
  if (consented !== true) throw new Error(t('archiveClient.agreeToMakeYourNameAndGlyph'));
  if (typeof displayName !== 'string' || !displayName.trim()) throw new Error(t('archiveClient.enterTheNameYouWantToPublish'));
  const sb = await resolveArchiveClient(client);
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  if (!data?.session?.user) {
    const signedIn = await sb.auth.signInAnonymously();
    if (signedIn.error) throw signedIn.error;
    if (!signedIn.data?.user) throw new Error(t('archiveClient.theOwnerOfThePublishedResponseCould'));
  }
  // Models, fingerprints and owner IDs are deliberately excluded from the payload.
  const result = await invokeArchive(sb, 'archive-publish', { displayName, contextTags, consented: true });
  if (!result.glyphId) throw new Error(t('archiveClient.thePublicationResponseDidNotIncludeA'));
  invalidateArchiveSnapshot(sb);
  return result;
}

export async function unpublishArchiveGlyph(client, glyphId) {
  const sb = await resolveArchiveClient(client);
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  if (!data?.session?.user) throw new Error(t('archiveClient.useTheSessionYouPublishedFrom'));
  const result = await invokeArchive(sb, 'archive-unpublish', { glyphId });
  invalidateArchiveSnapshot(sb);
  return result;
}

export async function readPublicGlyph(client, value, { field = 'id', signal } = {}) {
  const sb = await resolveArchiveClient(client);
  let query = sb.from('glyphs').select('*').eq('is_public', true).eq(field, value).maybeSingle();
  if (signal && query.abortSignal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  assertArchiveRequestActive(signal);
  if (field === 'id') reconcileArchiveSnapshot(sb, value, data);
  return data;
}

export async function readArchiveGlyphs(client, { limit = 200, signal } = {}) {
  const sb = await resolveArchiveClient(client);
  const boundedLimit = Math.min(200, Math.max(1, Number(limit) || 200));
  let query = sb.from('glyphs').select('*').eq('is_public', true)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(boundedLimit);
  if (signal && query.abortSignal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  assertArchiveRequestActive(signal);
  rememberArchiveSnapshot(sb, data || [], { limit: boundedLimit });
  return data || [];
}

/** Same facade/DTO for local computation, today's Edge API or a future provider. */
export async function readGlyphRelations(client, glyphId, { signal, mode, provider } = {}) {
  assertArchiveRequestActive(signal);
  let selectedProvider = provider;
  if (!selectedProvider) {
    const selectedMode = resolveArchiveRelationsMode({ mode, hasInjectedClient: client !== undefined });
    const sb = await resolveArchiveClient(client);
    selectedProvider = selectedMode === 'local'
      ? createLocalRelationProvider({
        readCenter: (id, readSignal) => readPublicGlyph(sb, id, { signal: readSignal }),
        loadSnapshot: async (readSignal) => {
          const cached = getArchiveSnapshot(sb);
          if (cached) return cached;
          await readArchiveGlyphs(sb, { limit: 200, signal: readSignal });
          return getArchiveSnapshot(sb);
        },
      })
      : createApiRelationProvider({ invoke: (id, readSignal) => invokeArchive(sb, 'archive-relations', { glyphId: id }, readSignal) });
  }
  const result = await selectedProvider.getRelations(glyphId, { signal });
  assertArchiveRequestActive(signal);
  if (!result) throw new Error(t('archiveClient.theRelationCalculationResponseCouldNotBe'));
  if (!Array.isArray(result.relations) || !result.mappingStatus) {
    throw new Error(t('archiveClient.theRelationCalculationResponseCouldNotBe'));
  }
  return result;
}
