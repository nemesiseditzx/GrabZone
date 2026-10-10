# GrabZone Full Renovation — Progress Log
Updated: 2026-10-10
Target branch: `grabzone-full-renovation-2026-10-10`
Latest code/test commit: `c9f1b6497df8f98b6ee669697b6233e7229d24c5`

## Implemented

### Checkout, inventory, and vendor orders
- Routed `create_public_order` through the vendor finalizer before the legacy D1 handler.
- Added compatibility migrations for vendor sessions/users, vendor identity/status fields, product ownership, product variations, vendor coupons, vendor order totals/discount fields, and vendor order item snapshots.
- Restored default GrabZone vendor bootstrap/backfill for legacy products without a vendor owner.
- Made active-status comparisons case-insensitive across the vendor finalizer, vendor-system-v2, marketplace entrypoint, vendor marketplace API, and vendor admin compatibility API.
- Kept server-side variation lookup and pricing authoritative; the server does not trust client-supplied variation prices.
- Preserved tracked variation stock decrement/rollback and idempotent stock restoration on cancellation.
- Made vendor order creation idempotent and repairable after partial snapshot writes. Retries add missing order-item snapshots without resetting a vendor order's existing fulfillment status.
- Added a D1-backed finalization retry queue for failures after a customer order has already been accepted. The customer order response is preserved; retry jobs are drained on relevant API traffic, and stale processing jobs can be reclaimed.
- Removed startup logic that rewrote historical order shipping charges and totals to a fixed amount.
- Corrected the vendor order listing total alias, vendor coupon accounting, commission basis, vendor notification discount/total, and duplicate vendor order protection.

### Rewards and checkout
- Added server-side vendor coupon and rewards voucher validation, discount calculation, claim reservation, usage counting, and rollback on failed order persistence.
- Added conditional GrabPoints redemption and Mystery Deal claim reservation with rollback.
- Corrected checkout payloads to send the selected vendor ID and only the applied rewards voucher.
- Updated confirmation email totals to use the server-calculated order total.
- Preserved Cash on Delivery.

### UI and usability
- Replaced browser alerts in the vendor product editor, admin product editor, customer variation picker, invoice-download error path, injected image upload controls, and vendor variation UI with non-blocking toast feedback.
- Replaced vendor store-section editing and vendor-control product/section editing prompts with accessible modals.
- Replaced shipment-creation prompts with a modal, corrected the default shipment status, and aligned the vendor order status dropdown with statuses accepted by the API.
- Added responsive form layouts, inline error states, Escape/backdrop close behavior, and accessible status announcements to the new dialogs.
- Preserved the existing Cloudflare Workers/D1/R2 architecture and Meta Pixel ID `1625544792515582`.

### Schema, tests, and CI
- Added `vendor_order_items` and `vendor_order_finalization_jobs` to `d1-schema.sql`, including supporting indexes.
- Added regression tests for checkout contracts, discount accounting, inventory, ownership, vendor status compatibility, retryable finalization, image uploads, and UI dialogs/feedback.
- The renovation CI checks external JavaScript syntax, inline JavaScript from root HTML pages, the regression suite, local D1 schema application, and a Wrangler Worker dry-run build. It does not deploy.

## Latest verified CI result

GitHub Actions run: https://github.com/nemesiseditzx/GrabZone/actions/runs/38087339746

- JavaScript syntax: passed
- Inline HTML scripts: 40 extracted and syntax-checked
- Regression tests: 51 passed, 0 failed
- Added a runtime regression test proving any `*.workers.dev` preview host uses its own origin for backend requests while `grabzone.tech` retains the configured production backend URL
- D1 schema: applied successfully to Wrangler's local database
- Wrangler dry-run bundle: passed
- No production deployment performed by this workflow

The latest code/test commit also fixes the vendor-order cancellation handler's previous-status lookup and adds a regression assertion for it. The frontend backend-origin routing fix is in commit `11ee21cbc4b1e969819144749baf74b367a4cc12` and covered by the 51-test CI run.

## Backend connection update

- `config.js` now recognizes every Cloudflare Workers preview hostname ending in `.workers.dev`, rather than only one hard-coded vendor preview hostname. Preview frontend API calls use `window.location.origin`; `grabzone.tech` continues using `https://grabzone.nemesiseditzx984.workers.dev`.
- This is a code-level routing fix. It does not prove a remote Worker is deployed or that its bindings are healthy.
- The current `wrangler.jsonc`, `wrangler.marketplace-dev.jsonc`, and `wrangler.vendor-preview.jsonc` configurations reuse the same D1 database ID and R2 bucket name. Do not deploy the renovation branch for end-to-end testing until a separate disposable D1 database and R2 bucket are configured.

## New requested renovation scope — 2026-10-10

The user supplied a nine-item issue list. Treat these as acceptance criteria, not as already completed work:

