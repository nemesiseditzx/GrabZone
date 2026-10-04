(()=>{
'use strict';
if(!/^\/marketplace(?:\.html)?\/?$/.test(location.pathname))return;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>'৳'+Number(v||0).toLocaleString('en-BD',{maximumFractionDigits:2});
function shuffle(rows){
 const a=[...rows];
 for(let i=a.length-1;i>0;i--){
   let r=Math.random();
   try{if(globalThis.crypto?.getRandomValues){const x=new Uint32Array(1);crypto.getRandomValues(x);r=x[0]/4294967296}}catch{}
   const j=Math.floor(r*(i+1));[a[i],a[j]]=[a[j],a[i]];
 }
 return a;
}
const norm=v=>String(v??'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\u0980-\u09ff]+/g,' ').trim();
function distance(a,b){a=norm(a);b=norm(b);if(!a||!b)return 99;if(a===b)return 0;if(a.includes(b)||b.includes(a))return Math.abs(a.length-b.length);const prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=b.length;j++)prev[j]=cur[j]}return prev[b.length]}
function score(p,q){
 const query=norm(q);if(!query)return 0;
 const fields=[p.name,p.category,p.vendor_name,p.vendor_slug,p.description,p.tag].map(norm);
 const tokens=query.split(/\s+/).filter(Boolean);let s=0;
 for(const t of tokens){
   let best=99;
   for(const f of fields){if(!f)continue;if(f===t)best=0;else if(f.includes(t))best=Math.min(best,1);else{for(const w of f.split(/\s+/)){const d=distance(w,t);if(d<=Math.max(1,Math.floor(t.length*.35)))best=Math.min(best,d+2)}}}
   if(best<99)s+=best===0?40:best===1?24:Math.max(0,14-best*2);
 }
 const name=norm(p.name),vendor=norm(p.vendor_name);
 if(name===query)s+=50;else if(name.startsWith(query))s+=25;if(vendor===query)s+=18;
 return s;
}
async function get(u){const r=await fetch(u,{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d}
function card(p){
 const image=p.image_url||'/favicon.png',name=p.name||'Product',vendor=p.vendor_name||'GrabZone Store',price=Number(p.sale_price??p.price??0);
 return '<article class="mp-product"><a class="mp-product-image" href="/product.html?id='+encodeURIComponent(p.id||'')+'"><img src="'+esc(image)+'" alt="'+esc(name)+'" loading="lazy" decoding="async"></a><div class="mp-product-info"><div class="mp-vendor"><span class="mp-vendor-logo">'+(p.vendor_logo?'<img src="'+esc(p.vendor_logo)+'" alt="">':esc(String(vendor).charAt(0).toUpperCase()))+'</span><a href="/store/'+encodeURIComponent(p.vendor_slug||'')+'">'+esc(vendor)+'</a></div><a class="mp-product-name" href="/product.html?id='+encodeURIComponent(p.id||'')+'">'+esc(name)+'</a><div class="mp-price-row"><strong>৳'+price.toLocaleString('en-BD')+'</strong><a class="mp-view" href="/product.html?id='+encodeURIComponent(p.id||'')+'">View</a></div></div></article>';
}
function css(){if(document.getElementById('mp-advanced-style'))return;const s=document.createElement('style');s.id='mp-advanced-style';s.textContent=`
.mp-tools{max-width:1180px;margin:0 auto;padding:0 28px 35px}.mp-searchbox{display:flex;gap:9px}.mp-searchbox input{flex:1;height:48px;border:1px solid #dcd7d0;border-radius:12px;padding:0 15px;font:700 13px Inter,system-ui;background:#fff;outline:none}.mp-searchbox input:focus{border-color:#ff650b;box-shadow:0 0 0 3px #ff650b18}.mp-searchbox button,.mp-filter select{height:48px;border:1px solid #ddd8d1;border-radius:12px;background:#11151a;color:#fff;padding:0 16px;font:850 11px Inter,system-ui;cursor:pointer}.mp-filter{display:flex;gap:9px;flex-wrap:wrap;margin-top:10px}.mp-filter select{background:#fff;color:#222}.mp-filter .clear{background:#fff;color:#222}.mp-category-row{display:flex;gap:7px;overflow:auto;padding:12px 0 2px;scrollbar-width:none}.mp-category-row::-webkit-scrollbar{display:none}.mp-cat{border:1px solid #e0dbd4;background:#fff;color:#333;border-radius:999px;padding:8px 12px;font:800 10px Inter;white-space:nowrap;cursor:pointer}.mp-cat.active{background:#111;color:#fff;border-color:#111}.mp-result-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 18px;flex-wrap:wrap}.mp-result-tools .viewall{border:1px solid #ddd8d1;background:#fff;border-radius:10px;padding:9px 12px;font:850 10px Inter;cursor:pointer}.mp-pagination{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:25px}.mp-pagination button{border:1px solid #ddd8d1;background:#fff;border-radius:9px;padding:9px 13px;font:850 10px Inter;cursor:pointer}.mp-pagination button:disabled{opacity:.35;cursor:not-allowed}.mp-page-indicator{font-size:10px;color:#777;font-weight:800}.mp-store-count{font-size:9px;color:#777;margin-top:4px}
@media(max-width:600px){.mp-tools{padding:0 14px 22px}.mp-searchbox input{height:44px;font-size:12px}.mp-searchbox button{height:44px;padding:0 13px}.mp-filter select{height:42px;flex:1;min-width:130px}.mp-category-row{margin-right:-14px}.mp-result-tools{margin-bottom:12px}.mp-pagination button{padding:8px 10px}}`;document.head.appendChild(s)}
function render(brands,products){
 const app=document.getElementById('marketplace-app');if(!app)return;
 app.innerHTML='<div class="mp-page"><header class="mp-header"><div class="mp-top"><a class="mp-logo" href="/"><img src="/favicon.png" alt="GrabZone"><b>Grab<span>Zone</span></b></a><div class="mp-market-label">MARKETPLACE</div><a href="/grabpoints.html" class="mp-rewards">🎁 Rewards</a><button id="mpCart" class="mp-cart">🛒 Cart</button></div><nav class="mp-links"><a href="/">Home</a><a class="active" href="/marketplace">Marketplace</a><a href="/#categories">Categories</a><a href="/track-order.html">Track Order</a><a href="/grabpoints.html">GrabPoints</a><a href="/#support">Support</a></nav></header><main><section class="mp-title"><small>GRABZONE MARKETPLACE</small><h1>Choose a <em>Store.</em></h1><p>Search across every active store, filter by category, or open a store and shop only its products.</p></section><section class="mp-brands" id="mpBrands"></section><section class="mp-tools"><div class="mp-searchbox"><input id="mpSearch" type="search" placeholder="Search products, stores, categories…" autocomplete="off"><button id="mpSearchBtn">Search</button></div><div class="mp-filter"><select id="mpStore"><option value="">All stores</option></select><select id="mpCategory"><option value="">All categories</option></select><select id="mpSort"><option value="relevance">Best match</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name A–Z</option></select><button class="clear" id="mpClear">Clear</button></div><div class="mp-category-row" id="mpCats"></div></section><section class="mp-all" id="mpAll"><div class="mp-result-tools"><div><small>SHOP EVERYTHING</small><h2 id="mpHeading">All <em>Products.</em></h2><div class="mp-store-count" id="mpSummary"></div></div><button class="viewall" id="mpViewAll">View All Products</button></div><div class="mp-products" id="mpProducts"></div><div class="mp-pagination" id="mpPagination"></div></section></main><footer class="mp-footer">GrabZone Marketplace · Shop every store in one place. · <a href="https://t.me/grabzoneofficial" target="_blank" rel="noopener">Telegram</a> · <a href="https://www.facebook.com/grabzoneofficial/" target="_blank" rel="noopener">Facebook</a> · <a href="https://www.instagram.com/grabzoneofficial/" target="_blank" rel="noopener">Instagram</a></footer></div>';
 const storeSel=document.getElementById('mpStore'),catSel=document.getElementById('mpCategory'),catRow=document.getElementById('mpCats');
 brands.forEach(b=>{const o=document.createElement('option');o.value=b.slug||b.id;o.textContent=b.brand_name||b.business_name||b.slug;storeSel.appendChild(o)});
 const cats=[...new Map(products.map(p=>{const n=String(p.category||'Uncategorized').trim()||'Uncategorized';return [n.toLowerCase(),n]})).values()].sort((a,b)=>a.localeCompare(b));
 cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;catSel.appendChild(o)});
 catRow.innerHTML='<button class="mp-cat active" data-cat="">All</button>'+cats.map(c=>'<button class="mp-cat" data-cat="'+esc(c)+'">'+esc(c)+'</button>').join('');
 const box=document.getElementById('mpBrands');box.innerHTML=brands.length?brands.map(b=>{const name=b.brand_name||b.business_name||b.slug||'Store',logo=b.logo_url||'',banner=b.banner_url||'',count=products.filter(p=>String(p.vendor_slug||'')===String(b.slug||'')||String(p.vendor_id||'')===String(b.id||'')).length;return '<a class="mp-brand-card" href="/store/'+encodeURIComponent(b.slug||b.id||'')+'"><div class="mp-brand-banner">'+(banner?'<img src="'+esc(banner)+'" alt="" loading="lazy">':'')+'<div class="mp-brand-logo">'+(logo?'<img src="'+esc(logo)+'" alt="">':'<span>'+esc(String(name).charAt(0).toUpperCase())+'</span>')+'</div></div><div class="mp-brand-body"><div class="mp-brand-name">'+esc(name)+'</div><div class="mp-brand-meta">'+count+' Products</div><span>Open Store <b>→</b></span></div></a>'}).join(''):'<div class="mp-empty">No stores are available right now.</div>';
 let state={query:'',store:'',category:'',sort:'relevance',page:1,viewAll:false};
 const randomizedProducts=shuffle(products).map((p,i)=>({...p,__random:i}));
 function visible(){
   let rows=randomizedProducts.map(p=>({...p,__score:score(p,state.query)}));
   if(state.query)rows=rows.filter(p=>p.__score>0);
   if(state.store)rows=rows.filter(p=>String(p.vendor_slug||p.vendor_id)===String(state.store));
   if(state.category)rows=rows.filter(p=>norm(p.category)===norm(state.category));
   if(state.sort==='relevance'){
   if(state.query)rows.sort((a,b)=>(b.__score-a.__score)||(a.__random-b.__random));
   else rows.sort((a,b)=>a.__random-b.__random);
 }
   if(state.sort==='newest')rows.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
   if(state.sort==='price-low')rows.sort((a,b)=>Number(a.sale_price??a.price??0)-Number(b.sale_price??b.price??0));
   if(state.sort==='price-high')rows.sort((a,b)=>Number(b.sale_price??b.price??0)-Number(a.sale_price??a.price??0));
   if(state.sort==='name')rows.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
   return rows;
 }
 function paint(){
   const rows=visible(),size=20,total=rows.length,pages=Math.max(1,Math.ceil(total/size));if(state.page>pages)state.page=pages;
   const shown=state.viewAll?rows:rows.slice((state.page-1)*size,state.page*size);
   document.getElementById('mpHeading').innerHTML=state.query?'Search <em>Results.</em>':state.store?'Store <em>Products.</em>':state.category?esc(state.category)+' <em>Products.</em>':'All <em>Products.</em>';
   document.getElementById('mpSummary').textContent=total+' product'+(total===1?'':'s')+' found'+(state.viewAll?' · showing all':' · 20 per page')+(state.sort==='relevance'&&!state.query?' · randomized for you':'');
   document.getElementById('mpProducts').innerHTML=shown.length?shown.map(card).join(''):'<div class="mp-empty">No matching products found. Try another search, store, or category.</div>';
   const pag=document.getElementById('mpPagination');pag.innerHTML=state.viewAll||pages<=1?'':'<button id="mpPrev" '+(state.page<=1?'disabled':'')+'>Previous</button><span class="mp-page-indicator">Page '+state.page+' of '+pages+'</span><button id="mpNext" '+(state.page>=pages?'disabled':'')+'>Next</button>';
   document.getElementById('mpViewAll').textContent=state.viewAll?'Use Pagination':'View All Products';
   document.getElementById('mpPrev')?.addEventListener('click',()=>{state.page--;paint();scrollTo({top:document.getElementById('mpAll').offsetTop-80,behavior:'smooth'})});
   document.getElementById('mpNext')?.addEventListener('click',()=>{state.page++;paint();scrollTo({top:document.getElementById('mpAll').offsetTop-80,behavior:'smooth'})});
 }
 function apply(){state.query=document.getElementById('mpSearch').value.trim();state.store=storeSel.value;state.category=catSel.value;state.sort=document.getElementById('mpSort').value;state.page=1;state.viewAll=false;document.querySelectorAll('.mp-cat').forEach(b=>b.classList.toggle('active',norm(b.dataset.cat)===norm(state.category)));paint()}
 document.getElementById('mpSearch').addEventListener('keydown',e=>{if(e.key==='Enter')apply()});document.getElementById('mpSearchBtn').onclick=apply;storeSel.onchange=apply;catSel.onchange=apply;document.getElementById('mpSort').onchange=apply;document.getElementById('mpClear').onclick=()=>{document.getElementById('mpSearch').value='';storeSel.value='';catSel.value='';document.getElementById('mpSort').value='relevance';apply()};document.getElementById('mpViewAll').onclick=()=>{state.viewAll=!state.viewAll;state.page=1;paint()};catRow.querySelectorAll('.mp-cat').forEach(b=>b.onclick=()=>{catSel.value=b.dataset.cat;apply()});
 document.getElementById('mpCart').onclick=()=>{if(window.GrabZoneCart?.open)window.GrabZoneCart.open();else location.href='/checkout.html'};
 paint();if(window.GZLoading)window.GZLoading.hide();
}
function init(){css();Promise.all([get('/api/marketplace/brands?all=1'),get('/api/marketplace/products?limit=500')]).then(([b,p])=>render(b.brands||[],p.products||[])).catch(e=>{const app=document.getElementById('marketplace-app');if(app)app.innerHTML='<div style="padding:60px;font-family:system-ui;text-align:center"><h2>Marketplace unavailable</h2><p>Please refresh and try again.</p></div>';console.error(e)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();