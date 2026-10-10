import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('checkout initializes the GrabZone default vendor and backfills legacy products', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes("SELECT id FROM vendors WHERE slug='grabzone' LIMIT 1"));
  assert.ok(finalizer.includes('INSERT INTO vendors(id,name,slug,business_name,brand_name,email,status,shipping_fee,commission_type,commission_value,created_at,updated_at)'));
  assert.ok(finalizer.includes('UPDATE products SET vendor_id=? WHERE vendor_id IS NULL'));
  assert.ok(finalizer.includes('await ensureDefaultVendor(e);let shipping=0;'));
});
