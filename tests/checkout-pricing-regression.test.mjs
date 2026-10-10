import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('the public order service uses the server-computed shipping amount', () => {
  const worker = read('worker.js');
  assert.ok(worker.includes('const shipping=Math.max(0,Number(p.shipping_charge??130))'));
});

test('vendor checkout passes calculated shipping into the underlying order request', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes('payload:{...payload,shipping_charge:shipping,items:items.map(i=>({...i}))}'));
  assert.ok(finalizer.includes('if(!vendorIds.size)shipping=130'));
});

test('vendor order totals include shipping and percentage commission cannot exceed subtotal', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes('shipping_charge:delivery,delivery_charge:delivery,total:netSubtotal+delivery'));
  assert.ok(finalizer.includes("Math.min(subtotal,Math.round(subtotal*Math.max(0,g.commission_value)/100*100)/100)"));
});
