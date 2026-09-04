window.GRABZONE_CONFIG = {
  backendUrl: "https://grabzone.nemesiseditzx984.workers.dev",
  storeName: "GRABZONE",
  tagline: "Grab What's Trending.",
  currency: "৳",
  shippingCharge: 130,
  dhakaShippingCharge: 70,
  outsideDhakaShippingCharge: 130,
  whatsapp: "https://wa.me/8801XXXXXXXXX",
  messenger: "https://m.me/yourpage",
  instagram: "https://instagram.com/yourstore"
};

/* Mobile layout layer: keeps desktop untouched and fixes narrow-screen spacing. */
(function(){
  if(document.getElementById('gzMobileLayoutFix'))return;
  var s=document.createElement('style');
  s.id='gzMobileLayoutFix';
  s.textContent=`
@media(max-width:700px){
  html,body{width:100%;max-width:100%;overflow-x:hidden}
  img{max-width:100%}

  /* Storefront header */
  .header{height:64px;padding:0 14px;gap:10px}
  .header .brand{gap:7px;min-width:0}
  .header .brand-mark{width:32px;height:32px;min-width:32px}
  .header .brand span:last-child{font-size:16px;white-space:nowrap}
  .header nav{display:none}
  .header-actions{margin-left:auto;gap:6px}
  .header-actions .btn{min-height:38px;padding:8px 11px;font-size:11px}
  .header-actions .icon-btn{font-size:20px;padding:7px}

  /* Notice bar */
  .notice-wrap{height:38px}
  .notice-label{flex-basis:68px;width:68px;padding:0 7px;font-size:9px}
  .notice-item{font-size:11px;margin-right:65px}
  .notice-item b{margin-right:9px}

  /* Home hero */
  .hero{min-height:auto;display:flex;flex-direction:column;align-items:stretch;gap:28px;padding:46px 26px 34px}
  .hero h1{font-size:clamp(42px,12vw,58px);line-height:.94;letter-spacing:-.065em;margin-bottom:20px}
  .hero p{font-size:16px;line-height:1.55}
  .hero-buttons{gap:14px;margin:24px 0;flex-wrap:wrap}
  .hero-buttons .btn{min-height:46px}
  .trust{gap:9px 16px;font-size:10px}
  .hero-card{height:360px;border-radius:22px;padding:18px}
  .hero-product-shape{font-size:110px}

  /* Offer */
  .offer-strip{margin:16px 14px;padding:14px 16px;gap:10px;align-items:flex-start;flex-direction:column}
  .offer-strip>div:first-child{gap:8px;font-size:12px}
  .offer-strip .btn{width:100%;min-height:42px}

  /* Shop */
  .shop-section,.how-section{padding:58px 18px}
  .section-head{display:block;margin-bottom:22px}
  .section-head h2,.how-section h2,.ref-section h2{font-size:36px;line-height:1.02}
  .shop-tools{display:grid;gap:10px;margin-top:18px}
  .shop-tools input{width:100%;min-height:44px}
  .chips{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
  .chips::-webkit-scrollbar{display:none}
  .chip{flex:0 0 auto;padding:9px 12px}
  .product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .product-info{padding:12px}
  .product-name{font-size:13px;line-height:1.3}
  .price{font-size:16px}

  /* How-to-order */
  .steps{grid-template-columns:1fr;gap:10px;margin-top:24px;background:transparent}
  .step{min-height:0;padding:22px 20px;border:1px solid #ddd;border-radius:18px;background:#f6f6f3}
  .step h3{font-size:20px;margin-bottom:8px}
  .step p{font-size:14px;line-height:1.55}

  /* Referral/footer */
  .ref-section{margin:54px 18px}
  .footer{padding:20px 18px;display:grid;gap:8px;text-align:center}
}

/* GrabPoints page/dashboard */
@media(max-width:700px){
  .top{height:64px;padding:0 14px}
  .top .brand{gap:8px}
  .top .brand-mark{width:38px;height:38px;min-width:38px}
  .top .brand>span:last-child{font-size:16px}
  .top .brand small{font-size:9px}
  .top .nav{display:none}
  .top .lang{margin-left:auto}
  .top .lang button{padding:8px 11px;font-size:11px}

  .wrap{width:100%;max-width:none;margin:0;padding:26px 12px 60px}
  .rewards-shell{width:100%;padding:12px;border-radius:20px;box-shadow:none}
  .rewards-head{gap:16px;margin-bottom:14px}
  .rewards-head h1{font-size:clamp(32px,9vw,46px);line-height:.98;letter-spacing:-.045em}
  .rewards-head p{font-size:14px;line-height:1.5}
  .account-help{min-width:0;width:100%;padding:14px}
  .app-card{width:100%;padding:8px;border-radius:18px;box-shadow:none}
  #gzRewardsApp{width:100%;min-width:0}

  .gz-rewards-dashboard{width:100%;max-width:none;padding:10px;border-radius:18px}
  .gz-dash-hero{width:100%;min-height:0;padding:20px;border-radius:18px}
  .gz-dash-hero h2{font-size:23px;line-height:1.12;margin:6px 0 9px}
  .gz-dash-hero p{font-size:13px;line-height:1.55}
  .gz-dash-layout{grid-template-columns:1fr;gap:10px;margin-top:10px}
  .gz-dash-main{width:100%;min-width:0}
  .gz-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .gz-stat{min-height:112px;padding:14px;border-radius:15px}
  .gz-stat small{font-size:9px;line-height:1.2}
  .gz-stat b{font-size:27px;margin-top:11px}
  .gz-stat span{font-size:10px;line-height:1.35}
  .gz-stat.tier b{font-size:22px}
  .gz-dash-card{padding:14px;border-radius:15px}
  .gz-next-head{align-items:flex-start;flex-direction:column;gap:4px}
  .gz-next-head strong{font-size:15px}
  .gz-progress-meta{font-size:10px}
  .gz-benefit-box{padding:13px}
  .gz-benefit-box ul{font-size:11px;line-height:1.65}
  .gz-quick{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .gz-quick a{min-height:62px;padding:11px;font-size:11px}
  .gz-history-side{display:none}
  .gz-rewards-actions{grid-template-columns:1fr;gap:8px}
  .gz-voucher{padding:13px}
  .gz-order-details{grid-template-columns:1fr}
  .gz-order-item-full{grid-template-columns:38px minmax(0,1fr) auto}
  .gz-order-history-head{flex-direction:column}
  .gz-order-history-status{align-self:flex-start}

  .membership-cta{padding:16px;margin-top:12px;border-radius:16px}
  .membership-cta h3{font-size:16px}
  .membership-cta p{font-size:12px}
  .membership-cta .btn{width:100%;min-height:44px}
  .section{margin-top:48px}
  .section-head{margin-bottom:18px}
  .section-head h2{font-size:30px}
  .section-head p{font-size:14px}
  .cards,.guide,.security{grid-template-columns:1fr;gap:10px}
  .card{padding:18px;border-radius:17px}
  .card p{font-size:13px;line-height:1.55}
  .tier-grid{grid-template-columns:1fr;gap:10px}
  .tier{min-height:0;padding:17px;border-radius:16px}
  .footer{padding:20px 14px;display:flex;justify-content:space-between;gap:8px}
}

@media(max-width:380px){
  .hero{padding-left:20px;padding-right:20px}
  .hero h1{font-size:39px}
  .product-grid{gap:9px}
  .product-info{padding:10px}
  .gz-stat-grid{grid-template-columns:1fr}
  .gz-quick{grid-template-columns:1fr}
  .wrap{padding-left:9px;padding-right:9px}
}
`;
  document.head.appendChild(s);
})();