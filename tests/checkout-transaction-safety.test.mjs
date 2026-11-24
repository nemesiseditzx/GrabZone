import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync('worker.mjs', 'utf8');
const checkout = fs.readFileSync('checkout.js', 'utf8');

test('vendor marketplace schema setup is batched and default vendor backfill is one-time', () => {
  const vendorSchema = fs.readFileSync('vendor-marketplace-complete.mjs', 'utf8');
  assert.ok(vendorSchema.includes('await env.DB.batch(base.map('));
  assert.ok(vendorSchema.includes('await env.DB.batch(tables.map('));
  assert.ok(vendorSchema.includes('await env.DB.batch(pending)'));
  assert.ok(vendorSchema.includes("products-default-vendor-backfill"));
  assert.ok(!vendorSchema.includes('for(const x of s)await env.DB.prepare(x).run()'));
});

test('referral GP rewards are claimed once per referral in the same transaction', () => {
  assert.ok(worker.includes('CREATE TABLE IF NOT EXISTS referral_reward_claims(referral_id TEXT PRIMARY KEY'));
  assert.ok(worker.includes('INSERT OR IGNORE INTO referral_reward_claims(referral_id,order_id,points,created_at)'));
  assert.ok(worker.includes('AND changes()=1'));
});

test('referral reward reversals respect the original rolling tier window', () => {
  assert.ok(worker.includes('SELECT created_at FROM grabpoints_ledger WHERE order_id=? AND phone=? AND type=?'));
  assert.ok(worker.includes('qualifyingReverse=Number.isFinite(referralEarnTime)&&referralEarnTime>=Date.now()-365*24*60*60*1000?-reward:0'));
});

test('Delivered rewards use a retryable processing marker without retroactively changing old orders', () => {
  assert.ok(worker.includes('rewards_processed_at TEXT'));
  assert.ok(worker.includes("delivered-rewards-legacy-mark"));
  assert.ok(worker.includes("lower(status)='delivered' AND rewards_processed_at IS NULL"));
  assert.ok(worker.includes('&&!previousOrder.rewards_processed_at'));
  assert.ok(worker.includes("UPDATE orders SET rewards_processed_at=NULL WHERE id=?"));
});

test('Delivered cashback uses deterministic earning attempts and one atomic balance/allocation batch', () => {
  assert.ok(worker.includes('earnType="earn:order:"+String(previousOrder.id)+":"+(Number(earnState.attempts||0)+1)'));
  assert.ok(worker.includes('WHERE phone=? AND changes()=1'));
  assert.ok(worker.includes('WHERE id=? AND changes()=1'));
  assert.ok(worker.includes('const awardCommitted=Number(earnedBatch?.[0]?.meta?.changes||0)===1'));
  assert.ok(worker.includes('let pts=0,rate=0,cashbackValue=0,eligibleSubtotal=0,tInfo=null,tierBefore=null'));
  assert.ok(worker.includes('tierAfter.tier!==tierBefore'));
});

test('delivered cashback excludes all discounts and delivery from eligible spend', () => {
  assert.ok(worker.includes('previousOrder.grabpoints_discount'));
  assert.ok(worker.includes('previousOrder.rewards_voucher_discount'));
  assert.ok(worker.includes('previousOrder.mystery_discount'));
  assert.ok(worker.includes('previousOrder.vendor_coupon_discount'));
  assert.ok(worker.includes('eligible_vendor_gross'));
  assert.ok(worker.includes('eligible products'));
  assert.ok(worker.includes('Delivery charge is never included.'));
});

test('schema upgrades do not rewrite historical GrabPoints ledger entries', () => {
  assert.ok(worker.includes('ALTER TABLE grabpoints_ledger ADD COLUMN qualifying_points INTEGER NOT NULL DEFAULT 0'));
  assert.ok(!worker.includes('grabpoints-qualifying-backfill'));
  assert.ok(!worker.includes('UPDATE grabpoints_ledger SET qualifying_points=points'));
});

