(() => {
'use strict';
const C=window.GRABZONE_CONFIG||{};
const sb=window.grabzoneD1||null;
const currency=C.currency||'৳';
let orders=[], current=null, orderVendorMap=new Map(), productVendorMap=new Map(), vendorNameMap=new Map(), vendorShippingMap=new Map(), orderFinancialMap=new Map(), itemVendorIdMap=new Map(), globalShippingFee=130;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>currency+Number(n||0).toLocaleString('en-BD');
const $=id=>document.getElementById(id);

const BD_TIME_ZONE="Asia/Dhaka";
function formatBdDateTime(value){
  if(!value)return "—";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "—";
  return new Intl.DateTimeFormat("en-US",{timeZone:BD_TIME_ZONE,year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:true}).format(d);
}

async function loadOrderVendorContext(){
  orderVendorMap=new Map(); productVendorMap=new Map(); vendorNameMap=new Map(); vendorShippingMap=new Map(); orderFinancialMap=new Map(); itemVendorIdMap=new Map(); globalShippingFee=130;
  try{
    const itemRes=await sb.from('order_items').select('id,order_id,product_id,product_name,vendor_id,quantity,unit_price,line_total');
    if(itemRes.error)throw itemRes.error;
    const itemRows=Array.isArray(itemRes.data)?itemRes.data:[];
    const productIds=[...new Set(itemRows.map(x=>String(x.product_id||'').trim()).filter(Boolean))];
    if(productIds.length){
      const pr=await sb.from('products').select('id,vendor_id').in('id',productIds);
      if(!pr.error)for(const p of (Array.isArray(pr.data)?pr.data:[]))productVendorMap.set(String(p.id),String(p.vendor_id||''));
    }
    const settingRes=await sb.from('site_settings').select('global_shipping_fee').eq('id',1).maybeSingle();
    if(!settingRes.error){
      const fee=Number(settingRes.data?.global_shipping_fee);
      if(Number.isFinite(fee)&&fee>=0)globalShippingFee=fee;
    }
    const voRes=await sb.from('vendor_orders').select('id,order_id,vendor_id,shipping_fee,delivery_charge');
    const vendorOrderRows=!voRes.error&&Array.isArray(voRes.data)?voRes.data:[];
    const voiRes=await sb.from('vendor_order_items').select('vendor_order_id,order_item_id');
    const vendorOrderItemRows=!voiRes.error&&Array.isArray(voiRes.data)?voiRes.data:[];
    const vendorIds=[...new Set([
      ...itemRows.map(x=>String(x.vendor_id||productVendorMap.get(String(x.product_id||''))||'').trim()),
      ...vendorOrderRows.map(x=>String(x.vendor_id||'').trim())
    ].filter(Boolean))];
    // Load the vendor directory once instead of filtering it with an IN query.
    // This keeps historical vendor orders resolvable and guarantees we can show
    // the real shop/brand name stored on the vendor record.
    const vr=await sb.from('vendors').select('*');
    if(!vr.error)for(const v of (Array.isArray(vr.data)?vr.data:[])){
      const vid=String(v.id||'').trim(); if(!vid)continue;
      const shopName=String(v.brand_name||v.business_name||v.store_name||v.shop_name||v.name||v.slug||'').trim();
      vendorNameMap.set(vid,shopName||('Vendor '+vid.slice(0,8)));
      const fee=Number(v.shipping_fee);
      vendorShippingMap.set(vid,Number.isFinite(fee)&&fee>=0?fee:130);
    }
    const vendorOrderById=new Map(vendorOrderRows.map(x=>[String(x.id),x]));
    const itemVendorMap=new Map();
    for(const x of vendorOrderItemRows){
      const vo=vendorOrderById.get(String(x.vendor_order_id));
      if(vo&&x.order_item_id){const vid=String(vo.vendor_id||'');itemVendorMap.set(String(x.order_item_id),vid);itemVendorIdMap.set(String(x.order_item_id),vid)}
    }
    const itemByOrder=new Map();
    for(const row of itemRows){
      const oid=String(row.order_id||''); if(!oid)continue;
      const arr=itemByOrder.get(oid)||[]; arr.push(row); itemByOrder.set(oid,arr);
      const vid=String(itemVendorMap.get(String(row.id||''))||row.vendor_id||productVendorMap.get(String(row.product_id||''))||'');
      const name=vid?(vendorNameMap.get(vid)||'Vendor'):'GrabZone (Platform)';
      const bucket=orderVendorMap.get(oid)||[];
      if(!bucket.some(x=>x.vendor_id===vid&&x.product_id===String(row.product_id||'')))bucket.push({vendor_id:vid,product_id:String(row.product_id||''),product_name:String(row.product_name||'Product'),vendor_name:name});
      orderVendorMap.set(oid,bucket);
    }
    const productsByVendor=new Map();
    for(const row of itemRows){const vid=String(itemVendorMap.get(String(row.id||''))||row.vendor_id||productVendorMap.get(String(row.product_id||''))||'').trim();if(!vid)continue;const arr=productsByVendor.get(vid)||[];const name=String(row.product_name||'Product');if(!arr.includes(name))arr.push(name);productsByVendor.set(vid,arr)}
    const vendorOrderByOrder=new Map();
    for(const row of vendorOrderRows){
      const oid=String(row.order_id||''); if(!oid)continue;
      const arr=vendorOrderByOrder.get(oid)||[]; arr.push(row); vendorOrderByOrder.set(oid,arr);
    }
    for(const [oid,rows] of itemByOrder){
      const storedOrder=orders.find(x=>String(x.id)===oid)||{};
      const storedShipping=Number(storedOrder.shipping_charge);
      const routed=vendorOrderByOrder.get(oid)||[];
      const vendorIds=[...new Set([
        ...routed.map(x=>String(x.vendor_id||'').trim()),
        ...rows.map(x=>String(x.vendor_id||productVendorMap.get(String(x.product_id||''))||'').trim())
      ].filter(Boolean))];

      // A placed order must display the same delivery amount the customer was
      // charged. Use the vendor-order snapshot when it exactly matches that
      // invoice amount. If an older routed order has lost its per-vendor
      // shipping snapshot (for example both vendor rows are 0), reconstruct
      // the vendor lines from the vendor fees while keeping one authoritative
      // order-level shipping total.
      const snapshot=[];
      const seen=new Set();
      for(const row of routed){
        const vid=String(row.vendor_id||''); if(seen.has(vid))continue; seen.add(vid);
        const fee=Number(row.shipping_fee);
        const delivery=Number(row.delivery_charge);
        const value=Number.isFinite(fee)&&fee>=0?fee:(Number.isFinite(delivery)&&delivery>=0?delivery:0);
        snapshot.push({vendor_id:vid,vendor_name:vendorNameMap.get(vid)||('Vendor '+vid.slice(0,8)),product_names:productsByVendor.get(vid)||[],shipping:value});
      }
      const snapshotTotal=snapshot.reduce((n,x)=>n+Number(x.shipping||0),0);

      if(snapshot.length && snapshotTotal>0 && Number.isFinite(storedShipping) && storedShipping>=0 && Math.abs(snapshotTotal-storedShipping)<=0.009){
        orderFinancialMap.set(oid,{shipping:storedShipping,breakdown:snapshot});
        continue;
      }

      const currentFees=vendorIds.map(vid=>({
        vendor_id:vid,
        vendor_name:vendorNameMap.get(vid)||('Vendor '+vid.slice(0,8)),
        product_names:productsByVendor.get(vid)||[],
        shipping:Math.max(0,Number(vendorShippingMap.get(vid)??130))
      }));
      const currentFeeTotal=currentFees.reduce((n,x)=>n+Number(x.shipping||0),0);

      let invoiceShipping=Number.isFinite(storedShipping)&&storedShipping>0?storedShipping:0;
      if(invoiceShipping<=0 && currentFeeTotal>0 && vendorIds.length) invoiceShipping=currentFeeTotal;

      let breakdown=[];
      if(vendorIds.length && invoiceShipping>0){
        const weights=currentFees.reduce((n,x)=>n+Number(x.shipping||0),0);
        let allocated=0;
        breakdown=currentFees.map((x,index)=>{
          let value;
          if(index===currentFees.length-1){
            value=Math.max(0,invoiceShipping-allocated);
          }else{
            value=weights>0
              ?Math.round((invoiceShipping*(Number(x.shipping||0)/weights))*100)/100
              :Math.round((invoiceShipping/currentFees.length)*100)/100;
            value=Math.max(0,value);
          }
          allocated+=value;
          return {...x,shipping:value};
        });
      }else if(invoiceShipping>0){
        breakdown=[{vendor_id:'',vendor_name:'Customer invoice',product_names:[],shipping:invoiceShipping}];
      }else{
        breakdown=[];
      }

      const shipping=breakdown.reduce((n,x)=>n+Number(x.shipping||0),0);
      orderFinancialMap.set(oid,{shipping,breakdown});
    }
  }catch(e){console.warn('Order vendor/financial context:',e)}
}
function vendorSummaryHtml(order){
  const rows=orderVendorMap.get(String(order.id))||[];
  if(!rows.length)return '<span class="gz-vendor-empty">Vendor not assigned</span>';
  const grouped=new Map();
  for(const x of rows){
    const key=x.vendor_id||'__none__';
    const g=grouped.get(key)||{name:x.vendor_name,products:[]};
    if(!g.products.includes(x.product_name))g.products.push(x.product_name);
    grouped.set(key,g);
  }
  return [...grouped.values()].map(g=>'<div class="gz-vendor-summary"><b>'+esc(g.name)+'</b><span>'+esc(g.products.join(' · '))+'</span></div>').join('');
}

/* GrabZone in-app notifications/dialogs — avoids browser-native popups. */
function gzUiToast(message,type='success'){
  let host=document.getElementById('gzUiToastHost');
  if(!host){
    host=document.createElement('div');
    host.id='gzUiToastHost';
    host.style.cssText='position:fixed;right:22px;bottom:22px;z-index:100001;display:grid;gap:10px;max-width:min(420px,calc(100vw - 30px));pointer-events:none;';
    document.body.appendChild(host);
  }
  const el=document.createElement('div');
  el.style.cssText='pointer-events:auto;padding:14px 16px;border-radius:14px;background:#111;color:#fff;box-shadow:0 14px 40px rgba(0,0,0,.24);font:700 13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;white-space:pre-line;';
  el.textContent=message;
  if(type==='error')el.style.background='#9d1717';
  host.appendChild(el);
  requestAnimationFrame(()=>{el.style.opacity='1';});
  setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(6px)';el.style.transition='.2s ease';setTimeout(()=>el.remove(),220)},3200);
}
function gzUiConfirm(message){
  return new Promise(resolve=>{
    let modal=document.getElementById('gzUiConfirm');
    if(!modal){
      modal=document.createElement('div');
      modal.id='gzUiConfirm';
      modal.style.cssText='position:fixed;inset:0;z-index:100002;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.58);backdrop-filter:blur(5px);';
      modal.innerHTML='<div style="width:min(430px,100%);background:#fff;border-radius:20px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.28);font-family:system-ui,-apple-system,Segoe UI,sans-serif;"><div style="font-size:11px;font-weight:900;letter-spacing:.14em;color:#777;margin-bottom:8px">GRABZONE</div><div id="gzUiConfirmText" style="font-size:16px;line-height:1.5;font-weight:700;color:#111;white-space:pre-line"></div><div style="display:flex;justify-content:flex-end;gap:9px;margin-top:20px"><button id="gzUiConfirmNo" type="button" style="border:1px solid #ddd;background:#fff;color:#111;border-radius:10px;padding:10px 15px;font-weight:800;cursor:pointer">Cancel</button><button id="gzUiConfirmYes" type="button" style="border:0;background:#111;color:#fff;border-radius:10px;padding:10px 15px;font-weight:800;cursor:pointer">Continue</button></div></div>';
      document.body.appendChild(modal);
    }
    document.getElementById('gzUiConfirmText').textContent=message;
    modal.style.display='flex';
    const finish=value=>{modal.style.display='none';resolve(value)};
    document.getElementById('gzUiConfirmNo').onclick=()=>finish(false);
    document.getElementById('gzUiConfirmYes').onclick=()=>finish(true);
  });
}
const statuses=['New','Contacting','Confirmed','Processing','Shipped','Delivered','Cancelled'];
const TRACK_MARKER='[[GRABZONE_TRACKING]]',TRACK_END='[[/GRABZONE_TRACKING]]';
function parseTracking(note){const m=String(note||'').split(TRACK_MARKER)[1];if(!m)return{number:'',courier:'',url:''};try{return{number:'',courier:'',url:'',...JSON.parse(m.split(TRACK_END)[0])}}catch{return{number:'',courier:'',url:''}}}
function saveTrackingNote(note){return String(note||'').split(TRACK_MARKER)[0].trim()||null}
function trackingFor(order){const legacy=parseTracking(order.admin_note);return{number:String(order.tracking_number||legacy.number||'').trim(),courier:String(order.tracking_provider||legacy.courier||'').trim(),url:String(order.tracking_url||legacy.url||'').trim()}}
async function ensurePrivateTrackingId(order){
 if(String(order.public_tracking_id||'').trim())return String(order.public_tracking_id).trim();
 for(let attempt=0;attempt<5;attempt++){
   const bytes=new Uint8Array(10);
   if(window.crypto?.getRandomValues)window.crypto.getRandomValues(bytes);
   else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
   const id='GZ-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
   const{data:existing,error:checkError}=await sb.from('orders').select('id').eq('public_tracking_id',id).maybeSingle();
   if(checkError)throw checkError;
   if(existing)continue;
   const{error:updateError}=await sb.from('orders').update({public_tracking_id:id,updated_at:new Date().toISOString()}).eq('id',order.id);
   if(updateError)throw updateError;
   order.public_tracking_id=id;
   return id;
 }
 throw new Error('Could not generate a unique Private Tracking ID.');
}



function inject(){
 if($('gzOrdersTab'))return;
 const main=document.querySelector('main.content'); if(!main)return;
 const section=document.createElement('section'); section.id='tab-orders'; section.className='tab';
 section.innerHTML=`
 <div class="page-title"><div><div class="eyebrow">ORDER MANAGEMENT</div><h1>Orders</h1><p>Receive website orders, call customers, confirm them and manage the full order lifecycle.</p></div><button class="primary" id="gzOrdersRefresh">↻ Refresh</button></div>
 <div class="panel"><div class="gz-order-filters"><input id="gzOrderSearch" placeholder="Search order number, Tracking ID, name, phone or email"><select id="gzOrderStatusFilter"><option value="">All statuses</option>${statuses.map(s=>`<option>${s}</option>`).join('')}</select></div></div>
 <div class="panel" id="gzOrdersPanel"><div class="muted">Open Orders to load orders.</div></div>`;
 main.insertBefore(section,main.firstElementChild);

 const style=document.createElement('style'); style.id='gzOrdersStyle'; style.textContent=`
 .gz-order-filters{display:grid;grid-template-columns:1fr 180px;gap:10px}.gz-order-filters input,.gz-order-filters select{width:100%;box-sizing:border-box;padding:12px;border:1px solid #ddd;border-radius:11px;background:#fff;font:inherit}
 .gz-orders-wrap{overflow:auto}.gz-orders-table{width:100%;border-collapse:collapse;min-width:1120px}.gz-orders-table th,.gz-orders-table td{padding:12px 9px;border-bottom:1px solid #eee;text-align:left;font-size:12px;vertical-align:middle}.gz-orders-table th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#777}.gz-order-link{border:0;background:none;padding:0;font:inherit;font-weight:900;cursor:pointer}.gz-public-track-id{margin-top:4px;font-size:9px;color:#666;letter-spacing:.04em;word-break:break-all}.gz-order-email{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gz-discount-box{display:flex;flex-direction:column;gap:3px;min-width:135px;padding:7px 8px;border:1px solid #e7e7e4;border-radius:9px;background:#fafaf8}.gz-discount-box b{font-size:9px;text-transform:uppercase;letter-spacing:.04em}.gz-discount-box span{font-size:11px;font-weight:800;word-break:break-all}.gz-discount-box small{font-size:10px;color:#666}.gz-discount-box.referral{background:#faf8f2;border-color:#eee5cf}.gz-discount-box.grabpoints{background:#f5fbf8;border-color:#d8eee5}.gz-status-select{border:1px solid #ddd;border-radius:999px;padding:6px 9px;background:#fff;font:inherit;font-size:10px;font-weight:800;cursor:pointer}.gz-order-actions-cell{display:flex;gap:6px;white-space:nowrap}.gz-order-action{border:1px solid #ddd;background:#fff;border-radius:8px;padding:7px 9px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.gz-order-action.edit{background:#111;color:#fff;border-color:#111}.gz-order-action.delete{color:#a00000}.gz-order-action.bk{background:#f5f5f5;border-color:#111}.gz-empty-orders{text-align:center;padding:30px;color:#777}
 .gz-order-modal{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:15px;background:rgba(0,0,0,.58);backdrop-filter:blur(5px)}.gz-order-modal.open{display:flex}.gz-order-editor{position:relative;width:min(1050px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:22px;padding:24px}.gz-order-close{position:absolute;right:14px;top:14px;border:0;border-radius:50%;width:38px;height:38px;background:#f0f0ed;font-size:22px;cursor:pointer}.gz-order-editor h2{margin:0 50px 4px}.gz-order-editor .muted{margin-bottom:18px}.gz-order-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.gz-order-grid label{display:grid;gap:6px;font-size:11px;font-weight:800;color:#555}.gz-order-grid input,.gz-order-grid textarea,.gz-order-grid select{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;padding:11px;background:#fff;font:inherit;color:#111}.gz-order-grid textarea{min-height:90px;resize:vertical}.gz-order-full{grid-column:1/-1}.gz-items-editor{margin-top:18px;border-top:1px solid #eee;padding-top:18px}.gz-item-edit{display:grid;grid-template-columns:minmax(260px,1.8fr) 70px 105px 105px minmax(190px,1.2fr) 36px;gap:8px;align-items:center;margin-bottom:10px;padding:10px;border:1px solid #e9e9e4;border-radius:13px;background:#fcfcfa}.gz-item-edit input{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:9px;padding:9px}.gz-item-edit button{border:0;background:#f3f3f1;border-radius:9px;height:36px;cursor:pointer}.gz-item-product{min-width:0}.gz-item-product-name input{font-weight:800}.gz-item-product small{display:block;color:#777;margin-top:5px;font-size:10px}.gz-vendor-badge{display:inline-flex;margin-top:6px;padding:4px 8px;border-radius:999px;background:#f0f5ff;border:1px solid #dbe6ff;color:#315a9b;font-size:10px;font-weight:900}.gz-item-line-total{text-align:right;font-weight:900}.gz-vendor-cell{min-width:170px}.gz-vendor-summary{display:flex;flex-direction:column;gap:2px;margin:2px 0}.gz-vendor-summary b{font-size:11px}.gz-vendor-summary span{font-size:10px;color:#666;line-height:1.35}.gz-vendor-empty{font-size:10px;color:#999}.gz-section-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}.gz-section-heading h3{margin:3px 0}.gz-section-heading p{margin:0;color:#777;font-size:11px}.gz-section-kicker{font-size:9px;font-weight:900;letter-spacing:.12em;color:#888}.gz-order-summary-card{display:grid;grid-template-columns:repeat(4,1fr) 1.2fr;gap:1px;margin-top:14px;border:1px solid #e5e5df;border-radius:14px;overflow:hidden;background:#e5e5df}.gz-order-summary-card>div{padding:12px;background:#fafaf8;display:flex;flex-direction:column;gap:5px}.gz-order-summary-card span{font-size:10px;color:#777}.gz-order-summary-card b{font-size:13px}.gz-order-summary-card .total{background:#111;color:#fff}.gz-order-summary-card .total span{color:#bbb}.gz-order-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px;flex-wrap:wrap}.gz-order-message{min-height:20px;font-size:12px;font-weight:800;margin-top:8px}.gz-order-total-preview{margin-top:10px;text-align:right;font-weight:900}.gz-item-product{display:flex;align-items:center;gap:9px;min-width:0}.gz-item-product-main{min-width:0;flex:1}.gz-item-product-media{flex:0 0 auto}.gz-item-product-thumb{width:48px;height:48px;border-radius:9px;object-fit:cover;border:1px solid #e6e6e1;background:#f5f5f2;display:block}.gz-item-product-thumb-empty{display:flex;align-items:center;justify-content:center;font-size:8px;color:#999;text-align:center}.gz-product-link{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 12px;border:1px solid #ddd;border-radius:8px;background:#fff;color:#111;font-size:11px;font-weight:800;text-decoration:none;white-space:nowrap}.gz-product-link:hover{text-decoration:underline}.gz-product-link.disabled{color:#aaa;pointer-events:none;background:#f5f5f2}.gz-shipping-breakdown{padding:12px 14px;border:1px solid #e5e5df;border-radius:12px;background:#fafaf8}.gz-shipping-title{font-size:9px;font-weight:900;letter-spacing:.1em;color:#777;margin-bottom:7px}.gz-shipping-row{display:flex;justify-content:space-between;gap:12px;padding:5px 0;font-size:11px;border-bottom:1px dashed #e5e5df}.gz-shipping-row:last-child{border-bottom:0}.gz-shipping-row b{font-size:11px}.gz-shipping-breakdown small{display:block;margin-top:7px;color:#777;font-size:10px}
 @media(max-width:760px){.gz-order-filters,.gz-order-grid{grid-template-columns:1fr}.gz-order-full{grid-column:auto}.gz-order-editor{padding:18px}.gz-item-edit{grid-template-columns:1fr 70px 95px 90px 1fr 36px}.gz-order-summary-card{grid-template-columns:1fr 1fr}.gz-order-summary-card .total{grid-column:1/-1}}
 `; document.head.appendChild(style);

 document.body.insertAdjacentHTML('beforeend',`<div id="gzOrderModal" class="gz-order-modal"><div class="gz-order-editor"><button id="gzOrderClose" class="gz-order-close">×</button><h2 id="gzOrderEditorTitle">Order</h2><div id="gzOrderEditorSub" class="muted"></div><div id="gzOrderEditorBody"></div><div id="gzOrderEditorMsg" class="gz-order-message"></div><div class="gz-order-actions"><button class="ghost" id="gzOrderCancel">Close</button><button class="ghost" id="gzOrderSendBk" disabled>Send to Business Koro</button><button class="primary" id="gzOrderSave">Save changes</button></div></div></div>`);

 $('gzOrdersRefresh').onclick=loadOrders;
 $('gzOrderSearch').oninput=renderOrders;
 $('gzOrderStatusFilter').onchange=renderOrders;
 $('gzOrderClose').onclick=closeEditor;
 $('gzOrderCancel').onclick=closeEditor;
 $('gzOrderModal').onclick=e=>{if(e.target.id==='gzOrderModal')closeEditor()};
 $('gzOrderSave').onclick=saveEditor;
 $('gzOrderSendBk').onclick=()=>current&&current.status==='Confirmed'&&sendToBusinessKoro(current.id);
}

async function loadOrders(){
 const panel=$('gzOrdersPanel');
 if(!panel)return;
 if(!sb){
   panel.innerHTML='<div class="muted">⚠ Supabase is not configured.</div>';
   return;
 }
 panel.innerHTML='<div class="muted">Loading orders…</div>';
 try{
   const sessionResult=await sb.auth.getSession();
   const session=sessionResult?.data?.session;
   if(!session){
     panel.innerHTML='<div class="muted">⚠ Admin session expired. Please log in again.</div>';
     return;
   }
   const {data,error}=await sb
     .from('orders')
     .select('id,order_no,order_number,public_tracking_id,customer_name,email,phone,division,district,upazila,address,referral_code,payment_method,shipping_charge,subtotal,total,status,admin_note,created_at,updated_at,referral_discount,discount_amount,rewards_voucher_code,rewards_voucher_discount,mystery_discount,business_koro_sent_at,tracking_number,tracking_url,tracking_provider')
     .order('created_at',{ascending:false});
   if(error){
     console.error('GrabZone orders load failed:',error);
     panel.innerHTML='<div><b>Could not load orders.</b><br><span class="muted">'+esc(error.message||'Database request failed.')+'</span><br><small>Open the browser console for details.</small></div>';
     return;
   }
   orders=Array.isArray(data)?data:[];
   await loadOrderVendorContext();
   // Recalculate every order from its product subtotal + one delivery charge per vendor.
   // vendor_orders is authoritative after routing; otherwise use the current vendor shipping settings.
   for(const order of orders){
     const sub=Number(order.subtotal||0);
     const f=orderFinancialMap.get(String(order.id));
     const ship=Number(f?.shipping??order.shipping_charge??globalShippingFee);
     const referral=Number(order.referral_discount||0), gp=Number(order.rewards_voucher_discount||0), mystery=Number(order.mystery_discount||0);
     const correctDiscount=Math.max(0,referral+gp+mystery);
     const correctTotal=Math.max(0,sub+ship-correctDiscount);
     const shippingChanged=Math.abs(Number(order.shipping_charge??0)-ship)>0.009;
     const totalChanged=Math.abs(Number(order.total||0)-correctTotal)>0.009;
     if(shippingChanged||Math.abs(Number(order.discount_amount||0)-correctDiscount)>0.009||totalChanged){
       order.shipping_charge=ship; order.discount_amount=correctDiscount; order.total=correctTotal;
       try{await sb.from('orders').update({shipping_charge:ship,discount_amount:correctDiscount,total:correctTotal,updated_at:new Date().toISOString()}).eq('id',order.id);}catch(e){console.warn('Order financial normalization:',e)}
     }
   }
   // Backfill private customer-facing tracking IDs for older orders.
   for(const order of orders){
     if(!String(order.public_tracking_id||'').trim()){
       try{await ensurePrivateTrackingId(order);}catch(e){console.error('Tracking ID backfill failed:',order.id,e);}
     }
   }
   renderOrders();
 }catch(e){
   console.error('GrabZone orders exception:',e);
   panel.innerHTML='<div><b>Could not load orders.</b><br><span class="muted">'+esc(e.message||'Unexpected error.')+'</span></div>';
 }
}

function renderOrders(){
 const panel=$('gzOrdersPanel');if(!panel)return;
 const q=($('gzOrderSearch')?.value||'').trim().toLowerCase(), st=$('gzOrderStatusFilter')?.value||'';
 const list=orders.filter(o=>(!q||`${o.order_number} ${o.public_tracking_id||''} ${o.customer_name} ${o.phone} ${o.email} ${o.referral_code||''} ${o.rewards_voucher_code||''}`.toLowerCase().includes(q))&&(!st||o.status===st));
 if(!list.length){panel.innerHTML='<div class="gz-empty-orders">No orders found.</div>';return}
 panel.innerHTML=`<div class="gz-orders-wrap"><table class="gz-orders-table"><thead><tr><th>Order / Tracking ID</th><th>Customer</th><th>Products / Vendor</th><th>Phone</th><th>Email</th><th>Referral</th><th>GrabPoints Reward</th><th>Total</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>${list.map(o=>`<tr>
 <td><button class="gz-order-link" data-order="${esc(o.id)}">${esc(o.order_number)}</button><div class="gz-public-track-id">${o.public_tracking_id?`Private Tracking ID: <b>${esc(o.public_tracking_id)}</b>`:'Private Tracking ID: generating…'}</div></td>
 <td>${esc(o.customer_name)}</td>
 <td><div class="gz-vendor-cell">${vendorSummaryHtml(o)}</div></td>
 <td>${esc(o.phone)}</td>
 <td class="gz-order-email" title="${esc(o.email)}">${esc(o.email)}</td>
 <td><div class="gz-discount-box referral"><b>Referral Code</b><span>${esc(o.referral_code||'—')}</span><small>${Number(o.referral_discount||0)>0?'Discount: -'+money(o.referral_discount):'No referral discount'}</small></div></td>
 <td><div class="gz-discount-box grabpoints"><b>GrabPoints Code</b><span>${esc(o.rewards_voucher_code||'—')}</span><small>${Number(o.rewards_voucher_discount||0)>0?'Discount: -'+money(o.rewards_voucher_discount):'No GrabPoints discount'}</small></div></td>
 <td><b>${money(Math.max(0,Number(o.subtotal||0)+Number(o.shipping_charge??0)-Number(o.referral_discount||0)-Number(o.rewards_voucher_discount||0)-Number(o.mystery_discount||0)))}</b></td>
 <td><select class="gz-status-select" data-status-order="${esc(o.id)}" aria-label="Change order status">${statuses.map(s=>`<option value="${esc(s)}" ${s===o.status?'selected':''}>${esc(s)}</option>`).join('')}</select></td>
 <td>${o.created_at?formatBdDateTime(o.created_at):'—'}</td>
 <td><div class="gz-order-actions-cell"><button class="gz-order-action edit" data-edit-order="${esc(o.id)}">Edit</button><button class="gz-order-action" data-send-bk="${esc(o.id)}" ${o.status!=='Confirmed'||o.business_koro_sent_at?'disabled':''}>${o.business_koro_sent_at?'Sent ✓':o.status==='Confirmed'?'Send to Business Koro':'Confirm order first'}</button><button class="gz-order-action delete" data-delete-order="${esc(o.id)}">Delete</button></div></td>
 </tr>`).join('')}</tbody></table></div>`;
 panel.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>openEditor(b.dataset.order));
 panel.querySelectorAll('[data-edit-order]').forEach(b=>b.onclick=()=>openEditor(b.dataset.editOrder));
 panel.querySelectorAll('[data-delete-order]').forEach(b=>b.onclick=()=>deleteOrder(b.dataset.deleteOrder));
 panel.querySelectorAll('[data-send-bk]:not([disabled])').forEach(b=>b.onclick=()=>sendToBusinessKoro(b.dataset.sendBk));
 panel.querySelectorAll('[data-status-order]').forEach(s=>s.onchange=()=>changeStatus(s.dataset.statusOrder,s.value));
}

async function syncOrderToSheet(orderId){
 try{
  const response=await (window.gzAuthFetch||fetch)((C.backendUrl||'')+'/api/sync-order-sheet',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(window.getToken?window.getToken():'')},credentials:'include',body:JSON.stringify({orderId})});
  if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||'Google Sheets sync failed.');
  return true;
 }catch(e){console.warn('Google Sheets sync:',e);return false}
}

