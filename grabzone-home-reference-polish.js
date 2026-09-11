(()=>{
'use strict';
if(!/^\/(?:index\.html)?$/.test(location.pathname))return;
function apply(){
  if(!document.querySelector('.gh-page'))return setTimeout(apply,100);
  if(document.getElementById('gz-reference-polish'))return;
  const s=document.createElement('style');s.id='gz-reference-polish';s.textContent=`
    .gh-page{overflow-x:hidden;background:#fff}
    .gh-nav{max-width:1320px;height:72px;gap:26px;padding:0 28px}
    .gh-nav nav{gap:28px}
    .gh-nav nav a{font-size:12px}
    .gh-hero{max-width:1320px;grid-template-columns:.84fr 1.16fr;gap:42px;padding:20px 28px 34px;min-height:520px}
    .gh-copy h1{font-size:clamp(52px,5.2vw,76px);margin:16px 0 18px}
    .gh-copy p{font-size:14px;max-width:590px}
    .gh-deal,#gzManagedBillboard{width:100%;min-height:500px;border-radius:22px}
    #gzManagedBillboard .gz-bb-head{padding:22px 28px 0}
    #gzManagedBillboard .gz-bb-head b{font-size:48px}
    #gzManagedBillboard .gz-bb-main{height:270px;padding:0 18px}
    #gzManagedBillboard .gz-bb-image{height:250px}
    #gzManagedBillboard .gz-bb-copy strong{font-size:52px}
    #gzManagedBillboard .gz-bb-specs{padding:12px 20px 16px}
    #gzManagedBillboard .gz-bb-foot{padding:13px 24px}
    #gzMarketplaceNotice{height:44px!important;background:#11151a!important;display:flex!important;width:100vw!important;margin-left:calc(50% - 50vw)!important}
    #gzMarketplaceNotice .notice-label{height:44px!important;min-width:112px!important;padding:0 18px!important;background:#ff650b!important;font-size:11px!important;letter-spacing:.12em!important}
    #gzMarketplaceNotice .notice-track{height:44px!important}
    #gzMarketplaceNotice .gzNoticeItem{height:44px!important;font-size:14px!important;margin-right:110px!important}
    #gzMarketplaceNotice .gzNoticeItem b{font-weight:900!important;margin-right:14px!important}
    .gh-brands{padding:62px 28px;background:linear-gradient(180deg,#fff8f1,#fff)}
    .gh-section-head,.gh-brand-grid,.gh-vendor,.gh-feature-row,.gh-products{max-width:1320px}
    .gh-section-head h2{font-size:52px}
    .gh-brand-grid{grid-template-columns:repeat(4,1fr);gap:16px}
    .gh-brand{min-height:225px;padding:20px}
    @media(max-width:1000px){.gh-nav{padding:0 18px}.gh-hero{grid-template-columns:1fr;max-width:900px}.gh-deal,#gzManagedBillboard{min-height:480px}.gh-brand-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:700px){.gh-nav{height:auto;min-height:62px}.gh-hero{padding:18px 16px 26px}.gh-copy h1{font-size:46px}.gh-deal,#gzManagedBillboard{min-height:0}.gh-brands{padding:45px 16px}.gh-section-head h2{font-size:38px}#gzMarketplaceNotice{height:40px!important}#gzMarketplaceNotice .notice-label{height:40px!important;min-width:86px!important;padding:0 12px!important;font-size:10px!important}#gzMarketplaceNotice .gzNoticeItem{height:40px!important;font-size:11px!important;margin-right:65px!important}}
  `;document.head.appendChild(s);
  const n=document.querySelector('#gzMarketplaceNotice .notice-label');if(n)n.textContent='NOTICE';
  const r=document.querySelector('.gh-account');if(r){r.classList.add('gh-rewards');r.title='GrabPoints Rewards';r.innerHTML='🎁 <span>Rewards</span>';r.href='/grabpoints.html'}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,120),{once:true});else setTimeout(apply,120);
})();