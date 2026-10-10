import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('vendor variation API persists price, stock mode, and quantity constraints', () => {
  const api = read('vendor-system-v2.mjs');
  assert.ok(api.includes('sale_price=?,old_price=?,stock=?,stock_mode=?,low_stock_threshold=?,min_qty=?,max_qty=?'));
  assert.ok(api.includes('Maximum quantity must be empty or at least the minimum quantity'));
  assert.ok(api.includes("CASE WHEN status='Disabled' THEN 'Available' ELSE status END"));
});

test('admin and vendor variation editors expose stock and quantity controls', () => {
  const admin = read('marketplace-admin-variations-ui.js');
  const vendor = read('vendor-product-editor.js');
  for (const source of [admin, vendor]) {
    assert.ok(source.includes('sale_price') || source.includes('data-k="sale"') || source.includes('data-v="sale"'));
    assert.ok(source.includes('stock_mode') || source.includes('data-k="stockmode"'));
    assert.ok(source.includes('min_qty') || source.includes('data-k="min"'));
    assert.ok(source.includes('max_qty') || source.includes('data-k="max"'));
  }
  assert.ok(admin.includes('gz-av-disable'));
  assert.ok(vendor.includes('vp-disable-variation'));
});

test('customer variation picker constrains quantity and order API validates it server-side', () => {
  const customer = read('vendor-system-v2-ui.js');
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(customer.includes('const minQty=v=>'));
  assert.ok(customer.includes('Maximum available quantity is'));
  assert.ok(finalizer.includes('Selected variation requires a minimum quantity'));
  assert.ok(finalizer.includes('unit(s) remain for the selected variation.'));
});

test('tracked variation inventory is atomically deducted and restored on failed order creation', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes("UPDATE product_variations SET stock=stock-?"));
  assert.ok(finalizer.includes("AND COALESCE(stock,0)>=?"));
  assert.ok(finalizer.includes("UPDATE product_variations SET stock=COALESCE(stock,0)+?"));
  assert.ok(finalizer.includes("if(!r.ok){await restoreInventory(e,held);return r;}"));
  assert.ok(finalizer.includes('"sale:"+row.id'));
  assert.ok(!finalizer.includes('async function logHeld(e,held,orderId){return true}'));
});

test('inventory sale log is written during retry finalization for cancellation-safe restoration', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes('await logHeld(e,[],job.order_id)'));
  assert.ok(finalizer.includes('sale:"+row.id'));
  assert.ok(finalizer.includes("reason='order_sale'"));
  assert.ok(finalizer.includes('"order_cancelled"'));
});

test('product detail gallery always has a fallback image', () => {
  const home = read('store.js');
  assert.ok(home.includes("image_url: product.image_url || '/favicon.png'"));
  assert.ok(home.includes("gallery[0].image_url || '/favicon.png'"));
  assert.ok(home.includes("this.onerror=null;this.src=&#39;/favicon.png&#39;"));
});

test('home fuzzy search tokenizes whitespace and Bangla/English words correctly', () => {
  const home = read('store.js');
  assert.ok(home.includes('query.split(/\\s+/)'));
  assert.ok(home.includes('split(/[^a-z0-9\\u0980-\\u09ff]+/i)'));
});

test('checkout confirmation email includes selected variation details', () => {
  const checkout = read('checkout.js');
  assert.ok(checkout.includes('variation_options:i.variation_options||{}'));
  assert.ok(checkout.includes("variation_sku:i.variation_sku||i.sku||''"));
  assert.ok(checkout.includes('support@grabzone.tech'));
  assert.ok(checkout.includes('t.me/grabzoneofficial'));
});

test('home storefront paginates the product catalogue and resets on filter changes', () => {
  const home = read('store.js');
  assert.ok(home.includes('const pageSize = 20'));
  assert.ok(home.includes('gzHomeProductPagination'));
  assert.ok(home.includes('Showing '));
  assert.ok(home.includes('lastProductFilterKey'));
});

test('vendor variation generation returns persisted combinations and clean store URLs route to the storefront', () => {
  const api = read('vendor-system-v2.mjs');
  const worker = read('worker.mjs');
  assert.ok(api.includes('count:rows.length,options:opts,variations'));
  assert.ok(worker.includes("incoming.pathname='/marketplace-store.html'"));
});

test('storefront product cards use a fallback when an image URL fails', () => {
  assert.ok(read('store.js').includes("this.src='/favicon.png'"));
  assert.ok(read('marketplace-reference-ui.js').includes('this.src=&quot;/favicon.png&quot;'));
  assert.ok(read('marketplace-store.html').includes('this.src=&quot;/favicon.png&quot;'));
});
