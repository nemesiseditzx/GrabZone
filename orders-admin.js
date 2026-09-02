(() => {
'use strict';
const C=window.GRABZONE_CONFIG||{};
const sb=window.grabzoneD1||null;
const currency=C.currency||'৳';
let orders=[], current=null;
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
 .gz-orders-wrap{overflow:auto}.gz-orders-table{width:100%;border-collapse:collapse;min-width:1120px}.gz-orders-table th,.gz-orders-table td{padding:12px 9px;border-bottom:1px solid #eee;text-align:left;font-size:12px;vertical-align:middle}.gz-orders-table th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#777}.gz-order-link{border:0;background:none;padding:0;font:inherit;font-weight:900;cursor:pointer}.gz-public-track-id{margin-top:4px;font-size:9px;color:#666;letter-spacing:.04em;word-break:break-all}.gz-order-email,.gz-order-ref{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gz-status-select{border:1px solid #ddd;border-radius:999px;padding:6px 9px;background:#fff;font:inherit;font-size:10px;font-weight:800;cursor:pointer}.gz-order-actions-cell{display:flex;gap:6px;white-space:nowrap}.gz-order-action{border:1px solid #ddd;background:#fff;border-radius:8px;padding:7px 9px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.gz-order-action.edit{background:#111;color:#fff;border-color:#111}.gz-order-action.delete{color:#a00000}.gz-order-action.bk{background:#f5f5f5;border-color:#111}.gz-empty-orders{text-align:center;padding:30px;color:#777}
 .gz-order-modal{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:15px;background:rgba(0,0,0,.58);backdrop-filter:blur(5px)}.gz-order-modal.open{display:flex}.gz-order-editor{position:relative;width:min(1050px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:22px;padding:24px}.gz-order-close{position:absolute;right:14px;top:14px;border:0;border-radius:50%;width:38px;height:38px;background:#f0f0ed;font-size:22px;cursor:pointer}.gz-order-editor h2{margin:0 50px 4px}.gz-order-editor .muted{margin-bottom:18px}.gz-order-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.gz-order-grid label{display:grid;gap:6px;font-size:11px;font-weight:800;color:#555}.gz-order-grid input,.gz-order-grid textarea,.gz-order-grid select{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;padding:11px;background:#fff;font:inherit;color:#111}.gz-order-grid textarea{min-height:90px;resize:vertical}.gz-order-full{grid-column:1/-1}.gz-items-editor{margin-top:18px;border-top:1px solid #eee;padding-top:18px}.gz-item-edit{display:grid;grid-template-columns:1.4fr 80px 120px 1.2fr 36px;gap:8px;align-items:center;margin-bottom:8px}.gz-item-edit input{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:9px;padding:9px}.gz-item-edit button{border:0;background:#f3f3f1;border-radius:9px;height:36px;cursor:pointer}.gz-order-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px;flex-wrap:wrap}.gz-order-message{min-height:20px;font-size:12px;font-weight:800;margin-top:8px}.gz-order-total-preview{margin-top:10px;text-align:right;font-weight:900}
 @media(max-width:760px){.gz-order-filters,.gz-order-grid{grid-template-columns:1fr}.gz-order-full{grid-column:auto}.gz-order-editor{padding:18px}.gz-item-edit{grid-template-columns:1fr 65px 95px 1fr 36px}}
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
     .select('id,order_no,order_number,public_tracking_id,customer_name,email,phone,division,district,upazila,address,referral_code,payment_method,shipping_charge,subtotal,total,status,admin_note,created_at,updated_at,referral_discount,business_koro_sent_at,tracking_number,tracking_url,tracking_provider')
     .order('created_at',{ascending:false});
   if(error){
     console.error('GrabZone orders load failed:',error);
     panel.innerHTML='<div><b>Could not load orders.</b><br><span class="muted">'+esc(error.message||'Database request failed.')+'</span><br><small>Open the browser console for details.</small></div>';
     return;
   }
   orders=Array.isArray(data)?data:[];
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
 const list=orders.filter(o=>(!q||`${o.order_number} ${o.public_tracking_id||''} ${o.customer_name} ${o.phone} ${o.email} ${o.referral_code||''}`.toLowerCase().includes(q))&&(!st||o.status===st));
 if(!list.length){panel.innerHTML='<div class="gz-empty-orders">No orders found.</div>';return}
 panel.innerHTML=`<div class="gz-orders-wrap"><table class="gz-orders-table"><thead><tr><th>Order / Tracking ID</th><th>Customer</th><th>Phone</th><th>Email</th><th>Referral</th><th>Discount</th><th>Total</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>${list.map(o=>`<tr>
 <td><button class="gz-order-link" data-order="${esc(o.id)}">${esc(o.order_number)}</button><div class="gz-public-track-id">${o.public_tracking_id?`Private Tracking ID: <b>${esc(o.public_tracking_id)}</b>`:'Private Tracking ID: generating…'}</div></td>
 <td>${esc(o.customer_name)}</td>
 <td>${esc(o.phone)}</td>
 <td class="gz-order-email" title="${esc(o.email)}">${esc(o.email)}</td>
 <td class="gz-order-ref" title="${esc(o.referral_code||'—')}">${esc(o.referral_code||'—')}</td>
 <td>${o.referral_discount?'-'+money(o.referral_discount):'—'}</td>
 <td><b>${money(o.total)}</b></td>
 <td><select class="gz-status-select" data-status-order="${esc(o.id)}" aria-label="Change order status">${statuses.map(s=>`<option value="${esc(s)}" ${s===o.status?'selected':''}>${esc(s)}</option>`).join('')}</select></td>
 <td>${o.created_at?formatBdDateTime(o.created_at):'—'}</td>
 <td><div class="gz-order-actions-cell"><button class="gz-order-action edit" data-edit-order="${esc(o.id)}">Edit</button><button class="gz-order-action" data-send-bk="${esc(o.id)}" ${o.status!=='Confirmed'||o.business_koro_sent_at?'disabled':''}>${o.business_koro_sent_at?'Sent ✓':o.status==='Confirmed'?'Send to Business Koro':'Confirm order first'}</button><button class="gz-order-action delete" data-delete-order="${esc(o.id)}">Delete</button></div></td>
 </tr>`).join('')}</tbody></table></div>`;
 panel.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>openEditor(b.dataset.order));
 panel.querySelectorAll('[data-edit-order]').forEach(b=>b.onclick=()=>openEditor(b.dataset.editOrder));
 panel.querySelectorAll('[data-delete-order]').forEach(b=>b.onclick=()=>deleteOrder(b.dataset.deleteOrder));
 panel.querySelectorAll('[data-bk-order]').forEach(b=>b.onclick=()=>sendToBusinessKoro(b.dataset.bkOrder));
 panel.querySelectorAll('[data-bk-order]').forEach(b=>b.onclick=()=>sendToBusinessKoro(b.dataset.bkOrder));
 panel.querySelectorAll('[data-send-bk]:not([disabled])').forEach(b=>b.onclick=()=>sendToBusinessKoro(b.dataset.sendBk));
 panel.querySelectorAll('[data-status-order]').forEach(s=>s.onchange=()=>changeStatus(s.dataset.statusOrder,s.value));
}

async function sendToBusinessKoro(id){
 const order=orders.find(x=>x.id===id); if(!order)return;
 const {data:items,error}=await sb.from('order_items').select('*').eq('order_id',id).order('id');
 if(error){gzUiToast(error.message,'error');return}
 if(!items?.length){gzUiToast('This order has no products.','error');return}
 const productIds=[...new Set(items.map(x=>x.product_id).filter(Boolean))];
 const {data:productRows}=productIds.length
   ?await sb.from('products').select('id,business_koro_product_id').in('id',productIds)
   :{data:[]};
 const bkMap=new Map((productRows||[]).map(p=>[p.id,p.business_koro_product_id]));
 const button=[...document.querySelectorAll('[data-bk-order]')].find(x=>x.dataset.bkOrder===id);
 if(button){button.disabled=true;button.textContent='Sending…'}
 try{
  const response=await fetch((C.backendUrl||'')+'/api/business-koro-order',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({
    orderId:order.id,
    orderNumber:order.order_number,
    customer:{
     name:order.customer_name,
     phone:order.phone,
     address:order.address,
     division:order.division,
     district:order.district,
     area:order.upazila,
     note:order.admin_note||''
    },
    items:items.map(it=>({
     productId:bkMap.get(it.product_id)||null,
     productName:it.product_name,
     quantity:Number(it.quantity||1),
     sellingPrice:Number(it.unit_price||0)
    }))
   })
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Business Koro submission failed.');
  gzUiToast('✓ Order '+order.order_number+' was sent to Business Koro.');
  await loadOrders();
 }catch(e){
  gzUiToast('⚠ '+e.message,'error');
 }finally{
  if(button){button.disabled=false;button.textContent='Send to Business Koro'}
 }
}

async function sendToBusinessKoro(id){
 const order=orders.find(x=>x.id===id);if(!order)return;
 if(!(await gzUiConfirm('Send '+order.order_number+' to Business Koro now?')))return;
 const button=document.querySelector('[data-bk-order="'+CSS.escape(id)+'"]');
 if(button){button.disabled=true;button.textContent='Sending…'}
 try{
  const{data:items,error}=await sb.from('order_items').select('*').eq('order_id',id).order('id');
  if(error)throw error;if(!items?.length)throw new Error('This order has no products.');
  const response=await fetch((C.backendUrl||'')+'/api/business-koro-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:order.id,orderNumber:order.order_number,customer:{name:order.customer_name,phone:order.phone,address:order.address,division:order.division,district:order.district,area:order.upazila,note:order.admin_note||''},items:items.map(it=>({productId:it.business_koro_product_id||null,productName:it.product_name,quantity:Number(it.quantity||1),sellingPrice:Number(it.unit_price||0)}))})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Business Koro rejected the order.');
  const ids=(result.orders||[]).map(x=>x.supplierOrderId).filter(Boolean);
  const note=[order.admin_note,'Business Koro submitted '+formatBdDateTime(new Date())+(ids.length?' · IDs: '+ids.join(', '):'')].filter(Boolean).join('\\n');
  const{error:updateError}=await sb.from('orders').update({admin_note:note,updated_at:new Date().toISOString()}).eq('id',id);
  if(updateError)throw updateError;order.admin_note=note;
  await syncOrderToSheet(id);
  gzUiToast('✓ Order sent to Business Koro successfully.');
 }catch(e){gzUiToast('Could not send order: '+e.message,'error')}
 finally{if(button){button.disabled=false;button.textContent='Send to Business Koro'}}
}
async function syncOrderToSheet(orderId){
 try{
  const response=await fetch((C.backendUrl||'')+'/api/sync-order-sheet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId})});
  if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||'Google Sheets sync failed.');
  return true;
 }catch(e){console.warn('Google Sheets sync:',e);return false}
}

async function sendOrderEmail(orderNumber,type='status_updated'){
 try{
  const session=await sb.auth.getSession(), token=session?.data?.session?.access_token;
  const headers={'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  const response=await fetch((C.backendUrl||'')+'/api/send-order-email',{method:'POST',headers,body:JSON.stringify({orderNumber,type,status:orders.find(x=>x.order_number===orderNumber)?.status||''})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Receipt email could not be sent.');
  return true;
 }catch(e){console.error('Order email:',e);return false}
}
async function confirmOrder(order){
 const isDhaka=String(order.division||'').trim().toLowerCase()==='dhaka';
 const updates={status:'Confirmed',updated_at:new Date().toISOString()};
 if(isDhaka){
  const subtotal=Number(order.subtotal||0), discount=Number(order.referral_discount||0);
  updates.shipping_charge=130;
  updates.total=Math.max(0,subtotal+130-discount);
  
 }

 const {error}=await sb.from('orders').update(updates).eq('id',order.id);
 if(error)throw error;
 Object.assign(order,updates);
 const emailed=await sendOrderEmail(order.order_number,'status_updated');
 await syncOrderToSheet(order.id);
 renderOrders();
 return emailed;
}
async function changeStatus(id,status){
 const order=orders.find(x=>x.id===id); if(!order||order.status===status)return;
 if(status==='Confirmed'){
  if(!(await gzUiConfirm('Confirm '+order.order_number+'? Delivery charge is ৳130. The customer receipt/status email will be sent.')))return;
  try{
   const emailed=await confirmOrder(order);
   gzUiToast(emailed?'✓ Order confirmed with ৳130 delivery charge and the customer email was sent.':'✓ Order confirmed and saved. Email could not be sent; check email settings.');
  }catch(e){gzUiToast('Could not confirm order: '+e.message,'error')}
  return;
 }
 const {error}=await sb.from('orders').update({status,updated_at:new Date().toISOString()}).eq('id',id);
 if(error){gzUiToast('Could not update status: '+error.message,'error');renderOrders();return}
 order.status=status;
 const emailed=await sendOrderEmail(order.order_number,'status_updated');
 await syncOrderToSheet(order.id);
 renderOrders();
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
  const response=await fetch((C.backendUrl||'')+'/api/business-koro-order',{
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
 await syncAllToSheet();
 renderOrders();
}

async function openEditor(id){
 const base=orders.find(x=>x.id===id);if(!base)return;
 const {data:items,error}=await sb.from('order_items').select('*').eq('order_id',id).order('id');
 if(error){gzUiToast(error.message,'error');return}
 current={...base,items:items||[]};
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
 <label class="gz-order-full">Street Address<textarea id="oeAddress">${esc(current.address)}</textarea></label>
 <label>Payment Method<input id="oePayment" value="${esc(current.payment_method||'Cash on Delivery')}"></label><label>Shipping Charge<input id="oeShipping" type="number" step="1" value="${Number(current.shipping_charge||0)}"></label>
 <label>Referral Discount<input id="oeDiscount" type="number" step="0.01" min="0" value="${Number(current.referral_discount||0)}"></label>
 <label class="gz-order-full">Admin Note<textarea id="oeNote">${esc(String(current.admin_note||'').split(TRACK_MARKER)[0].trim())}</textarea></label><label>Courier / Tracking Provider<input id="oeTrackingCourier" value="${esc(trackingFor(current).courier)}" placeholder="e.g. Steadfast"></label><label>Tracking Number<input id="oeTrackingNumber" value="${esc(trackingFor(current).number)}" placeholder="Courier tracking number"></label><label class="gz-order-full">Tracking URL<input id="oeTrackingUrl" type="url" value="${esc(trackingFor(current).url)}" placeholder="https://courier-tracking-link..."></label></div>
 <div class="gz-items-editor"><h3>Products in this order</h3><div id="oeItems">${current.items.map((it,i)=>itemRow(it,i)).join('')}</div><button type="button" class="ghost" id="oeAddItem">＋ Add item</button><div id="oePreview" class="gz-order-total-preview"></div></div>`;
 $('oeAddItem').onclick=()=>{current.items.push({id:null,product_id:null,product_name:'',image_url:'',quantity:1,unit_price:0});renderItemEditor();updatePreview()};
 current.items.forEach((_,i)=>bindItemRow(i)); updatePreview(); $('oeShipping').oninput=updatePreview;
 $('gzOrderEditorMsg').textContent=''; $('gzOrderModal').classList.add('open');document.body.style.overflow='hidden';
}

function itemRow(it,i){return`<div class="gz-item-edit" data-item-index="${i}"><input class="it-name" placeholder="Product name" value="${esc(it.product_name)}"><input class="it-qty" type="number" min="1" value="${Math.max(1,Number(it.quantity||1))}"><input class="it-price" type="number" step="1" min="0" value="${Number(it.unit_price||0)}"><input class="it-image" placeholder="Image URL" value="${esc(it.image_url||'')}"><button type="button" class="it-remove">×</button></div>`}
function bindItemRow(i){const row=document.querySelector(`.gz-item-edit[data-item-index="${i}"]`);if(!row)return;const sync=()=>{current.items[i].product_name=row.querySelector('.it-name').value.trim();current.items[i].quantity=Math.max(1,Number(row.querySelector('.it-qty').value||1));current.items[i].unit_price=Math.max(0,Number(row.querySelector('.it-price').value||0));current.items[i].image_url=row.querySelector('.it-image').value.trim();updatePreview()};row.querySelectorAll('input').forEach(x=>x.oninput=sync);row.querySelector('.it-remove').onclick=()=>{current.items.splice(i,1);renderItemEditor();updatePreview()}}
function renderItemEditor(){const box=$('oeItems');box.innerHTML=current.items.map((it,i)=>itemRow(it,i)).join('');current.items.forEach((_,i)=>bindItemRow(i))}
function updatePreview(){const sub=current.items.reduce((s,it)=>s+Number(it.quantity||0)*Number(it.unit_price||0),0),ship=Number($('oeShipping')?.value||0);$('oePreview').textContent=`Subtotal: ${money(sub)} · Total: ${money(sub+ship)}`}
function closeEditor(){$('gzOrderModal')?.classList.remove('open');document.body.style.overflow='';current=null}

async function saveEditor(){
 if(!current)return;
 const payload={
  customer_name:$('oeName').value.trim(),phone:$('oePhone').value.trim(),email:$('oeEmail').value.trim(),
  division:$('oeDivision').value.trim(),district:$('oeDistrict').value.trim(),upazila:$('oeUpazila').value.trim(),
  address:$('oeAddress').value.trim(),referral_code:$('oeReferral').value.trim()||null,
  payment_method:$('oePayment').value.trim()||'Cash on Delivery',shipping_charge:Number($('oeShipping').value||0),referral_discount:Math.max(0,Number($('oeDiscount').value||0)),
  status:$('oeStatus').value,
  admin_note:saveTrackingNote($('oeNote').value.trim()),
  tracking_provider:$('oeTrackingCourier').value.trim()||null,
  tracking_number:$('oeTrackingNumber').value.trim()||null,
  tracking_url:$('oeTrackingUrl').value.trim()||null
 };
 const items=[...document.querySelectorAll('.gz-item-edit')].map((row,i)=>({
  product_id:current.items[i]?.product_id||null,product_name:row.querySelector('.it-name').value.trim(),
  quantity:Math.max(1,Number(row.querySelector('.it-qty').value||1)),unit_price:Math.max(0,Number(row.querySelector('.it-price').value||0)),
  image_url:row.querySelector('.it-image').value.trim()
 })).filter(x=>x.product_name);
 if(!payload.customer_name||!payload.phone||!payload.email||!payload.division||!payload.district||!payload.address){$('gzOrderEditorMsg').textContent='⚠ Please complete the required customer fields.';return}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)){$('gzOrderEditorMsg').textContent='⚠ Please enter a valid email address.';return}
 if(!/^01[3-9]\d{8}$/.test(payload.phone.replace(/\D/g,''))){$('gzOrderEditorMsg').textContent='⚠ Mobile number must be a valid 11-digit Bangladesh number (01XXXXXXXXX).';return}
 if(!items.length){$('gzOrderEditorMsg').textContent='⚠ Add at least one product.';return}
 payload.phone=payload.phone.replace(/\D/g,'');
 payload.subtotal=items.reduce((s,it)=>s+it.quantity*it.unit_price,0);payload.total=Math.max(0,payload.subtotal+payload.shipping_charge-payload.referral_discount);payload.updated_at=new Date().toISOString();
 $('gzOrderSave').disabled=true;
 try{
  const {error:e1}=await sb.from('orders').update(payload).eq('id',current.id);if(e1)throw e1;
  const {error:e2}=await sb.from('order_items').delete().eq('order_id',current.id);if(e2)throw e2;
  const {error:e3}=await sb.from('order_items').insert(items.map(it=>({...it,order_id:current.id,line_total:it.quantity*it.unit_price})));if(e3)throw e3;
  let statusEmailSent=true;
  if(payload.status!==current.status){
    statusEmailSent=await sendOrderEmail(current.order_number,'status_updated');
  }
  await syncOrderToSheet(current.id);
  $('gzOrderEditorMsg').textContent=statusEmailSent
    ?'✓ Order updated successfully.'
    :'✓ Order updated, but the customer email could not be sent. Check email settings.';
  await loadOrders();setTimeout(closeEditor,500);
 }catch(e){$('gzOrderEditorMsg').textContent='⚠ '+e.message}finally{$('gzOrderSave').disabled=false}
}

document.addEventListener('DOMContentLoaded',()=>{inject();setTimeout(()=>{if($('tab-orders')?.classList.contains('active'))loadOrders()},0)});
window.gzLoadOrders=loadOrders;
document.addEventListener('click',e=>{const b=e.target.closest('.side-link[data-tab="orders"]');if(b)setTimeout(loadOrders,0)});
})();