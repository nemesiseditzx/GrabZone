# GrabZone Full Renovation — Progress Log
Updated: 2026-10-10
Target branch: `grabzone-full-renovation-2026-10-10`
Last verified code commit: `6ff4871de649154b0753bd845b437ac5614ee793`

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

## Last verified CI result

GitHub Actions run: https://github.com/nemesiseditzx/GrabZone/actions/runs/38083601362

- JavaScript syntax: passed
- Inline HTML scripts: 40 extracted and syntax-checked
- Regression tests: 50 passed, 0 failed
- D1 schema: applied successfully to Wrangler's local database
- Wrangler dry-run bundle: passed
- No production deployment performed by this workflow

The latest verified commit also fixes the vendor-order cancellation handler's previous-status lookup and adds a regression assertion for it.

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
