import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('public checkout is routed through the vendor order finalizer before the legacy D1 handler', () => {
  const entry = read('marketplace-stable-entry.mjs');
  assert.match(
    entry,
    /if\(probeOrder\?\.fn==='create_public_order'\)\{return vendorFinalizer\.fetch\(req,env,ctx,/
  );
  assert.match(entry, /vendorFinalizer\.fetch\(req,env,ctx,\(r\)=>vendorGenerator\.fetch/);
  assert.match(entry, /vendorV2\.fetch\(x,env,ctx,\(y\)=>legacyWorker\.fetch\(y,env,ctx\)\)/);
});

test('checkout finalizer creates vendor orders after the base order has been created', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.match(finalizer, /async function createOrder\(/);
  assert.match(finalizer, /if\(o\?\.id\)\{await snapshot\(e,o\.id,payload\);await createVendorOrders\(e,o\.id\);/);
  assert.match(finalizer, /if\(!r\.ok\)\{await restoreInventory\(e,held\);return r\}/);
});

test('the current checkout contract remains Cash on Delivery', () => {
  const worker = read('worker.js');
  assert.match(worker, /"Cash on Delivery"/);
});

test('the main D1 schema keeps core marketplace and rewards tables', () => {
  const schema = read('d1-schema.sql');
  for (const table of [
    'products',
    'product_images',
    'orders',
    'order_items',
    'vendors',
    'vendor_users',
    'vendor_orders',
    'shipments',
    'vendor_payouts',
    'customer_points',
    'grabpoints_ledger',
    'membership_tiers',
    'referral_codes',
    'rewards_vouchers'
  ]) {
    assert.match(schema, new RegExp('CREATE TABLE IF NOT EXISTS ' + table + '\\b', 'i'), table + ' table must remain in the schema');
  }
});

test('Cloudflare bindings and current Meta Pixel ID are preserved', () => {
  const wrangler = read('wrangler.jsonc');
  const index = read('index.html');
  assert.match(wrangler, /"binding":\s*"DB"/);
  assert.match(wrangler, /"binding":\s*"ASSETS_BUCKET"/);
  assert.match(index, /1625544792515582/);
});
