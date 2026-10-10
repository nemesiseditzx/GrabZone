import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('vendor system v2 initializes legacy session and account columns before authenticating', () => {
  const v2 = read('vendor-system-v2.mjs');
  assert.ok(v2.includes('CREATE TABLE IF NOT EXISTS vendor_sessions'));
  assert.ok(v2.includes("ALTER TABLE vendor_users ADD COLUMN status TEXT NOT NULL DEFAULT 'Active'"));
  assert.ok(v2.includes('ALTER TABLE vendor_users ADD COLUMN active INTEGER NOT NULL DEFAULT 1'));
  assert.ok(v2.includes("LOWER(COALESCE(vu.status,'active'))='active'"));
  assert.ok(v2.includes("LOWER(COALESCE(v.status,'active'))='active'"));
});
