import { strict as assert } from 'node:assert';
import { verifiedOwner } from '../functions/_shared/archive-server.js';
import { errorResponse, readRequest } from '../functions/_shared/archive-http.js';
import { handlePublish } from '../functions/archive-publish/index.ts';

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
