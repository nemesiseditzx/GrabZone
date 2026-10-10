import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('vendor store section editing uses an accessible modal instead of prompt dialogs', () => {
  const dashboard = read('vendor-dashboard.js');
  assert.ok(dashboard.includes('gzSectionEditorModal'));
  assert.ok(dashboard.includes('aria-modal="true"'));
  assert.ok(dashboard.includes('gzSectionEditorForm'));
  assert.ok(!dashboard.includes("prompt('Section title'"));
  assert.ok(!dashboard.includes("prompt('Section content'"));
  assert.ok(dashboard.includes('function gzVendorNotify'));
  assert.ok(!dashboard.includes('alert('));
});
