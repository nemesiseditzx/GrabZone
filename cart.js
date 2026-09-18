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

function cartKey(x){return String(x.product_id||'')+'::'+String(x.variation_id||'');}
function add(item,qty=1){cart=read();const found=cart.find(x=>cartKey(x)===cartKey(item));if(found)found.quantity+=qty;else cart.push({...item,quantity:qty});write(cart);update();openDrawer()}
function remove(key){cart=cart.filter(x=>cartKey(x)!==String(key));write(cart);update();renderDrawer()}
function setQty(key,qty){const x=cart.find(i=>cartKey(i)===String(key));if(!x)return;x.quantity=Math.max(1,Number(qty||1));write(cart);update();renderDrawer()}
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
 const style=document.createElement('style');style.id='gzCartStyle';style.textContent=`.gz-cart-btn{border:0;cursor:pointer}.gz-cart-btn span{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;margin-left:6px;border-radius:99px;background:#fff;color:#111;font-size:10px}.gz-cart-drawer{position:fixed;inset:0;z-index:100000;display:none}.gz-cart-drawer.open{display:block}.gz-cart-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(3px)}.gz-cart-panel{position:absolute;right:0;top:0;bottom:0;width:min(430px,100%);background:#fff;padding:22px;display:flex;flex-direction:column;box-shadow:-20px 0 70px rgba(0,0,0,.18)}.gz-cart-head{display:flex;justify-content:space-between;align-items:center}.gz-cart-head h2{margin:0;font-size:22px}.gz-cart-close{border:0;background:#f1f1ef;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer}.gz-cart-items{overflow:auto;display:grid;gap:9px;margin:18px 0;flex:1}.gz-cart-item{display:grid;grid-template-columns:58px 1fr auto;gap:10px;align-items:center;border:1px solid #e5e5e2;border-radius:14px;padding:9px}.gz-cart-item img{width:58px;height:58px;object-fit:contain;border-radius:10px;background:#f7f7f5}.gz-cart-item strong{font-size:13px;display:block}.gz-cart-item small{display:block;color:#777;margin-top:3px}.gz-qty{display:flex;align-items:center;gap:5px;margin-top:7px}.gz-qty button{width:25px;height:25px;border:1px solid #ddd;background:#fff;border-radius:7px;cursor:pointer}.gz-cart-item .remove{border:0;background:none;color:#a00;font-size:11px;cursor:pointer}.gz-cart-foot{border-top:1px solid #e5e5e2;padding-top:15px}.gz-cart-total{display:flex;justify-content:space-between;font-weight:900;font-size:18px;margin-bottom:12px}.gz-cart-checkout{width:100%;border:0;background:#111;color:#fff;padding:14px;border-radius:12px;font-weight:900;cursor:pointer}.gz-card-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.gz-card-actions button{border:1px solid #ddd;background:#fff;border-radius:9px;padding:9px 7px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}.gz-card-actions button.buy{background:#111;color:#fff;border-color:#111}.gz-product-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}.gz-product-actions button{border:1px solid #ddd;background:#fff;border-radius:11px;padding:13px;font:inherit;font-weight:900;cursor:pointer}.gz-product-actions button.buy{background:#111;color:#fff;border-color:#111}.gz-qty-large{display:flex;align-items:center;gap:9px;margin-top:14px}.gz-qty-large button{width:38px;height:38px;border:1px solid #ddd;border-radius:10px;background:#fff;font-size:18px;cursor:pointer}.gz-qty-large span{min-width:30px;text-align:center;font-weight:900}.gz-product-benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.gz-product-benefit{border:1px solid #ecece8;border-radius:12px;background:#fff;padding:10px 8px;text-align:center}.gz-product-benefit b{display:block;font-size:10px;font-weight:900}.gz-product-benefit span{display:block;margin-top:3px;font-size:9px;color:#888;line-height:1.25}@media(max-width:600px){.gz-product-benefits{grid-template-columns:1fr}}`;document.head.appendChild(style);
 const d=document.createElement('div');d.id='gzCartDrawer';d.className='gz-cart-drawer';d.innerHTML=`<div class="gz-cart-backdrop"></div><aside class="gz-cart-panel"><div class="gz-cart-head"><h2>Your Cart</h2><button class="gz-cart-close">×</button></div><div id="gzCartItems" class="gz-cart-items"></div><div class="gz-cart-foot"><div class="gz-cart-total"><span>Total</span><b id="gzCartTotal">৳0</b></div><button id="gzCartCheckout" class="gz-cart-checkout">Proceed to Checkout</button></div></aside>`;document.body.appendChild(d);d.querySelector('.gz-cart-backdrop').onclick=closeDrawer;d.querySelector('.gz-cart-close').onclick=closeDrawer;$('gzCartCheckout').onclick=()=>{if(cart.length)checkout(cart);};renderDrawer()
}
function openDrawer(){cart=read();ensureUI();renderDrawer();$('gzCartDrawer').classList.add('open');document.body.style.overflow='hidden'}
function closeDrawer(){const d=$('gzCartDrawer');if(d)d.classList.remove('open');document.body.style.overflow=''}
function renderDrawer(){const box=$('gzCartItems');if(!box)return;if(!cart.length){box.innerHTML='<div style="padding:30px 5px;text-align:center;color:#777">Your cart is empty.</div>';$('gzCartTotal').textContent=money(0);return}box.innerHTML=cart.map(i=>`<div class="gz-cart-item"><img src="${esc(i.image_url)}" alt=""><div><strong>${esc(i.name)}</strong><small>${money(i.price)} each</small><div class="gz-qty"><button data-act="dec" data-id="${esc(cartKey(i))}">−</button><b>${i.quantity}</b><button data-act="inc" data-id="${esc(cartKey(i))}">+</button><button class="remove" data-act="remove" data-id="${esc(cartKey(i))}">Remove</button></div></div><b>${money(i.price*i.quantity)}</b></div>`).join('');$('gzCartTotal').textContent=money(total());box.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const id=b.dataset.id;if(b.dataset.act==='remove')remove(id);else{const x=cart.find(i=>cartKey(i)===id);setQty(id,(x?.quantity||1)+(b.dataset.act==='inc'?1:-1))}})
}
function update(){cart=read();const c=$('gzCartCount');if(c)c.textContent=cart.reduce((s,i)=>s+Number(i.quantity||0),0);renderDrawer()}
async function productData(id){if(!sb)return null;const{data}=await sb.from('products').select('id,name,price,image_url,published,product_type').eq('id',id).maybeSingle();return data||null}
async function variationAction(product,action){
  let d;
  try{
    const r=await fetch((C.backendUrl||'')+'/api/marketplace/variations?product_id='+encodeURIComponent(product.id),{credentials:'include',cache:'no-store'});
    d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'Unable to load product options.');
  }catch(e){alert(e.message);return}
  const vs=(d.variations||[]).filter(v=>v.status!=='Disabled');
  if(!vs.length){if(String(product.product_type||'').toLowerCase()==='variable'){alert('This variable product has no available variations yet. Please contact the store.');return}return action({...product,quantity:1)}
  const names=[...new Set(vs.flatMap(v=>Object.keys(v.options||{})))];
  let selected={},chosen=null;
  const modal=document.createElement('div');modal.className='gz-var-picker';
  const style=document.createElement('style');style.textContent='.gz-var-picker{position:fixed;inset:0;z-index:100002;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.55);backdrop-filter:blur(5px)}.gz-var-box{width:min(430px,100%);background:#fff;border-radius:20px;padding:22px;box-shadow:0 25px 80px rgba(0,0,0,.25)}.gz-var-box h3{margin:0 0 5px;font-size:20px}.gz-var-sub{color:#777;font-size:12px;margin-bottom:18px}.gz-var-group{margin:14px 0}.gz-var-group label{display:block;font-size:11px;font-weight:900;color:#555;text-transform:uppercase;margin-bottom:7px}.gz-var-values{display:flex;gap:7px;flex-wrap:wrap}.gz-var-values button{border:1px solid #ddd;background:#fff;border-radius:10px;padding:9px 13px;font-weight:800;cursor:pointer}.gz-var-values button.active{border-color:#111;background:#111;color:#fff}.gz-var-state{margin-top:12px;padding:10px;border-radius:10px;background:#f6f6f3;font-size:12px}.gz-var-actions{display:flex;gap:8px;margin-top:18px}.gz-var-actions button{flex:1;padding:12px;border-radius:11px;border:1px solid #ddd;background:#fff;font-weight:900;cursor:pointer}.gz-var-actions .primary{background:#111;color:#fff;border-color:#111}';document.head.appendChild(style);
  modal.innerHTML='<div class="gz-var-box"><h3>'+esc(product.name)+'</h3><div class="gz-var-sub">Select all options before '+(action===checkout?'buying now':'adding to cart')+'.</div><div class="gz-var-groups">'+names.map(n=>'<div class="gz-var-group"><label>'+esc(n)+'</label><div class="gz-var-values">'+[...new Set(vs.map(v=>v.options?.[n]).filter(Boolean))].map(v=>'<button type="button" data-n="'+esc(n)+'" data-v="'+esc(v)+'">'+esc(v)+'</button>').join('')+'</div></div>').join('')+'</div><div class="gz-var-state">Select all options</div><div class="gz-var-actions"><button type="button" data-cancel>Cancel</button><button type="button" class="primary" data-go disabled>Continue</button></div></div>';
  document.body.appendChild(modal);
  const state=modal.querySelector('.gz-var-state'),go=modal.querySelector('[data-go]');
  const update=()=>{chosen=vs.find(v=>names.every(n=>selected[n]&&v.options?.[n]===selected[n]))||null;state.textContent=chosen?(chosen.status==='Available'?'✓ '+Object.entries(chosen.options||{}).map(([k,v])=>k+': '+v).join(' · ')+' · '+money(chosen.regular_price||0):(chosen.status||'Unavailable')):'Select all options';go.disabled=!chosen||chosen.status!=='Available';modal.querySelectorAll('[data-n]').forEach(b=>b.classList.toggle('active',selected[b.dataset.n]===b.dataset.v))};
  modal.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{selected[b.dataset.n]=b.dataset.v;update()});
  const close=()=>{modal.remove();style.remove()};modal.querySelector('[data-cancel]').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
  go.onclick=()=>{if(!chosen)return;const item={...product,quantity:1,variation_id:chosen.id,variation_options:chosen.options||{},unit_price:Number(chosen.regular_price||0),price:Number(chosen.regular_price||0),image_url:chosen.image_url||chosen.images?.[0]||product.image_url||'',sku:chosen.sku||''};close();action(item)};
  update();
}

