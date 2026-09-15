import stable from './marketplace-stable-entry.mjs';
import {handleVendorAdminApi} from './vendor-admin-api-compat.mjs';

function normalizeAdminRequest(req){
  const path=new URL(req.url).pathname;
  if(path==='/api/admin-auth')return req;
  if(req.headers.get('Cookie')?.match(/(?:^|;)\s*gz_admin_session=/))return req;
  const auth=req.headers.get('Authorization')||'';
  const token=/^Bearer\s+/i.test(auth)?auth.replace(/^Bearer\s+/i,'').trim():(req.headers.get('X-GrabZone-Token')||'').trim();
  if(!token)return req;
  const h=new Headers(req.headers);h.set('Cookie',`gz_admin_session=${encodeURIComponent(token)}`);
  return new Request(req.url,{method:req.method,headers:h,body:['GET','HEAD'].includes(req.method)?undefined:req.body,redirect:'manual'});
}
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
async function one(e,sql,p=[]){return (await e.DB.prepare(sql).bind(...p).all()).results?.[0]||null}
function vendorKey(req){const u=new URL(req.url);let key=u.searchParams.get('vendor_id')||u.searchParams.get('vendor');if(key&&key!=='null')return key;try{const ref=req.headers.get('Referer')||'';const ru=new URL(ref);return ru.searchParams.get('vendor')||''}catch{return''}}

export default {async fetch(req,env,ctx){
  const normalized=normalizeAdminRequest(req);
  const p=new URL(req.url).pathname;
  if(p==='/api/vendor/admin/stats'&&req.method==='GET'){
    const key=vendorKey(normalized);if(!key)return json({error:'Vendor required'},400);
    const v=await one(env,'SELECT id,brand_name,slug FROM vendors WHERE id=? OR slug=? LIMIT 1',[key,key]);if(!v)return json({error:'Vendor not found'},404);
    const [products,orders,sales]=await Promise.all([one(env,'SELECT COUNT(*) n FROM products WHERE vendor_id=?',[v.id]),one(env,'SELECT COUNT(*) n FROM vendor_orders WHERE vendor_id=?',[v.id]),one(env,'SELECT COALESCE(SUM(subtotal),0) n,COALESCE(SUM(commission_amount),0) commission,COALESCE(SUM(vendor_earnings),0) earnings FROM vendor_orders WHERE vendor_id=?',[v.id])]);
    return json({vendor:v,metrics:{products:Number(products?.n||0),orders:Number(orders?.n||0),sales:Number(sales?.n||0),commission:Number(sales?.commission||0),earnings:Number(sales?.earnings||0)}});
  }
  if(p==='/api/vendor/admin/products'||p==='/api/vendor/admin/categories'||p==='/api/vendor/admin/store-sections'||p==='/api/vendor/admin/sections'||p==='/api/vendor/admin/store/sections'){
    const r=await handleVendorAdminApi(normalized,env);if(r)return r;
  }
  return stable.fetch(normalized,env,ctx);
}};
