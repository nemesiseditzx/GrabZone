import marketplace from './vendor-marketplace-router.mjs';

const now=()=>new Date().toISOString();
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const json=(x,s=200,h={})=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...h}});
async function q(e,sql,p=[]){return e.DB.prepare(sql).bind(...p).all()}
async function one(e,sql,p=[]){return (await q(e,sql,p)).results?.[0]||null}
async function sha(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function pbkdf(p,s){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveBits']);const b=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(s),iterations:100000,hash:'SHA-256'},k,256);return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function cookie(req,n){for(const p of (req.headers.get('Cookie')||'').split(';')){const a=p.trim().split('=');if(a[0]===n)return decodeURIComponent(a.slice(1).join('='))}return ''}
async function hmac(secret,data){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(secret)),{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(data)))}
function b64(b){let s='';for(const x of b)s+=String.fromCharCode(x);return btoa(s).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}
async function sign(p,sec){const a=b64(new TextEncoder().encode(JSON.stringify(p)));return a+'.'+b64(await hmac(sec,a))}
function secret(e){return String(e.MARKETPLACE_AUTH_SECRET||e.D1_AUTH_SECRET||e.GRABZONE_ADMIN_PASSWORD||'')}
async function admin(req,e){const raw=cookie(req,'gz_admin_session');if(!raw)return null;return one(e,"SELECT u.id,u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_user_id WHERE s.token_hash=? AND s.expires_at>?",[await sha(raw),now()])}
async function vendor(req,e){const raw=cookie(req,'gz_vendor_session');if(!raw)return null;return one(e,"SELECT vu.id,vu.email,vu.vendor_id,vu.role,v.brand_name,v.slug FROM vendor_sessions s JOIN vendor_users vu ON vu.id=s.vendor_user_id JOIN vendors v ON v.id=vu.vendor_id WHERE s.token_hash=? AND s.expires_at>? AND vu.status='Active' AND v.status='Active'",[await sha(raw),now()])}
async function notify(e,orderNumber){try{const a=await one(e,'SELECT id,email FROM admin_users ORDER BY created_at LIMIT 1');if(!a)return;const tok=await sign({sub:a.id,email:a.email,exp:Math.floor(Date.now()/1000)+300},secret(e));const u=new URL('/api/send-order-email',e.PUBLIC_BASE_URL||'http://internal');await marketplace.fetch(new Request(u,{method:'POST',headers:{'Content-Type':'application/json','X-GrabZone-Token':tok},body:JSON.stringify({orderNumber})}),e)}catch{}}
function checkoutScript(){return `<script>(function(){
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>'৳'+Number(n||0).toLocaleString('en-BD');
async function refreshVendorShipping(){try{
const raw=localStorage.getItem('grabzone_buy_now_v2')||localStorage.getItem('grabzone_cart_v2');
const items=JSON.parse(raw||'[]');
if(!Array.isArray(items)||!items.length)return;
const ids=items.map(x=>String(x.product_id||x.id||'')).filter(Boolean);if(!ids.length)return;
const r=await fetch('/api/marketplace/products?limit=500',{cache:'no-store'});const d=await r.json();const ps=d.products||d.data||[];const map=new Map(ps.map(x=>[String(x.id),x]));
const seen=new Set();let shipping=0;const rows=[];
for(const i of items){const p=map.get(String(i.product_id||i.id||''));const vid=p?.vendor_id||p?.vendor?.id;if(!vid||seen.has(String(vid)))continue;seen.add(String(vid));const fee=Math.max(0,Number(p?.shipping_fee??p?.vendor_shipping_fee??0));shipping+=fee;rows.push({name:p?.vendor_name||p?.brand_name||'Vendor',fee})}
if(!rows.length)return;
const candidates=[...document.querySelectorAll('*')].filter(x=>/shipping/i.test(x.textContent||'')&&x.children.length<3);let target=null;for(const x of candidates){const t=(x.textContent||'').trim();if(/shipping/i.test(t)&&/130|৳/.test(t)){target=x;break}}
if(target){const parent=target.parentElement||target;const old=parent.querySelector('[data-gz-vendor-shipping]');if(old)old.remove();const box=document.createElement('div');box.setAttribute('data-gz-vendor-shipping','1');box.style='font-size:12px;opacity:.75;margin-top:5px;line-height:1.5';box.innerHTML=rows.map(x=>'<div>'+esc(x.name)+': '+money(x.fee)+'</div>').join('');parent.appendChild(box)}
const totalEl=[...document.querySelectorAll('*')].find(x=>x.children.length<2&&/^৳?\s*130$/.test((x.textContent||'').trim()));if(totalEl)totalEl.textContent=money(shipping);
}catch(e){console.warn('GrabZone vendor shipping UI:',e)}}
refreshVendorShipping();setTimeout(refreshVendorShipping,500);setTimeout(refreshVendorShipping,1500);})();</script>`}
async function route(req,e){await e.DB.prepare(`CREATE TABLE IF NOT EXISTS vendor_password_history(id TEXT PRIMARY KEY,vendor_user_id TEXT NOT NULL,changed_at TEXT NOT NULL)`).run().catch(()=>{});const p=new URL(req.url).pathname;
if((p==='/checkout.html'||p==='/checkout')&&req.method==='GET'){const r=await marketplace.fetch(req,e);if(!r.ok)return r;let html=await r.text();html=html.replace(/<\/body>/i,checkoutScript()+'</body>');return new Response(html,{status:r.status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}
if(p==='/api/vendor-auth'&&req.method==='PATCH'){const u=await vendor(req,e);if(!u)return json({error:'Unauthorized'},401);let b={};try{b=await req.json()}catch{return json({error:'Invalid JSON'},400)};const current=String(b.current_password||''),next=String(b.new_password||'');if(next.length<8)return json({error:'New password must be at least 8 characters.'},400);const row=await one(e,'SELECT password_hash,password_salt FROM vendor_users WHERE id=?',[u.id]);if(!row||await pbkdf(current,row.password_salt)!==row.password_hash)return json({error:'Current password is incorrect.'},401);const salt=crypto.randomUUID();await e.DB.prepare('UPDATE vendor_users SET password_hash=?,password_salt=?,updated_at=? WHERE id=?').bind(await pbkdf(next,salt),salt,now(),u.id).run();await e.DB.prepare('INSERT INTO vendor_password_history(id,vendor_user_id,changed_at) VALUES(?,?,?)').bind(crypto.randomUUID(),u.id,now()).run().catch(()=>{});return json({ok:true})}
if(p==='/api/vendor/admin/order-status'&&req.method==='PATCH'){const a=await admin(req,e);if(!a)return json({error:'Unauthorized'},401);let b={};try{b=await req.clone().json()}catch{return json({error:'Invalid JSON'},400)};const vo=await one(e,'SELECT vo.id,vo.order_id,o.order_number FROM vendor_orders vo JOIN orders o ON o.id=vo.order_id WHERE vo.id=?',[clean(b.vendor_order_id,100)]);const r=await marketplace.fetch(req,e);if(r.ok&&vo?.order_number)await notify(e,vo.order_number);return r}
return marketplace.fetch(req,e)}
export default{fetch:async(req,e)=>{try{const x=await route(req,e);if(x)return x;return marketplace.fetch(req,e)}catch(err){return json({error:err.message||'Internal server error'},500)}}};