1. Add category/search controls to every vendor storefront and searchable vendor/category coverage in the marketplace.
2. Replace the single fixed product-pagination row with consistent pagination on home/marketplace/store listing surfaces.
3. Standardize invoice and transactional email support contact to `support@grabzone.tech`; add the GrabZone Telegram channel where social contacts are shown.
4. Upgrade marketplace search to typo-tolerant, broad matching similar to large marketplaces without making exact searches mandatory.
5. Give each vendor a stable readable store URL based on its slug, while retaining compatibility for existing store links.
6. Show each vendor's saved contact details and social links on their own store page.
7. Add category search/filtering that remains usable as users change category and continue searching.
8. Allow variations to be edited and disabled/deleted safely, including persistence of quantity limits and stock tracking mode.
9. Ensure product images reliably appear on the main storefront.

### Changes started in this pass
- Variation generation now reactivates a previously disabled combination if it is generated again, rather than leaving the regenerated combination permanently disabled.
- Variation PATCH now validates regular/sale price and stock inputs, preserves or explicitly accepts tracked/untracked inventory mode (including tracked zero stock), and persists `min_qty` / `max_qty` instead of resetting them on every edit.
- Checkout invoice contact now uses `support@grabzone.tech` and includes the GrabZone Telegram channel link.

These code changes are on the renovation branch only. They are not evidence that the full nine-item list is complete. Continue with storefront search/category/pagination, slug routing, vendor contact/social rendering, product image coverage, and dedicated variation regression tests before declaring acceptance.

### Follow-up implementation pass

- Admin and vendor variation editors now expose sale price, old price, stock quantity, tracked/untracked mode, minimum/maximum quantity, status, and image controls. Variation removal is a safe disable/archive operation so historical order records are retained.
- Vendor variation PATCH now validates and persists sale price, stock, stock mode, low-stock threshold, and quantity limits. Regenerating a disabled combination reactivates it, and the vendor variation-generation response now returns the persisted variations so the editor can immediately render them.
- Customer variation picker now constrains quantity by minimum/maximum and tracked stock. The order finalizer independently validates minimum quantity, maximum quantity, and available tracked stock before forwarding an order.
- Checkout confirmation email item payload now includes selected variation options and SKU.
- Main storefront, marketplace cards, and vendor storefront cards now fall back to the GrabZone favicon when an image URL fails.
- Main storefront product grid now paginates at 20 products per page and resets pagination when the search/category filter changes.
- Clean `/store/<slug>` URLs now route to `marketplace-store.html` in the Worker while preserving the browser-visible slug path.
- Main storefront search now supports conservative typo tolerance for longer English terms; marketplace search already includes fuzzy matching and category/store filters.
- Added `tests/variation-system-regression.test.mjs` to cover variation field persistence, editor controls, quantity enforcement, email variation details, image fallbacks, clean store routing, and home pagination.

These changes are code and automated-regression work on the renovation branch only. A green local/CI validation is not the same as an authenticated browser test against a safely isolated remote Worker/D1/R2 deployment.

### Additional inventory and product-detail fixes

- Tracked variation stock is now decremented using a conditional SQL update (`stock >= requested quantity`) during order creation, protecting against concurrent overselling.
- If the base order request fails, previously reserved tracked stock is restored. Inventory sale logs are idempotent and are also written during queued vendor-order finalization retries, so cancellation restoration can find the original sale record.
- Fixed the home fuzzy-search tokenizer so it correctly splits whitespace and English/Bangla terms.
- Product detail gallery now has a fallback image even when a product has no image at all, and failed main/thumbnail image URLs fall back instead of leaving a broken gallery.
- Added regression coverage for conditional stock reservation/rollback, retry-safe sale logging, fuzzy-search tokenization, and product detail image fallback.

- Order finalization now derives variation price, SKU, image, and option labels from D1 rather than trusting client-supplied variation prices; it also rejects a variation ID that does not belong to the submitted product.
- Admin and vendor variation APIs now reject fractional/invalid stock and quantity limits and invalid low-stock thresholds rather than silently rounding malformed inputs.

## Still not verified end-to-end
- Browser-driven checkout and vendor order flow against a safe deployment of this exact renovation branch.
- Integration tests against a disposable remote D1 database and R2 test bucket.
- Live email delivery and provider fallback.
- Full screenshot-based visual regression across desktop/mobile breakpoints.
- Full manual route-by-route security review across every admin, customer, vendor, analytics, survey, referral, rewards, shipment, and integration endpoint.
- Exhaustive content-level review of every relevant historical feature branch; large branch divergence means this cannot be certified solely from commit comparisons.

## Release guardrails
- Do not merge into `main` without explicit approval.
- Do not deploy production from this branch.
- Do not run destructive or data-changing operations against the live D1 database without backup and explicit approval.
- Treat live-preview and remote-D1 checks as not run until an exact renovation preview/test environment is available.
- The current Wrangler config binds `DB` to `grabzone-db-test` using a database ID shared by `main` and `vendor-system-dev`, and binds `ASSETS_BUCKET` to `grabzone-assets` across those branches. Do not deploy this config for acceptance testing; provision dedicated preview D1 and R2 resources and point a separate preview config at them first.
