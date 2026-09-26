const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, must-revalidate'}});
const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const now=()=>new Date().toISOString();
function cookie(req,n){for(const p of(req.headers.get('Cookie')||'').split(';')){const a=p.trim().split('=');if(a[0]===n)return decodeURIComponent(a.slice(1).join('='))}return ''}
async function sha(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function one(e,s,p=[]){return(await e.DB.prepare(s).bind(...p).all()).results?.[0]||null}
async function all(e,s,p=[]){return(await e.DB.prepare(s).bind(...p).all()).results||[]}
async function admin(req,e){const t=cookie(req,'gz_admin_session');if(!t)return null;return one(e,"SELECT u.id,u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_user_id WHERE s.token_hash=? AND s.expires_at>?",[await sha(t),now()])}
async function vendorUser(req,e){const t=cookie(req,'gz_vendor_session');if(!t)return null;return one(e,"SELECT vu.id,vu.vendor_id,vu.email,v.slug,v.brand_name FROM vendor_sessions s JOIN vendor_users vu ON vu.id=s.vendor_user_id JOIN vendors v ON v.id=vu.vendor_id WHERE s.token_hash=? AND s.expires_at>? AND vu.status='Active' AND v.status='Active'",[await sha(t),now()])}
async function actor(req,e,vendorId){const a=await admin(req,e);if(a)return{type:'admin',id:a.id,vendorId:vendorId||null};const u=await vendorUser(req,e);if(u&&(!vendorId||String(u.vendor_id)===String(vendorId)))return{type:'vendor',id:u.id,vendorId:u.vendor_id};return null}
async function resolveVendor(req,e,value){let id=clean(value,120);if(!id||id==='null'||id==='undefined'){try{id=new URL(req.headers.get('Referer')||'').searchParams.get('vendor')||''}catch{}}if(!id)return null;return one(e,'SELECT * FROM vendors WHERE id=? OR slug=?',[id,id])}
async function tableColumns(e,table){try{return new Set((await all(e,`PRAGMA table_info(${table})`)).map(x=>x.name))}catch{return new Set()}}
async function ensureImages(e){await e.DB.prepare('CREATE TABLE IF NOT EXISTS vendor_product_images(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,vendor_id TEXT NOT NULL,image_url TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL)').run().catch(()=>{});await e.DB.prepare('CREATE INDEX IF NOT EXISTS vendor_product_images_idx ON vendor_product_images(product_id,vendor_id,sort_order)').run().catch(()=>{})}
async function imageUrls(e,pid,vid){await ensureImages(e);const rows=await all(e,'SELECT image_url FROM vendor_product_images WHERE product_id=? AND vendor_id=? ORDER BY sort_order,id',[pid,vid]);return rows.map(x=>x.image_url).filter(Boolean)}
function assetKey(e,url){const u=String(url||'').trim();if(!u)return '';const base=String(e.R2_PUBLIC_BASE_URL||'').replace(/\/$/,'');if(base&&u.startsWith(base+'/'))return u.slice(base.length+1);try{const x=new URL(u);if(x.pathname.startsWith('/api/r2/'))return decodeURIComponent(x.pathname.slice('/api/r2/'.length))}catch{}return ''}
async function deleteAssetIfUnused(e,url){const key=assetKey(e,url);if(!key||!e.ASSETS_BUCKET)return;try{const refs=[await one(e,'SELECT id FROM vendor_product_images WHERE image_url=? LIMIT 1',[url]),await one(e,'SELECT id FROM products WHERE image_url=? LIMIT 1',[url]),await one(e,'SELECT id FROM product_images WHERE image_url=? LIMIT 1',[url]),await one(e,'SELECT id FROM product_reviews WHERE photo_url=? LIMIT 1',[url]),await one(e,'SELECT id FROM order_items WHERE image_url=? LIMIT 1',[url])];if(refs.some(Boolean))return;await e.ASSETS_BUCKET.delete(key)}catch{}}
async function saveImages(e,pid,vid,urls,replace=true){if(!Array.isArray(urls))return;await ensureImages(e);const list=[...new Set(urls.map(x=>clean(x,2000)).filter(Boolean))].slice(0,10);if(replace){const old=await all(e,'SELECT image_url FROM vendor_product_images WHERE product_id=? AND vendor_id=?',[pid,vid]);await e.DB.prepare('DELETE FROM vendor_product_images WHERE product_id=? AND vendor_id=?').bind(pid,vid).run();for(const x of old)if(!list.includes(x.image_url))await deleteAssetIfUnused(e,x.image_url)}for(let i=0;i<list.length;i++)await e.DB.prepare('INSERT INTO vendor_product_images(id,product_id,vendor_id,image_url,sort_order,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),pid,vid,list[i],i,now()).run()}
async function categoryValue(e,body,cols){
 let value=clean(body.category||body.category_name);
 const categoryId=clean(body.category_id);
 if(categoryId){
  try{
   const c=await one(e,'SELECT id,name FROM marketplace_categories WHERE id=?',[categoryId]);
   if(!c)return{error:'Selected category does not exist.'};
   value=clean(c.name);
  }catch{return{error:'Category lookup failed.'}}
 }
 if(!value)value='General';
 return{categoryId:categoryId||null,value};
}
async function ensureProductMarketplaceColumns(e){for(const sql of [
 'ALTER TABLE products ADD COLUMN sale_price REAL',
 'ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 0',
 'ALTER TABLE products ADD COLUMN min_qty INTEGER NOT NULL DEFAULT 1',
 'ALTER TABLE products ADD COLUMN max_qty INTEGER',
 'ALTER TABLE products ADD COLUMN product_type TEXT NOT NULL DEFAULT \'simple\'',
 'ALTER TABLE products ADD COLUMN category_id TEXT'
])await e.DB.prepare(sql).run().catch(()=>{});}
async function products(req,e){const u=new URL(req.url),p=u.pathname;if(p!=='/api/vendor/admin/products')return null;await ensureProductMarketplaceColumns(e);const body=req.method==='GET'?{}:await req.json().catch(()=>({}));let vid=body.vendor_id||u.searchParams.get('vendor_id');
if(req.method==='GET'&&!vid){
 const a=await admin(req,e);if(!a)return json({error:'Unauthorized'},401);
 const rows=await all(e,`SELECT p.*,v.brand_name vendor_name,v.business_name vendor_business_name,c.name category_name,c.slug category_slug FROM products p LEFT JOIN vendors v ON v.id=p.vendor_id LEFT JOIN marketplace_categories c ON c.id=p.category_id ORDER BY COALESCE(p.updated_at,p.created_at) DESC`);
 for(const p of rows){if(!p.category_name&&p.category){try{const c=await one(e,'SELECT id,name,slug FROM marketplace_categories WHERE lower(trim(name))=lower(trim(?)) LIMIT 1',[p.category]);if(c){p.category_id=c.id;p.category_name=c.name;p.category_slug=c.slug}}catch{}}p.image_urls=await imageUrls(e,p.id,p.vendor_id);if(!p.image_urls.length&&p.image_url)p.image_urls=[p.image_url]}
 return json({products:rows});
}
const v=await resolveVendor(req,e,vid);if(!v)return json({error:'Vendor not found.'},404);const a=await actor(req,e,v.id);if(!a)return json({error:'Unauthorized'},401);if(req.method==='GET'){const rows=await all(e,`SELECT p.*,c.name category_name,c.slug category_slug FROM products p LEFT JOIN marketplace_categories c ON c.id=p.category_id WHERE p.vendor_id=? ORDER BY COALESCE(p.updated_at,p.created_at) DESC`,[v.id]);for(const p of rows){if(!p.category_name&&p.category){try{const c=await one(e,'SELECT id,name,slug FROM marketplace_categories WHERE lower(trim(name))=lower(trim(?)) LIMIT 1',[p.category]);if(c){p.category_id=c.id;p.category_name=c.name;p.category_slug=c.slug}}catch{}}p.image_urls=await imageUrls(e,p.id,v.id);if(!p.image_urls.length&&p.image_url)p.image_urls=[p.image_url]}return json({products:rows})}
if(req.method==='DELETE'){
 const id=clean(body.id,120);if(!id)return json({error:'Product id is required.'},400);
 const current=await one(e,'SELECT * FROM products WHERE id=? AND vendor_id=?',[id,v.id]);if(!current)return json({error:'Product not found.'},404);
 const imgs=await all(e,'SELECT image_url FROM vendor_product_images WHERE product_id=? AND vendor_id=?',[id,v.id]);
 const legacyImgs=await all(e,'SELECT image_url FROM product_images WHERE product_id=?',[id]).catch(()=>[]);
 const variationImgs=await all(e,'SELECT image_url FROM variation_images WHERE variation_id IN (SELECT id FROM product_variations WHERE product_id=?)',[id]).catch(()=>[]);
 const urls=[current.image_url,...imgs.map(x=>x.image_url),...legacyImgs.map(x=>x.image_url),...variationImgs.map(x=>x.image_url)].filter(Boolean);
 await e.DB.prepare('DELETE FROM variation_images WHERE variation_id IN (SELECT id FROM product_variations WHERE product_id=?)').bind(id).run().catch(()=>{});
 await e.DB.prepare('DELETE FROM variation_options WHERE variation_id IN (SELECT id FROM product_variations WHERE product_id=?)').bind(id).run().catch(()=>{});
 await e.DB.prepare('DELETE FROM product_variations WHERE product_id=?').bind(id).run().catch(()=>{});
 await e.DB.prepare('DELETE FROM product_images WHERE product_id=?').bind(id).run().catch(()=>{});
 await e.DB.prepare('DELETE FROM vendor_product_images WHERE product_id=? AND vendor_id=?').bind(id,v.id).run().catch(()=>{});
 await e.DB.prepare('DELETE FROM products WHERE id=? AND vendor_id=?').bind(id,v.id).run();
 for(const url of [...new Set(urls)])await deleteAssetIfUnused(e,url);
 return json({ok:true,deleted_product_id:id,deleted_database_records:true});
}
const cols=await tableColumns(e,'products');if(!cols.size)return json({error:'Products table is unavailable.'},500);
if(req.method==='POST'){const name=clean(body.name,300),price=Number(body.price);if(!name||!Number.isFinite(price)||price<0)return json({error:'Product name and valid price are required.'},400);const id=crypto.randomUUID(),t=now(),cat=await categoryValue(e,body,cols);if(cat.error)return json({error:cat.error},400);const maxQty=body.max_qty===null||body.max_qty===''?null:Math.max(1,Math.floor(Number(body.max_qty)));const minQty=Math.max(1,Math.floor(Number(body.min_qty??1)));if(maxQty!==null&&maxQty<minQty)return json({error:'Maximum quantity cannot be below minimum quantity.'},400);const sale=body.sale_price===undefined||body.sale_price===null||body.sale_price===''?null:Math.max(0,Number(body.sale_price));const values={id,name,sku:clean(body.sku,120),price,old_price:body.old_price===''?null:Number(body.old_price??null),sale_price:sale,stock:Math.max(0,Math.floor(Number(body.stock||0))),low_stock_threshold:Math.max(0,Math.floor(Number(body.low_stock_threshold??5))),min_qty:minQty,max_qty:maxQty,product_type:body.product_type==='variable'?'variable':'simple',vendor_id:v.id,category_id:cat.categoryId||null,category:cat.value,image_url:clean(body.image_url||body.image_urls?.[0],2000),description:clean(body.description,10000),published:body.published===false?0:1,status:body.published===false?'Draft':'Active',created_at:t,updated_at:t};const names=[],params=[];for(const k of Object.keys(values))if(cols.has(k)){names.push(k);params.push(values[k])}try{await e.DB.prepare(`INSERT INTO products(${names.join(',')}) VALUES(${names.map(()=>'?').join(',')})`).bind(...params).run();await saveImages(e,id,v.id,Array.isArray(body.image_urls)?body.image_urls:[values.image_url],true)}catch(err){return json({error:'Could not create product: '+String(err?.message||err)},500)}const product=await one(e,'SELECT * FROM products WHERE id=?',[id]);if(product)product.image_urls=await imageUrls(e,id,v.id);return json({ok:true,product},201)}
if(req.method==='PATCH'){const id=clean(body.id,120);if(!id)return json({error:'Product id is required.'},400);const current=await one(e,'SELECT * FROM products WHERE id=? AND vendor_id=?',[id,v.id]);if(!current)return json({error:'Product not found.'},404);const names=[],params=[];if(body.category_id!==undefined){const cat=await categoryValue(e,body,cols);if(cat.error)return json({error:cat.error},400);body.category_id=cat.categoryId;body.category=cat.value;}const regular=body.price===undefined?Number(current.price||0):Number(body.price);const sale=body.sale_price===undefined?(current.sale_price==null?null:Number(current.sale_price)):(body.sale_price===null||body.sale_price===''?null:Math.max(0,Number(body.sale_price)));const minQty=body.min_qty===undefined?Number(current.min_qty||1):Math.max(1,Math.floor(Number(body.min_qty)));const maxQty=body.max_qty===undefined?current.max_qty:(body.max_qty===null||body.max_qty===''?null:Math.max(1,Math.floor(Number(body.max_qty))));if(maxQty!==null&&maxQty<minQty)return json({error:'Maximum quantity cannot be below minimum quantity.'},400);for(const k of ['name','sku','price','old_price','stock','low_stock_threshold','min_qty','max_qty','product_type','category_id','category','image_url','description','published','status'])if(body[k]!==undefined&&cols.has(k)){let value=body[k];if(['price','old_price','sale_price'].includes(k))value=value===''||value===null?null:Number(value);if(['stock','low_stock_threshold','min_qty'].includes(k))value=Math.max(k==='min_qty'?1:0,Math.floor(Number(value||0)));if(k==='max_qty')value=value===null||value===''?null:Math.max(1,Math.floor(Number(value)));if(k==='published')value=body[k]?1:0;if(k==='product_type')value=value==='variable'?'variable':'simple';if(k==='category'&&!String(value||'').trim())value='Uncategorized';names.push(k+'=?');params.push(value)}if(Array.isArray(body.image_urls)){if(body.image_urls.length>10)return json({error:'Maximum 10 images per product.'},400);if(body.image_urls.length&&cols.has('image_url')){names.push('image_url=?');params.push(clean(body.image_urls[0],2000))}await saveImages(e,id,v.id,body.image_urls,true)}if(cols.has('updated_at')){names.push('updated_at=?');params.push(now())}if(!names.length)return json({error:'No changes supplied.'},400);try{params.push(id,v.id);const r=await e.DB.prepare(`UPDATE products SET ${names.join(',')} WHERE id=? AND vendor_id=?`).bind(...params).run();if(!r.meta?.changes)return json({error:'Product not found.'},404)}catch(err){return json({error:'Could not update product: '+String(err?.message||err)},500)}const out=await one(e,'SELECT * FROM products WHERE id=?',[id]);if(out)out.image_urls=await imageUrls(e,id,v.id);return json({ok:true,product:out})}return json({error:'Method not allowed'},405)}
async function categories(req,e){if(new URL(req.url).pathname!=='/api/vendor/admin/categories'||req.method!=='GET')return null;const a=await actor(req,e,null);if(!a)return json({error:'Unauthorized'},401);try{return json({categories:await all(e,'SELECT * FROM categories ORDER BY name COLLATE NOCASE')})}catch{return json({categories:[]})}}
async function sections(req,e){const u=new URL(req.url),p=u.pathname;if(!['/api/vendor/admin/store-sections','/api/vendor/admin/sections','/api/vendor/admin/store/sections'].includes(p))return null;const b=req.method==='GET'?{}:await req.json().catch(()=>({}));const v=await resolveVendor(req,e,b.vendor_id||u.searchParams.get('vendor_id'));if(!v)return json({error:'Vendor not found.'},404);const a=await actor(req,e,v.id);if(!a)return json({error:'Unauthorized'},401);if(req.method==='GET')return json({sections:await all(e,'SELECT * FROM vendor_store_sections WHERE vendor_id=? ORDER BY sort_order,id',[v.id])});if(req.method==='POST'){const t=now(),id=crypto.randomUUID(),max=await one(e,'SELECT COALESCE(MAX(sort_order),0) n FROM vendor_store_sections WHERE vendor_id=?',[v.id]);await e.DB.prepare('INSERT INTO vendor_store_sections(id,vendor_id,section_type,title,body,sort_order,enabled,data_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,v.id,clean(b.section_type||b.type,80)||'custom',clean(b.title,300),clean(b.body||b.content,20000),Number(max?.n||0)+1,b.enabled===false?0:1,JSON.stringify(b.data_json||{}),t,t).run();return json({ok:true,section:await one(e,'SELECT * FROM vendor_store_sections WHERE id=?',[id])},201)}if(req.method==='PATCH'){const id=clean(b.id,120);if(!id)return json({error:'Section id is required.'},400);await e.DB.prepare('UPDATE vendor_store_sections SET section_type=COALESCE(?,section_type),title=COALESCE(?,title),body=COALESCE(?,body),enabled=COALESCE(?,enabled),updated_at=? WHERE id=? AND vendor_id=?').bind(b.section_type||b.type||null,b.title??null,b.body??b.content??null,b.enabled===undefined?null:(b.enabled?1:0),now(),id,v.id).run();return json({ok:true})}if(req.method==='DELETE'){const id=clean(b.id||u.searchParams.get('id'),120);await e.DB.prepare('DELETE FROM vendor_store_sections WHERE id=? AND vendor_id=?').bind(id,v.id).run();return json({ok:true})}return json({error:'Method not allowed'},405)}
async function overview(req,e){
 if(new URL(req.url).pathname!=='/api/vendor/admin/overview'||req.method!=='GET')return null;
 const a=await admin(req,e);if(!a)return json({error:'Unauthorized'},401);
 try{
  const vendors=await all(e,`SELECT v.*,
   (SELECT COUNT(*) FROM products p WHERE p.vendor_id=v.id) AS products,
   (SELECT COUNT(DISTINCT vo.order_id) FROM vendor_orders vo JOIN orders o ON o.id=vo.order_id WHERE vo.vendor_id=v.id) AS orders,
   (SELECT COALESCE(SUM(vo.subtotal),0) FROM vendor_orders vo JOIN orders o ON o.id=vo.order_id WHERE vo.vendor_id=v.id) AS sales,
   (SELECT COALESCE(SUM(vo.commission_amount),0) FROM vendor_orders vo JOIN orders o ON o.id=vo.order_id WHERE vo.vendor_id=v.id) AS commission,
   (SELECT COALESCE(SUM(vo.vendor_earnings),0) FROM vendor_orders vo JOIN orders o ON o.id=vo.order_id WHERE vo.vendor_id=v.id) AS earnings
   FROM vendors v ORDER BY COALESCE(v.brand_name,v.business_name,v.slug) COLLATE NOCASE`);
  const totals=vendors.reduce((x,v)=>({
   sales:x.sales+Number(v.sales||0),
   orders:x.orders+Number(v.orders||0),
   commission:x.commission+Number(v.commission||0),
   earnings:x.earnings+Number(v.earnings||0)
  }),{sales:0,orders:0,commission:0,earnings:0});
  return json({ok:true,totals,vendors});
 }catch(err){
  return json({error:'Could not load marketplace overview: '+String(err?.message||err)},500);
 }
}
async function ensureShipmentTable(e){
  await e.DB.prepare(`CREATE TABLE IF NOT EXISTS shipments(
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    vendor_order_id TEXT,
    vendor_id TEXT NOT NULL,
    shipment_tracking_id TEXT,
    courier_name TEXT,
    courier_tracking_number TEXT,
    courier_tracking_url TEXT,
    courier TEXT,
    tracking_id TEXT,
    tracking_url TEXT,
    status TEXT NOT NULL DEFAULT 'Processing',
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run().catch(()=>{});
  const cols=['vendor_order_id TEXT','shipment_tracking_id TEXT','courier_name TEXT','courier_tracking_number TEXT','courier_tracking_url TEXT','courier TEXT','tracking_id TEXT','tracking_url TEXT','note TEXT'];
  for(const col of cols) await e.DB.prepare(`ALTER TABLE shipments ADD COLUMN ${col}`).run().catch(()=>{});
}
async function orderData(req,e){
 if(new URL(req.url).pathname!=='/api/vendor/admin/order-data'||req.method!=='GET')return null;
 const a=await admin(req,e),vu=a?null:await vendorUser(req,e);if(!a&&!vu)return json({error:'Unauthorized'},401);
 await ensureShipmentTable(e);
 const u=new URL(req.url),key=clean(u.searchParams.get('order_id')||u.searchParams.get('id'),160);if(!key)return json({error:'Order ID or tracking ID is required.'},400);
 const o=await one(e,`SELECT o.*,o.order_number,o.public_tracking_id FROM orders o WHERE o.id=? OR o.order_number=? OR o.public_tracking_id=? LIMIT 1`,[key,key,key]);if(!o)return json({error:'Order not found.'},404);
 const vendorRows=await all(e,`SELECT vo.*,COALESCE(v.brand_name,v.business_name,v.slug,'GrabZone Vendor') brand_name FROM vendor_orders vo JOIN vendors v ON v.id=vo.vendor_id WHERE vo.order_id=? ORDER BY vo.created_at`,[o.id]);
 if(vu&&!vendorRows.some(v=>String(v.vendor_id)===String(vu.vendor_id)))return json({error:'Unauthorized'},403);
 const vendors=[];
 for(const vo of vendorRows){
  let items=await all(e,`SELECT voi.*,oi.product_name,oi.image_url,oi.product_id,oi.unit_price order_unit_price,oi.line_total order_line_total,p.name product_name_current,p.sku product_sku,p.description product_description,p.category product_category,p.price product_price,COALESCE(NULLIF(voi.variation_sku,''),NULLIF(oi.variation_sku,''),NULLIF(pv.sku,''),NULLIF(p.sku,''),'') sku,COALESCE(voi.variation_options,oi.variation_options) options_json,pv.regular_price variation_regular_price,pv.old_price variation_old_price,pv.status variation_status,pv.image_url variation_image FROM vendor_order_items voi JOIN order_items oi ON oi.id=voi.order_item_id LEFT JOIN products p ON p.id=voi.product_id LEFT JOIN product_variations pv ON pv.id=COALESCE(voi.variation_id,oi.variation_id) WHERE voi.vendor_order_id=? ORDER BY voi.rowid`,[vo.id]);
  if(!items.length) items=await all(e,`SELECT oi.*,p.name product_name_current,p.sku product_sku,p.description product_description,p.category product_category,p.price product_price,p.image_url product_image,COALESCE(NULLIF(oi.variation_sku,''),NULLIF(pv.sku,''),NULLIF(p.sku,''),'') sku,oi.variation_options options_json,pv.regular_price variation_regular_price,pv.old_price variation_old_price,pv.status variation_status,pv.image_url variation_image FROM order_items oi JOIN products p ON p.id=oi.product_id LEFT JOIN product_variations pv ON pv.id=oi.variation_id WHERE oi.order_id=? AND p.vendor_id=? ORDER BY oi.rowid`,[o.id,vo.vendor_id]);
  for(const item of items){
   let options=null;try{options=item.options_json?JSON.parse(item.options_json):null}catch{}
   if(!options&&item.variation_id){const ors=await all(e,`SELECT po.name option_name,ov.value option_value FROM variation_options vo JOIN product_options po ON po.id=vo.option_id JOIN option_values ov ON ov.id=vo.option_value_id WHERE vo.variation_id=? ORDER BY po.sort_order,ov.sort_order`,[item.variation_id]);options={};for(const x of ors)options[x.option_name]=x.option_value}
   delete item.options_json;item.variation_options=options;item.sku=item.sku||'';item.product_details={name:item.product_name_current||item.product_name||'Product',sku:item.sku||null,description:item.product_description||'',category:item.product_category||'',image_url:item.variation_image||item.image_url||null,regular_price:item.variation_regular_price??item.product_price??item.order_unit_price,old_price:item.variation_old_price??null,status:item.variation_status||null};
  }
  const shipments=await all(e,'SELECT * FROM shipments WHERE order_id=? AND vendor_id=? ORDER BY created_at DESC',[o.id,vo.vendor_id]);
  vendors.push({...vo,items,shipments});
 }
 o.customer={name:o.customer_name||'',phone:o.phone||'',email:o.email||'',division:o.division||'',district:o.district||'',upazila:o.upazila||'',address:o.address||'',payment_method:o.payment_method||'Cash on Delivery'};o.total_amount=Number(o.total_amount??o.total??(Number(o.subtotal||0)+Number(o.shipping_charge||0)));o.item_count=vendors.reduce((n,v)=>n+(v.items||[]).reduce((x,i)=>x+Number(i.quantity||1),0),0);return json({order:o,vendors});
}

async function orderStatus(req,e){if(new URL(req.url).pathname!=='/api/vendor/admin/order-status'||req.method!=='PATCH')return null;const a=await admin(req,e),vu=a?null:await vendorUser(req,e);if(!a&&!vu)return json({error:'Unauthorized'},401);const b=await req.json().catch(()=>({})),id=clean(b.vendor_order_id,120),status=clean(b.status,40),allowed=['New','Contacting','Confirmed','Processing','Shipped','Delivered','Cancelled'];if(!allowed.includes(status))return json({error:'Invalid status.'},400);const vo=await one(e,'SELECT vo.id,vo.vendor_id,vo.order_id,o.order_number FROM vendor_orders vo JOIN orders o ON o.id=vo.order_id WHERE vo.id=?',[id]);if(!vo)return json({error:'Vendor order not found.'},404);if(vu&&String(vu.vendor_id)!==String(vo.vendor_id))return json({error:'Unauthorized'},403);await e.DB.prepare('UPDATE vendor_orders SET status=?,updated_at=? WHERE id=?').bind(status,now(),id).run();const rows=await all(e,'SELECT status FROM vendor_orders WHERE order_id=?',[vo.order_id]),ss=rows.map(x=>String(x.status||''));let parent='New';if(!ss.length)parent='New';else if(ss.every(x=>x==='Delivered'))parent='Delivered';else if(ss.every(x=>x==='Cancelled'))parent='Cancelled';else if(ss.every(x=>x==='Shipped'))parent='Shipped';else if(ss.every(x=>x==='Processing'))parent='Processing';else if(ss.every(x=>x==='Confirmed'))parent='Confirmed';else if(ss.every(x=>x==='Contacting'))parent='Contacting';else if(ss.some(x=>x==='Shipped'))parent='Shipped';else if(ss.some(x=>x==='Processing'))parent='Processing';else if(ss.some(x=>x==='Confirmed'))parent='Confirmed';else if(ss.some(x=>x==='Contacting'))parent='Contacting';await e.DB.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').bind(parent,now(),vo.order_id).run();return json({ok:true,status,parent_status:parent});}
async function syncParentOrder(e,orderId,courier,tracking,trackingUrl,t){
  const statuses=(await all(e,'SELECT status FROM vendor_orders WHERE order_id=?',[orderId])).map(x=>String(x.status||''));
  const parent=statuses.length&&statuses.every(x=>x==='Delivered')?'Delivered':(statuses.length&&statuses.every(x=>x==='Cancelled')?'Cancelled':(statuses.some(x=>['Shipped','Picked Up','In Transit','Out for Delivery'].includes(x))?'Shipped':(statuses.some(x=>x==='Processing')?'Processing':statuses[0]||'Processing')));
  await e.DB.prepare('UPDATE orders SET status=?,tracking_provider=?,tracking_number=?,tracking_url=?,updated_at=? WHERE id=?').bind(parent,courier||null,tracking||null,trackingUrl||null,t,orderId).run();
}
async function shipmentRow(e,id){
  return await one(e,`SELECT *,COALESCE(courier_name,courier) courier,COALESCE(courier_tracking_number,tracking_id,shipment_tracking_id) tracking_id,COALESCE(courier_tracking_url,tracking_url) tracking_url FROM shipments WHERE id=?`,[id]);
}
async function shipmentControl(req,e){
  if(new URL(req.url).pathname!=='/api/vendor/admin/shipment'||!['GET','POST','PATCH'].includes(req.method))return null;
  const a=await admin(req,e),vu=a?null:await vendorUser(req,e);
  if(!a&&!vu)return json({error:'Unauthorized'},401);
  await ensureShipmentTable(e);
  const u=new URL(req.url),b=req.method==='GET'?{}:await req.json().catch(()=>({}));
  const vendorOrderId=clean(b.vendor_order_id||u.searchParams.get('vendor_order_id'),120);
  const vo=await one(e,'SELECT id,order_id,vendor_id FROM vendor_orders WHERE id=?',[vendorOrderId]);
  if(!vo)return json({error:'Vendor order not found.'},404);
  if(vu&&String(vu.vendor_id)!==String(vo.vendor_id))return json({error:'Unauthorized'},403);

  if(req.method==='GET'){
    const rows=await all(e,`SELECT *,COALESCE(courier_name,courier) courier,COALESCE(courier_tracking_number,tracking_id,shipment_tracking_id) tracking_id,COALESCE(courier_tracking_url,tracking_url) tracking_url FROM shipments WHERE order_id=? AND vendor_id=? ORDER BY created_at DESC`,[vo.order_id,vo.vendor_id]);
    return json({shipments:rows});
  }

  const courier=clean(b.courier||b.courier_name,120);
  const tracking=clean(b.tracking_id||b.tracking_number||b.courier_tracking_number,160);
  const trackingUrl=clean(b.tracking_url||b.courier_tracking_url,1000);
  const note=clean(b.note,1000);
  const st=clean(b.status||'Processing',50);
  const allowed=['New','Contacting','Confirmed','Processing','Shipped','Delivered','Cancelled'];
  if(!allowed.includes(st))return json({error:'Invalid shipment status.'},400);
  const t=now();

  if(req.method==='POST'){
    const id=crypto.randomUUID();
    await e.DB.prepare(`INSERT INTO shipments(
      id,order_id,vendor_order_id,vendor_id,shipment_tracking_id,
      courier_name,courier_tracking_number,courier_tracking_url,
      courier,tracking_id,tracking_url,status,note,created_at,updated_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      id,vo.order_id,vo.id,vo.vendor_id,tracking,
      courier,tracking,trackingUrl,courier,tracking,trackingUrl,st,note,t,t
    ).run();

    await e.DB.prepare('UPDATE vendor_orders SET status=?,updated_at=? WHERE id=?').bind(st,t,vo.id).run();
    await syncParentOrder(e,vo.order_id,courier,tracking,trackingUrl,t);
    return json({ok:true,shipment:await shipmentRow(e,id),order_status:(await one(e,'SELECT status FROM orders WHERE id=?',[vo.order_id]))?.status||st},201);
  }

  const sid=clean(b.shipment_id,120);
  if(!sid)return json({error:'Shipment id is required.'},400);
  const existing=await one(e,'SELECT id FROM shipments WHERE id=? AND order_id=? AND vendor_id=?',[sid,vo.order_id,vo.vendor_id]);
  if(!existing)return json({error:'Shipment not found.'},404);
  await e.DB.prepare(`UPDATE shipments SET courier_name=?,courier_tracking_number=?,courier_tracking_url=?,courier=?,tracking_id=?,tracking_url=?,shipment_tracking_id=?,status=?,note=?,updated_at=? WHERE id=?`).bind(
    courier,tracking,trackingUrl,courier,tracking,trackingUrl,tracking,st,note,t,sid
  ).run();
  await e.DB.prepare('UPDATE vendor_orders SET status=?,updated_at=? WHERE id=?').bind(st,t,vo.id).run();
  await syncParentOrder(e,vo.order_id,courier,tracking,trackingUrl,t);
  return json({ok:true,shipment:await shipmentRow(e,sid),order_status:(await one(e,'SELECT status FROM orders WHERE id=?',[vo.order_id]))?.status||st});
}

export async function handleVendorAdminApi(req,e){try{return await orderData(req,e)||await shipmentControl(req,e)||await overview(req,e)||await orderStatus(req,e)||await products(req,e)||await categories(req,e)||await sections(req,e)}catch(err){return json({error:err?.message||'Vendor admin API failed'},500)}}