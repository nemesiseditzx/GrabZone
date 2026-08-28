(() => {
'use strict';
const C=window.GRABZONE_CONFIG||{};
const sb=window.supabase&&C.supabaseUrl&&!String(C.supabaseUrl).includes('PASTE_')?window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey):null;
const currency=C.currency||'৳';
let orders=[], current=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>currency+Number(n||0).toLocaleString('en-BD');
const $=id=>document.getElementById(id);
const statuses=['New','Contacting','Confirmed','Processing','Shipped','Delivered','Cancelled'];

function inject(){
 if($('gzOrdersTab'))return;
 const main=document.querySelector('main.content'); if(!main)return;
 const section=document.createElement('section'); section.id='tab-orders'; section.className='tab';
 section.innerHTML=`
 <div class="page-title"><div><div class="eyebrow">ORDER MANAGEMENT</div><h1>Orders</h1><p>Receive website orders, call customers, confirm them and manage the full order lifecycle.</p></div><button class="primary" id="gzOrdersRefresh">↻ Refresh</button></div>
 <div class="panel"><div class="gz-order-filters"><input id="gzOrderSearch" placeholder="Search order number, name, phone or email"><select id="gzOrderStatusFilter"><option value="">All statuses</option>${statuses.map(s=>`<option>${s}</option>`).join('')}</select></div></div>
 <div class="panel" id="gzOrdersPanel"><div class="muted">Open Orders to load orders.</div></div>`;
 main.insertBefore(section,main.firstElementChild);

 const style=document.createElement('style'); style.id='gzOrdersStyle'; style.textContent=`
 .gz-order-filters{display:grid;grid-template-columns:1fr 180px;gap:10px}.gz-order-filters input,.gz-order-filters select{width:100%;box-sizing:border-box;padding:12px;border:1px solid #ddd;border-radius:11px;background:#fff;font:inherit}
 .gz-orders-wrap{overflow:auto}.gz-orders-table{width:100%;border-collapse:collapse;min-width:1120px}.gz-orders-table th,.gz-orders-table td{padding:12px 9px;border-bottom:1px solid #eee;text-align:left;font-size:12px;vertical-align:middle}.gz-orders-table th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#777}.gz-order-link{border:0;background:none;padding:0;font:inherit;font-weight:900;cursor:pointer}.gz-order-email,.gz-order-ref{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gz-status-select{border:1px solid #ddd;border-radius:999px;padding:6px 9px;background:#fff;font:inherit;font-size:10px;font-weight:800;cursor:pointer}.gz-order-actions-cell{display:flex;gap:6px;white-space:nowrap}.gz-order-action{border:1px solid #ddd;background:#fff;border-radius:8px;padding:7px 9px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.gz-order-action.edit{background:#111;color:#fff;border-color:#111}.gz-order-action.delete{color:#a00000}.gz-empty-orders{text-align:center;padding:30px;color:#777}
 .gz-order-modal{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:15px;background:rgba(0,0,0,.58);backdrop-filter:blur(5px)}.gz-order-modal.open{display:flex}.gz-order-editor{position:relative;width:min(1050px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:22px;padding:24px}.gz-order-close{position:absolute;right:14px;top:14px;border:0;border-radius:50%;width:38px;height:38px;background:#f0f0ed;font-size:22px;cursor:pointer}.gz-order-editor h2{margin:0 50px 4px}.gz-order-editor .muted{margin-bottom:18px}.gz-order-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.gz-order-grid label{display:grid;gap:6px;font-size:11px;font-weight:800;color:#555}.gz-order-grid input,.gz-order-grid textarea,.gz-order-grid select{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;padding:11px;background:#fff;font:inherit;color:#111}.gz-order-grid textarea{min-height:90px;resize:vertical}.gz-order-full{grid-column:1/-1}.gz-items-editor{margin-top:18px;border-top:1px solid #eee;padding-top:18px}.gz-item-edit{display:grid;grid-template-columns:1.4fr 80px 120px 1.2fr 36px;gap:8px;align-items:center;margin-bottom:8px}.gz-item-edit input{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:9px;padding:9px}.gz-item-edit button{border:0;background:#f3f3f1;border-radius:9px;height:36px;cursor:pointer}.gz-order-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px;flex-wrap:wrap}.gz-order-message{min-height:20px;font-size:12px;font-weight:800;margin-top:8px}.gz-order-total-preview{margin-top:10px;text-align:right;font-weight:900}
 @media(max-width:760px){.gz-order-filters,.gz-order-grid{grid-template-columns:1fr}.gz-order-full{grid-column:auto}.gz-order-editor{padding:18px}.gz-item-edit{grid-template-columns:1fr 65px 95px 1fr 36px}}
 `; document.head.appendChild(style);

 document.body.insertAdjacentHTML('beforeend',`<div id="gzOrderModal" class="gz-order-modal"><div class="gz-order-editor"><button id="gzOrderClose" class="gz-order-close">×</button><h2 id="gzOrderEditorTitle">Order</h2><div id="gzOrderEditorSub" class="muted"></div><div id="gzOrderEditorBody"></div><div id="gzOrderEditorMsg" class="gz-order-message"></div><div class="gz-order-actions"><button class="ghost" id="gzOrderCancel">Close</button><button class="primary" id="gzOrderSave">Save changes</button></div></div></div>`);

 $('gzOrdersRefresh').onclick=loadOrders;
 $('gzOrderSearch').oninput=renderOrders;
 $('gzOrderStatusFilter').onchange=renderOrders;
 $('gzOrderClose').onclick=closeEditor;
 $('gzOrderCancel').onclick=closeEditor;
 $('gzOrderModal').onclick=e=>{if(e.target.id==='gzOrderModal')closeEditor()};
 $('gzOrderSave').onclick=saveEditor;
}

async function loadOrders(){
 if(!sb){$('gzOrdersPanel').innerHTML='<div>Supabase is not configured.</div>';return}
 $('gzOrdersPanel').innerHTML='<div class="muted">Loading orders…</div>';
 const {data,error}=await sb.from('orders').select('*').order('created_at',{ascending:false});
 if(error){$('gzOrdersPanel').innerHTML='<div>'+esc(error.message)+'</div>';return}
 orders=data||[]; renderOrders();
}

function renderOrders(){
 const panel=$('gzOrdersPanel');if(!panel)return;
 const q=($('gzOrderSearch')?.value||'').trim().toLowerCase(), st=$('gzOrderStatusFilter')?.value||'';
 const list=orders.filter(o=>(!q||`${o.order_number} ${o.customer_name} ${o.phone} ${o.email} ${o.referral_code||''}`.toLowerCase().includes(q))&&(!st||o.status===st));
 if(!list.length){panel.innerHTML='<div class="gz-empty-orders">No orders found.</div>';return}
 panel.innerHTML=`<div class="gz-orders-wrap"><table class="gz-orders-table"><thead><tr><th>Order</th><th>Customer</th><th>Phone</th><th>Email</th><th>Referral</th><th>Total</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>${list.map(o=>`<tr>
 <td><button class="gz-order-link" data-order="${esc(o.id)}">${esc(o.order_number)}</button></td>
 <td>${esc(o.customer_name)}</td>
 <td>${esc(o.phone)}</td>
 <td class="gz-order-email" title="${esc(o.email)}">${esc(o.email)}</td>
 <td class="gz-order-ref" title="${esc(o.referral_code||'—')}">${esc(o.referral_code||'—')}</td>
 <td><b>${money(o.total)}</b></td>
 <td><select class="gz-status-select" data-status-order="${esc(o.id)}" aria-label="Change order status">${statuses.map(s=>`<option value="${esc(s)}" ${s===o.status?'selected':''}>${esc(s)}</option>`).join('')}</select></td>
 <td>${o.created_at?new Date(o.created_at).toLocaleString():'—'}</td>
 <td><div class="gz-order-actions-cell"><button class="gz-order-action edit" data-edit-order="${esc(o.id)}">Edit</button><button class="gz-order-action delete" data-delete-order="${esc(o.id)}">Delete</button></div></td>
 </tr>`).join('')}</tbody></table></div>`;
 panel.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>openEditor(b.dataset.order));
 panel.querySelectorAll('[data-edit-order]').forEach(b=>b.onclick=()=>openEditor(b.dataset.editOrder));
 panel.querySelectorAll('[data-delete-order]').forEach(b=>b.onclick=()=>deleteOrder(b.dataset.deleteOrder));
 panel.querySelectorAll('[data-status-order]').forEach(s=>s.onchange=()=>changeStatus(s.dataset.statusOrder,s.value));
}

