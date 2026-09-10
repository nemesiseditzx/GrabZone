import app from './marketplace-admin-wrapper.mjs';

const now=()=>new Date().toISOString();
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const json=(x,s=200,h={})=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...h}});
async function sha(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('')}
function cookie(req,n){for(const p of(req.headers.get('Cookie')||'').split(';')){const a=p.trim().split('=');if(a[0]===n)return decodeURIComponent(a.slice(1).join('='))}return ''}

async function migrate(env){
  const migrations=[
    ['vendors','name','TEXT'],
    ['vendors','order_notification_email','TEXT'],['vendors','support_email','TEXT'],['vendors','business_email','TEXT'],
    ['vendor_orders','subtotal','REAL DEFAULT 0'],['vendor_orders','shipping_fee','REAL DEFAULT 0'],['vendor_orders','commission_amount','REAL DEFAULT 0'],['vendor_orders','vendor_earnings','REAL DEFAULT 0'],['vendor_orders','status',"TEXT DEFAULT 'Processing'"],['vendor_orders','created_at','TEXT'],['vendor_orders','updated_at','TEXT'],
    ['vendor_order_items','product_id','TEXT'],['vendor_order_items','quantity','INTEGER DEFAULT 1'],['vendor_order_items','unit_price','REAL DEFAULT 0'],['vendor_order_items','line_total','REAL DEFAULT 0'],
    ['shipments','courier','TEXT'],['shipments','tracking_id','TEXT'],['shipments','tracking_url','TEXT'],['shipments','status',"TEXT DEFAULT 'Pending'"],['shipments','note','TEXT'],['shipments','created_at','TEXT'],['shipments','updated_at','TEXT'],
    ['shipment_items','quantity','INTEGER DEFAULT 1'],
    ['vendor_products','category','TEXT'],['vendor_products','status',"TEXT DEFAULT 'Active'"],['vendor_products','created_at','TEXT'],['vendor_products','updated_at','TEXT'],
    ['vendor_store_sections','title','TEXT'],['vendor_store_sections','body','TEXT'],['vendor_store_sections','sort_order','INTEGER DEFAULT 0'],['vendor_store_sections','enabled','INTEGER DEFAULT 1'],['vendor_store_sections','data_json',"TEXT DEFAULT '{}'"],['vendor_store_sections','created_at','TEXT'],['vendor_store_sections','updated_at','TEXT'],
    ['marketplace_audit_log','actor_id','TEXT'],['marketplace_audit_log','vendor_id','TEXT'],['marketplace_audit_log','details','TEXT'],['marketplace_audit_log','created_at','TEXT'],
    ['products','vendor_id','TEXT'],['products','stock','INTEGER DEFAULT 0'],['products','sku','TEXT'],['products','category_id','TEXT'],
    ['order_items','vendor_id','TEXT']
  ];
  for(const [table,column,type] of migrations)await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run().catch(()=>{});
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS vendor_users(id TEXT PRIMARY KEY,vendor_id TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'vendor_admin',status TEXT NOT NULL DEFAULT 'Active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)").run().catch(()=>{});
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS marketplace_audit_log(id TEXT PRIMARY KEY,actor_type TEXT NOT NULL,actor_id TEXT,action TEXT NOT NULL,vendor_id TEXT,details TEXT,created_at TEXT NOT NULL)").run().catch(()=>{});
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS marketplace_categories(id TEXT PRIMARY KEY,name TEXT UNIQUE NOT NULL,slug TEXT UNIQUE NOT NULL,parent_id TEXT,active INTEGER DEFAULT 1,sort_order INTEGER DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)").run().catch(()=>{});
  for(const sql of [
    'CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_order_items_vendor ON order_items(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_orders_order_vendor ON vendor_orders(order_id,vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_order_items_order_item ON vendor_order_items(vendor_order_id,order_item_id)',
    'CREATE INDEX IF NOT EXISTS idx_shipments_order_vendor ON shipments(order_id,vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_shipment_items_ship_item ON shipment_items(shipment_id,order_item_id)',
    'CREATE INDEX IF NOT EXISTS idx_shipment_items_order_item ON shipment_items(order_item_id)'
  ])await env.DB.prepare(sql).run().catch(()=>{});
}

async function adminOK(request,env,ctx){
  const r=await app.fetch(new Request(new URL('/api/admin-auth',request.url),{method:'GET',headers:new Headers(request.headers)}),env,ctx);
  if(!r.ok)return false;return !!(await r.json().catch(()=>({}))).authenticated;
}

async function createVendor(request,env,ctx){
  const p=new URL(request.url).pathname;
  if(request.method!=='POST'||p!=='/api/vendor/admin/vendors')return null;
  if(!await adminOK(request,env,ctx))return json({error:'Unauthorized'},401);
  const b=await request.clone().json().catch(()=>({}));
  const name=clean(b.business_name||b.brand_name,120),brand=clean(b.brand_name||name,120),email=clean(b.email,200).toLowerCase(),pass=String(b.password||'');
  if(!name||!brand||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||pass.length<8)return json({error:'Valid names, email and 8+ character password required.'},400);
  let slug=clean(b.slug||brand.toLowerCase().replace(/[^a-z0-9]+/g,'-'),70)||'vendor',base=slug,n=1;
  while((await env.DB.prepare('SELECT id FROM vendors WHERE slug=?').bind(slug).all()).results?.length)slug=base+'-'+(++n);
  const id=crypto.randomUUID(),salt=crypto.randomUUID(),t=now();
  try{
    const passwordHash=await (async()=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},k,256);return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('')})();
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO vendors(name,slug,business_name,brand_name,email,phone,logo_url,banner_url,description,tagline,accent_color,status,shipping_fee,commission_type,commission_value,homepage_visible,featured,social_links,contact_info,announcement,business_email,order_notification_email,support_email,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(name,slug,name,brand,email,clean(b.phone,40),clean(b.logo_url,1000),clean(b.banner_url,1000),clean(b.description,5000),clean(b.tagline,300),clean(b.accent_color,30)||'#ff6b00','Active',Math.max(0,Number(b.shipping_fee??130)),b.commission_type==='fixed'?'fixed':'percentage',Math.max(0,Number(b.commission_value??10)),b.homepage_visible===false?0:1,b.featured?1:0,JSON.stringify(b.social_links||{}),JSON.stringify(b.contact_info||{}),clean(b.announcement,500),email,email,email,t,t),
      env.DB.prepare('INSERT INTO vendor_users(id,vendor_id,email,password_hash,password_salt,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,email,passwordHash,salt,t,t)
    ]);
    return json({ok:true,vendor:{id,slug,brand_name:brand,email}});
  }catch(err){return json({error:err?.message||'Failed to create vendor'},500)}
}

