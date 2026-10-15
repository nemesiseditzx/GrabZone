# GrabZone Scalable Cloudflare Architecture Blueprint

**Status:** Planning baseline — not an implementation or deployment claim  
**Repository:** nemesiseditzx/GrabZone  
**Required working branch:** vendor-system-dev  
**Public domain:** grabzone.tech  
**Primary objective:** Preserve all existing GrabZone data and behavior while reducing avoidable usage, isolating service workloads, and making storage/database capacity extensible.  
**Safety rule:** No production DNS changes, production deployment, authoritative data migration, database deletion, or production secret changes without explicit approval.

## 1. Non-negotiable requirements

- Preserve all existing customer, vendor, admin, product, variation, inventory, order, COD, commission, referral, rewards, GrabPoints, membership, Mystery Box, coupon, email, and audit behavior.
- Preserve the existing UI, domain, media/object keys, image selection, and R2 asset URLs wherever possible.
- Keep checkout COD-only.
- Keep vendor data isolation enforced server-side, not merely in the UI.
- Keep development work on vendor-system-dev; do not merge to main or deploy production without explicit approval.
- Never delete or replace the current authoritative data source until migration, reconciliation, and rollback have been verified.
- Use legitimate Cloudflare account/resource arrangements that comply with Cloudflare terms. Do not assume separate accounts make all product limits unlimited or permit quota evasion.
- Do not commit account IDs where unnecessary, API tokens, R2 secrets, OAuth secrets, or any other credentials.

## 2. Target topology

### Application Workers — one common Worker account

| Worker | Owns / serves | Database ownership target |
|---|---|---|
| Customer Worker | Customer API, identity/profile domain, customer preferences/sessions where appropriate | Customer D1 in separate Customer DB account |
| Marketplace Worker | Catalog, vendors, inventory, orders, COD, commissions, referral/rewards/GrabPoints/membership/Mystery Box | Marketplace D1 in separate Marketplace DB account |
| Admin Worker | Admin-only APIs, admin permissions/settings/audit records | Admin D1 in separate Admin DB account |

