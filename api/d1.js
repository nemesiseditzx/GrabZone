// GrabZone D1 API bridge for the Vercel-hosted storefront.
'use strict';
const crypto = require('crypto');

const ALLOWED_TABLES = new Set(['products','product_images','orders','order_items','billboards','billboard_settings','notices','referral_codes','site_settings','store_policies']);
const PUBLIC_READ_TABLES = new Set(['products','product_images','notices','site_settings','billboards','billboard_settings','store_policies']);
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const AUTO_UPDATED = new Set(['products','orders','billboards','billboard_settings','referral_codes','site_settings','store_policies']);

function json(res,status,body){res.status(status).setHeader('Content-Type','application/json');res.end(JSON.stringify(body));}
function val(v){if(v===undefined||v===null)return null;if(typeof v==='boolean')return v?1:0;if(typeof v==='object')return JSON.stringify(v);return v;}
function ident(v){if(!IDENT.test(v))throw new Error(`Invalid identifier: ${v}`);return `"${v}"`;}
function now(){return new Date().toISOString();}

async function cfQuery(sql,params=[]){
  const account=process.env.R2_ACCOUNT_ID||process.env.CF_ACCOUNT_ID||process.env.CLOUDFLARE_ACCOUNT_ID;
  const database=process.env.D1_DATABASE_ID||process.env.CLOUDFLARE_D1_DATABASE_ID||'ffaa2c49-c89e-439f-9a71-89144b07dfce';
  const token=process.env.CF_API_TOKEN||process.env.CLOUDFLARE_API_TOKEN||process.env.CLOUDFLARE_API_KEY;
  if(!account||!database||!token)throw new Error('D1 is not configured. Add CF_API_TOKEN in Vercel Production environment variables.');
  const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({sql,params:params.map(val)})
  });
  const b=await r.json().catch(()=>({}));
  if(!r.ok||b.success===false)throw new Error(b?.errors?.map(x=>x.message).join('; ')||`Cloudflare D1 request failed (${r.status})`);
  return b.result?.[0]||{results:[],meta:{}};
}

function authCookie(req,name){
  const raw=String(req.headers.cookie||'');
  for(const part of raw.split(';')){
    const [k,...rest]=part.trim().split('=');
    if(k===name)return decodeURIComponent(rest.join('='));
  }
  return '';
}

function sessionTokenHash(token){
  return require('crypto').createHash('sha256').update(String(token)).digest('hex');
}

async function verifyAdmin(req){
  /*
   * Primary authentication: D1-backed HttpOnly session cookie.
   * Supabase bearer verification remains only as a temporary compatibility
   * bridge for any legacy session while the migration is being completed.
   */
  const cookieToken=authCookie(req,'gz_admin_session');
  if(cookieToken){
    const session=await cfQuery(
      `SELECT u.id
       FROM admin_sessions s
       JOIN admin_users u ON u.id=s.admin_user_id
       WHERE s.token_hash=? AND s.expires_at>?
       LIMIT 1`,
      [sessionTokenHash(cookieToken),new Date().toISOString()]
    );
    if(session.results?.[0])return true;
  }

  const auth=String(req.headers.authorization||'');
  if(!auth.startsWith('Bearer '))return false;
  const token=auth.slice(7).trim();
  const supabaseUrl=process.env.SUPABASE_URL;
  const anonKey=process.env.SUPABASE_ANON_KEY;
  if(!token||!supabaseUrl||!anonKey)return false;
  const r=await fetch(`${supabaseUrl.replace(/\\/$/,'')}/auth/v1/user`,{
    headers:{apikey:anonKey,Authorization:auth}
  });
  return r.ok;
}

