-- Referral Profit Portal
-- Global referral percentage, product costs, referrer portal auth and immutable profit snapshots.
PRAGMA foreign_keys = ON;

ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN additional_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE site_settings ADD COLUMN referral_profit_percent REAL NOT NULL DEFAULT 50;
ALTER TABLE referral_codes ADD COLUMN portal_password_hash TEXT;
ALTER TABLE referral_codes ADD COLUMN portal_password_salt TEXT;
ALTER TABLE referral_codes ADD COLUMN portal_active INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS referral_profit_orders (
  id TEXT PRIMARY KEY,
  referral_code TEXT NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  order_number TEXT NOT NULL,
  order_amount REAL NOT NULL DEFAULT 0,
  eligible_revenue REAL NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  net_profit REAL NOT NULL DEFAULT 0,
  referral_percent REAL NOT NULL DEFAULT 50,
  referral_profit REAL NOT NULL DEFAULT 0,
  grabzone_profit REAL NOT NULL DEFAULT 0,
  profit_status TEXT NOT NULL DEFAULT 'pending',
  payout_status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS referral_profit_orders_code_idx
  ON referral_profit_orders(referral_code,created_at DESC);
CREATE INDEX IF NOT EXISTS referral_profit_orders_status_idx
  ON referral_profit_orders(referral_code,profit_status,payout_status,created_at DESC);

CREATE TABLE IF NOT EXISTS referral_profit_items (
  id TEXT PRIMARY KEY,
  referral_profit_order_id TEXT NOT NULL,
  order_item_id TEXT,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  selling_revenue REAL NOT NULL DEFAULT 0,
  allocated_discount REAL NOT NULL DEFAULT 0,
  eligible_revenue REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  additional_cost REAL NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  net_profit REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS referral_profit_items_order_idx
  ON referral_profit_items(referral_profit_order_id);

CREATE TABLE IF NOT EXISTS referral_portal_sessions (
  token_hash TEXT PRIMARY KEY,
  referral_code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS referral_portal_sessions_code_idx
  ON referral_portal_sessions(referral_code,expires_at);

CREATE TABLE IF NOT EXISTS referral_payouts (
  id TEXT PRIMARY KEY,
  referral_code TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid',
  reference TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS referral_payouts_code_idx
  ON referral_payouts(referral_code,created_at DESC);
