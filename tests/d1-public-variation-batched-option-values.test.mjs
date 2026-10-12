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
  assert.ok(!fn.includes('CREATE TABLE IF NOT EXISTS vendor_product_images'), 'image table setup is not repeated per public variation request');
  assert.ok(source.includes('CREATE TABLE IF NOT EXISTS vendor_product_images'), 'image table is created by cached schema initialization');
});


test('public variation endpoint batches option links and images across variations', () => {
  const source = readFileSync(new URL('../vendor-system-v2.mjs', import.meta.url), 'utf8');
  assert.ok(source.includes("SELECT vo.variation_id,vo.option_id,vo.option_value_id,po.name,ov.value FROM variation_options vo JOIN product_options po"));
  assert.ok(source.includes("linksById=new Map(ids.map(id=>[id,[]]))"));
  assert.ok(source.includes("SELECT variation_id,image_url FROM variation_images WHERE variation_id IN ('+marks+') ORDER BY sort_order,id"));
  assert.ok(source.includes('variation_images_variation_sort_idx'));
});
