# GrabZone Cross-Account D1 Deployment Inventory

**Working branch:** vendor-system-dev  
**Purpose:** Track non-secret Cloudflare resource identifiers and rollout evidence.  
**Security:** Never enter API tokens, Worker secrets, passwords, recovery codes, or customer data here. Keep completed inventory in an access-controlled/private location; this repository copy is a blank template only.

## Target topology

| Role | Account alias | Worker name | Database name | Database ID | Worker URL | Status |
|---|---|---|---|---|---|---|
| Shared app account | APP | grabzone-customer | N/A (gateway client) | N/A | TBD | Not verified |
| Shared app account | APP | grabzone-marketplace | N/A (gateway client) | N/A | TBD | Not verified |
| Shared app account | APP | grabzone-admin | N/A (gateway client) | N/A | TBD | Not verified |
| Customer D1 account | CUSTOMER_DB | grabzone-customer-d1-gateway | Customer D1 | TBD | TBD | Not provisioned |
| Marketplace D1 account | MARKETPLACE_DB | grabzone-marketplace-d1-gateway | Marketplace D1 | TBD | TBD | Not provisioned |
| Admin D1 account | ADMIN_DB | grabzone-admin-d1-gateway | Admin D1 | TBD | TBD | Not provisioned |

The existing production Worker grabzone, current D1, R2 bucket grabzone-assets, and grabzone.tech routing must remain unchanged until a tested development cutover and explicit production approval.

## Account/resource verification

- [ ] Confirm the three intended D1-owning accounts are distinct accounts and accessible to the operator.
- [ ] Confirm which account owns the three shared application Workers.
- [ ] Record account aliases and non-secret account IDs in a private inventory.
- [ ] Confirm the Customer, Marketplace, and Admin database IDs/names in their respective accounts.
- [ ] Confirm current D1 schema and data backups/export path for each source database.
- [ ] Confirm existing R2 bucket and asset URLs remain unchanged.
- [ ] Confirm account limits and terms; account separation must not be used to evade provider limits.

## Gateway provisioning (repeat for each D1-owning account)

- [ ] Deploy d1-account-gateway.mjs as the account's gateway Worker.
- [ ] Bind only that account's intended database as DB.
- [ ] Configure a unique high-entropy D1_GATEWAY_TOKEN using the Cloudflare Worker Secrets UI/CLI.
- [ ] Store the matching token only as a secret in the approved caller Worker; never commit it or send it in chat.
- [ ] Restrict access to server-to-server callers where supported; keep bearer authentication enabled.
- [ ] Verify unauthenticated /internal/health and /internal/ready return 401.
- [ ] Verify authenticated /internal/health returns 200 and authenticated /internal/ready returns 200 only with the correct D1 binding.
- [ ] Verify wrong token, wrong method, unknown route, missing DB binding and DB error fail closed.
- [ ] Record deployment version, URL, date and test evidence here or in the private inventory.

## Required before any application data cutover

- [ ] Approve exact table ownership and every read/write/query path for each domain.
- [ ] Design fixed, typed, domain-specific gateway operations; do not expose arbitrary SQL.
- [ ] Specify caller identity propagation, authorization checks, payload limits, rate limits, idempotency, audit logging and sanitized errors.
- [ ] Resolve existing cross-domain joins and multi-table transactions before moving those tables.
- [ ] Build integration tests for CRUD, concurrency, retries, permissions and failure behavior.
- [ ] Copy data to development databases and reconcile row counts plus deterministic checksums.
- [ ] Shadow-read and compare results without duplicating writes.
- [ ] Test rollback to the current database and preserve backups.
- [ ] Validate /api/customer/*, /api/marketplace/*, and /api/admin/* through the existing domain entrypoint in development.
- [ ] Verify COD-only checkout, vendor data isolation, Rewards, Referral, GrabPoints, Mystery Box, email fallback, and R2 image/upload paths.
- [ ] Get explicit approval before production DNS, routing, authoritative data, or production Worker changes.

## Rollout rule

A successful Worker deployment or health check does not mean the application is migrated. Keep production on the current path until data contracts, reconciliation, regression tests, rollback, and explicit approval are complete.
