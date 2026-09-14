(()=>{
'use strict';
const path=(location.pathname||'/').replace(/\/+$/,'')||'/';
if(path!=='/'&&path!=='/index.html')return;

function injectReferenceUI(){
 if(document.getElementById('gz-home-reference-css'))return;
 const s=document.createElement('style');
 s.id='gz-home-reference-css';
 s.textContent=`
html body{background:#fff;color:#101820;overflow-x:hidden}
@media(min-width:901px){
 html body .header{position:relative!important;z-index:10!important}
 html body #noticeSection{display:flex!important;min-height:34px!important;height:34px!important;align-items:center!important;box-sizing:border-box!important;background:#101820!important;color:#fff!important;overflow:hidden!important}
 html body #noticeSection>*{font-size:11px!important}
 html body .hero{width:100%!important;max-width:1440px!important;margin:0 auto!important;min-height:430px!important;padding:20px max(28px,calc((100% - 1280px)/2))!important;box-sizing:border-box!important;display:grid!important;grid-template-columns:minmax(430px,.82fr) minmax(560px,1.18fr)!important;gap:34px!important;align-items:center!important;overflow:hidden!important}
 html body .hero-copy{min-width:0!important;max-width:560px!important}
 html body .hero-copy h1{font-size:clamp(48px,4.1vw,66px)!important;line-height:.93!important;letter-spacing:-.065em!important}
 html body .hero-card{width:100%!important;height:390px!important;min-height:390px!important;max-height:390px!important;border-radius:16px!important;overflow:hidden!important}
 html body #gzHomeReferenceMarketplace{width:100vw!important;max-width:100vw!important;margin-left:calc(50% - 50vw)!important;margin-right:0!important;position:relative!important}
 html body .gz-home-brands-section{width:100%!important;padding:40px 0 44px!important;background:linear-gradient(180deg,#fff9f3 0%,#fff 100%)!important;box-sizing:border-box!important}
 html body .gz-home-brands-inner{width:min(1260px,calc(100% - 48px))!important;margin:0 auto!important}
 html body .gz-home-brands-head{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:36px!important;margin-bottom:24px!important}
 html body .gz-home-brands-head small{display:block!important;font-size:10px!important;font-weight:800!important;letter-spacing:.16em!important;color:#ff650b!important;margin-bottom:8px!important}
 html body .gz-home-brands-head h2{margin:0!important;font-size:clamp(38px,3.4vw,52px)!important;line-height:.98!important;letter-spacing:-.055em!important;color:#101820!important}
 html body .gz-home-brands-head h2 em{font-style:normal!important;color:#ff650b!important}
 html body .gz-home-brands-head p{margin:10px 0 0!important;font-size:13px!important;line-height:1.5!important;color:#68717c!important;max-width:600px!important}
 html body .gz-home-marketplace-btn{display:inline-flex!important;align-items:center!important;gap:8px!important;padding:11px 16px!important;border:1px solid #dedede!important;border-radius:999px!important;background:#fff!important;color:#101820!important;text-decoration:none!important;font-size:12px!important;font-weight:800!important;white-space:nowrap!important}
 html body .gz-home-marketplace-btn b{color:#ff650b!important;font-size:16px!important}
 html body .gz-home-brand-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:16px!important;width:100%!important}
 html body .gz-home-brand-card{display:flex!important;flex-direction:column!important;justify-content:space-between!important;min-width:0!important;min-height:245px!important;padding:22px!important;border:1px solid #ece7e2!important;border-radius:18px!important;background:#fff!important;box-shadow:0 8px 26px rgba(35,25,15,.055)!important;box-sizing:border-box!important;text-decoration:none!important;color:#101820!important}
 html body .gz-home-brand-card:hover{transform:translateY(-2px)!important;box-shadow:0 12px 30px rgba(35,25,15,.09)!important}
 html body .gz-home-brand-top{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important}
 html body .gz-home-brand-logo{width:100%!important;height:92px!important;object-fit:contain!important;object-position:left center!important}
 html body .gz-home-brand-logo-fallback{width:70px!important;height:70px!important;border-radius:16px!important;display:grid!important;place-items:center!important;background:#fff1e8!important;color:#ff650b!important;font-size:25px!important;font-weight:900!important}
 html body .gz-home-brand-badge{padding:5px 8px!important;border-radius:999px!important;background:#fff2e8!important;color:#e85c09!important;font-size:9px!important;font-weight:900!important;white-space:nowrap!important}
 html body .gz-home-brand-name{display:block!important;margin-top:14px!important;font-size:21px!important;font-weight:850!important;letter-spacing:-.025em!important}
 html body .gz-home-brand-desc{display:block!important;margin-top:6px!important;color:#69727c!important;font-size:11px!important;line-height:1.5!important;min-height:34px!important}
 html body .gz-home-brand-link{display:flex!important;align-items:center!important;justify-content:space-between!important;margin-top:16px!important;padding-top:13px!important;border-top:1px solid #f0ece8!important;color:#ff650b!important;font-size:11px!important;font-weight:850!important}
 html body .gz-home-vendor-banner{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:24px!important;margin-top:16px!important;padding:22px 24px!important;border-radius:18px!important;background:#111820!important;color:#fff!important;box-sizing:border-box!important}
 html body .gz-home-vendor-banner small{display:block!important;color:#ff9a55!important;font-size:9px!important;font-weight:900!important;letter-spacing:.14em!important}
 html body .gz-home-vendor-banner strong{display:block!important;margin-top:5px!important;font-size:24px!important;letter-spacing:-.035em!important}
 html body .gz-home-vendor-banner p{margin:4px 0 0!important;color:#aeb6be!important;font-size:11px!important}
 html body .gz-home-vendor-banner a{flex:0 0 auto!important;padding:11px 15px!important;border-radius:999px!important;background:#ff650b!important;color:#fff!important;text-decoration:none!important;font-size:11px!important;font-weight:850!important}
 html body .gz-home-benefits{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;margin-top:18px!important;border:1px solid #eee9e5!important;border-radius:16px!important;background:#fff!important;overflow:hidden!important}
 html body .gz-home-benefits>div{min-width:0!important;padding:17px 18px!important;border-right:1px solid #eee9e5!important}
 html body .gz-home-benefits>div:last-child{border-right:0!important}
 html body .gz-home-benefits span{display:block!important;font-size:19px!important;margin-bottom:8px!important}
 html body .gz-home-benefits b{display:block!important;font-size:12px!important}
 html body .gz-home-benefits small{display:block!important;margin-top:4px!important;color:#78818a!important;font-size:10px!important;line-height:1.4!important}
}
@media(min-width:901px) and (max-width:1200px){
 html body .gz-home-brand-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}
@media(max-width:900px){
 html body #noticeSection{min-height:34px!important;height:34px!important;overflow:hidden!important}
 html body .hero{min-height:0!important;padding:24px 16px 20px!important;display:grid!important;grid-template-columns:1fr!important;gap:18px!important}
 html body .hero-card{height:auto!important;min-height:260px!important;aspect-ratio:1.18/1!important;border-radius:14px!important}
 html body #gzHomeReferenceMarketplace{width:100%!important;margin:0!important}
 html body .gz-home-brands-section{padding:30px 0 34px!important}
 html body .gz-home-brands-inner{width:calc(100% - 28px)!important}
 html body .gz-home-brands-head{display:block!important;margin-bottom:18px!important}
 html body .gz-home-marketplace-btn{margin-top:14px!important}
 html body .gz-home-brand-grid{grid-template-columns:1fr!important}
 html body .gz-home-brand-card{min-height:220px!important}
 html body .gz-home-vendor-banner{display:block!important;padding:20px!important}
 html body .gz-home-vendor-banner a{display:inline-flex!important;margin-top:14px!important}
 html body .gz-home-benefits{grid-template-columns:1fr 1fr!important}
 html body .gz-home-benefits>div{border-bottom:1px solid #eee9e5!important}
 html body .gz-home-benefits>div:nth-child(2){border-right:0!important}
}
@media(max-width:480px){html body .gz-home-benefits{grid-template-columns:1fr!important}html body .gz-home-benefits>div{border-right:0!important}}
`;
 document.head.appendChild(s);
}

function first(obj,...keys){for(const k of keys){const v=obj?.[k];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return ''}
function brandUrl(b){return first(b,'url','storeUrl','link')||((first(b,'slug','storeSlug','id'))?'/marketplace?brand='+encodeURIComponent(first(b,'slug','storeSlug','id')):'/marketplace')}

function removeLegacyBrandPlaceholder(hero){
 const exact1='Official GrabZone store';
 const exact2='More brands will appear here as vendors join';
 const isLegacyText=el=>{
  if(!el||el.id==='gzHomeReferenceMarketplace'||el.closest?.('#gzHomeReferenceMarketplace'))return false;
  const t=String(el.textContent||'').replace(/\s+/g,' ').trim();
  return t.includes(exact1)||t.includes(exact2);
 };
 const candidates=[];
 if(hero?.nextElementSibling&&!hero.nextElementSibling.matches('#gzHomeReferenceMarketplace'))candidates.push(hero.nextElementSibling);
 const scope=hero?.parentElement||document.body;
 candidates.push(...[...scope.querySelectorAll('*')].filter(isLegacyText));
 for(const candidate of candidates){
  if(!candidate||candidate===hero||candidate.id==='gzHomeReferenceMarketplace'||candidate.closest?.('#gzHomeReferenceMarketplace'))continue;
  let block=candidate;
  const base=hero?.parentElement||document.body;
  while(block.parentElement&&block.parentElement!==base){
   const parentText=String(block.parentElement.textContent||'').replace(/\s+/g,' ').trim();
   if(parentText.includes(exact1)||parentText.includes(exact2))block=block.parentElement;else break;
  }
  if(block.parentElement===base){block.remove();return true;}
  if(candidate.parentElement){candidate.remove();return true;}
 }
 return false;
}

function watchForLegacyBrandPlaceholder(hero){
 const run=()=>removeLegacyBrandPlaceholder(hero);
 run();
 let tries=0;
 const timer=setInterval(()=>{if(run()||++tries>=40)clearInterval(timer)},250);
 if(window.MutationObserver){
  const observer=new MutationObserver(()=>run());
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),12000);
 }
}

async function addShopByBrands(){
 if(document.getElementById('gzHomeReferenceMarketplace'))return;
 const hero=document.querySelector('.hero');
 if(!hero){setTimeout(addShopByBrands,150);return}
 let data={brands:[]};
 try{const r=await fetch('/api/marketplace/brands',{cache:'no-store'});if(r.ok)data=await r.json()}catch{}
 const brands=Array.isArray(data.brands)?data.brands:[];
 const section=document.createElement('section');
 section.id='gzHomeReferenceMarketplace';
 section.className='gz-home-brands-section';
 section.innerHTML=`<div class="gz-home-brands-inner">
   <div class="gz-home-brands-head">
    <div><small>GRABZONE MARKETPLACE</small><h2>Shop by <em>Brands</em></h2><p>Discover GrabZone and partner brands in one place. More brands. More ways to Grab.</p></div>
    <a class="gz-home-marketplace-btn" href="/marketplace">View Marketplace <b>→</b></a>
   </div>
   <div class="gz-home-brand-grid"></div>
   <div class="gz-home-vendor-banner"><div><small>PARTNER BRANDS</small><strong>More Partner Brands</strong><p>New vendors can appear here automatically from the existing marketplace system.</p></div><a href="/vendor-apply.html">Become a Vendor <b>→</b></a></div>
   <div class="gz-home-benefits"><div><span>🛒</span><b>One Checkout</b><small>Multiple brands, one simple checkout.</small></div><div><span>🏪</span><b>More Brands</b><small>Your favorite stores in one place.</small></div><div><span>♙</span><b>One Account</b><small>Same GrabZone account everywhere.</small></div><div><span>🎁</span><b>More Rewards</b><small>Earn GrabPoints on every order.</small></div></div>
 </div>`;
 hero.insertAdjacentElement('afterend',section);
 watchForLegacyBrandPlaceholder(hero);
 const grid=section.querySelector('.gz-home-brand-grid');
 const visible=brands.slice(0,4);
 if(!visible.length){
  grid.innerHTML='<div class="gz-home-brand-card"><div><div class="gz-home-brand-top"><div class="gz-home-brand-logo-fallback">G</div><span class="gz-home-brand-badge">GRABZONE</span></div><span class="gz-home-brand-name">GrabZone</span><span class="gz-home-brand-desc">Shop products directly from the main GrabZone store.</span></div><span class="gz-home-brand-link">View store <b>→</b></span></div>';
  return;
 }
 grid.innerHTML=visible.map((b,i)=>{
  const name=esc(first(b,'name','brandName','title')||('Brand '+(i+1)));
  const desc=esc(first(b,'description','shortDescription','bio')||'Shop products from this GrabZone brand.');
  const logo=first(b,'logo','logoUrl','image','imageUrl','avatar','icon');
  const official=first(b,'isOfficial','official')===true||/grabzone/i.test(name);
  const href=brandUrl(b);
  const logoHtml=logo?`<img class="gz-home-brand-logo" src="${esc(logo)}" alt="${name} logo" loading="lazy">`:`<div class="gz-home-brand-logo-fallback">${esc((name.replace(/<[^>]*>/g,'').trim()[0]||'B').toUpperCase())}</div>`;
  return `<a class="gz-home-brand-card" href="${esc(href)}"><div><div class="gz-home-brand-top">${logoHtml}<span class="gz-home-brand-badge">${official?'OFFICIAL':'PARTNER'}</span></div><span class="gz-home-brand-name">${name}</span><span class="gz-home-brand-desc">${desc}</span></div><span class="gz-home-brand-link">View store <b>→</b></span></a>`;
 }).join('');
}

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function boot(){injectReferenceUI();addShopByBrands()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();