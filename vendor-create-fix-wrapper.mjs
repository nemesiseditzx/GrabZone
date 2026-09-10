import app from './marketplace-schema-wrapper.mjs';

const now=()=>new Date().toISOString();
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const json=(x,s=200,h={})=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...h}});
async function sha(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function pbkdf(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(password)),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(String(salt)),iterations:100000,hash:'SHA-256'},key,256);return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function cookie(req,name){for(const part of (req.headers.get('Cookie')||'').split(';')){const bits=part.trim().split('=');if(bits[0]===name)return decodeURIComponent(bits.slice(1).join('='))}return ''}
function vendorCookie(token,maxAge=604800){return {'Set-Cookie':`gz_vendor_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`}}
async function one(env,sql,p=[]){return (await env.DB.prepare(sql).bind(...p).all()).results?.[0]||null}
async function all(env,sql,p=[]){return (await env.DB.prepare(sql).bind(...p).all()).results||[]}
async function adminOK(request,env,ctx){const r=await app.fetch(new Request(new URL('/api/admin-auth',request.url),{method:'GET',headers:new Headers(request.headers)}),env,ctx);if(!r.ok)return false;return !!(await r.json().catch(()=>({}))).authenticated}

/* Vendor password/session primitives are intentionally identical for every account:
   PBKDF2-HMAC-SHA256, 100000 iterations, 256-bit derived key, random salt stored
   separately in vendor_users.password_salt. */
async function vendorFromToken(token,env){if(!token)return null;return one(env,`SELECT vu.id,vu.email,vu.vendor_id,vu.role,vu.status user_status,v.id vendor_id,v.brand_name,v.business_name,v.slug,v.status vendor_status FROM vendor_sessions s JOIN vendor_users vu ON vu.id=s.vendor_user_id JOIN vendors v ON v.id=vu.vendor_id WHERE s.token_hash=? AND s.expires_at>? AND vu.status='Active' AND v.status='Active'`,[await sha(token),now()])}
async function currentVendor(request,env){const raw=cookie(request,'gz_vendor_session');return raw?vendorFromToken(raw,env):null}

