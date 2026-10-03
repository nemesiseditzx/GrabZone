-- GrabZone vendor-owned coupon system
CREATE TABLE IF NOT EXISTS vendor_coupons (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'fixed',
  discount_value REAL NOT NULL DEFAULT 0,
  min_order_amount REAL NOT NULL DEFAULT 0,
  max_discount_amount REAL,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  expires_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS vendor_coupons_code_uq ON vendor_coupons(upper(code));
CREATE INDEX IF NOT EXISTS vendor_coupons_vendor_idx ON vendor_coupons(vendor_id,active,created_at DESC);

ALTER TABLE orders ADD COLUMN vendor_coupon_code TEXT;
ALTER TABLE orders ADD COLUMN vendor_coupon_vendor_id TEXT;
ALTER TABLE orders ADD COLUMN vendor_coupon_discount REAL NOT NULL DEFAULT 0;

ALTER TABLE vendor_orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE vendor_orders ADD COLUMN coupon_code TEXT;

CREATE INDEX IF NOT EXISTS orders_vendor_coupon_idx ON orders(vendor_coupon_vendor_id,vendor_coupon_code);
