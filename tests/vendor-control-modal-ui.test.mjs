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
