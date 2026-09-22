import stable from './marketplace-stable-entry.mjs';
import legacyWorker from './worker.mjs';
import {handleVendorAdminApi} from './vendor-admin-api-compat.mjs';
import capabilities from './admin-vendor-capabilities-wrapper.mjs';
import adminVariations from './marketplace-admin-variations.mjs';
import marketplaceComplete from './vendor-marketplace-complete.mjs';
const now=()=>new Date().toISOString();
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
async function one(e,sql,p=[]){return (await e.DB.prepare(sql).bind(...p).all()).results?.[0]||null}
async function sha(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function pbkdf(password,salt){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(password)),'PBKDF2',false,['deriveBits']);const b=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(String(salt)),iterations:100000,hash:'SHA-256'},k,256);return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function cookie(r,n){for(const p of(r.headers.get('Cookie')||'').split(';')){const a=p.trim().split('=');if(a[0]===n)return decodeURIComponent(a.slice(1).join('='))}return''}
function bearer(r){const a=r.headers.get('Authorization')||'';return/^Bearer\s+/i.test(a)?a.replace(/^Bearer\s+/i,'').trim():(r.headers.get('X-GrabZone-Token')||'').trim()}
function ub64(s){s=String(s).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function hmac(s,d){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(s)),{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(d)))}
async function adminForToken(e,t){if(!t)return null;return one(e,'SELECT u.id,u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_user_id WHERE s.token_hash=? AND s.expires_at>?',[await sha(t),now()])}
const authSecret=e=>String(e.MARKETPLACE_AUTH_SECRET||e.D1_AUTH_SECRET||e.GRABZONE_ADMIN_PASSWORD||'');
async function normalizeAdmin(r,e){if(new URL(r.url).pathname==='/api/admin-auth'||cookie(r,'gz_admin_session'))return r;const t=bearer(r);if(!t)return r;const db=await adminForToken(e,t);let u=db;if(!u){const p=String(t).split('.');if(p.length===2&&authSecret(e)){try{const x=await hmac(authSecret(e),p[0]),y=ub64(p[1]);let d=x.length===y.length?0:1;for(let i=0;i<Math.min(x.length,y.length);i++)d|=x[i]^y[i];if(!d){const q=JSON.parse(new TextDecoder().decode(ub64(p[0])));if(Number(q.exp)>Date.now()/1000)u=await one(e,'SELECT id,email FROM admin_users WHERE id=? OR lower(email)=lower(?)',[q.sub,q.email||''])}}catch{}}}if(!u)return r;if(!db)await e.DB.prepare('INSERT OR REPLACE INTO admin_sessions(token_hash,admin_user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await sha(t),u.id,new Date(Date.now()+604800000).toISOString(),now()).run();const h=new Headers(r.headers);h.set('Cookie',`gz_admin_session=${encodeURIComponent(t)}`);return new Request(r.url,{method:r.method,headers:h,body:['GET','HEAD'].includes(r.method)?undefined:r.body,redirect:'manual'})}
async function marketplaceCategories(r,e){
  const p=new URL(r.url).pathname;
  if(p!=='/api/vendor/admin/categories-v2')return null;
  const token=bearer(r);
  const isAdmin=!!cookie(r,'gz_admin_session')||!!(token&&await adminForToken(e,token));
  if(!isAdmin)return json({error:'Unauthorized'},401);
  const exists=async()=>{try{return !!(await e.DB.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='marketplace_categories' LIMIT 1").all()).results?.length}catch{return false}};
  if(r.method==='GET'){
    try{
      if(!await exists())return json({categories:[]});
      const rows=(await e.DB.prepare('SELECT id,name,slug FROM marketplace_categories ORDER BY name COLLATE NOCASE').all()).results||[];
      return json({ok:true,categories:rows});
    }catch(err){return json({error:'Categories could not be loaded.',detail:String(err?.message||err)},500)}
  }
  if(r.method==='POST'){
    let b={};try{b=await r.json()}catch{return json({error:'Invalid JSON'},400)}
    const name=String(b.name||'').trim().slice(0,120);
    const slug=name.toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);
    if(!name||!slug)return json({error:'A valid category name is required'},400);
    try{
      if(!await exists())await e.DB.prepare('CREATE TABLE IF NOT EXISTS marketplace_categories(id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)').run();
      const hit=await e.DB.prepare('SELECT id FROM marketplace_categories WHERE slug=? OR lower(name)=lower(?) LIMIT 1').bind(slug,name).all();
      if(hit.results?.length)return json({error:'Category already exists'},409);
      const id=crypto.randomUUID(),t=now();
      await e.DB.prepare('INSERT INTO marketplace_categories(id,name,slug,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id,name,slug,t,t).run();
      return json({ok:true,category:{id,name,slug}},201);
    }catch(err){return json({error:'Category could not be saved.',detail:String(err?.message||err)},500)}
  }
  return json({error:'Method not allowed'},405);
}
const PATHS=new Set(['/api/vendor/admin/stats','/api/vendor/admin/overview','/api/vendor/admin/vendor-data','/api/vendor/admin/products','/api/vendor/admin/store-sections','/api/vendor/admin/sections','/api/vendor/admin/store/sections','/api/vendor/admin/order-status','/api/vendor/admin/order-data','/api/vendor/admin/shipment','/api/vendor/admin/reset-password','/api/vendor/upload','/api/vendor/admin/upload','/api/vendor/admin/media','/api/vendor/media']);
const OFFICIAL=new Set(['official','official-store','official_store','grabzone-official','grabzone-official-store','grabzone-store','grabzone-store-official','grab-zone','grab-zone-store']);
function key(r){const u=new URL(r.url);let k=u.searchParams.get('vendor_id')||u.searchParams.get('vendor');if(k&&k!=='null'&&k!=='undefined')return k;try{const x=new URL(r.headers.get('Referer')||'');return x.searchParams.get('vendor_id')||x.searchParams.get('vendor')||''}catch{return''}}
function normValue(v){return String(v??'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,'')}
async function vendor(e,k){const raw=String(k||'').trim();if(!raw||raw==='null'||raw==='undefined')return null;if(OFFICIAL.has(raw.toLowerCase()))return one(e,"SELECT id,slug FROM vendors WHERE lower(trim(slug))='grabzone' LIMIT 1");const exact=await one(e,'SELECT id,slug,brand_name,business_name,email FROM vendors WHERE id=? OR lower(trim(slug))=lower(trim(?)) LIMIT 1',[raw,raw]);if(exact)return exact;const normalized=normValue(raw);if(!normalized)return null;const rows=(await e.DB.prepare('SELECT id,slug,brand_name,business_name,email FROM vendors ORDER BY rowid DESC LIMIT 500').all()).results||[];const matches=rows.filter(v=>[v.id,v.slug,v.brand_name,v.business_name,v.email].some(x=>normValue(x)===normalized));if(matches.length===1)return matches[0];const base=normalized.replace(/\d+$/,'');if(base){const candidates=rows.filter(v=>[v.slug,v.brand_name,v.business_name].some(x=>{const n=normValue(x);return n===base||n.startsWith(base)}));if(candidates.length===1)return candidates[0]}return null}
async function normalizeVendor(r,e){const p=new URL(r.url).pathname;if(!PATHS.has(p))return r;const v=await vendor(e,key(r));if(!v)return r;const u=new URL(r.url);u.searchParams.set('vendor_id',v.id);if(['GET','HEAD'].includes(r.method))return new Request(u,{method:r.method,headers:r.headers,redirect:'manual'});if((r.headers.get('content-type')||'').includes('application/json')){const b=await r.clone().json().catch(()=>null);if(b&&typeof b==='object'&&('vendor_id'in b)&&(!b.vendor_id||b.vendor_id==='null'||b.vendor_id==='undefined')){b.vendor_id=v.id;const h=new Headers(r.headers);h.delete('content-length');return new Request(u,{method:r.method,headers:h,body:JSON.stringify(b),redirect:'manual'})}}return new Request(u,{method:r.method,headers:r.headers,body:r.body,redirect:'manual'})}
async function resetPassword(r,e){
 if(new URL(r.url).pathname!=='/api/vendor/admin/reset-password')return null;
 if(!cookie(r,'gz_admin_session'))return json({error:'Unauthorized'},401);
 if(r.method==='GET'){
  const vid=String(new URL(r.url).searchParams.get('vendor_id')||'').trim();
  if(!vid)return json({error:'Vendor ID required'},400);
  const v=await vendor(e,vid);if(!v)return json({error:'Vendor not found'},404);
  const u=await one(e,'SELECT id,email,status,role FROM vendor_users WHERE vendor_id=? ORDER BY created_at LIMIT 1',[v.id]);
  return json({ok:true,exists:!!u,email:u?.email||v.email||'',status:u?.status||'Active',role:u?.role||'vendor_admin'});
 }
 if(r.method!=='POST')return json({error:'Method not allowed'},405);
 const b=await r.json().catch(()=>null);if(!b)return json({error:'Invalid JSON'},400);
 const vid=String(b.vendor_id||'').trim(),pass=String(b.password||''),email=String(b.email||'').trim().toLowerCase();
 if(!vid)return json({error:'Vendor ID is required.'},400);
 if(pass&&pass.length<8)return json({error:'Password must be at least 8 characters.'},400);
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:'Enter a valid login email.'},400);
 const v=await vendor(e,vid);if(!v)return json({error:'Vendor not found'},404);
 let u=await one(e,'SELECT id,email FROM vendor_users WHERE vendor_id=? ORDER BY created_at LIMIT 1',[v.id]);
 if(!u){
   const finalEmail=email||String(v.email||'').trim().toLowerCase();
   if(!finalEmail){
     const source=await one(e,'SELECT email FROM vendors WHERE id=? LIMIT 1',[v.id]);
     if(source?.email) v.email=source.email;
   }
   const finalLoginEmail=email||String(v.email||'').trim().toLowerCase();
   if(!finalLoginEmail)return json({error:'A login email is required because this vendor has no login account.'},400);
   const clash=await one(e,'SELECT id FROM vendor_users WHERE lower(email)=lower(?) LIMIT 1',[finalLoginEmail]);
   if(clash)return json({error:'That email is already used by another vendor account.'},409);
   const id=crypto.randomUUID(),salt=crypto.randomUUID(),hash=await pbkdf(pass,salt);
   if(!pass)return json({error:'Set a password of at least 8 characters to create the vendor login.'},400);
   await e.DB.prepare('INSERT INTO vendor_users(id,vendor_id,email,password_hash,password_salt,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,v.id,finalLoginEmail,hash,salt,'vendor_admin','Active',now(),now()).run();
   return json({ok:true,created:true,email:finalLoginEmail});
 }
 if(email&&email!==String(u.email||'').toLowerCase()){
   const clash=await one(e,'SELECT id FROM vendor_users WHERE lower(email)=lower(?) AND id<>? LIMIT 1',[email,u.id]);
   if(clash)return json({error:'That email is already used by another vendor account.'},409);
   await e.DB.prepare('UPDATE vendor_users SET email=?,updated_at=? WHERE id=?').bind(email,now(),u.id).run();
 }
 if(pass){
   const salt=crypto.randomUUID(),hash=await pbkdf(pass,salt);
   await e.DB.prepare('UPDATE vendor_users SET password_hash=?,password_salt=?,updated_at=? WHERE id=?').bind(hash,salt,now(),u.id).run();
   await e.DB.prepare('DELETE FROM vendor_sessions WHERE vendor_user_id=?').bind(u.id).run().catch(()=>{});
 }
 const out=await one(e,'SELECT email FROM vendor_users WHERE id=?',[u.id]);
 return json({ok:true,created:false,email:out?.email||email||u.email});
}
export default{async fetch(req,env,ctx){try{const rawPath=new URL(req.url).pathname;
  const a=await normalizeAdmin(req,env);
  if(rawPath==='/api/vendor/admin/categories'){
    try{
      const actor=await adminForToken(env,cookie(a,'gz_admin_session')||bearer(a));
      if(!actor)return json({error:'Unauthorized'},401);
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS marketplace_categories(id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)").run();
      if(a.method==='GET'){
        const rows=(await env.DB.prepare("SELECT id,name,slug FROM marketplace_categories ORDER BY name COLLATE NOCASE").all()).results||[];
        return json({ok:true,categories:rows});
      }
      if(a.method==='POST'){
        let b={};try{b=await a.json()}catch{return json({error:'Invalid JSON'},400)}
        const name=String(b.name||'').trim().slice(0,120);
        const slug=name.toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);
        if(!name||!slug)return json({error:'A valid category name is required'},400);
        const exists=await one(env,"SELECT id FROM marketplace_categories WHERE slug=? OR lower(name)=lower(?) LIMIT 1",[slug,name]);
        if(exists)return json({error:'Category already exists'},409);
        const id=crypto.randomUUID(),t=now();
        await env.DB.prepare("INSERT INTO marketplace_categories(id,name,slug,created_at,updated_at) VALUES(?,?,?,?,?)").bind(id,name,slug,t,t).run();
        return json({ok:true,category:{id,name,slug}},201);
      }
      if(a.method==='DELETE'){
        let b={};try{b=await a.json()}catch{return json({error:'Invalid JSON'},400)}
        const id=String(b.id||'').trim();
        if(!id)return json({error:'Category id is required'},400);
        const category=await one(env,"SELECT id,name FROM marketplace_categories WHERE id=? LIMIT 1",[id]);
        if(!category)return json({error:'Category not found'},404);
        const used=await one(env,"SELECT COUNT(*) n FROM products WHERE category_id=? OR lower(trim(category))=lower(trim(?))",[category.id,category.name]);
        const affected=Number(used?.n||0);
        if(affected>0){
          await env.DB.prepare("UPDATE products SET category_id=NULL,category='General',updated_at=? WHERE category_id=? OR lower(trim(category))=lower(trim(?))").bind(now(),category.id,category.name).run();
        }
        await env.DB.prepare("DELETE FROM marketplace_categories WHERE id=?").bind(id).run();
        return json({ok:true,deleted:{id:category.id,name:category.name},products_moved_to_general:affected});
      }
      return json({error:'Method not allowed'},405);
    }catch(err){return json({error:'Categories request failed',detail:String(err?.message||err)},500)}
  }
  const r=await normalizeVendor(a,env),p=new URL(r.url).pathname;
  if(p.startsWith('/api/marketplace/admin/variations')){const av=await adminVariations.fetch(r,env,ctx);if(av)return av;}if(p==='/api/admin-auth')return legacyWorker.fetch(r,env,ctx);if(p==='/api/vendor/admin/overview')return handleVendorAdminApi(r,env);if(p==='/api/vendor/admin/vendors'||p.startsWith('/api/vendor/admin/vendors/')){const mv=await marketplaceComplete.fetch(r,env,ctx);if(mv)return mv;}if(p==='/api/vendor/admin/vendor-data'){const vd=await marketplaceComplete.fetch(r,env,ctx);if(vd)return vd;}const reset=await resetPassword(r,env);if(reset)return reset;if(p.startsWith('/api/vendor/admin/vendors/'))return capabilities.fetch(r,env,ctx);if(p==='/api/vendor/upload'||p==='/api/vendor/admin/upload'||p==='/api/vendor/admin/media'||p==='/api/vendor/media')return capabilities.fetch(r,env,ctx);if(p==='/api/vendor/admin/stats'&&req.method==='GET'){if(!cookie(r,'gz_admin_session'))return json({error:'Unauthorized'},401);const v=await vendor(env,key(r));if(!v)return json({error:'Vendor not found'},404);const [products,orders,sales]=await Promise.all([one(env,'SELECT COUNT(*) n FROM products WHERE vendor_id=?',[v.id]),one(env,'SELECT COUNT(*) n FROM vendor_orders WHERE vendor_id=?',[v.id]),one(env,'SELECT COALESCE(SUM(subtotal),0) n,COALESCE(SUM(commission_amount),0) commission,COALESCE(SUM(vendor_earnings),0) earnings FROM vendor_orders WHERE vendor_id=?',[v.id])]);return json({vendor:v,metrics:{products:Number(products?.n||0),orders:Number(orders?.n||0),sales:Number(sales?.n||0),commission:Number(sales?.commission||0),earnings:Number(sales?.earnings||0)}})}if(p==='/api/vendor/admin/products'||p==='/api/vendor/admin/store-sections'||p==='/api/vendor/admin/sections'||p==='/api/vendor/admin/store/sections'||p==='/api/vendor/admin/order-status'){const x=await handleVendorAdminApi(r,env);if(x)return x}return stable.fetch(r,env,ctx)}catch(err){return json({error:err?.message||'Marketplace API gateway failed'},500)}}};