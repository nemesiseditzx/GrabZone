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
  assert.ok(worker.includes("UPDATE product_variations SET stock=CASE WHEN lower(COALESCE(stock_mode,'untracked'))='tracked' THEN stock-? ELSE stock END"));
});

test('checkout request key is stored with the order transaction and replay-safe', () => {
  assert.ok(worker.includes('CREATE TABLE IF NOT EXISTS order_idempotency'));
  assert.ok(worker.includes('INSERT INTO order_idempotency(idempotency_key,request_hash,order_id,created_at)'));
  assert.ok(worker.includes('WHERE oi.idempotency_key=? LIMIT 1'));
  assert.ok(checkout.includes('idempotency_key:checkoutRequestId()'));
  assert.ok(checkout.includes('sessionStorage.removeItem(CHECKOUT_REQUEST_KEY)'));
});

test('checkout snapshots variation options, SKU and image from D1, not browser payload', () => {
  assert.ok(worker.includes('SELECT po.name,ov.value FROM variation_options vo'));
  assert.ok(worker.includes('variation_options:variationOptions,variation_sku:variationSku'));
  assert.ok(!worker.includes('variation_options:x.variation_options'));
  assert.ok(!worker.includes('variation_sku:x.variation_sku||x.sku'));
});
