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
async function chooseVariant(p,qty=1,mode='add'){
  if(!p?.id)return false;
  try{
    const r=await fetch('/api/marketplace/variations?product_id='+encodeURIComponent(p.id),{cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    const vs=(d.variations||[]).filter(v=>v.status!=='Disabled');
    if(!vs.length){
      const item={product_id:p.id,name:p.name||'Product',image_url:p.image_url||'',price:Number(p.price||0),quantity:Math.max(1,Number(qty||1))};
      return mode==='buy'?checkout([item]):(add(item,item.quantity),true);
    }
    const names=[...new Set([...(d.options||[]).map(o=>String(o.name||'').trim()),...vs.flatMap(v=>Object.keys(v.options||{}))].filter(Boolean))];
    if(!names.length)return false;
    let selected={},current=null;
    const safe=v=>esc(v);
    const stockOf=v=>Math.max(0,Number(v?.effective_stock??v?.stock??0));
    const modal=document.createElement('div');
    modal.className='gz-variation-picker';
    modal.innerHTML='<div class="gz-vp-backdrop"></div><section class="gz-vp-card" role="dialog" aria-modal="true"><button type="button" class="gz-vp-close" aria-label="Close">×</button><h3>'+safe(p.name||'Choose options')+'</h3><p class="gz-vp-sub">Select all options</p><div class="gz-vp-options"></div><div class="gz-vp-state">Select all options</div><div class="gz-vp-actions"><button type="button" class="gz-vp-cancel">Cancel</button><button type="button" class="gz-vp-go">'+(mode==='buy'?'Buy Now':'Add to Cart')+'</button></div></section></div>';
    if(!document.getElementById('gzVariationPickerStyle')){
      const s=document.createElement('style');s.id='gzVariationPickerStyle';s.textContent='.gz-variation-picker{position:fixed;inset:0;z-index:250000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.58);backdrop-filter:blur(4px)}.gz-vp-card{position:relative;width:min(520px,100%);max-height:min(760px,92vh);overflow:auto;background:#fff;border-radius:22px;padding:24px;box-shadow:0 25px 80px rgba(0,0,0,.3)}.gz-vp-close{position:absolute;right:14px;top:12px;width:34px;height:34px;border:0;border-radius:50%;background:#f1f1ef;font-size:22px;cursor:pointer}.gz-vp-card h3{margin:0 42px 5px 0;font-size:19px}.gz-vp-sub{margin:0 0 16px;color:#777}.gz-vp-row{margin:15px 0}.gz-vp-row label{display:block;margin-bottom:8px;font-size:11px;font-weight:900;text-transform:uppercase}.gz-vp-values{display:flex;gap:8px;flex-wrap:wrap}.gz-vp-values button{border:1px solid #ddd;background:#fff;border-radius:10px;padding:10px 13px;font-weight:850;cursor:pointer}.gz-vp-values button.selected{border-color:#111;background:#111;color:#fff}.gz-vp-values button.unavailable{opacity:.35;text-decoration:line-through}.gz-vp-state{margin-top:16px;padding:11px 12px;border-radius:10px;background:#fff6ed;color:#9a4d00;font-weight:800}.gz-vp-state.ok{background:#eefaf2;color:#176b35}.gz-vp-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px}.gz-vp-actions button{border:1px solid #ddd;background:#fff;border-radius:11px;padding:13px;font-weight:900;cursor:pointer}.gz-vp-actions .gz-vp-go{background:#111;color:#fff;border-color:#111}.gz-vp-go:disabled{opacity:.45;cursor:not-allowed}';document.head.appendChild(s);
    }
    document.body.appendChild(modal);
    const area=modal.querySelector('.gz-vp-options'),state=modal.querySelector('.gz-vp-state'),go=modal.querySelector('.gz-vp-go');
    const vals=n=>[...new Set(vs.map(v=>v.options?.[n]).filter(Boolean))];
    const match=()=>vs.find(v=>Object.entries(v.options||{}).every(([k,v])=>selected[k]===v))||null;
    const compatible=(n,val)=>vs.some(v=>v.options?.[n]===val && Object.entries(selected).every(([k,x])=>k===n||v.options?.[k]===x));
    const refresh=()=>{
      current=match();
      area.querySelectorAll('button[data-n]').forEach(b=>{const on=selected[b.dataset.n]===b.dataset.v;b.classList.toggle('selected',on);b.classList.toggle('unavailable',!on&&!compatible(b.dataset.n,b.dataset.v));});
      const stock=stockOf(current);
      if(!current){state.textContent='Select all options';state.className='gz-vp-state';go.disabled=true;return}
      const available=current.status==='Available'&&stock>=Math.max(1,Number(qty||1));
      state.textContent=available?'✓ In Stock · '+stock+' available':'Out of Stock';
      state.className='gz-vp-state'+(available?' ok':'');
      go.disabled=!available;
    };
    area.innerHTML=names.map(n=>'<div class="gz-vp-row"><label>'+safe(n)+'</label><div class="gz-vp-values">'+vals(n).map(v=>'<button type="button" data-n="'+safe(n)+'" data-v="'+safe(v)+'">'+safe(v)+'</button>').join('')+'</div></div>').join('');
    area.querySelectorAll('button[data-n]').forEach(b=>b.onclick=()=>{selected[b.dataset.n]=b.dataset.v;refresh()});
    const close=()=>modal.remove();
    modal.querySelector('.gz-vp-close').onclick=close;modal.querySelector('.gz-vp-cancel').onclick=close;modal.querySelector('.gz-vp-backdrop').onclick=close;
    go.onclick=()=>{
      if(!current)return;
      const stock=stockOf(current),n=Math.max(1,Number(qty||1));
      if(current.status!=='Available'||stock<n){alert('This variation is out of stock.');return}
      const regular=Number(current.regular_price||0),sale=Number(current.sale_price||0),price=sale>0&&sale<regular?sale:regular;
      const item={product_id:p.id,variation_id:current.id,variation_options:current.options||{},variation_stock_managed:true,name:p.name||'Product',image_url:current.image_url||p.image_url||'',price,unit_price:price,sku:current.sku||'',quantity:n};
      close();mode==='buy'?checkout([item]):(add(item,n),true);
    };
    refresh();
    return true;
  }catch(e){console.warn('GrabZone variation picker:',e);return false}
}

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
function renderDrawer(){const box=$('gzCartItems');if(!box)return;if(!cart.length){box.innerHTML='<div style="padding:30px 5px;text-align:center;color:#777">Your cart is empty.</div>';$('gzCartTotal').textContent=money(0);return}box.innerHTML=cart.map(i=>`<div class="gz-cart-item"><img src="${esc(i.image_url)}" alt=""><div><strong>${esc(i.name)}</strong><small>${money(i.price)} each</small>${i.variation_options&&typeof i.variation_options==='object'?'<small style="color:#555">'+esc(Object.entries(i.variation_options).map(([k,v])=>k+': '+v).join(' · '))+'</small>':''}<div class="gz-qty"><button data-act="dec" data-id="${esc(cartKey(i))}">−</button><b>${i.quantity}</b><button data-act="inc" data-id="${esc(cartKey(i))}">+</button><button class="remove" data-act="remove" data-id="${esc(cartKey(i))}">Remove</button></div></div><b>${money(i.price*i.quantity)}</b></div>`).join('');$('gzCartTotal').textContent=money(total());box.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const id=b.dataset.id;if(b.dataset.act==='remove')remove(id);else{const x=cart.find(i=>cartKey(i)===id);setQty(id,(x?.quantity||1)+(b.dataset.act==='inc'?1:-1))}})
}
function update(){cart=read();const c=$('gzCartCount');if(c)c.textContent=cart.reduce((s,i)=>s+Number(i.quantity||0),0);renderDrawer()}
async function productData(id){if(window.grabzoneD1?.rpc){try{const r=await window.grabzoneD1.rpc('get_product',{p_id:id});return r?.data||null}catch{}}if(!sb)return null;const{data}=await sb.from('products').select('id,name,price,image_url,published,stock').eq('id',id).maybeSingle();return data||null})();