function d1Configured(){
  return Boolean((process.env.R2_ACCOUNT_ID||process.env.CF_ACCOUNT_ID||process.env.CLOUDFLARE_ACCOUNT_ID) && (process.env.CF_API_TOKEN||process.env.CLOUDFLARE_API_TOKEN||process.env.CLOUDFLARE_API_KEY));
}
function supaHeaders(req){
  const h={'apikey':process.env.SUPABASE_ANON_KEY||'','Content-Type':'application/json','Prefer':'return=representation'};
  const auth=String(req.headers.authorization||'');
  if(auth.startsWith('Bearer '))h.Authorization=auth;
  return h;
}
function supaFilterParts(filters){
  const out=[];
  for(const f of filters||[]){
    const col=encodeURIComponent(String(f.column));
    if(f.op==='eq')out.push(col+'=eq.'+encodeURIComponent(String(f.value)));
    else if(f.op==='neq')out.push(col+'=neq.'+encodeURIComponent(String(f.value)));
    else if(f.op==='gt')out.push(col+'=gt.'+encodeURIComponent(String(f.value)));
    else if(f.op==='gte')out.push(col+'=gte.'+encodeURIComponent(String(f.value)));
    else if(f.op==='lt')out.push(col+'=lt.'+encodeURIComponent(String(f.value)));
    else if(f.op==='lte')out.push(col+'=lte.'+encodeURIComponent(String(f.value)));
    else if(f.op==='is')out.push(col+'=is.'+(f.value===null?'null':'not.null'));
    else if(f.op==='in')out.push(col+'=in.('+((Array.isArray(f.value)?f.value:[]).map(v=>encodeURIComponent(String(v))).join(','))+')');
  }
  return out;
}
async function supabaseFallback(req,p){
  const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  if(!base||!process.env.SUPABASE_ANON_KEY)throw new Error('Supabase fallback is not configured.');
  if(p.type==='rpc'){
    const args=p.args||{};
    const response=await fetch(base+'/rest/v1/rpc/'+encodeURIComponent(p.fn),{method:'POST',headers:supaHeaders(req),body:JSON.stringify(args)});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.hint||data?.details||'Supabase RPC failed.');
    return {data,error:null};
  }
  const table=String(p.table||'');
  let url=base+'/rest/v1/'+encodeURIComponent(table);
  const q=[];
  if(p.action==='select'){
    q.push('select='+encodeURIComponent(p.columns||'*'));
    q.push(...supaFilterParts(p.filters));
    if((p.orders||[]).length)q.push('order='+p.orders.map(o=>encodeURIComponent(String(o.column))+'.'+(o.ascending===false?'desc':'asc')).join(','));
    if(p.limit!==null&&p.limit!==undefined)q.push('limit='+encodeURIComponent(String(p.limit)));
    const response=await fetch(url+'?'+q.join('&'),{headers:supaHeaders(req)});
    const data=await response.json().catch(()=>[]);
    if(!response.ok)throw new Error(data?.message||'Supabase read failed.');
    let rows=Array.isArray(data)?data:[];
    if(p.single==='single'){if(rows.length!==1)throw new Error(rows.length?'Multiple rows returned.':'No rows found.');return {data:rows[0],error:null};}
    if(p.single==='maybe')return {data:rows[0]||null,error:null};
    return {data,error:null,count:rows.length};
  }
  const filters=supaFilterParts(p.filters);
  if(p.action==='insert'||p.action==='upsert'){
    const headers=supaHeaders(req);
    if(p.action==='upsert')headers.Prefer='resolution=merge-duplicates,return=representation';
    if(p.conflict)q.push('on_conflict='+encodeURIComponent(p.conflict));
    const response=await fetch(url+(q.length?'?'+q.join('&'):''),{method:'POST',headers,body:JSON.stringify(p.values)});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||'Supabase write failed.');
    return {data:p.single==='single'?(data?.[0]||null):(p.single==='maybe'?(data?.[0]||null):data),error:null,count:Array.isArray(data)?data.length:null};
  }
  if(p.action==='update'||p.action==='delete'){
    const response=await fetch(url+(filters.length?'?'+filters.join('&'):''),{method:p.action==='update'?'PATCH':'DELETE',headers:supaHeaders(req),body:p.action==='update'?JSON.stringify(p.values):undefined});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||'Supabase write failed.');
    return {data:p.action==='update'?data:null,error:null,count:Array.isArray(data)?data.length:null};
  }
  throw new Error('Unsupported fallback database action.');
}

