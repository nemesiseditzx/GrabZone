(()=>{'use strict';
if(document.getElementById('gzMobileAppNav'))return;
const p=location.pathname.toLowerCase();
if(/checkout|payment-method|admin|vendor-|marketplace-(admin|products|sales|settings|shipping|stores|track|vendor-control)/.test(p))return;
const icons={
 home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
 stores:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 4v16"/></svg>',
 shop:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>',
 rewards:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>',
 cart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L22 8H6"/><circle cx="10" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/></svg>',
 track:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17l9-10"/></svg>'
};
const nav=document.createElement('nav');nav.id='gzMobileAppNav';nav.setAttribute('aria-label','Main navigation');
const active=(test)=>test.test(p)?' active':'';
nav.innerHTML=
'<a class="gz-nav-link'+active(/^\/$|index\.html$/)+'" href="/" aria-label="Home">'+icons.home+'<b>Home</b></a>'+
'<a class="gz-nav-link'+active(/marketplace/)+'" href="/marketplace" aria-label="Stores">'+icons.stores+'<b>Stores</b></a>'+
'<a class="gz-nav-link'+active(/product\.html|brand\.html|shop/)+'" href="/#shop" aria-label="Shop">'+icons.shop+'<b>Shop</b></a>'+
'<a class="gz-nav-link'+active(/grabpoints/)+'" href="/grabpoints.html" aria-label="Rewards">'+icons.rewards+'<b>Rewards</b></a>'+
'<button class="gz-nav-link" type="button" id="gzMobileCart" aria-label="Open cart">'+icons.cart+'<b>Cart</b><i id="gzMobileCartCount">0</i></button>'+
'<a class="gz-nav-link'+active(/track-order|tracking/)+'" href="/track-order.html" aria-label="Track">'+icons.track+'<b>Track</b></a>';
document.body.appendChild(nav);
const style=document.createElement('style');style.id='gzMobileAppNavStyle';style.textContent=`
#gzMobileAppNav{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom));z-index:99990;width:min(680px,calc(100vw - 40px));height:76px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));align-items:center;gap:5px;padding:8px 10px;border:1px solid rgba(20,24,32,.09);border-radius:26px;background:rgba(255,255,255,.91);box-shadow:0 18px 50px rgba(17,24,39,.16),0 3px 12px rgba(17,24,39,.07),inset 0 1px 0 rgba(255,255,255,.9);backdrop-filter:blur(22px) saturate(1.3);-webkit-backdrop-filter:blur(22px) saturate(1.3)}
#gzMobileAppNav .gz-nav-link{position:relative;min-width:0;height:58px;border:0;border-radius:18px;background:transparent;color:#777;text-decoration:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font:inherit;cursor:pointer;transition:background .22s ease,color .22s ease,transform .22s ease,box-shadow .22s ease}
#gzMobileAppNav .gz-nav-link svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}
#gzMobileAppNav .gz-nav-link b{font-size:11px;font-weight:750;line-height:1.1;letter-spacing:.01em}
#gzMobileAppNav .gz-nav-link.active{color:#f65b0a;background:linear-gradient(145deg,#fff0e5,#fff8f2);box-shadow:inset 0 0 0 1px rgba(246,91,10,.12),0 4px 12px rgba(246,91,10,.07)}
#gzMobileAppNav .gz-nav-link:hover{color:#f65b0a;background:#fff4eb;transform:translateY(-2px)}
#gzMobileAppNav .gz-nav-link:active{transform:scale(.96)}
#gzMobileCartCount{position:absolute;top:4px;right:calc(50% - 26px);min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#ff650b;color:#fff;font-size:10px;font-weight:800;font-style:normal;display:none;place-items:center;border:2px solid #fff}
body{padding-bottom:112px!important}
@media(max-width:640px){
#gzMobileAppNav{left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom));transform:none;width:auto;height:64px;padding:5px 4px;gap:2px;border-radius:22px}
#gzMobileAppNav .gz-nav-link{height:52px;border-radius:15px;gap:3px}
#gzMobileAppNav .gz-nav-link svg{width:19px;height:19px}
#gzMobileAppNav .gz-nav-link b{font-size:9px;line-height:10px}
#gzMobileCartCount{top:1px;right:12%;min-width:16px;height:16px;font-size:9px}
body{padding-bottom:82px!important}
}
@media(prefers-reduced-motion:reduce){#gzMobileAppNav .gz-nav-link{transition:none!important}}
`;document.head.appendChild(style);
const update=()=>{let c=[];try{c=JSON.parse(localStorage.getItem('grabzone_cart_v2')||'[]')}catch{};const n=c.reduce((s,x)=>s+Number(x.quantity||0),0),e=document.getElementById('gzMobileCartCount');if(e){e.textContent=n>99?'99+':n;e.style.display=n?'grid':'none'}};
document.getElementById('gzMobileCart').addEventListener('click',()=>{if(window.GrabZoneCart?.open){window.GrabZoneCart.open();return}if(typeof window.openDrawer==='function'){window.openDrawer();return}location.href='/checkout.html'});
update();window.addEventListener('storage',update);window.addEventListener('grabzone-cart-updated',update);
})();