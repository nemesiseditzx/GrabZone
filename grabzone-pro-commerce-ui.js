/* GrabZone visual UX enhancer — no settings/data/backend changes. */
(function(){
  function init(){
    var header=document.querySelector('.header');
    if(!header || header.querySelector('.gz-header-search')) return;
    var actions=header.querySelector('.header-actions');
    if(!actions) return;
    var wrap=document.createElement('div');
    wrap.className='gz-header-search';
    wrap.setAttribute('role','search');
    wrap.innerHTML='<input type="search" aria-label="Search products" placeholder="Search for products, brands, or categories..."><button type="button" aria-label="Search">⌕</button>';
    header.insertBefore(wrap,actions);
    var input=wrap.querySelector('input'), btn=wrap.querySelector('button');
    function go(){
      var q=(input.value||'').trim();
      var shopInput=document.querySelector('.shop-tools input');
      if(shopInput){ shopInput.value=q; shopInput.dispatchEvent(new Event('input',{bubbles:true})); shopInput.dispatchEvent(new Event('change',{bubbles:true})); }
      var shop=document.querySelector('.shop-section')||document.querySelector('#shop');
      if(shop) shop.scrollIntoView({behavior:'smooth',block:'start'});
    }
    input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();go();}});
    btn.addEventListener('click',go);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
