# GrabZone Full Renovation Plan
Date: 2026-10-10
Target branch: grabzone-full-renovation-2026-10-10
Baseline: main
Safety: Never commit to main or deploy production during this renovation.

## Goal
Rebuild and harden the full GrabZone experience on an isolated branch while reconciling every existing production feature with vendor-system-dev and other relevant feature branches. Reuse proven business rules and data contracts; replace broken implementation where justified. A clean rewrite must not silently remove existing behavior.

## Architecture constraints to verify
- Cloudflare Workers serves app routes and /api/*.
- Cloudflare D1 binding: DB; inspect live schema and migrations before changing queries.
- Cloudflare R2 binding: ASSETS_BUCKET; preserve object keys and URL behavior.
- Wrangler config currently names database grabzone-db-test; verify environments before any deployment.
- No Supabase or Vercel API dependency should be reintroduced without explicit approval.
- Preserve current Meta Pixel ID 1625544792515582 and analytics behavior unless the user explicitly approves changes.
- COD-only checkout; no new payment provider.
- No production deployment or merge to main without explicit approval.

## Feature inventory — verify against source and branch history
1. Public storefront: homepage, navigation, categories, brands, search, filters, product cards, product details, variants, image galleries, cart, checkout, order tracking.
2. Vendor onboarding: registration/application, approval/status, store profile, logo/banner, vendor account/permissions.
3. Vendor dashboard: overview, product CRUD, variants/SKU/prices/stock, media uploads, orders, fulfillment/shipping, sales/earnings, settings.
4. Admin: dashboard, users/customers, vendors, products, orders, commission/platform fee configuration, notices, banners, site settings, access controls.
5. Checkout/order model: COD, cart validation, inventory reservation/decrement, parent + vendor orders, shipping, cancellation/refund-equivalent workflows, stock restoration, idempotency.
6. GrabPoints/rewards: ledger, balance, earning/redemption conversion, membership tiers, eligibility and history.
7. Referral: codes, eligibility, attribution, vendor-specific Rewards Control, duplicate/self-referral prevention and historical data compatibility.
8. Mystery Box and all other existing customer/marketing features discovered in code.
9. Feedback surveys and survey routes/assets/analytics discovered in branch history.
10. Integrations: Cloudflare Worker/D1/R2, analytics/pixel, email/Google integrations and any other configured integrations.
11. Responsive UI, accessibility, loading/error/empty states, SEO/metadata, caching and asset routing.

## Branch reconciliation
- Compare main with vendor-system-dev, vendor-system-dev-work, vendor-system-complete, vendor-system-final, customer-ui-dev, rewards-referral-dev, rewards-referral-eligible-store-dev, marketplace-multivendor-dev, relevant UI/fix/optimization branches.
- Do not bulk-merge branches. Inspect commit/file differences, select changes deliberately, and run regression checks.
- Explicitly record features present only on main, only on a feature branch, or absent/broken in both.

## Implementation gates
A. Inventory: inspect entry points, all route handlers, page assets, D1 schema/migrations, Wrangler config, scripts and tests.
B. Baseline: record main commit and compare it with feature branches.
C. Design: map each page/action to its API and database entities before replacing code.
D. Rebuild: implement in small reviewable slices, starting with security/data integrity, then workflows, then UI polish.
E. Verification: build/lint, unit/API tests, D1 migration/schema checks, vendor isolation, product CRUD, media upload, COD checkout, multi-vendor orders, shipping/commission, rewards/referrals/mystery box, responsive UI and regression flows.
F. Release: report exact changed files, commits, tests run, tests not run, known issues and rollback strategy. Keep release blocked until explicit approval.

## Acceptance criteria
- Every discovered existing feature has an explicit keep/rebuild/remove decision; removal requires user approval.
- No known critical/high-severity bug remains without a documented blocker.
- Vendor data isolation is enforced server-side.
- D1 schema and data compatibility are verified; no destructive migration without backup and approval.
- No fake test passes: unavailable tests are marked not run.
- Final diff contains only intended changes and this branch is not merged/deployed without approval.
