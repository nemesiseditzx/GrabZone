import app from './vendor-create-fix-wrapper.mjs';

const now=()=>new Date().toISOString();
const json=(x,s=200,h={})=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, must-revalidate',...h}});
const clean=v=>String(v??'').trim();
async function q(e,sql,p=[]){return e.DB.prepare(sql).bind(...p).all()}
async function one(e,sql,p=[]){return (await q(e,sql,p)).results?.[0]||null}
async function sha(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('')}
function cookie(req,n){for(const p of (req.headers.get('Cookie')||'').split(';')){const a=p.trim().split('=');if(a[0]===n)return decodeURIComponent(a.slice(1).join('='))}return ''}
async function admin(req,e){const raw=cookie(req,'gz_admin_session');if(raw){const a=await one(e,"SELECT u.id,u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_user_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1",[await sha(raw),now()]);if(a)return a}return null}
async function schema(e){
  await e.DB.prepare("CREATE TABLE IF NOT EXISTS vendors(id TEXT PRIMARY KEY,slug TEXT UNIQUE NOT NULL,business_name TEXT NOT NULL,brand_name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT,logo_url TEXT,banner_url TEXT,description TEXT,status TEXT NOT NULL DEFAULT 'Active',shipping_fee REAL NOT NULL DEFAULT 130,commission_type TEXT NOT NULL DEFAULT 'percentage',commission_value REAL NOT NULL DEFAULT 10,homepage_visible INTEGER NOT NULL DEFAULT 1,featured INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)").run();
  for(const sql of ["ALTER TABLE products ADD COLUMN vendor_id TEXT","ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0","ALTER TABLE products ADD COLUMN sku TEXT"]){try{await e.DB.prepare(sql).run()}catch{}}
}
async function findVendor(e,key){const k=clean(key);if(!k)return null;return one(e,'SELECT * FROM vendors WHERE id=? OR lower(slug)=lower(?) LIMIT 1',[k,k])}
async function vendorData(req,e){
  const a=await admin(req,e);if(!a)return json({error:'Unauthorized'},401);
  await schema(e);
  const u=new URL(req.url),v=await findVendor(e,u.searchParams.get('vendor_id')||u.searchParams.get('vendor')||'');
  if(!v)return json({error:'Vendor not found'},404);
  const products=(await q(e,'SELECT p.* FROM products p WHERE p.vendor_id=? ORDER BY p.created_at DESC',[v.id])).results||[];
  let orders=[];
  try{orders=(await q(e,`SELECT vo.*,o.order_number,o.public_tracking_id FROM vendor_orders vo LEFT JOIN orders o ON o.id=vo.order_id WHERE vo.vendor_id=? ORDER BY vo.created_at DESC LIMIT 100`,[v.id])).results||[]}catch{}
  return json({vendor:v,products,orders});
}
async function products(req,e){
  const a=await admin(req,e);if(!a)return json({error:'Unauthorized'},401);
  await schema(e);let body={};if(req.method!=='GET'){try{body=await req.json()}catch{return json({error:'Invalid JSON'},400)}}
  if(req.method==='GET'){const v=await findVendor(e,new URL(req.url).searchParams.get('vendor_id'));if(!v)return json({error:'Vendor not found'},404);return json({products:(await q(e,'SELECT * FROM products WHERE vendor_id=? ORDER BY created_at DESC',[v.id])).results||[]})}
  if(req.method==='POST'){
    const v=await findVendor(e,body.vendor_id);if(!v)return json({error:'Vendor not found'},404);
    const name=clean(body.name);const price=Number(body.price);if(!name||!Number.isFinite(price))return json({error:'Product name and valid price are required.'},400);
    const id=crypto.randomUUID(),t=now();
    const cols=['id','name','price','stock','sku','description','published','vendor_id'];const vals=[id,name,price,Number(body.stock||0),clean(body.sku),clean(body.description,10000),body.published===false?0:1,v.id];
    try{await e.DB.prepare('INSERT INTO products('+cols.join(',')+') VALUES(?,?,?,?,?,?,?,?)').bind(...vals).run()}catch(err){return json({error:'Could not create product: '+String(err.message||err)},500)}
    return json({ok:true,product:await one(e,'SELECT * FROM products WHERE id=?',[id])},201);
  }
  if(req.method==='PATCH'){
    const id=clean(body.id);if(!id)return json({error:'Product ID required.'},400);const p=await one(e,'SELECT * FROM products WHERE id=?',[id]);if(!p)return json({error:'Product not found.'},404);
    const fields=['name','sku','price','stock','description','published','vendor_id','category_id','image_url'];const sets=[],vals=[];for(const k of fields)if(body[k]!==undefined){sets.push(k+'=?');vals.push(k==='published'?(body[k]?1:0):body[k])}if(!sets.length)return json({ok:true,product:p});vals.push(id);try{await e.DB.prepare('UPDATE products SET '+sets.join(',')+' WHERE id=?').bind(...vals).run()}catch(err){return json({error:'Could not update product: '+String(err.message||err)},500)}return json({ok:true,product:await one(e,'SELECT * FROM products WHERE id=?',[id])});
  }
  return json({error:'Method not allowed'},405);
}
async function upload(req,e){
  const a=await admin(req,e);if(!a)return json({error:'Unauthorized'},401);
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const bucket=e.ASSETS_BUCKET;if(!bucket)return json({error:'Image storage is not configured.'},503);
  const form=await req.formData();const file=form.get('file');if(!file||typeof file.arrayBuffer!=='function')return json({error:'Choose an image file.'},400);
  const type=String(file.type||'application/octet-stream');if(!/^image\/(jpeg|png|webp|gif|avif)$/.test(type))return json({error:'Only JPG, PNG, WEBP, GIF or AVIF images are allowed.'},400);
  if(Number(file.size||0)>8*1024*1024)return json({error:'Image must be 8MB or smaller.'},400);
  const ext=type.split('/')[1].replace('jpeg','jpg');const scope=clean(form.get('scope')||'marketplace').replace(/[^a-z0-9_-]/gi,'').slice(0,40)||'marketplace';const key=`uploads/${scope}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  await bucket.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable'}});
  return json({ok:true,key,url:'/api/marketplace/media/'+encodeURIComponent(key),name:file.name||key,type,size:file.size});
}
async function media(req,e){const key=decodeURIComponent(new URL(req.url).pathname.slice('/api/marketplace/media/'.length));if(!key)return new Response('Not found',{status:404});const obj=await e.ASSETS_BUCKET?.get(key);if(!obj)return new Response('Not found',{status:404});const h=new Headers();obj.writeHttpMetadata(h);h.set('Cache-Control','public, max-age=31536000, immutable');return new Response(obj.body,{headers:h});}

export default{async fetch(req,e,ctx){
  const p=new URL(req.url).pathname;
  if(p==='/api/vendor/admin/vendor-data')return vendorData(req,e);
  if(p==='/api/vendor/admin/products')return products(req,e);
  if(p==='/api/vendor/admin/upload'||p==='/api/vendor/admin/media')return upload(req,e);
  if(p.startsWith('/api/marketplace/media/'))return media(req,e);
  return app.fetch(req,e,ctx);
}};
