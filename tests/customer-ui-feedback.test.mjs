import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('customer variation picker uses non-blocking accessible error feedback', () => {
  const cart = read('cart.js');
  assert.ok(cart.includes('gzCustomerToastRoot'));
  assert.ok(!cart.includes('alert('));
});

test('order tracking invoice export reports failures without a blocking browser alert', () => {
  const tracking = read('track-order.js');
  assert.ok(tracking.includes('gzTrackToastRoot'));
  assert.ok(!tracking.includes('alert('));
});

test('admin product editor mirror uses non-blocking feedback', () => {
  const editor = read('admin-product-editor-mirror.js');
  assert.ok(editor.includes('gzAdminProductToastRoot'));
  assert.ok(!editor.includes('alert('));
});
