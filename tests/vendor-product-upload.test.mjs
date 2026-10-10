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
