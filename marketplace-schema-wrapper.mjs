import app from './marketplace-admin-wrapper.mjs';

async function migrate(env){
  // The dev D1 database may contain marketplace tables created by an older
  // version. CREATE TABLE IF NOT EXISTS does not add missing columns, so
  // migrate the columns used by the current marketplace code in place.
  const migrations = [
    ['vendor_orders','subtotal','REAL DEFAULT 0'],
    ['vendor_orders','shipping_fee','REAL DEFAULT 0'],
    ['vendor_orders','commission_amount','REAL DEFAULT 0'],
    ['vendor_orders','vendor_earnings','REAL DEFAULT 0'],
    ['vendor_orders','status',"TEXT DEFAULT 'Processing'"],
    ['vendor_orders','created_at','TEXT'],
    ['vendor_orders','updated_at','TEXT'],
    ['vendor_order_items','product_id','TEXT'],
    ['vendor_order_items','quantity','INTEGER DEFAULT 1'],
    ['vendor_order_items','unit_price','REAL DEFAULT 0'],
    ['vendor_order_items','line_total','REAL DEFAULT 0'],
    ['shipments','courier','TEXT'],
    ['shipments','tracking_id','TEXT'],
    ['shipments','tracking_url','TEXT'],
    ['shipments','status',"TEXT DEFAULT 'Pending'"],
    ['shipments','note','TEXT'],
    ['shipments','created_at','TEXT'],
    ['shipments','updated_at','TEXT'],
    ['shipment_items','quantity','INTEGER DEFAULT 1'],
    ['vendor_products','category','TEXT'],
    ['vendor_products','status',"TEXT DEFAULT 'Active'"],
    ['vendor_products','created_at','TEXT'],
    ['vendor_products','updated_at','TEXT'],
    ['vendor_store_sections','title','TEXT'],
    ['vendor_store_sections','body','TEXT'],
    ['vendor_store_sections','sort_order','INTEGER DEFAULT 0'],
    ['vendor_store_sections','enabled','INTEGER DEFAULT 1'],
    ['vendor_store_sections','data_json',"TEXT DEFAULT '{}'"],
    ['vendor_store_sections','created_at','TEXT'],
    ['vendor_store_sections','updated_at','TEXT'],
    ['marketplace_audit_log','actor_id','TEXT'],
    ['marketplace_audit_log','vendor_id','TEXT'],
    ['marketplace_audit_log','details','TEXT'],
    ['marketplace_audit_log','created_at','TEXT']
  ];

  for(const [table,column,type] of migrations){
    await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run().catch(()=>{});
  }
}

export default {
  fetch: async (request, env, ctx) => {
    try {
      await migrate(env);
      return app.fetch(request, env, ctx);
    } catch (err) {
      return new Response(JSON.stringify({error: err?.message || 'Marketplace migration failed'}), {
        status: 500,
        headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
      });
    }
  }
};
