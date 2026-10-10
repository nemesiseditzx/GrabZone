# GrabZone Full Renovation — Progress Log
Updated: 2026-10-10
Branch: grabzone-full-renovation-2026-10-10

## Implemented in the renovation branch
- Routed `create_public_order` through the vendor finalizer before the legacy D1 handler, so successful public orders can be snapshotted and split into vendor orders.
- Added compatibility migrations for vendor sessions/users, vendor identity/status fields, product ownership, variation tables, vendor coupon fields, and vendor order totals/discount fields.
- Added a default GrabZone vendor bootstrap and assigned legacy products with no vendor owner to that default vendor during checkout initialization.
- Normalized active-vendor status comparisons to avoid rejecting `active` vs `Active` values.
- Added server-side variation lookup, server-authoritative variant pricing, minimum/maximum quantity checks, tracked variation stock reservation, rollback on failed order persistence, inventory ledger entries, and idempotent stock restoration when a vendor order is cancelled.
- Prevented client-supplied variation prices from overwriting persisted server-calculated order-item prices.
- Added server-side vendor coupon and rewards voucher validation, discount calculation, one-time claim reservation, usage counting, and rollback when order persistence fails.
- Added atomic GrabPoints redemption and Mystery Deal claim reservation with rollback if the order batch fails.
- Removed a schema-startup update that rewrote historical order shipping charges and totals to a fixed 130.
- Corrected vendor order total aliasing against the existing D1 `orders.total` column, vendor coupon discount accounting, vendor commission basis, and vendor order duplicate protection.
- Fixed product image uploads to use the shared authenticated vendor image uploader.
- Preserved the existing Cloudflare Workers/D1/R2 architecture, COD checkout, and Meta Pixel ID.

## Regression coverage added
- Checkout routing through the vendor finalizer.
- Legacy D1 schema compatibility and default-vendor bootstrap.
- Variant price, stock reservation, rollback, and cancellation restoration.
- Vendor status casing and ownership checks.
- Vendor coupon/rewards voucher validation and accounting.
- GrabPoints and Mystery Deal atomicity.
- COD, D1/R2 bindings, Meta Pixel, and core schema preservation.
- Vendor image upload path and checkout response totals.

A branch-specific GitHub Actions workflow was added to run JavaScript syntax checks and all `tests/*.test.mjs` tests. This log does not claim that GitHub Actions or live Cloudflare integration tests have passed until their run results are observed.

## Not yet complete
- Full route-by-route inventory for every admin, customer, vendor, analytics, survey, referral, rewards, shipment, and integration endpoint.
- Full frontend UX/accessibility/mobile audit and visual regression testing.
- End-to-end browser tests against a safe preview environment.
- D1 integration tests against a disposable test database.
- Reconciliation and selective porting of every relevant feature/fix branch.
- Security review for all admin/vendor APIs and all authorization boundaries.
- Final changed-file diff review, unresolved issue list, and acceptance checklist.

## Safety constraints
- No merge to `main`.
- No production deployment.
- No destructive D1 migration or live data mutation without explicit approval.
- Never mark an unrun test as passed.
