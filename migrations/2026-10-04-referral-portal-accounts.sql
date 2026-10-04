-- Referral portal accounts grouped by shared email (2026-10-04)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS referral_portal_accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT,
  password_salt TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS referral_portal_accounts_active_idx
  ON referral_portal_accounts(active,created_at DESC);
CREATE INDEX IF NOT EXISTS referral_codes_admin_email_idx
  ON referral_codes(admin_email);

-- The worker runtime schema upgrade adds account_id to existing referral_portal_sessions safely.
