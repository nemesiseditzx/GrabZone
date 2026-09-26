import app from './marketplace-schema-wrapper.mjs';

const now=()=>new Date().toISOString();
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
async function sha(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function one(e,sql,p=[]){return (await e.DB.prepare(sql).bind(...p).all()).results?.[0]||null}
async function all(e,sql,p=[]){return (await e.DB.prepare(sql).bind(...p).all()).results||[]}
async function admin(req,e){
  const r=await app.fetch(new Request(new URL('/api/admin-auth',req.url),{method:'GET',headers:new Headers(req.headers)}),e);
  const d=await r.json().catch(()=>({}));
  if(d?.authenticated)return d.user||{id:d.user?.id,email:d.user?.email};
  return null;
}
async function vendorData(req,e){
  const p=new URL(req.url).pathname;
  if(p!=='/api/vendor/admin/vendor-data'||req.method!=='GET')return null;
  const a=await admin(req,e);if(!a)return json({error:'Unauthorized'},401);
  const id=clean(new URL(req.url).searchParams.get('vendor_id'),100);
  if(!id)return json({error:'Vendor required'},400);
  const v=await one(e,'SELECT * FROM vendors WHERE id=? OR slug=?',[id,id]);
  if(!v)return json({error:'Vendor not found'},404);
  const products=await all(e,'SELECT id,name,sku,price,stock,published,created_at,updated_at FROM products WHERE vendor_id=? ORDER BY created_at DESC',[v.id]);
  const orders=await all(e,`SELECT vo.*,o.order_number,o.public_tracking_id,o.customer_name,o.email,o.phone,o.address,o.status order_status FROM vendor_orders vo JOIN orders o ON o.id=vo.order_id WHERE vo.vendor_id=? ORDER BY vo.created_at DESC`,[v.id]);
  for(const o of orders)o.shipments=await all(e,'SELECT id,courier,tracking_id,tracking_url,status,note,created_at,updated_at FROM shipments WHERE order_id=? AND vendor_id=? ORDER BY created_at DESC',[o.order_id,v.id]);
  return json({vendor:v,products,orders});
}
export default{fetch:async(req,e,ctx)=>{try{const x=await vendorData(req,e);if(x)return x;return app.fetch(req,e,ctx)}catch(err){return json({error:err?.message||'Marketplace control error'},500)}}};