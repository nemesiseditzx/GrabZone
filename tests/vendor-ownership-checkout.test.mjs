import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('checkout rejects products and variations belonging to inactive vendors', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes("String(v.vendor_status||'').toLowerCase()!=='active'"));
  assert.ok(finalizer.includes("String(p.vendor_status||'').toLowerCase()!=='active'"));
  assert.ok(finalizer.includes('LEFT JOIN vendors ven ON ven.id=p.vendor_id'));
  assert.ok(finalizer.includes('LEFT JOIN vendors v ON v.id=p.vendor_id'));
});
