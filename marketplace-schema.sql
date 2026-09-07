-- GrabZone Multi-Vendor Marketplace foundation
-- Development branch only. Existing orders/products remain the parent system.
-- COD settlement model: customer payment is collected by the supplier/vendor; GrabZone records only its platform charge.

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  tagline TEXT,
  accent_color TEXT,
  category TEXT,
  business_email TEXT,
  support_email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  show_on_homepage INTEGER NOT NULL DEFAULT 1,
  featured_on_homepage INTEGER NOT NULL DEFAULT 0,
  commission_type TEXT NOT NULL DEFAULT 'percentage',
  commission_value REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vendors_status_idx ON vendors(status);
CREATE INDEX IF NOT EXISTS vendors_homepage_idx ON vendors(show_on_homepage,featured_on_homepage);

CREATE TABLE IF NOT EXISTS vendor_users (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'vendor_admin',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vendor_users_vendor_idx ON vendor_users(vendor_id,active);

CREATE TABLE IF NOT EXISTS vendor_store_settings (
  vendor_id TEXT PRIMARY KEY,
  announcement TEXT,
  about TEXT,
  hero_title TEXT,
  hero_description TEXT,
  featured_product_ids TEXT NOT NULL DEFAULT '[]',
  sections TEXT NOT NULL DEFAULT '[]',
  social_links TEXT NOT NULL DEFAULT '{}',
  custom_css TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendor_shipping_settings (
  vendor_id TEXT PRIMARY KEY,
  shipping_fee REAL NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendor_email_settings (
  vendor_id TEXT PRIMARY KEY,
  order_notification_email TEXT,
  support_email TEXT,
  customer_email_notifications INTEGER NOT NULL DEFAULT 1,
  vendor_email_notifications INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendor_orders (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  shipping_charge REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'New',
  admin_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(order_id,vendor_id)
);
CREATE INDEX IF NOT EXISTS vendor_orders_vendor_idx ON vendor_orders(vendor_id,created_at DESC);
CREATE INDEX IF NOT EXISTS vendor_orders_order_idx ON vendor_orders(order_id,vendor_id);
CREATE INDEX IF NOT EXISTS vendor_orders_status_idx ON vendor_orders(vendor_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  vendor_order_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  shipment_tracking_id TEXT NOT NULL,
  courier_name TEXT,
  courier_tracking_number TEXT,
  courier_tracking_url TEXT,
  status TEXT NOT NULL DEFAULT 'Processing',
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS shipments_order_idx ON shipments(order_id,created_at);
CREATE INDEX IF NOT EXISTS shipments_vendor_idx ON shipments(vendor_id,created_at DESC);
CREATE INDEX IF NOT EXISTS shipments_tracking_idx ON shipments(shipment_tracking_id);
CREATE INDEX IF NOT EXISTS shipments_courier_tracking_idx ON shipments(courier_tracking_number);

CREATE TABLE IF NOT EXISTS shipment_items (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  order_item_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(shipment_id,order_item_id)
);
CREATE INDEX IF NOT EXISTS shipment_items_shipment_idx ON shipment_items(shipment_id);

CREATE TABLE IF NOT EXISTS vendor_payouts (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  vendor_order_id TEXT NOT NULL,
  gross_amount REAL NOT NULL DEFAULT 0,
  commission_amount REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'cod_commission_due',
  paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vendor_payouts_vendor_idx ON vendor_payouts(vendor_id,created_at DESC);

-- Seed the platform's own vendor identity. This does not alter existing products.
INSERT OR IGNORE INTO vendors
(id,name,slug,description,category,status,show_on_homepage,featured_on_homepage,commission_type,commission_value,created_at,updated_at)
VALUES
('vendor_grabzone','GRABZONE','grabzone','Official GrabZone products','Marketplace','active',1,1,'percentage',0,datetime('now'),datetime('now'));

INSERT OR IGNORE INTO vendor_shipping_settings(vendor_id,shipping_fee,enabled,updated_at)
VALUES('vendor_grabzone',0,1,datetime('now'));

INSERT OR IGNORE INTO vendor_store_settings(vendor_id,featured_product_ids,sections,social_links,updated_at)
VALUES('vendor_grabzone','[]','[]','{}',datetime('now'));

INSERT OR IGNORE INTO vendor_email_settings(vendor_id,customer_email_notifications,vendor_email_notifications,updated_at)
VALUES('vendor_grabzone',1,1,datetime('now'));