function whereSql(filters,params){
  const parts=[];
  for(const f of filters||[]){
    const c=ident(String(f.column));
    if(f.op==='eq'){parts.push(`${c} = ?`);params.push(val(f.value));}
    else if(f.op==='neq'){parts.push(`${c} <> ?`);params.push(val(f.value));}
    else if(f.op==='gt'){parts.push(`${c} > ?`);params.push(val(f.value));}
    else if(f.op==='gte'){parts.push(`${c} >= ?`);params.push(val(f.value));}
    else if(f.op==='lt'){parts.push(`${c} < ?`);params.push(val(f.value));}
    else if(f.op==='lte'){parts.push(`${c} <= ?`);params.push(val(f.value));}
    else if(f.op==='is'){parts.push(f.value===null?`${c} IS NULL`:`${c} IS NOT NULL`);}
    else if(f.op==='in'){const a=Array.isArray(f.value)?f.value:[];if(!a.length)parts.push('1=0');else{parts.push(`${c} IN (${a.map(()=>'?').join(',')})`);a.forEach(x=>params.push(val(x)));}}
    else throw new Error(`Unsupported filter: ${f.op}`);
  }
  return parts.length?` WHERE ${parts.join(' AND ')}`:'';
}

const BOOL_COLS=new Set(['published','active','is_main','autoplay','show_arrows','show_dots','enabled','animation_enabled','show_notice','show_offer','show_how','show_referral','animations_enabled','page_load','scroll_reveal','product_hover','button_effects','hero_animation','floating_effects','notice_animation','magnetic_cursor','text_reveal','image_parallax','scroll_velocity','product_stagger','marquee_motion','header_scroll','premium_hover_glow','section_transitions','product_entrance','product_3d_tilt','product_image_zoom','product_image_parallax','product_cursor_spotlight','product_shine','product_hover_lift','product_featured_glow']);
function normalizeRow(row){
  if(!row||typeof row!=='object')return row;
  const o={...row};
  for(const k of Object.keys(o))if((o[k]===0||o[k]===1)&&BOOL_COLS.has(k))o[k]=Boolean(o[k]);
  if(typeof o.payment_methods==='string'){try{o.payment_methods=JSON.parse(o.payment_methods);}catch(e){}}
  if(typeof o.content==='string'&&(o.content.trim().startsWith('{')||o.content.trim().startsWith('['))){try{o.content=JSON.parse(o.content);}catch(e){}}
  if(typeof o.business_koro_order_ids==='string'&&(o.business_koro_order_ids.trim().startsWith('[')||o.business_koro_order_ids.trim().startsWith('{'))){try{o.business_koro_order_ids=JSON.parse(o.business_koro_order_ids);}catch(e){}}
  return o;
}