Keep one public website/domain and route paths through a controlled entry point. Proposed logical paths are /api/customer/*, /api/marketplace/*, and /api/admin/*. Exact route integration must be confirmed against the current entrypoint and production behavior before implementation.

### D1 — three separately managed database accounts

- Customer D1: customer-domain records only.
- Marketplace D1: marketplace transactional/catalog records.
- Admin D1: privileged admin-domain records and audit records.

The repository currently uses direct D1 binding APIs and existing Wrangler configurations point to the same D1 ID. A foreign-account D1 must not be substituted into a normal Wrangler binding and assumed to work.

**Cross-account adapter gate:** Prototype the official D1 REST API path against disposable test data before implementation. Verify parameter binding, returned metadata, errors, batch behavior, transaction guarantees, retries, latency, rate limits, and failure modes. REST calls are not automatically equivalent to a native D1 binding; the adapter must deliberately support the exact methods and semantics the app uses. Never expose a generic client-controlled SQL endpoint.

If the REST adapter cannot meet security/correctness/latency requirements, evaluate a small authenticated, domain-specific database gateway in the owning account only after documenting the extra Worker, cost/limits, and explicit approval. Do not silently choose this alternative.

## 3. Data ownership and cross-service rules

1. Inventory every table and every query before assigning ownership.
2. Record all direct D1 calls and classify them by prepare, bind, first, all, run, batch, DDL, transactions, and any custom wrapper.
3. Identify joins and multi-table writes that currently span proposed service boundaries. A relational transaction cannot be assumed to span three D1 databases.
4. Keep a business transaction in one owning service whenever possible. For workflows crossing services, use an explicit state machine, idempotency key, durable outbox/compensation, and reconciliation job rather than a pretend distributed transaction.
5. Admin Worker reads/changes marketplace state through authenticated Marketplace API operations. Do not maintain unsynchronized shadow copies of live inventory/orders/commissions.
6. Marketplace API validates vendor ownership and permissions on the server for every sensitive query and mutation.
7. Avoid duplicating password hashes, OAuth credentials, session secrets, or privileged tokens across databases.
8. Define migration mappings and rollback before moving any authoritative record. Keep stable IDs and relationships.

## 4. Future R2 expansion — storage must be pluggable

### Phase R0: Keep the current R2 unchanged

- Keep current bucket grabzone-assets and current binding/path behavior while the database and Worker split is developed.
- Do not copy, rename, delete, or repartition current objects during the first migration.
- Inventory object keys, public URLs/custom domains, content types, metadata, upload paths, and references in D1.
- Test product images, variants, logos, banners, billboards, vendor media, and any other existing asset flows.

### Phase R1: Introduce a storage abstraction without changing current behavior

Create a small server-only storage interface, conceptually:
- putObject(logicalCategory, objectKey, body, metadata)
- getObject(logicalCategory, objectKey)
- headObject(logicalCategory, objectKey)
- deleteObject(logicalCategory, objectKey)
- createUploadAuthorization(...) only if the current upload architecture requires it.

The initial adapter must use the existing native R2 binding and bucket. Keep existing keys and URL behavior stable. All user input must be normalized/validated; never allow a client to select arbitrary account IDs, bucket names, endpoints, or credentials.

### Phase R2: Add a storage registry for future buckets/accounts

Keep a server-side configuration registry mapping logical categories to approved storage targets. Example categories: product-images, vendor-media, site-assets, banners, future-uploads. These are logical routing categories, not a commitment to split assets immediately.

Each target entry should define:
- a stable internal target ID;
- approved account endpoint and bucket name;
- access method (native binding for same-account resources, or S3-compatible API for cross-account access after a tested adapter exists);
- public URL/base URL policy;
- allowed logical categories/prefixes;
- read/write permissions and status;
- migration/copy state.

Do not put secret access keys in the registry. Store secrets as Worker secrets. Validate targets against a compile-time/configuration allowlist; no user-controlled dynamic endpoints.

### Phase R3: Future cross-account R2 adapter

Cloudflare documents both native Worker R2 bindings and an S3-compatible R2 API. For a bucket in a different account, do not assume the normal native binding crosses accounts. Prototype the S3-compatible API using a separate least-privilege R2 token restricted to specific bucket(s), with server-side credentials only.

Before adopting it, test:
- authenticated read/write/list/head/delete behavior needed by the app;
- multipart uploads if relevant;
- content type and metadata preservation;
- object size limits, timeouts, retry/idempotency;
- signed URL behavior and public asset delivery;
- token rotation and revocation;
- request latency, operation counts, error rates, and cost.

Do not expose the R2 secret to the browser. If direct browser upload is required, use short-lived, narrowly scoped upload authorization supported by the chosen design, or proxy the upload through a Worker. Do not give the browser broad bucket credentials.

### Phase R4: Add capacity only when measured need exists

When a legitimate additional R2 resource is approved:
1. create the bucket/account and scoped credentials;
2. add a registry entry;
3. choose new object categories/prefixes to route to it;
4. leave old objects in place initially;
5. write new objects to the new target while reading old objects from their recorded target;
6. optionally backfill old objects using a manifest, checksums, content-type/metadata verification, and retryable jobs;
7. keep a compatibility read path and rollback switch until all references verify;
8. delete old copies only after explicit approval and a complete reference/reconciliation check.

Do not use random per-request bucket selection. Keep object placement deterministic so reads/deletes know the exact target. Record a target ID with an object reference when the data model can safely support it. Where changing the data model is risky, preserve existing URL/key behavior and use a controlled manifest/registry instead.

### R2 scaling caveats

- A new bucket is not automatically an independent account quota. Measure the actual resource and account limits that apply.
- R2 free usage is monthly and includes storage plus Class A/B operations; overage may be billed. Current official pricing must be checked at the time of provisioning.
- Do not split storage merely to avoid legitimate charges or violate Cloudflare terms. Prefer image resizing/compression, deduplication, caching, avoiding unnecessary LIST/HEAD requests, and serving public immutable assets efficiently.
- Cross-account S3 access adds credentials and network complexity; it must be justified by measured capacity needs.
- Database separation and R2 separation are independent decisions. R2 must not be split automatically as part of the D1 migration.

## 5. Usage reduction and reliability

### D1
- Remove schema creation/seeding from hot request paths; use migrations and per-isolate setup caching only where safe.
- Add indexes based on measured query patterns.
- Select only needed columns and bound result sets; avoid full-table reads.
- Batch related writes only when semantics are correct.
- Cache only safe, non-sensitive, appropriately invalidated reads.
- Use idempotency keys for order/email/storage retries.
- Measure reads, writes, query duration, errors, and adapter overhead by service/database.

### Workers
- Keep shared code small and service ownership explicit.
- Route only required paths to each Worker.
- Monitor request count, CPU, subrequests, exceptions, and latency separately for each Worker.
- Do not claim separate Workers divide account-level quotas; confirm each product's actual limit scope.

### R2
- Compress/rescale images before upload where product requirements allow.
- Use stable object keys and cache headers for immutable assets.
- Avoid repeated listing and metadata checks on every page render.
- Do not rewrite or duplicate assets without need.

### Email
- Preserve existing provider failover behavior and customer/vendor email flows.
- Add durable outbox, event deduplication, retry policy, provider telemetry, and dead-letter diagnostics in a separate phase; do not make email migration a prerequisite for database data movement unless dependency analysis shows it is necessary.

## 6. Security baseline

- One least-privilege token per external database/storage account and purpose.
- Store all credentials as Worker secrets; rotate and revoke safely.
- Strict allowlists for account, database, bucket, and endpoint identifiers.
- Parameterized SQL and fixed domain-specific operations; never accept arbitrary SQL from a client.
- Validate authorization at the API boundary; enforce vendor isolation server-side.
- Do not return raw provider errors or secrets in API responses/logs.
- Apply request size limits, timeouts, bounded retries, and idempotency.
- Audit sensitive admin operations.
- Keep test and production credentials/resources separate.
- Use Cloudflare account arrangements consistent with current terms and policies.

## 7. Phased implementation plan

### Phase 0 — baseline and safety
- Confirm branch head and current CI state.
- Inventory Wrangler configs, Worker entrypoints, routes, environment bindings, D1 schemas, R2 usage, email integrations, and all tests.
- Capture current behavior and safe non-secret resource identifiers.
- Build a feature/regression checklist and migration/rollback plan.
- No production changes.

### Phase 1 — proof of concept
- Build a disposable D1 REST adapter spike.
- Validate parameterized queries, batch/transaction semantics, error handling, timeouts, and latency.
- Build a disposable cross-account R2 S3 adapter spike separately; do not change current bucket usage.
- Stop and revise design if semantics/security/performance are not acceptable.

### Phase 2 — service and data-boundary refactor
- Define service interfaces and table ownership.
- Add Customer/Admin Worker entrypoints and local/dev routes.
- Preserve the existing marketplace entrypoint until parity is verified.
- Resolve cross-service joins and multi-domain transaction designs before moving tables.
- Add tests around authorization and vendor isolation.

### Phase 3 — shadow migration
- Provision only real approved resources.
- Copy/backfill data without switching the authoritative write path.
- Compare row counts, stable IDs, key relationships, totals, and checksums where feasible.
- Test read parity and failure recovery.

### Phase 4 — development cutover
- Switch only isolated development traffic.
- Test login/session flows, product browse/edit/variations, stock, vendor/admin workflows, COD order lifecycle, commissions, rewards/referrals/GrabPoints, Mystery Box, email failover, uploads and image rendering.
- Exercise D1/R2 outage and token rotation scenarios.
- Benchmark actual limits and latency.

### Phase 5 — controlled production rollout
- Requires a separate explicit approval.
- Use a reversible cutover with health checks and a documented rollback trigger.
- Do not delete old authoritative data until stable operation and reconciliation are proven.
- Do not merge to main, change DNS, or deploy production before approval.

### Phase 6 — optional R2 expansion
- Only after usage measurements show a genuine need.
- Add the storage abstraction and registry first.
- Add additional bucket/account targets behind configuration.
- Test compatibility and rollback before routing new production uploads.
- Migrate existing assets only if there is a clear benefit and a verified rollback plan.

## 8. Acceptance criteria

The architecture is not considered complete until all applicable checks pass:

- [ ] All existing data is preserved and reconciled.
- [ ] Existing UI/domain and image URLs continue to work.
- [ ] Customer login/session and admin authorization pass.
- [ ] Vendor isolation passes positive and negative tests.
- [ ] Product variations, stock, COD checkout, order states and commissions pass.
- [ ] Rewards, referrals, GrabPoints, membership and Mystery Box pass.
- [ ] Email routing/failover tests pass and controlled deliveries are verified.
- [ ] Existing R2 reads/uploads/deletes work with the storage abstraction.
- [ ] Cross-account D1/R2 credentials are server-side, least-privilege, and rotatable.
- [ ] Error, retry, idempotency, rate-limit, and outage scenarios are tested.
- [ ] CI passes for the exact commit; development deployment is independently verified.
- [ ] Measured D1/Worker/R2 usage is compared against baseline.
- [ ] Rollback is documented and exercised.
- [ ] Production rollout and any destructive cleanup have separate explicit approval.

## 9. Current known blockers

- Current Wrangler configs still point to the same D1 ID; the three-D1-account architecture is not implemented.
- Dedicated Customer and Admin Worker configurations/entrypoints are not yet established.
- Real account/database IDs, tokens, and service credentials must be provisioned securely; never invent them.
- Direct D1 API calls and cross-domain transactions require a complete inventory.
- Current R2 bucket grabzone-assets remains the existing target; no storage registry or cross-account R2 adapter is implemented yet.
- A plan/document or passing unit test alone does not prove account setup, live delivery, production behavior, or quota independence.

## 10. Official references

- D1 Worker API: https://developers.cloudflare.com/d1/worker-api/
- D1 REST query endpoint: https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/
- D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- R2 Workers API: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- R2 S3-compatible API: https://developers.cloudflare.com/r2/get-started/s3/
- R2 authentication: https://developers.cloudflare.com/r2/api/tokens/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/


## Confirmed account-gateway clarification (2026-10-15)

The owner confirmed: D1 accounts are created; there are three D1s (Customer, Marketplace, Admin); the three main application Workers remain in one shared account; every D1-owning account also needs its own Worker; the current R2 bucket and `grabzone.tech` domain stay. This means six Workers in the eventual target (three application Workers plus three same-account D1 gateway Workers), unless a later reviewed architecture change explicitly changes that requirement. The gateway readiness scaffold is source-only and has not been deployed.