async function changeStatus(id,status){
 const order=orders.find(x=>x.id===id); if(!order||order.status===status)return;
 const {error}=await sb.from('orders').update({status,updated_at:new Date().toISOString()}).eq('id',id);
 if(error){alert('Could not update status: '+error.message);renderOrders();return}
 order.status=status; renderOrders();
}

async function deleteOrder(id){
 const order=orders.find(x=>x.id===id); if(!order)return;
 const ok=window.confirm(`Delete order ${order.order_number}? This will permanently remove the order and its products from the admin panel.`);
 if(!ok)return;
 const {error}=await sb.from('orders').delete().eq('id',id);
 if(error){alert('Could not delete order: '+error.message);return}
 orders=orders.filter(x=>x.id!==id);
 renderOrders();
}

async function openEditor(id){
 const base=orders.find(x=>x.id===id);if(!base)return;
 const {data:items,error}=await sb.from('order_items').select('*').eq('order_id',id).order('id');
 if(error){alert(error.message);return}
 current={...base,items:items||[]};
 $('gzOrderEditorTitle').textContent=current.order_number;
 $('gzOrderEditorSub').textContent=`Placed ${current.created_at?new Date(current.created_at).toLocaleString():'—'} · Last updated ${current.updated_at?new Date(current.updated_at).toLocaleString():'—'}`;
 $('gzOrderEditorBody').innerHTML=`
 <div class="gz-order-grid">
 <label>Customer Name<input id="oeName" value="${esc(current.customer_name)}"></label><label>Mobile Number<input id="oePhone" value="${esc(current.phone)}"></label>
 <label>Email Address<input id="oeEmail" type="email" value="${esc(current.email)}"></label><label>Status<select id="oeStatus">${statuses.map(s=>`<option ${s===current.status?'selected':''}>${s}</option>`).join('')}</select></label>
 <label>Division<input id="oeDivision" value="${esc(current.division)}"></label><label>District<input id="oeDistrict" value="${esc(current.district)}"></label>
 <label>Upazila / Thana<input id="oeUpazila" value="${esc(current.upazila||'')}"></label><label>Referral Code<input id="oeReferral" value="${esc(current.referral_code||'')}"></label>
 <label class="gz-order-full">Street Address<textarea id="oeAddress">${esc(current.address)}</textarea></label>
 <label>Payment Method<input id="oePayment" value="${esc(current.payment_method||'Cash on Delivery')}"></label><label>Shipping Charge<input id="oeShipping" type="number" step="1" value="${Number(current.shipping_charge||0)}"></label>
 <label class="gz-order-full">Admin Note<textarea id="oeNote">${esc(current.admin_note||'')}</textarea></label></div>
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
  payment_method:$('oePayment').value.trim()||'Cash on Delivery',shipping_charge:Number($('oeShipping').value||0),
  status:$('oeStatus').value,admin_note:$('oeNote').value.trim()||null
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
 payload.subtotal=items.reduce((s,it)=>s+it.quantity*it.unit_price,0);payload.total=payload.subtotal+payload.shipping_charge;payload.updated_at=new Date().toISOString();
 $('gzOrderSave').disabled=true;
 try{
  const {error:e1}=await sb.from('orders').update(payload).eq('id',current.id);if(e1)throw e1;
  const {error:e2}=await sb.from('order_items').delete().eq('order_id',current.id);if(e2)throw e2;
  const {error:e3}=await sb.from('order_items').insert(items.map(it=>({...it,order_id:current.id,line_total:it.quantity*it.unit_price})));if(e3)throw e3;
  $('gzOrderEditorMsg').textContent='✓ Order updated successfully.';
  await loadOrders();setTimeout(closeEditor,500);
 }catch(e){$('gzOrderEditorMsg').textContent='⚠ '+e.message}finally{$('gzOrderSave').disabled=false}
}

document.addEventListener('DOMContentLoaded',inject);
window.gzLoadOrders=loadOrders;
document.addEventListener('click',e=>{const b=e.target.closest('.side-link[data-tab="orders"]');if(b)setTimeout(loadOrders,0)});
})();