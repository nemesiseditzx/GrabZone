(()=>{'use strict';
const C=window.GRABZONE_CONFIG||{},base=String(C.backendUrl||'').replace(/\/$/,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function load(){
 const id=new URLSearchParams(location.search).get('tracking');if(!id||!base)return;
 try{const r=await fetch(base+'/api/marketplace/track?tracking='+encodeURIComponent(id));const d=await r.json();if(!r.ok||!d.order)return;
  const o=d.order,host=document.getElementById('gzMarketplaceTracking')||document.querySelector('.tracking-shell')||document.querySelector('main');if(!host)return;
  const old=document.getElementById('gzMarketplaceTracking');if(old)old.remove();const el=document.createElement('section');el.id='gzMarketplaceTracking';el.innerHTML='<div class="gz-mt-head"><span>MARKETPLACE SHIPMENTS</span><b>'+esc(o.order_number||id)+'</b></div><p class="gz-mt-sub">Your order is grouped by seller so each vendor shipment can be tracked separately.</p><div class="gz-mt-grid">'+(o.shipments||[]).map(s=>'<article class="gz-mt-card"><div><small>SELLER</small><h3>'+esc(s.vendor_name)+'</h3></div><div class="gz-mt-status">'+esc(s.status||'Processing')+'</div><dl><div><dt>Shipment ID</dt><dd>'+esc(s.shipment_tracking_id)+'</dd></div><div><dt>Courier</dt><dd>'+esc(s.courier_name||'Not assigned')+'</dd></div><div><dt>Tracking</dt><dd>'+esc(s.courier_tracking_number||'Not assigned')+'</dd></div></dl>'+(s.courier_tracking_url?'<a target="_blank" rel="noopener" href="'+esc(s.courier_tracking_url)+'">Track courier →</a>':'')+'</article>').join('')+'</div>';
  host.appendChild(el);
 }catch(e){console.warn('Marketplace tracking:',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,300));else setTimeout(load,300);
})();
