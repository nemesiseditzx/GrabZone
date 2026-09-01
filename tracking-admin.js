(() => {
'use strict';
const C=window.GRABZONE_CONFIG||{};
const sb=window.grabzoneD1||null;
const $=id=>document.getElementById(id);

async function syncOrderToSheet(orderId){
  try{
    const response=await fetch('/api/sync-order-sheet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId})});
    if(!response.ok)console.warn('Google Sheets sync:',await response.text().catch(()=>''));
  }catch(e){console.warn('Google Sheets sync:',e)}
}

const BD_TIME_ZONE="Asia/Dhaka";
function formatBdDateTime(value){
  if(!value)return "—";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "—";
  return new Intl.DateTimeFormat("en-US",{timeZone:BD_TIME_ZONE,year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:true}).format(d);
}
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const statuses=['New','Contacting','Confirmed','Processing','Shipped','Delivered','Cancelled'];
let rows=[];

function inject(){
  if($('gzTrackingTab'))return;
  const main=document.querySelector('main.content');
  if(!main)return;
  const section=document.createElement('section');
  section.id='tab-tracking';
  section.className='tab';
  section.innerHTML=
    '<div class="page-title"><div><div class="eyebrow">SHIPMENT TRACKING</div><h1>Tracking</h1><p>Add the courier tracking details customers will see on Track Your Order.</p></div><button class="primary" id="gzTrackingRefresh">↻ Refresh</button></div>'+
    '<div class="panel"><div class="gz-tracking-filter"><input id="gzTrackingSearch" placeholder="Search order number, customer or phone"><select id="gzTrackingStatus"><option value="">All statuses</option>'+
    statuses.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join('')+
    '</select></div></div>'+
    '<div class="panel" id="gzTrackingPanel"><div class="muted">Loading tracking records…</div></div>';
  main.appendChild(section);

  const style=document.createElement('style');
  style.id='gzTrackingStyle';
  style.textContent='.gz-tracking-filter{display:grid;grid-template-columns:1fr 180px;gap:10px}.gz-tracking-filter input,.gz-tracking-filter select{width:100%;box-sizing:border-box;padding:12px;border:1px solid #ddd;border-radius:11px;background:#fff;font:inherit}.gz-track-list{display:grid;gap:12px}.gz-track-card{border:1px solid #e5e5e1;border-radius:16px;padding:16px;background:#fff}.gz-track-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:13px}.gz-track-order{font-size:17px;font-weight:950}.gz-track-meta{font-size:12px;color:#666;margin-top:3px}.gz-track-status{border:1px solid #ddd;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:900;background:#fff}.gz-track-grid{display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:9px}.gz-track-grid label{display:grid;gap:5px;font-size:10px;font-weight:900;color:#666}.gz-track-grid input,.gz-track-grid select{width:100%;box-sizing:border-box;padding:10px;border:1px solid #ddd;border-radius:9px;background:#fff;font:inherit;color:#111}.gz-track-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.gz-track-msg{font-size:12px;font-weight:800;margin-top:8px}.gz-track-empty{text-align:center;padding:30px;color:#777}@media(max-width:760px){.gz-tracking-filter,.gz-track-grid{grid-template-columns:1fr}.gz-track-head{flex-direction:column}}';
  document.head.appendChild(style);
  $('gzTrackingRefresh').onclick=load;
  $('gzTrackingSearch').oninput=render;
  $('gzTrackingStatus').onchange=render;
  load();
}

async function load(){
  const panel=$('gzTrackingPanel');
  if(!panel)return;
  if(!sb){panel.innerHTML='<div class="muted">⚠ Database service is not configured.</div>';return;}
  panel.innerHTML='<div class="muted">Loading tracking records…</div>';
  try{
    const sessionData=(await sb.auth.getSession()).data;
    if(!sessionData?.session){panel.innerHTML='<div class="muted">⚠ Admin session expired. Please log in again.</div>';return;}
    const {data,error}=await sb.from('orders').select('id,order_number,customer_name,phone,status,created_at,tracking_number,tracking_url,tracking_provider').order('created_at',{ascending:false});
    if(error)throw error;
    rows=Array.isArray(data)?data:[];
    render();
  }catch(e){
    console.error('GrabZone tracking load failed:',e);
    panel.innerHTML='<div><b>Could not load tracking records.</b><br><span class="muted">'+esc(e.message||'Database request failed.')+'</span></div>';
  }
}

function render(){
  const panel=$('gzTrackingPanel');
  if(!panel)return;
  const q=($('gzTrackingSearch')?.value||'').trim().toLowerCase();
  const st=$('gzTrackingStatus')?.value||'';
  const list=rows.filter(o=>(!q||String(o.order_number+' '+o.customer_name+' '+o.phone).toLowerCase().includes(q))&&(!st||o.status===st));
  if(!list.length){panel.innerHTML='<div class="gz-track-empty">No orders found.</div>';return;}
  panel.innerHTML='<div class="gz-track-list">'+list.map(o=>
    '<div class="gz-track-card" data-track-card="'+esc(o.id)+'">'+
      '<div class="gz-track-head"><div><div class="gz-track-order">'+esc(o.order_number)+'</div><div class="gz-track-meta">'+esc(o.customer_name)+' · '+esc(o.phone)+' · '+(o.created_at?formatBdDateTime(o.created_at):'—')+'</div></div>'+
      '<select class="gz-track-status" data-track-status="'+esc(o.id)+'">'+statuses.map(s=>'<option value="'+esc(s)+'" '+(s===o.status?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select></div>'+
      '<div class="gz-track-grid">'+
        '<label>Courier / Provider<input data-track-provider="'+esc(o.id)+'" value="'+esc(o.tracking_provider||'')+'" placeholder="e.g. Steadfast"></label>'+
        '<label>Tracking Number<input data-track-number="'+esc(o.id)+'" value="'+esc(o.tracking_number||'')+'" placeholder="Courier tracking number"></label>'+
        '<label>Tracking URL<input data-track-url="'+esc(o.id)+'" type="url" value="'+esc(o.tracking_url||'')+'" placeholder="https://courier-tracking-link..."></label>'+
      '</div>'+
      '<div class="gz-track-actions"><button class="ghost" data-track-open-order="'+esc(o.id)+'">Open in Orders</button><button class="primary" data-track-save="'+esc(o.id)+'">Save Tracking</button></div>'+
      '<div class="gz-track-msg" data-track-msg="'+esc(o.id)+'"></div>'+
    '</div>'
  ).join('')+'</div>';

  panel.querySelectorAll('[data-track-save]').forEach(b=>b.onclick=()=>save(b.dataset.trackSave));
  panel.querySelectorAll('[data-track-open-order]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.trackOpenOrder;
    document.querySelector('.side-link[data-tab="orders"]')?.click();
    setTimeout(()=>{
      const target=document.querySelector('[data-edit-order="'+CSS.escape(id)+'"]');
      if(target)target.click();
    },150);
  });
}

async function save(id){
  const msg=document.querySelector('[data-track-msg="'+CSS.escape(id)+'"]');
  const provider=document.querySelector('[data-track-provider="'+CSS.escape(id)+'"]')?.value.trim()||null;
  const number=document.querySelector('[data-track-number="'+CSS.escape(id)+'"]')?.value.trim()||null;
  const url=document.querySelector('[data-track-url="'+CSS.escape(id)+'"]')?.value.trim()||null;
  const status=document.querySelector('[data-track-status="'+CSS.escape(id)+'"]')?.value;
  if(url&&!/^https?:\/\//i.test(url)){if(msg)msg.textContent='⚠ Tracking URL must start with http:// or https://.';return;}
  try{
    const {error}=await sb.from('orders').update({tracking_provider:provider,tracking_number:number,tracking_url:url,status:status||'New',updated_at:new Date().toISOString()}).eq('id',id);
    if(error)throw error;
    const item=rows.find(x=>x.id===id);
    if(item){item.tracking_provider=provider;item.tracking_number=number;item.tracking_url=url;item.status=status;}
    await syncOrderToSheet(id);
    if(msg){msg.textContent='✓ Tracking saved. Customer Track Your Order is now updated.';msg.style.color='#176b2c';}
  }catch(e){
    console.error(e);
    if(msg){msg.textContent='⚠ '+(e.message||'Could not save tracking.');msg.style.color='#a00';}
  }
}

document.addEventListener('DOMContentLoaded',inject);
window.gzLoadTracking=load;
})();