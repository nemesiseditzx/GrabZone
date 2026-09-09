(()=>{
 const form=document.getElementById('trackForm'),input=document.getElementById('orderId'),result=document.getElementById('result'),msg=document.getElementById('msg');
 if(!form||!result)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const money=n=>'৳'+Number(n||0).toLocaleString('en-BD',{maximumFractionDigits:2});
 form.addEventListener('submit',async e=>{
   e.preventDefault();
   const id=String(input.value||'').trim().toUpperCase();if(!id)return;
   msg.textContent='Loading tracking…';result.hidden=false;result.innerHTML='<div class="tracking-box">Loading vendor shipments…</div>';
   try{
     const r=await fetch('/api/marketplace/track?tracking_id='+encodeURIComponent(id),{cache:'no-store'});
     const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Order not found.');
     const o=d.order||{};
     const vendors=d.vendors||[];
     result.innerHTML=`<b>Order #${esc(o.order_number||id)}</b><div class="current-status">Overall Status: ${esc(o.status||'Processing')}<small>Tracking ID: ${esc(o.tracking_id||id)}</small></div><div class="tracking-box"><b>Order Summary</b><div style="margin-top:7px">Subtotal: ${money(o.subtotal)} · Shipping: ${money(o.shipping_charge)} · Total: ${money(o.total)}</div></div>${vendors.map(v=>`<section class="tracking-box" style="margin-top:14px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b>${esc(v.brand_name)}</b><div style="font-size:12px;color:#777;margin-top:3px">${esc(v.status||'Processing')}</div></div></div><div class="items">${(v.items||[]).map(i=>`<div class="item"><span>${esc(i.product_name)} × ${i.quantity}</span><b>${money(i.line_total)}</b></div>`).join('')||'<div style="color:#777">No items mapped.</div>'}</div>${(v.shipments||[]).map(s=>`<div style="margin-top:10px;padding:12px;background:#fff;border:1px solid #e4e4df;border-radius:12px"><b>${esc(s.status||'Processing')}</b><div style="margin-top:4px">${esc(s.courier||'Courier pending')} · ${esc(s.tracking_id||'Tracking pending')}</div>${s.tracking_url?`<a class="tracking-link" href="${esc(s.tracking_url)}" target="_blank" rel="noopener">Track Package →</a>`:''}${(s.items||[]).length?`<div style="font-size:12px;color:#666;margin-top:7px">Products: ${s.items.map(i=>esc(i.product_name)+' × '+i.quantity).join(', ')}</div>`:''}</div>`).join('')||'<div style="margin-top:10px;color:#777">Shipment not added yet.</div>'}</section>`).join('')}`;
     msg.textContent='Tracking updated.';
   }catch(err){msg.textContent=err.message||'Unable to load tracking.';result.hidden=false;result.innerHTML='<div class="tracking-box" style="color:#a11">'+esc(err.message||'Order not found.')+'</div>';}
 });
})();
