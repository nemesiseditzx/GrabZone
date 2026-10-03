(()=>{'use strict';
if(window.__GZ_FINAL_STOREFRONT_POLISH__)return;
window.__GZ_FINAL_STOREFRONT_POLISH__=true;

function lazyImages(){
  document.querySelectorAll('img').forEach(img=>{
    if(!img.hasAttribute('loading') && !img.closest('.hero-card')) img.loading='lazy';
    if(!img.hasAttribute('decoding')) img.decoding='async';
  });
}

function seo(){
  if(!document.querySelector('meta[name="theme-color"]')){
    const m=document.createElement('meta');m.name='theme-color';m.content='#151a20';document.head.appendChild(m);
  }
  let node=document.getElementById('gzStoreSchema');
  if(!node){
    node=document.createElement('script');node.id='gzStoreSchema';node.type='application/ld+json';document.head.appendChild(node);
  }
  const cfg=window.GRABZONE_CONFIG||{};
  const name=String(document.getElementById('storeName')?.textContent||cfg.storeName||'GrabZone').trim();
  node.textContent=JSON.stringify({
    '@context':'https://schema.org',
    '@type':'OnlineStore',
    name,
    url:location.origin+'/',
    description:'GrabZone Bangladesh online marketplace with Cash on Delivery and GrabPoints rewards.',
    areaServed:'Bangladesh',
    currenciesAccepted:'BDT',
    paymentAccepted:'Cash on Delivery'
  });
}

function polish(){
  lazyImages();
  seo();
  document.querySelectorAll('#products .product-card').forEach(card=>{
    const img=card.querySelector('img');
    if(img){img.loading='lazy';img.decoding='async';}
    const btn=card.querySelector('.shop-btn,.gz-card-actions button');
    if(btn && !btn.getAttribute('aria-label')) btn.setAttribute('aria-label','Add this product to cart');
  });
}

const boot=()=>{polish();setTimeout(polish,700);setTimeout(polish,1800)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
new MutationObserver(()=>polish()).observe(document.body,{childList:true,subtree:true});
})();