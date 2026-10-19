import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('shipping schema setup is cached per D1 binding instead of retrying ALTER TABLE on every request', () => {
  const source = readFileSync(new URL('../worker.mjs', import.meta.url), 'utf8');
  assert.match(source, /const shippingSettingSetup = new WeakMap\(\)/);
  assert.match(source, /let setup = shippingSettingSetup\.get\(env\.DB\)/);
  assert.match(source, /shippingSettingSetup\.set\(env\.DB,setup\)/);
  assert.match(source, /shippingSettingSetup\.delete\(env\.DB\)/);
});
