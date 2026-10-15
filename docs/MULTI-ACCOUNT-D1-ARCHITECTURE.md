# GrabZone Multi-Account D1 Architecture

**Status:** Architecture decision recorded; implementation is gated on provisioning and security verification.  
**Working branch:** `vendor-system-dev`  
**Main application Workers:** all stay in the existing designated Worker Cloudflare account.  
**D1 ownership:** one distinct D1 database in each of three separately managed Cloudflare accounts, subject to Cloudflare's account terms and quota policies.  
**Production:** no production deployment, DNS changes, authoritative data migration, or secret changes without explicit approval.

## User's required topology

| Logical service | Application Worker | Database | Account placement |
|---|---|---|---|
| Customer API | Customer Worker | Customer D1 | Worker in the common Worker account; D1 in Customer DB account |
| Marketplace API | Marketplace Worker | Marketplace D1 | Worker in the common Worker account; D1 in Marketplace DB account |
| Admin API | Admin Worker | Admin D1 | Worker in the common Worker account; D1 in Admin DB account |

The public domain remains `grabzone.tech`. Route API traffic to the relevant service behind one controlled entry point, using paths such as `/api/customer/*`, `/api/marketplace/*`, and `/api/admin/*`. The precise routing design must be validated against the existing entrypoint and current production behavior before implementation.

## Critical cross-account binding constraint

Do **not** put a D1 UUID from another Cloudflare account into an ordinary Wrangler `d1_databases` binding and assume it will work. Standard Worker D1 access is through configured Worker environment bindings. The current official D1 REST API separately accepts an account ID and database ID and supports API-token authorization.

Because the application Workers must remain in the common Worker account while each D1 lives in a different account, the likely supported integration path to prototype is a server-side D1 REST API adapter using a separate least-privilege API token for each D1-owning account. This is not the same as a native D1 binding. It adds network/API latency and requires careful request batching, transaction semantics, retry handling and rate-limit monitoring. It must pass a proof of concept before the existing direct `env.DB.prepare(...)`, `batch(...)`, `first()`, `all()`, `run()` and any other used D1 methods are replaced.

Official references:
- D1 Worker bindings: https://developers.cloudflare.com/d1/worker-api/
- D1 REST query endpoint: https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/
- D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/

## Required integration: one gateway Worker in each D1-owning account

The user confirmed that each D1-owning account must also have a Worker. Therefore the target includes three small database gateway Workers—one in the Customer D1 account, one in the Marketplace D1 account, and one in the Admin D1 account—in addition to the three main application Workers in the shared application Worker account.

Each gateway uses a native D1 binding to its same-account database and exposes only authenticated, fixed domain-specific operations. It must never accept arbitrary SQL or caller-selected account/database identifiers. The initial scaffold in `d1-account-gateway.mjs` implements authenticated liveness/readiness only; it deliberately does not expose application data operations.

Use a unique high-entropy `D1_GATEWAY_TOKEN` secret per gateway, store it as a Worker secret in the gateway account and as a Worker secret in approved calling Workers, and never commit or share it in chat. Apply server-to-server access controls, request limits, sanitized errors, authorization propagation, idempotency for writes, and audit logging. Do not add real data operations until the query/table ownership inventory and service contracts are reviewed.

The D1 REST adapter remains an isolated proof of concept, not the production access path. Evaluate it only if a later measured need justifies it; do not run both paths for authoritative writes.

## Data ownership and service boundaries

### Customer D1
Owns customer identity and profile data, customer preferences, customer sessions/identity-specific records and other customer-domain data. Do not duplicate password/PIN hashes, OAuth credentials, or session secrets into Marketplace/Admin D1 without a documented reason.

### Marketplace D1
Owns catalog/products/variations, vendor data, inventory, carts if persisted, orders and order items, COD order lifecycle, vendor allocations/commissions, referral codes and referral profit, GrabPoints/rewards, membership benefits, Mystery Box claims, coupons, and marketplace transaction state. Preserve existing business rules and idempotency.

### Admin D1
Owns privileged admin identity/session records, admin-specific configuration, permission grants and security/audit events. Admin operations that need marketplace data must call authenticated Marketplace API operations; do not create unsynchronized shadow copies of order/inventory/commission data merely to make the Admin UI convenient.

### R2 and media
Keep the existing R2 integration until a separate storage decision is approved. Database separation does not imply splitting R2 automatically. Preserve object keys, image URLs, product image selection and existing assets.

## Required secure cross-account configuration

- Provision the three D1 accounts/databases manually or through a verified Cloudflare account-management workflow. Record each actual account ID, database ID and database name in a private deployment inventory, not in public source code.
- Create a separate Cloudflare API token per D1 account with only the D1 permissions required by that service. Store tokens as Worker secrets; never commit tokens, global API keys or credentials.
- Use server-side calls only. Never send these tokens to browsers or expose them in diagnostics.
- Use strict account/database allowlists in code. Do not accept account IDs, database IDs, SQL strings or provider URLs from client requests.
- Prefer parameterized SQL, fixed query definitions, bounded request sizes, explicit timeouts and safe error responses. Do not return raw provider error bodies to clients.
- Separate read and write access where practical. Audit all Admin mutations and enforce vendor isolation in the Marketplace service.
- Never retry an ambiguous write automatically without idempotency protection.
- Establish per-account quota monitoring and alerting. Account separation must comply with Cloudflare's terms; do not assume it makes every product limit unlimited or authorizes evading a limit.

## Migration and rollout gates

1. Confirm Cloudflare permits the intended account/resource arrangement for this use case and that the accounts are properly controlled.
2. Provision the three D1 databases and record real IDs, names and region/jurisdiction decisions. Do not invent IDs.
3. Prototype the D1 REST adapter against a disposable test database. Verify result metadata, parameter types, batch behavior, transactional guarantees, errors, rate limits and latency.
4. Inventory every direct D1 call and every table's owner. Identify cross-domain joins/transactions that cannot be performed across separate D1 databases.
5. Add the three application Workers in the common Worker account, with authenticated internal API boundaries and route configuration. Keep the existing marketplace behavior working during migration.
6. Migrate data using reviewed export/import or application-level backfill, with row counts, checksums, reconciliation and rollback plan. Never split live transactional data without a cutover plan.
7. Test customer authentication, sessions, admin authorization, vendor isolation, product variations, inventory consistency, COD checkout, rewards/referrals/GrabPoints, Mystery Box, commissions, media/R2, emails, retries and audit logs.
8. Measure actual D1 rows read/written, Worker CPU, REST latency, error rate and quota use before and after. The account split is not considered a performance success until measured.
9. Deploy only to isolated development resources first. Production migration, DNS changes and merging to `main` require separate explicit approval.

## Known current repository gap

The existing Wrangler configurations currently point at the same D1 database ID `ffaa2c49-c89e-439f-9a71-89144b07dfce`. The repository's main Worker entrypoint uses direct D1 binding APIs. Therefore the separate-account architecture is **not implemented yet**. Do not change the current D1 bindings to placeholders or claim separation before the adapter, real account resources and end-to-end tests exist.


## User-confirmed gateway placement (2026-10-15)

- The three D1 accounts have been created, according to the owner.
- The owner explicitly requires a Worker in each D1 account.
- The shared application Worker account still hosts Customer API, Marketplace API and Admin API.
- Current `grabzone.tech` domain and current `grabzone-assets` R2 bucket remain unchanged.
- `d1-account-gateway.mjs` is a readiness-only scaffold. It is not yet deployed and does not replace the app's direct D1 calls.
