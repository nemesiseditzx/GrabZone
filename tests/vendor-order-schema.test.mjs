import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('vendor order listing aliases the real D1 total column instead of querying a missing column', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes('o.payment_method,o.shipping_charge,o.total total_amount,o.subtotal order_subtotal'));
  assert.ok(!finalizer.includes('o.payment_method,o.shipping_charge,o.total_amount,o.subtotal order_subtotal'));
});

test('vendor notification fields are migrated for the legacy vendors table', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes('ALTER TABLE vendors ADD COLUMN email TEXT'));
  assert.ok(finalizer.includes('ALTER TABLE vendors ADD COLUMN order_notification_email TEXT'));
});
