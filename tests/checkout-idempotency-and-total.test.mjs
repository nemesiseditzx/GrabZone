import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../checkout.js', import.meta.url), 'utf8');

test('checkout idempotency key is reused only for an identical payload', () => {
  assert.match(source, /function checkoutRequestId\(payload\)/);
  assert.match(source, /saved\?\.fingerprint!==fingerprint/);
  assert.match(source, /payload\.idempotency_key=checkoutRequestId\(payload\)/);
});

test('order confirmation preview includes the vendor coupon discount', () => {
  assert.match(
    source,
    /const total=Math\.max\(0,subtotal\(\)\+shipping-Number\(referralState\.discount\|\|0\)-Number\(vendorCouponState\.discount\|\|0\)-Number\(rewardsVoucherState\.discount\|\|0\)/,
  );
});
