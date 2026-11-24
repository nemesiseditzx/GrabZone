const now=()=>new Date().toISOString();
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
async function q(e,s,p=[]){return e.DB.prepare(s).bind(...p).all()}
async function one(e,s,p=[]){return(await q(e,s,p)).results?.[0]||null}
async function ensureVariationOptionLinks(e, productId, variation) {
 const parts=String(variation?.options_key||'').split('|').filter(Boolean).map(part=>{const at=part.indexOf('=');return at>0?[part.slice(0,at).trim(),part.slice(at+1).trim()]:null});
 if(!parts.length||parts.some(x=>!x)||new Set(parts.map(x=>x[0])).size!==parts.length)return false;
 const rows=(await q(e,'SELECT po.id option_id,po.name,ov.id value_id,ov.value FROM product_options po LEFT JOIN option_values ov ON ov.option_id=po.id WHERE po.product_id=? ORDER BY po.sort_order,ov.sort_order',[productId])).results||[];
 const names=[...new Set(rows.map(x=>String(x.name)))];
 if(!names.length||names.length!==parts.length||names.some(name=>!parts.some(x=>x[0]===name)))return false;
 const mapped=[];
 for(const [name,value] of parts){const matches=rows.filter(x=>x.name===name&&x.value===value&&x.value_id);if(matches.length!==1)return false;mapped.push({option_id:matches[0].option_id,option_value_id:matches[0].value_id})}
 const current=(await q(e,'SELECT option_id,option_value_id FROM variation_options WHERE variation_id=?',[variation.id])).results||[];
 if(current.length===mapped.length&&mapped.every(m=>current.some(c=>String(c.option_id)===String(m.option_id)&&String(c.option_value_id)===String(m.option_value_id))))return true;
 await e.DB.batch([e.DB.prepare('DELETE FROM variation_options WHERE variation_id=?').bind(variation.id),...mapped.map(m=>e.DB.prepare('INSERT INTO variation_options(variation_id,option_id,option_value_id) VALUES(?,?,?)').bind(variation.id,m.option_id,m.option_value_id))]);
 return true;
}
async function sha(v){return[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('')}
function cookie(r,n){for(const p of(r.headers.get('Cookie')||'').split(';')){const a=p.trim().split('=');if(a[0]===n)return decodeURIComponent(a.slice(1).join('='))}return ''}
async function admin(r,e){const t=cookie(r,'gz_admin_session');if(!t)return null;return one(e,"SELECT u.id,u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_user_id WHERE s.token_hash=? AND s.expires_at>?",[await sha(t),now()])}
async function vendor(r,e){const cookieToken=cookie(r,'gz_vendor_session'),bearer=(r.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'').trim();for(const t of [...new Set([cookieToken,bearer].filter(Boolean))]){const u=await one(e,"SELECT vu.id,vu.vendor_id,vu.email,vu.role,v.slug,v.brand_name,v.status vendor_status FROM vendor_sessions s JOIN vendor_users vu ON vu.id=s.vendor_user_id JOIN vendors v ON v.id=vu.vendor_id WHERE s.token_hash=? AND s.expires_at>? AND vu.status='Active' AND v.status='Active' LIMIT 1",[await sha(t),now()]);if(u)return u}return null}
async function audit(e,type,id,action,vid,details={}){await e.DB.prepare('INSERT INTO marketplace_audit_log(id,actor_type,actor_id,action,vendor_id,details,created_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),type,id,action,vid,JSON.stringify(details),now()).run().catch(()=>{})}
let schemaPromise=null;
async function applySchemaStatement(e,sql){
 try{return await e.DB.prepare(sql).run()}
 catch(err){if(/duplicate column name|already exists/i.test(String(err?.message||err)))return null;throw err}
}
async function schema(e){if(schemaPromise)return schemaPromise;schemaPromise=(async()=>{for(const x of[
`ALTER TABLE vendors ADD COLUMN shipping_fee REAL NOT NULL DEFAULT 130`,
`ALTER TABLE vendor_orders ADD COLUMN delivery_charge REAL NOT NULL DEFAULT 0`,
`CREATE TABLE IF NOT EXISTS product_options(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,name TEXT NOT NULL,sort_order INTEGER DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS option_values(id TEXT PRIMARY KEY,option_id TEXT NOT NULL,value TEXT NOT NULL,sort_order INTEGER DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS product_variations(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,sku TEXT,regular_price REAL NOT NULL DEFAULT 0,sale_price REAL,old_price REAL,stock INTEGER NOT NULL DEFAULT 0,stock_mode TEXT NOT NULL DEFAULT 'untracked',low_stock_threshold INTEGER NOT NULL DEFAULT 5,image_url TEXT,status TEXT NOT NULL DEFAULT 'Available',min_qty INTEGER NOT NULL DEFAULT 1,max_qty INTEGER,options_key TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(product_id,options_key))`,
`CREATE TABLE IF NOT EXISTS variation_options(variation_id TEXT NOT NULL,option_id TEXT NOT NULL,option_value_id TEXT NOT NULL,PRIMARY KEY(variation_id,option_id))`,
`CREATE TABLE IF NOT EXISTS variation_images(id TEXT PRIMARY KEY,variation_id TEXT NOT NULL,image_url TEXT NOT NULL,sort_order INTEGER DEFAULT 0,created_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS vendor_product_images(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,vendor_id TEXT NOT NULL,image_url TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS inventory_log(id TEXT PRIMARY KEY,product_id TEXT,variation_id TEXT,vendor_id TEXT,change_qty INTEGER NOT NULL,reason TEXT NOT NULL,reference_id TEXT,created_at TEXT NOT NULL)`,
`CREATE INDEX IF NOT EXISTS product_variations_product_status_idx ON product_variations(product_id,status)`,`CREATE INDEX IF NOT EXISTS product_variations_sku_idx ON product_variations(sku)`,`CREATE INDEX IF NOT EXISTS variation_options_value_idx ON variation_options(option_value_id)`,`CREATE INDEX IF NOT EXISTS vendor_product_images_product_idx ON vendor_product_images(product_id,vendor_id,sort_order)`,`CREATE INDEX IF NOT EXISTS inventory_log_vendor_idx ON inventory_log(vendor_id,created_at DESC)`,
`ALTER TABLE order_items ADD COLUMN variation_id TEXT`,`ALTER TABLE order_items ADD COLUMN variation_options TEXT`,`ALTER TABLE order_items ADD COLUMN variation_sku TEXT`,`ALTER TABLE vendor_order_items ADD COLUMN variation_id TEXT`,`ALTER TABLE vendor_order_items ADD COLUMN variation_options TEXT`,`ALTER TABLE vendor_order_items ADD COLUMN variation_sku TEXT`,`ALTER TABLE product_variations ADD COLUMN stock_mode TEXT NOT NULL DEFAULT 'untracked'`
])await applySchemaStatement(e,x);return true})().catch(err=>{schemaPromise=null;console.error('Vendor variation schema initialization failed:',err);throw err});return schemaPromise}
function normalizeOptions(options){
 const seen=new Set();
 const normalized=(Array.isArray(options)?options:[]).map((o,i)=>({
  name:clean(o?.name,80),
  values:[...new Set((Array.isArray(o?.values)?o.values:[]).map(v=>clean(v,120)).filter(Boolean))],
  sort_order:i
 })).filter(o=>{
  const key=o.name.toLocaleLowerCase();
  if(!o.name||!o.values.length||/[=|]/.test(o.name)||seen.has(key)||o.values.some(v=>/[=|]/.test(v)))return false;
  seen.add(key);return true;
 });
 return normalized;
}
function comboKey(selected){
 return Object.entries(selected||{}).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`${k}=${v}`).join('|');
}
function combinations(opts){
 let rows=[{}];
 for(const o of opts){
  if(rows.length*o.values.length>200)return null;
  const next=[];
  for(const r of rows)for(const v of o.values)next.push({...r,[o.name]:v});
  rows=next;
 }
 return rows;
}
async function hydrateOptionValues(e,options){
 const byId=new Map();
 for(const option of options){option.values=[];byId.set(String(option.id),option)}
 const ids=[...byId.keys()];
 for(let i=0;i<ids.length;i+=80){
  const chunk=ids.slice(i,i+80),marks=chunk.map(()=>'?').join(',');
  const rows=(await q(e,'SELECT * FROM option_values WHERE option_id IN ('+marks+') ORDER BY option_id,sort_order,id',chunk)).results||[];
  for(const row of rows)byId.get(String(row.option_id))?.values.push(row);
 }
}
async function hydrateVariationRows(e,variations){
 const byId=new Map();
 for(const variation of variations){variation.options={};variation.images=[];byId.set(String(variation.id),variation)}
 const ids=[...byId.keys()];
 for(let i=0;i<ids.length;i+=80){
  const chunk=ids.slice(i,i+80),marks=chunk.map(()=>'?').join(',');
  const [links,images]=await Promise.all([
   q(e,'SELECT vo.variation_id,po.name,ov.value FROM variation_options vo JOIN product_options po ON po.id=vo.option_id JOIN option_values ov ON ov.id=vo.option_value_id WHERE vo.variation_id IN ('+marks+') ORDER BY vo.variation_id,po.sort_order,ov.sort_order',chunk),
   q(e,'SELECT variation_id,image_url FROM variation_images WHERE variation_id IN ('+marks+') ORDER BY variation_id,sort_order,id',chunk)
  ]);
  for(const row of links.results||[]){const variation=byId.get(String(row.variation_id));if(variation)variation.options[row.name]=row.value}
  for(const row of images.results||[]){const variation=byId.get(String(row.variation_id));if(variation&&row.image_url)variation.images.push(row.image_url)}
 }
}
async function productOwner(e,id,vid){return one(e,'SELECT id,name,price,old_price,image_url,stock,published,vendor_id FROM products WHERE id=? AND vendor_id=?',[id,vid])}
async function saveOptions(e,pid,options){await e.DB.prepare('DELETE FROM variation_options WHERE variation_id IN (SELECT id FROM product_variations WHERE product_id=?)').bind(pid).run().catch(()=>{});await e.DB.prepare('DELETE FROM option_values WHERE option_id IN (SELECT id FROM product_options WHERE product_id=?)').bind(pid).run().catch(()=>{});await e.DB.prepare('DELETE FROM product_options WHERE product_id=?').bind(pid).run().catch(()=>{});for(const o of options){const oid=crypto.randomUUID(),t=now();await e.DB.prepare('INSERT INTO product_options(id,product_id,name,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(oid,pid,o.name,o.sort_order,t,t).run();for(let i=0;i<o.values.length;i++)await e.DB.prepare('INSERT INTO option_values(id,option_id,value,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),oid,o.values[i],i,t,t).run()}}
async function loadVariation(e,id){const v=await one(e,'SELECT * FROM product_variations WHERE id=?',[id]);if(!v)return null;v.options={};for(const x of(await q(e,'SELECT po.name,ov.value FROM variation_options vo JOIN product_options po ON po.id=vo.option_id JOIN option_values ov ON ov.id=vo.option_value_id WHERE vo.variation_id=? ORDER BY po.sort_order,ov.sort_order',[id])).results||[])v.options[x.name]=x.value;v.images=(await q(e,'SELECT image_url FROM variation_images WHERE variation_id=? ORDER BY sort_order,id',[id])).results?.map(x=>x.image_url)||[];return v}
async function variations(req,e){
 const p=new URL(req.url).pathname;
 const isVariationRoute=p.startsWith('/api/vendor/variations')||p.startsWith('/api/vendor/variation/')||/^\/api\/vendor\/variation_[^/]+$/.test(p);
 if(!isVariationRoute)return null;
 const u=await vendor(req,e);
 if(!u)return json({error:'Unauthorized'},401);
 await schema(e);
 const url=new URL(req.url);if(req.method==='GET'){const pid=clean(url.searchParams.get('product_id'),120);if(!pid)return json({error:'product_id is required.'},400);if(!(await productOwner(e,pid,u.vendor_id)))return json({error:'Product not found.'},404);const opts=(await q(e,'SELECT * FROM product_options WHERE product_id=? ORDER BY sort_order,id',[pid])).results||[];await hydrateOptionValues(e,opts);const vs=(await q(e,'SELECT * FROM product_variations WHERE product_id=? ORDER BY created_at',[pid])).results||[];await hydrateVariationRows(e,vs);return json({enabled:vs.length>0||opts.length>0,options:opts,variations:vs})}
const b=await req.clone().json().catch(()=>null);if(!b||typeof b!=='object')return json({error:'Invalid JSON'},400);const pid=clean(b.product_id||url.searchParams.get('product_id'),120),owner=await productOwner(e,pid,u.vendor_id);if(!owner)return json({error:'Product not found or not owned by this vendor.'},404);if(req.method==='DELETE'){const id=clean(url.pathname.split('/').pop(),120);const v=await one(e,'SELECT * FROM product_variations WHERE id=? AND product_id=?',[id,pid]);if(!v)return json({error:'Variation not found.'},404);await e.DB.prepare("UPDATE product_variations SET status='Disabled',updated_at=? WHERE id=?").bind(now(),id).run();return json({ok:true})}
if(req.method==='POST'){
 const opts=normalizeOptions(b.options);
 if(!opts.length)return json({error:'Add at least one option with one value. Option names and values cannot contain = or |.'},400);
 const rows=combinations(opts);
 if(!rows)return json({error:'Maximum 200 generated variations per product.'},400);
 const defaultPrice=Number(b.default_price??owner.price??0);
 if(!Number.isFinite(defaultPrice)||defaultPrice<0)return json({error:'Default variation price must be a valid non-negative number.'},400);
 const keys=rows.map(comboKey);
 if(keys.some(k=>k.length>1000)||new Set(keys).size!==keys.length)return json({error:'Generated variation keys are invalid or duplicated.'},400);
 const existing=(await q(e,'SELECT id,options_key,status,created_at FROM product_variations WHERE product_id=? ORDER BY created_at,id',[pid])).results||[];
 const byKey=new Map();
 const duplicateIds=new Set();
 for(const row of existing){
  const key=String(row.options_key||'');
  if(!key){duplicateIds.add(row.id);continue}
  const prior=byKey.get(key);
  if(!prior){byKey.set(key,row);continue}
  const priorActive=prior.status!=='Disabled',rowActive=row.status!=='Disabled';
  const keep=rowActive&&!priorActive?row:prior;
  const duplicate=keep===row?prior:row;
  byKey.set(key,keep);duplicateIds.add(duplicate.id);
 }
 const t=now(),statements=[];
 // D1 batch() commits the option and variation matrix atomically.
 statements.push(e.DB.prepare('DELETE FROM variation_options WHERE variation_id IN (SELECT id FROM product_variations WHERE product_id=?)').bind(pid));
 statements.push(e.DB.prepare('DELETE FROM option_values WHERE option_id IN (SELECT id FROM product_options WHERE product_id=?)').bind(pid));
 statements.push(e.DB.prepare('DELETE FROM product_options WHERE product_id=?').bind(pid));
 const optionValueMap=new Map();
 for(const o of opts){
  const oid=crypto.randomUUID();
  statements.push(e.DB.prepare('INSERT INTO product_options(id,product_id,name,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(oid,pid,o.name,o.sort_order,t,t));
  for(let i=0;i<o.values.length;i++){
   const value=o.values[i],valueId=crypto.randomUUID();
   optionValueMap.set(o.name+'\\u0000'+value,{option_id:oid,value_id:valueId});
   statements.push(e.DB.prepare('INSERT INTO option_values(id,option_id,value,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(valueId,oid,value,i,t,t));
  }
 }
 const keep=new Set();
 for(let i=0;i<rows.length;i++){
  const selected=rows[i],key=keys[i];keep.add(key);
  const old=byKey.get(key),id=old?.id||crypto.randomUUID();
  if(old){
   // Keep the original ID, SKU, stock, price, image and Disabled state.
   statements.push(e.DB.prepare('UPDATE product_variations SET updated_at=? WHERE id=?').bind(t,id));
  }else{
   statements.push(e.DB.prepare('INSERT INTO product_variations(id,product_id,sku,regular_price,sale_price,old_price,stock,stock_mode,low_stock_threshold,image_url,status,min_qty,max_qty,options_key,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,pid,'',defaultPrice,null,null,0,'untracked',5,'','Available',1,null,key,t,t));
  }
  for(const o of opts){
   const link=optionValueMap.get(o.name+'\\u0000'+selected[o.name]);
   if(!link)throw new Error('Generated variation references an unknown option value.');
   statements.push(e.DB.prepare('INSERT INTO variation_options(variation_id,option_id,option_value_id) VALUES(?,?,?)').bind(id,link.option_id,link.value_id));
  }
 }
 for(const old of existing){
  if(duplicateIds.has(old.id)||!keep.has(String(old.options_key||''))){
   statements.push(e.DB.prepare("UPDATE product_variations SET status='Disabled',updated_at=? WHERE id=?").bind(t,old.id));
  }
 }
 // Bound D1 batch size before issuing any write.
 if(statements.length>900)return json({error:'This option matrix is too large for one safe database update. Reduce the number of option values.'},400);
 await e.DB.batch(statements);
 await audit(e,'vendor',u.id,'VARIATIONS_GENERATED',u.vendor_id,{product_id:pid,count:rows.length});
 const generated=(await q(e,"SELECT * FROM product_variations WHERE product_id=? ORDER BY created_at,id",[pid])).results||[];
 for(const v of generated){
  v.options={};
  for(const x of(await q(e,'SELECT po.name,ov.value FROM variation_options vo JOIN product_options po ON po.id=vo.option_id JOIN option_values ov ON ov.id=vo.option_value_id WHERE vo.variation_id=? ORDER BY po.sort_order,ov.sort_order',[v.id])).results||[])v.options[x.name]=x.value;
  v.images=(await q(e,'SELECT image_url FROM variation_images WHERE variation_id=? ORDER BY sort_order,id',[v.id])).results?.map(x=>x.image_url)||[];
 }
 return json({ok:true,count:rows.length,options:opts,variations:generated});
}
if(req.method==='PATCH'){const rawTail=url.pathname.split('/').pop()||'';
const id=clean(rawTail.startsWith('variation_')?rawTail.slice(10):rawTail,120),v=await one(e,'SELECT * FROM product_variations WHERE id=? AND product_id=?',[id,pid]);if(!v)return json({error:'Variation not found.'},404);const status=['Available','Out of Stock','Disabled'].includes(b.status)?b.status:v.status;if(status==='Available'&&!(await ensureVariationOptionLinks(e,pid,v)))return json({error:'Cannot mark variation Available: its option links do not match the current product options.'},409);const price=Number(b.regular_price??v.regular_price);if(!Number.isFinite(price)||price<0)return json({error:'Variation price must be a valid non-negative number.'},400);await e.DB.prepare('UPDATE product_variations SET sku=?,regular_price=?,old_price=?,image_url=?,status=?,updated_at=? WHERE id=?').bind(clean(b.sku??v.sku,120),Math.max(0,Number(b.regular_price??v.regular_price)),b.old_price===null||b.old_price===''?null:Math.max(0,Number(b.old_price)),clean(b.image_url??v.image_url,2000),status,now(),id).run();if(Array.isArray(b.images)){const images=[...new Set(b.images.map(x=>clean(x,2000)).filter(Boolean))].slice(0,30),t=now(),statements=[e.DB.prepare('DELETE FROM variation_images WHERE variation_id=?').bind(id)];for(let i=0;i<images.length;i++)statements.push(e.DB.prepare('INSERT INTO variation_images(id,variation_id,image_url,sort_order,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,images[i],i,t));await e.DB.batch(statements)}await audit(e,'vendor',u.id,'VARIATION_UPDATED',u.vendor_id,{product_id:pid,variation_id:id});return json({ok:true,variation:await loadVariation(e,id)})}return json({error:'Method not allowed'},405)}
async function profile(req,e){if(new URL(req.url).pathname!=='/api/vendor/profile')return null;const u=await vendor(req,e);if(!u)return json({error:'Unauthorized'},401);if(req.method==='GET')return json({vendor:await one(e,'SELECT * FROM vendors WHERE id=?',[u.vendor_id])});if(req.method==='PATCH'){const b=await req.json().catch(()=>({})),fields=['business_name','brand_name','phone','logo_url','banner_url','description','tagline','accent_color','announcement','social_links','contact_info','business_email','order_notification_email','support_email'],set=[],ps=[];for(const k of fields)if(b[k]!==undefined){set.push(k+'=?');ps.push(['social_links','contact_info'].includes(k)?JSON.stringify(b[k]||{}):clean(b[k],10000))}if(set.length){set.push('updated_at=?');ps.push(now(),u.vendor_id);await e.DB.prepare('UPDATE vendors SET '+set.join(',')+' WHERE id=?').bind(...ps).run()}return json({ok:true,vendor:await one(e,'SELECT * FROM vendors WHERE id=?',[u.vendor_id])})}return json({error:'Method not allowed'},405)}
async function sales(req,e){if(new URL(req.url).pathname!=='/api/vendor/sales')return null;const u=await vendor(req,e);if(!u)return json({error:'Unauthorized'},401);const rows=(await q(e,'SELECT substr(vo.created_at,1,10) day,COUNT(DISTINCT vo.order_id) orders,COALESCE(SUM(vo.subtotal),0) gross,COALESCE(SUM(vo.commission_amount),0) commission,COALESCE(SUM(vo.vendor_earnings),0) earnings FROM vendor_orders vo JOIN orders o ON o.id=vo.order_id WHERE vo.vendor_id=? GROUP BY substr(vo.created_at,1,10) ORDER BY day DESC LIMIT 90',[u.vendor_id])).results||[];const totals=(await one(e,'SELECT COUNT(DISTINCT vo.order_id) orders,COALESCE(SUM(vo.subtotal),0) gross,COALESCE(SUM(vo.commission_amount),0) commission,COALESCE(SUM(vo.vendor_earnings),0) earnings FROM vendor_orders vo JOIN orders o ON o.id=vo.order_id WHERE vo.vendor_id=?',[u.vendor_id]))||{};const best=(await q(e,'SELECT p.name,voi.product_id,SUM(voi.quantity) units,SUM(voi.line_total) revenue FROM vendor_order_items voi LEFT JOIN products p ON p.id=voi.product_id JOIN vendor_orders vo ON vo.id=voi.vendor_order_id JOIN orders o ON o.id=vo.order_id WHERE vo.vendor_id=? GROUP BY voi.product_id,p.name ORDER BY units DESC LIMIT 10',[u.vendor_id])).results||[];return json({daily:rows,totals,best_sellers:best})}
async function couponSchema(e){
 await e.DB.prepare(`CREATE TABLE IF NOT EXISTS vendor_coupons(id TEXT PRIMARY KEY,vendor_id TEXT NOT NULL,code TEXT NOT NULL,discount_type TEXT NOT NULL DEFAULT 'fixed',discount_value REAL NOT NULL DEFAULT 0,min_order_amount REAL NOT NULL DEFAULT 0,max_discount_amount REAL,usage_limit INTEGER,used_count INTEGER NOT NULL DEFAULT 0,starts_at TEXT,expires_at TEXT,active INTEGER NOT NULL DEFAULT 1,note TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`).run().catch(()=>{});
 await e.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS vendor_coupons_code_uq ON vendor_coupons(upper(code))').run().catch(()=>{});
 await e.DB.prepare('CREATE INDEX IF NOT EXISTS vendor_coupons_vendor_idx ON vendor_coupons(vendor_id,active,created_at DESC)').run().catch(()=>{});
 await e.DB.prepare('ALTER TABLE orders ADD COLUMN vendor_coupon_code TEXT').run().catch(()=>{});
 await e.DB.prepare('ALTER TABLE orders ADD COLUMN vendor_coupon_vendor_id TEXT').run().catch(()=>{});
 await e.DB.prepare('ALTER TABLE orders ADD COLUMN vendor_coupon_discount REAL NOT NULL DEFAULT 0').run().catch(()=>{});
 await e.DB.prepare('ALTER TABLE vendor_orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0').run().catch(()=>{});
 await e.DB.prepare('ALTER TABLE vendor_orders ADD COLUMN coupon_code TEXT').run().catch(()=>{});
}
function couponCode(v){return clean(v,40).toUpperCase().replace(/[^A-Z0-9_-]/g,'')}
function couponDiscount(row,subtotal){
 let d=row.discount_type==='percentage'?Math.round(subtotal*Number(row.discount_value||0)/100*100)/100:Number(row.discount_value||0);
 if(row.max_discount_amount!==null&&row.max_discount_amount!==undefined)d=Math.min(d,Number(row.max_discount_amount));
 return Math.max(0,Math.min(d,subtotal));
}
async function coupons(req,e){
 const p=new URL(req.url).pathname;
 if(p==='/api/vendor/coupons'){
   const u=await vendor(req,e);if(!u)return json({error:'Unauthorized'},401);
   await couponSchema(e);
   if(req.method==='GET'){
     const rows=(await q(e,'SELECT * FROM vendor_coupons WHERE vendor_id=? ORDER BY created_at DESC',[u.vendor_id])).results||[];
     return json({coupons:rows});
   }
   if(req.method==='POST'){
     const b=await req.json().catch(()=>({})),code=couponCode(b.code);
     if(!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code))return json({error:'Coupon code must be 3-40 characters using letters, numbers, - or _.'},400);
     const type=b.discount_type==='percentage'?'percentage':'fixed',value=Number(b.discount_value);
     if(!Number.isFinite(value)||value<=0||(type==='percentage'&&value>100))return json({error:type==='percentage'?'Percentage must be between 0 and 100.':'Discount must be greater than 0.'},400);
     const min=Math.max(0,Number(b.min_order_amount||0)),max=b.max_discount_amount===''||b.max_discount_amount==null?null:Math.max(0,Number(b.max_discount_amount));
     const limit=b.usage_limit===''||b.usage_limit==null?null:Math.max(1,Math.floor(Number(b.usage_limit)));
     const starts=b.starts_at?String(b.starts_at):null,expires=b.expires_at?String(b.expires_at):null;
     if(expires&&starts&&new Date(expires)<=new Date(starts))return json({error:'Expiry must be after the start time.'},400);
     const t=now(),id=crypto.randomUUID();
     try{
       await e.DB.prepare('INSERT INTO vendor_coupons(id,vendor_id,code,discount_type,discount_value,min_order_amount,max_discount_amount,usage_limit,used_count,starts_at,expires_at,active,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,u.vendor_id,code,type,value,min,max,limit,0,starts,expires,Number(b.active??1)?1:0,clean(b.note,500),t,t).run();
     }catch(err){return json({error:/unique/i.test(err?.message||'')?'That coupon code is already in use.':err?.message||'Could not create coupon.'},400)}
     await audit(e,'vendor',u.id,'COUPON_CREATED',u.vendor_id,{coupon_id:id,code});
     return json({ok:true,coupon:await one(e,'SELECT * FROM vendor_coupons WHERE id=?',[id])},201);
   }
   if(req.method==='PATCH'){
     const b=await req.json().catch(()=>({})),id=clean(b.id,120),old=await one(e,'SELECT * FROM vendor_coupons WHERE id=? AND vendor_id=?',[id,u.vendor_id]);
     if(!old)return json({error:'Coupon not found.'},404);
     const code=couponCode(b.code??old.code),type=b.discount_type==='percentage'?'percentage':(b.discount_type??old.discount_type),value=Number(b.discount_value??old.discount_value);
     if(!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code))return json({error:'Invalid coupon code.'},400);
     if(!Number.isFinite(value)||value<=0||(type==='percentage'&&value>100))return json({error:'Invalid discount.'},400);
     const min=Math.max(0,Number(b.min_order_amount??old.min_order_amount)),max=b.max_discount_amount===''||b.max_discount_amount==null?null:Math.max(0,Number(b.max_discount_amount??old.max_discount_amount));
     const limit=b.usage_limit===''||b.usage_limit==null?null:Math.max(1,Math.floor(Number(b.usage_limit??old.usage_limit)));
     const starts=b.starts_at===undefined?old.starts_at:(b.starts_at?String(b.starts_at):null),expires=b.expires_at===undefined?old.expires_at:(b.expires_at?String(b.expires_at):null);
     if(expires&&starts&&new Date(expires)<=new Date(starts))return json({error:'Expiry must be after the start time.'},400);
     try{
       await e.DB.prepare('UPDATE vendor_coupons SET code=?,discount_type=?,discount_value=?,min_order_amount=?,max_discount_amount=?,usage_limit=?,starts_at=?,expires_at=?,active=?,note=?,updated_at=? WHERE id=? AND vendor_id=?').bind(code,type,value,min,max,limit,starts,expires,Number(b.active??old.active)?1:0,clean(b.note??old.note,500),now(),id,u.vendor_id).run();
     }catch(err){return json({error:/unique/i.test(err?.message||'')?'That coupon code is already in use.':err?.message||'Could not update coupon.'},400)}
     await audit(e,'vendor',u.id,'COUPON_UPDATED',u.vendor_id,{coupon_id:id,code});
     return json({ok:true,coupon:await one(e,'SELECT * FROM vendor_coupons WHERE id=?',[id])});
   }
   if(req.method==='DELETE'){
     const id=clean(new URL(req.url).searchParams.get('id'),120),old=await one(e,'SELECT * FROM vendor_coupons WHERE id=? AND vendor_id=?',[id,u.vendor_id]);
     if(!old)return json({error:'Coupon not found.'},404);
     await e.DB.prepare('UPDATE vendor_coupons SET active=0,updated_at=? WHERE id=? AND vendor_id=?').bind(now(),id,u.vendor_id).run();
     await audit(e,'vendor',u.id,'COUPON_DISABLED',u.vendor_id,{coupon_id:id,code:old.code});
     return json({ok:true});
   }
 }
 if(p==='/api/vendor/coupons/validate'){
   await couponSchema(e);
   const url=new URL(req.url),code=couponCode(url.searchParams.get('code')),vendorId=clean(url.searchParams.get('vendor_id'),120),subtotal=Math.max(0,Number(url.searchParams.get('subtotal')||0));
   if(!code||!vendorId)return json({valid:false,discount:0,message:'Enter a coupon code.'},400);
   const row=await one(e,'SELECT c.*,v.status vendor_status FROM vendor_coupons c JOIN vendors v ON v.id=c.vendor_id WHERE upper(c.code)=upper(?) AND c.vendor_id=? AND c.active=1 LIMIT 1',[code,vendorId]);
   if(!row||String(row.vendor_status||'Active')!=='Active')return json({valid:false,discount:0,message:'This coupon is not valid for this store.'});
   if(row.starts_at&&new Date(row.starts_at)>new Date())return json({valid:false,discount:0,message:'This coupon is not active yet.'});
   if(row.expires_at&&new Date(row.expires_at)<=new Date())return json({valid:false,discount:0,message:'This coupon has expired.'});
   if(row.usage_limit!==null&&Number(row.used_count||0)>=Number(row.usage_limit))return json({valid:false,discount:0,message:'This coupon has reached its usage limit.'});
   if(subtotal<Number(row.min_order_amount||0))return json({valid:false,discount:0,message:'Minimum order for this store is ৳'+Number(row.min_order_amount||0).toLocaleString('en-BD')+'.'});
   const discount=couponDiscount(row,subtotal);
   if(discount<=0)return json({valid:false,discount:0,message:'This coupon cannot be applied to this store.'});
   return json({valid:true,code:String(row.code).toUpperCase(),vendor_id:vendorId,discount,discount_type:row.discount_type,discount_value:Number(row.discount_value||0),label:row.discount_type==='percentage'?Number(row.discount_value||0)+'% off':'৳'+Number(row.discount_value||0)+' off'});
 }
 return null;
}
async function publicVariation(req,e){if(new URL(req.url).pathname!=='/api/marketplace/variations')return null;await schema(e);const id=clean(new URL(req.url).searchParams.get('product_id'),120);if(!id)return json({error:'product_id is required.'},400);const product=await one(e,'SELECT * FROM products WHERE id=?',[id]);if(!product||!product.published)return json({error:'Product not found.'},404);
 product.image_urls=((await q(e,'SELECT image_url FROM vendor_product_images WHERE product_id=? AND vendor_id=? ORDER BY sort_order,id',[id,product.vendor_id])).results||[]).map(x=>x.image_url).filter(Boolean);
 if(!product.image_urls.length&&product.image_url)product.image_urls=[product.image_url];let opts=(await q(e,'SELECT * FROM product_options WHERE product_id=? ORDER BY sort_order,id',[id])).results||[];
 await hydrateOptionValues(e,opts);
 // Recover variable products whose old option definitions were never saved.
 // The editor's Size Details format is used only when the product is explicitly variable.
 if(!opts.length&&String(product.product_type||'').toLowerCase()==='variable'){
   const found=[];
   for(const m of String(product.description||'').matchAll(/(?:^|\n)\s*(S|M|L|XL|XXL|XXXL)\s*=\s*[^\n]+/gi)){const value=m[1].toUpperCase();if(!found.includes(value))found.push(value)}
   if(found.length){
     const t=new Date().toISOString(),oid=crypto.randomUUID();
     await e.DB.prepare('INSERT INTO product_options(id,product_id,name,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(oid,id,'Size',0,t,t).run();
     for(let i=0;i<found.length;i++)await e.DB.prepare('INSERT INTO option_values(id,option_id,value,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),oid,found[i],i,t,t).run();
     opts=(await q(e,'SELECT * FROM product_options WHERE product_id=? ORDER BY sort_order,id',[id])).results||[];
     await hydrateOptionValues(e,opts);
   }
 }let vs=(await q(e,"SELECT id,sku,regular_price,sale_price,old_price,stock,stock_mode,low_stock_threshold,image_url,status,min_qty,max_qty,options_key FROM product_variations WHERE product_id=? AND status!='Disabled' ORDER BY created_at",[id])).results||[];
 // Repair products that have saved option definitions but never got variation rows.
 // This keeps the public product page usable without recreating intentionally disabled variations.
 if(!vs.length&&opts.length&&String(product.product_type||'').toLowerCase()==='variable'){
   // Variable products must have active variation rows. Rebuild them when
   // an earlier save left the option definitions without active rows.
   let combos=[{}];
   for(const o of opts){
     const next=[];
     for(const x of combos)for(const val of(o.values||[]))next.push({...x,[o.name]:val.value});
     combos=next;
   }
   const t=new Date().toISOString();
   const rows=(await q(e,'SELECT po.id option_id,po.name,ov.id value_id,ov.value FROM product_options po JOIN option_values ov ON ov.option_id=po.id WHERE po.product_id=? ORDER BY po.sort_order,ov.sort_order',[id])).results||[];
   const map=new Map(rows.map(x=>[x.name+'\\u0000'+x.value,{option_id:x.option_id,value_id:x.value_id}]));
   for(const selected of combos){
     const key=Object.entries(selected).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>k+'='+v).join('|').slice(0,1000);
     const existing=await one(e,'SELECT id FROM product_variations WHERE product_id=? AND options_key=?',[id,key]);
     const vid=existing?.id||crypto.randomUUID();
     if(existing){
       await e.DB.prepare("UPDATE product_variations SET status='Available',updated_at=? WHERE id=?").bind(t,vid).run();
       await e.DB.prepare('DELETE FROM variation_options WHERE variation_id=?').bind(vid).run();
     }else{
       await e.DB.prepare('INSERT INTO product_variations(id,product_id,sku,regular_price,sale_price,old_price,stock,low_stock_threshold,image_url,status,min_qty,max_qty,options_key,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(vid,id,'',Number(product.price||0),null,null,0,5,'', 'Available',1,null,key,t,t).run();
     }
     for(const o of opts){
       const m=map.get(o.name+'\\u0000'+selected[o.name]);
       if(m)await e.DB.prepare('INSERT OR IGNORE INTO variation_options(variation_id,option_id,option_value_id) VALUES(?,?,?)').bind(vid,m.option_id,m.value_id).run();
     }
   }
   vs=(await q(e,"SELECT id,sku,regular_price,old_price,stock,stock_mode,low_stock_threshold,image_url,status,min_qty,max_qty,options_key FROM product_variations WHERE product_id=? AND status!='Disabled' ORDER BY created_at",[id])).results||[];
 }
 await hydrateVariationRows(e,vs);
 for(const v of vs){
   const links=(await q(e,'SELECT vo.option_id,vo.option_value_id,po.name,ov.value FROM variation_options vo JOIN product_options po ON po.id=vo.option_id JOIN option_values ov ON ov.id=vo.option_value_id WHERE vo.variation_id=?',[v.id])).results||[];

   /*
     Repair older variation rows whose option links were lost while the
     product option definitions were recreated. The options_key already
     contains the exact combination, so this is safe and deterministic.
   */
   if(opts.length && links.length<opts.length && v.options_key){
     const parsed={};
     for(const part of String(v.options_key).split('|')){
       const at=part.indexOf('=');
       if(at>0) parsed[part.slice(0,at)]=part.slice(at+1);
     }
     for(const o of opts){
       const value=parsed[o.name];
       const ov=(o.values||[]).find(x=>String(x.value)===String(value));
       if(!ov) continue;
       const exists=links.some(x=>String(x.option_id)===String(o.id));
       if(exists) continue;
       await e.DB.prepare('INSERT OR IGNORE INTO variation_options(variation_id,option_id,option_value_id) VALUES(?,?,?)').bind(v.id,o.id,ov.id).run();
     }
   }

   v.options={};
   for(const x of(await q(e,'SELECT po.name,ov.value FROM variation_options vo JOIN product_options po ON po.id=vo.option_id JOIN option_values ov ON ov.id=vo.option_value_id WHERE vo.variation_id=? ORDER BY po.sort_order,ov.sort_order',[v.id])).results||[])v.options[x.name]=x.value;
   v.images=(await q(e,'SELECT image_url FROM variation_images WHERE variation_id=? ORDER BY sort_order,id',[v.id])).results?.map(x=>x.image_url)||[];
 }
 return json({product,options:opts,variations:vs})}
async function orderGuard(req,e,next){if(new URL(req.url).pathname!=='/api/d1'||req.method!=='POST')return null;const b=await req.clone().json().catch(()=>null);if(b?.fn!=='create_public_order')return null;const payload=b.args?.payload||b.payload||{},items=Array.isArray(payload.items)?payload.items:[];if(!items.length)return null;await schema(e);const nextItems=[];for(const raw of items){const item={...raw},qty=Math.max(1,Math.floor(Number(item.quantity||1)));if(item.variation_id){const v=await one(e,"SELECT pv.id,pv.product_id,pv.sku,pv.regular_price,pv.sale_price,pv.old_price,pv.image_url,pv.status,p.name,p.sku product_sku,p.published,p.vendor_id,ven.status vendor_status FROM product_variations pv JOIN products p ON p.id=pv.product_id LEFT JOIN vendors ven ON ven.id=p.vendor_id WHERE pv.id=?",[clean(item.variation_id,120)]);if(!v||!v.published||v.status!=='Available'||v.vendor_status&&v.vendor_status!=='Active')return json({error:'One selected variation is no longer available.'},409);const regular=Math.max(0,Number(v.regular_price||0)),sale=Math.max(0,Number(v.sale_price||0));const unit=sale>0&&sale<regular?sale:regular;item.product_id=v.product_id;item.unit_price=unit;item.price=unit;item.line_total=unit*qty;item.product_name=v.name;item.image_url=v.image_url||item.image_url;item.sku=v.sku||v.product_sku||item.sku;const optionRows=(await q(e,'SELECT po.name,ov.value FROM variation_options vo JOIN product_options po ON po.id=vo.option_id JOIN option_values ov ON ov.id=vo.option_value_id WHERE vo.variation_id=? ORDER BY po.sort_order,ov.sort_order',[v.id])).results||[];const resolvedOptions={};for(const x of optionRows)resolvedOptions[x.name]=x.value;item.variation_options=Object.keys(resolvedOptions).length?resolvedOptions:(item.variation_options&&typeof item.variation_options==='object'?item.variation_options:{});}else{const p=await one(e,"SELECT p.*,ven.status vendor_status FROM products p LEFT JOIN vendors ven ON ven.id=p.vendor_id WHERE p.id=?",[clean(item.product_id||item.id,120)]);if(!p||!p.published||p.vendor_status&&p.vendor_status!=='Active')return json({error:'One selected product is no longer available.'},409);if(p.product_type==='variable')return json({error:p.name+' requires a variation selection.'},409);if(!Number.isFinite(Number(p.price))||Number(p.price)<0)return json({error:'Invalid price for '+p.name+'.'},409);const unit=Number(p.price||0);item.product_id=p.id;item.unit_price=unit;item.price=unit;item.line_total=unit*qty;item.product_name=p.name;item.image_url=p.image_url||item.image_url;item.sku=p.sku||item.sku;}nextItems.push(item)}
const nb={...b,args:{...(b.args||{}),payload:{...payload,items:nextItems}}};const h=new Headers(req.headers);h.delete('content-length');const r=await next(new Request(req.url,{method:'POST',headers:h,body:JSON.stringify(nb)}));return r}
async function route(req,e,ctx,next){await schema(e);const p=new URL(req.url).pathname;const couponResult=await coupons(req,e);if(couponResult)return couponResult;if(p==='/api/vendor/variations'||p.startsWith('/api/vendor/variations/')||p.startsWith('/api/vendor/variation/')||/^\/api\/vendor\/variation_[^/]+$/.test(p))return variations(req,e);if(p==='/api/vendor/profile')return profile(req,e);if(p==='/api/vendor/sales')return sales(req,e);if(p==='/api/marketplace/variations')return publicVariation(req,e);if(p==='/api/vendor/admin/audit'){if(!await admin(req,e))return json({error:'Unauthorized'},401);const id=clean(new URL(req.url).searchParams.get('vendor_id'),120);return json({logs:(await q(e,`SELECT * FROM marketplace_audit_log WHERE (?='' OR vendor_id=?) ORDER BY created_at DESC LIMIT 300`,[id,id])).results||[]})}if(p==='/api/vendor/admin/payouts'){if(!await admin(req,e))return json({error:'Unauthorized'},401);return json({payouts:(await q(e,'SELECT v.id,v.brand_name,COALESCE(SUM(vo.vendor_earnings),0) earnings,COUNT(vo.id) orders FROM vendors v LEFT JOIN vendor_orders vo ON vo.vendor_id=v.id GROUP BY v.id ORDER BY earnings DESC')).results||[]})}if(p==='/api/d1'&&req.method==='POST')return orderGuard(req,e,ctx,next);return null}
export default{fetch:async(req,e,ctx,next)=>{try{const x=await route(req,e,ctx,next);return x||next(req)}catch(err){console.error('Vendor system request failed',err);return json({error:'Vendor system failed'},500)}}};