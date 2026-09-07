(()=>{'use strict';
const C=window.GRABZONE_CONFIG||{},base=String(C.backendUrl||'').replace(/\/$/,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>(C.currency||'৳')+Number(v||0).toLocaleString('en-BD');
async function enhance(){
 const raw=(()=>{try{return JSON.parse(localStorage.getItem('grabzone_cart_v2')||'null')}catch{return null}})();
 if(!Array.isArray(raw)||!raw.length||!base)return;
 const ids=[...new Set(raw.map(x=>x.product_id||x.id).filter(Boolean))];
 try{
  const r=await fetch(base+'/api/marketplace/public',{cache:'no-store'});const d=await r.json();if(!r.ok||!Array.isArray(d.products))return;
  const by=new Map(d.products.map(p=>[String(p.id),p]));const groups=new Map();
  raw.forEach(i=>{const p=by.get(String(i.product_id||i.id));const key=p?.vendor_id||'vendor_grabzone';const name=p?.vendor_name||'GRABZONE';if(!groups.has(key))groups.set(key,{name,slug:p?.vendor_slug||'grabzone',items:[]});groups.get(key).items.push({...i,_vendor:p})});
  let host=document.getElementById('gzMarketplaceCheckout');if(!host){host=document.createElement('div');host.id='gzMarketplaceCheckout';const form=document.getElementById('checkoutForm');if(form)form.insertBefore(host,form.firstElementChild)}
  host.innerHTML='<div class="gz-mc-head"><span>MARKETPLACE ORDER</span><b>'+groups.size+' seller'+(groups.size===1?'':'s')+'</b></div>'+[...groups.values()].map(g=>'<section class="gz-mc-vendor"><div class="gz-mc-vendor-head"><div><small>SELLER</small><strong>'+esc(g.name)+'</strong></div><span>'+g.items.length+' item'+(g.items.length===1?'':'s')+'</span></div><div class="gz-mc-items">'+g.items.map(i=>'<div><span>'+esc(i.name||i.product_name)+'</span><b>'+money(Number(i.price||0)*Number(i.quantity||1))+'</b></div>').join('')+'</div></section>').join('');
 }catch(e){console.warn('Marketplace checkout preview:',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enhance,250));else setTimeout(enhance,250);
})();
