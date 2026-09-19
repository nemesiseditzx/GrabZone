/* GrabZone authoritative marketplace order/tracking service. */
const clean=v=>String(v??'').trim();
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const now=()=>new Date().toISOString();
const q=(env,sql,p=[])=>env.DB.prepare(sql).bind(...p).all();
const hasTable=async(env,name)=>Boolean((await q(env,"SELECT name FROM sqlite_master WHERE type='table' AND name=?",[name])).results?.[0]);
async function ensure(env){
  const t=now();
  const sql=[
    "CREATE TABLE IF NOT EXISTS vendors(id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,logo_url TEXT,banner_url TEXT,description TEXT,tagline TEXT,accent_color TEXT,category TEXT,business_email TEXT,support_email TEXT,phone TEXT,status TEXT NOT NULL DEFAULT 'active',show_on_homepage INTEGER NOT NULL DEFAULT 1,featured_on_homepage INTEGER NOT NULL DEFAULT 0,commission_type TEXT NOT NULL DEFAULT 'percentage',commission_value REAL NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS vendor_orders(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,vendor_id TEXT NOT NULL,subtotal REAL NOT NULL DEFAULT 0,shipping_charge REAL NOT NULL DEFAULT 0,total REAL NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'New',admin_note TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(order_id,vendor_id))",
    "ALTER TABLE vendor_orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0",
    "CREATE TABLE IF NOT EXISTS vendor_shipping_settings(vendor_id TEXT PRIMARY KEY,shipping_fee REAL NOT NULL DEFAULT 0,enabled INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS variations(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,name TEXT,options TEXT NOT NULL DEFAULT '{}',sku TEXT,regular_price REAL NOT NULL DEFAULT 0,sale_price REAL NOT NULL DEFAULT 0,stock INTEGER NOT NULL DEFAULT 0,stock_managed INTEGER NOT NULL DEFAULT 1,status TEXT NOT NULL DEFAULT 'Available',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE INDEX IF NOT EXISTS variations_product_idx ON variations(product_id,status)",
    "CREATE TABLE IF NOT EXISTS vendor_payouts(id TEXT PRIMARY KEY,vendor_id TEXT NOT NULL,vendor_order_id TEXT NOT NULL,gross_amount REAL NOT NULL DEFAULT 0,commission_amount REAL NOT NULL DEFAULT 0,net_amount REAL NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'cod_commission_due',paid_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS marketplace_inventory_guards(id TEXT PRIMARY KEY,ok INTEGER NOT NULL CHECK(ok=1))",
    "CREATE TABLE IF NOT EXISTS vendor_order_items(id TEXT PRIMARY KEY,vendor_order_id TEXT NOT NULL,order_item_id TEXT NOT NULL,vendor_id TEXT NOT NULL,product_id TEXT,product_name TEXT NOT NULL,variation_id TEXT,variation_options TEXT NOT NULL DEFAULT '{}',variation_sku TEXT,quantity INTEGER NOT NULL DEFAULT 1,unit_price REAL NOT NULL DEFAULT 0,line_total REAL NOT NULL DEFAULT 0,created_at TEXT NOT NULL,UNIQUE(vendor_order_id,order_item_id))",
    "CREATE INDEX IF NOT EXISTS vendor_order_items_vendor_idx ON vendor_order_items(vendor_id,vendor_order_id)",
    "CREATE TABLE IF NOT EXISTS shipments(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,vendor_order_id TEXT NOT NULL,vendor_id TEXT NOT NULL,shipment_tracking_id TEXT NOT NULL UNIQUE,courier_name TEXT,courier_tracking_number TEXT,courier_tracking_url TEXT,status TEXT NOT NULL DEFAULT 'Processing',note TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS shipment_items(id TEXT PRIMARY KEY,shipment_id TEXT NOT NULL,order_item_id TEXT NOT NULL,product_id TEXT,product_name TEXT NOT NULL,quantity INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,UNIQUE(shipment_id,order_item_id))",
    "ALTER TABLE products ADD COLUMN vendor_id TEXT",
    "ALTER TABLE products ADD COLUMN vendor_featured INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE products ADD COLUMN stock_managed INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 5",
    "ALTER TABLE order_items ADD COLUMN vendor_id TEXT",
    "ALTER TABLE order_items ADD COLUMN variation_id TEXT",
    "ALTER TABLE order_items ADD COLUMN variation_options TEXT NOT NULL DEFAULT '{}'",
    "ALTER TABLE order_items ADD COLUMN variation_sku TEXT",
    "ALTER TABLE order_items ADD COLUMN stock_managed INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN marketplace_version INTEGER NOT NULL DEFAULT 1",
    "CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,parent_id TEXT,active INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    "ALTER TABLE products ADD COLUMN category_id TEXT",
    "UPDATE products SET vendor_id='vendor_grabzone' WHERE vendor_id IS NULL OR vendor_id=''",
    "INSERT OR IGNORE INTO vendors(id,name,slug,description,category,status,show_on_homepage,featured_on_homepage,commission_type,commission_value,created_at,updated_at) VALUES('vendor_grabzone','GRABZONE','grabzone','Official GrabZone products','Marketplace','active',1,1,'percentage',0,?,?)"
  ];
  for(const s of sql){try{if(s.includes("VALUES('vendor_grabzone") ) await env.DB.prepare(s).bind(t,t).run(); else await env.DB.prepare(s).run()}catch(e){if(!/duplicate column|already exists/i.test(String(e.message||'')))throw e}}
}
async function variationInfo(env,id){
  if(!id)return null;
  if(!(await hasTable(env,'variations')))return null;
  const rows=(await q(env,"SELECT * FROM variations WHERE id=? LIMIT 1",[id])).results||[];
  return rows[0]||null;
}
function effectivePrice(p,v){
  if(v){
    const regular=Number(v.regular_price??v.price??0), sale=Number(v.sale_price??0);
    return sale>0&&sale<regular?sale:regular;
  }
  const price=Number(p.price||0),sale=Number(p.flash_price||0);
  const start=p.flash_starts_at?Date.parse(p.flash_starts_at):NaN,end=p.flash_ends_at?Date.parse(p.flash_ends_at):NaN;
  const active=!!p.flash_enabled&&sale>0&&sale<price&&(!Number.isFinite(start)||Date.now()>=start)&&Number.isFinite(end)&&Date.now()<end;
  return active?sale:price;
}
async function createOrder(req,env){
  await ensure(env);
  let b={};try{b=await req.clone().json()}catch{return json({error:'Invalid JSON.'},400)}
  const p=b?.payload||b?.args?.payload||b;
  const required=['customer_name','email','phone','division','district','upazila','address'];
  if(required.some(k=>!clean(p[k])))return json({error:'Please complete all required fields.'},400);
  const phone=clean(p.phone).replace(/\D/g,'');
  if(!/^01[3-9]\d{8}$/.test(phone))return json({error:'Please enter a valid 11-digit Bangladesh mobile number (01XXXXXXXXX).'},400);
  if(!Array.isArray(p.items)||!p.items.length)return json({error:'Your order is empty.'},400);
  const ids=[...new Set(p.items.map(x=>clean(x.product_id)).filter(Boolean))];
  const groups=new Map(), items=[];
  for(const raw of p.items){
    const pid=clean(raw.product_id), product=(await q(env,"SELECT p.*,v.status vendor_status,v.name vendor_name FROM products p LEFT JOIN vendors v ON v.id=p.vendor_id WHERE p.id=? AND p.published=1 LIMIT 1",[pid])).results?.[0];
    if(!product) return json({error:'One of the selected products is no longer available.'},409);
    const vendorId=clean(product.vendor_id)||'vendor_grabzone';
    if(String(product.vendor_status||'active')!=='active')return json({error:'A selected seller is currently unavailable.'},409);
    const qty=Math.max(1,Math.floor(Number(raw.quantity||1)));
    let variation=null;
    if(raw.variation_id){
      variation=await variationInfo(env,clean(raw.variation_id));
      if(!variation)return json({error:'The selected product variation is no longer available.'},409);
      if(String(variation.product_id||'')!==pid)return json({error:'Invalid product variation.'},400);
      const vs=String(variation.status||'Available').toLowerCase();
      if(['out of stock','inactive','disabled'].includes(vs))return json({error:'The selected variation is out of stock.'},409);
      const managed=Number(variation.stock_managed??1)===1 || variation.stock!==undefined;
      if(managed && Number(variation.stock||0)<qty)return json({error:'The selected variation does not have enough stock.'},409);
    }else if(Number(product.stock_managed||0)===1 && Number(product.stock||0)<qty){
      return json({error:'A selected product is out of stock or does not have enough stock.'},409);
    }
    const unit=effectivePrice(product,variation), line=unit*qty;
    if(!Number.isFinite(unit)||unit<0)return json({error:'Invalid product price.'},400);
    const item={id:crypto.randomUUID(),product_id:pid,vendor_id:vendorId,product_name:product.name,image_url:product.image_url||'',quantity:qty,unit_price:unit,line_total:line,variation_id:variation?.id||null,variation_options:raw.variation_options||variation?.options||{},variation_sku:clean(raw.variation_sku||variation?.sku||''),stock_managed:Boolean(Number(product.stock_managed||0)===1||(variation&&(variation.stock!==undefined||Number(variation.stock_managed??0)===1)))};
    items.push(item);
    if(!groups.has(vendorId))groups.set(vendorId,{vendor_id:vendorId,subtotal:0,items:[]});
    groups.get(vendorId).subtotal+=line;groups.get(vendorId).items.push(item);
  }
  const subtotal=items.reduce((s,x)=>s+x.line_total,0);
  let referralDiscount=0;
  const code=clean(p.referral_code).toUpperCase();
  if(code){
    const r=(await q(env,"SELECT * FROM referral_codes WHERE upper(code)=upper(?) AND active=1 LIMIT 1",[code])).results?.[0];
    if(!r)return json({error:'Invalid or inactive referral code.'},400);
    if(r.starts_at&&new Date(r.starts_at)>new Date())return json({error:'This referral code is not active yet.'},400);
    if(r.expires_at&&new Date(r.expires_at)<new Date())return json({error:'This referral code has expired.'},400);
    if(r.usage_limit!==null&&Number(r.used_count||0)>=Number(r.usage_limit))return json({error:'This referral code has reached its usage limit.'},400);
    if(subtotal<Number(r.min_order_amount||0))return json({error:'Minimum order amount for this referral code is ৳'+Number(r.min_order_amount||0)+'.'},400);
    referralDiscount=r.benefit_type==='percentage'?Math.round(subtotal*Number(r.benefit_value||0)/100*100)/100:Number(r.benefit_value||0);
    if(r.max_discount_amount!==null)referralDiscount=Math.min(referralDiscount,Number(r.max_discount_amount));
    referralDiscount=Math.max(0,Math.min(referralDiscount,subtotal));
  }
  let voucherDiscount=0;const voucherCode=clean(p.rewards_voucher_code).toUpperCase();
  if(voucherCode){
    const v=(await q(env,"SELECT * FROM rewards_vouchers WHERE code=? LIMIT 1",[voucherCode])).results?.[0];
    if(!v||String(v.phone)!==phone||String(v.status)!=='UNUSED'||(v.expires_at&&new Date(v.expires_at)<=new Date()))return json({error:'This reward voucher is invalid, expired, or belongs to another Rewards account.'},400);
    voucherDiscount=Math.min(subtotal,Number(v.value||0));
  }
  let mysteryDiscount=0;const mysteryToken=clean(p.mystery_token).toUpperCase();
  if(mysteryToken){
    const m=(await q(env,"SELECT discount,expires_at,used FROM mystery_claims WHERE token=? LIMIT 1",[mysteryToken])).results?.[0];
    if(!m||Number(m.used)!==0||new Date(m.expires_at)<=new Date())return json({error:'Your Mystery Deal has expired or was already used.'},400);
    mysteryDiscount=Math.min(subtotal,subtotal*Number(m.discount||0)/100);
  }
  let shipping=0;for(const [vid,g] of groups){
    const s=(await q(env,"SELECT shipping_fee,enabled FROM vendor_shipping_settings WHERE vendor_id=? LIMIT 1",[vid])).results?.[0];
    if(Number(s?.enabled??1)===1)shipping+=Math.max(0,Number(s?.shipping_fee||0));
  }
  const total=Math.max(0,subtotal+shipping-referralDiscount-voucherDiscount-mysteryDiscount);
  const orderId=crypto.randomUUID(),tracking='TRK-'+crypto.randomUUID().replace(/-/g,'').slice(0,8).toUpperCase();
  let orderNo=Number((await q(env,'SELECT COALESCE(MAX(order_no),0)+1 n FROM orders')).results?.[0]?.n||1);
  const t=now(),discountTotal=referralDiscount+voucherDiscount+mysteryDiscount;
  const orderNumber='GZ-'+String(orderNo).padStart(5,'0');
  const statements=[
    env.DB.prepare("INSERT INTO orders(id,order_no,order_number,customer_name,email,phone,division,district,upazila,address,referral_code,referral_discount,discount_amount,payment_method,shipping_charge,subtotal,total,status,public_tracking_id,grabpoints_opt_in,grabpoints_redeemed,grabpoints_discount,mystery_discount,rewards_voucher_code,rewards_voucher_discount,marketplace_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(orderId,orderNo,orderNumber,clean(p.customer_name),clean(p.email).toLowerCase(),phone,clean(p.division),clean(p.district),clean(p.upazila),clean(p.address),code||null,referralDiscount,discountTotal,'Cash on Delivery',shipping,subtotal,total,'New',tracking,Number(p.grabpoints_opt_in||0)===1?1:0,0,0,mysteryDiscount,voucherCode||null,voucherDiscount,1,t,t)
  ];
  for(const item of items){
    statements.push(env.DB.prepare("INSERT INTO order_items(id,order_id,product_id,product_name,image_url,quantity,unit_price,line_total,vendor_id,variation_id,variation_options,variation_sku,stock_managed) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(item.id,orderId,item.product_id,item.product_name,item.image_url,item.quantity,item.unit_price,item.line_total,item.vendor_id,item.variation_id,JSON.stringify(item.variation_options||{}),item.variation_sku||null,item.stock_managed?1:0));
  }
  const vendorEntries=[...groups.entries()];let allocatedDiscount=0;
  for(let gi=0;gi<vendorEntries.length;gi++){const [vid,g]=vendorEntries[gi];
    const vendor=(await q(env,"SELECT commission_type,commission_value FROM vendors WHERE id=?",[vid])).results?.[0]||{};
    const shippingCfg=(await q(env,"SELECT shipping_fee,enabled FROM vendor_shipping_settings WHERE vendor_id=? LIMIT 1",[vid])).results?.[0]||{};
    const vendorShipping=Number(shippingCfg.enabled??1)===1?Math.max(0,Number(shippingCfg.shipping_fee||0)):0;
    const proportionalDiscount=subtotal>0?Math.round(discountTotal*(g.subtotal/subtotal)*100)/100:0;const vendorDiscount=gi===vendorEntries.length-1?Math.max(0,Math.min(g.subtotal,discountTotal-allocatedDiscount)):Math.min(g.subtotal,proportionalDiscount);allocatedDiscount+=vendorDiscount;
    const voId=crypto.randomUUID(),gross=Math.max(0,g.subtotal+vendorShipping-vendorDiscount);
    statements.push(env.DB.prepare("INSERT INTO vendor_orders(id,order_id,vendor_id,subtotal,shipping_charge,total,discount_amount,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(voId,orderId,vid,g.subtotal,vendorShipping,gross,vendorDiscount,'New',t,t));
    for(const item of g.items)statements.push(env.DB.prepare("INSERT INTO vendor_order_items(id,vendor_order_id,order_item_id,vendor_id,product_id,product_name,variation_id,variation_options,variation_sku,quantity,unit_price,line_total,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),voId,item.id,vid,item.product_id,item.product_name,item.variation_id,JSON.stringify(item.variation_options||{}),item.variation_sku||null,item.quantity,item.unit_price,item.line_total,t));
    const commissionBase=Math.max(0,g.subtotal-vendorDiscount);const commission=String(vendor.commission_type||'percentage')==='fixed'?Math.min(commissionBase,Math.max(0,Number(vendor.commission_value||0))):Math.round(commissionBase*Math.max(0,Number(vendor.commission_value||0))/100*100)/100;
    statements.push(env.DB.prepare("INSERT INTO vendor_payouts(id,vendor_id,vendor_order_id,gross_amount,commission_amount,net_amount,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)").bind('pay_'+crypto.randomUUID(),vid,voId,gross,commission,gross-commission,'cod_commission_due',t,t));
    for(const item of g.items){
      if(item.stock_managed){
        if(item.variation_id&&await hasTable(env,'variations')){statements.push(env.DB.prepare("UPDATE variations SET stock=stock-? WHERE id=? AND stock>=?").bind(item.quantity,item.variation_id,item.quantity));statements.push(env.DB.prepare("INSERT INTO marketplace_inventory_guards(id,ok) SELECT ?,changes()").bind(crypto.randomUUID()));statements.push(env.DB.prepare("DELETE FROM marketplace_inventory_guards WHERE id=(SELECT id FROM marketplace_inventory_guards ORDER BY rowid DESC LIMIT 1)"));}
        else {statements.push(env.DB.prepare("UPDATE products SET stock=stock-? WHERE id=? AND stock_managed=1 AND stock>=?").bind(item.quantity,item.product_id,item.quantity));statements.push(env.DB.prepare("INSERT INTO marketplace_inventory_guards(id,ok) SELECT ?,changes()").bind(crypto.randomUUID()));statements.push(env.DB.prepare("DELETE FROM marketplace_inventory_guards WHERE id=(SELECT id FROM marketplace_inventory_guards ORDER BY rowid DESC LIMIT 1)"));}
      }
    }
  }
  if(code){statements.push(env.DB.prepare("UPDATE referral_codes SET used_count=used_count+1,updated_at=? WHERE upper(code)=upper(?) AND active=1 AND (usage_limit IS NULL OR used_count<usage_limit)").bind(t,code));statements.push(env.DB.prepare("INSERT INTO marketplace_inventory_guards(id,ok) SELECT ?,changes()").bind(crypto.randomUUID()));statements.push(env.DB.prepare("DELETE FROM marketplace_inventory_guards WHERE id=(SELECT id FROM marketplace_inventory_guards ORDER BY rowid DESC LIMIT 1)"));}
  if(voucherCode){statements.push(env.DB.prepare("UPDATE rewards_vouchers SET status='USED',used_at=?,used_order_id=? WHERE code=? AND phone=? AND status='UNUSED' AND expires_at>?").bind(t,orderId,voucherCode,phone,t));statements.push(env.DB.prepare("INSERT INTO marketplace_inventory_guards(id,ok) SELECT ?,changes()").bind(crypto.randomUUID()));statements.push(env.DB.prepare("DELETE FROM marketplace_inventory_guards WHERE id=(SELECT id FROM marketplace_inventory_guards ORDER BY rowid DESC LIMIT 1)"));}
  if(mysteryToken){statements.push(env.DB.prepare("UPDATE mystery_claims SET used=1 WHERE token=? AND used=0").bind(mysteryToken));statements.push(env.DB.prepare("INSERT INTO marketplace_inventory_guards(id,ok) SELECT ?,changes()").bind(crypto.randomUUID()));statements.push(env.DB.prepare("DELETE FROM marketplace_inventory_guards WHERE id=(SELECT id FROM marketplace_inventory_guards ORDER BY rowid DESC LIMIT 1)"));}
  try{
    const out=await env.DB.batch(statements);
    const vendorBreakdown=[...groups.entries()].map(([vendor_id,g])=>({vendor_id,subtotal:g.subtotal,shipping_charge:Number((g.subtotal>0?0:0)),total:g.subtotal}));
    for(const v of vendorBreakdown){const row=(await q(env,'SELECT vo.total,vo.shipping_charge,vo.discount_amount,v.name vendor_name,v.slug vendor_slug FROM vendor_orders vo JOIN vendors v ON v.id=vo.vendor_id WHERE vo.id IN (SELECT id FROM vendor_orders WHERE order_id=? AND vendor_id=?) LIMIT 1',[orderId,v.vendor_id])).results?.[0];if(row){v.vendor_name=row.vendor_name;v.vendor_slug=row.vendor_slug;v.shipping_charge=Number(row.shipping_charge||0);v.discount_amount=Number(row.discount_amount||0);v.total=Number(row.total||0)}}
    return json({data:{id:orderId,order_number:orderNumber,public_tracking_id:tracking,subtotal,shipping_charge:shipping,total,referral_discount:referralDiscount,rewards_voucher_code:voucherCode||null,rewards_voucher_discount:voucherDiscount,mystery_discount:mysteryDiscount,status:'New',vendor_orders:vendorBreakdown}});
  }catch(e){return json({error:e.message||'Could not create order.'},409)}
}
async function track(req,env){
  await ensure(env);const u=new URL(req.url),key=clean(u.searchParams.get('trackingId')||u.searchParams.get('tracking')||u.searchParams.get('order'));
  if(!key)return json({error:'Order or tracking ID is required.'},400);
  const order=(await q(env,"SELECT id,order_number,public_tracking_id,status,customer_name,created_at,updated_at FROM orders WHERE upper(public_tracking_id)=upper(?) OR upper(order_number)=upper(?)",[key,key])).results?.[0];
  if(!order)return json({error:'Order not found.'},404);
  const shipments=(await q(env,"SELECT s.*,v.name vendor_name,v.slug vendor_slug FROM shipments s JOIN vendors v ON v.id=s.vendor_id WHERE s.order_id=? ORDER BY s.created_at",[order.id])).results||[];
  for(const s of shipments)s.items=(await q(env,"SELECT product_name,quantity,product_id,order_item_id FROM shipment_items WHERE shipment_id=? ORDER BY id",[s.id])).results||[];
  const vendors=(await q(env,"SELECT vo.*,v.name vendor_name,v.slug vendor_slug FROM vendor_orders vo JOIN vendors v ON v.id=vo.vendor_id WHERE vo.order_id=? ORDER BY v.name",[order.id])).results||[];
  for(const v of vendors)v.items=(await q(env,"SELECT * FROM vendor_order_items WHERE vendor_order_id=? ORDER BY id",[v.id])).results||[];
  return json({success:true,order,tracking_id:order.public_tracking_id,vendor_orders:vendors,shipments});
}
export default {async fetch(req,env){try{const u=new URL(req.url);if(u.pathname==='/api/d1'&&req.method==='POST'){const b=await req.clone().json().catch(()=>({}));if(b?.type==='rpc'&&b.fn==='create_public_order')return createOrder(req,env)}if(u.pathname==='/api/marketplace/track')return track(req,env);return json({error:'Not found.'},404)}catch(e){return json({error:e.message||'Marketplace order service error.'},500)}}};
