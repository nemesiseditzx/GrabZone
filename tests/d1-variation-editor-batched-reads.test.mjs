import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('variation editor batches option and image reads across all variations', () => {
  const source = readFileSync(new URL('../vendor-system-v2.mjs', import.meta.url), 'utf8');
  assert.ok(source.includes('SELECT vo.variation_id,po.name,ov.value FROM variation_options vo JOIN product_options po'));
  assert.ok(source.includes("WHERE vo.variation_id IN ('+placeholders+')"));
  assert.ok(source.includes("SELECT variation_id,image_url FROM variation_images WHERE variation_id IN ('+placeholders+')"));
  assert.ok(!source.includes("for(const v of vs){v.options={};for(const x of(await q(e,'SELECT po.name,ov.value FROM variation_options"));
  assert.ok(!source.includes("for(const v of vs){v.options={};for(const x of(await q(e,'SELECT image_url FROM variation_images"));
});
