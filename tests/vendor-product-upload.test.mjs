import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('vendor product editor uses the shared authenticated image uploader', () => {
  const editor = read('vendor-product-editor.js');
  const dashboard = read('vendor-dashboard.js');
  assert.ok(editor.includes("window.uploadVendorImage(f,'product-image')"));
  assert.ok(dashboard.includes('async function uploadVendorImage(file,scope)'));
  assert.ok(!editor.includes('alert('));
  assert.ok(editor.includes('const notify=(message,type=\'error\')=>'));
});

test('injected vendor upload controls report failures with non-blocking toast feedback', () => {
  const entry = read('marketplace-stable-entry.mjs');
  assert.ok(entry.includes('function toast(message)'));
  assert.ok(!entry.includes('alert('));
  const forceImageUi = read('marketplace-image-final-entry.mjs');
  const multiImageUi = read('marketplace-image-policy-entry.mjs');
  assert.ok(forceImageUi.includes('function toast(message)'));
  assert.ok(multiImageUi.includes('function toast(message)'));
  assert.ok(!forceImageUi.includes('alert('));
  assert.ok(!multiImageUi.includes('alert('));
});
