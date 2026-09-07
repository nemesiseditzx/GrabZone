/* Marketplace shipping bridge: keep legacy checkout UI/business logic intact while exposing vendor shipping totals. */
(()=>{
 const C=window.GRABZONE_CONFIG||{};
 const base=String(C.backendUrl||'').replace(/\/$/,'');
 window.gzMarketplaceShipping={total:0,groups:[],loaded:false};
 async function load(){
  try{
   const raw=JSON.parse(localStorage.getItem('grabzone_cart_v2')||'null');
   if(!Array.isArray(raw)||!raw.length||!base)return;
   const r=await fetch(base+'/api/marketplace/public',{cache:'no-store'}),d=await r.json();
   if(!r.ok||!Array.isArray(d.products))return;
   const by=new Map(d.products.map(p=>[String(p.id),p]));
   const vendors=new Map();
   raw.forEach(i=>{const p=by.get(String(i.product_id||i.id));const id=p?.vendor_id||'vendor_grabzone';if(!vendors.has(id))vendors.set(id,{vendor_id:id,vendor_name:p?.vendor_name||'GRABZONE',subtotal:0}) ;vendors.get(id).subtotal+=Number(i.price||i.sellingPrice||0)*Math.max(1,Number(i.quantity||1));});
   const out=[];for(const v of vendors.values()){const s=(d.vendors||[]).find(x=>x.id===v.vendor_id);out.push({...v,shipping_fee:Number(s?.shipping_fee||0)});}
   window.gzMarketplaceShipping.groups=out;window.gzMarketplaceShipping.total=out.reduce((n,x)=>n+x.shipping_fee,0);window.gzMarketplaceShipping.loaded=true;
   document.dispatchEvent(new CustomEvent('grabzone:marketplace-shipping',{detail:window.gzMarketplaceShipping}));
  }catch(e){console.warn('Marketplace shipping bridge:',e)}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,350));else setTimeout(load,350);
})();