function decorateCards(){const grid=$('products');if(!grid)return;grid.querySelectorAll('.product-card').forEach(card=>{if(card.querySelector('.gz-card-actions'))return;const href=card.getAttribute('href')||'';const id=new URL(href,location.href).searchParams.get('id');if(!id)return;const name=card.querySelector('.product-name')?.textContent.trim()||'Product';const priceText=card.querySelector('.price')?.textContent||'';const price=Number((priceText.match(/[0-9][0-9,]*/)||['0'])[0].replace(/,/g,''));const image=card.querySelector('img')?.src||'';const a=document.createElement('div');a.className='gz-card-actions';a.innerHTML='<button type="button">Add to Cart</button><button type="button" class="buy">Buy Now</button>';card.appendChild(a);const base={id,product_id:id,name,image_url:image,price};a.children[0].onclick=async e=>{e.preventDefault();e.stopPropagation();await variationAction(base,item=>add(item,1))};a.children[1].onclick=async e=>{e.preventDefault();e.stopPropagation();await variationAction(base,item=>checkout([item]))}})}
async function decorateProduct(){const detail=$('productDetail');if(!detail||detail.dataset.gzCartDecorated==='1'||!detail.querySelector('h1'))return;const id=new URLSearchParams(location.search).get('id');if(!id)return;const p=await productData(id);if(!p)return;const box=detail.querySelector('.dm-box');if(!box)return;detail.dataset.gzCartDecorated='1';box.innerHTML=`<strong>Ready to order?</strong><p>Choose a quantity, add it to your cart, or buy it now. Payment is Cash on Delivery.</p><div class="gz-qty-large"><button type="button" id="gzProductDec">−</button><span id="gzProductQty">1</span><button type="button" id="gzProductInc">+</button></div><div class="gz-product-actions"><button type="button" id="gzProductAdd">Add to Cart</button><button type="button" class="buy" id="gzProductBuy">Buy Now</button></div><div class="gz-product-benefits"><div class="gz-product-benefit"><b>Cash on Delivery</b><span>Pay when you receive</span></div><div class="gz-product-benefit"><b>Secure Shopping</b><span>Shop with confidence</span></div><div class="gz-product-benefit"><b>Bangladesh Delivery</b><span>Delivery available across Bangladesh</span></div></div>`;let q=1;const set=()=>{$('gzProductQty').textContent=q};$('gzProductDec').onclick=()=>{q=Math.max(1,q-1);set()};$('gzProductInc').onclick=()=>{q++;set()};$('gzProductAdd').onclick=async()=>{const base={id:p.id,product_id:p.id,name:p.name,image_url:p.image_url,price:Number(p.price)};if(String(p.product_type||'').toLowerCase()==='variable')return variationAction(base,item=>add(item,q));add(base,q)};$('gzProductBuy').onclick=async()=>{const base={id:p.id,product_id:p.id,name:p.name,image_url:p.image_url,price:Number(p.price)};if(String(p.product_type||'').toLowerCase()==='variable')return variationAction(base,item=>{item.quantity=q;checkout([item])});checkout([{...base,quantity:q}])}}
function observe(){const grid=$('products');if(grid)new MutationObserver(decorateCards).observe(grid,{childList:true,subtree:true});const detail=$('productDetail');if(detail)new MutationObserver(decorateProduct).observe(detail,{childList:true,subtree:true});decorateCards();decorateProduct()}
document.addEventListener('DOMContentLoaded',()=>{ensureUI();observe();update()});
window.GrabZoneCart={add,checkout,open:openDrawer};
})();