async function sendOrderEmail(orderNumber,type='status_updated',statusOverride=''){
 try{
  const session=await sb.auth.getSession(), token=session?.data?.session?.access_token;
  const headers={'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  const payload=JSON.stringify({orderNumber,type,status:statusOverride||orders.find(x=>x.order_number===orderNumber)?.status||''});
  const base=String(C.backendUrl||'').replace(/\/$/,'');
  let response=await (window.gzAuthFetch||fetch)(base+'/api/send-order-email',{method:'POST',headers,body:payload});
  // Compatibility fallback for older Worker deployments that exposed the route without /api.
  if(response.status===404)response=await (window.gzAuthFetch||fetch)(base+'/send-order-email',{method:'POST',headers,body:payload});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Receipt email could not be sent.');
  return true;
 }catch(e){console.error('Order email:',e);return false}
}
async function confirmOrder(order){
 const subtotal=Number(order.subtotal||0);
 const referralDiscount=Number(order.referral_discount||0);
 const voucherDiscount=Number(order.rewards_voucher_discount||0);
 const mysteryDiscount=Number(order.mystery_discount||0);
 const discount=Number(order.discount_amount||referralDiscount+voucherDiscount+mysteryDiscount);
 const confirmedShipping=Number(order.shipping_charge??130);
 const updates={status:'Confirmed',shipping_charge:confirmedShipping,discount_amount:discount,total:Math.max(0,subtotal+confirmedShipping-discount),updated_at:new Date().toISOString()};

 const {error}=await sb.from('orders').update(updates).eq('id',order.id);
 if(error)throw error;
 Object.assign(order,updates);
 const emailed=await sendOrderEmail(order.order_number,'status_updated','Confirmed');
 await syncOrderToSheet(order.id);
 renderOrders();
 return emailed;
}
async function changeStatus(id,status){
 const order=orders.find(x=>x.id===id); if(!order||order.status===status)return;
 if(status==='Confirmed'){
  const confirmedShipping=Number(order.shipping_charge??130);
  const label='৳'+confirmedShipping.toLocaleString('en-BD');
  if(!(await gzUiConfirm('Confirm '+order.order_number+'? Delivery charge will be '+label+'. The customer receipt/status email will be sent.')))return;
  try{
   const emailed=await confirmOrder(order);
   document.dispatchEvent(new CustomEvent('grabzone:orders-updated'));
   gzUiToast(emailed?'✓ Order confirmed with the correct delivery charge and the customer email was sent.':'✓ Order confirmed and saved. Email could not be sent; check email settings.');
  }catch(e){gzUiToast('Could not confirm order: '+e.message,'error')}
  return;
 }
 const {error}=await sb.from('orders').update({status,updated_at:new Date().toISOString()}).eq('id',id);
 if(error){gzUiToast('Could not update status: '+error.message,'error');renderOrders();return}
 order.status=status;
 const emailed=await sendOrderEmail(order.order_number,'status_updated',status);
 await syncOrderToSheet(order.id);
 renderOrders();
 document.dispatchEvent(new CustomEvent('grabzone:orders-updated'));
 gzUiToast(emailed
   ? '✓ Status updated and customer email sent.'
   : '✓ Status updated, but the customer email could not be sent. Check email settings.', emailed?'success':'error');
}

async function sendToBusinessKoro(id,force=false){
 const order=orders.find(x=>x.id===id);if(!order)return;
 const button=[...document.querySelectorAll('[data-send-bk]')].find(x=>x.dataset.sendBk===id);
 if(!force&&!(await gzUiConfirm('Send '+order.order_number+' to Business Koro now? This will submit the order for fulfillment.')))return;
 if(button){button.disabled=true;button.textContent='Sending…';}
 try{
  const sessionResult=await sb.auth.getSession();
  const token=sessionResult?.data?.session?.access_token;
  if(!token)throw new Error('Your admin session has expired. Please log in again.');
  const {data:items,error:itemError}=await sb.from('order_items').select('*').eq('order_id',id).order('id');
  if(itemError)throw itemError;
  if(!items?.length)throw new Error('This order has no products.');
  const response=await (window.gzAuthFetch||fetch)((C.backendUrl||'')+'/api/business-koro-order',{
   method:'POST',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
   body:JSON.stringify({
    orderId:id,
    orderNumber:order.order_number,
    force,
    customer:{name:order.customer_name,phone:order.phone,address:order.address,division:order.division,district:order.district,area:order.upazila,note:order.admin_note||''},
    items:items.map(it=>({productId:it.business_koro_product_id||null,product_id:it.product_id||null,productName:it.product_name,quantity:Number(it.quantity||1),sellingPrice:Number(it.unit_price||0)}))
   })
  });
  const data=await response.json().catch(()=>({}));
  if(response.status===409&&!force){
   if(await gzUiConfirm((data.error||'This order was already submitted.')+'\\n\\nSend it again anyway?'))return sendToBusinessKoro(id,true);
   return;
  }
  if(!response.ok)throw new Error(data.error||'Business Koro submission failed.');
  const ids=(data.orders||[]).map(x=>x.supplierOrderId).filter(Boolean);
  const updates={business_koro_sent_at:new Date().toISOString(),business_koro_order_ids:ids};
  const {error:updateError}=await sb.from('orders').update(updates).eq('id',id);
  if(updateError)console.warn('Business Koro status save:',updateError);
  gzUiToast('✓ '+order.order_number+' sent to Business Koro. '+(data.submitted||0)+' supplier order(s) created.');
  await loadOrders();
 }catch(e){
  gzUiToast('Business Koro: '+e.message,'error');
 }finally{
  if(button){button.disabled=false;button.textContent='Send to Business Koro';}
 }
}
async function deleteOrder(id){
 const order=orders.find(x=>x.id===id); if(!order)return;
 const ok=await gzUiConfirm(`Delete order ${order.order_number}? This will permanently remove the order and its products from the admin panel.`);
 if(!ok)return;
 const {error}=await sb.from('orders').delete().eq('id',id);
 if(error){gzUiToast('Could not delete order: '+error.message,'error');return}
 orders=orders.filter(x=>x.id!==id);
 await syncOrderToSheet(id);
 renderOrders();
 document.dispatchEvent(new CustomEvent('grabzone:orders-updated'));
}

async function openEditor(id){
 const base=orders.find(x=>x.id===id);if(!base)return;
 const {data:items,error}=await sb.from('order_items').select('*').eq('order_id',id).order('id');
 if(error){gzUiToast(error.message,'error');return}
 const enrichedItems=Array.isArray(items)?items.map(x=>{const item={...x};if(typeof item.variation_options==='string'){try{item.variation_options=JSON.parse(item.variation_options||'{}')}catch{item.variation_options={}}}if(!item.variation_options||typeof item.variation_options!=='object'||Array.isArray(item.variation_options))item.variation_options={};return item}):[];
 const pids=[...new Set(enrichedItems.map(x=>String(x.product_id||'').trim()).filter(Boolean))];
 if(pids.length){
   const pr=await sb.from('products').select('id,vendor_id').in('id',pids);
   if(!pr.error)for(const p of (Array.isArray(pr.data)?pr.data:[]))productVendorMap.set(String(p.id),String(p.vendor_id||''));
 }
 const vids=[...new Set(enrichedItems.map(x=>String(x.vendor_id||productVendorMap.get(String(x.product_id||''))||'').trim()).filter(Boolean))];
 if(vids.length){
   const vr=await sb.from('vendors').select('id,brand_name,business_name,slug').in('id',vids);
   if(!vr.error)for(const v of (Array.isArray(vr.data)?vr.data:[]))vendorNameMap.set(String(v.id),String(v.brand_name||v.business_name||v.slug||'Vendor'));
 }
 for(const item of enrichedItems){
   item.vendor_id=String(itemVendorIdMap.get(String(item.id||''))||item.vendor_id||productVendorMap.get(String(item.product_id||''))||'');
   item.vendor_name=vendorNameMap.get(item.vendor_id)||'Vendor';
 }
 const financial=orderFinancialMap.get(String(id));
 const routedRes=await sb.from('vendor_orders').select('id,order_id,vendor_id,shipping_fee,delivery_charge').eq('order_id',id);
 const routedForOrder=(!routedRes.error&&Array.isArray(routedRes.data))?routedRes.data:[];
 const voIds=routedForOrder.map(x=>String(x.id||'')).filter(Boolean);
 let shipmentRows=[];
 if(voIds.length){
   const sh=await sb.from('shipments').select('*').eq('order_id',id).order('created_at',{ascending:false});
   const shipments=(!sh.error&&Array.isArray(sh.data))?sh.data:[];
   const voi=await sb.from('vendor_order_items').select('vendor_order_id,order_item_id').in('vendor_order_id',voIds);
   const maps=(!voi.error&&Array.isArray(voi.data))?voi.data:[];
   const itemNameMap=new Map(enrichedItems.map(x=>[String(x.id),String(x.product_name||'Product')]));
   const vendorMap=new Map(routedForOrder.map(x=>[String(x.vendor_id),vendorNameMap.get(String(x.vendor_id))||'Vendor']));
   const productsByVo=new Map();
   for(const x of maps){const a=productsByVo.get(String(x.vendor_order_id))||[];const n=itemNameMap.get(String(x.order_item_id));if(n&&!a.includes(n))a.push(n);productsByVo.set(String(x.vendor_order_id),a)}
   const voVendor=new Map(routedForOrder.map(x=>[String(x.id),String(x.vendor_id||'')]));
   shipmentRows=shipments.map(s=>{const voKey=String(s.vendor_order_id||'');const vid=String(s.vendor_id||voVendor.get(voKey)||'');return {...s,vendor_id:vid,vendor_name:vendorMap.get(vid)||'Vendor',product_names:productsByVo.get(voKey)||[]};});
 }
 current={...base,items:enrichedItems,shipments:shipmentRows,shipping_charge:Number(financial?.shipping??base.shipping_charge??globalShippingFee)};
 current.total=Math.max(0,Number(current.subtotal||0)+Number(current.shipping_charge||0)-Number(current.referral_discount||0)-Number(current.rewards_voucher_discount||0)-Number(current.mystery_discount||0));
 $('gzOrderEditorTitle').textContent=current.order_number;
 $('gzOrderSendBk').disabled=current.status!=='Confirmed'||!!current.business_koro_sent_at;
 $('gzOrderEditorSub').textContent=`Placed ${current.created_at?formatBdDateTime(current.created_at):'—'} · Last updated ${current.updated_at?formatBdDateTime(current.updated_at):'—'}`;
 $('gzOrderEditorBody').innerHTML=`
 <div class="gz-order-grid">
 <label>Internal Order Number<input value="${esc(current.order_number)}" readonly></label><label>Private Tracking ID<input value="${esc(current.public_tracking_id||'')}" readonly></label>
 <label>Customer Name<input id="oeName" value="${esc(current.customer_name)}"></label><label>Mobile Number<input id="oePhone" value="${esc(current.phone)}"></label>
 <label>Email Address<input id="oeEmail" type="email" value="${esc(current.email)}"></label><label>Status<select id="oeStatus">${statuses.map(s=>`<option ${s===current.status?'selected':''}>${s}</option>`).join('')}</select></label>
 <label>Division<input id="oeDivision" value="${esc(current.division)}"></label><label>District<input id="oeDistrict" value="${esc(current.district)}"></label>
 <label>Thana<input id="oeUpazila" value="${esc(current.upazila||'')}"></label><label>Referral Code<input id="oeReferral" value="${esc(current.referral_code||'')}"></label>
 <label class="gz-order-full">Street Address<textarea id="oeAddress">${esc(current.address)}</textarea></label><div class="gz-order-full" style="padding:13px 14px;border:1px solid #e4e4df;border-radius:12px;background:#fafaf8"><div style="font-size:10px;font-weight:900;letter-spacing:.08em;color:#777">CUSTOMER ORDER HISTORY</div><div style="margin-top:6px;font-size:12px;font-weight:800">${orders.filter(x=>String(x.phone||'').replace(/\D/g,'')===String(current.phone||'').replace(/\D/g,'')).length} order(s) linked to this phone number</div><div style="margin-top:7px;color:#666;font-size:11px;line-height:1.8">${orders.filter(x=>String(x.phone||'').replace(/\D/g,'')===String(current.phone||'').replace(/\D/g,'')).slice(0,8).map(x=>{const total=Number(x.total||0);return esc(x.order_number)+' · '+esc(x.status)+' · '+money(total)}).join('<br>')||'No other orders found.'}</div></div>
 <label>Payment Method<input id="oePayment" value="${esc(current.payment_method||'Cash on Delivery')}"></label><label>Shipping Charge<input id="oeShipping" type="number" step="1" min="0" value="${Number(current.shipping_charge??0)}" readonly></label>
 <div class="gz-order-full gz-shipping-breakdown"><div class="gz-shipping-title">DELIVERY CHARGE BY FULFILLMENT SOURCE</div><div id="oeShippingBreakdown"></div><small>Each vendor is charged separately. The order shipping total is the sum of these delivery charges.</small></div>
 <div class="gz-order-full" style="padding:14px;border:1px solid #e4e4df;border-radius:12px;background:#fff"><div style="font-size:10px;font-weight:900;letter-spacing:.08em;color:#777">SHIPMENT TRACKING</div><div id="oeShipmentTracking" style="margin-top:9px"></div></div>
 <label>Referral Discount<input id="oeDiscount" type="number" step="0.01" min="0" value="${Number(current.referral_discount||0)}"></label>
 <label>GrabPoints Discount<input id="oeGpDiscount" type="number" step="0.01" min="0" value="${Number(current.rewards_voucher_discount||0)}" readonly></label>
 <div class="gz-order-full" style="font-size:12px;color:#666;padding:10px 12px;background:#f7f7f5;border-radius:10px">Final discount = Referral Discount + GrabPoints Discount${Number(current.mystery_discount||0)>0?' + Mystery Deal':''}. Total is recalculated automatically.</div>
 <label class="gz-order-full">Admin Note<textarea id="oeNote">${esc(String(current.admin_note||'').split(TRACK_MARKER)[0].trim())}</textarea></label><label>Courier / Tracking Provider<input id="oeTrackingCourier" value="${esc(trackingFor(current).courier)}" placeholder="e.g. Steadfast"></label><label>Tracking Number<input id="oeTrackingNumber" value="${esc(trackingFor(current).number)}" placeholder="Courier tracking number"></label><label class="gz-order-full">Tracking URL<input id="oeTrackingUrl" type="url" value="${esc(trackingFor(current).url)}" placeholder="https://courier-tracking-link..."></label></div>
 <div class="gz-items-editor">
 <div class="gz-section-heading"><div><span class="gz-section-kicker">ORDER CONTENTS</span><h3>Products in this order</h3><p>Each item shows its assigned vendor so fulfillment is clear.</p></div></div>
 <div id="oeItems">${current.items.map((it,i)=>itemRow(it,i)).join('')}</div>
 <button type="button" class="ghost" id="oeAddItem">＋ Add item</button>
 <div class="gz-order-summary-card"><div><span>Subtotal</span><b id="oeSubtotal">৳0</b></div><div><span>Shipping charge</span><b id="oeShippingSummary">৳0</b></div><div><span>Referral discount</span><b id="oeReferralSummary">-৳0</b></div><div><span>GrabPoints discount</span><b id="oeGpSummary">-৳0</b></div><div class="total"><span>Total</span><b id="oeTotalSummary">৳0</b></div></div>
 <div id="oePreview" class="gz-order-total-preview"></div></div>`;
 const renderShippingBreakdown=()=>{
   const box=$('oeShippingBreakdown'); if(!box)return;
   const f=orderFinancialMap.get(String(current.id)),rows=f?.breakdown||[];
   box.innerHTML=rows.length?rows.map(x=>'<div class="gz-shipping-row"><span><strong>'+esc(x.vendor_name||'Vendor')+'</strong>'+(x.product_names&&x.product_names.length?'<small style="display:block;color:#777;margin-top:3px">'+esc(x.product_names.join(' · '))+'</small>':'')+'</span><b>'+money(x.shipping)+'</b></div>').join(''):'<div class="gz-shipping-row"><span>Delivery charge</span><b>'+money(current.shipping_charge||0)+'</b></div>';
 };
 $('oeAddItem').onclick=()=>{current.items.push({id:null,product_id:null,product_name:'',image_url:'',quantity:1,unit_price:0});renderItemEditor();updatePreview()};
 renderShippingBreakdown();
 const renderShipmentTracking=()=>{
   const box=$('oeShipmentTracking'); if(!box)return;
   const rows=current.shipments||[];
   box.innerHTML=rows.length?rows.map(s=>'<div style="padding:11px 0;border-top:1px solid #eee"><div style="font-size:12px;font-weight:900;color:#111">'+esc(s.vendor_name||'Vendor')+'</div><div style="font-size:12px;color:#555;margin-top:3px"><b>Product:</b> '+esc((s.product_names||[]).join(' · ')||'Product')+'</div><div style="margin-top:6px;font-size:12px;color:#666"><b>Shipment:</b> '+esc(s.status||'Processing')+' · '+esc(s.courier_name||s.courier||'Courier pending')+(s.courier_tracking_number||s.tracking_id||s.shipment_tracking_id?' · '+esc(s.courier_tracking_number||s.tracking_id||s.shipment_tracking_id):'')+'</div>'+(s.courier_tracking_url||s.tracking_url?'<a href="'+esc(s.courier_tracking_url||s.tracking_url)+'" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;font-size:12px;font-weight:800;color:#111">Track Package →</a>':'')+'</div>').join(''):'<div style="color:#777;font-size:12px">No shipments added yet.</div>';
 };
 renderShipmentTracking();
 current.items.forEach((_,i)=>bindItemRow(i)); updatePreview(); $('oeShipping').oninput=updatePreview;
 $('gzOrderEditorMsg').textContent=''; $('gzOrderModal').classList.add('open');document.body.style.overflow='hidden';
}

function itemRow(it,i){var vo=it.variation_options&&typeof it.variation_options==='object'?Object.entries(it.variation_options).map(([k,v])=>k+': '+v).join(' · '):'';var vendor=it.vendor_name||'GrabZone (Platform)';var variationText=vo||it.variation_id?'Variation: '+(vo||'Selected'):'No variation';var productLink=it.product_id?'product.html?id='+encodeURIComponent(it.product_id):'';return`<div class="gz-item-edit" data-item-index="${i}">
 <div class="gz-item-product"><div class="gz-item-product-media">${it.image_url?'<img class="gz-item-product-thumb" src="'+esc(it.image_url)+'" alt="'+esc(it.product_name||'Product')+'" loading="lazy">':'<div class="gz-item-product-thumb gz-item-product-thumb-empty">No image</div>'}</div><div class="gz-item-product-main"><div class="gz-item-product-name"><input class="it-name" placeholder="Product name" value="${esc(it.product_name)}"></div><span class="gz-vendor-badge">🏪 ${esc(vendor)}</span><small>${esc(variationText)}${it.variation_sku||it.sku?' · SKU: '+esc(it.variation_sku||it.sku):''}</small></div></div>
 <input class="it-qty" type="number" min="1" value="${Math.max(1,Number(it.quantity||1))}">
 <input class="it-price" type="number" step="1" min="0" value="${Number(it.unit_price||0)}">
 <div class="gz-item-line-total">${money(Number(it.quantity||1)*Number(it.unit_price||0))}</div>
 <div class="gz-item-product-link-wrap"><input type="hidden" class="it-image" value="${esc(it.image_url||'')}">${productLink?'<a class="gz-product-link" href="'+esc(productLink)+'" target="_blank" rel="noopener">Product Link</a>':'<span class="gz-product-link disabled">Product Link</span>'}</div>
 <button type="button" class="it-remove" aria-label="Remove item">×</button></div>`}
function bindItemRow(i){const row=document.querySelector(`.gz-item-edit[data-item-index="${i}"]`);if(!row)return;const sync=()=>{current.items[i].product_name=row.querySelector('.it-name').value.trim();current.items[i].quantity=Math.max(1,Number(row.querySelector('.it-qty').value||1));current.items[i].unit_price=Math.max(0,Number(row.querySelector('.it-price').value||0));current.items[i].image_url=row.querySelector('.it-image').value.trim();updatePreview()};row.querySelectorAll('input').forEach(x=>x.oninput=sync);row.querySelector('.it-remove').onclick=()=>{current.items.splice(i,1);renderItemEditor();updatePreview()}}
function renderItemEditor(){const box=$('oeItems');box.innerHTML=current.items.map((it,i)=>itemRow(it,i)).join('');current.items.forEach((_,i)=>bindItemRow(i))}
function updatePreview(){const sub=current.items.reduce((s,it)=>s+Number(it.quantity||0)*Number(it.unit_price||0),0),ship=Number($('oeShipping')?.value||(current.shipping_charge??0)),ref=Number($('oeDiscount')?.value||current.referral_discount||0),gp=Number(current.rewards_voucher_discount||0),myst=Number(current.mystery_discount||0),disc=Math.max(0,ref+gp+myst),total=Math.max(0,sub+ship-disc);$('oeSubtotal')&&($('oeSubtotal').textContent=money(sub));$('oeShippingSummary')&&($('oeShippingSummary').textContent=money(ship));$('oeReferralSummary')&&($('oeReferralSummary').textContent='-'+money(ref));$('oeGpSummary')&&($('oeGpSummary').textContent='-'+money(gp));$('oeTotalSummary')&&($('oeTotalSummary').textContent=money(total));$('oePreview').textContent=`Subtotal: ${money(sub)} · Shipping: ${money(ship)} · Referral: -${money(ref)} · GrabPoints: -${money(gp)} · Total: ${money(total)}`;document.querySelectorAll('.gz-item-line-total').forEach((el,i)=>{const it=current.items[i];if(it)el.textContent=money(Number(it.quantity||1)*Number(it.unit_price||0))})}
function closeEditor(){$('gzOrderModal')?.classList.remove('open');document.body.style.overflow='';current=null}

async function saveEditor(){
 if(!current)return;
 const payload={
  customer_name:$('oeName').value.trim(),phone:$('oePhone').value.trim(),email:$('oeEmail').value.trim(),
  division:$('oeDivision').value.trim(),district:$('oeDistrict').value.trim(),upazila:$('oeUpazila').value.trim(),
  address:$('oeAddress').value.trim(),referral_code:$('oeReferral').value.trim()||null,
  payment_method:$('oePayment').value.trim()||'Cash on Delivery',shipping_charge:Number($('oeShipping').value||current.shipping_charge||130),referral_discount:Math.max(0,Number($('oeDiscount').value||0)),
  status:$('oeStatus').value,
  admin_note:saveTrackingNote($('oeNote').value.trim()),
  tracking_provider:$('oeTrackingCourier').value.trim()||null,
  tracking_number:$('oeTrackingNumber').value.trim()||null,
  tracking_url:$('oeTrackingUrl').value.trim()||null
 };
 const items=[...document.querySelectorAll('.gz-item-edit')].map((row,i)=>{
  const source=current.items[i]||{};
  return {
   product_id:source.product_id||null,product_name:row.querySelector('.it-name').value.trim(),
   quantity:Math.max(1,Number(row.querySelector('.it-qty').value||1)),unit_price:Math.max(0,Number(row.querySelector('.it-price').value||0)),
   image_url:row.querySelector('.it-image').value.trim(),vendor_id:source.vendor_id||null,
   variation_id:source.variation_id||null,variation_options:source.variation_options||{},variation_sku:source.variation_sku||source.sku||null,sku:source.sku||source.variation_sku||null
  }
 }).filter(x=>x.product_name);
 if(!payload.customer_name||!payload.phone||!payload.email||!payload.division||!payload.district||!payload.address){$('gzOrderEditorMsg').textContent='⚠ Please complete the required customer fields.';return}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)){$('gzOrderEditorMsg').textContent='⚠ Please enter a valid email address.';return}
 if(!/^01[3-9]\d{8}$/.test(payload.phone.replace(/\D/g,''))){$('gzOrderEditorMsg').textContent='⚠ Mobile number must be a valid 11-digit Bangladesh number (01XXXXXXXXX).';return}
 if(!items.length){$('gzOrderEditorMsg').textContent='⚠ Add at least one product.';return}
 payload.phone=payload.phone.replace(/\D/g,'');
 payload.subtotal=items.reduce((s,it)=>s+it.quantity*it.unit_price,0);
 const financial=orderFinancialMap.get(String(current.id));
 payload.shipping_charge=Number(financial?.shipping??$('oeShipping').value??current.shipping_charge??globalShippingFee);
  const preservedVoucherDiscount=Number(current.rewards_voucher_discount||0),preservedMysteryDiscount=Number(current.mystery_discount||0);
  payload.discount_amount=Math.max(0,payload.referral_discount+preservedVoucherDiscount+preservedMysteryDiscount);
  payload.total=Math.max(0,payload.subtotal+payload.shipping_charge-payload.discount_amount);payload.updated_at=new Date().toISOString();
 $('gzOrderSave').disabled=true;
 try{
  const {error:e1}=await sb.from('orders').update(payload).eq('id',current.id);if(e1)throw e1;
  const {error:e2}=await sb.from('order_items').delete().eq('order_id',current.id);if(e2)throw e2;
  const {error:e3}=await sb.from('order_items').insert(items.map(it=>({...it,order_id:current.id,line_total:it.quantity*it.unit_price})));if(e3)throw e3;
  let statusEmailSent=true;
  if(payload.status!==current.status){
    statusEmailSent=await sendOrderEmail(current.order_number,'status_updated',payload.status);
  }
  await syncOrderToSheet(current.id);
  $('gzOrderEditorMsg').textContent=statusEmailSent
    ?'✓ Order updated successfully. Delivery charges and total were recalculated.'
    :'✓ Order updated, but the customer email could not be sent. Delivery charges and total were recalculated.';
  await loadOrders();
  document.dispatchEvent(new CustomEvent('grabzone:orders-updated'));
  setTimeout(closeEditor,500);
 }catch(e){$('gzOrderEditorMsg').textContent='⚠ '+e.message}finally{$('gzOrderSave').disabled=false}
}

document.addEventListener('DOMContentLoaded',()=>{inject();setTimeout(()=>{if($('tab-orders')?.classList.contains('active'))loadOrders()},0)});
window.gzLoadOrders=loadOrders;
document.addEventListener('click',e=>{const b=e.target.closest('.side-link[data-tab="orders"]');if(b)setTimeout(loadOrders,0)});
})();