test('D1 cold-start schema work is batched and expensive backfills run once', () => {
  assert.ok(worker.includes('env.DB.batch(D1_SCHEMA.slice(1).map(sql=>env.DB.prepare(sql)))'));
  assert.ok(worker.includes('PRAGMA table_info("+table+")'));
  assert.ok(worker.includes('CREATE TABLE IF NOT EXISTS schema_migrations'));
  assert.ok(worker.includes("VALUES('products-stock-mode-backfill',?)"));
  assert.ok(worker.includes("AND changes()=1"));
  assert.ok(!worker.includes('for(const sql of D1_SCHEMA)await env.DB.prepare(sql).run()'));
  assert.ok(!worker.includes('ALTER TABLE site_settings ADD COLUMN global_shipping_fee REAL NOT NULL DEFAULT 130").run().catch'));
});

test('checkout bulk-loads cart records and appends simple products outside the variation branch', () => {
  assert.ok(worker.includes('const productMap=new Map()'));
  assert.ok(worker.includes('const variationMap=new Map()'));
  assert.ok(worker.includes('const variationOptionsMap=new Map()'));
  assert.ok(worker.includes('const requestedVendors='));
  assert.ok(worker.includes('i+=90'));
  assert.ok(worker.includes('const line=unit*qty;\n subtotal+=line;\n items.push('));
});

test('checkout reserves order numbers atomically instead of MAX(order_no)+1', () => {
  assert.ok(worker.includes('CREATE TABLE IF NOT EXISTS order_sequence'));
  assert.ok(worker.includes('UPDATE order_sequence SET last_value=MAX(last_value,(SELECT COALESCE(MAX(order_no),0) FROM orders))+1 WHERE id=1 RETURNING last_value AS n'));
  assert.ok(!worker.includes('SELECT COALESCE(MAX(order_no),0)+1 AS n FROM orders'));
});

test('checkout reuses one guard row per order instead of inserting and deleting a row per item', () => {
  assert.ok(worker.includes('ON CONFLICT(id) DO UPDATE SET ok=excluded.ok'));
  assert.ok(worker.includes('DELETE FROM checkout_write_assertions WHERE id=?'));
  assert.ok(!worker.includes('id+":check:"+guardIndex'));
});

test('order, items, rewards, coupon claims and variation stock commit in one guarded D1 batch', () => {
  assert.ok(worker.includes('CREATE TABLE IF NOT EXISTS checkout_write_assertions'));
  assert.ok(worker.includes('INSERT INTO checkout_write_assertions(id,ok) VALUES(?,changes())'));
  assert.ok(worker.includes('await env.DB.batch(statements)'));
  assert.ok(worker.includes('DELETE FROM checkout_write_assertions WHERE id=?'));
  assert.ok(worker.includes("UPDATE product_variations SET stock=stock-?,updated_at=? WHERE id=? AND product_id=? AND status='Available' AND lower(COALESCE(stock_mode,'untracked'))='tracked' AND stock>=?"));
});

test('checkout enforces simple product sale pricing and quantity limits from D1', () => {
  assert.ok(worker.includes("ALTER TABLE products ADD COLUMN sale_price REAL"));
  assert.ok(worker.includes("ALTER TABLE products ADD COLUMN product_type TEXT NOT NULL DEFAULT 'simple'"));
  assert.ok(worker.includes('productSale>0&&productSale<productRegular?productSale:productRegular'));
  assert.ok(worker.includes('if(qty<minQty)'));
  assert.ok(worker.includes('if(maxQty!==null&&qty>maxQty)'));
});

test('simple product stock is tracked, reserved, and restored with the same movement journal', () => {
  assert.ok(worker.includes("ALTER TABLE products ADD COLUMN stock_mode TEXT NOT NULL DEFAULT 'untracked'"));
  assert.ok(worker.includes("UPDATE products SET stock=stock-?,updated_at=? WHERE id=? AND published=1 AND stock_mode='tracked' AND stock>=?"));
  assert.ok(worker.includes("UPDATE products SET stock=stock+?,updated_at=? WHERE id=? AND changes()=1"));
  assert.ok(worker.includes('String(item.stock_mode||"untracked").toLowerCase()==="tracked"'));
});

