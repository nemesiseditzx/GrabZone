import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../worker.mjs', import.meta.url), 'utf8');

test('order_items schema persists vendor and variation fields required by checkout routing', () => {
  assert.ok(source.includes('CREATE TABLE IF NOT EXISTS order_items'));
  assert.ok(source.includes('vendor_id TEXT,variation_id TEXT,variation_options TEXT,variation_sku TEXT'));
  for (const column of ['vendor_id', 'variation_id', 'variation_options', 'variation_sku']) {
    assert.ok(
      source.includes('["order_items","' + column + '","ALTER TABLE order_items ADD COLUMN ' + column + ' TEXT"]'),
      'existing D1 databases must be migrated for order_items.' + column,
    );
  }
});

test('vendor routing reads persisted vendor and variation data from order_items', () => {
  assert.ok(source.includes('SELECT id,product_id,product_name,image_url,quantity,unit_price,line_total,variation_id,variation_options,variation_sku,vendor_id FROM order_items'));
  assert.ok(source.includes('vendor_id:item.vendor_id||null'));
  assert.ok(source.includes("VALUES('order-items-vendor-backfill',?)"));
  assert.ok(source.includes('UPDATE order_items SET vendor_id=(SELECT vendor_id FROM products'));
  assert.ok(source.includes('order_items_vendor_order_idx'));
});
