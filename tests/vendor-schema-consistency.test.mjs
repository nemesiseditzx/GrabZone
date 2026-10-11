import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('shipment_items schema remains compatible with every shipment writer', () => {
  const schema = read('d1-schema.sql');
  const complete = read('vendor-marketplace-complete.mjs');
  const wrapper = read('marketplace-schema-wrapper.mjs');
  for (const source of [schema, complete, wrapper]) {
    assert.ok(source.includes('product_name'), 'product_name must be present');
    assert.ok(source.includes('created_at'), 'created_at must be present');
  }
  assert.ok(complete.includes("ALTER TABLE shipment_items ADD COLUMN product_name TEXT NOT NULL DEFAULT 'Product'"));
  assert.ok(complete.includes('ALTER TABLE shipments ADD COLUMN tracking_id TEXT'));
  assert.ok(complete.includes('ALTER TABLE shipments ADD COLUMN courier TEXT'));
  assert.ok(schema.includes('courier TEXT,tracking_id TEXT,tracking_url TEXT'));
  assert.ok(complete.includes('INSERT INTO shipment_items(id,shipment_id,order_item_id,product_id,product_name,quantity,created_at) VALUES(?,?,?,?,?,?,?)'));
  assert.ok(complete.includes("COALESCE(NULLIF(TRIM(oi.product_name),''),NULLIF(TRIM(p.name),''),'Product') product_name"));
  assert.ok(wrapper.includes('INSERT INTO shipment_items(id,shipment_id,order_item_id,product_id,product_name,quantity,created_at) VALUES(?,?,?,?,?,?,?)'));
  assert.ok(wrapper.includes('CREATE TABLE IF NOT EXISTS shipment_items'));
  assert.ok(wrapper.includes("['shipments','tracking_id','TEXT']"));
});

test('vendor coupon APIs are routed to the coupon handler before the marketplace catch-all', () => {
  const entry = read('marketplace-stable-entry.mjs');
  const couponRoute = entry.indexOf('coupons(?:');
  const marketplaceRoute = entry.indexOf('await marketplaceComplete.fetch(req,env,ctx)');
  assert.ok(couponRoute >= 0, 'coupon route must be explicitly dispatched');
  assert.ok(marketplaceRoute > couponRoute, 'coupon route must run before marketplace catch-all');
  const v2 = read('vendor-system-v2.mjs');
  assert.ok(v2.includes("if(p==='/api/vendor/coupons')"));
  assert.ok(v2.includes("if(p==='/api/vendor/coupons/validate')"));
});
