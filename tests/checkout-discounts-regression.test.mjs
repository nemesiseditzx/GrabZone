import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('public checkout exposes voucher validation without requiring an admin session', () => {
  const worker = read('worker.js');
  assert.ok(worker.includes('"validate_rewards_voucher","grabpoints_balance"'));
  assert.ok(worker.includes('if(fn==="validate_rewards_voucher")'));
  assert.ok(worker.includes("status='UNUSED' AND expires_at>?"));
});

test('checkout recomputes vendor coupon discount from the vendor coupon row', () => {
  const worker = read('worker.js');
  assert.ok(worker.includes('SELECT c.*,v.status vendor_status FROM vendor_coupons c JOIN vendors v ON v.id=c.vendor_id'));
  assert.ok(worker.includes('vendorCouponDiscount=Math.max(0,Math.min(rawCouponDiscount,vendorSubtotal))'));
  assert.ok(worker.includes('vendor_coupon_vendor_id,vendor_coupon_discount,created_at,updated_at'));
  assert.ok(worker.includes('UPDATE vendor_coupons SET used_count=used_count+1'));
});

test('voucher and coupon claims are released if order persistence fails', () => {
  const worker = read('worker.js');
  assert.ok(worker.includes("SET status='UNUSED',used_at=NULL,used_order_id=NULL"));
  assert.ok(worker.includes('SET used_count=MAX(0,used_count-1)'));
});

test('historical order totals are not rewritten to a fixed shipping amount at schema startup', () => {
  const worker = read('worker.js');
  assert.ok(!worker.includes('UPDATE orders SET shipping_charge=130,total=MAX(0,COALESCE(subtotal,0)+130'));
});