async function vendorAuth(request,env){
  const p=new URL(request.url).pathname;
  if(p!=='/api/vendor-auth')return null;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS vendor_sessions(token_hash TEXT PRIMARY KEY,vendor_user_id TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL)`).run().catch(()=>{});
  if(request.method==='GET'){
    const token=cookie(request,'gz_vendor_session');
    if(!token)return json({authenticated:false},200);
    const user=await vendorFromToken(token,env);
    if(!user){return json({authenticated:false},200,{'Set-Cookie':'gz_vendor_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'})}
    return json({authenticated:true,user:{id:user.id,email:user.email,vendor_id:user.vendor_id,role:user.role,brand_name:user.brand_name,business_name:user.business_name,slug:user.slug,status:user.vendor_status}},200,vendorCookie(token));
  }
  if(request.method!=='POST')return null;
  const body=await request.clone().json().catch(()=>({}));
  if(body.action==='logout'){
    const token=cookie(request,'gz_vendor_session');
    if(token)await env.DB.prepare('DELETE FROM vendor_sessions WHERE token_hash=?').bind(await sha(token)).run().catch(()=>{});
    return json({ok:true},200,vendorCookie('',0));
  }
  const identifier=clean(body.identifier,320).toLowerCase();
  const password=String(body.password||'');
  if(!identifier||!password)return json({error:'Email and password are required.'},400);
  const user=await one(env,`SELECT vu.id,vu.vendor_id,vu.email,vu.password_hash,vu.password_salt,vu.status user_status,v.status vendor_status,v.brand_name,v.business_name,v.slug FROM vendor_users vu JOIN vendors v ON v.id=vu.vendor_id WHERE lower(vu.email)=lower(?) LIMIT 1`,[identifier]);
  if(!user||user.user_status!=='Active'||user.vendor_status!=='Active')return json({error:'This vendor account is inactive or suspended.'},403);
  if(!user.password_hash||!user.password_salt)return json({error:'This vendor account is missing secure login credentials. Ask GrabZone Admin to reset the password.'},403);
  const hash=await pbkdf(password,user.password_salt);
  if(hash!==user.password_hash)return json({error:'Invalid vendor email or password.'},401);
  /* One fresh opaque session token per successful login. Only its SHA-256 digest is stored. */
  const token=crypto.randomUUID()+crypto.randomUUID();
  const expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
  await env.DB.prepare('DELETE FROM vendor_sessions WHERE vendor_user_id=? OR expires_at<=?').bind(user.id,now()).run().catch(()=>{});
  await env.DB.prepare('INSERT INTO vendor_sessions(token_hash,vendor_user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await sha(token),user.id,expires,now()).run();
  return json({ok:true,authenticated:true,user:{id:user.id,email:user.email,vendor_id:user.vendor_id,brand_name:user.brand_name,business_name:user.business_name,slug:user.slug,status:user.vendor_status},expires_at:expires},200,vendorCookie(token));
}

async function protectVendorRequest(request,env){
  const p=new URL(request.url).pathname;
  const protectedPaths=[
    '/api/vendor/dashboard','/api/vendor/products','/api/vendor/orders','/api/vendor/profile','/api/vendor/sections',
    '/api/vendor/shipments','/api/vendor/store-sections','/api/vendor/products/','/api/vendor-auth'
  ];
  if(!protectedPaths.some(x=>p===x||x.endsWith('/')&&p.startsWith(x)))return null;
  if(p==='/api/vendor-auth')return null;
  const user=await currentVendor(request,env);
  if(!user)return json({error:'Vendor authentication required.'},401);
  return null;
}

async function overview(request,env,ctx){
  if(request.method!=='GET'||new URL(request.url).pathname!=='/api/vendor/admin/overview')return null;
  if(!await adminOK(request,env,ctx))return json({error:'Unauthorized'},401);
  const vendors=await all(env,`SELECT v.id,v.brand_name,v.business_name,v.slug,v.status,v.shipping_fee,v.commission_type,v.commission_value,
    (SELECT COUNT(*) FROM products p WHERE p.vendor_id=v.id) products,
    (SELECT COUNT(*) FROM vendor_orders vo WHERE vo.vendor_id=v.id) orders,
    (SELECT COALESCE(SUM(vo.subtotal),0) FROM vendor_orders vo WHERE vo.vendor_id=v.id) sales,
    (SELECT COALESCE(SUM(vo.commission_amount),0) FROM vendor_orders vo WHERE vo.vendor_id=v.id) commission,
    (SELECT COALESCE(SUM(vo.vendor_earnings),0) FROM vendor_orders vo WHERE vo.vendor_id=v.id) earnings
    FROM vendors v ORDER BY v.rowid DESC`);
  const rows=vendors.map(v=>({...v,brand_name:v.brand_name||v.business_name||v.slug,products:Number(v.products||0),orders:Number(v.orders||0),sales:Number(v.sales||0),commission:Number(v.commission||0),earnings:Number(v.earnings||0)}));
  const totals=rows.reduce((x,v)=>(x.sales+=v.sales,x.orders+=v.orders,x.commission+=v.commission,x.earnings+=v.earnings,x),{sales:0,orders:0,commission:0,earnings:0});
  return json({vendors:rows,totals});
}

async function createVendor(request,env,ctx){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/api/vendor/admin/vendors')return null;
  if(!await adminOK(request,env,ctx))return json({error:'Unauthorized'},401);
  const b=await request.clone().json().catch(()=>({}));
  const name=clean(b.business_name||b.brand_name,120),brand=clean(b.brand_name||name,120),email=clean(b.email,200).toLowerCase(),pass=String(b.password||'');
  if(!name||!brand||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||pass.length<8)return json({error:'Valid names, email and 8+ character password required.'},400);
  const existing=await one(env,'SELECT vu.id,vu.vendor_id,v.brand_name,v.slug FROM vendor_users vu JOIN vendors v ON v.id=vu.vendor_id WHERE lower(vu.email)=lower(?) LIMIT 1',[email]);
  if(existing)return json({error:`This login email is already assigned to vendor "${existing.brand_name||existing.slug}". Use a different vendor login email.`},409);
  let slug=clean(b.slug||brand.toLowerCase().replace(/[^a-z0-9]+/g,'-'),70)||'vendor',base=slug,n=1;
  while((await env.DB.prepare('SELECT id FROM vendors WHERE slug=?').bind(slug).all()).results?.length)slug=base+'-'+(++n);
  const id=crypto.randomUUID(),userId=crypto.randomUUID(),salt=crypto.randomUUID(),t=now();
  try{
    const passwordHash=await pbkdf(pass,salt);
    const vendor=env.DB.prepare(`INSERT INTO vendors(name,slug,business_name,brand_name,email,phone,logo_url,banner_url,description,status,shipping_fee,commission_type,commission_value,homepage_visible,featured,social_links,contact_info,announcement,business_email,order_notification_email,support_email,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(name,slug,name,brand,email,clean(b.phone,40),clean(b.logo_url,1000),clean(b.banner_url,1000),clean(b.description,5000),'Active',Math.max(0,Number(b.shipping_fee??130)),b.commission_type==='fixed'?'fixed':'percentage',Math.max(0,Number(b.commission_value??10)),b.homepage_visible===false?0:1,b.featured?1:0,JSON.stringify(b.social_links||{}),JSON.stringify(b.contact_info||{}),clean(b.announcement,500),clean(b.business_email,200).toLowerCase()||email,clean(b.order_notification_email,200).toLowerCase()||email,clean(b.support_email,200).toLowerCase()||email,t,t);
    const user=env.DB.prepare('INSERT INTO vendor_users(id,vendor_id,email,password_hash,password_salt,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(userId,id,email,passwordHash,salt,t,t);
    await env.DB.batch([vendor,user]);
    return json({ok:true,vendor:{id,slug,brand_name:brand,email}});
  }catch(err){
    const msg=String(err?.message||'');
    if(msg.toLowerCase().includes('unique')&&msg.toLowerCase().includes('vendor_users.email'))return json({error:'This login email is already assigned to another vendor. Use a different vendor login email.'},409);
    return json({error:msg||'Failed to create vendor'},500);
  }
}

async function vendorData(request,env,ctx){
  if(request.method!=='GET'||new URL(request.url).pathname!=='/api/vendor/admin/vendor-data')return null;
  if(!await adminOK(request,env,ctx))return json({error:'Unauthorized'},401);
  const id=clean(new URL(request.url).searchParams.get('vendor_id'),100);
  if(!id)return json({error:'Vendor required'},400);
  const v=await one(env,'SELECT * FROM vendors WHERE id=? OR slug=?',[id,id]);
  if(!v)return json({error:'Vendor not found'},404);
  const products=await all(env,'SELECT * FROM products WHERE vendor_id=? ORDER BY rowid DESC',[v.id]);
  const orders=await all(env,`SELECT vo.*,o.order_number,o.public_tracking_id,o.customer_name,o.email,o.phone,o.address,o.status order_status FROM vendor_orders vo JOIN orders o ON o.id=vo.order_id WHERE vo.vendor_id=? ORDER BY vo.rowid DESC`,[v.id]);
  for(const o of orders)o.shipments=await all(env,'SELECT id,courier,tracking_id,tracking_url,status,note,created_at,updated_at FROM shipments WHERE order_id=? AND vendor_id=? ORDER BY rowid DESC',[o.order_id,v.id]);
  return json({vendor:v,products,orders});
}

export default{fetch:async(request,env,ctx)=>{try{
  const auth=await vendorAuth(request,env);if(auth)return auth;
  const guard=await protectVendorRequest(request,env);if(guard)return guard;
  const ov=await overview(request,env,ctx);if(ov)return ov;
  const created=await createVendor(request,env,ctx);if(created)return created;
  const vd=await vendorData(request,env,ctx);if(vd)return vd;
  return app.fetch(request,env,ctx);
}catch(err){return json({error:err?.message||'Marketplace wrapper failed'},500)}}};
