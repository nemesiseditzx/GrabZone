(()=>{
'use strict';
const path=(location.pathname||'/').replace(/\/+$/,'')||'/';
if(path!=='/'&&path!=='/index.html')return;
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));

const css=()=>{
  if(document.getElementById('gz-home-reference-css'))return;
  const s=document.createElement('style');
  s.id='gz-home-reference-css';
  s.textContent=`
/* =========================================================
   GRABZONE HOMEPAGE — SINGLE COORDINATED LAYOUT SYSTEM
   Header, hero, brands and product area share one container.
========================================================= */
html,body{overflow-x:hidden!important}
body{background:#fff!important;color:#101827}
#noticeSection{display:none!important}

/* ---------- SHARED WIDTH ---------- */
.header,.hero,#gzHomeReferenceMarketplace,.gz-ref-trending-head,#shop{box-sizing:border-box}

/* ---------- DESKTOP HEADER ---------- */
@media(min-width:1201px){
  html body .header{
    position:relative!important;
    top:auto!important;
    z-index:1000!important;
    width:100%!important;
    max-width:none!important;
    height:112px!important;
    min-height:112px!important;
    padding:0 max(28px,calc((100vw - 1440px)/2 + 28px))!important;
    margin:0!important;
    display:flex!important;
    align-items:flex-start!important;
    gap:0!important;
    flex-wrap:nowrap!important;
    background:rgba(255,255,255,.98)!important;
    border-bottom:1px solid #ece8e3!important;
    box-shadow:0 4px 18px rgba(20,25,30,.035)!important;
    overflow:visible!important;
  }
  html body .header .brand{
    position:absolute!important;
    left:max(28px,calc((100vw - 1440px)/2 + 28px))!important;
    top:12px!important;
    height:38px!important;
    display:flex!important;
    align-items:center!important;
    flex:0 0 auto!important;
    z-index:30!important;
    font-size:23px!important;
    font-weight:900!important;
    letter-spacing:-.04em!important;
    gap:8px!important;
  }
  html body .header .brand-mark{width:31px!important;height:31px!important;border-radius:9px!important;background:#ff650b!important;color:#fff!important;font-weight:900!important}
  html body .header>nav{
    position:absolute!important;
    left:350px!important;
    right:410px!important;
    top:13px!important;
    height:38px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    gap:28px!important;
    margin:0!important;
    padding:0!important;
    white-space:nowrap!important;
    z-index:31!important;
    overflow:visible!important;
  }
  html body .header>nav a{
    flex:0 0 auto!important;
    font-size:11px!important;
    line-height:38px!important;
    font-weight:850!important;
    color:#171d27!important;
    text-decoration:none!important;
    white-space:nowrap!important;
  }
  html body .header>nav a:hover{color:#f65b0a!important}
  html body .header>.header-actions{
    position:absolute!important;
    right:max(28px,calc((100vw - 1440px)/2 + 28px))!important;
    top:8px!important;
    height:48px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:flex-end!important;
    gap:8px!important;
    margin:0!important;
    padding:0!important;
    z-index:32!important;
    min-width:0!important;
  }
  html body .header .language-switch,html body .header .header-actions .icon-btn{display:none!important}
  html body .header .gz-ref-search-row{
    position:absolute!important;
    left:max(28px,calc((100vw - 1440px)/2 + 28px))!important;
    top:64px!important;
    bottom:auto!important;
    width:480px!important;
    height:38px!important;
    display:flex!important;
    align-items:center!important;
    z-index:40!important;
  }
  html body .header .gz-ref-search{
    width:100%!important;
    height:38px!important;
    display:flex!important;
    align-items:center!important;
    border:1px solid #e1ded9!important;
    border-radius:11px!important;
    background:#f7f7f5!important;
    overflow:hidden!important;
    box-sizing:border-box!important;
  }
  html body .header .gz-ref-search input{min-width:0!important;flex:1!important;border:0!important;outline:0!important;background:transparent!important;padding:0 13px!important;font:12px system-ui!important;color:#111!important}
  html body .header .gz-ref-search button{width:42px!important;height:100%!important;flex:0 0 42px!important;border:0!important;background:#ff650b!important;color:#fff!important;font-size:18px!important;cursor:pointer!important}
  html body .header .gz-ref-cart,html body .header .gz-ref-account,html body .header .header-actions>.btn{position:static!important;flex:0 0 auto!important}
  html body .header .gz-ref-cart{width:38px!important;height:38px!important;border:0!important;background:transparent!important;position:relative!important;font-size:19px!important;cursor:pointer!important}
  html body .header .gz-ref-cart i{position:absolute!important;right:0!important;top:0!important;min-width:15px!important;height:15px!important;padding:0 4px!important;border-radius:999px!important;background:#f65b0a!important;color:#fff!important;font:800 8px/15px system-ui!important}
  html body .header .gz-ref-account{width:38px!important;height:38px!important;border:1px solid #e4e1dc!important;border-radius:50%!important;display:grid!important;place-items:center!important;text-decoration:none!important;color:#111!important;font-size:17px!important;background:#fff!important}
}
@media(min-width:1501px){
  html body .header>nav{left:390px!important;right:430px!important;gap:31px!important}
  html body .header .gz-ref-search-row{width:500px!important}
}
@media(min-width:1201px) and (max-width:1500px){
  html body .header>nav{left:310px!important;right:350px!important;gap:18px!important}
  html body .header .gz-ref-search-row{width:420px!important}
}

/* ---------- DESKTOP HERO ---------- */
@media(min-width:1201px){
  html body .hero{
    width:100%!important;
    max-width:1440px!important;
    height:430px!important;
    min-height:430px!important;
    max-height:430px!important;
    margin:0 auto!important;
    padding:24px max(28px,calc((100% - 1384px)/2))!important;
    display:grid!important;
    grid-template-columns:minmax(0,1fr) minmax(560px,1.15fr)!important;
    align-items:center!important;
    gap:48px!important;
    box-sizing:border-box!important;
    overflow:hidden!important;
  }
  html body .hero-copy{min-width:0!important;max-width:600px!important}
  html body .hero-copy h1{font-size:clamp(52px,4.4vw,72px)!important;line-height:.93!important;letter-spacing:-.065em!important;margin:8px 0 14px!important}
  html body .hero-copy p{max-width:560px!important;font-size:13px!important;line-height:1.58!important;color:#6e7680!important}
  html body .hero-buttons{margin:18px 0!important}
  html body .hero-buttons .btn{background:#ff650b!important;border-color:#ff650b!important;border-radius:11px!important}
  html body .hero-buttons .text-link{font-weight:850!important}
  html body .trust{gap:22px!important;font-size:10px!important;color:#4d5864!important}
  html body .hero-card{width:100%!important;height:370px!important;min-height:370px!important;max-height:370px!important;border-radius:20px!important;overflow:hidden!important}
}
@media(min-width:1501px){html body .hero{grid-template-columns:minmax(480px,560px) minmax(620px,720px)!important;gap:56px!important;height:440px!important;min-height:440px!important;max-height:440px!important}.hero-card{height:390px!important;min-height:390px!important;max-height:390px!important}}
@media(min-width:1201px) and (max-width:1500px){html body .hero{grid-template-columns:minmax(390px,510px) minmax(500px,660px)!important;gap:34px!important;height:420px!important;min-height:420px!important;max-height:420px!important}.hero-card{height:360px!important;min-height:360px!important;max-height:360px!important}}

/* ---------- BRANDS + TRENDING ---------- */
@media(min-width:1201px){
  html body #gzHomeReferenceMarketplace{margin-top:0!important}
  html body .gz-home-brands-section{width:100%!important;padding:34px 0 42px!important;background:linear-gradient(180deg,#fff9f3 0%,#fff 100%)!important}
  html body .gz-home-brands-inner{width:min(1320px,calc(100% - 56px))!important;margin:0 auto!important}
  html body .gz-home-brands-head{margin-bottom:20px!important}
  html body .gz-home-brands-head h2{font-size:clamp(34px,3.7vw,52px)!important;line-height:1!important;letter-spacing:-.055em!important}
  html body .gz-home-brand-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:16px!important}
  html body .gz-home-brand-card{min-height:225px!important}
  html body .gz-home-brand-logo{height:92px!important}
  html body .gz-ref-trending-head{max-width:1320px!important;margin:0 auto!important;padding:34px 0 12px!important;display:flex!important;justify-content:space-between!important;align-items:flex-end!important}
  html body .gz-ref-trending-head h2{font-size:36px!important;margin:5px 0 0!important;letter-spacing:-.05em!important}
  html body #shop{padding-top:24px!important}
  html body .product-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:12px!important}
}

/* ---------- TABLET ---------- */
@media(max-width:1200px) and (min-width:761px){
  html body .header{position:relative!important;height:112px!important;min-height:112px!important;display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;grid-template-rows:58px 54px!important;padding:0 24px!important;gap:0 16px!important;overflow:visible!important}
  html body .header .brand{grid-column:1;grid-row:1!important;align-self:center!important}
  html body .header>nav{grid-column:2;grid-row:1!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:13px!important;white-space:nowrap!important}
  html body .header>nav a{font-size:10px!important}
  html body .header>.header-actions{grid-column:3;grid-row:1!important;display:flex!important;align-items:center!important}
  html body .header .gz-ref-search-row{position:absolute!important;left:24px!important;top:64px!important;width:min(390px,44vw)!important;height:38px!important}
  html body .header .gz-ref-search{width:100%!important;height:38px!important}
  html body .hero{width:100%!important;min-height:0!important;height:auto!important;padding:28px 30px 34px!important;grid-template-columns:1fr!important;gap:24px!important}
  html body .hero-card{height:auto!important;aspect-ratio:1.82/1!important;max-height:none!important}
  html body .product-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}
  html body .gz-home-brand-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}

/* ---------- MOBILE ---------- */
@media(max-width:760px){
  html body .header{position:relative!important;height:112px!important;min-height:112px!important;display:flex!important;flex-wrap:wrap!important;align-content:flex-start!important;padding:0 14px!important;gap:0!important;overflow:visible!important}
  html body .header>.brand{position:static!important;width:auto!important;height:58px!important;display:flex!important;align-items:center!important;font-size:18px!important}
  html body .header>nav{display:none!important}
  html body .header>.header-actions{height:58px!important;margin-left:auto!important;display:flex!important;align-items:center!important;gap:4px!important}
  html body .header .gz-ref-search-row{position:absolute!important;left:14px!important;right:14px!important;top:64px!important;bottom:auto!important;width:auto!important;height:40px!important}
  html body .header .gz-ref-search{width:100%!important;height:40px!important}
  html body .header .gz-ref-search input{font-size:11px!important}
  html body .hero{width:100%!important;height:auto!important;min-height:0!important;padding:24px 16px 20px!important;display:grid!important;grid-template-columns:1fr!important;gap:18px!important}
  html body .hero-copy h1{font-size:clamp(42px,12vw,62px)!important;line-height:.94!important}
  html body .hero-copy p{font-size:12px!important}
  html body .hero-buttons{flex-wrap:wrap!important;gap:10px!important}
  html body .hero-card{height:auto!important;aspect-ratio:1.18/1!important;min-height:260px!important;max-height:none!important;border-radius:18px!important}
  html body .gz-home-brands-section{padding-top:30px!important}
  html body .gz-home-brands-inner{width:calc(100% - 28px)!important}
  html body .gz-home-brand-grid{grid-template-columns:1fr!important}
  html body .gz-home-brands-head{flex-direction:column!important;align-items:flex-start!important;gap:16px!important}
  html body .gz-home-brand-card{min-height:220px!important}
  html body .gz-home-vendor-banner{align-items:flex-start!important;flex-direction:column!important}
  html body .gz-ref-trending-head{padding:25px 14px 8px!important}
  html body .gz-ref-trending-head h2{font-size:30px!important}
  html body .product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
}
@media(max-width:480px){html body .hero{padding:22px 14px 16px!important}.hero-card{aspect-ratio:1/1!important;min-height:240px!important}.product-grid{gap:8px!important}.product-info{padding:9px!important}.product-name{font-size:10.5px!important}.price{font-size:14px!important}}
`;
  document.head.appendChild(s);
};

