import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('checkout sends the selected vendor ID but the server calculates the discount', () => {
  const checkout = read('checkout.js');
  const worker = read('worker.js');
  assert.ok(checkout.includes('vendor_coupon_vendor_id:vendorCouponState.vendor_id||null'));
  assert.ok(worker.includes('vendorCouponDiscount=Math.max(0,Math.min(rawCouponDiscount,vendorSubtotal))'));
  assert.ok(worker.includes('rewardsVoucherDiscount=Math.min(subtotal,Math.max(0,Number(rewardsVoucherRow.value||0)))'));
});

test('confirmation email uses the server-calculated order total', () => {
  const checkout = read('checkout.js');
  assert.ok(checkout.includes('total:Number(order.total??Math.max(0,subtotal()+shipping-Number(referralState.discount||0)-Number(order.vendor_coupon_discount||vendorCouponState.discount||0)'));
});
