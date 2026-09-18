(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>'৳'+Number(n||0).toLocaleString('en-BD',{maximumFractionDigits:2});
const $=s=>document.querySelector(s);
async function api(path,opt={}){const r=await fetch(path,{credentials:'include',cache:'no-store',...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);return d}
function productId(){const u=new URL(location.href);return u.searchParams.get('id')||u.searchParams.get('product_id')||u.searchParams.get('product')||''}
function ensureStyle(){if($('#gzVariationUiStyle'))return;const s=document.createElement('style');s.id='gzVariationUiStyle';s.textContent=`.gz-customer-variations{margin:14px 0 16px;padding:0;border:0;background:transparent}.gz-cv-title{font-size:16px;font-weight:900;margin:0 0 10px}.gz-cv-row{margin:13px 0}.gz-cv-row>label{display:block;font-size:13px;font-weight:900;color:#222;margin-bottom:8px;text-transform:none;letter-spacing:0}.gz-cv-values{display:flex;gap:8px;flex-wrap:wrap}.gz-cv-values button{min-width:58px;height:44px;border:1px solid #deded9;background:#fff;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:850;color:#222;cursor:pointer;transition:.15s;box-shadow:0 1px 1px rgba(0,0,0,.02)}.gz-cv-values button:hover:not(:disabled){border-color:#bbb;transform:translateY(-1px)}.gz-cv-values button.selected{border:2px solid #ff6b00;background:#fffaf5;box-shadow:0 0 0 1px #ff6b00 inset}.gz-cv-values button.unavailable{opacity:.3;text-decoration:line-through}.gz-cv-values button:disabled{cursor:not-allowed}.gz-cv-values .gz-cv-color{display:flex;align-items:center;gap:7px;min-width:78px;justify-content:center}.gz-cv-swatch{width:25px;height:25px;border-radius:50%;background:var(--gz-color);border:1px solid var(--gz-border);box-shadow:inset 0 0 0 2px rgba(255,255,255,.7),0 1px 3px rgba(0,0,0,.12)}.gz-cv-state{display:inline-flex;align-items:center;margin-top:2px;padding:5px 9px;border-radius:999px;background:#e9f8e8;color:#218a28;font-size:11px;font-weight:800}.gz-cv-state.warn{background:#fff3e8;color:#a35b00}.gz-cv-actions-note{font-size:11px;color:#777;margin-top:7px}.gz-v2-panel{margin:16px 0}.gz-v2-builder,.gz-v2-bulk{border:1px solid #e7e7e2;border-radius:14px;padding:13px;margin:12px 0;background:#fafaf8}.gz-opt-row{display:grid;grid-template-columns:1fr 2fr auto;gap:8px;margin:8px 0}.gz-opt-row input,.gz-v2-table input,.gz-v2-table select,.gz-v2-bulk input{border:1px solid #ddd;border-radius:8px;padding:8px}.gz-v2-table-wrap{overflow:auto}.gz-v2-table{width:100%;border-collapse:collapse;min-width:1000px}.gz-v2-table th,.gz-v2-table td{padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:left}.gz-v2-table input{width:95px}.gz-v2-head{display:flex;justify-content:space-between;gap:10px}.gz-v2-kicker{font-size:10px;font-weight:900;color:#777;letter-spacing:.12em}.gz-v2-muted,.gz-v2-error{padding:12px;color:#777}.gz-v2-error{color:#a11;background:#fff0f0;border-radius:9px}@media(max-width:700px){.gz-opt-row{grid-template-columns:1fr}.gz-cv-values{gap:6px}}`;document.head.appendChild(s)}
async function vendorVariationManager(){if(!location.pathname.includes('vendor-dashboard'))return;const host=$('#products');if(!host||host.dataset.gzV2Manager)return;host.dataset.gzV2Manager='1';ensureStyle();const panel=document.createElement('div');panel.id='gzVariationPanel';panel.className='gz-v2-panel';panel.innerHTML='<div class="gz-v2-head"><div><span class="gz-v2-kicker">VARIATIONS</span><h2>Product Variations</h2><p>Generate Color × Size combinations and manage SKU, pricing, stock, images and status.</p></div><button type="button" class="gz-v2-close gz-btn light">Close</button></div><div id="gzV2Selected"><div class="gz-v2-muted">Select Variations on a product to begin.</div></div>';host.prepend(panel);panel.querySelector('.gz-v2-close').onclick=()=>panel.classList.remove('open');
const addButtons=()=>{host.querySelectorAll('.gz-product-card').forEach(card=>{if(card.querySelector('.gz-v2-var-btn'))return;const edit=card.querySelector('button[onclick*="editProduct"]');if(!edit)return;const match=edit.getAttribute('onclick').match(/editProduct\(['\"]([^'\"]+)['\"]\)/);const id=match?.[1];if(!id)return;const b=document.createElement('button');b.type='button';b.className='gz-btn light gz-v2-var-btn';b.textContent='Variations';b.onclick=()=>openVariations(id);edit.parentElement?.appendChild(b)})};
const obs=new MutationObserver(addButtons);obs.observe(host,{childList:true,subtree:true});addButtons();
async function openVariations(pid){panel.classList.add('open');panel.scrollIntoView({behavior:'smooth',block:'start'});const box=$('#gzV2Selected');box.innerHTML='<div class="gz-v2-muted">Loading variations…</div>';try{const d=await api('/api/vendor/variations?product_id='+encodeURIComponent(pid));const product=(await api('/api/vendor/products')).products?.find(x=>x.id===pid);renderVendor(pid,d,product)}catch(e){box.innerHTML='<div class="gz-v2-error">'+esc(e.message)+'</div>'}}
function renderVendor(pid,d,product){const box=$('#gzV2Selected'),opts=d.options||[],vs=d.variations||[];box.innerHTML=`<div class="gz-v2-builder"><b>Option setup</b><div style="font-size:12px;color:#777;margin:4px 0 10px">Example: Color = Black, White · Size = S, M, L</div><div id="gzOptRows">${opts.map(o=>`<div class="gz-opt-row"><input class="gz-opt-name" value="${esc(o.name)}" placeholder="Option name"><input class="gz-opt-values" value="${esc((o.values||[]).map(v=>v.value).join(', '))}" placeholder="Values separated by commas"><button type="button" class="gz-opt-remove gz-btn light">×</button></div>`).join('')}</div><button type="button" id="gzAddOpt" class="gz-btn light">＋ Add option</button> <button type="button" id="gzGenerate" class="gz-btn primary">Generate / Update Variations</button></div><div class="gz-v2-bulk"><input id="gzBulkPrice" type="number" min="0" step="0.01" placeholder="Set regular price"><button id="gzApplyBulk" type="button" class="gz-btn light">Apply to all</button></div><div class="gz-v2-table-wrap"><table class="gz-v2-table"><thead><tr><th>Options</th><th>SKU</th><th>Regular</th><th>Old</th><th>Status</th><th>Image</th><th></th></tr></thead><tbody id="gzVarRows">${vs.length?vs.map(v=>vendorRow(v)).join(''):'<tr><td colspan="10" class="gz-v2-muted">No variations yet. Add options and generate them.</td></tr>'}</tbody></table></div>`;box.querySelectorAll('.gz-opt-remove').forEach(x=>x.onclick=()=>x.parentElement.remove());$('#gzAddOpt').onclick=()=>{const r=document.createElement('div');r.className='gz-opt-row';r.innerHTML='<input class="gz-opt-name" placeholder="Option name"><input class="gz-opt-values" placeholder="Values separated by commas"><button type="button" class="gz-opt-remove gz-btn light">×</button>';r.querySelector('button').onclick=()=>r.remove();$('#gzOptRows').appendChild(r)};$('#gzGenerate').onclick=async()=>{const options=[...document.querySelectorAll('#gzOptRows .gz-opt-row')].map(r=>({name:r.querySelector('.gz-opt-name').value,values:r.querySelector('.gz-opt-values').value.split(',').map(x=>x.trim()).filter(Boolean)})).filter(x=>x.name&&x.values.length);if(!options.length)return alert('Add at least one option with values.');try{const r=await api('/api/vendor/variations',{method:'POST',body:JSON.stringify({product_id:pid,options,default_price:Number(product?.price||0)})});alert(`${r.count} variations generated.`);openVariations(pid)}catch(e){alert(e.message)}};$('#gzApplyBulk').onclick=async()=>{const price=$('#gzBulkPrice').value;try{for(const row of document.querySelectorAll('#gzVarRows tr[data-id]')){const b={product_id:pid};if(price!=='')b.regular_price=Number(price);await api('/api/vendor/variations/'+row.dataset.id,{method:'PATCH',body:JSON.stringify(b)})}openVariations(pid)}catch(e){alert(e.message)}};box.querySelectorAll('.gz-v2-save').forEach(b=>b.onclick=async()=>{const row=b.closest('tr'),v=f=>row.querySelector('[data-f="'+f+'"]')?.value??'';try{await api('/api/vendor/variations/'+row.dataset.id,{method:'PATCH',body:JSON.stringify({product_id:pid,sku:v('sku'),regular_price:Number(v('regular')||0),old_price:v('old')===''?null:Number(v('old')),status:v('status'),image_url:v('image')})});b.textContent='Saved ✓';setTimeout(()=>b.textContent='Save',900)}catch(e){alert(e.message)}})}
function vendorRow(v){const labels=Object.entries(v.options||{}).map(([k,x])=>`${k}: ${x}`).join(' · ');return `<tr data-id="${esc(v.id)}"><td><b>${esc(labels)}</b></td><td><input data-f="sku" value="${esc(v.sku||'')}"></td><td><input data-f="regular" type="number" min="0" step="0.01" value="${Number(v.regular_price||0)}"></td><td><input data-f="old" type="number" min="0" step="0.01" value="${v.old_price==null?'':Number(v.old_price)}"></td><td><select data-f="status"><option ${v.status==='Available'?'selected':''}>Available</option><option ${v.status==='Out of Stock'?'selected':''}>Out of Stock</option><option ${v.status==='Disabled'?'selected':''}>Disabled</option></select></td><td><input data-f="image" value="${esc(v.image_url||'')}" placeholder="image URL"></td><td><button type="button" class="gz-btn light gz-v2-save">Save</button></td></tr>`}
async function customerVariations(){
 if(window.__gzCustomerVariationLoading)return;if(window.__gzCustomerVariationUI&&document.querySelector('.gz-customer-variations'))return;
 window.__gzCustomerVariationLoading=1;
 if(!/\/product(?:\.html)?\/?$/i.test(location.pathname)){window.__gzCustomerVariationLoading=0;return;}
 const pid=productId();if(!pid){window.__gzCustomerVariationLoading=0;return;}
 ensureStyle();
 let data;
 try{data=await api('/api/marketplace/variations?product_id='+encodeURIComponent(pid))}catch(e){window.__gzCustomerVariationLoading=0;return}
 const vs=(data?.variations||[]).filter(v=>v.status!=='Disabled');
 if(!vs.length){window.__gzCustomerVariationLoading=0;window.__gzCustomerVariationUI=0;return;}
 const detail=$('#productDetail')||document.querySelector('main');if(!detail){window.__gzCustomerVariationLoading=0;setTimeout(customerVariations,150);return;}
 if(detail.querySelector('.gz-customer-variations'))return;
 const rawNames=(data.options||[]).map(o=>String(o.name||'').trim()).filter(Boolean);
 const priority=['Color','Size','Number Size'];
 const names=[...priority.filter(n=>rawNames.some(x=>x.toLowerCase()===n.toLowerCase())),...rawNames.filter(n=>!priority.some(x=>x.toLowerCase()===n.toLowerCase()))];
 if(!names.length){window.__gzCustomerVariationLoading=0;return;}
 const wrap=document.createElement('section');wrap.className='gz-customer-variations';
 wrap.innerHTML='<div class="gz-cv-title">Choose your options</div><div id="gzCVOptions"></div><div id="gzCVState" class="gz-cv-state warn">Select all options</div><div class="gz-cv-actions-note" id="gzCVQtyNote"></div>';
 const dm=detail.querySelector('.dm-box');
 const anchorParent=dm?.parentElement;
 if(anchorParent) anchorParent.insertBefore(wrap,dm);
 else detail.appendChild(wrap);
 window.__gzCustomerVariationUI=1;window.__gzCustomerVariationLoading=0;
 const area=wrap.querySelector('#gzCVOptions'),state=wrap.querySelector('#gzCVState'),qtyEl=wrap.querySelector('#gzCVQty'),note=wrap.querySelector('#gzCVQtyNote');
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
   detail.querySelectorAll('#productPrice,.product-price,.price,.detail-price,[data-product-price]').forEach(el=>{
     el.innerHTML=money(price)+(old!==null?' <span class="old">'+money(old)+'</span>':'');
   });
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
   const price=current.regular_price;
   const stock=Math.max(0,Number(current.stock||0));
   const min=Math.max(1,Number(current.min_qty||1)),max=current.max_qty?Number(current.max_qty):null;
   const mainQty=document.querySelector('#gzProductQty');
   const mainDec=document.querySelector('#gzProductDec');
   const mainInc=document.querySelector('#gzProductInc');
   let mainQ=Math.max(1,Number(mainQty?.textContent||1));
   mainQ=Math.max(min,mainQ);if(max)mainQ=Math.min(max,mainQ);if(stock&&mainQ>stock)mainQ=stock;
   if(mainQty)mainQty.textContent=String(mainQ);
   if(mainDec)mainDec.disabled=mainQ<=min;
   if(mainInc)mainInc.disabled=mainQ>=Math.min(max||Infinity,stock||Infinity);
   
   state.innerHTML='<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:5px"></span>'+(stock>0?'In Stock':'Out of Stock');
   state.className=stock>0?'gz-cv-state':'gz-cv-state warn';
   updatePrice(current);updateImage(current);
 }
 renderOptions();
 const initial=vs.find(v=>v.status!=='Disabled'&&Number(v.stock||0)>0)||vs[0];
 names.forEach(name=>{const value=initial?.options?.[name];if(value!=null)selected[name]=value;});
 area.querySelectorAll('button[data-option]').forEach(b=>b.onclick=()=>{selected[b.dataset.option]=b.dataset.value;update()});
 function item(){if(!current)return null;const price=Number(current.regular_price||0);const quantity=Math.max(1,Number(document.querySelector('#gzProductQty')?.textContent||1));return{product_id:pid,variation_id:current.id,variation_options:current.options||{},quantity,unit_price:price,price,name:data.product?.name||'Product',image_url:imageFor(current)||data.product?.image_url||'',sku:current.sku||''}}
 function addCart(){const x=item();if(!x||Number(current.stock||0)<x.quantity)return false;let cart=[];try{cart=JSON.parse(localStorage.getItem('grabzone_cart_v2')||'[]');if(!Array.isArray(cart))cart=[]}catch{}const existing=cart.find(y=>y.product_id===x.product_id&&y.variation_id===x.variation_id);if(existing){const max=current.max_qty?Number(current.max_qty):Infinity;existing.quantity=Math.min(max,Number(existing.quantity||0)+x.quantity)}else cart.push(x);localStorage.setItem('grabzone_cart_v2',JSON.stringify(cart));return true}
 function buyNow(){const x=item();if(!x||Number(current.stock||0)<x.quantity)return false;localStorage.setItem('grabzone_buy_now_v2',JSON.stringify([x]));location.href='checkout.html';return true}
 function intercept(e){
   const b=e.target.closest?.('.gz-product-actions button');if(!b)return;
   const text=(b.textContent||'').toLowerCase();if(!/add to cart|buy now/.test(text))return;
   if(!current){e.preventDefault();e.stopImmediatePropagation();alert('Please select all product options first.');return}
   const selectedQty=Math.max(1,Number(document.querySelector('#gzProductQty')?.textContent||1));
   if(selectedQty<Number(current.min_qty||1)|| (current.max_qty&&selectedQty>Number(current.max_qty)) || Number(current.stock||0)<selectedQty){e.preventDefault();e.stopImmediatePropagation();alert(Number(current.stock||0)<=0?'This variation is out of stock.':'Please reduce the quantity to the available stock / allowed limit.');return}
   e.preventDefault();e.stopImmediatePropagation();
   if(text.includes('buy now')){if(buyNow()){b.textContent='Opening checkout…';setTimeout(()=>b.textContent='Buy Now',1200)}}else if(addCart()){b.textContent='Added ✓';setTimeout(()=>b.textContent='Add to Cart',900)}
 }
 document.addEventListener('click',intercept,true);
 update();
}
function boot(){
 window.addEventListener('grabzone:product-rendered',()=>{window.__gzCustomerVariationUI=0;window.__gzCustomerVariationLoading=0;setTimeout(()=>customerVariations(),0)});
 vendorVariationManager();customerVariations();let n=0;const t=setInterval(()=>{if(++n>80)return clearInterval(t);if(!document.querySelector('.gz-customer-variations')&&!window.__gzCustomerVariationLoading){window.__gzCustomerVariationUI=0;customerVariations()}},250);if(window.MutationObserver)new MutationObserver(()=>{if(!document.querySelector('.gz-customer-variations')&&!window.__gzCustomerVariationLoading){window.__gzCustomerVariationUI=0;customerVariations()}}).observe(document.body,{childList:true,subtree:true})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();})();