import { strict as assert } from 'node:assert';
import { verifiedOwner } from '../functions/_shared/archive-server.js';
import { errorResponse, readRequest } from '../functions/_shared/archive-http.js';
import { handlePublish } from '../functions/archive-publish/index.ts';
import { handleUnpublish } from '../functions/archive-unpublish/index.ts';

Deno.test('owner identity is obtained from verified auth, never a decoded/client owner field', async () => {
  let checkedToken = '';
  const client = { auth: { getUser: async (token: string) => { checkedToken = token; return { data: { user: { id: 'verified-owner' } } }; } } };
  const request = new Request('https://archive.test', { method: 'POST', headers: { Authorization: 'Bearer signed-token' }, body: JSON.stringify({ ownerId: 'forged' }) });
  assert.equal(await verifiedOwner(request, client), 'verified-owner');
  assert.equal(checkedToken, 'signed-token');
});

Deno.test('absent or invalid owner token is rejected', async () => {
  const rejected = { auth: { getUser: async () => ({ error: new Error('invalid token') }) } };
  await assert.rejects(() => verifiedOwner(new Request('https://archive.test'), rejected), { status: 401 });
  await assert.rejects(() => verifiedOwner(new Request('https://archive.test', { headers: { Authorization: 'Bearer forged' } }), rejected), { status: 401 });
});

Deno.test('unconsented publish rejects before reading server configuration', async () => {
  const response = await handlePublish(new Request('https://archive.test', { method: 'POST', body: JSON.stringify({ displayName: 'Louise', consented: false }) }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error.message, /동의/);
});

Deno.test('HTTP boundary limits payloads and does not expose internal errors', async () => {
  await assert.rejects(() => readRequest(new Request('https://archive.test', { method: 'POST', body: 'x'.repeat(9000) })), { status: 413 });
  const response = errorResponse(new Error('private internal details'));
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes('private internal'), false);
});

Deno.test('chunked body without Content-Length is cancelled as soon as actual bytes exceed 8192', async () => {
  let pulls = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1;
      if (pulls > 6) controller.close();
      else controller.enqueue(new Uint8Array(3072).fill(120));
    },
    cancel() { cancelled = true; },
  });
  const request = new Request('https://archive.test', { method: 'POST', body });
  assert.equal(request.headers.has('content-length'), false);
  await assert.rejects(() => readRequest(request), { status: 413 });
  assert.equal(cancelled, true);
  assert.ok(pulls <= 4, 'must stop reading instead of draining the oversized stream');
});

Deno.test('byte limit counts multibyte text and valid UTF-8 survives split chunks', async () => {
  const encoded = new TextEncoder().encode(JSON.stringify({ name: '한' }));
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of encoded) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  assert.deepEqual(await readRequest(new Request('https://archive.test', { method: 'POST', body })), { name: '한' });
  await assert.rejects(() => readRequest(new Request('https://archive.test', {
    method: 'POST', body: JSON.stringify({ name: '한'.repeat(3000) }),
  })), { status: 413 });
});

Deno.test('publish and withdrawal verify anonymous ownership and only send server-generated data to RPC', async () => {
  const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const glyphId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const environment = {
    SUPABASE_URL: 'https://archive.test',
    SUPABASE_ANON_KEY: 'public-test-key',
    SUPABASE_SERVICE_ROLE_KEY: 'server-test-key',
  };
  const previous = Object.fromEntries(Object.keys(environment).map((key) => [key, Deno.env.get(key)]));
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  try {
    for (const [key, value] of Object.entries(environment)) Deno.env.set(key, value);
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push(new URL(url).pathname);
      const headers = new Headers(init?.headers);
      if (url.endsWith('/auth/v1/user')) {
        assert.equal(headers.get('Authorization'), 'Bearer anonymous-owner-token');
        return Response.json({ id: ownerId, is_anonymous: true });
      }
      assert.equal(headers.get('apikey'), 'server-test-key');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.p_owner_id, ownerId);
      if (url.endsWith('/rpc/archive_publish_verified')) {
        assert.equal(body.p_consented, true);
        assert.deepEqual(body.p_context_tags, ['test']);
        assert.equal(body.p_display_name, 'Louise');
        assert.equal(body.p_glyph.canonicalName, 'louise');
        assert.match(body.p_glyph.fingerprint, /^[a-f0-9]{64}$/);
        assert.equal(body.p_glyph.encoderVersion, 2);
        assert.notDeepEqual(body.p_glyph.modelData, { forged: true });
        return Response.json({ glyphId, isNew: true, mappingStatus: 'on-demand' });
      }
      assert.ok(url.endsWith('/rpc/archive_unpublish_verified'));
      assert.equal(body.p_glyph_id, glyphId);
      return Response.json({ glyphId, withdrawnCount: 1, isPublic: false });
    };
    const request = (body: object) => new Request('https://archive.test', {
      method: 'POST', headers: { Authorization: 'Bearer anonymous-owner-token' }, body: JSON.stringify(body),
    });
    const published = await handlePublish(request({
      displayName: 'Louise', consented: true, contextTags: [' test ', 'test'],
      ownerId: 'forged-owner', modelData: { forged: true }, fingerprint: 'forged',
    }));
    assert.equal(published.status, 200);
    assert.equal((await published.json()).glyphId, glyphId);
    const withdrawn = await handleUnpublish(request({ glyphId, ownerId: 'forged-owner' }));
    assert.equal(withdrawn.status, 200);
    assert.equal((await withdrawn.json()).isPublic, false);
    assert.deepEqual(calls, [
      '/auth/v1/user', '/rest/v1/rpc/archive_publish_verified',
      '/auth/v1/user', '/rest/v1/rpc/archive_unpublish_verified',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
});
