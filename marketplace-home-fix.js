(()=>{
'use strict';
if(location.pathname!=='/'&&!location.pathname.endsWith('/index.html'))return;

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function cleanOldSections(){
  document.querySelectorAll('.gz-mp-brand-bg,.gh-brands,[data-gz-home-brands]').forEach(el=>el.remove());
}

function findHero(){
  return document.querySelector('main > .hero,#billboard')?.closest('section')||document.querySelector('main > section.hero')||document.querySelector('.hero');
}

function brandCard(v,i){
  const n=v.brand_name||v.business_name||v.slug||'Brand';
  const logo=v.logo_url
    ? '<img src="'+esc(v.logo_url)+'" alt="'+esc(n)+'">'
    : '<span>'+esc(n.slice(0,2).toUpperCase())+'</span>';
  return '<a class="gz-home-brand-card" href="/marketplace/brand/'+encodeURIComponent(v.slug||'')+'">'
    +'<div class="gz-home-brand-top"><span class="gz-home-brand-badge">'+(i===0?'Official':'Partner')+'</span></div>'
    +'<div class="gz-home-brand-logo">'+logo+'</div>'
    +'<strong>'+esc(n)+'</strong>'
    +'<small>'+esc(v.description||'Explore the store and discover more.')+'</small>'
    +'<div class="gz-home-brand-store"><span>View store</span><b>→</b></div>'
    +'</a>';
}

function render(brands){
  cleanOldSections();
  const hero=findHero();
  if(!hero||!hero.parentElement)return;

  const section=document.createElement('section');
  section.className='gz-home-brands-section';
  section.setAttribute('data-gz-home-brands','true');
  section.innerHTML='<div class="gz-home-brands-inner">'
    +'<div class="gz-home-brands-head">'
      +'<div><small>GRABZONE MARKETPLACE</small><h2>Shop by <em>Brands</em></h2><p>Discover GrabZone and partner brands in one place. More brands. More ways to Grab.</p></div>'
      +'<a class="gz-home-marketplace-btn" href="/marketplace">View Marketplace <b>→</b></a>'
    +'</div>'
    +'<div class="gz-home-brand-grid">'+brands.slice(0,4).map(brandCard).join('')+'</div>'
    +'<div class="gz-home-vendor-banner"><div><small>COMING SOON</small><strong>More Partner Brands</strong><p>More amazing brands will appear here as new vendors join GrabZone.</p></div><a href="/vendor-apply.html">Become a Vendor <b>→</b></a></div>'
    +'<div class="gz-home-benefits">'
      +'<div><span>🛒</span><b>One Checkout</b><small>Multiple brands, one simple checkout.</small></div>'
      +'<div><span>▣</span><b>More Brands</b><small>Your favorite stores in one place.</small></div>'
      +'<div><span>♙</span><b>One Account</b><small>Same GrabZone account everywhere.</small></div>'
      +'<div><span>🎁</span><b>More Rewards</b><small>Earn GrabPoints on every order.</small></div>'
    +'</div>'
  +'</div>';

  hero.insertAdjacentElement('afterend',section);
}

async function boot(){
  if(document.documentElement.dataset.gzHomeBrandsFixed)return;
  document.documentElement.dataset.gzHomeBrandsFixed='1';
  let brands=[];
  try{
    const r=await fetch('/api/marketplace/brands',{cache:'no-store'});
    if(r.ok)brands=(await r.json()).brands||[];
  }catch{}
  render(brands);
}

function start(){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
start();
})();