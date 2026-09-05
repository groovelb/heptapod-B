/** Local, ephemeral PostgreSQL validation. No Supabase connection or credentials. */
import { PGlite } from 'npm:@electric-sql/pglite@0.3.14';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const db = new PGlite();
let checks = 0;
async function test(name, run) { await run(); checks += 1; console.log(`✓ ${name}`); }
async function scalar(sql, params = []) { return (await db.query(sql, params)).rows[0]; }
const ownerA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ownerB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const outsider = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const legacyId = '11111111-1111-4111-8111-111111111111';
const fixture = { canonicalName: 'LOUISE', isInterrogative: false, fingerprint: 'a'.repeat(64),
  encoderVersion: 2, modelData: { fixture: 'verified-server-output' }, featureVector: {}, contour: {} };

await db.exec(`
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
  INSERT INTO auth.users VALUES ('${ownerA}'), ('${ownerB}'), ('${outsider}');
`);
for (const name of ['20260903180352_archive_schema.sql', '20260903181828_anonymous_publish.sql', '20260904120000_open_anon_select.sql', '20260904130000_cleanup_bad_data.sql']) {
  await db.exec(await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
}
await db.query('INSERT INTO public.glyphs (id, canonical_name, fingerprint, model_data) VALUES ($1,$2,$3,$4)', [legacyId, 'LEGACY', 'legacy-fingerprint', { legacy: true }]);
await db.query(`INSERT INTO public.glyph_contributions (glyph_id, user_id, display_name)
  VALUES ($1,$2,'First'), ($1,$2,'Duplicate owner'), ($1,NULL,'Ownerless')`, [legacyId, ownerA]);
const beforeLegacy = await scalar('SELECT * FROM public.glyphs WHERE id=$1', [legacyId]);
await db.exec(await readFile(new URL('../migrations/20260905120000_verified_archive_publication.sql', import.meta.url), 'utf8'));

async function publish(owner, value = fixture) {
  return (await scalar('SELECT public.archive_publish_verified($1,$2,$3,$4,true) AS result', [owner, value, value.canonicalName, []])).result;
}
async function withdraw(owner, id) {
  return (await scalar('SELECT public.archive_unpublish_verified($1,$2) AS result', [owner, id])).result;
}

try {
  await test('migration preserves legacy glyphs, ownerless contributions and duplicate owners', async () => {
    assert.deepEqual(await scalar('SELECT * FROM public.glyphs WHERE id=$1', [legacyId]), beforeLegacy);
    assert.equal((await scalar('SELECT count(*)::int AS n FROM glyph_contributions WHERE glyph_id=$1', [legacyId])).n, 3);
  });
  await test('anonymous/authenticated roles cannot mutate glyphs or call verified RPCs', async () => {
    for (const role of ['anon', 'authenticated']) {
      const row = await scalar(`SELECT has_table_privilege($1,'public.glyphs','INSERT') AS ins,
        has_table_privilege($1,'public.glyphs','UPDATE') AS upd,
        has_table_privilege($1,'public.glyph_contributions','INSERT') AS contrib,
        has_function_privilege($1,'public.archive_publish_verified(uuid,jsonb,text,text[],boolean)','EXECUTE') AS rpc`, [role]);
      assert.deepEqual(row, { ins: false, upd: false, contrib: false, rpc: false });
    }
  });
  await test('missing consent and owner fail atomically', async () => {
    await assert.rejects(() => db.query('SELECT public.archive_publish_verified($1,$2,$3,$4,false)', [ownerA, fixture, 'Louise', []]));
    await assert.rejects(() => publish(null));
    assert.equal((await scalar('SELECT count(*)::int AS n FROM glyphs')).n, 1);
  });
  let published;
  await test('publication is atomic and owner retries are idempotent', async () => {
    published = await publish(ownerA);
    const retry = await publish(ownerA);
    assert.equal(retry.glyphId, published.glyphId);
    assert.equal(retry.isNew, false);
    assert.equal(retry.mappingStatus, 'on-demand');
    assert.equal((await scalar('SELECT contribution_count FROM glyphs WHERE id=$1', [published.glyphId])).contribution_count, 1);
  });
  await test('second owner shares immutable model; withdrawing one leaves the other public', async () => {
    const second = await publish(ownerB, { ...fixture, modelData: { tampered: true } });
    assert.equal(second.glyphId, published.glyphId);
    assert.deepEqual((await scalar('SELECT model_data FROM glyphs WHERE id=$1', [published.glyphId])).model_data, fixture.modelData);
    await withdraw(ownerA, published.glyphId);
    assert.deepEqual(await scalar('SELECT is_public, contribution_count FROM glyphs WHERE id=$1', [published.glyphId]), { is_public: true, contribution_count: 1 });
  });
  await test('an unrelated owner cannot withdraw another response', async () => {
    await assert.rejects(() => withdraw(outsider, published.glyphId));
  });
  await test('last active owner withdrawal hides the glyph; re-publication restores same glyph', async () => {
    await withdraw(ownerB, published.glyphId);
    assert.deepEqual(await scalar('SELECT is_public, contribution_count FROM glyphs WHERE id=$1', [published.glyphId]), { is_public: false, contribution_count: 0 });
    assert.equal((await publish(ownerA)).glyphId, published.glyphId);
    assert.deepEqual(await scalar('SELECT is_public, contribution_count FROM glyphs WHERE id=$1', [published.glyphId]), { is_public: true, contribution_count: 1 });
  });
  await test('AFTER DELETE with one remaining contribution does not hide its glyph', async () => {
    await publish(ownerB);
    await db.query('DELETE FROM glyph_contributions WHERE glyph_id=$1 AND user_id=$2', [published.glyphId, ownerB]);
    assert.deepEqual(await scalar('SELECT is_public, contribution_count FROM glyphs WHERE id=$1', [published.glyphId]), { is_public: true, contribution_count: 1 });
  });
  await test('owner RLS hides contribution identities from other users', async () => {
    await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${ownerB}',false)`);
    try {
      assert.equal((await scalar('SELECT count(*)::int AS n FROM glyph_contributions WHERE user_id=$1', [ownerA])).n, 0);
    } finally { await db.exec('RESET ROLE'); }
  });
  await test('moderation-hidden response cannot be made public by an owner retry', async () => {
    await db.query('UPDATE glyphs SET is_public=false WHERE id=$1', [published.glyphId]);
    await assert.rejects(() => publish(ownerA));
    assert.equal((await scalar('SELECT is_public FROM glyphs WHERE id=$1', [published.glyphId])).is_public, false);
  });
  await test('owner publication limit rejects the 21st distinct response in an hour', async () => {
    for (let i = 0; i < 20; i += 1) await publish(outsider, { ...fixture, fingerprint: i.toString(16).padStart(64, '0'), canonicalName: `TEST${i}` });
    await assert.rejects(() => publish(outsider, { ...fixture, fingerprint: 'f'.repeat(64), canonicalName: 'EXCESS' }), /limit/);
  });
  console.log(`Archive SQL: ${checks} checks passed on ephemeral PostgreSQL.`);
} finally { await db.close(); }
