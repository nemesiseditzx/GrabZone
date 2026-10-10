# GrabZone Branch Reconciliation Audit
Audit date: 2026-10-10
Repository: nemesiseditzx/GrabZone
Renovation branch: grabzone-full-renovation-2026-10-10
Baseline branch: main

## Verified baseline
- Repository default branch is main.
- Renovation branch was created from main and verified identical at creation (0 ahead / 0 behind).
- Baseline files inspected: README.md, wrangler.jsonc, index.html, worker.js, marketplace-stable-entry.mjs, vendor-dashboard.js, vendor-system-v2.mjs, d1-schema.sql.
- Main architecture is Cloudflare Workers + D1 (binding DB) + R2 (binding ASSETS_BUCKET). Wrangler currently names database grabzone-db-test and bucket grabzone-assets. No Supabase or Vercel API dependency is intended per README.
- Main entrypoint imports Google OAuth, legacy API bridge, legacy worker, admin/vendor capability wrapper, vendor finalizer, vendor-system-v2, vendor generator, vendor store v2, admin variations, and vendor marketplace complete. This is a layered/legacy integration, so replacing it without route inventory and regression tests risks dropping behavior.
- Main storefront loads config.js, d1-client.js, store.js, billboard.js, cart.js, rewards.js, phase5.js and several UI/animation layers.
- Main D1 schema includes products, product_images, orders/order_items, referral_codes, site_settings, billboards, store_policies, rewards_vouchers, customer_points, grabpoints_ledger, membership_tiers, vendors, vendor_users, vendor_store_settings, vendor_shipping_settings, variations, vendor_email_settings, vendor_orders, shipments, shipment_items, vendor_payouts, vendor_order_notifications, referral profit tables and referral payout/session tables.
- Meta Pixel ID in main index.html is 1625544792515582. Preserve unless explicitly approved to change.

## Branch comparisons against main
The GitHub compare endpoint reported the following status/unique commits/file samples. Because many branches have very large behind counts, these comparisons are not a substitute for inspecting each branch's full file tree and feature behavior.

| Branch | Compare result | Observed unique changes / signal |
|---|---|---|
| vendor-system-dev | diverged; 1 ahead, 11 behind | index.html listed in compare response; key vendor-dashboard.js content SHA matched main |
| vendor-system-dev-work | diverged; 2 ahead, 1777 behind | deploy workflow and vendor-dashboard.js changes |
| vendor-system-complete | diverged; 2 ahead, 1777 behind | deploy workflow and vendor-dashboard.js changes |
| vendor-system-final | diverged; 2 ahead, 1777 behind | deploy workflow and vendor-dashboard.js changes |
| customer-ui-dev | behind; 450 behind | no unique commits reported by compare endpoint |
| rewards-referral-dev | diverged; 1 ahead, 450 behind | rewards/referral foundation migration |
| rewards-referral-eligible-store-dev | behind; 330 behind | no unique commits reported by compare endpoint |
| marketplace-multivendor-dev | diverged; 199 ahead, 1873 behind | many marketplace, checkout, order service, vendor product worker, schema and CI files |
| grabzone-v2-dev | behind; 2602 behind | no unique commits reported by compare endpoint |
| ui-unified-navigation-vendor-system-dev | diverged; 16 ahead, 487 behind | unified panel navigation and admin/vendor page changes |
| fix/vendor-product-upload-function | diverged; 1 ahead, 3 behind | vendor-product-editor.js fix |
| fix/vendor-variation-insert-values | diverged; 1 ahead, 4 behind | vendor-system-v2.mjs fix |
| fix/feedback-survey-production-route | behind; 6 behind | no unique commits reported by compare endpoint |
| marketplace-fix-hardening | diverged; 31 ahead, 885 behind | regression tests, marketplace hardening map, worker/router and vendor UI changes |

## Important implementation notes
- Do not bulk merge old feature branches: the large divergence means stale or conflicting code could overwrite the current baseline.
- Inspect each candidate commit and file individually, then port only relevant, verified logic into the renovation branch.
- The marketplace-multivendor-dev branch includes substantial marketplace/order/schema work; review its implementation and migration assumptions before deciding what to port.
- The rewards/referral foundation migration is a candidate to review, not automatically apply. Verify current D1 schema and data first.
- The marketplace-fix-hardening branch includes a regression test file; inspect and adapt tests where applicable, but do not automatically import all branch changes.
- Keep production deployment and main merges blocked pending explicit user approval.

## Next audit steps
1. Build a complete tracked-file inventory for main and relevant branches.
2. Map routes and browser actions to Worker handlers and D1 tables.
3. Inspect each candidate branch's commit/file diffs beyond the first-page compare summary.
4. Create a keep/rebuild/port decision matrix for every discovered feature.
5. Implement the rebuild in small slices with tests, preserving existing data contracts until migration is explicitly planned and validated.
