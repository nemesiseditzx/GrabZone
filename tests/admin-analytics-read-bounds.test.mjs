import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('admin analytics scopes order reads to its 30-day reporting window', () => {
  const source = fs.readFileSync('admin.js', 'utf8');
  assert.match(source, /\.gte\("created_at",cutoff\.toISOString\(\)\)/);
  assert.match(source, /\.order\("created_at",\{ascending:false\}\)/);
  assert.doesNotMatch(source, /from\("order_items"\)\.select\("order_id,product_name,quantity,unit_price,line_total"\);/);
});

test('admin analytics fetches order lines only for recent active orders in safe bind chunks', () => {
  const source = fs.readFileSync('admin.js', 'utf8');
  assert.match(source, /orders\.filter\(o=>o\.status!=="Cancelled"\)\.map\(o=>o\.id\)/);
  assert.match(source, /i\+=90/);
  assert.match(source, /\.in\("order_id",ids\)/);
  assert.match(source, /const activeOrderIdSet=new Set\(activeOrderIds\)/);
});
