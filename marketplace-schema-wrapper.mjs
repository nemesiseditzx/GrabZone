import app from './marketplace-admin-wrapper.mjs';

const now=()=>new Date().toISOString();
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});

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

async function saveVendorPatch(request,env,ctx){
  const path=new URL(request.url).pathname;
  if(request.method!=='PATCH'||!path.startsWith('/api/vendor/admin/vendors/'))return null;

  // The existing marketplace router has a parameter-binding bug in this
  // PATCH handler: it appends the vendor id to the parameter list and then
  // binds two more ids for "WHERE id=? OR slug=?". Handle this endpoint here
  // so the Vendor Control Save button remains reliable without changing the
  // legacy marketplace flow or main branch.
  const authReq=new Request(new URL('/api/admin-auth',request.url),{
    method:'GET',headers:new Headers(request.headers)
  });
  const auth=await app.fetch(authReq,env,ctx);
  if(!auth.ok)return json({error:'Unauthorized'},401);
  const authData=await auth.clone().json().catch(()=>({}));
  if(!authData.authenticated)return json({error:'Unauthorized'},401);

  const id=clean(path.split('/').pop(),100);
  const body=await request.clone().json().catch(()=>null);
  if(!body||typeof body!=='object')return json({error:'Invalid JSON'},400);

  const fields=['business_name','brand_name','email','phone','logo_url','banner_url','description','tagline','accent_color','status','shipping_fee','commission_type','commission_value','homepage_visible','featured','announcement','social_links','contact_info','business_email','order_notification_email','support_email'];
  const sets=[];const params=[];
  for(const key of fields){
    if(body[key]===undefined)continue;
    let value;
    if(['social_links','contact_info'].includes(key))value=JSON.stringify(body[key]||{});
    else if(['shipping_fee','commission_value'].includes(key))value=Math.max(0,Number(body[key]));
    else if(['homepage_visible','featured'].includes(key))value=body[key]?1:0;
    else value=clean(body[key],10000);
    sets.push(key+'=?');params.push(value);
  }
  if(!sets.length)return json({ok:true});
  sets.push('updated_at=?');params.push(now(),id,id);
  try{
    await env.DB.prepare('UPDATE vendors SET '+sets.join(',')+' WHERE id=? OR slug=?').bind(...params).run();
    return json({ok:true});
  }catch(err){
    return json({error:err?.message||'Failed to save vendor'},500);
  }
}

export default {
  fetch: async (request, env, ctx) => {
    try {
      await migrate(env);
      const direct=await saveVendorPatch(request,env,ctx);
      if(direct)return direct;
      return app.fetch(request, env, ctx);
    } catch (err) {
      return new Response(JSON.stringify({error: err?.message || 'Marketplace migration failed'}), {
        status: 500,
        headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
      });
    }
  }
};
