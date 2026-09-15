import stable from './marketplace-stable-entry.mjs';
import {handleVendorAdminApi} from './vendor-admin-api-compat.mjs';

const now=()=>new Date().toISOString();
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
async function one(e,sql,p=[]){return (await e.DB.prepare(sql).bind(...p).all()).results?.[0]||null}
async function sha(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('')}
function cookie(req,n){for(const p of(req.headers.get('Cookie')||'').split(';')){const a=p.trim().split('=');if(a[0]===n)return decodeURIComponent(a.slice(1).join('='))}return ''}
function bearer(req){const a=req.headers.get('Authorization')||'';if(/^Bearer\s+/i.test(a))return a.replace(/^Bearer\s+/i,'').trim();return(req.headers.get('X-GrabZone-Token')||'').trim()}
function ub64(s){s=String(s).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function hmac(secret,data){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(secret)),{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(data)))}
async function verifySigned(token,secret){if(!token||!secret)return null;const a=String(token).split('.');if(a.length!==2)return null;try{const expected=await hmac(secret,a[0]),got=ub64(a[1]);if(expected.length!==got.length)return null;let diff=0;for(let i=0;i<expected.length;i++)diff|=expected[i]^got[i];if(diff)return null;const p=JSON.parse(new TextDecoder().decode(ub64(a[0])));return Number(p.exp)>Date.now()/1000?p:null}catch{return null}}
const authSecret=e=>String(e.MARKETPLACE_AUTH_SECRET||e.D1_AUTH_SECRET||e.GRABZONE_ADMIN_PASSWORD||'');
async function adminForToken(e,token){if(!token)return null;return one(e,"SELECT u.id,u.email,s.expires_at FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_user_id WHERE s.token_hash=? AND s.expires_at>?",[await sha(token),now()])}
async function signedAdmin(e,token){const p=await verifySigned(token,authSecret(e));if(!p?.sub)return null;return one(e,'SELECT id,email FROM admin_users WHERE id=? OR lower(email)=lower(?)',[p.sub,p.email||''])}
async function ensureSession(e,token,user){if(!token||!user)return;await e.DB.prepare('INSERT OR REPLACE INTO admin_sessions(token_hash,admin_user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await sha(token),user.id,new Date(Date.now()+7*24*60*60*1000).toISOString(),now()).run()}
async function normalizeAdminRequest(req,e){
  const path=new URL(req.url).pathname;if(path==='/api/admin-auth')return req;
  if(cookie(req,'gz_admin_session'))return req;
  const token=bearer(req);if(!token)return req;
  const dbUser=await adminForToken(e,token);const user=dbUser||await signedAdmin(e,token);if(!user)return req;
  if(!dbUser)await ensureSession(e,token,user);
  const h=new Headers(req.headers);h.set('Cookie',`gz_admin_session=${encodeURIComponent(token)}`);
  return new Request(req.url,{method:req.method,headers:h,body:['GET','HEAD'].includes(req.method)?undefined:req.body,redirect:'manual'});
}

const VENDOR_ADMIN_PATHS=new Set(['/api/vendor/admin/stats','/api/vendor/admin/vendor-data','/api/vendor/admin/products','/api/vendor/admin/categories','/api/vendor/admin/store-sections','/api/vendor/admin/sections','/api/vendor/admin/store/sections']);
const OFFICIAL_ALIASES=new Set(['official','official-store','official_store','grabzone-official','grabzone-official-store','grabzone-store','grabzone-store-official','grab-zone','grab-zone-store']);
function vendorKey(req){const u=new URL(req.url);let key=u.searchParams.get('vendor_id')||u.searchParams.get('vendor');if(key&&key!=='null'&&key!=='undefined')return key;try{const r=new URL(req.headers.get('Referer')||'');return r.searchParams.get('vendor')||r.searchParams.get('vendor_id')||''}catch{return''}}
async function resolveVendor(e,key){const k=String(key||'').trim();if(!k||k==='null'||k==='undefined')return null;if(OFFICIAL_ALIASES.has(k.toLowerCase()))return one(e,"SELECT id,slug FROM vendors WHERE lower(slug)='grabzone' LIMIT 1");return one(e,'SELECT id,slug FROM vendors WHERE id=? OR lower(slug)=lower(?) LIMIT 1',[k,k])}
async function normalizeVendorRequest(req,e){
  const p=new URL(req.url).pathname;if(!VENDOR_ADMIN_PATHS.has(p))return req;
  const key=vendorKey(req);if(!key)return req;
  const v=await resolveVendor(e,key);if(!v)return req;
  const u=new URL(req.url);u.searchParams.set('vendor_id',v.id);
  if(['GET','HEAD'].includes(req.method))return new Request(u.toString(),{method:req.method,headers:req.headers,redirect:'manual'});
  const type=req.headers.get('content-type')||'';
  if(type.includes('application/json')){
    const body=await req.clone().json().catch(()=>null);
    if(body&&typeof body==='object'&&('vendor_id' in body)&&(!body.vendor_id||body.vendor_id==='null'||body.vendor_id==='undefined')){
      body.vendor_id=v.id;const h=new Headers(req.headers);h.delete('content-length');return new Request(u.toString(),{method:req.method,headers:h,body:JSON.stringify(body),redirect:'manual'});
    }
  }
  return new Request(u.toString(),{method:req.method,headers:req.headers,body:req.body,redirect:'manual'});
}

export default {async fetch(req,env,ctx){
  try{
    const normalized=await normalizeAdminRequest(req,env);
    const vendorNormalized=await normalizeVendorRequest(normalized,env);
    const p=new URL(req.url).pathname;
    if(p==='/api/vendor/admin/stats'&&req.method==='GET'){
      if(!cookie(vendorNormalized,'gz_admin_session'))return json({error:'Unauthorized'},401);
      const key=vendorKey(vendorNormalized);if(!key)return json({error:'Vendor required'},400);
      const v=await resolveVendor(env,key);if(!v)return json({error:'Vendor not found'},404);
      const [products,orders,sales]=await Promise.all([one(env,'SELECT COUNT(*) n FROM products WHERE vendor_id=?',[v.id]),one(env,'SELECT COUNT(*) n FROM vendor_orders WHERE vendor_id=?',[v.id]),one(env,'SELECT COALESCE(SUM(subtotal),0) n,COALESCE(SUM(commission_amount),0) commission,COALESCE(SUM(vendor_earnings),0) earnings FROM vendor_orders WHERE vendor_id=?',[v.id])]);
      return json({vendor:v,metrics:{products:Number(products?.n||0),orders:Number(orders?.n||0),sales:Number(sales?.n||0),commission:Number(sales?.commission||0),earnings:Number(sales?.earnings||0)}});
    }
    if(p==='/api/vendor/admin/products'||p==='/api/vendor/admin/categories'||p==='/api/vendor/admin/store-sections'||p==='/api/vendor/admin/sections'||p==='/api/vendor/admin/store/sections'){
      const r=await handleVendorAdminApi(vendorNormalized,env);if(r)return r;
    }
    return stable.fetch(vendorNormalized,env,ctx);
  }catch(err){return json({error:err?.message||'Marketplace API gateway failed'},500)}
}};
