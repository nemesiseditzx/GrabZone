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

<!-- Selected Rewards and ecommerce UX repair trigger. -->
