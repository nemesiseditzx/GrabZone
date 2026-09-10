(() => {
  'use strict';
  const CART_KEY='grabzone_cart_v2', BUY_KEY='grabzone_buy_now_v2';
  const read=(key, fallback=[])=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return Array.isArray(v)?v:fallback}catch{return fallback}};
  const write=(key,v)=>localStorage.setItem(key,JSON.stringify(v));
  const totalQty=()=>read(CART_KEY).reduce((s,x)=>s+Number(x.quantity||0),0);

  function updateMarketCount(){
    const el=document.getElementById('cartCount');
    if(!el)return;
    const n=totalQty(); el.textContent=n||''; el.classList.toggle('show',n>0);
  }

  function loadCartRuntime(done){
    if(window.GrabZoneCart){done();return;}
    const s=document.createElement('script');
    s.src='/cart.js';
    s.onload=done;
    s.onerror=()=>console.error('GrabZone cart runtime failed to load.');
    document.head.appendChild(s);
  }

  function bindMarketplaceCart(){
    const btn=document.querySelector('.market-action.dark[href="/checkout.html"]');
    if(btn){
      btn.href='#';
      btn.addEventListener('click',e=>{e.preventDefault();loadCartRuntime(()=>window.GrabZoneCart?.open());});
    }
    updateMarketCount();
    window.addEventListener('storage',updateMarketCount);
  }

  function checkoutSource(){
    const buy=read(BUY_KEY);
    return buy.length?{key:BUY_KEY,items:buy}:{key:CART_KEY,items:read(CART_KEY)};
  }

  function changeCheckoutQty(id,delta){
    const source=checkoutSource();
    const items=source.items.map(x=>String(x.product_id)===String(id)?{...x,quantity:Math.max(1,Number(x.quantity||1)+delta)}:x);
    write(source.key,items);
    // Keep the normal cart synchronized when checkout came from the cart drawer.
    if(source.key===BUY_KEY){
      const cart=read(CART_KEY);
      const updated=cart.map(x=>String(x.product_id)===String(id)?{...x,quantity:items.find(i=>String(i.product_id)===String(id))?.quantity||x.quantity}:x);
      write(CART_KEY,updated);
    }
    location.reload();
  }

  function decorateCheckout(){
    const box=document.getElementById('checkoutItems');
    if(!box||box.dataset.gzQtyReady==='1')return;
    box.dataset.gzQtyReady='1';
    const style=document.createElement('style');
    style.textContent='.gz-checkout-qty{display:flex;align-items:center;gap:7px;margin-top:7px}.gz-checkout-qty button{width:28px;height:28px;border:1px solid #ddd;border-radius:8px;background:#fff;font-weight:900;cursor:pointer}.gz-checkout-qty b{min-width:24px;text-align:center}.checkout-item-info .gz-checkout-qty{font-size:12px}';
    document.head.appendChild(style);
    const addControls=()=>{
      box.querySelectorAll('.checkout-item').forEach(item=>{
        if(item.querySelector('.gz-checkout-qty'))return;
        const text=item.querySelector('.checkout-item-info span')?.textContent||'';
        const m=text.match(/(\d+)/); if(!m)return;
        const img=item.querySelector('img');
        const source=checkoutSource().items;
        const product=source.find(x=>String(x.image_url||'')===String(img?.getAttribute('src')||'')) || source[Array.from(box.children).indexOf(item)];
        if(!product)return;
        const q=document.createElement('div');q.className='gz-checkout-qty';
        q.innerHTML='<button type="button" data-gz-dec>−</button><b>'+Number(product.quantity||1)+'</b><button type="button" data-gz-inc>+</button>';
        q.querySelector('[data-gz-dec]').onclick=()=>changeCheckoutQty(product.product_id,-1);
        q.querySelector('[data-gz-inc]').onclick=()=>changeCheckoutQty(product.product_id,1);
        item.querySelector('.checkout-item-info')?.appendChild(q);
      });
    };
    addControls();
    new MutationObserver(addControls).observe(box,{childList:true,subtree:true});
  }

  function init(){
    bindMarketplaceCart();
    decorateCheckout();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