async function tableRequest(req,p,isAdmin){
  const table=String(p.table||'');
  if(!ALLOWED_TABLES.has(table))throw new Error('Unknown database table.');
  const action=p.action||'select';
  if(action!=='select'&&!isAdmin)throw new Error('Unauthorized.');
  if(action==='select'&&!isAdmin&&!PUBLIC_READ_TABLES.has(table))throw new Error('Unauthorized.');

  if(action==='select'){
    let cols=p.columns||'*';
    if(cols!=='*')cols=cols.split(',').map(x=>x.trim()).map(ident).join(', ');
    const params=[];let where=whereSql(p.filters,params);
    if(!isAdmin&&table==='products')where+=where?' AND "published"=1':' WHERE "published"=1';
    if(!isAdmin&&table==='notices')where+=where?' AND "active"=1':' WHERE "active"=1';
    if(!isAdmin&&table==='billboards')where+=where?' AND "active"=1':' WHERE "active"=1';
    if(!isAdmin&&table==='product_images')where+=where?' AND EXISTS (SELECT 1 FROM products p WHERE p.id=product_images.product_id AND p.published=1)':' WHERE EXISTS (SELECT 1 FROM products p WHERE p.id=product_images.product_id AND p.published=1)';
    let sql=`SELECT ${cols} FROM ${ident(table)}${where}`;
    if((p.orders||[]).length)sql+=' ORDER BY '+p.orders.map(o=>`${ident(String(o.column))} ${o.ascending===false?'DESC':'ASC'}`).join(', ');
    if(p.limit!==null&&p.limit!==undefined)sql+=` LIMIT ${Math.max(0,Math.floor(Number(p.limit)||0))}`;
    const r=await cfQuery(sql,params);let rows=(r.results||[]).map(normalizeRow);
    if(p.single==='single'){if(rows.length!==1)throw new Error(rows.length===0?'No rows found.':'Multiple rows returned.');rows=rows[0];}
    else if(p.single==='maybe')rows=rows[0]||null;
    return {data:rows,count:r.meta?.rows_read??null};
  }

  if(action==='insert'||action==='upsert'){
    let rows=Array.isArray(p.values)?p.values:[p.values];if(!rows.length)return {data:[],count:0};
    const stamp=now();
    rows=rows.map(row=>{
      const x={...(row||{})};
      if(x.id===undefined&&['products','product_images','notices','orders','order_items','billboards','referral_codes'].includes(table))x.id=crypto.randomUUID();
      if(['products','notices','billboards','referral_codes'].includes(table)&&x.created_at===undefined)x.created_at=stamp;
      if(AUTO_UPDATED.has(table)&&x.updated_at===undefined)x.updated_at=stamp;
      if(table==='orders'&&x.public_tracking_id===undefined)x.public_tracking_id='GZ-'+crypto.randomUUID().replace(/-/g,'').slice(0,16).toUpperCase();
      return x;
    });
    const cols=Array.from(new Set(rows.flatMap(r=>Object.keys(r||{}))));cols.forEach(ident);
    const batch=rows.map(row=>{
      let sql=`INSERT INTO ${ident(table)} (${cols.map(ident).join(',')}) VALUES (${cols.map(()=>'?').join(',')})`;
      if(action==='upsert'&&p.conflict){
        const conflicts=String(p.conflict).split(',').map(x=>x.trim()).filter(Boolean);
        const updates=cols.filter(c=>!conflicts.includes(c));
        sql+=` ON CONFLICT (${conflicts.map(ident).join(',')}) DO UPDATE SET ${updates.map(c=>`${ident(c)}=excluded.${ident(c)}`).join(',')}`;
      }
      return {sql,params:cols.map(c=>val(row?.[c]))};
    });
    const account=process.env.R2_ACCOUNT_ID||process.env.CF_ACCOUNT_ID||process.env.CLOUDFLARE_ACCOUNT_ID;
    const database=process.env.D1_DATABASE_ID||process.env.CLOUDFLARE_D1_DATABASE_ID||'ffaa2c49-c89e-439f-9a71-89144b07dfce';
    const token=process.env.CF_API_TOKEN||process.env.CLOUDFLARE_API_TOKEN||process.env.CLOUDFLARE_API_KEY;
    if(!account||!database||!token)throw new Error('D1 is not configured.');
    const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({batch})});
    const b=await r.json().catch(()=>({}));if(!r.ok||b.success===false)throw new Error(b?.errors?.map(x=>x.message).join('; ')||'D1 batch write failed.');
    if(!p.returning)return {data:null,count:rows.length};
    const returned=[];for(const row of rows){if(row.id!==undefined){const rr=await cfQuery(`SELECT * FROM ${ident(table)} WHERE id=? LIMIT 1`,[val(row.id)]);if(rr.results?.[0])returned.push(normalizeRow(rr.results[0]));}}
    return {data:p.single==='single'?returned[0]:(p.single==='maybe'?(returned[0]||null):returned),count:returned.length};
  }

  if(action==='update'){
    const entries=Object.entries(p.values||{});if(!entries.length)return {data:null,count:0};
    const set=entries.map(([k])=>`${ident(k)}=?`).join(', ');
    const filterParams=[];const where=whereSql(p.filters,filterParams);const params=entries.map(([,v])=>val(v));
    const addUpdated=!entries.some(([k])=>k==='updated_at')&&AUTO_UPDATED.has(table);
    if(addUpdated)params.push(now());
    const setSql=addUpdated?`${set}, "updated_at"=?`:set;
    params.push(...filterParams);
    const r=await cfQuery(`UPDATE ${ident(table)} SET ${setSql}${where}`,params);
    if(!p.returning)return {data:null,count:r.meta?.changes??0};
    const rows=(await cfQuery(`SELECT * FROM ${ident(table)}${where}`,filterParams)).results||[];
    return {data:p.single==='maybe'?(rows[0]||null):rows,count:rows.length};
  }

  if(action==='delete'){
    const params=[];const where=whereSql(p.filters,params);const r=await cfQuery(`DELETE FROM ${ident(table)}${where}`,params);return {data:null,count:r.meta?.changes??0};
  }
  throw new Error(`Unsupported database action: ${action}`);
}

