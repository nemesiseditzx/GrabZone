import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../vendor-system-finalizer.mjs', import.meta.url), 'utf8');

test('vendor cancellation restores only its tracked order-item movements', () => {
  const start = source.indexOf('async function restoreVendorOrderInventory');
  const end = source.indexOf('async function logHeld', start);
  assert.ok(start >= 0 && end > start, 'vendor restock handler must exist');
  const handler = source.slice(start, end);
  assert.match(handler, /FROM vendor_order_items voi JOIN vendor_orders vo/);
  assert.match(handler, /sale\.order_id=vo\.order_id/);
  assert.match(handler, /vo\.vendor_id=\?/);
  assert.match(handler, /movement_type='sale'/);
  assert.match(handler, /movement_type='restock'/);
  assert.match(handler, /restockMovements\(e,rows\)/);
});

test('restock is atomic and idempotent for both products and variations', () => {
  const start = source.indexOf('async function restockMovements');
  const end = source.indexOf('async function restoreInventory', start);
  assert.ok(start >= 0 && end > start, 'shared restock helper must exist');
  const helper = source.slice(start, end);
  assert.match(helper, /INSERT OR IGNORE INTO order_inventory_movements/);
  assert.match(helper, /UPDATE product_variations SET stock=COALESCE\(stock,0\)\+\?/);
  assert.match(helper, /UPDATE products SET stock=COALESCE\(stock,0\)\+\?/);
  assert.match(helper, /changes\(\)=1/);
  assert.match(helper, /await e\.DB\.batch\(statements\)/);
  assert.doesNotMatch(helper, /return true/);
  assert.doesNotMatch(helper, /CREATE TABLE IF NOT EXISTS/);
});

test('vendor status reads the prior status and prevents reopening a cancelled order', () => {
  const start = source.indexOf('async function status');
  const end = source.indexOf('async function dashboard', start);
  assert.ok(start >= 0 && end > start, 'vendor status handler must exist');
  const handler = source.slice(start, end);
  assert.match(handler, /SELECT vo\.id,vo\.order_id,vo\.status,o\.order_number/);
  assert.match(handler, /previous==='cancelled'&&b\.status!=='Cancelled'/);
  assert.match(handler, /restoreVendorOrderInventory\(e,vo\.id,u\.vendor_id\)/);
});

test('inventory movement schema is ensured before vendor order status updates', () => {
  assert.match(source, /CREATE TABLE IF NOT EXISTS order_inventory_movements/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS checkout_write_assertions/);
  assert.match(source, /async function logHeld[\s\S]*COUNT\(\*\) n FROM order_inventory_movements/);
});

test('vendor finalizer schema work is cached per isolate and retries real D1 failures', () => {
  assert.match(source, /let vendorFinalizerSchemaPromise/);
  assert.match(source, /if\(vendorFinalizerSchemaPromise\)return vendorFinalizerSchemaPromise/);
  assert.match(source, /vendorFinalizerSchemaPromise=null;throw err/);
  assert.match(source, /duplicate column name\|already exists/);
});
