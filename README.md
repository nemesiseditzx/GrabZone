# GRABZONE

GRABZONE is deployed as a Cloudflare Worker with static assets, Cloudflare D1, and Cloudflare R2.

## Backend architecture

- Cloudflare Worker: serves the storefront/admin and all /api/* routes
- D1 binding: DB
- R2 binding: ASSETS_BUCKET
- Admin authentication: Worker sessions + signed bridge token
- No Supabase dependency
- No Vercel API dependency

## Required production secrets

- D1_AUTH_SECRET
- GRABZONE_ADMIN_EMAIL
- GRABZONE_ADMIN_PASSWORD

Optional integrations:

- BUSINESS_KORO_API_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REFRESH_TOKEN
- GOOGLE_SHEETS_SPREADSHEET_ID
- GMAIL_FROM_EMAIL
- R2_PUBLIC_BASE_URL

## Deployment

Cloudflare Workers Builds should use the repository's wrangler.jsonc and deploy with:

npx wrangler deploy

The Wrangler configuration binds the existing D1 database `grabzone-db-test` and R2 bucket `grabzone-assets`.

The existing storefront/admin UI is preserved; the backend is moved to the Cloudflare Worker so the browser no longer depends on the old Vercel/Supabase bridge.


## Transactional email delivery

The shared `grabzone-email.mjs` module routes transactional order emails through configurable providers. The default order is Resend, Brevo, Mailtrap, then the existing Gmail API integration. Configure provider credentials as Cloudflare Worker secrets; configure sender addresses as Worker variables only after the sender/domain has been verified with that provider.

- Resend: `RESEND_API_KEY`
- Brevo: `BREVO_API_KEY` and `BREVO_FROM_EMAIL`
- Mailtrap Email Sending API: `MAILTRAP_API_TOKEN` (or `MAILTRAP_API_KEY`) and `MAILTRAP_FROM_EMAIL`. A Mailtrap sandbox/testing token is not a production sender; enable this fallback only when the account supports production transactional sending.
- Gmail legacy fallback: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, and `GMAIL_FROM_EMAIL`.

Set `EMAIL_PROVIDER_ORDER` to a comma-separated provider list, or use `EMAIL_PROVIDER_ORDER_TRANSACTIONAL` to override only transactional email. A definitive rejection (including an explicit rate-limit response) can fall through to the next provider. Network errors and HTTP 5xx responses are treated as ambiguous and stop immediate failover to reduce the risk of duplicate messages. This is best-effort synchronous failover; durable outbox/retry state, delivery webhooks, provider quota telemetry, and marketing-consent workflows remain separate implementation work.

An accepted provider API response means accepted by that provider, not necessarily delivered to the recipient. Test with controlled recipient addresses and never put API keys in frontend code or committed files.