async function saveVendorPatch(request,env,ctx){
  const p=new URL(request.url).pathname;
  if(request.method!=='PATCH'||!p.startsWith('/api/vendor/admin/vendors/'))return null;
  if(!await adminOK(request,env,ctx))return json({error:'Unauthorized'},401);
  const id=clean(p.split('/').pop(),100),b=await request.clone().json().catch(()=>null);
  if(!b||typeof b!=='object')return json({error:'Invalid JSON'},400);
  const fields=['name','business_name','brand_name','email','phone','logo_url','banner_url','description','tagline','accent_color','status','shipping_fee','commission_type','commission_value','homepage_visible','featured','announcement','social_links','contact_info','business_email','order_notification_email','support_email'];
  const sets=[],params=[];
  for(const k of fields)if(b[k]!==undefined){let v=['social_links','contact_info'].includes(k)?JSON.stringify(b[k]||{}):['shipping_fee','commission_value'].includes(k)?Math.max(0,Number(b[k])):['homepage_visible','featured'].includes(k)?(b[k]?1:0):clean(b[k],10000);sets.push(k+'=?');params.push(v)}
  if(!sets.length)return json({ok:true});sets.push('updated_at=?');params.push(now());
  try{await env.DB.prepare('UPDATE vendors SET '+sets.join(',')+' WHERE id=? OR slug=?').bind(...params,id,id).run();return json({ok:true})}catch(err){return json({error:err?.message||'Failed to save vendor'},500)}
}

