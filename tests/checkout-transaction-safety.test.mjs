import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync('worker.mjs', 'utf8');
const checkout = fs.readFileSync('checkout.js', 'utf8');

test('checkout reserves order numbers atomically instead of MAX(order_no)+1', () => {
  assert.ok(worker.includes('CREATE TABLE IF NOT EXISTS order_sequence'));
  assert.ok(worker.includes('UPDATE order_sequence SET last_value=MAX(last_value,(SELECT COALESCE(MAX(order_no),0) FROM orders))+1 WHERE id=1 RETURNING last_value AS n'));
  assert.ok(!worker.includes('SELECT COALESCE(MAX(order_no),0)+1 AS n FROM orders'));
});

test('order, items, rewards, coupon claims and variation stock commit in one guarded D1 batch', () => {
  assert.ok(worker.includes('CREATE TABLE IF NOT EXISTS checkout_write_assertions'));
  assert.ok(worker.includes('INSERT INTO checkout_write_assertions(id,ok) VALUES(?,changes())'));
  assert.ok(worker.includes('await env.DB.batch(statements)'));
  assert.ok(worker.includes('DELETE FROM checkout_write_assertions WHERE id LIKE ?'));
  assert.ok(worker.includes("UPDATE product_variations SET stock=stock-?,updated_at=? WHERE id=? AND product_id=? AND status='Available' AND lower(COALESCE(stock_mode,'untracked'))='tracked' AND stock>=?"));
});

test('checkout enforces simple product sale pricing and quantity limits from D1', () => {
  assert.ok(worker.includes("ALTER TABLE products ADD COLUMN sale_price REAL"));
  assert.ok(worker.includes("ALTER TABLE products ADD COLUMN product_type TEXT NOT NULL DEFAULT 'simple'"));
  assert.ok(worker.includes('productSale>0&&productSale<productRegular?productSale:productRegular'));
  assert.ok(worker.includes('if(qty<minQty)'));
  assert.ok(worker.includes('if(maxQty!==null&&qty>maxQty)'));
});

test('simple product stock is tracked, reserved, and restored with the same movement journal', () => {
  assert.ok(worker.includes("ALTER TABLE products ADD COLUMN stock_mode TEXT NOT NULL DEFAULT 'untracked'"));
  assert.ok(worker.includes("UPDATE products SET stock=stock-?,updated_at=? WHERE id=? AND published=1 AND stock_mode='tracked' AND stock>=?"));
  assert.ok(worker.includes("UPDATE products SET stock=stock+?,updated_at=? WHERE id=? AND changes()=1"));
  assert.ok(worker.includes('String(item.stock_mode||"untracked").toLowerCase()==="tracked"'));
});

test('checkout request key is stored with the order transaction and replay-safe', () => {
  assert.ok(worker.includes('CREATE TABLE IF NOT EXISTS order_idempotency'));
  assert.ok(worker.includes('INSERT INTO order_idempotency(idempotency_key,request_hash,order_id,created_at)'));
  assert.ok(worker.includes('WHERE oi.idempotency_key=? LIMIT 1'));
  assert.ok(checkout.includes('idempotency_key:checkoutRequestId()'));
  assert.ok(checkout.includes('sessionStorage.removeItem(CHECKOUT_REQUEST_KEY)'));
});

test('vendor order routing uses order snapshots and bulk D1 reads', () => {
  const start = worker.indexOf('async function routeOrderToVendors');
  const end = worker.indexOf('function referralCookie', start);
  const route = worker.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(route.includes('item.vendor_id'));
  assert.ok(route.includes('FROM vendors WHERE id IN'));
  assert.ok(route.includes('SELECT vendor_order_id,order_item_id FROM vendor_order_items WHERE vendor_order_id IN'));
  assert.ok(route.includes('await env.DB.batch(statements)'));
  assert.ok(route.includes('UPDATE vendor_order_items SET vendor_order_id=? WHERE order_item_id=?'));
  assert.ok(worker.includes('vendor_orders_order_vendor_unique'));
  assert.ok(worker.includes('vendor_order_items_order_item_unique'));
});

test('tracked variation stock is journaled and restored once on cancellation', () => {
  assert.ok(worker.includes('CREATE TABLE IF NOT EXISTS order_inventory_movements'));
  assert.ok(worker.includes('UNIQUE(order_item_id,movement_type)'));
  assert.ok(worker.includes('Number(item.quantity),"sale",t'));
  assert.ok(worker.includes('Number(movement.quantity||0),"restock",now()'));
  assert.ok(worker.includes('AND changes()=1'));
  assert.ok(worker.includes('NOT EXISTS(SELECT 1 FROM order_inventory_movements restock'));
});

test('checkout and vendor/admin workflows do not use native dialogs', () => {
  const vendorFinal = fs.readFileSync('vendor-system-final-ui.js', 'utf8');
  const vendorUI = fs.readFileSync('vendor-system-v2-ui.js', 'utf8');
  const adminVariationUI = fs.readFileSync('marketplace-admin-variations-ui.js', 'utf8');
  assert.doesNotMatch(checkout, /window\.confirm\(/);
  for (const source of [vendorFinal, vendorUI, adminVariationUI]) {
    assert.doesNotMatch(source, /prompt\(/);
    assert.doesNotMatch(source, /alert\(/);
  }
});

test('checkout snapshots variation options, SKU and image from D1, not browser payload', () => {
  assert.ok(worker.includes('SELECT po.name,ov.value FROM variation_options vo'));
  assert.ok(worker.includes('variation_options:variationOptions,variation_sku:variationSku'));
  assert.ok(!worker.includes('variation_options:x.variation_options'));
  assert.ok(!worker.includes('variation_sku:x.variation_sku||x.sku'));
});
