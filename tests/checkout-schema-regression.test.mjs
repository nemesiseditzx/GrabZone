import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('public checkout passes through vendor order finalizer', () => {
  const entry = read('marketplace-stable-entry.mjs');
  assert.ok(entry.includes("if(probeOrder?.fn==='create_public_order'){return vendorFinalizer.fetch(req,env,ctx,"));
  assert.ok(entry.includes('vendorFinalizer.fetch(req,env,ctx,(r)=>vendorGenerator.fetch'));
  assert.ok(entry.includes('vendorV2.fetch(x,env,ctx,(y)=>legacyWorker.fetch(y,env,ctx))'));
});

test('vendor finalizer initializes schema before vendor session authentication', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes('async function vendor(r,e){await schema(e);'));
  for (const migration of [
    'ALTER TABLE products ADD COLUMN vendor_id TEXT',
    'ALTER TABLE vendors ADD COLUMN brand_name TEXT',
    'ALTER TABLE vendors ADD COLUMN business_name TEXT',
    'ALTER TABLE vendors ADD COLUMN shipping_fee REAL NOT NULL DEFAULT 130',
    'CREATE TABLE IF NOT EXISTS product_variations',
    'CREATE TABLE IF NOT EXISTS variation_images',
    'ALTER TABLE vendor_orders ADD COLUMN commission_amount REAL NOT NULL DEFAULT 0',
    'ALTER TABLE vendor_orders ADD COLUMN vendor_earnings REAL NOT NULL DEFAULT 0'
  ]) assert.ok(finalizer.includes(migration), 'missing migration: ' + migration);
});

test('vendor orders are generated after the underlying public order succeeds', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes('await snapshot(e,o.id,payload);await createVendorOrders(e,o.id);'));
  assert.ok(finalizer.includes('if(!r.ok){await restoreInventory(e,held);return r}'));
});

test('checkout remains COD and core data tables remain in schema', () => {
  const worker = read('worker.js');
  const schema = read('d1-schema.sql');
  assert.ok(worker.includes('"Cash on Delivery"'));
  for (const table of ['products','orders','order_items','vendors','vendor_users','vendor_orders','vendor_order_items','shipments','vendor_payouts','customer_points','grabpoints_ledger','membership_tiers','referral_codes','rewards_vouchers']) {
    assert.ok(schema.includes('CREATE TABLE IF NOT EXISTS ' + table + '('), 'missing core table: ' + table);
  }
});

test('Cloudflare bindings and current Meta Pixel ID remain intact', () => {
  assert.ok(read('wrangler.jsonc').includes('"binding": "DB"'));
  assert.ok(read('wrangler.jsonc').includes('"binding": "ASSETS_BUCKET"'));
  assert.ok(read('index.html').includes('1625544792515582'));
});
