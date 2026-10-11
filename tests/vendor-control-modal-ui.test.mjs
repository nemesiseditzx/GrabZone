import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('vendor control edits products and store sections through accessible modals', () => {
  const page = read('marketplace-vendor-control-v2.html');
  assert.ok(page.includes('function openControlModal'));
  assert.ok(page.includes('gzControlEditProductForm'));
  assert.ok(page.includes('gzControlEditSectionForm'));
  assert.ok(page.includes('aria-modal="true"'));
  assert.ok(!page.includes('prompt('));
  assert.ok(!page.includes('alert('));
});

test('vendor dashboard shipment creation uses a modal and supported order statuses', () => {
  const ui = read('vendor-system-final-ui.js');
  assert.ok(ui.includes('gzVendorShipmentModal'));
  assert.ok(ui.includes("status:'Processing'"));
  assert.ok(ui.includes("['New','Contacting','Confirmed','Processing','Shipped','Delivered','Cancelled']"));
  assert.ok(!ui.includes('prompt('));
  assert.ok(!ui.includes('alert('));
});

test('vendor variation UI uses non-blocking feedback for validation and save errors', () => {
  const ui = read('vendor-system-v2-ui.js');
  assert.ok(ui.includes('gzVendorV2ToastRoot'));
  assert.ok(!ui.includes('alert('));
});
