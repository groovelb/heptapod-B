/** Explicit live smoke test. Creates two anonymous users and one random glyph,
 * then removes only those fixtures. Never run as part of the default test suite.
 * Supply SUPABASE_SERVICE_ROLE_KEY in the process environment (never VITE_).
 * node scripts/test-archive-remote.mjs --write-test --project-ref <expected-ref>
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { prepareArchiveGlyph } from '../src/utils/heptapod/archiveGlyph.js';
import { publishArchiveGlyph, unpublishArchiveGlyph, readPublicGlyph, readGlyphRelations } from '../src/lib/archiveClient.js';

const args = process.argv.slice(2);
const expectedRef = args[args.indexOf('--project-ref') + 1];
assert.ok(args.includes('--write-test') && args.includes('--project-ref') && expectedRef, 'Explicit --write-test and --project-ref are required');
const env = loadEnv('production', process.cwd(), 'VITE_');
const url = env.VITE_SUPABASE_URL;
assert.equal(new URL(url).hostname, `${expectedRef}.supabase.co`, 'Unexpected target project');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(serviceKey, 'A server-side key is required to clean up test fixtures');
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const makeClient = () => createClient(url, env.VITE_SUPABASE_ANON_KEY, options);
const admin = createClient(url, serviceKey, options);
const owner = makeClient();
const other = makeClient();
const visitor = makeClient();
const displayName = `Archive QA ${randomUUID().replaceAll('-', '')}`;
const prepared = await prepareArchiveGlyph(displayName);
const checked = (result) => { if (result.error) throw new Error(result.error.message); return result.data; };
const preexisting = checked(await admin.from('glyphs').select('id').eq('fingerprint', prepared.fingerprint));
assert.equal(preexisting.length, 0, 'Refuse to touch a preexisting glyph');
let checks = 0;
const passed = (name) => { checks += 1; console.log(`PASS ${name}`); };

try {
  await assert.rejects(publishArchiveGlyph(owner, { displayName, consented: false }));
  assert.equal((await owner.auth.getSession()).data.session, null);
  passed('no owner session created without consent');

  const first = await publishArchiveGlyph(owner, { displayName, consented: true });
  assert.equal(first.isNew, true);
  assert.equal((await owner.auth.getSession()).data.session.user.is_anonymous, true);
  passed('consented registration creates an anonymous owner and a public glyph');

  const retries = await Promise.all([1, 2].map(() => publishArchiveGlyph(owner, { displayName, consented: true })));
  assert.ok(retries.every((item) => item.glyphId === first.glyphId));
  assert.equal((await readPublicGlyph(visitor, first.glyphId)).contribution_count, 1);
  assert.equal((await visitor.auth.getSession()).data.session, null);
  passed('concurrent retries are idempotent; a fresh unauthenticated client can read the shared ID');

  for (const client of [visitor, owner]) {
    assert.ok((await client.from('glyphs').update({ is_public: true }).eq('id', first.glyphId)).error);
    assert.ok((await client.rpc('archive_unpublish_verified', { p_owner_id: randomUUID(), p_glyph_id: first.glyphId })).error);
  }
  assert.ok((await visitor.from('glyph_contributions').select('id').eq('glyph_id', first.glyphId)).error);
  passed('direct public writes and RPC bypass are denied; owner data is not public');

  checked(await other.auth.signInAnonymously());
  await assert.rejects(unpublishArchiveGlyph(other, first.glyphId));
  assert.deepEqual(checked(await other.from('glyph_contributions').select('id').eq('glyph_id', first.glyphId)), []);
  passed('another anonymous owner cannot read contributions or withdraw the glyph');

  const relations = await readGlyphRelations(visitor, first.glyphId, { mode: 'api', signal: AbortSignal.timeout(60000) });
  assert.ok(Array.isArray(relations.relations));
  assert.ok(relations.mappingStatus);
  passed('deployed relation API returns the production contract without a user session');

  const second = await publishArchiveGlyph(other, { displayName, consented: true });
  assert.equal(second.glyphId, first.glyphId);
  assert.equal((await unpublishArchiveGlyph(owner, first.glyphId)).isPublic, true);
  assert.equal((await readPublicGlyph(visitor, first.glyphId)).contribution_count, 1);
  assert.equal((await unpublishArchiveGlyph(other, first.glyphId)).isPublic, false);
  assert.equal(await readPublicGlyph(visitor, first.glyphId), null);
  passed('same name shares its page; one withdrawal preserves it and the last withdrawal hides it');

  assert.equal((await publishArchiveGlyph(owner, { displayName, consented: true })).glyphId, first.glyphId);
  passed('republication restores the same public URL');
} finally {
  const failures = [];
  // The random fingerprint was checked absent before starting. Both filters must match.
  const removed = await admin.from('glyphs').delete().eq('fingerprint', prepared.fingerprint).eq('canonical_name', prepared.canonicalName);
  if (removed.error) failures.push(`test glyph cleanup: ${removed.error.message}`);
  for (const client of [owner, other]) {
    const session = (await client.auth.getSession()).data.session;
    if (!session) continue;
    const result = await admin.auth.admin.deleteUser(session.user.id);
    if (result.error) failures.push(`test user cleanup: ${result.error.message}`);
  }
  const remains = checked(await admin.from('glyphs').select('id').eq('fingerprint', prepared.fingerprint));
  if (remains.length) failures.push('test glyph remains after cleanup');
  assert.deepEqual(failures, [], 'Clean up only the test fixtures before finishing');
  console.log('Cleanup: test glyph and anonymous test users removed.');
}
console.log(`Remote archive: ${checks} checks passed on ${expectedRef}. Frontend hosting/deep-link HTML requires separate verification.`);
