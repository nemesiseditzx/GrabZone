import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('admin product editor reports validation errors without browser alert dialogs', () => {
  const admin = read('marketplace-admin.js');
  assert.ok(admin.includes("msg('Select at least one Size, Color or custom option.',false)"));
  assert.ok(admin.includes("msg('Maximum 10 images per product.',false)"));
  assert.ok(!admin.includes('alert('));
});
