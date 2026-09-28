-- GrabZone Rewards & Referral eligibility foundation
-- Idempotent migration. Existing customer_points/grabpoints_ledger and referral_codes are preserved.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rewards_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  referral_enabled INTEGER NOT NULL DEFAULT 0 CHECK (referral_enabled IN (0,1)),
  gp_value_bdt REAL NOT NULL DEFAULT 0.1 CHECK (gp_value_bdt >= 0),
  redemption_min_gp INTEGER NOT NULL DEFAULT 0 CHECK (redemption_min_gp >= 0),
  redemption_max_percent REAL NOT NULL DEFAULT 100 CHECK (redemption_max_percent BETWEEN 0 AND 100),
  referral_discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (referral_discount_type IN ('fixed','percentage')),
  referral_discount_value REAL NOT NULL DEFAULT 0 CHECK (referral_discount_value >= 0),
  referral_discount_cap_bdt REAL CHECK (referral_discount_cap_bdt IS NULL OR referral_discount_cap_bdt >= 0),
  referral_min_order_bdt REAL NOT NULL DEFAULT 0 CHECK (referral_min_order_bdt >= 0),
  referrer_reward_gp INTEGER NOT NULL DEFAULT 0 CHECK (referrer_reward_gp >= 0),
  referral_funding_source TEXT NOT NULL DEFAULT 'unconfigured' CHECK (referral_funding_source IN ('unconfigured','admin','vendor','mixed')),
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO rewards_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS rewards_tiers (
  tier_key TEXT PRIMARY KEY CHECK (tier_key IN ('Silver','Gold','Platinum')),
  min_qualifying_gp INTEGER NOT NULL DEFAULT 0 CHECK (min_qualifying_gp >= 0),
  cashback_percent REAL NOT NULL DEFAULT 0 CHECK (cashback_percent BETWEEN 0 AND 100),
  benefits_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_rewards_settings (
  vendor_id TEXT PRIMARY KEY,
  rewards_enabled INTEGER NOT NULL DEFAULT 0 CHECK (rewards_enabled IN (0,1)),
  referral_enabled INTEGER NOT NULL DEFAULT 0 CHECK (referral_enabled IN (0,1)),
  eligible_store_layout INTEGER NOT NULL DEFAULT 0 CHECK (eligible_store_layout IN (0,1)),
  eligibility_status TEXT NOT NULL DEFAULT 'inactive' CHECK (eligibility_status IN ('active','inactive')),
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_rewards_eligibility (
  product_id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  rewards_eligible INTEGER NOT NULL DEFAULT 0 CHECK (rewards_eligible IN (0,1)),
  referral_eligible INTEGER NOT NULL DEFAULT 0 CHECK (referral_eligible IN (0,1)),
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS product_rewards_vendor_idx ON product_rewards_eligibility(vendor_id, rewards_eligible, referral_eligible);

CREATE TABLE IF NOT EXISTS rewards_order_allocations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  order_item_id TEXT,
  vendor_id TEXT,
  product_id TEXT,
  qualifying_subtotal_bdt REAL NOT NULL DEFAULT 0 CHECK (qualifying_subtotal_bdt >= 0),
  referral_discount_bdt REAL NOT NULL DEFAULT 0 CHECK (referral_discount_bdt >= 0),
  cashback_gp INTEGER NOT NULL DEFAULT 0 CHECK (cashback_gp >= 0),
  referral_reward_gp INTEGER NOT NULL DEFAULT 0 CHECK (referral_reward_gp >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','reversed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS rewards_alloc_order_idx ON rewards_order_allocations(order_id);
CREATE INDEX IF NOT EXISTS rewards_alloc_vendor_idx ON rewards_order_allocations(vendor_id,status);

CREATE TABLE IF NOT EXISTS referral_customer_links (
  id TEXT PRIMARY KEY,
  referral_code TEXT NOT NULL,
  referrer_phone TEXT,
  referred_phone TEXT NOT NULL,
  first_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','rewarded','reversed','blocked')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(referred_phone)
);
CREATE INDEX IF NOT EXISTS referral_links_code_idx ON referral_customer_links(referral_code,status);

CREATE TABLE IF NOT EXISTS rewards_audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS rewards_audit_created_idx ON rewards_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS rewards_audit_entity_idx ON rewards_audit_logs(entity_type,entity_id,created_at DESC);
