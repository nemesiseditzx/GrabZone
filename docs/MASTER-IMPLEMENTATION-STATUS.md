# GrabZone Master Implementation Status

**Repository:** `nemesiseditzx/GrabZone`  
**Working branch:** `vendor-system-dev`  
**Production domain:** `grabzone.tech`  
**Scope:** Development branch only. Do not merge to `main`, alter production DNS/secrets/data, or deploy production without separate explicit approval.

## Verified baseline

- The current primary Wrangler config (`wrangler.jsonc`) deploys Worker `grabzone` from `marketplace-stable-entry.mjs`.
- Existing development configs also point at the same D1 database ID (`ffaa2c49-c89e-439f-9a71-89144b07dfce`) and the same R2 bucket (`grabzone-assets`).
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

1. Provision three distinct D1 databases in the intended Cloudflare account and record their actual IDs; no Cloudflare resource-management tool is available in this implementation session.
2. Confirm isolated preview bindings and migration/backfill plan before changing authoritative data ownership.
3. Define Customer and Admin Worker entry points, service-to-service authentication, routes, secret bindings and failure behavior.
4. Add dedicated Wrangler configs only after real D1 IDs exist; do not use fake IDs or reuse the current shared ID to claim separation.
5. Test customer auth, vendor isolation, COD checkout, admin authorization, email failover, UI rendering and row-read/write behavior.
6. Verify actual provider credentials, domain authentication and controlled test deliveries.
7. Review the branch's CI and development deployment results. Production remains untouched unless separately authorized.

## Verification state

This document records implementation state, not a claim of completion. GitHub Actions results must be checked for the exact latest commit before reporting tests as passing. Real email delivery, Cloudflare account resources and production DNS are not verifiable from source code alone.
