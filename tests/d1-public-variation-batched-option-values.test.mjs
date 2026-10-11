import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('public variation endpoint batches option value reads by option IDs', () => {
  const source = readFileSync(new URL('../vendor-system-v2.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('async function publicVariation(');
  const end = source.indexOf('async function orderGuard(', start);
  assert.ok(start >= 0 && end > start, 'publicVariation function exists');
  const fn = source.slice(start, end);
  assert.ok(fn.includes('SELECT id,option_id,value,sort_order FROM option_values WHERE option_id IN ('));
  assert.ok(fn.includes('for(let offset=0;offset<optionIds.length;offset+=80)'));
  assert.ok(!fn.includes('SELECT id,value,sort_order FROM option_values WHERE option_id=? ORDER BY sort_order,id'));
});
