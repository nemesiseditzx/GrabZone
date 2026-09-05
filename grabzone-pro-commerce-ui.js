/* GrabZone visual UX enhancer — no settings/data/backend changes. */
(function(){
  function addMobilePolish(){
    if(document.querySelector('[data-gz-mobile-polish]')) return;
    var s=document.createElement('style');
    s.setAttribute('data-gz-mobile-polish','1');
    s.textContent='@media(max-width:760px){\n'+
      'html,body{width:100%;overflow-x:hidden!important}\n'+
      '.notice-wrap{height:34px!important}\n'+
      '.notice-label{width:64px!important;flex-basis:64px!important;font-size:9px!important}\n'+
      '.notice-item{font-size:10px!important;margin-right:28px!important}\n'+
      '.header{position:sticky!important;top:0!important;height:116px!important;min-height:116px!important;width:100%!important;box-sizing:border-box!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto auto!important;grid-template-rows:58px 50px!important;gap:8px!important;padding:9px 12px!important;background:rgba(255,255,255,.97)!important;box-shadow:0 8px 25px rgba(16,22,29,.07)!important}\n'+
      '.brand{grid-column:1!important;grid-row:1!important;order:initial!important;min-width:0!important;font-size:18px!important;gap:8px!important;align-self:center!important}\n'+
      '.brand-mark{width:36px!important;height:36px!important;border-radius:11px!important}\n'+
      '.gz-header-search{grid-column:1 / -1!important;grid-row:2!important;order:initial!important;width:100%!important;height:44px!important;margin:0!important;border-radius:13px!important}\n'+
      '.gz-header-search input{font-size:12px!important;padding:0 13px!important}\n'+
      '.gz-header-search button{width:44px!important}\n'+
      '.header-actions{grid-column:2!important;grid-row:1!important;order:initial!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:5px!important;margin:0!important;min-width:0!important}\n'+
      '.header-actions .btn{min-height:38px!important;height:38px!important;padding:7px 9px!important;border-radius:11px!important}\n'+
      '.header-actions .btn:not(.btn-dark),.header-actions .icon-btn,#headerDm{display:none!important}\n'+
      '.header-actions .language-switch{display:flex!important;margin:0!important;height:32px!important;box-sizing:border-box!important}\n'+
      '.header-actions .lang-btn{padding:4px 7px!important;font-size:9px!important}\n'+
      '.mobile-menu-btn{grid-column:3!important;grid-row:1!important;order:initial!important;display:block!important;width:38px!important;height:38px!important;padding:8px!important;border-radius:11px!important;align-self:center!important}\n'+
      '.mobile-nav{top:calc(100% + 6px)!important;left:10px!important;right:10px!important;border-radius:16px!important;box-shadow:0 18px 45px rgba(16,22,29,.16)!important}\n'+
      '.mobile-nav a{padding:12px 13px!important;font-size:13px!important}\n'+
      '.hero{grid-template-columns:1fr!important;gap:18px!important;padding:28px 14px 22px!important}\n'+
      '.hero-copy{width:100%!important}\n'+
      '.eyebrow{margin-bottom:11px!important;padding:6px 10px!important}\n'+
      '.hero h1{font-size:clamp(40px,11.5vw,55px)!important;line-height:.95!important;letter-spacing:-.065em!important;margin-bottom:14px!important}\n'+
      '.hero p{font-size:13px!important;line-height:1.55!important}\n'+
      '.hero-buttons{display:flex!important;flex-wrap:wrap!important;gap:8px!important;margin:18px 0 15px!important}\n'+
      '.hero-buttons .btn{min-height:44px!important;padding:10px 15px!important;border-radius:11px!important}\n'+
      '.trust{gap:10px!important;font-size:9px!important;flex-wrap:wrap!important}\n'+
      '.hero-card{width:100%!important;aspect-ratio:1.58 / 1!important;border-radius:17px!important}\n'+
      '.offer-strip{width:calc(100% - 20px)!important;min-height:48px!important;box-sizing:border-box!important;padding:10px 12px!important;border-radius:12px!important;font-size:11px!important}\n'+
      '.shop-section{padding:40px 12px 52px!important}\n'+
      '.section-head h2{font-size:31px!important;margin-bottom:13px!important}\n'+
      '.shop-tools input{height:42px!important}\n'+
      '.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}\n'+
      '.product-card{border-radius:12px!important}\n'+
      '.product-image{aspect-ratio:1.18 / 1!important}\n'+
      '.product-info{padding:10px!important}\n'+
      '.product-name{font-size:11.5px!important;line-height:1.25!important;min-height:29px!important}\n'+
      '.price{font-size:15px!important}\n'+
      '.product-card .btn{min-height:36px!important;border-radius:9px!important;font-size:9.5px!important}\n'+
      '.how-section{padding:48px 12px!important}\n'+
      '.ref-section,.gz-points-section,.detail{width:calc(100% - 20px)!important;border-radius:15px!important}\n'+
      '}';
    document.head.appendChild(s);
  }
  function init(){
    addMobilePolish();
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