function removeLegacy(){
  for(const el of document.querySelectorAll('body *')){
    const t=String(el.textContent||'').replace(/\s+/g,' ').trim();
    if(t==='Official GrabZone store'){
      let n=el;
      for(let i=0;i<10&&n&&n!==document.body;i++,n=n.parentElement){
        const x=String(n.textContent||'').replace(/\s+/g,' ').trim();
        if(/Partner Brands/i.test(x)&&x.length<900){n.remove();break}
      }
    }
  }
}

function header(){
  const h=document.querySelector('.header');
  if(!h||h.dataset.gzRef==='1')return;
  h.dataset.gzRef='1';
  const nav=h.querySelector('nav');
  if(nav){
    nav.innerHTML='<a href="/" class="active">Home</a><a href="/marketplace">Marketplace</a><a href="#categories">Categories⌄</a><a href="/grabpoints.html">GrabPoints</a><a href="/track-order.html">Track Order</a><a href="#support">Support</a><a href="#policies">Policies</a>';
  }
  const actions=h.querySelector('.header-actions');
  if(!actions)return;
  const oldDm=document.getElementById('headerDm');
  if(oldDm)oldDm.style.display='none';

  const row=document.createElement('div');
  row.className='gz-ref-search-row';
  const box=document.createElement('div');
  box.className='gz-ref-search';
  box.innerHTML='<input id="gzRefSearch" placeholder="Search products, brands, or categories..." autocomplete="off"><button type="button">⌕</button>';
  row.appendChild(box);
  h.appendChild(row);

  const cart=document.createElement('button');
  cart.className='gz-ref-cart';
  cart.type='button';
  cart.innerHTML='🛒<i id="gzRefCartCount"></i>';
  actions.appendChild(cart);

  const acc=document.createElement('a');
  acc.className='gz-ref-account';
  acc.href='/grabpoints.html';
  acc.innerHTML='♙';
  actions.appendChild(acc);

  const count=()=>{
    try{
      const a=JSON.parse(localStorage.getItem('grabzone_cart_v2')||'[]');
      const n=a.reduce((x,y)=>x+Number(y.quantity||1),0);
      const e=document.getElementById('gzRefCartCount');
      if(e)e.textContent=n||'';
    }catch{}
  };
  cart.onclick=()=>window.GrabZoneCart?.open?window.GrabZoneCart.open():(document.getElementById('headerDm')?.click(),location.href='/checkout.html');
  box.querySelector('button').onclick=()=>{
    const q=box.querySelector('input').value.trim(),s=document.getElementById('search');
    if(s){s.value=q;s.dispatchEvent(new Event('input',{bubbles:true}));s.scrollIntoView({behavior:'smooth',block:'center'})}
  };
  box.querySelector('input').addEventListener('keydown',e=>{if(e.key==='Enter')box.querySelector('button').click()});
  window.addEventListener('storage',count);
  window.addEventListener('grabzone-cart-updated',count);
  count();
}