test('checkout request key is stored with the order transaction and replay-safe', () => {
  assert.ok(worker.includes('CREATE TABLE IF NOT EXISTS order_idempotency'));
  assert.ok(worker.includes('INSERT INTO order_idempotency(idempotency_key,request_hash,order_id,created_at)'));
  assert.ok(worker.includes('WHERE oi.idempotency_key=? LIMIT 1'));
  assert.ok(checkout.includes('idempotency_key:checkoutRequestId()'));
  assert.ok(checkout.includes('sessionStorage.removeItem(CHECKOUT_REQUEST_KEY)'));
});

test('vendor order routing uses order snapshots and bulk D1 reads', () => {
  const start = worker.indexOf('async function routeOrderToVendors');
  const end = worker.indexOf('function referralCookie', start);
  const route = worker.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(route.includes('item.vendor_id'));
  assert.ok(route.includes('FROM vendors WHERE id IN'));
  assert.ok(route.includes('SELECT vendor_order_id,order_item_id FROM vendor_order_items WHERE vendor_order_id IN'));
  assert.ok(route.includes('await env.DB.batch(statements)'));
  assert.ok(route.includes('UPDATE vendor_order_items SET vendor_order_id=? WHERE order_item_id=?'));
  assert.ok(worker.includes('vendor_orders_order_vendor_unique'));
  assert.ok(worker.includes('vendor_order_items_order_item_unique'));
});

test('tracked variation stock is journaled and restored once on cancellation', () => {
  assert.ok(worker.includes('CREATE TABLE IF NOT EXISTS order_inventory_movements'));
  assert.ok(worker.includes('UNIQUE(order_item_id,movement_type)'));
  assert.ok(worker.includes('Number(item.quantity),"sale",t'));
  assert.ok(worker.includes('Number(movement.quantity||0),"restock",now()'));
  assert.ok(worker.includes('AND changes()=1'));
  assert.ok(worker.includes('NOT EXISTS(SELECT 1 FROM order_inventory_movements restock'));
});

test('checkout and vendor/admin workflows do not use native dialogs', () => {
  const vendorFinal = fs.readFileSync('vendor-system-final-ui.js', 'utf8');
  const vendorUI = fs.readFileSync('vendor-system-v2-ui.js', 'utf8');
  const adminVariationUI = fs.readFileSync('marketplace-admin-variations-ui.js', 'utf8');
  assert.doesNotMatch(checkout, /window\.confirm\(/);
  for (const source of [vendorFinal, vendorUI, adminVariationUI]) {
    assert.doesNotMatch(source, /prompt\(/);
    assert.doesNotMatch(source, /alert\(/);
  }
});

test('mixed vendor and GrabZone carts include both shipping components', () => {
  assert.ok(worker.includes('if(!vendorIds.size||items.some(item=>!String(item.vendor_id||"").trim()))shipping+=shippingFallback'));
  assert.ok(worker.includes('vendor?.shipping_fee??shippingFallback'));
});

test('referral discounts are based only on referral-eligible item subtotal', () => {
  assert.ok(worker.includes('const referralEligibleSubtotal=items.reduce'));
  assert.ok(worker.includes('Math.round(referralEligibleSubtotal*Number(r.benefit_value||0)/100*100)/100'));
  assert.ok(worker.includes('Math.min(discount,referralEligibleSubtotal)'));
  assert.ok(!worker.includes('const referralEligibleSubtotal=allocationRows.reduce'));
});

test('checkout snapshots variation options, SKU and image from D1, not browser payload', () => {
  assert.ok(worker.includes('SELECT po.name,ov.value FROM variation_options vo'));
  assert.ok(worker.includes('variation_options:variationOptions,variation_sku:variationSku'));
  assert.ok(!worker.includes('variation_options:x.variation_options'));
  assert.ok(!worker.includes('variation_sku:x.variation_sku||x.sku'));
});
