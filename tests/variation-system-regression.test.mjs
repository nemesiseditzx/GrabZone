import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('vendor variation API persists price, stock mode, and quantity constraints', () => {
  const api = read('vendor-system-v2.mjs');
  assert.match(api, /sale_price=\?,old_price=\?,stock=\?,stock_mode=\?,low_stock_threshold=\?,min_qty=\?,max_qty=\?/);
  assert.match(api, /Maximum quantity must be empty or at least the minimum quantity/);
  assert.match(api, /CASE WHEN status='Disabled' THEN 'Available' ELSE status END/);
});

test('admin and vendor variation editors expose stock and quantity controls', () => {
  const admin = read('marketplace-admin-variations-ui.js');
  const vendor = read('vendor-product-editor.js');
  for (const source of [admin, vendor]) {
    assert.match(source, /sale_price|data-k="sale"|data-v="sale"/);
    assert.match(source, /stock_mode|data-k="stockmode"/);
    assert.match(source, /min_qty|data-k="min"/);
    assert.match(source, /max_qty|data-k="max"/);
  }
  assert.match(admin, /gz-av-disable/);
  assert.match(vendor, /vp-disable-variation/);
});

test('customer variation picker constrains quantity and order API validates it server-side', () => {
  const customer = read('vendor-system-v2-ui.js');
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.match(customer, /const minQty=v=>/);
  assert.match(customer, /Maximum available quantity is/);
  assert.match(finalizer, /Selected variation requires a minimum quantity/);
  assert.match(finalizer, /Only '\+Number\(v\.stock\|\|0\)\+' unit\(s\) remain/);
});

test('checkout confirmation email includes selected variation details', () => {
  const checkout = read('checkout.js');
  assert.match(checkout, /variation_options:i\.variation_options\|\|\{\}/);
  assert.match(checkout, /variation_sku:i\.variation_sku\|\|i\.sku\|\|''/);
  assert.match(checkout, /support@grabzone\.tech/);
  assert.match(checkout, /t\.me\/grabzoneofficial/);
});

test('storefront product cards use a fallback when an image URL fails', () => {
  assert.match(read('store.js'), /onerror="this\.onerror=null;this\.src='\/favicon\.png'"/);
  assert.match(read('marketplace-reference-ui.js'), /onerror="this\.onerror=null;this\.src='\/favicon\.png'"/);
  assert.match(read('marketplace-store.html'), /onerror="this\.onerror=null;this\.src='\/favicon\.png'"/);
});
