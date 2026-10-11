import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('checkout guard accepts active vendor status regardless of capitalization', () => {
  const v2 = read('vendor-system-v2.mjs');
  assert.ok(v2.includes("String(v.vendor_status||'').toLowerCase()!=='active'"));
  assert.ok(v2.includes("String(p.vendor_status||'').toLowerCase()!=='active'"));
});

test('checkout guard uses a valid variation sale price instead of always charging regular price', () => {
  const v2 = read('vendor-system-v2.mjs');
  assert.ok(v2.includes('pv.regular_price,pv.sale_price,pv.old_price'));
  assert.ok(v2.includes('sale>0&&sale<regular?sale:regular'));
});

test('checkout order guard receives the continuation callback in the correct argument position', () => {
  const v2 = read('vendor-system-v2.mjs');
  assert.ok(v2.includes("async function orderGuard(req,e,next)"));
  assert.ok(v2.includes("return orderGuard(req,e,next)"));
  assert.ok(!v2.includes("return orderGuard(req,e,ctx,next)"));
});
