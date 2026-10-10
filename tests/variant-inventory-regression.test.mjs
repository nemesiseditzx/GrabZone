import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('checkout resolves selected variants against the requested product and authoritative price', () => {
  const worker = read('worker.js');
  assert.ok(worker.includes('SELECT * FROM product_variations WHERE id=? AND product_id=? LIMIT 1'));
  assert.ok(worker.includes('const unit=variation?(sale>0&&sale<regular?sale:regular)'));
  assert.ok(worker.includes('variation_id,variation_options,variation_sku) VALUES(?,?,?,?,?,?,?,?,?,?,?)'));
});

test('tracked variation stock is reserved conditionally and rolled back if order creation fails', () => {
  const worker = read('worker.js');
  assert.ok(worker.includes('UPDATE product_variations SET stock=stock-?,updated_at=? WHERE id=? AND stock>=? AND status=\'Available\''));
  assert.ok(worker.includes('reserved.push(item)'));
  assert.ok(worker.includes('for(const item of reserved.reverse())await env.DB.prepare("UPDATE product_variations SET stock=stock+?,updated_at=? WHERE id=?")'));
  assert.ok(worker.includes('"sale:"+item.id,item.product_id,item.variation_id,item.vendor_id,-item.quantity,"order_sale"'));
});

test('cancelled vendor orders restore tracked stock with an idempotency guard', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes('guardId="restore:"+item.order_item_id'));
  assert.ok(finalizer.includes('INSERT OR IGNORE INTO inventory_log'));
  assert.ok(finalizer.includes('UPDATE product_variations SET stock=stock+?,updated_at=? WHERE id=?'));
  assert.ok(finalizer.includes("if((b.status==='Cancelled'||b.status==='Returned')&&previous!==b.status)await restoreVendorOrderInventory(e,vo.id,u.vendor_id);await e.DB.prepare('UPDATE vendor_orders SET status"));
});

test('vendor cancellation reads the persisted previous status before restoring stock', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes('SELECT vo.id,vo.order_id,vo.status,o.order_number FROM vendor_orders vo'));
  assert.ok(finalizer.includes('const previous=vo.status'));
});

test('variant snapshots cannot overwrite server-calculated price with client-supplied values', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes('Number(rows[i].unit_price||0),Number(rows[i].line_total||0)'));
  assert.ok(!finalizer.includes('Number(src.unit_price||rows[i].unit_price||0)'));
});
