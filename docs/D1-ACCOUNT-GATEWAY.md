# D1 Account Gateway — Implementation Notes

**Branch:** `vendor-system-dev`  
**Status:** secure readiness scaffold only; not an application data API and not deployed.

## Confirmed target

- Keep the three main application Workers in the designated shared Worker account.
- Each of the three D1-owning accounts also has its own small gateway Worker, with a native D1 binding to the D1 in that same account.
- Keep `grabzone.tech` and the current `grabzone-assets` R2 bucket.
- Each gateway gets a unique `D1_GATEWAY_TOKEN` secret. The matching token is stored only as a secret in the calling application Worker(s). Never put tokens in Git, browser code, logs, or chat.
- Use distinct gateway URLs and tokens for Customer, Marketplace, and Admin. Do not reuse one token across all gateways.

## What this scaffold implements

`d1-account-gateway.mjs` intentionally supports only:
- `GET /internal/health`: authenticated liveness response.
- `GET /internal/ready`: authenticated readiness check using a fixed `SELECT 1 AS ok` against the native `DB` binding.

It rejects unknown paths, non-GET methods, missing/short tokens and database failures with sanitized responses. It does not enable CORS, accept client-selected account/database IDs, accept SQL, or expose a generic query endpoint.

## Deploying each gateway (manual setup, no secrets in source)

Repeat separately in each D1-owning Cloudflare account:
1. Create a Worker from `d1-account-gateway.mjs` (or deploy the same source from a private, controlled CI workflow).
2. Bind that account's intended D1 database as `DB`.
3. Add a randomly generated secret of at least 32 characters named `D1_GATEWAY_TOKEN`.
4. Keep the gateway private to server-to-server callers where supported; otherwise require the bearer token and add Cloudflare access/network controls appropriate to the deployment.
5. Record the gateway URL and non-secret resource identifiers in the private deployment inventory.
6. From the shared application Worker account, store the corresponding token as a Worker secret. Do not expose it through `/api/email/status`, diagnostics, or any browser response.
7. Verify authenticated health/readiness and verify unauthorized requests fail.

Do not add fake D1 IDs to Wrangler config files. Actual IDs are account-specific and should be entered only in the relevant account's deployment configuration.

## Not yet implemented (required before data cutover)

- Fixed domain-specific Customer, Marketplace and Admin operation contracts.
- Query-to-table inventory and ownership approval.
- Replacements for cross-domain joins and cross-database transactions.
- Authentication between services, caller identity/authorization propagation and replay/idempotency strategy for writes.
- Rate/size limits, request schemas, observability without sensitive payloads, integration tests and latency benchmarks.
- Data copy, row-count/checksum reconciliation, shadow reads, rollback and development cutover.

The scaffold is a safe starting point, not a complete cross-account database migration. Do not route real application queries through it until the operation contracts and tests are approved.
