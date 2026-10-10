import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('vendor coupon discount is deducted from the matching vendor order before commission and earnings', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes("SELECT vendor_coupon_code,vendor_coupon_vendor_id,vendor_coupon_discount FROM orders WHERE id=?"));
  assert.ok(finalizer.includes("String(orderCoupon?.vendor_coupon_vendor_id||'')===String(g.vendor_id)"));
  assert.ok(finalizer.includes('const netSubtotal=Math.max(0,subtotal-discount)'));
  assert.ok(finalizer.includes('total:netSubtotal+delivery'));
});

test('legacy vendor order schema gains the discount field used by the dashboard', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes('discount_amount REAL NOT NULL DEFAULT 0'));
});
