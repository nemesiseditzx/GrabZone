/**
 * Cross-account D1 REST proof of concept.
 *
 * NOT wired into production request paths. This module deliberately does not
 * emulate the native D1 binding API; it is a narrow server-side query primitive
 * for disposable-database benchmarking and contract tests only.
 *
 * Configure actual IDs/tokens as Worker secrets/vars in an isolated dev Worker.
 * Never pass IDs, SQL, or credentials from an untrusted browser request.
 */
const ACCOUNT_ID_RE = /^[a-f0-9]{32}$/i;
const DATABASE_ID_RE = /^[a-f0-9-]{36}$/i;
const DEFAULT_TIMEOUT_MS = 8000;

export function createD1RestPoc({
  accountId,
  databaseId,
  apiToken,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!ACCOUNT_ID_RE.test(String(accountId || ''))) {
    throw new TypeError('Invalid D1 account ID configuration.');
  }
  if (!DATABASE_ID_RE.test(String(databaseId || ''))) {
    throw new TypeError('Invalid D1 database ID configuration.');
  }
  if (!String(apiToken || '').trim()) {
    throw new TypeError('Missing D1 API token configuration.');
  }
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('Fetch implementation is unavailable.');
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) {
    throw new TypeError('Invalid D1 REST timeout configuration.');
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  return Object.freeze({
    /**
     * Executes one parameterized query. This helper intentionally performs no
     * automatic retries: a write may have succeeded even if the response was
     * lost, so callers must establish idempotency before retrying.
     */
    async query(sql, params = []) {
      if (typeof sql !== 'string' || !sql.trim()) {
        throw new TypeError('SQL query must be a non-empty string.');
      }
      if (!Array.isArray(params)) {
        throw new TypeError('SQL parameters must be an array.');
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ sql, params }),
          signal: controller.signal,
        });

        let payload;
        try {
          payload = await response.json();
        } catch {
          throw new Error('D1 REST returned an unreadable response.');
        }

        if (!response.ok || payload?.success === false) {
          // Do not expose raw provider bodies, SQL, tokens, or account details.
          const error = new Error('D1 REST query failed.');
          error.status = response.status;
          error.providerErrors = Array.isArray(payload?.errors)
            ? payload.errors.map(item => ({
                code: Number.isFinite(item?.code) ? item.code : undefined,
              }))
            : [];
          throw error;
        }

        if (!Array.isArray(payload?.result)) {
          throw new Error('D1 REST returned an unexpected response shape.');
        }
        return payload.result;
      } catch (error) {
        if (error?.name === 'AbortError') {
          const timeout = new Error('D1 REST request timed out.');
          timeout.code = 'D1_REST_TIMEOUT';
          throw timeout;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
  });
}

/** Build a client only from server-side Worker bindings, never request input. */
export function createD1RestPocFromEnv(env, prefix = 'CUSTOMER_D1') {
  return createD1RestPoc({
    accountId: env?.[`${prefix}_ACCOUNT_ID`],
    databaseId: env?.[`${prefix}_DATABASE_ID`],
    apiToken: env?.[`${prefix}_API_TOKEN`],
  });
}
