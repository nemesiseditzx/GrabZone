# GrabZone Master Implementation Status

**Repository:** `nemesiseditzx/GrabZone`  
**Working branch:** `vendor-system-dev`  
**Production domain:** `grabzone.tech`  
**Scope:** Development branch only. Do not merge to `main`, alter production DNS/secrets/data, or deploy production without separate explicit approval.

## Verified baseline

- The current primary Wrangler config (`wrangler.jsonc`) deploys Worker `grabzone` from `marketplace-stable-entry.mjs`.
- Existing development configs also point at the same D1 database ID (`ffaa2c49-c89e-439f-9a71-89144b07dfce`) and the same R2 bucket (`grabzone-assets`).
- Updated user requirement: keep all three main application Workers in one designated Worker account, while placing Customer D1, Marketplace D1 and Admin D1 in three separate D1-owning accounts. The implementation needs a verified cross-account access layer; ordinary Wrangler D1 bindings must not be assumed to cross account boundaries.
- Detailed target, security controls and migration gates are documented in `docs/MULTI-ACCOUNT-D1-ARCHITECTURE.md`.
- `wrangler.marketplace-dev.jsonc` and `wrangler.vendor-preview.jsonc` are additional configurations, but there are no dedicated Customer API and Admin API Wrangler configurations yet.
- Therefore, the requested three-Worker / three-distinct-D1 architecture is **not yet implemented**. Do not describe it as complete, and do not substitute the same D1 ID into all three bindings.
- The repository's GitHub Actions currently run syntax/regression checks and a development Worker deployment workflow on pushes to this branch. This is not authorization to deploy production.
- Existing commerce logic includes vendor operations, product variations, COD order flows, rewards/referrals/GrabPoints, Mystery Box and R2 media paths; changes must preserve them.

## Changes made on this branch

- Added a shared transactional email provider router in `grabzone-email.mjs`: default order Resend → Brevo → Mailtrap → existing Gmail API.
- Routed customer order confirmations, vendor order notifications, GrabPoints/rewards emails and order-status updates through the shared transactional provider router.
- Extended the protected `/api/email/status` diagnostic response with provider configuration flags and the configured provider order; this reports configuration, not live deliverability.
- Added provider-order configuration using `EMAIL_PROVIDER_ORDER` and `EMAIL_PROVIDER_ORDER_TRANSACTIONAL`.
- Explicit provider rejection (including 429 rate limits) may fall through. Network failures and HTTP 5xx responses stop immediate fallback as ambiguous to reduce duplicate delivery risk.
- Added `tests/email-provider-failover.test.mjs` for failover, ambiguous outcomes, category order and customer order email routing.
- Added `d1-schema-cache.mjs` and `tests/d1-schema-cache.test.mjs` to share schema setup promises per D1 binding/isolate and allow retry after setup errors.
- Updated `marketplace-stable-entry.mjs` to batch the variation table bootstrap once per D1 binding/isolate and cache shipping-settings schema setup instead of issuing those DDL/seed operations on every matching request.
- Added provider environment examples and documentation in `.env.example` and this README.

## Email configuration requirements

- Resend: `RESEND_API_KEY`
- Brevo: `BREVO_API_KEY`, `BREVO_FROM_EMAIL`
- Mailtrap Email Sending: `MAILTRAP_API_TOKEN` (or `MAILTRAP_API_KEY`) and `MAILTRAP_FROM_EMAIL`. Only use a verified production transactional sender; a sandbox/testing token is not sufficient.
- Gmail fallback: existing Google OAuth refresh-token credentials and `GMAIL_FROM_EMAIL`.
- All sender domains/addresses must be verified before enabling real sends. Provider acceptance is not proof of delivery.
- Durable outbox, event deduplication across retries, provider quota telemetry, signed delivery webhooks, dead-letter diagnostics and marketing consent/unsubscribe handling remain to be implemented.

