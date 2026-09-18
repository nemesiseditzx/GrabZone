(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>'৳'+Number(n||0).toLocaleString('en-BD',{maximumFractionDigits:2});
const $=s=>document.querySelector(s);
async function api(path,opt={}){const r=await fetch(path,{credentials:'include',cache:'no-store',...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);return d}
function productId(){const u=new URL(location.href);return u.searchParams.get('id')||u.searchParams.get('product_id')||u.searchParams.get('product')||''}
function ensureStyle(){if($('#gzVariationUiStyle'))return;const s=document.createElement('style');s.id='gzVariationUiStyle';s.textContent=`.gz-customer-variations{margin:18px 0;padding:18px;border:1px solid #e4e5e1;border-radius:16px;background:#fff}.gz-cv-title{font-size:17px;font-weight:900;margin-bottom:12px}.gz-cv-row{margin:12px 0}.gz-cv-row>label{display:block;font-size:11px;font-weight:900;color:#555;margin-bottom:7px;text-transform:uppercase;letter-spacing:.06em}.gz-cv-values{display:flex;gap:7px;flex-wrap:wrap}.gz-cv-values button{border:1px solid #d9d9d5;background:#fff;border-radius:10px;padding:10px 15px;font-weight:850;cursor:pointer;transition:.15s}.gz-cv-values button.selected{border-color:#ff6b00;background:#fff7ef;box-shadow:0 0 0 2px #ff6b00 inset}.gz-cv-values button.unavailable{opacity:.32;text-decoration:line-through}.gz-cv-values button:disabled{cursor:not-allowed}.gz-cv-values .gz-cv-color{display:flex;align-items:center;gap:8px;min-width:82px;justify-content:center}.gz-cv-swatch{width:22px;height:22px;border-radius:50%;background:var(--gz-color);border:1px solid var(--gz-border);box-shadow:inset 0 0 0 2px rgba(255,255,255,.55)}.gz-cv-state{margin-top:13px;padding:11px 12px;border-radius:10px;background:#f6f6f3;font-size:12px;color:#444}.gz-cv-state.warn{background:#fff6ed;color:#9a4d00}.gz-cv-qty{display:flex;align-items:center;gap:8px;margin-top:13px}.gz-cv-qty button{width:36px;height:36px;border:1px solid #ddd;border-radius:9px;background:#fff;font-size:18px;cursor:pointer}.gz-cv-qty span{min-width:32px;text-align:center;font-weight:900}.gz-cv-actions-note{font-size:11px;color:#777;margin-top:8px}.gz-v2-panel{margin:16px 0}.gz-v2-builder,.gz-v2-bulk{border:1px solid #e7e7e2;border-radius:14px;padding:13px;margin:12px 0;background:#fafaf8}.gz-opt-row{display:grid;grid-template-columns:1fr 2fr auto;gap:8px;margin:8px 0}.gz-opt-row input,.gz-v2-table input,.gz-v2-table select,.gz-v2-bulk input{border:1px solid #ddd;border-radius:8px;padding:8px}.gz-v2-table-wrap{overflow:auto}.gz-v2-table{width:100%;border-collapse:collapse;min-width:1000px}.gz-v2-table th,.gz-v2-table td{padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:left}.gz-v2-table input{width:95px}.gz-v2-head{display:flex;justify-content:space-between;gap:10px}.gz-v2-kicker{font-size:10px;font-weight:900;color:#777;letter-spacing:.12em}.gz-v2-muted,.gz-v2-error{padding:12px;color:#777}.gz-v2-error{color:#a11;background:#fff0f0;border-radius:9px}@media(max-width:700px){.gz-opt-row{grid-template-columns:1fr}.gz-cv-values{gap:6px}}`;document.head.appendChild(s)}
async function vendorVariationManager(){if(!location.pathname.includes('vendor-dashboard'))return;const host=$('#products');if(!host||host.dataset.gzV2Manager)return;host.dataset.gzV2Manager='1';ensureStyle();const panel=document.createElement('div');panel.id='gzVariationPanel';panel.className='gz-v2-panel';panel.innerHTML='<div class="gz-v2-head"><div><span class="gz-v2-kicker">VARIATIONS</span><h2>Product Variations</h2><p>Generate Color × Size combinations and manage SKU, pricing, stock, images and status.</p></div><button type="button" class="gz-v2-close gz-btn light">Close</button></div><div id="gzV2Selected"><div class="gz-v2-muted">Select Variations on a product to begin.</div></div>';host.prepend(panel);panel.querySelector('.gz-v2-close').onclick=()=>panel.classList.remove('open');
const addButtons=()=>{host.querySelectorAll('.gz-product-card').forEach(card=>{if(card.querySelector('.gz-v2-var-btn'))return;const edit=card.querySelector('button[onclick*="editProduct"]');if(!edit)return;const match=edit.getAttribute('onclick').match(/editProduct\(['\"]([^'\"]+)['\"]\)/);const id=match?.[1];if(!id)return;const b=document.createElement('button');b.type='button';b.className='gz-btn light gz-v2-var-btn';b.textContent='Variations';b.onclick=()=>openVariations(id);edit.parentElement?.appendChild(b)})};
const obs=new MutationObserver(addButtons);obs.observe(host,{childList:true,subtree:true});addButtons();
async function openVariations(pid){panel.classList.add('open');panel.scrollIntoView({behavior:'smooth',block:'start'});const box=$('#gzV2Selected');box.innerHTML='<div class="gz-v2-muted">Loading variations…</div>';try{const d=await api('/api/vendor/variations?product_id='+encodeURIComponent(pid));const product=(await api('/api/vendor/products')).products?.find(x=>x.id===pid);renderVendor(pid,d,product)}catch(e){box.innerHTML='<div class="gz-v2-error">'+esc(e.message)+'</div>'}}
function renderVendor(pid,d,product){const box=$('#gzV2Selected'),opts=d.options||[],vs=d.variations||[];box.innerHTML=`<div class="gz-v2-builder"><b>Option setup</b><div style="font-size:12px;color:#777;margin:4px 0 10px">Example: Color = Black, White · Size = S, M, L</div><div id="gzOptRows">${opts.map(o=>`<div class="gz-opt-row"><input class="gz-opt-name" value="${esc(o.name)}" placeholder="Option name"><input class="gz-opt-values" value="${esc((o.values||[]).map(v=>v.value).join(', '))}" placeholder="Values separated by commas"><button type="button" class="gz-opt-remove gz-btn light">×</button></div>`).join('')}</div><button type="button" id="gzAddOpt" class="gz-btn light">＋ Add option</button> <button type="button" id="gzGenerate" class="gz-btn primary">Generate / Update Variations</button></div><div class="gz-v2-bulk"><input id="gzBulkPrice" type="number" min="0" step="0.01" placeholder="Set regular price"><input id="gzBulkSale" type="number" min="0" step="0.01" placeholder="Set sale price"><input id="gzBulkStock" type="number" min="0" step="1" placeholder="Set stock"><button id="gzApplyBulk" type="button" class="gz-btn light">Apply to all</button></div><div class="gz-v2-table-wrap"><table class="gz-v2-table"><thead><tr><th>Options</th><th>SKU</th><th>Regular</th><th>Sale</th><th>Old</th><th>Stock</th><th>Low</th><th>Status</th><th>Image</th><th></th></tr></thead><tbody id="gzVarRows">${vs.length?vs.map(v=>vendorRow(v)).join(''):'<tr><td colspan="10" class="gz-v2-muted">No variations yet. Add options and generate them.</td></tr>'}</tbody></table></div>`;box.querySelectorAll('.gz-opt-remove').forEach(x=>x.onclick=()=>x.parentElement.remove());$('#gzAddOpt').onclick=()=>{const r=document.createElement('div');r.className='gz-opt-row';r.innerHTML='<input class="gz-opt-name" placeholder="Option name"><input class="gz-opt-values" placeholder="Values separated by commas"><button type="button" class="gz-opt-remove gz-btn light">×</button>';r.querySelector('button').onclick=()=>r.remove();$('#gzOptRows').appendChild(r)};$('#gzGenerate').onclick=async()=>{const options=[...document.querySelectorAll('#gzOptRows .gz-opt-row')].map(r=>({name:r.querySelector('.gz-opt-name').value,values:r.querySelector('.gz-opt-values').value.split(',').map(x=>x.trim()).filter(Boolean)})).filter(x=>x.name&&x.values.length);if(!options.length)return alert('Add at least one option with values.');try{const r=await api('/api/vendor/variations',{method:'POST',body:JSON.stringify({product_id:pid,options,default_price:Number(product?.price||0)})});alert(`${r.count} variations generated.`);openVariations(pid)}catch(e){alert(e.message)}};$('#gzApplyBulk').onclick=async()=>{const price=$('#gzBulkPrice').value,sale=$('#gzBulkSale').value,stock=$('#gzBulkStock').value;try{for(const row of document.querySelectorAll('#gzVarRows tr[data-id]')){const b={product_id:pid};if(price!=='')b.regular_price=Number(price);if(sale!=='')b.sale_price=Number(sale);if(stock!=='')b.stock=Number(stock);await api('/api/vendor/variations/'+row.dataset.id,{method:'PATCH',body:JSON.stringify(b)})}openVariations(pid)}catch(e){alert(e.message)}};box.querySelectorAll('.gz-v2-save').forEach(b=>b.onclick=async()=>{const row=b.closest('tr'),v=f=>row.querySelector('[data-f="'+f+'"]')?.value??'';try{await api('/api/vendor/variations/'+row.dataset.id,{method:'PATCH',body:JSON.stringify({product_id:pid,sku:v('sku'),regular_price:Number(v('regular')||0),sale_price:v('sale')===''?null:Number(v('sale')),old_price:v('old')===''?null:Number(v('old')),stock:Number(v('stock')||0),low_stock_threshold:Number(v('low')||0),status:v('status'),image_url:v('image')})});b.textContent='Saved ✓';setTimeout(()=>b.textContent='Save',900)}catch(e){alert(e.message)}})}
function vendorRow(v){const labels=Object.entries(v.options||{}).map(([k,x])=>`${k}: ${x}`).join(' · ');return `<tr data-id="${esc(v.id)}"><td><b>${esc(labels)}</b></td><td><input data-f="sku" value="${esc(v.sku||'')}"></td><td><input data-f="regular" type="number" min="0" step="0.01" value="${Number(v.regular_price||0)}"></td><td><input data-f="sale" type="number" min="0" step="0.01" value="${v.sale_price==null?'':Number(v.sale_price)}"></td><td><input data-f="old" type="number" min="0" step="0.01" value="${v.old_price==null?'':Number(v.old_price)}"></td><td><input data-f="stock" type="number" min="0" value="${Number(v.stock||0)}"></td><td><input data-f="low" type="number" min="0" value="${Number(v.low_stock_threshold||0)}"></td><td><select data-f="status"><option ${v.status==='Available'?'selected':''}>Available</option><option ${v.status==='Out of Stock'?'selected':''}>Out of Stock</option><option ${v.status==='Disabled'?'selected':''}>Disabled</option></select></td><td><input data-f="image" value="${esc(v.image_url||'')}" placeholder="image URL"></td><td><button type="button" class="gz-btn light gz-v2-save">Save</button></td></tr>`}
}
async function customerVariations(){
 if(window.__gzCustomerVariationUI||window.__gzCustomerVariationLoading)return;
 // product.html renders the real product asynchronously. Never mount into the
 // temporary "Loading product..." placeholder because store.js replaces it.
 if(!window.__gzProductRendered){return}
 window.__gzCustomerVariationLoading=1;
 if(!/\/product(?:\.html)?\/?$/i.test(location.pathname)){window.__gzCustomerVariationLoading=0;return;}
 const pid=productId();if(!pid)return;
 ensureStyle();
 let data;
 try{data=await api('/api/marketplace/variations?product_id='+encodeURIComponent(pid))}catch{return}
 const vs=(data?.variations||[]).filter(v=>v.status!=='Disabled');
 if(!vs.length){window.__gzCustomerVariationLoading=0;return;}
 const detail=$('#productDetail')||$('main');if(!detail){window.__gzCustomerVariationLoading=0;return;} const galleryUrls=(()=>{const x=data?.product?.image_urls;if(Array.isArray(x))return x.filter(Boolean);if(typeof x==='string'){try{const y=JSON.parse(x);return Array.isArray(y)?y.filter(Boolean):[]}catch{}}return []})();
 if(galleryUrls.length){
   const currentGallery=Array.isArray(window.__gallery)?window.__gallery:[];
   const merged=[...currentGallery,...galleryUrls.map(image_url=>({image_url}))];
   const seen=new Set();
   window.__gallery=merged.filter(x=>{const u=String(x?.image_url||'').trim();if(!u||seen.has(u))return false;seen.add(u);return true});
   const gallery=detail.querySelector('.gallery');
   const thumbs=detail.querySelector('.gallery-thumbs');
   const main=detail.querySelector('#mainProductImage');
   if(gallery&&thumbs&&main){
     thumbs.innerHTML=window.__gallery.map((image,index)=>'<button type="button" class="gallery-thumb '+(index===0?'active':'')+'" data-gz-gallery-index="'+index+'"><img src="'+esc(image.image_url)+'" alt="'+esc(data.product?.name||'Product')+' '+(index+1)+'"></button>').join('');
     thumbs.querySelectorAll('[data-gz-gallery-index]').forEach(b=>b.onclick=()=>showGalleryImage(Number(b.dataset.gzGalleryIndex)));
   }
 }
 if(!vs.length && String(data?.product?.product_type||'').toLowerCase()==='variable' && !(data?.options||[]).length){
   const desc=String(data?.product?.description||'');
   const found=[];
   for(const m of desc.matchAll(/(?:^|\n)\s*(S|M|L|XL|XXL|XXXL)\s*=\s*[^\n]+/gi)){const v=m[1].toUpperCase();if(!found.includes(v))found.push(v)}
   if(found.length) data.options=[{name:'Size',values:found.map((value,i)=>({id:'inferred-'+i,value,sort_order:i}))}];
 }

 if(detail.querySelector('.gz-customer-variations'))return;
 const rawNames=[...(data.options||[]).map(o=>String(o.name||'').trim()).filter(Boolean),...vs.flatMap(v=>Object.keys(v.options||{}))];
 const priority=['Color','Size','Number Size'];
 const names=[...priority.filter(n=>rawNames.some(x=>x.toLowerCase()===n.toLowerCase())),...rawNames.filter(n=>!priority.some(x=>x.toLowerCase()===n.toLowerCase()))];
 if(!names.length){window.__gzCustomerVariationLoading=0;return;}
 const wrap=document.createElement('section');wrap.className='gz-customer-variations';
 wrap.innerHTML='<div class="gz-cv-title">Choose your options</div><div id="gzCVOptions"></div><div id="gzCVState" class="gz-cv-state warn">Select all options</div><div class="gz-cv-actions-note" id="gzCVQtyNote"></div>';
 const dm=detail.querySelector('.dm-box');
 detail.insertBefore(wrap,dm||detail.firstChild);window.__gzCustomerVariationUI=1;window.__gzCustomerVariationLoading=0;
 const area=wrap.querySelector('#gzCVOptions'),state=wrap.querySelector('#gzCVState'),note=wrap.querySelector('#gzCVQtyNote');
 let selected={},current=null;
 const colorMap={black:'#111',white:'#fff',red:'#ef233c',blue:'#2446d8',green:'#2f9e44',yellow:'#ffd43b',pink:'#f783ac',gray:'#8b8f94',grey:'#8b8f94',brown:'#8b5e3c',orange:'#ff7a00',purple:'#7b3fb6',navy:'#172554',maroon:'#800000',beige:'#e7d3ad'};
 const valueList=name=>[...new Set(vs.map(v=>v.options?.[name]).filter(Boolean))];
 function matching(){
   return vs.find(v=>Object.entries(v.options||{}).every(([k,val])=>selected[k]===val))||null;
 }
 function compatible(name,value){
   return vs.some(v=>v.status!=='Disabled' && v.options?.[name]===value && Object.entries(selected).every(([k,val])=>k===name||v.options?.[k]===val));
 }
 function renderOptions(){
   area.innerHTML='';
   names.forEach(name=>{
     const row=document.createElement('div');row.className='gz-cv-row';
     const vals=valueList(name);
     const isColor=name.toLowerCase()==='color';
     row.innerHTML='<label>'+esc(name)+'</label><div class="gz-cv-values">'+vals.map(value=>{
       const c=isColor?colorMap[String(value).toLowerCase()]:null;
       const style=c?' style="--gz-color:'+c+';--gz-border:'+(c==='#fff'?'#bbb':c)+'"':'';
       return '<button type="button" class="'+(isColor?'gz-cv-color':'')+'" data-option="'+esc(name)+'" data-value="'+esc(value)+'"'+style+'>'+ (isColor?'<span class="gz-cv-swatch"></span>':'') +esc(value)+'</button>';
     }).join('')+'</div>';
     area.appendChild(row);
   });
 }
 function imageFor(v){return v?.image_url||v?.images?.[0]||''}
 function updateImage(v){
   const src=imageFor(v);if(!src)return;
   const selectors=['.gallery-main img','.product-gallery-main img','#productMainImage','.main-image img'];
   for(const sel of selectors){const img=detail.querySelector(sel);if(img){img.src=src;break}}
 }
 function updatePrice(v){
   if(!v)return;
   const price=Number(v.regular_price||0),candidateOld=v.old_price!=null?Number(v.old_price):Number(data.product?.old_price||0),old=candidateOld>price?candidateOld:null;
   detail.querySelectorAll('#productPrice,.product-price,.price,.detail-price,[data-product-price]').forEach(el=>{el.innerHTML=money(price)+(old!==null?' <span class="old">'+money(old)+'</span>':'')});
   detail.querySelectorAll('[data-sale-price]').forEach(el=>{el.textContent='' });
   detail.querySelectorAll('[data-sku]').forEach(el=>{el.textContent=v.sku||''});
 }
 function update(){
   current=matching();
   area.querySelectorAll('button[data-option]').forEach(b=>{
     const active=selected[b.dataset.option]===b.dataset.value;
     b.classList.toggle('selected',active);
     b.classList.toggle('unavailable',!active&&!compatible(b.dataset.option,b.dataset.value));
     b.disabled=!active&&!compatible(b.dataset.option,b.dataset.value);
   });
   if(!current){
     state.textContent='Select all options';
     state.className='gz-cv-state warn';
     note.textContent='';
     return;
   }
   const available=current.status==='Available';
   state.innerHTML='<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:5px"></span>'+(available?'In Stock':'Out of Stock');
   state.className=available?'gz-cv-state':'gz-cv-state warn';
   note.textContent='';
   updatePrice(current);updateImage(current);
 }
 renderOptions();
 area.querySelectorAll('button[data-option]').forEach(b=>b.onclick=()=>{selected[b.dataset.option]=b.dataset.value;update()});
 function item(){if(!current)return null;const price=Number(current.regular_price||0),quantity=Math.max(1,Number(document.querySelector('#gzProductQty')?.textContent||1));return{product_id:pid,variation_id:current.id,variation_options:current.options||{},quantity,unit_price:price,price,name:data.product?.name||'Product',image_url:imageFor(current)||data.product?.image_url||'',sku:current.sku||''}}
 function addCart(){const x=item();if(!x||current.status!=='Available')return false;let cart=[];try{cart=JSON.parse(localStorage.getItem('grabzone_cart_v2')||'[]');if(!Array.isArray(cart))cart=[]}catch{}const existing=cart.find(y=>y.product_id===x.product_id&&y.variation_id===x.variation_id);if(existing){const max=current.max_qty?Number(current.max_qty):Infinity;existing.quantity=Math.min(max,Number(existing.quantity||0)+x.quantity)}else cart.push(x);localStorage.setItem('grabzone_cart_v2',JSON.stringify(cart));return true}
 function buyNow(){const x=item();if(!x||current.status!=='Available')return false;localStorage.setItem('grabzone_buy_now_v2',JSON.stringify([x]));location.href='checkout.html';return true}
 function intercept(e){
   const b=e.target.closest?.('.gz-product-actions button');if(!b)return;
   const text=(b.textContent||'').toLowerCase();if(!/add to cart|buy now/.test(text))return;
   if(!current){e.preventDefault();e.stopImmediatePropagation();alert('Please select all product options first.');return}
   const selectedQty=Math.max(1,Number(document.querySelector('#gzProductQty')?.textContent||1));
   if(current.status!=='Available'){e.preventDefault();e.stopImmediatePropagation();alert('This variation is out of stock.');return}
   e.preventDefault();e.stopImmediatePropagation();
   if(text.includes('buy now')){if(buyNow()){b.textContent='Opening checkout…';setTimeout(()=>b.textContent='Buy Now',1200)}}else if(addCart()){b.textContent='Added ✓';setTimeout(()=>b.textContent='Add to Cart',900)}
 }
 document.addEventListener('click',intercept,true);
 update();
}
function mountCustomerVariations(){
 window.__gzCustomerVariationUI=0;
 window.__gzCustomerVariationLoading=0;
 setTimeout(customerVariations,0);
}
window.GZMountCustomerVariations=mountCustomerVariations;
function boot(){
 window.addEventListener('grabzone:product-rendered',mountCustomerVariations);
 vendorVariationManager();
 customerVariations();
 let n=0;
 const t=setInterval(()=>{
   if(window.__gzCustomerVariationUI||++n>120)return clearInterval(t);
   customerVariations();
 },250);
 const detail=document.querySelector('#productDetail');
 if(detail&&window.MutationObserver)new MutationObserver(()=>{
   if(window.__gzProductRendered&&!detail.querySelector('.gz-customer-variations')&&!window.__gzCustomerVariationLoading){
     window.__gzCustomerVariationUI=0;
     customerVariations();
   }
 }).observe(detail,{childList:true,subtree:false});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();})();