-- GrabZone Rewards, Referral & Eligible Store foundation
-- Additive migration: preserves existing rewards, referral, orders, and vendor data.
-- Financial values intentionally remain NULL until existing settings are audited and mapped.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rewards_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 1,
  gp_value_bdt REAL,
  referral_reward_points INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendor_rewards_settings (
  vendor_id TEXT PRIMARY KEY,
  rewards_enabled INTEGER NOT NULL DEFAULT 0,
  referral_enabled INTEGER NOT NULL DEFAULT 0,
  eligible_store_layout INTEGER NOT NULL DEFAULT 0,
  eligibility_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (eligibility_status IN ('active', 'inactive')),
  updated_by TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vendor_rewards_settings_active_idx
  ON vendor_rewards_settings(eligibility_status, rewards_enabled, referral_enabled);

CREATE TABLE IF NOT EXISTS product_rewards_eligibility (
  product_id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  rewards_eligible INTEGER NOT NULL DEFAULT 0,
  referral_eligible INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_eligible'
    CHECK (status IN ('eligible', 'not_eligible')),
  updated_by TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS product_rewards_vendor_idx
  ON product_rewards_eligibility(vendor_id, status);
CREATE INDEX IF NOT EXISTS product_rewards_flags_idx
  ON product_rewards_eligibility(rewards_eligible, referral_eligible);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_member_id TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referred_member_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified', 'rewarded', 'reversed', 'blocked')),
  qualifying_order_id TEXT,
  created_at TEXT NOT NULL,
  qualified_at TEXT,
  rewarded_at TEXT
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx
  ON referrals(referrer_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referrals_referred_idx
  ON referrals(referred_member_id);
CREATE INDEX IF NOT EXISTS referrals_order_idx
  ON referrals(qualifying_order_id);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  referrer_member_id TEXT NOT NULL,
  referred_member_id TEXT,
  discount_amount REAL NOT NULL DEFAULT 0,
  reward_points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'reversed')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  reversed_at TEXT,
  UNIQUE(referral_id, order_id)
);
CREATE INDEX IF NOT EXISTS referral_rewards_referrer_idx
  ON referral_rewards(referrer_member_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS rewards_order_allocations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  order_item_id TEXT,
  vendor_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  rewards_eligible INTEGER NOT NULL DEFAULT 0,
  referral_eligible INTEGER NOT NULL DEFAULT 0,
  qualifying_subtotal REAL NOT NULL DEFAULT 0,
  referral_discount REAL NOT NULL DEFAULT 0,
  cashback_percent REAL NOT NULL DEFAULT 0,
  cashback_points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'reversed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(order_id, order_item_id)
);
CREATE INDEX IF NOT EXISTS rewards_alloc_order_idx
  ON rewards_order_allocations(order_id, status);
CREATE INDEX IF NOT EXISTS rewards_alloc_vendor_idx
  ON rewards_order_allocations(vendor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rewards_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  vendor_id TEXT,
  product_id TEXT,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS rewards_audit_logs_vendor_idx
  ON rewards_audit_logs(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rewards_audit_logs_product_idx
  ON rewards_audit_logs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rewards_audit_logs_admin_idx
  ON rewards_audit_logs(admin_id, created_at DESC);
