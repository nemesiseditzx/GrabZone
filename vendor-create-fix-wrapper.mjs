import app from './marketplace-schema-wrapper.mjs';

const now=()=>new Date().toISOString();
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
async function sha(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function adminOK(request,env,ctx){
  const r=await app.fetch(new Request(new URL('/api/admin-auth',request.url),{method:'GET',headers:new Headers(request.headers)}),env,ctx);
  if(!r.ok)return false;
  return !!(await r.json().catch(()=>({}))).authenticated;
}
async function createVendor(request,env,ctx){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/api/vendor/admin/vendors')return null;
  if(!await adminOK(request,env,ctx))return json({error:'Unauthorized'},401);
  const b=await request.clone().json().catch(()=>({}));
  const name=clean(b.business_name||b.brand_name,120);
  const brand=clean(b.brand_name||name,120);
  const email=clean(b.email,200).toLowerCase();
  const pass=String(b.password||'');
  if(!name||!brand||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||pass.length<8)return json({error:'Valid names, email and 8+ character password required.'},400);
  let slug=clean(b.slug||brand.toLowerCase().replace(/[^a-z0-9]+/g,'-'),70)||'vendor',base=slug,n=1;
  while((await env.DB.prepare('SELECT id FROM vendors WHERE slug=?').bind(slug).all()).results?.length)slug=base+'-'+(++n);
  const id=crypto.randomUUID(),userId=crypto.randomUUID(),salt=crypto.randomUUID(),t=now();
  try{
    const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},k,256);
    const passwordHash=[...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('');
    // Keep the insert compatible with the legacy vendors table: name is explicitly supplied first.
    const vendor=env.DB.prepare(`INSERT INTO vendors(name,slug,business_name,brand_name,email,phone,logo_url,banner_url,description,status,shipping_fee,commission_type,commission_value,homepage_visible,featured,social_links,contact_info,announcement,business_email,order_notification_email,support_email,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      name,slug,name,brand,email,clean(b.phone,40),clean(b.logo_url,1000),clean(b.banner_url,1000),clean(b.description,5000),'Active',Math.max(0,Number(b.shipping_fee??130)),b.commission_type==='fixed'?'fixed':'percentage',Math.max(0,Number(b.commission_value??10)),b.homepage_visible===false?0:1,b.featured?1:0,JSON.stringify(b.social_links||{}),JSON.stringify(b.contact_info||{}),clean(b.announcement,500),email,email,email,t,t
    );
    const user=env.DB.prepare('INSERT INTO vendor_users(id,vendor_id,email,password_hash,password_salt,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(userId,id,email,passwordHash,salt,t,t);
    await env.DB.batch([vendor,user]);
    return json({ok:true,vendor:{id,slug,brand_name:brand,email}});
  }catch(err){return json({error:err?.message||'Failed to create vendor'},500)}
}
export default{fetch:async(request,env,ctx)=>{try{const created=await createVendor(request,env,ctx);if(created)return created;return app.fetch(request,env,ctx)}catch(err){return json({error:err?.message||'Marketplace wrapper failed'},500)}}};
