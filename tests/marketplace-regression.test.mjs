import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('inventory is reserved atomically inside the D1 order batch',()=>{
  const worker=read('worker.mjs');
  assert.match(worker,/CREATE TABLE IF NOT EXISTS marketplace_inventory_holds/i);
  assert.match(worker,/UPDATE products SET stock=stock-\?,stock_mode='tracked'/i);
  assert.match(worker,/UPDATE product_variations SET stock=stock-\?/i);
  assert.match(worker,/env\.DB\.batch\(stmts\)/);
  assert.match(worker,/invalid inventory state/);
  assert.doesNotMatch(read('vendor-marketplace-router.mjs'),/UPDATE products SET stock=CASE WHEN stock>0 THEN MAX\(0,stock-\?/);
});

test('cancelled vendor orders have an idempotent inventory restore path',()=>{
  const finalizer=read('vendor-system-finalizer.mjs');
  assert.match(finalizer,/marketplace_inventory_holds/);
  assert.match(finalizer,/restored_at IS NULL/);
  assert.match(finalizer,/stock=stock\+\?/);
  assert.match(finalizer,/status==='Cancelled'/);
});

test('vendor-owned order and shipment queries remain scoped by vendor id',()=>{
  const complete=read('vendor-marketplace-complete.mjs');
  assert.match(complete,/WHERE vo\.vendor_id=\?/);
  assert.match(complete,/WHERE order_id=\? AND vendor_id=\?/);
});

test('known broken marketplace asset is not referenced',()=>{
  const html=read('marketplace.html');
  assert.doesNotMatch(html,/marketplace-notice-sync\.js/);
});

test('native dialogs are removed from the active marketplace UI paths',()=>{
  for(const file of ['vendor-system-v2-ui.js','vendor-product-editor.js','marketplace-vendor-control-v2.html']){
    assert.doesNotMatch(read(file),/\balert\s*\(/);
    assert.doesNotMatch(read(file),/\bprompt\s*\(/);
    assert.doesNotMatch(read(file),/\bconfirm\s*\(/);
  }
});

test('mobile storefront typography is not undersized',()=>{
  const css=read('grabzone-site-responsive.css');
  assert.doesNotMatch(css,/\.product-name\{font-size:10\.5px/);
  assert.match(css,/\.product-name\{font-size:13px/);
});


test('marketplace admin overview has a concrete preview-worker route',()=>{
  const preview=read('vendor-preview-entry.mjs');
  assert.match(preview,/directAdminOverview/);
  assert.match(preview,/\/api\/vendor\/admin\/overview/);
  const gateway=read('marketplace-api-gateway.mjs');
  assert.match(gateway,/\/api\/vendor\/admin\/vendors/);
  assert.match(gateway,/marketplaceComplete\.fetch/);
});