## Required blockers before three-Worker rollout

1. Provision the three D1-owning accounts/databases and record actual IDs; confirm the arrangement complies with Cloudflare terms and account controls.
2. Prototype and benchmark the cross-account D1 REST adapter against disposable data before replacing direct D1 bindings.
3. Inventory database calls, table ownership and cross-domain joins/transactions; finalize Customer and Admin Worker entrypoints, routes and service authentication.
4. Add configuration only after real account/database IDs and least-privilege tokens exist; never commit secrets or fake IDs.
5. Implement reviewed data migration/backfill, reconciliation and rollback before changing authoritative data ownership.
6. Test customer auth, vendor isolation, COD checkout, admin authorization, email failover, UI rendering and row-read/write behavior.
7. Verify actual provider credentials, domain authentication and controlled test deliveries.
8. Review CI and isolated development deployment results. Production remains untouched unless separately authorized.

## Verification state

This document records implementation state, not a claim of completion. GitHub Actions results must be checked for the exact latest commit before reporting tests as passing. Real email delivery, Cloudflare account resources and production DNS are not verifiable from source code alone.


## Full scalable architecture blueprint

- Added `docs/GRABZONE-SCALABLE-FREE-TIER-ARCHITECTURE.md` on `vendor-system-dev` (planning document only). It covers the three-Worker / three-separate-D1-account target, data preservation and migration gates, a future R2 storage abstraction and multi-account expansion path, usage optimization, security, phased rollout, acceptance criteria, and explicit production safety gates.
- This blueprint does not mean the architecture is implemented. The current D1 bindings and R2 bucket remain unchanged; no production data, DNS, secrets, or deployment were modified by this documentation commit.


## Active architecture implementation — Phase 0 / POC

- Added `docs/PHASE-0-AUDIT.md` with verified source-configuration findings and current safety gates.
- Added `d1-rest-poc.mjs` and `tests/d1-rest-poc.test.mjs` as an isolated server-side D1 REST proof of concept. It is not imported into any Worker entrypoint and does not change live database access.
- Confirmed from repository source that all three current Wrangler configurations still point to the same D1 ID and R2 bucket; current application code uses native D1 binding APIs. The separate-account architecture remains incomplete.
- Current observed Actions results for baseline commit `d4c2f76af00f73fa97c6faca2825ef2151652ff9` were successful for marketplace validation, vendor-system validation, and the marketplace development Worker workflow. These do not establish that the new POC tests pass until workflows complete for the new commit.
- Next: wait for CI on the latest commit; correct any test failures; inventory direct D1 access and R2 object operations; then run a disposable D1 contract/latency test once actual test-account IDs and a least-privilege API token are configured as secrets. Do not wire the POC into application routes or migrate authoritative data before those gates pass.


## Latest audit progress (2026-10-15)

- Added `docs/R2-ASSET-ROUTING-INVENTORY.md` documenting source-observed R2 key families and read/write routes for vendor media, general uploads, review photos, and product multi-image URL references. It explicitly does not claim a complete live bucket inventory.
- The corrected D1 REST POC tests passed in GitHub Actions at commit `b18376aa54918b7e9c1c697a137502122430a998`; the vendor-system syntax/regression workflow, marketplace validation workflow, and marketplace development Worker workflow all reported success for that commit.
- One regression assertion initially failed because the expected error text did not match the implementation. The assertion was corrected, and the subsequent commit passed the regression workflow. No application D1 or R2 bindings were changed by this fix.
- Current R2 source behavior includes vendor keys under `vendors/{vendorId}/...`, general upload keys under `grabzone/{date}/...`, and review photo keys under `grabzone/reviews/{date}/...`. Preserve these keys and URL behavior in any later storage abstraction.
- Next implementation gate remains a disposable-account D1 REST contract/latency test and full table/query ownership inventory. Actual account IDs/tokens must be provisioned by the owner; no placeholders will be wired into application routes.