async function vendorSession(req,env){
  const raw=cookie(req,'gz_vendor_session');
  if(!raw)return null;
  return (await env.DB.prepare("SELECT vu.id,vu.vendor_id,vu.email,vu.role,v.status vendor_status FROM vendor_sessions s JOIN vendor_users vu ON vu.id=s.vendor_user_id JOIN vendors v ON v.id=vu.vendor_id WHERE s.token_hash=? AND s.expires_at>? AND vu.status='Active' AND v.status='Active'").bind(await sha(raw),now()).all()).results?.[0]||null;
}

async function protectShipment(request,env,ctx){
  const p=new URL(request.url).pathname;
  if(request.method!=='POST'||p!=='/api/vendor/shipments')return null;
  const u=await vendorSession(request,env);
  if(!u)return json({error:'Unauthorized'},401);
  const b=await request.clone().json().catch(()=>({}));
  const vendorOrderId=clean(b.vendor_order_id,100);
  const order= (await env.DB.prepare('SELECT vo.*,o.order_number FROM vendor_orders vo JOIN orders o ON o.id=vo.order_id WHERE vo.id=? AND vo.vendor_id=?').bind(vendorOrderId,u.vendor_id).all()).results?.[0];
  if(!order)return json({error:'Vendor order not found'},404);
  const items=(await env.DB.prepare('SELECT id,order_item_id,product_id,quantity FROM vendor_order_items WHERE vendor_order_id=?').bind(order.id).all()).results||[];
  if(!items.length)return json({error:'This vendor order has no shippable items.'},409);
  const remaining=[];
  for(const item of items){
    const shipped=Number((await env.DB.prepare('SELECT COALESCE(SUM(si.quantity),0) n FROM shipment_items si JOIN shipments s ON s.id=si.shipment_id WHERE s.order_id=? AND s.vendor_id=? AND si.order_item_id=?').bind(order.order_id,u.vendor_id,item.order_item_id).all()).results?.[0]?.n||0);
    const ordered=Math.max(0,Number(item.quantity||0));
    if(shipped>ordered)return json({error:'Shipment data is inconsistent for one or more items.'},409);
    if(ordered-shipped>0)remaining.push({order_item_id:item.order_item_id,quantity:ordered-shipped});
  }
  if(!remaining.length)return json({error:'All items in this vendor order have already been shipped.'},409);
  const r=await app.fetch(request,env,ctx);
  if(!r.ok)return r;
  const d=await r.clone().json().catch(()=>null),shipmentId=d?.shipment_id;
  if(shipmentId){
    try{await env.DB.batch(remaining.map(x=>env.DB.prepare('INSERT INTO shipment_items(id,shipment_id,order_item_id,quantity) VALUES(?,?,?,?)').bind(crypto.randomUUID(),shipmentId,x.order_item_id,x.quantity)))}catch(err){await env.DB.prepare('DELETE FROM shipments WHERE id=? AND vendor_id=?').bind(shipmentId,u.vendor_id).run().catch(()=>{});return json({error:'Shipment item mapping failed. Shipment was rolled back.'},500)}
  }
  return r;
}

function hardenResponse(request,response){
  const h=new Headers(response.headers);
  h.delete('Access-Control-Allow-Origin');h.delete('Access-Control-Allow-Credentials');h.delete('Access-Control-Allow-Headers');h.delete('Access-Control-Allow-Methods');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}

export default{fetch:async(request,env,ctx)=>{try{await migrate(env);if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});const created=await createVendor(request,env,ctx);if(created)return created;const patched=await saveVendorPatch(request,env,ctx);if(patched)return patched;const shipment=await protectShipment(request,env,ctx);if(shipment)return hardenResponse(request,shipment);return hardenResponse(request,await app.fetch(request,env,ctx));}catch(err){return json({error:err?.message||'Marketplace runtime failed'},500)}}};
