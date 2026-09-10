import app from './marketplace-admin-wrapper.mjs';

const now=()=>new Date().toISOString();
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});

async function sha(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function pbkdf(password,salt){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(password)),'PBKDF2',false,['deriveBits']);const b=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(String(salt)),iterations:100000,hash:'SHA-256'},k,256);return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}

async function migrate(env){
  const migrations=[
    ['vendors','name','TEXT'],
    ['vendors','order_notification_email','TEXT'],['vendors','support_email','TEXT'],['vendors','business_email','TEXT'],
    ['vendor_orders','subtotal','REAL DEFAULT 0'],['vendor_orders','shipping_fee','REAL DEFAULT 0'],['vendor_orders','commission_amount','REAL DEFAULT 0'],['vendor_orders','vendor_earnings','REAL DEFAULT 0'],['vendor_orders','status',"TEXT DEFAULT 'Processing'"],['vendor_orders','created_at','TEXT'],['vendor_orders','updated_at','TEXT'],
    ['vendor_order_items','product_id','TEXT'],['vendor_order_items','quantity','INTEGER DEFAULT 1'],['vendor_order_items','unit_price','REAL DEFAULT 0'],['vendor_order_items','line_total','REAL DEFAULT 0'],
    ['shipments','courier','TEXT'],['shipments','tracking_id','TEXT'],['shipments','tracking_url','TEXT'],['shipments','status',"TEXT DEFAULT 'Pending'"],['shipments','note','TEXT'],['shipments','created_at','TEXT'],['shipments','updated_at','TEXT'],
    ['shipment_items','quantity','INTEGER DEFAULT 1'],['vendor_products','category','TEXT'],['vendor_products','status',"TEXT DEFAULT 'Active'"],['vendor_products','created_at','TEXT'],['vendor_products','updated_at','TEXT'],
    ['vendor_store_sections','title','TEXT'],['vendor_store_sections','body','TEXT'],['vendor_store_sections','sort_order','INTEGER DEFAULT 0'],['vendor_store_sections','enabled','INTEGER DEFAULT 1'],['vendor_store_sections','data_json',"TEXT DEFAULT '{}'"],['vendor_store_sections','created_at','TEXT'],['vendor_store_sections','updated_at','TEXT'],
    ['marketplace_audit_log','actor_id','TEXT'],['marketplace_audit_log','vendor_id','TEXT'],['marketplace_audit_log','details','TEXT'],['marketplace_audit_log','created_at','TEXT']
  ];
  for(const [table,column,type] of migrations)await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run().catch(()=>{});
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS vendor_users(id TEXT PRIMARY KEY,vendor_id TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'vendor_admin',status TEXT NOT NULL DEFAULT 'Active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)").run().catch(()=>{});
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS marketplace_audit_log(id TEXT PRIMARY KEY,actor_type TEXT NOT NULL,actor_id TEXT,action TEXT NOT NULL,vendor_id TEXT,details TEXT,created_at TEXT NOT NULL)").run().catch(()=>{});
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
    await env.DB.prepare(`INSERT INTO vendors(name,slug,business_name,brand_name,email,phone,logo_url,banner_url,description,tagline,accent_color,status,shipping_fee,commission_type,commission_value,homepage_visible,featured,social_links,contact_info,announcement,business_email,order_notification_email,support_email,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      name,slug,name,brand,email,clean(b.phone,40),clean(b.logo_url,1000),clean(b.banner_url,1000),clean(b.description,5000),clean(b.tagline,300),clean(b.accent_color,30)||'#ff6b00','Active',Math.max(0,Number(b.shipping_fee??130)),b.commission_type==='fixed'?'fixed':'percentage',Math.max(0,Number(b.commission_value??10)),b.homepage_visible===false?0:1,b.featured?1:0,JSON.stringify(b.social_links||{}),JSON.stringify(b.contact_info||{}),clean(b.announcement,500),email,email,email,t,t
    ).run();
    await env.DB.prepare('INSERT INTO vendor_users(id,vendor_id,email,password_hash,password_salt,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,email,await pbkdf(pass,salt),salt,t,t).run();
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
  if(!sets.length)return json({ok:true});sets.push('updated_at=?');params.push(now(),id,id);
  try{await env.DB.prepare('UPDATE vendors SET '+sets.join(',')+' WHERE id=? OR slug=?').bind(...params).run();return json({ok:true})}catch(err){return json({error:err?.message||'Failed to save vendor'},500)}
}

export default{fetch:async(request,env,ctx)=>{try{await migrate(env);const created=await createVendor(request,env,ctx);if(created)return created;const patched=await saveVendorPatch(request,env,ctx);if(patched)return patched;return app.fetch(request,env,ctx)}catch(err){return json({error:err?.message||'Marketplace migration failed'},500)}}};
