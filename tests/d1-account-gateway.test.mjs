import test from 'node:test';
import assert from 'node:assert/strict';
import gateway from '../d1-account-gateway.mjs';

const token = 'gateway-test-token-with-at-least-32-characters';

function request(path = '/internal/health', { method = 'GET', authorization = `Bearer ${token}` } = {}) {
  return new Request(`https://gateway.example${path}`, {
    method,
    headers: authorization ? { authorization } : {},
  });
}

test('gateway rejects unknown paths without exposing database operations', async () => {
  const response = await gateway.fetch(request('/query'), { D1_GATEWAY_TOKEN: token });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Not found.' });
});

test('gateway requires a server-side token and does not accept missing authorization', async () => {
  const response = await gateway.fetch(request('/internal/health', { authorization: '' }), {
    D1_GATEWAY_TOKEN: token,
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized.' });
});

test('gateway fails closed when secret is missing or too short', async () => {
  const response = await gateway.fetch(request(), { D1_GATEWAY_TOKEN: 'short' });
  assert.equal(response.status, 401);
});

test('gateway health endpoint authenticates and returns no secret', async () => {
  const response = await gateway.fetch(request(), { D1_GATEWAY_TOKEN: token });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: 'd1-gateway' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('gateway readiness uses only a fixed SELECT and requires a native D1 binding', async () => {
  let sql;
  const response = await gateway.fetch(request('/internal/ready'), {
    D1_GATEWAY_TOKEN: token,
    DB: {
      prepare(query) {
        sql = query;
        return { first: async () => ({ ok: 1 }) };
      },
    },
  });
  assert.equal(response.status, 200);
  assert.equal(sql, 'SELECT 1 AS ok');
  assert.deepEqual(await response.json(), { ok: true, database: 'ready' });
});

test('gateway readiness fails safely when database is unavailable', async () => {
  const response = await gateway.fetch(request('/internal/ready'), { D1_GATEWAY_TOKEN: token });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Database binding unavailable.' });
});

test('gateway rejects non-GET methods', async () => {
  const response = await gateway.fetch(request('/internal/health', { method: 'POST' }), {
    D1_GATEWAY_TOKEN: token,
  });
  assert.equal(response.status, 405);
});
