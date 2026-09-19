(() => {
'use strict';
const C=window.GRABZONE_CONFIG||{};
const sb=window.grabzoneD1||null;
const KEY='grabzone_cart_v2',BUY='grabzone_buy_now_v2',currency=C.currency||'৳';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
const money=n=>currency+Number(n||0).toLocaleString('en-BD');
let cart=read();

const itemKey=item=>String(item?.product_id||'')+'::'+String(item?.variation_id||'');
function add(item,qty=1){const key=itemKey(item),found=cart.find(x=>itemKey(x)===key);if(found)found.quantity+=Math.max(1,Number(qty||1));else cart.push({...item,quantity:Math.max(1,Number(qty||1))});write(cart);update();openDrawer()}
function remove(key){cart=cart.filter(x=>itemKey(x)!==String(key));write(cart);update();renderDrawer()}
function setQty(key,qty){const x=cart.find(i=>itemKey(i)===String(key));if(!x)return;x.quantity=Math.max(1,Number(qty||1));write(cart);update();renderDrawer()}
function checkout(items){localStorage.setItem(BUY,JSON.stringify(items));location.href='checkout.html'}
function total(){return cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.quantity||0),0)}

function ensureUI(){
 if($('gzCartButton'))return;
 const header=document.querySelector('.header');
 if(header){
   const existing=$('headerDm');
   let b=existing;
   if(!b){
     const actions=header.querySelector('.header-actions');
     b=document.createElement('button');
     b.className='btn btn-dark gz-cart-btn';
     b.type='button';
     if(actions) actions.appendChild(b); else header.appendChild(b);
   }
   b.id='gzCartButton';
   b.className='btn btn-dark gz-cart-btn';
   b.type='button';
   b.innerHTML='View Cart <span id="gzCartCount">0</span>';
   b.removeAttribute('href');b.removeAttribute('target');b.removeAttribute('rel');
   b.onclick=e=>{e.preventDefault();openDrawer()};
   const ref=$('refDm');
   if(ref){
     ref.textContent='View Cart';
     ref.removeAttribute('href');
     ref.removeAttribute('target');
     ref.removeAttribute('rel');
     ref.onclick=e=>{e.preventDefault();openDrawer()};
   }
 }
 const style=document.createElement('style');style.id='gzCartStyle';style.textContent=`.gz-cart-btn{border:0;cursor:pointer}.gz-cart-btn span{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;margin-left:6px;border-radius:99px;background:#fff;color:#111;font-size:10px}.gz-cart-drawer{position:fixed;inset:0;z-index:100000;display:none}.gz-cart-drawer.open{display:block}.gz-cart-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(3px)}.gz-cart-panel{position:absolute;right:0;top:0;bottom:0;width:min(430px,100%);background:#fff;padding:22px;display:flex;flex-direction:column;box-shadow:-20px 0 70px rgba(0,0,0,.18)}.gz-cart-head{display:flex;justify-content:space-between;align-items:center}.gz-cart-head h2{margin:0;font-size:22px}.gz-cart-close{border:0;background:#f1f1ef;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer}.gz-cart-items{overflow:auto;display:grid;gap:9px;margin:18px 0;flex:1}.gz-cart-item{display:grid;grid-template-columns:58px 1fr auto;gap:10px;align-items:center;border:1px solid #e5e5e2;border-radius:14px;padding:9px}.gz-cart-item img{width:58px;height:58px;object-fit:contain;border-radius:10px;background:#f7f7f5}.gz-cart-item strong{font-size:13px;display:block}.gz-cart-item small{display:block;color:#777;margin-top:3px}.gz-qty{display:flex;align-items:center;gap:5px;margin-top:7px}.gz-qty button{width:25px;height:25px;border:1px solid #ddd;background:#fff;border-radius:7px;cursor:pointer}.gz-cart-item .remove{border:0;background:none;color:#a00;font-size:11px;cursor:pointer}.gz-cart-foot{border-top:1px solid #e5e5e2;padding-top:15px}.gz-cart-total{display:flex;justify-content:space-between;font-weight:900;font-size:18px;margin-bottom:12px}.gz-cart-checkout{width:100%;border:0;background:#111;color:#fff;padding:14px;border-radius:12px;font-weight:900;cursor:pointer}.gz-card-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.gz-card-actions button{border:1px solid #ddd;background:#fff;border-radius:9px;padding:9px 7px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}.gz-card-actions button.buy{background:#111;color:#fff;border-color:#111}.gz-product-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}.gz-product-actions button{border:1px solid #ddd;background:#fff;border-radius:11px;padding:13px;font:inherit;font-weight:900;cursor:pointer}.gz-product-actions button.buy{background:#111;color:#fff;border-color:#111}.gz-qty-large{display:flex;align-items:center;gap:9px;margin-top:14px}.gz-qty-large button{width:38px;height:38px;border:1px solid #ddd;border-radius:10px;background:#fff;font-size:18px;cursor:pointer}.gz-qty-large span{min-width:30px;text-align:center;font-weight:900}`;document.head.appendChild(style);
 const d=document.createElement('div');d.id='gzCartDrawer';d.className='gz-cart-drawer';d.innerHTML=`<div class="gz-cart-backdrop"></div><aside class="gz-cart-panel"><div class="gz-cart-head"><h2>Your Cart</h2><button class="gz-cart-close">×</button></div><div id="gzCartItems" class="gz-cart-items"></div><div class="gz-cart-foot"><div class="gz-cart-total"><span>Total</span><b id="gzCartTotal">৳0</b></div><button id="gzCartCheckout" class="gz-cart-checkout">Proceed to Checkout</button></div></aside>`;document.body.appendChild(d);d.querySelector('.gz-cart-backdrop').onclick=closeDrawer;d.querySelector('.gz-cart-close').onclick=closeDrawer;$('gzCartCheckout').onclick=()=>{if(cart.length)checkout(cart);};renderDrawer()
}
function openDrawer(){ensureUI();renderDrawer();$('gzCartDrawer').classList.add('open');document.body.style.overflow='hidden'}
function closeDrawer(){const d=$('gzCartDrawer');if(d)d.classList.remove('open');document.body.style.overflow=''}
function renderDrawer(){const box=$('gzCartItems');if(!box)return;if(!cart.length){box.innerHTML='<div style="padding:30px 5px;text-align:center;color:#777">Your cart is empty.</div>';$('gzCartTotal').textContent=money(0);return}box.innerHTML=cart.map(i=>{const key=itemKey(i),opts=typeof i.variation_options==='string'?(()=>{try{return JSON.parse(i.variation_options)}catch{return{}}})():i.variation_options||{},optionText=Object.entries(opts).map(([k,v])=>esc(k)+': '+esc(v)).join(' · ');return `<div class="gz-cart-item"><img src="${esc(i.image_url)}" alt=""><div><strong>${esc(i.name)}</strong>${optionText?'<small>'+optionText+'</small>':''}<small>${money(i.price)} each</small><div class="gz-qty"><button data-act="dec" data-id="${esc(key)}">−</button><b>${i.quantity}</b><button data-act="inc" data-id="${esc(key)}">+</button><button class="remove" data-act="remove" data-id="${esc(key)}">Remove</button></div></div><b>${money(i.price*i.quantity)}</b></div>`}).join('');$('gzCartTotal').textContent=money(total());box.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const id=b.dataset.id;if(b.dataset.act==='remove')remove(id);else{const x=cart.find(i=>itemKey(i)===id);setQty(id,(x?.quantity||1)+(b.dataset.act==='inc'?1:-1))}})
}
function update(){cart=read();const c=$('gzCartCount');if(c)c.textContent=cart.reduce((s,i)=>s+Number(i.quantity||0),0);renderDrawer()}
async function productData(id){
  /*
    The product detail page already fetched this product in store.js.
    Reuse that object instead of making a second D1 request. This removes
    an unnecessary round-trip before the quantity/cart controls become
    interactive.
  */
  const current=window.__grabzoneCurrentProduct;
  if(current&&String(current.id)===String(id)) return current;

  if(!sb)return null;
  const{data}=await sb.from('products').select('id,name,price,image_url,published').eq('id',id).maybeSingle();
  return data||null;
}
async function loadVariations(id){
  window.__grabzoneVariationCache=window.__grabzoneVariationCache||{};
  if(window.__grabzoneVariationCache[String(id)])return window.__grabzoneVariationCache[String(id)];
  const current=window.__grabzoneCurrentProduct;
  if(current&&String(current.id)===String(id)&&Array.isArray(current.variations)){window.__grabzoneVariationCache[String(id)]=current.variations;return current.variations}
  const base=String(C.backendUrl||'').replace(/\/$/,'');if(!base)return[];
  try{const r=await fetch(base+'/api/marketplace/public?product_id='+encodeURIComponent(id),{cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)return[];const v=Array.isArray(d.products?.[0]?.variations)?d.products[0].variations:[];window.__grabzoneVariationCache[String(id)]=v;return v}catch{return[]}
}
function parseVariationOptions(v){if(v?.options&&typeof v.options==='object')return v.options;try{return JSON.parse(v?.options||'{}')}catch{return{}}}
function variationLabel(v){const o=parseVariationOptions(v),parts=Object.entries(o).map(([k,x])=>String(k)+': '+String(x));return parts.join(' · ')||v?.name||v?.sku||'Option'}
function variationPrice(v,p){const regular=Number(v?.regular_price??v?.price??p.price??0),sale=Number(v?.sale_price??0);return sale>0&&sale<regular?sale:regular}
function stockAvailable(p,v,qty=1){return v?(Number(v.stock_managed??1)!==1||Number(v.stock||0)>=qty):(Number(p.stock_managed||0)!==1||Number(p.stock||0)>=qty)}
function variantChooserHtml(vars){if(!vars.length)return '';const groups={};vars.forEach(v=>Object.entries(parseVariationOptions(v)).forEach(([k,x])=>(groups[k]??=new Set()).add(String(x))));return '<div class="gz-variant-box"><strong>Choose your options</strong>'+Object.entries(groups).map(([k,vals])=>'<div class="gz-variant-group"><label>'+esc(k)+'</label><div class="gz-variant-values">'+[...vals].map(v=>'<button type="button" data-opt-group="'+esc(k)+'" data-opt-value="'+esc(v)+'">'+esc(v)+'</button>').join('')+'</div></div>').join('')+'<div class="gz-variant-message">Select all options</div></div>'}
async function chooseVariant(p,qty,mode){
  const vars=await loadVariations(p.id);
  if(!vars.length){const item={product_id:p.id,name:p.name,image_url:p.image_url,price:Number(p.price),unit_price:Number(p.price),quantity:qty};if(mode==='buy')return checkout([item]);return add(item,qty)}
  const modal=document.createElement('div');modal.className='gz-variant-modal';modal.innerHTML='<div class="gz-variant-card"><button type="button" class="gz-variant-close">×</button><div class="eyebrow">PRODUCT OPTIONS</div><h2>'+esc(p.name)+'</h2>'+variantChooserHtml(vars)+'<div class="gz-variant-actions"><button type="button" class="gz-variant-cancel">Cancel</button><button type="button" class="gz-variant-confirm">Continue</button></div></div>';document.body.appendChild(modal);
  const selected={},msg=modal.querySelector('.gz-variant-message');modal.querySelectorAll('[data-opt-group]').forEach(b=>b.onclick=()=>{const g=b.dataset.optGroup;selected[g]=b.dataset.optValue;modal.querySelectorAll('[data-opt-group="'+CSS.escape(g)+'"]').forEach(x=>x.classList.toggle('active',x===b));const exact=vars.find(v=>{const o=parseVariationOptions(v),ks=Object.keys(o);return ks.length===Object.keys(selected).length&&ks.every(k=>String(selected[k]??'')===String(o[k]))});if(exact){const ok=stockAvailable(p,exact,qty);msg.textContent=ok?(variationLabel(exact)+' · '+money(variationPrice(exact,p))):'Out of stock';msg.dataset.variant=exact.id;msg.classList.toggle('error',!ok)}else{msg.textContent='Select all options';delete msg.dataset.variant}});
  const close=()=>modal.remove();modal.querySelector('.gz-variant-close').onclick=close;modal.querySelector('.gz-variant-cancel').onclick=close;modal.querySelector('.gz-variant-confirm').onclick=()=>{const v=vars.find(x=>String(x.id)===String(msg.dataset.variant));if(!v){msg.textContent='Select all options';return}if(!stockAvailable(p,v,qty)){msg.textContent='Out of stock';return}const price=variationPrice(v,p),item={product_id:p.id,name:p.name,image_url:p.image_url,price,unit_price:price,quantity:qty,variation_id:v.id,variation_options:parseVariationOptions(v),variation_sku:v.sku||''};close();mode==='buy'?checkout([item]):add(item,qty)};modal.classList.add('open');
}
function decorateCards(){const grid=$('products');if(!grid)return;grid.querySelectorAll('.product-card').forEach(card=>{if(card.querySelector('.gz-card-actions'))return;const href=card.getAttribute('href')||'';const id=new URL(href,location.href).searchParams.get('id');if(!id)return;const name=card.querySelector('.product-name')?.textContent.trim()||'Product';const priceText=card.querySelector('.price')?.textContent||'';const price=Number((priceText.match(/[0-9][0-9,]*/)||['0'])[0].replace(/,/g,''));const image=card.querySelector('img')?.src||'';const a=document.createElement('div');a.className='gz-card-actions';a.innerHTML='<button type="button">Add to Cart</button><button type="button" class="buy">Buy Now</button>';card.appendChild(a);a.children[0].onclick=e=>{e.preventDefault();e.stopPropagation();add({product_id:id,name,image_url:image,price},1)};a.children[1].onclick=e=>{e.preventDefault();e.stopPropagation();checkout([{product_id:id,name,image_url:image,price,quantity:1}])}})}
async function decorateProduct(){const detail=$('productDetail');if(!detail||detail.dataset.gzCartDecorated==='1'||!detail.querySelector('h1'))return;const id=new URLSearchParams(location.search).get('id');if(!id)return;const p=await productData(id);if(!p)return;const box=detail.querySelector('.dm-box');if(!box)return;detail.dataset.gzCartDecorated='1';box.innerHTML=`<strong>Ready to order?</strong><p>Choose a quantity, add it to your cart, or buy it now. Payment is Cash on Delivery.</p><div id="gzProductVariants"></div><div class="gz-qty-large"><button type="button" id="gzProductDec">−</button><span id="gzProductQty">1</span><button type="button" id="gzProductInc">+</button></div><div class="gz-product-actions"><button type="button" id="gzProductAdd">Add to Cart</button><button type="button" class="buy" id="gzProductBuy">Buy Now</button></div>`;let q=1;const set=()=>{$('gzProductQty').textContent=q};$('gzProductDec').onclick=()=>{q=Math.max(1,q-1);set()};$('gzProductInc').onclick=()=>{q++;set()};$('gzProductAdd').onclick=()=>chooseVariant(p,q,'add');$('gzProductBuy').onclick=()=>chooseVariant(p,q,'buy')
function observe(){const grid=$('products');if(grid)new MutationObserver(decorateCards).observe(grid,{childList:true,subtree:true});const detail=$('productDetail');if(detail)new MutationObserver(decorateProduct).observe(detail,{childList:true,subtree:true});decorateCards();decorateProduct()}
document.addEventListener('DOMContentLoaded',()=>{ensureUI();observe();update()});
window.GrabZoneCart={add,checkout,open:openDrawer,chooseVariant,loadVariations};
})();