async function brands(){
  if(document.getElementById('gzHomeReferenceMarketplace'))return;
  const hero=document.querySelector('.hero');
  if(!hero)return setTimeout(brands,120);
  let data={brands:[]};
  try{const r=await fetch('/api/marketplace/brands',{cache:'no-store'});if(r.ok)data=await r.json()}catch{}
  const list=Array.isArray(data.brands)?data.brands:[];
  const section=document.createElement('section');
  section.id='gzHomeReferenceMarketplace';
  section.className='gz-home-brands-section';
  section.innerHTML='<div class="gz-home-brands-inner"><div class="gz-home-brands-head"><div><small>GRABZONE MARKETPLACE</small><h2>Shop by <em>Brands</em></h2><p>Discover GrabZone and partner brands in one place. More brands. More ways to Grab.</p></div><a class="gz-home-marketplace-btn" href="/marketplace">View Marketplace <b>→</b></a></div><div class="gz-home-brand-grid"></div><div class="gz-home-vendor-banner"><div><small>COMING SOON</small><strong>More Partner Brands</strong><p>Even more amazing brands will appear here as new vendors join GrabZone.</p></div><a href="/vendor-apply.html">Become a Vendor <b>→</b></a></div><div class="gz-home-benefits"><div><span>🛒</span><b>One Checkout</b><small>Multiple brands, one simple checkout.</small></div><div><span>🏪</span><b>More Brands</b><small>Your favorite stores in one place.</small></div><div><span>♙</span><b>One Account</b><small>Same GrabZone account everywhere.</small></div><div><span>🎁</span><b>More Rewards</b><small>Earn GrabPoints on every order.</small></div></div></div>';
  hero.insertAdjacentElement('afterend',section);
  const grid=section.querySelector('.gz-home-brand-grid');
  grid.innerHTML=list.slice(0,4).map((b,i)=>{
    const name=b.brand_name||b.business_name||b.slug||'Brand';
    const logo=b.logo_url?'<img src="'+esc(b.logo_url)+'" alt="'+esc(name)+'">':'<span>'+esc(name.slice(0,2).toUpperCase())+'</span>';
    const desc=b.description||('Explore products from '+name+'.');
    return '<a class="gz-home-brand-card" href="/marketplace/brand/'+encodeURIComponent(b.slug||'')+'"><div class="gz-home-brand-top"><span class="gz-home-brand-badge">'+(i===0?'Official':'Partner')+'</span></div><div class="gz-home-brand-logo">'+logo+'</div><strong>'+esc(name)+'</strong><small>'+esc(desc)+'</small><div class="gz-home-brand-store"><span>🛍️ &nbsp; View store →</span><b>›</b></div></a>';
  }).join('');
  if(!list.length)grid.innerHTML='<div style="grid-column:1/-1;padding:30px;text-align:center;color:#777">No marketplace brands available yet.</div>';
}

function trending(){
  const shop=document.getElementById('shop');
  if(!shop||shop.dataset.gzRefShop==='1')return;
  shop.dataset.gzRefShop='1';
  const head=shop.querySelector('.section-head');
  if(head){
    const title=head.querySelector('h2');
    if(title){title.textContent='Trending Now';title.removeAttribute('data-i18n')}
    const eye=head.querySelector('.eyebrow');
    if(eye){eye.textContent='POPULAR PRODUCTS FROM OUR PARTNER BRANDS';eye.removeAttribute('data-i18n')}
  }
  shop.insertAdjacentHTML('beforebegin','<div class="gz-ref-trending-head"><div><small>GRABZONE</small><h2>Trending Now</h2></div><a href="#shop">View All →</a></div>');
}

function run(){css();removeLegacy();header();brands();trending();setTimeout(removeLegacy,700);setTimeout(removeLegacy,1800);setTimeout(removeLegacy,4000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();