const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const stamp=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
async function ensure(db){
 const statements=[
 `CREATE TABLE IF NOT EXISTS rewards_settings(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 1,gp_value_bdt REAL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS vendor_rewards_settings(vendor_id TEXT PRIMARY KEY,rewards_enabled INTEGER NOT NULL DEFAULT 0,referral_enabled INTEGER NOT NULL DEFAULT 0,eligible_store_layout INTEGER NOT NULL DEFAULT 0,eligibility_status TEXT NOT NULL DEFAULT 'inactive',updated_by TEXT,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS product_rewards_eligibility(product_id TEXT PRIMARY KEY,vendor_id TEXT NOT NULL,rewards_eligible INTEGER NOT NULL DEFAULT 0,referral_eligible INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'not_eligible',updated_by TEXT,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS rewards_audit_logs(id TEXT PRIMARY KEY,admin_id TEXT,vendor_id TEXT,product_id TEXT,action TEXT NOT NULL,old_value TEXT,new_value TEXT,reason TEXT,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS referrals(id TEXT PRIMARY KEY,referrer_member_id TEXT NOT NULL,referral_code TEXT NOT NULL UNIQUE,referred_member_id TEXT,status TEXT NOT NULL DEFAULT 'pending',qualifying_order_id TEXT,created_at TEXT NOT NULL,qualified_at TEXT,rewarded_at TEXT)`,
 `CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_member_id,created_at DESC)`,
 `CREATE INDEX IF NOT EXISTS referrals_referred_idx ON referrals(referred_member_id)`,
 `CREATE INDEX IF NOT EXISTS referrals_order_idx ON referrals(qualifying_order_id)`,
 `CREATE TABLE IF NOT EXISTS referral_rewards(id TEXT PRIMARY KEY,referral_id TEXT NOT NULL,order_id TEXT NOT NULL,referrer_member_id TEXT NOT NULL,referred_member_id TEXT,discount_amount REAL NOT NULL DEFAULT 0,reward_points INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL,completed_at TEXT,reversed_at TEXT,UNIQUE(referral_id,order_id))`,
 `CREATE INDEX IF NOT EXISTS referral_rewards_referrer_idx ON referral_rewards(referrer_member_id,status,created_at DESC)`,
 `CREATE TABLE IF NOT EXISTS rewards_order_allocations(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,order_item_id TEXT,vendor_id TEXT NOT NULL,product_id TEXT NOT NULL,rewards_eligible INTEGER NOT NULL DEFAULT 0,referral_eligible INTEGER NOT NULL DEFAULT 0,qualifying_subtotal REAL NOT NULL DEFAULT 0,referral_discount REAL NOT NULL DEFAULT 0,cashback_percent REAL NOT NULL DEFAULT 0,cashback_points INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(order_id,order_item_id))`,
 `CREATE INDEX IF NOT EXISTS rewards_alloc_order_idx ON rewards_order_allocations(order_id,status)`,
 `CREATE INDEX IF NOT EXISTS rewards_alloc_vendor_idx ON rewards_order_allocations(vendor_id,created_at DESC)`,
 `CREATE INDEX IF NOT EXISTS vendor_rewards_settings_active_idx ON vendor_rewards_settings(eligibility_status,rewards_enabled,referral_enabled)`,
 `CREATE INDEX IF NOT EXISTS product_rewards_vendor_idx ON product_rewards_eligibility(vendor_id,status)`
 ];
 for(const sql of statements) await db.prepare(sql).run();
 // Keep this endpoint safe when it initializes an older rewards_settings table
 // before the main Worker schema migration has added the referral reward column.
 await db.prepare("ALTER TABLE rewards_settings ADD COLUMN referral_reward_points INTEGER NOT NULL DEFAULT 0").run().catch(()=>{});
 await db.prepare("INSERT OR IGNORE INTO rewards_settings(id,enabled,gp_value_bdt,updated_at) VALUES(1,1,NULL,?)").bind(stamp()).run();
}
const one=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results?.[0]||null;
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results||[];
async function audit(db,adminId,vid,pid,action,oldVal,newVal,reason){
 await db.prepare("INSERT INTO rewards_audit_logs(id,admin_id,vendor_id,product_id,action,old_value,new_value,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
 .bind(id(),adminId||null,vid||null,pid||null,action,oldVal==null?null:JSON.stringify(oldVal),newVal==null?null:JSON.stringify(newVal),String(reason||"").slice(0,500)||null,stamp()).run();
}
export async function handleRewardsEligibility(req,env,adminSession){
 const path=new URL(req.url).pathname,method=req.method,db=env.DB;
 if(!db)return json({error:"D1 binding DB is missing."},500);
 await ensure(db);
 if(path==="/api/rewards/eligibility"&&method==="GET"){
  const productId=new URL(req.url).searchParams.get("product_id");
  if(productId){
   const row=await one(db,`SELECT p.id product_id,p.vendor_id,COALESCE(vrs.eligibility_status,'inactive') vendor_status,COALESCE(vrs.rewards_enabled,0) rewards_enabled,COALESCE(vrs.referral_enabled,0) referral_enabled,COALESCE(vrs.eligible_store_layout,0) eligible_store_layout FROM products p LEFT JOIN vendor_rewards_settings vrs ON vrs.vendor_id=p.vendor_id WHERE p.id=? LIMIT 1`,productId);
   if(!row)return json({error:"Product not found."},404);
   const global=await one(db,"SELECT enabled FROM rewards_settings WHERE id=1");
   const active=String(row.vendor_status||"").toLowerCase()==="active";
   const globallyEnabled=Number(global?.enabled??1)===1;
   return json({product_id:row.product_id,vendor_id:row.vendor_id,rewards_eligible:!!(globallyEnabled&&active),referral_eligible:!!(globallyEnabled&&active),eligible_store_layout:!!active});
  }
  const slug=new URL(req.url).searchParams.get("slug");
  if(slug){
   const vendor=await one(db,"SELECT id FROM vendors WHERE slug=? LIMIT 1",slug);
   if(!vendor)return json({error:"Vendor not found."},404);
   const v=await one(db,"SELECT * FROM vendor_rewards_settings WHERE vendor_id=?",vendor.id);
   const global=await one(db,"SELECT enabled FROM rewards_settings WHERE id=1");
   const active=String(v?.eligibility_status||"").toLowerCase()==="active",globallyEnabled=Number(global?.enabled??1)===1;
   return json({vendor_id:vendor.id,eligible:active,rewards_enabled:!!(globallyEnabled&&active),referral_enabled:!!(globallyEnabled&&active),eligible_store_layout:!!active});
  }
  return json({error:"Provide product_id or slug."},400);
 }
 if(!path.startsWith("/api/admin/rewards-eligibility"))return null;
 if(!adminSession)return json({error:"Unauthorized."},401);
 const adminId=adminSession.id||adminSession.email||null;
 if(path==="/api/admin/rewards-eligibility/audit"&&method==="GET"){
  const u=new URL(req.url),vid=u.searchParams.get("vendor_id")||"",pid=u.searchParams.get("product_id")||"";
  const limit=Math.min(200,Math.max(1,Number(u.searchParams.get("limit")||100)));
  const logs=await all(db,`SELECT id,admin_id,vendor_id,product_id,action,old_value,new_value,reason,created_at FROM rewards_audit_logs WHERE (?='' OR vendor_id=?) AND (?='' OR product_id=?) ORDER BY created_at DESC LIMIT ${limit}`,vid,vid,pid,pid);
  return json({logs});
 }
 if(path==="/api/admin/rewards-eligibility/activity"&&method==="GET"){
  const u=new URL(req.url),vid=u.searchParams.get("vendor_id")||"",limit=Math.min(200,Math.max(1,Number(u.searchParams.get("limit")||100)));
  const rows=await all(db,`SELECT a.order_id,a.vendor_id,a.product_id,a.rewards_eligible,a.referral_eligible,a.qualifying_subtotal,a.referral_discount,a.cashback_percent,a.cashback_points,a.status,a.created_at,o.order_number,o.status order_status,o.phone FROM rewards_order_allocations a LEFT JOIN orders o ON o.id=a.order_id WHERE (?='' OR a.vendor_id=?) ORDER BY a.created_at DESC LIMIT ${limit}`,vid,vid);
  return json({activity:rows});
 }
 if(path==="/api/admin/rewards-eligibility/overview"&&method==="GET"){
  const stats=await one(db,`SELECT (SELECT COUNT(*) FROM vendor_rewards_settings WHERE eligibility_status='active') eligible_vendors,(SELECT COUNT(*) FROM vendor_rewards_settings WHERE rewards_enabled=1 AND eligibility_status='active') rewards_vendors,(SELECT COUNT(*) FROM vendor_rewards_settings WHERE referral_enabled=1 AND eligibility_status='active') referral_vendors,(SELECT COUNT(*) FROM products p JOIN vendor_rewards_settings s ON s.vendor_id=p.vendor_id WHERE s.eligibility_status='active') eligible_products,(SELECT COALESCE(SUM(CASE WHEN points>0 AND (type='earn' OR type LIKE 'earn:%' OR type LIKE 'referral:%') THEN points ELSE 0 END),0) FROM grabpoints_ledger) gp_issued,(SELECT COALESCE(SUM(CASE WHEN type='redeem' THEN -points ELSE 0 END),0) FROM grabpoints_ledger) gp_redeemed`);
  return json({stats:stats||{}});
 }
 if(path==="/api/admin/rewards-eligibility/vendors"&&method==="GET"){
  const vendors=await all(db,`SELECT v.id,v.brand_name,v.business_name,v.slug,v.status,COALESCE(s.rewards_enabled,0) rewards_enabled,COALESCE(s.referral_enabled,0) referral_enabled,COALESCE(s.eligible_store_layout,0) eligible_store_layout,COALESCE(s.eligibility_status,'inactive') eligibility_status,(SELECT COUNT(*) FROM products p WHERE p.vendor_id=v.id) product_count,(SELECT COUNT(*) FROM product_rewards_eligibility e WHERE e.vendor_id=v.id AND e.status='eligible') eligible_product_count FROM vendors v LEFT JOIN vendor_rewards_settings s ON s.vendor_id=v.id ORDER BY v.created_at DESC`);
  return json({vendors});
 }
 if(path==="/api/admin/rewards-eligibility/products"&&method==="GET"){
  const u=new URL(req.url),vid=u.searchParams.get("vendor_id")||"",q=String(u.searchParams.get("q")||"").slice(0,100);
  const products=await all(db,`SELECT p.id,p.name,p.price,p.image_url,p.published,p.vendor_id,COALESCE(v.brand_name,v.business_name,'GrabZone') vendor_name,COALESCE(s.eligibility_status,'inactive') vendor_status,COALESCE(s.rewards_enabled,0) rewards_enabled,COALESCE(s.referral_enabled,0) referral_enabled,COALESCE(e.rewards_eligible,0) rewards_eligible,COALESCE(e.referral_eligible,0) referral_eligible,COALESCE(e.status,'not_eligible') eligibility_status FROM products p LEFT JOIN vendors v ON v.id=p.vendor_id LEFT JOIN vendor_rewards_settings s ON s.vendor_id=p.vendor_id LEFT JOIN product_rewards_eligibility e ON e.product_id=p.id AND e.vendor_id=p.vendor_id WHERE (?='' OR p.vendor_id=?) AND (?='' OR p.name LIKE ?) ORDER BY p.created_at DESC LIMIT 500`,vid,vid,q,q?('%'+q+'%'):'');
  return json({products});
 }
 if(path==="/api/admin/rewards-eligibility/settings"&&method==="GET"){
  const settings=await one(db,"SELECT * FROM rewards_settings WHERE id=1");
  const tiers=await all(db,"SELECT tier,min_points,cashback_percent,discount_percent,benefits FROM membership_tiers ORDER BY min_points");
  const site=await one(db,"SELECT grabpoints_enabled,grabpoints_earn_rate,grabpoints_value FROM site_settings WHERE id=1");
  return json({settings:settings||{},tiers,existing:site||{}});
 }
 if(path==="/api/admin/rewards-eligibility/vendors"&&method==="PATCH"){
  const b=await req.json().catch(()=>({})),vid=String(b.vendor_id||"");
  if(!vid)return json({error:"vendor_id is required."},400);
  const v=await one(db,"SELECT id FROM vendors WHERE id=?",vid);if(!v)return json({error:"Vendor not found."},404);
  const old=await one(db,"SELECT * FROM vendor_rewards_settings WHERE vendor_id=?",vid);
  // One store-level switch controls eligibility: an active/eligible store automatically
  // enables Rewards + Referral + storefront eligibility for all of its products.
  const eligible=(b.eligibility_status??old?.eligibility_status??"inactive")==="active";
  const next={rewards_enabled:eligible?1:0,referral_enabled:eligible?1:0,eligible_store_layout:eligible?1:0,eligibility_status:eligible?"active":"inactive"};
  await db.prepare(`INSERT INTO vendor_rewards_settings(vendor_id,rewards_enabled,referral_enabled,eligible_store_layout,eligibility_status,updated_by,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(vendor_id) DO UPDATE SET rewards_enabled=excluded.rewards_enabled,referral_enabled=excluded.referral_enabled,eligible_store_layout=excluded.eligible_store_layout,eligibility_status=excluded.eligibility_status,updated_by=excluded.updated_by,updated_at=excluded.updated_at`).bind(vid,next.rewards_enabled,next.referral_enabled,next.eligible_store_layout,next.eligibility_status,adminId,stamp()).run();
  await db.prepare(`INSERT INTO product_rewards_eligibility(product_id,vendor_id,rewards_eligible,referral_eligible,status,updated_by,updated_at)
    SELECT id, vendor_id, ?, ?, ?, ?, ? FROM products WHERE vendor_id=?
    ON CONFLICT(product_id) DO UPDATE SET vendor_id=excluded.vendor_id,rewards_eligible=excluded.rewards_eligible,referral_eligible=excluded.referral_eligible,status=excluded.status,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
    .bind(next.rewards_enabled,next.referral_enabled,eligible?"eligible":"not_eligible",adminId,stamp(),vid).run();
  await audit(db,adminId,vid,null,"vendor_eligibility_update",old,next,b.reason);
  return json({ok:true,vendor_id:vid,...next,products_auto_updated:true});
 }
 if(path==="/api/admin/rewards-eligibility/products"&&method==="PATCH"){
  const b=await req.json().catch(()=>({})),pid=String(b.product_id||"");
  if(!pid)return json({error:"product_id is required."},400);
  const product=await one(db,"SELECT id,vendor_id FROM products WHERE id=?",pid);if(!product)return json({error:"Product not found."},404);
  const vendor=await one(db,"SELECT * FROM vendor_rewards_settings WHERE vendor_id=?",product.vendor_id);
  const old=await one(db,"SELECT * FROM product_rewards_eligibility WHERE product_id=?",pid);
  const rewards=Number(b.rewards_eligible??old?.rewards_eligible??0)?1:0,referral=Number(b.referral_eligible??old?.referral_eligible??0)?1:0;
  const status=(rewards||referral)?"eligible":"not_eligible";
  await db.prepare(`INSERT INTO product_rewards_eligibility(product_id,vendor_id,rewards_eligible,referral_eligible,status,updated_by,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET vendor_id=excluded.vendor_id,rewards_eligible=excluded.rewards_eligible,referral_eligible=excluded.referral_eligible,status=excluded.status,updated_by=excluded.updated_by,updated_at=excluded.updated_at`).bind(pid,product.vendor_id,rewards,referral,status,adminId,stamp()).run();
  await audit(db,adminId,product.vendor_id,pid,"product_eligibility_update",old,{rewards_eligible:rewards,referral_eligible:referral,status},b.reason);
  return json({ok:true,product_id:pid,rewards_eligible:!!rewards,referral_eligible:!!referral,status,vendor_active:vendor?.eligibility_status==="active"});
 }
 if(path==="/api/admin/rewards-eligibility/settings"&&method==="PATCH"){
  const b=await req.json().catch(()=>({})),old=await one(db,"SELECT * FROM rewards_settings WHERE id=1");
  const enabled=Number(b.enabled??old?.enabled??1)?1:0;
  const gp=b.gp_value_bdt==null?old?.gp_value_bdt:Number(b.gp_value_bdt);
  const referralReward=Math.floor(Number(b.referral_reward_points??old?.referral_reward_points??0));
  if(!Number.isFinite(referralReward)||referralReward<0||referralReward>1000000)return json({error:"Referral reward must be between 0 and 1,000,000 GP."},400);
  if(gp!=null&&(!Number.isFinite(gp)||gp<=0||gp>1000))return json({error:"GP conversion must be a positive value."},400);
  await db.prepare("INSERT INTO rewards_settings(id,enabled,gp_value_bdt,referral_reward_points,updated_at) VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,gp_value_bdt=COALESCE(excluded.gp_value_bdt,rewards_settings.gp_value_bdt),referral_reward_points=excluded.referral_reward_points,updated_at=excluded.updated_at").bind(enabled,gp??null,referralReward,stamp()).run();
  if(gp!=null){await db.prepare("INSERT INTO site_settings(id,grabpoints_enabled,grabpoints_value,updated_at) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET grabpoints_enabled=excluded.grabpoints_enabled,grabpoints_value=excluded.grabpoints_value,updated_at=excluded.updated_at").bind(enabled,gp,stamp()).run()}else{await db.prepare("UPDATE site_settings SET grabpoints_enabled=?,updated_at=? WHERE id=1").bind(enabled,stamp()).run()}
  await audit(db,adminId,null,null,"global_rewards_settings_update",old,{enabled,gp_value_bdt:gp??null},b.reason);
  return json({ok:true,enabled,gp_value_bdt:gp??null,referral_reward_points:referralReward});
 }
 return json({error:"Method not allowed or route not found."},405);
}
