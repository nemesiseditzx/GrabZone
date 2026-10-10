import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('vendor order finalization failures are queued and retried without failing an already accepted customer order', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes('CREATE TABLE IF NOT EXISTS vendor_order_finalization_jobs'));
  assert.ok(finalizer.includes('async function enqueueVendorFinalization(e,orderId,payload,error)'));
  assert.ok(finalizer.includes('async function processPendingVendorFinalizations(e)'));
  assert.ok(finalizer.includes("console.error('GrabZone order '+o.id+' was accepted, but vendor finalization needs retry.'"));
  assert.ok(finalizer.includes('await enqueueVendorFinalization(e,o.id,payload,finalizationError)'));
});

test('vendor finalization retries repair missing item snapshots without resetting a completed order status', () => {
  const finalizer = read('vendor-system-finalizer.mjs');
  assert.ok(finalizer.includes("SELECT id FROM vendor_order_items WHERE vendor_order_id=? AND order_item_id=? LIMIT 1"));
  assert.ok(finalizer.includes("!['id','order_id','vendor_id','created_at','status'].includes(k)"));
  assert.ok(finalizer.includes("CREATE UNIQUE INDEX IF NOT EXISTS vendor_order_items_order_item_unique"));
  const schema = read('d1-schema.sql');
  assert.ok(schema.includes('CREATE TABLE IF NOT EXISTS vendor_order_finalization_jobs'));
  assert.ok(schema.includes('CREATE INDEX IF NOT EXISTS vendor_order_finalization_jobs_status_idx'));
});
