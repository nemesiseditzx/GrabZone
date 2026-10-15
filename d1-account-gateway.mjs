/**
 * Minimal authenticated gateway for a D1 database in its owning Cloudflare account.
 *
 * Deploy this same entrypoint once per D1-owning account with that account's
 * native D1 binding named DB and a unique D1_GATEWAY_TOKEN Worker secret.
 *
 * This intentionally exposes readiness only. It does NOT accept arbitrary SQL
 * or implement application data operations. Add reviewed, fixed domain-specific
 * handlers only after the table/query ownership and service contracts are approved.
 */
const encoder = new TextEncoder();

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function authorized(request, expectedToken) {
  if (typeof expectedToken !== 'string' || expectedToken.length < 32) return false;
  const authorization = request.headers.get('authorization') || '';
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match) return false;
  return equalBytes(await digest(match[1]), await digest(expectedToken));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/internal/health' && url.pathname !== '/internal/ready') {
      return json({ error: 'Not found.' }, 404);
    }
    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed.' }, 405);
    }
    if (!(await authorized(request, env?.D1_GATEWAY_TOKEN))) {
      return json({ error: 'Unauthorized.' }, 401);
    }
    if (url.pathname === '/internal/health') {
      return json({ ok: true, service: 'd1-gateway' });
    }
    if (!env?.DB || typeof env.DB.prepare !== 'function') {
      return json({ error: 'Database binding unavailable.' }, 503);
    }
    try {
      const result = await env.DB.prepare('SELECT 1 AS ok').first();
      if (result?.ok !== 1) return json({ error: 'Database readiness check failed.' }, 503);
      return json({ ok: true, database: 'ready' });
    } catch {
      return json({ error: 'Database readiness check failed.' }, 503);
    }
  },
};
