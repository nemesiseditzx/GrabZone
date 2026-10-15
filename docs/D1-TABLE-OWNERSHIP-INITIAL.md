# Initial D1 Ownership Audit

Branch: vendor-system-dev
Status: provisional source inventory, not a migration instruction.

## Source findings

- Base d1-schema.sql defines 30 tables.
- Additional runtime DDL exists in worker.mjs, marketplace-stable-entry.mjs, vendor-marketplace-complete.mjs, vendor-system-v2.mjs, marketplace-schema-wrapper.mjs, rewards-eligibility-api.mjs, and survey-system.mjs.
- Existing Wrangler configs share one D1 ID and one R2 bucket.
- Direct SQL calls and joins currently depend on a shared D1 binding.

## Provisional ownership

### Marketplace D1 candidates
Catalog and variation tables: products, product_images, product_reviews, product_options, option_values, product_variations, variation_options, variation_images, vendor_product_images.
Vendor and fulfillment tables: vendors, vendor_products, vendor_users, vendor_sessions, vendor_store_settings, vendor_settings, vendor_store_sections, vendor_shipping_settings, vendor_email_settings, vendor_coupons, inventory_log.
Order tables: orders, order_items, vendor_orders, vendor_order_items, shipments, shipment_items, vendor_payouts.
Marketplace settings: site_settings, marketplace_settings, marketplace_categories, marketplace_audit_log, notices, billboards, billboard_settings, store_policies.
Commerce-linked rewards/referrals: customer_points, grabpoints_ledger, rewards_vouchers, rewards_tx_guard, membership_tiers, mystery_claims, rewards_order_allocations, vendor_rewards_settings, product_rewards_eligibility, referrals, referral_rewards, referral_codes, member_referral_codes, member_referrals, referral_profit_orders, referral_profit_items, referral_payouts.

These are candidates because current order, stock, vendor, rewards and referral code paths share IDs and transaction state. Final ownership must follow the full query/write-set audit.

### Admin D1 candidates
admin_users, admin_sessions, and admin-only configuration/audit records where moving them does not break authorization. Existing code currently joins admin sessions/users with marketplace records, so those queries must become authenticated service calls before any split.

### Customer D1 remains unresolved
The base schema has no general-purpose customers profile table. Customer identity-like state currently overlaps rewards-related records such as rewards_members, rewards_otp, and rewards_auth_config; order rows also contain customer contact/address fields. Reward functions read/write orders, points, vouchers and ledger state. Do not move these tables by name alone: determine identity/profile ownership separately from commerce-linked reward transactions.

## Transaction risks

1. COD order creation may write multiple order/vendor/stock/reward/referral records.
2. Vendor/admin auth paths currently perform joins across users, sessions and vendors.
3. Native D1 transactions do not span separate databases.
4. Runtime schema setup must be inventoried and migrated safely.
5. Cross-account REST calls are not a distributed transaction mechanism.

## Gates before data movement

- Complete the query-to-table inventory and exact order/reward write-set map.
- Verify live schema using owner-provisioned, read-only credentials.
- Approve the final ownership matrix and service API contracts.
- Test the REST adapter against disposable D1 resources.
- Reconcile IDs, counts, relationships and rollback before cutover.

No production data or binding has been changed. This document is provisional and must not be used as a live migration plan until the gates above pass.
