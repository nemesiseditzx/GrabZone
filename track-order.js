
(()=> {
 const C=window.GRABZONE_CONFIG||{};
 const $=id=>document.getElementById(id);
 const statuses=['New','Contacting','Confirmed','Processing','Shipped','Delivered','Cancelled'];
 const statusIcons={
   New:'<svg viewBox="0 0 24 24"><path d="M4 9.5 12 4l8 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-9Z"/><path d="M8 20v-6h8v6"/></svg>',
   Contacting:'<svg viewBox="0 0 24 24"><path d="M7 4h3l1.5 4-2 1.5a13 13 0 0 0 5 5l1.5-2 4 1.5v3c0 1-1 1.5-2 1.5C11 18.5 5.5 13 5.5 6 5.5 5 6 4 7 4Z"/></svg>',
   Confirmed:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
   Processing:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
   Shipped:'<svg viewBox="0 0 24 24"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="1.5"/><circle cx="18" cy="19" r="1.5"/></svg>',
   Delivered:'<svg viewBox="0 0 24 24"><path d="M5 12h10M11 8l4 4-4 4"/><path d="M4 5h16v14H4z"/></svg>',
   Cancelled:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="m9 9 6 6M15 9l-6 6"/></svg>'
 };

 async function loadSocial(){
   try{
     if(window.grabzoneD1){
       const sb=window.grabzoneD1;
       const q=await sb.from('site_settings').select('whatsapp,instagram,messenger').eq('id',1).maybeSingle();
       const s=q.data||{};
       const wa=String(s.whatsapp||C.whatsapp||'').trim();
       const ig=String(s.instagram||C.instagram||'').trim();
       const fb=String(s.messenger||C.messenger||'').trim();
       if(wa&&!wa.includes('XXXXXXXX')) $('wa').href=wa; else $('wa').removeAttribute('href');
       if(ig&&!ig.includes('yourstore')) $('ig').href=ig; else $('ig').removeAttribute('href');
       if(fb&&!fb.includes('yourpage')) $('fb').href=fb; else $('fb').removeAttribute('href');
     }
   }catch(e){console.error('Social links:',e)}
 }
 loadSocial();

 function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
 function render(o){
   const idx=statuses.indexOf(o.status),safeIdx=idx<0?0:idx;
   const descriptions={New:'Order received',Contacting:'We are contacting you to confirm the order',Confirmed:'Order confirmed successfully',Processing:'Your order is being prepared',Shipped:'Your package is on the way',Delivered:'Order delivered',Cancelled:'This order has been cancelled'};
   $('result').hidden=false;
   const currentLabel=descriptions[o.status]||'Your order status has been updated';
   const district=String(o.district||'').toLowerCase(),division=String(o.division||'').toLowerCase();
   const eta=(district.includes('dhaka')||division==='dhaka')?'1–2 days':(district.includes('chattogram')||district.includes('chittagong')||division.includes('chattogram')||division.includes('chittagong'))?'2–4 days':(division?'2–5 days':'');
   const statusMarkup=statuses.map((s,i)=>{const isCancelled=s==='Cancelled';const cls=o.status==='Cancelled'?(isCancelled?'cancelled current':''):(i<safeIdx?'completed':i===safeIdx?'current':'');return '<div class="track-status-step '+cls+'"><span class="track-status-icon">'+statusIcons[s]+'</span><span>'+esc(s)+'</span></div>';}).join('');
   const vendors=Array.isArray(o.vendors)?o.vendors:[];
   function productImage(i){return String(i.image_url||'').trim()||'https://placehold.co/160x160?text=Product'}
 function variationText(i){let v=i.variation_options;if(typeof v==='string'){try{v=JSON.parse(v||'{}')}catch{v={}}}return v&&typeof v==='object'&&!Array.isArray(v)?Object.entries(v).map(([k,val])=>esc(k)+': '+esc(val)).join(' · '):''}
 function openInvoice(o){const modal=$('invoiceModal'),body=$('invoiceBody');if(!modal||!body)return;body.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px"><div><b>Customer</b><br>'+esc(o.customer_name||'')+'</div><div><b>Phone</b><br>'+esc(o.phone||'')+'</div><div><b>Address</b><br>'+esc([o.address,o.upazila,o.district,o.division].filter(Boolean).join(', '))+'</div><div><b>Payment</b><br>'+esc(o.payment_method||'Cash on Delivery')+'</div></div><div style="margin-top:18px"><b>Products</b></div>'+vendors.map(v=>'<div class="invoice-vendor"><h4>'+esc(v.brand_name||v.vendor_name||'Vendor')+'</h4>'+(v.items||[]).map(i=>'<div class="product-card"><a href="product.html?id='+encodeURIComponent(i.product_id||'')+'" target="_blank" rel="noopener"><img class="product-thumb" src="'+esc(productImage(i))+'" alt="'+esc(i.product_name||i.name||'Product')+'"></a><div class="product-info"><a href="product.html?id='+encodeURIComponent(i.product_id||'')+'" target="_blank" rel="noopener"><b>'+esc(i.product_name||i.name||'Product')+'</b></a><div style="font-size:12px;color:#666;margin-top:4px">SKU: '+esc(i.variation_sku||i.sku||'—')+' · Qty: '+Number(i.quantity||1)+'</div>'+(variationText(i)?'<div style="font-size:12px;color:#666;margin-top:3px">'+variationText(i)+'</div>':'')+'<div style="font-weight:800;margin-top:5px">৳'+Number(i.line_total||Number(i.unit_price||0)*Number(i.quantity||1)).toLocaleString('en-BD')+'</div></div></div>').join('')+'</div>').join('')+'<div style="margin-top:15px"><div class="invoice-row"><span>Subtotal</span><b>৳'+Number(o.subtotal||0).toLocaleString('en-BD')+'</b></div><div class="invoice-row"><span>Shipping</span><b>৳'+Number(o.shipping_charge||0).toLocaleString('en-BD')+'</b></div>'+((Number(o.referral_discount||0)+Number(o.rewards_voucher_discount||0)+Number(o.mystery_discount||0))?'<div class="invoice-row"><span>Discount</span><b>-৳'+(Number(o.referral_discount||0)+Number(o.rewards_voucher_discount||0)+Number(o.mystery_discount||0)).toLocaleString('en-BD')+'</b></div>':'')+'<div class="invoice-row invoice-total"><span>Total</span><b>৳'+Number(o.total||0).toLocaleString('en-BD')+'</b></div></div>';modal.classList.remove('printed');modal.classList.add('open','printing');clearTimeout(window.__gzInvoicePrintTimer);window.__gzInvoicePrintTimer=setTimeout(()=>{modal.classList.remove('printing');modal.classList.add('printed')},9000)}
 const shipmentMarkup=vendors.length?vendors.map(v=>{
     const products=(v.items||[]).map(i=>esc(i.product_name||'Product')+' × '+Number(i.quantity||1)).join(' · ')||'Product';
     const shipments=Array.isArray(v.shipments)?v.shipments:[];
     return '<section class="tracking-box"><div style="font-size:12px;color:#777;font-weight:800;text-transform:uppercase;letter-spacing:.06em">SHOP</div><div style="font-size:18px;font-weight:900;margin-top:3px">'+esc(v.brand_name||v.vendor_name||'Vendor')+'</div><div style="margin-top:5px;font-size:13px;color:#555"><b>Product:</b> '+products+'</div>'+
       (shipments.length?shipments.map(s=>'<div style="margin-top:12px;padding-top:12px;border-top:1px solid #ddd"><div style="font-size:11px;font-weight:900;color:#777;text-transform:uppercase">SHIPMENT</div><div style="margin-top:5px"><b>'+esc(s.status||v.status||'Processing')+'</b></div><div style="margin-top:4px;color:#555">'+esc(s.courier||'Courier pending')+(s.tracking_id?' · '+esc(s.tracking_id):' · Tracking pending')+'</div>'+(s.tracking_url?'<a class="tracking-link" href="'+esc(s.tracking_url)+'" target="_blank" rel="noopener">Track Package →</a>':'')+'</div>').join(''):'<div style="margin-top:10px;color:#777">Shipment not added yet.</div>')+
     '</section>';
   }).join(''):'<div class="tracking-box">Shipment details will appear here once your vendor ships the order.</div>';
   $('result').innerHTML='<b>Order #'+esc(o.orderNumber)+'</b>'+
   '<div class="current-status">Current Status: '+esc(o.status||'Unknown')+'<small>'+esc(currentLabel)+'</small></div>'+
   (eta?'<div class="tracking-box"><b>📦 Estimated Arrival</b><div>'+esc(eta)+'</div></div>':'')+
   '<div class="track-status-line" aria-label="Order status progress">'+statusMarkup+'</div>'+
   '<div class="order-mini-info"><div class="order-mini"><span>Order</span><b>#'+esc(o.orderNumber||'—')+'</b></div><div class="order-mini"><span>Tracking ID</span><b>'+esc(o.tracking_id||'—')+'</b></div></div><div class="tracking-actions"><button type="button" class="gz-action primary" id="viewInvoiceBtn"><span class="gz-action-icon">🧾</span> View Invoice</button><button type="button" class="gz-action" id="copyTrackingBtn"><span class="gz-action-icon">📋</span> Copy Tracking ID</button><button type="button" class="gz-action success" id="refreshOrderBtn"><span class="gz-action-icon">🔄</span> Refresh Status</button><button type="button" class="gz-action dark" id="storeActionBtn"><span class="gz-action-icon">🛍️</span> Continue Shopping</button></div><div style="margin-top:22px"><b style="font-size:16px">📦 Shipment Tracking</b>'+shipmentMarkup+'</div>'+
   (o.items?.length?'<div class="items"><b>Order Items</b>'+o.items.map(i=>'<div class="item"><span>'+esc(i.name)+' × '+i.quantity+'</span><span>৳'+Number(i.price*i.quantity).toLocaleString('en-BD')+'</span></div>').join('')+'</div>':'');
   const invBtn=$('viewInvoiceBtn');if(invBtn)invBtn.onclick=()=>openInvoice(o);
   const copyBtn=$('copyTrackingBtn');if(copyBtn)copyBtn.onclick=async()=>{const value=String(o.tracking_id||o.orderNumber||'').trim();try{await navigator.clipboard.writeText(value);copyBtn.innerHTML='<span class="gz-action-icon">✅</span> Copied!';setTimeout(()=>{copyBtn.innerHTML='<span class="gz-action-icon">📋</span> Copy Tracking ID'},1600)}catch{copyBtn.innerHTML='<span class="gz-action-icon">⚠️</span> Copy unavailable';setTimeout(()=>{copyBtn.innerHTML='<span class="gz-action-icon">📋</span> Copy Tracking ID'},1600)}};
   const refreshBtn=$('refreshOrderBtn');if(refreshBtn)refreshBtn.onclick=async()=>{refreshBtn.disabled=true;refreshBtn.innerHTML='<span class="gz-action-icon">⏳</span> Updating...';try{const d=await getOrder(o.tracking_id||o.orderNumber);if(d?.order){render(d.order);$('msg').innerHTML='<span class="live-dot"></span> Status updated just now';}}catch(e){$('msg').textContent=e.message||'Could not refresh order.'}finally{if($('refreshOrderBtn'))$('refreshOrderBtn').disabled=false}};
   const storeBtn=$('storeActionBtn');if(storeBtn)storeBtn.onclick=()=>{location.href='index.html'};
   const closeInvoice=()=>{clearTimeout(window.__gzInvoicePrintTimer);const m=$('invoiceModal');if(m)m.classList.remove('open','printing','printed')};const invClose=$('invoiceClose');if(invClose)invClose.onclick=closeInvoice;const invModal=$('invoiceModal');if(invModal)invModal.onclick=e=>{if(e.target===invModal)closeInvoice()};
 }

 async function getOrder(id){
   const clean=String(id||'').trim().toUpperCase();
   if(!clean) throw new Error('Please enter your Order Tracking ID.');
   const marketplace=await fetch('/api/marketplace/track?tracking_id='+encodeURIComponent(clean),{cache:'no-store'});
   let md={}; try{md=await marketplace.json()}catch{}
   if(marketplace.ok&&md.order)return {success:true,order:{...md.order,orderNumber:md.order.order_number,items:[],vendors:md.vendors||[]}};
   if(!window.grabzoneD1) throw new Error(md.error||'Tracking service is not configured.');
   const sb=window.grabzoneD1;
   const {data,error}=await sb.rpc('track_public_order',{p_tracking_id:clean});
   if(!error&&data) return {success:true,order:data};
   console.warn('Direct tracking RPC failed:',error);
   const response=await fetch('/api/track-order?trackingId='+encodeURIComponent(clean),{cache:'no-store'});
   let body={}; try{body=await response.json()}catch{}
   if(!response.ok) throw new Error(body.error||'Order not found. Please check your Order ID.');
   return body;
 }

 $('trackForm').addEventListener('submit',async e=>{
   e.preventDefault();
   const msg=$('msg'),result=$('result');
   msg.textContent='Checking order…'; result.hidden=true;
   try{
     const d=await getOrder($('orderId').value);
     if(!d?.order) throw new Error('Order not found. Please check your Order ID.');
     render(d.order);
     msg.textContent='Order found ✓';
   }catch(e){
     console.error('Track order:',e);
     msg.textContent=e.message||'Could not load the order. Please try again.';
   }
 });
const params=new URLSearchParams(location.search);
 const initialTracking=params.get('tracking')||'';
 if(initialTracking){$('orderId').value=initialTracking.toUpperCase();setTimeout(()=>$('trackForm').requestSubmit(),50)}
})();