async function rpcRequest(fn,args,isAdmin){
  if(fn==='get_public_tracking_id'){
    const orderId=String(args.p_order_id||'');
    if(!orderId) return {data:null};
    const r=await cfQuery('SELECT public_tracking_id FROM orders WHERE id=? LIMIT 1',[orderId]);
    return {data:r.results?.[0]?.public_tracking_id||null};
  }

  if(fn==='validate_referral_code'){
    const code=String(args.p_code??'').trim().toUpperCase(),subtotal=Math.max(0,Number(args.p_subtotal||0));
    if(!code)return {data:{valid:false,discount:0,message:''}};
    const r=await cfQuery('SELECT * FROM referral_codes WHERE upper(code)=upper(?) AND active=1 LIMIT 1',[code]);const row=r.results?.[0];
    if(!row)return {data:{valid:false,discount:0,message:'Invalid or inactive referral code.'}};
    if(row.starts_at&&new Date(row.starts_at).getTime()>Date.now())return {data:{valid:false,discount:0,message:'This referral code is not active yet.'}};
    if(row.expires_at&&new Date(row.expires_at).getTime()<Date.now())return {data:{valid:false,discount:0,message:'This referral code has expired.'}};
    if(row.usage_limit!==null&&Number(row.used_count||0)>=Number(row.usage_limit))return {data:{valid:false,discount:0,message:'This referral code has reached its usage limit.'}};
    if(subtotal<Number(row.min_order_amount||0))return {data:{valid:false,discount:0,message:`Minimum order amount for this code is ৳${Number(row.min_order_amount||0).toLocaleString('en-BD')}.`}};
    let discount=row.benefit_type==='percentage'?Math.round(subtotal*Number(row.benefit_value||0)/100*100)/100:Number(row.benefit_value||0);
    if(row.max_discount_amount!==null)discount=Math.min(discount,Number(row.max_discount_amount));discount=Math.max(0,Math.min(discount,subtotal));
    return {data:{valid:true,discount,code:String(row.code).toUpperCase(),label:row.benefit_type==='percentage'?`${row.benefit_value}% off`:`৳${row.benefit_value} off`,admin_name:row.admin_name}};
  }

  if(fn==='track_public_order'){
    const id=String(args.p_tracking_id||'').trim().toUpperCase();const r=await cfQuery('SELECT * FROM orders WHERE upper(public_tracking_id)=upper(?) LIMIT 1',[id]);const o=r.results?.[0];
    if(!o)throw new Error('Order not found. Please check your private Tracking ID.');
    const items=(await cfQuery('SELECT product_name AS name,quantity,unit_price AS price FROM order_items WHERE order_id=? ORDER BY id',[o.id])).results||[];
    return {data:{trackingId:o.public_tracking_id,orderNumber:o.order_number,status:o.status,createdAt:o.created_at,updatedAt:o.updated_at,tracking:{number:o.tracking_number||'',courier:o.tracking_provider||'',url:o.tracking_url||''},items}};
  }

  if(fn==='create_public_order'){
    const p=args.payload||args,required=['customer_name','email','phone','division','district','upazila','address'];
    if(required.some(k=>!String(p[k]??'').trim()))throw new Error('Please complete all required fields.');
    if(!/^01[3-9][0-9]{8}$/.test(String(p.phone).trim()))throw new Error('Please enter a valid 11-digit Bangladesh mobile number (01XXXXXXXXX).');
    if(!Array.isArray(p.items)||!p.items.length)throw new Error('Your order is empty.');
    const division=String(p.division).trim().toLowerCase();
    const metro=['Adabor','Dhaka Airport','Badda','Banani','Bangshal','Bhashantek','Dhaka Cantonment','Dhaka Chackbazar','Dakshin Khan','Darus-Salam','Demra','Dhanmondi','Gandaria','Gulshan','Hatirjheel','Hazaribagh','Jatrabari','Kadamtoli','Kafrul','Kalabagan','Kamrangirchar','Khilkhet','Khilgaon','Kotwali','Lalbagh','Mirpur Model','Mohammadpur','Motijheel','Mugda','Dhaka New Market','Pallabi','Paltan Model','Ramna Model','Rampura','Rupnagar','Sabujbag','Shah Ali','Shahbag','Shahjahanpur','Sher-e-Bangla Nagar','Shyampur','Sutrapur','Tejgaon','Tejgaon Industrial','Turag','Uttar Khan','Vatara','Uttara East','Uttara West','Wari'];
    const shipping=division==='dhaka'&&metro.includes(String(p.upazila).trim())?70:130,nowIso=now();
    const no=(await cfQuery('SELECT coalesce(max(order_no),0)+1 AS next_no FROM orders')).results?.[0]?.next_no||1;const orderNo=Number(no),id=crypto.randomUUID(),tracking='GZ-'+crypto.randomUUID().replace(/-/g,'').slice(0,16).toUpperCase();
    const referralCode=String(p.referral_code||'').trim().toUpperCase()||null;let subtotal=0,items=[];
    for(const item of p.items){
      const pr=(await cfQuery('SELECT * FROM products WHERE id=? AND published=1 LIMIT 1',[String(item.product_id||'')])).results?.[0];if(!pr)throw new Error('One of the selected products is no longer available.');
      const qty=Math.max(1,Number.parseInt(item.quantity,10)||1),line=Number(pr.price||0)*qty;subtotal+=line;
      items.push({id:crypto.randomUUID(),product_id:pr.id,product_name:pr.name,image_url:pr.image_url,quantity:qty,unit_price:pr.price,line_total:line});
    }
    let discount=0,admin=null;
    if(referralCode){
      const ref=(await cfQuery('SELECT * FROM referral_codes WHERE upper(code)=upper(?) AND active=1 LIMIT 1',[referralCode])).results?.[0];if(!ref)throw new Error('Invalid or inactive referral code.');
      if(ref.starts_at&&new Date(ref.starts_at).getTime()>Date.now())throw new Error('This referral code is not active yet.');
      if(ref.expires_at&&new Date(ref.expires_at).getTime()<Date.now())throw new Error('This referral code has expired.');
      if(ref.usage_limit!==null&&Number(ref.used_count||0)>=Number(ref.usage_limit))throw new Error('This referral code has reached its usage limit.');
      if(subtotal<Number(ref.min_order_amount||0))throw new Error(`Minimum order amount for this referral code is ৳${Number(ref.min_order_amount||0)}.`);
      discount=ref.benefit_type==='percentage'?Math.round(subtotal*Number(ref.benefit_value||0)/100*100)/100:Number(ref.benefit_value||0);
      if(ref.max_discount_amount!==null)discount=Math.min(discount,Number(ref.max_discount_amount));discount=Math.max(0,Math.min(discount,subtotal));admin=ref.admin_name||null;
      await cfQuery('UPDATE referral_codes SET used_count=used_count+1,updated_at=? WHERE id=?',[nowIso,ref.id]);
    }
    const total=Math.max(0,subtotal+shipping-discount);
    await cfQuery('INSERT INTO orders (id,order_no,order_number,customer_name,email,phone,division,district,upazila,address,referral_code,referral_discount,discount_amount,referral_admin_name,payment_method,shipping_charge,subtotal,total,status,public_tracking_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[id,orderNo,`GZ-${String(orderNo).padStart(4,'0')}`,String(p.customer_name).trim(),String(p.email).trim().toLowerCase(),String(p.phone).trim(),String(p.division).trim(),String(p.district).trim(),String(p.upazila).trim(),String(p.address).trim(),referralCode,discount,discount,admin,'Cash on Delivery',shipping,subtotal,total,'New',tracking,nowIso,nowIso]);
    for(const item of items)await cfQuery('INSERT INTO order_items (id,order_id,product_id,product_name,image_url,quantity,unit_price,line_total) VALUES (?,?,?,?,?,?,?,?)',[item.id,id,item.product_id,item.product_name,item.image_url,item.quantity,item.unit_price,item.line_total]);
    return {data:{id,order_number:`GZ-${String(orderNo).padStart(4,'0')}`,public_tracking_id:tracking,subtotal,shipping_charge:shipping,referral_discount:discount,total,status:'New'}};
  }
  if(!isAdmin)throw new Error('Unauthorized.');
  throw new Error('Unsupported RPC.');
}

module.exports=async(req,res)=>{
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed.'});
  try{
    const payload=req.body||(typeof req.body==='string'?JSON.parse(req.body):{});
    const isAdmin=await verifyAdmin(req);
    if(!d1Configured())throw new Error('Cloudflare D1 is not configured. Add CLOUDFLARE_API_TOKEN and R2_ACCOUNT_ID (or CF_ACCOUNT_ID) in Vercel Production environment variables.');
    const result=payload.type==='rpc'
      ? await rpcRequest(payload.fn,payload.args||{},isAdmin)
      : payload.type==='table'
        ? await tableRequest(req,payload,isAdmin)
        : (()=>{throw new Error('Invalid database request.')})();
    return json(res,200,result);
  }catch(e){return json(res,400,{error:e.message||'Database request failed.'});}
};