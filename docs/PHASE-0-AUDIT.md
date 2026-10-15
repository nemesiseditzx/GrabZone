# GrabZone Phase 0 Audit — Current Baseline

**Branch:** vendor-system-dev  
**Audit commit baseline:** d4c2f76af00f73fa97c6faca2825ef2151652ff9  
**Status:** Initial source/config audit in progress; this is not a production audit and does not claim live Cloudflare account state.

## Verified from repository source

1. The repository tree contains 212 tracked files at the audit baseline, including three Wrangler configurations, the main marketplace entrypoint, a browser-side D1 compatibility client, D1 schema/migration files, tests, and Cloudflare workflows.
2. `wrangler.jsonc` deploys Worker `grabzone` from `marketplace-stable-entry.mjs`.
3. `wrangler.marketplace-dev.jsonc` deploys `grabzone-marketplace-dev` from `marketplace-product-ui-entry.mjs`.
4. `wrangler.vendor-preview.jsonc` deploys `vendor-system-dev-grabzone` from `vendor-preview-entry.mjs`.
5. All three configurations currently use the same D1 database ID `ffaa2c49-c89e-439f-9a71-89144b07dfce`, database name `grabzone-db-test`, and R2 bucket `grabzone-assets`. This is source configuration evidence, not confirmation of live account ownership or resource health.
6. The main marketplace entrypoint imports the legacy worker and several marketplace/vendor modules and uses direct D1 binding methods such as `env.DB.prepare(...)`. The existing application therefore cannot be safely split into three separate D1 databases by changing IDs alone.
7. The existing browser `d1-client.js` is a compatibility facade that sends requests to backend API routes (including `/api/d1`); it is not a secure cross-account D1 adapter. Any account credentials must remain server-side.
8. Existing CI includes syntax/regression tests and a Wrangler dry-run. A separate marketplace workflow runs syntax checks. These checks do not verify live D1 account placement, real API credentials, data migration, R2 contents, or production behavior.
9. The last observed Actions runs for commit `d4c2f76af00f73fa97c6faca2825ef2151652ff9` showed the two validation workflows and the marketplace development Worker workflow as successful. The development workflow is not a production deployment.

## New isolated proof-of-concept work

- Added `d1-rest-poc.mjs`: a server-side-only, single-query D1 REST proof of concept. It requires explicit server configuration, uses a fixed Cloudflare API endpoint, parameterized request values, bounded timeout, sanitized provider failures, and deliberately does not retry potentially ambiguous writes.
- Added `tests/d1-rest-poc.test.mjs` for endpoint construction, parameter payloads, configuration validation, input validation, sanitized errors, no automatic retry, and env-only configuration.
- The POC is intentionally **not imported by or wired into any production/dev request path**. It does not emulate native D1 binding behavior, batch semantics, or multi-statement transactions. It is a starting point for disposable-resource contract testing only.

## R2 baseline and required next audit

- Existing Wrangler configurations bind `ASSETS_BUCKET` to `grabzone-assets`.
- No storage registry or cross-account R2 adapter has been wired into the application.
- Next audit must inventory object key creation/read/delete sites, public URL generation, R2 metadata/content-type assumptions, and database references to media before designing a compatible abstraction.

## Remaining Phase 0 items

- Complete a repository-wide inventory of direct D1 calls, table ownership, cross-domain joins/writes, and DDL in request paths.
- Inventory current R2 usage and any upload signing/proxy flows.
- Identify existing data relationships that cannot safely cross D1 boundaries without API calls or an explicit workflow/state machine.
- Define the exact test-resource provisioning checklist and benchmark acceptance thresholds.
- Confirm real Cloudflare account/resource details only after the owner provisions them; never guess IDs or request secrets in chat.
- Keep all work on `vendor-system-dev`; no main merge, production DNS change, production secret edit, or production cutover.

## Safety decision

No existing D1 binding or R2 binding has been changed. No existing records or objects have been migrated, deleted, or copied. No production route has been changed. Do not treat the POC as production-ready until it has been tested against a disposable D1 account and its query/transaction/latency limitations have been documented.
