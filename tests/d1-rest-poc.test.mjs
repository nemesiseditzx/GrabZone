import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1RestPoc, createD1RestPocFromEnv } from '../d1-rest-poc.mjs';

const config = {
  accountId: '0123456789abcdef0123456789abcdef',
  databaseId: '01234567-89ab-cdef-0123-456789abcdef',
  apiToken: 'test-token-never-use-in-production',
};

test('D1 REST PoC sends parameterized SQL to the fixed Cloudflare endpoint', async () => {
  let request;
  const client = createD1RestPoc({
    ...config,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({
        success: true,
        errors: [],
        result: [{ results: [{ value: 7 }], success: true, meta: { changes: 0 } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });

  const result = await client.query('SELECT ? AS value', [7]);
  assert.deepEqual(result[0].results, [{ value: 7 }]);
  assert.equal(
    request.url,
    'https://api.cloudflare.com/client/v4/accounts/0123456789abcdef0123456789abcdef/d1/database/01234567-89ab-cdef-0123-456789abcdef/query',
  );
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer ' + config.apiToken);
  assert.deepEqual(JSON.parse(request.options.body), { sql: 'SELECT ? AS value', params: [7] });
});

test('D1 REST PoC rejects missing or malformed server-side configuration', () => {
  assert.throws(() => createD1RestPoc({ ...config, accountId: 'not-an-account' }), /account ID/);
  assert.throws(() => createD1RestPoc({ ...config, databaseId: 'not-a-database' }), /database ID/);
  assert.throws(() => createD1RestPoc({ ...config, apiToken: '' }), /API token/);
  assert.throws(() => createD1RestPoc({ ...config, timeoutMs: 90000 }), /timeout/);
});

test('D1 REST PoC rejects invalid query input before making a request', async () => {
  let calls = 0;
  const client = createD1RestPoc({
    ...config,
    fetchImpl: async () => {
      calls += 1;
      return new Response('{}');
    },
  });
  await assert.rejects(client.query('  '), /non-empty string/);
  await assert.rejects(client.query('SELECT ?', 'not-an-array'), /parameters must be an array/);
  assert.equal(calls, 0);
});

test('D1 REST PoC sanitizes provider failures and does not leak provider messages', async () => {
  const client = createD1RestPoc({
    ...config,
    fetchImpl: async () => new Response(JSON.stringify({
      success: false,
      errors: [{ code: 1234, message: 'sensitive provider detail' }],
      result: [],
    }), { status: 400 }),
  });
  await assert.rejects(client.query('SELECT 1'), error => {
    assert.equal(error.message, 'D1 REST query failed.');
    assert.equal(error.status, 400);
    assert.deepEqual(error.providerErrors, [{ code: 1234 }]);
    assert.equal(error.message.includes('sensitive provider detail'), false);
    return true;
  });
});

test('D1 REST PoC does not retry a query after a failed response', async () => {
  let calls = 0;
  const client = createD1RestPoc({
    ...config,
    fetchImpl: async () => {
      calls += 1;
      throw new Error('connection reset');
    },
  });
  await assert.rejects(client.query('INSERT INTO probe(value) VALUES (?)', ['x']), /connection reset/);
  assert.equal(calls, 1);
});

test('D1 REST PoC sources IDs and token only from server-side Worker env keys', () => {
  assert.throws(
    () => createD1RestPocFromEnv({ CUSTOMER_D1_ACCOUNT_ID: config.accountId }),
    /database ID/,
  );
  const client = createD1RestPocFromEnv({
    CUSTOMER_D1_ACCOUNT_ID: config.accountId,
    CUSTOMER_D1_DATABASE_ID: config.databaseId,
    CUSTOMER_D1_API_TOKEN: config.apiToken,
  });
  assert.equal(typeof client.query, 'function');
});
