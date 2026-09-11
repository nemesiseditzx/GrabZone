(()=>{
'use strict';
if(!location.pathname==='/'&&!location.pathname.endsWith('/index.html'))return;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function run(){
 if(document.documentElement.dataset.gzMarketplaceHomeFix)return;
 const heading=[...document.querySelectorAll('h1,h2,h3,h4')].find(x=>String(x.textContent||'').trim().toLowerCase()==='shop by brands');
 if(!heading)return;
 let target=heading;
 while(target&&target!==document.body){const t=String(target.textContent||'');if(/Partner Brands/i.test(t)&&/View Marketplace/i.test(t))break;target=target.parentElement}
 if(!target||target===document.body)return;
 document.documentElement.dataset.gzMarketplaceHomeFix='1';
 target.style.cssText+=';grid-column:1/-1 !important;width:100% !important;max-width:1180px !important;margin:40px auto !important;padding:32px !important;box-sizing:border-box !important;';
 let brands=[];try{const r=await fetch('/api/marketplace/brands',{cache:'no-store'});if(!r.ok)throw Error(r.status);brands=(await r.json()).brands||[]}catch(e){console.warn('Marketplace home brands',e);return}
 const active=brands.filter(v=>String(v.status||'Active').toLowerCase()==='active');
 target.innerHTML=`<div class="gz-home-mp-head"><div><small>GRABZONE MARKETPLACE</small><h2>Shop by Brands</h2><p>Discover GrabZone and partner brands in one place.</p></div><a href="/marketplace" class="gz-home-mp-link">View Marketplace →</a></div><div class="gz-home-mp-grid">${active.map(v=>`<a class="gz-home-brand" href="/marketplace/brand/${encodeURIComponent(v.slug)}"><div class="gz-home-brand-logo">${v.logo_url?`<img src="${esc(v.logo_url)}" alt="${esc(v.brand_name)}">`:`<span>${esc((v.brand_name||'GZ').slice(0,2).toUpperCase())}</span>`}</div><strong>${esc(v.brand_name)}</strong><small>${esc(v.description||'Explore store')} · Visit store →</small></a>`).join('')}<a class="gz-home-brand coming" href="/marketplace"><div class="gz-home-brand-logo">+</div><strong>More Brands</strong><small>Discover all Marketplace brands →</small></a></div>`;
 const s=document.createElement('style');s.textContent=`.gz-home-mp-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:24px}.gz-home-mp-head small{font-size:10px;font-weight:900;letter-spacing:.16em;color:#777}.gz-home-mp-head h2{margin:5px 0 8px;font-size:clamp(28px,4vw,44px);letter-spacing:-.045em}.gz-home-mp-head p{margin:0;color:#777;font-size:13px}.gz-home-mp-link{font-weight:900;white-space:nowrap}.gz-home-mp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.gz-home-brand{min-width:0;display:block;padding:15px;border:1px solid #e5e5df;border-radius:18px;background:#fff;text-decoration:none;color:#111;transition:.2s transform,.2s box-shadow}.gz-home-brand:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(0,0,0,.07)}.gz-home-brand-logo{height:105px;border-radius:13px;background:#f5f5f2;display:grid;place-items:center;margin-bottom:12px;overflow:hidden}.gz-home-brand-logo img{width:100%;height:100%;object-fit:contain;padding:13px}.gz-home-brand-logo span{font-size:25px;font-weight:950}.gz-home-brand strong{display:block;font-size:15px}.gz-home-brand small{display:block;color:#777;font-size:10px;line-height:1.45;margin-top:5px}.gz-home-brand.coming{border-style:dashed;background:#fafaf8}.gz-home-brand.coming .gz-home-brand-logo{font-size:35px;font-weight:900;background:#111;color:#fff}@media(max-width:900px){.gz-home-mp-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:650px){.gz-home-mp-head{align-items:flex-start;flex-direction:column}.gz-home-mp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gz-home-mp-head{margin-bottom:18px}}@media(max-width:430px){.gz-home-mp-grid{grid-template-columns:1fr}.gz-home-brand-logo{height:130px}}`;
 document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
