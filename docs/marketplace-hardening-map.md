# GrabZone Marketplace Hardening Map

This branch keeps the existing layered architecture but makes ownership explicit.

## Public checkout/order

- `marketplace-stable-entry.mjs` — top-level marketplace routing.
- `vendor-system-finalizer.mjs` — order post-processing, vendor-order synchronization, cancellation inventory restore.
- `worker.mjs` — canonical public `create_public_order` validation, pricing, discounts, COD order creation, and **atomic inventory reservation**.
- `vendor-marketplace-router.mjs` — marketplace-specific routing only; it must not perform a second stock decrement.

## Vendor APIs

- `vendor-system-v2.mjs` — vendor product/account capabilities.
- `vendor-marketplace-complete.mjs` — vendor order/store APIs and compatibility layer.
- `vendor-system-finalizer.mjs` — vendor order read/status flows and cancellation restore.
- Ownership checks must remain scoped with `vendor_id`.

## Admin APIs

- `marketplace-stable-entry.mjs` and `marketplace-api-gateway.mjs` — entry/routing.
- `marketplace-admin-variations.mjs` — variation administration.
- `vendor-admin-api-compat.mjs` / capabilities wrapper — legacy/admin compatibility.

## Inventory contract

1. The public order service in `worker.mjs` is the only place that decrements product/variation stock during checkout.
2. Simple finite-stock products use `products.stock_mode='tracked'`; legacy products with a positive stock value are promoted to tracked on their first reservation.
3. Variable products use `product_variations.stock_mode='tracked'`.
4. Every successful reservation writes a row to `marketplace_inventory_holds` in the same D1 batch as the order and stock update.
5. If any conditional stock update fails, the D1 batch fails and the order/stock changes roll back together.
6. Vendor cancellation restores only the holds belonging to that vendor order and marks each hold `restored_at`, making restoration idempotent.

## Do not

- Add another post-order stock decrement in a router/wrapper.
- Bypass vendor ownership predicates.
- Reintroduce browser `alert()`, `prompt()`, or `confirm()` in marketplace UI.
- Deploy this hardening branch to production without browser/E2E verification.
