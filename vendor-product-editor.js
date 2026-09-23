(()=>{
'use strict';
const MB=1024*1024,MAX=10,MAX_VARIATIONS=200;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>'৳'+Number(n||0).toLocaleString('en-BD',{maximumFractionDigits:2});
const state={products:[],editing:null,files:[],mainIndex:0,variationOptions:[],variations:[],variationLoading:false};
async function api(path,opt={}){const r=await fetch(path,{credentials:'include',cache:'no-store',...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);return d}
function message(text,ok=false){const el=$('#vpMsg');if(!el)return;el.textContent=text||'';el.className='vp-message '+(ok?'ok':'err')}
function build(){
 const sec=$('#products');if(!sec||sec.dataset.vpReady)return;sec.dataset.vpReady='1';
 sec.innerHTML=`
  <div class="vp-top"><div><span class="vp-kicker"><i></i> CATALOG</span><h1>Products</h1><p>Create simple products or variable products with Color, Size, Material and any combination you need.</p></div><button class="gz-btn primary" id="vpNewTop" type="button">＋ Add Product</button></div>
  <div class="vp-panel vp-form-panel">
   <div class="vp-title"><h2 id="vpFormTitle">＋ Add new product</h2><button class="gz-btn light" id="vpCancel" type="button" hidden>Cancel edit</button></div>
   <form id="vpForm" class="vp-form">
    <input id="vpId" type="hidden">
    <div class="vp-fields">
     <div class="vp-field"><label>Product name *</label><input id="vpName" required placeholder="Portable Electric Kettle"></div>
     <div class="vp-field"><label>Category *</label><input id="vpCategory" required placeholder="Smart Gadgets"></div>
     <div class="vp-field"><label>Product type *</label><select id="vpProductType"><option value="simple">Simple product</option><option value="variable">Variable product</option></select></div>
     <div class="vp-field"><label>SKU</label><input id="vpSku" placeholder="Optional SKU"></div>
     <div class="vp-field"><label>Regular price *</label><input id="vpPrice" type="number" min="0" step="0.01" required placeholder="500"></div>
     <div class="vp-field"><label>Sale price</label><input id="vpSalePrice" type="number" min="0" step="0.01" placeholder="450"></div>
     <div class="vp-field"><label>Old price</label><input id="vpOldPrice" type="number" min="0" step="0.01" placeholder="700"></div>
     <div class="vp-field"><label>Stock</label><input id="vpStock" type="number" min="0" step="1" value="0"></div>
     <div class="vp-field"><label>Low stock alert</label><input id="vpLowStock" type="number" min="0" step="1" value="5"></div>
     <div class="vp-field"><label>Minimum quantity</label><input id="vpMinQty" type="number" min="1" step="1" value="1"></div>
     <div class="vp-field"><label>Maximum quantity</label><input id="vpMaxQty" type="number" min="1" step="1" placeholder="No limit"></div>
     <div class="vp-field vp-full"><label>Tag</label><input id="vpTag" placeholder="New / Hot Deal"></div>
     <div class="vp-field vp-full"><label>Description</label><textarea id="vpDescription" rows="4" placeholder="Tell customers what this product does..."></textarea></div>
     <div class="vp-field vp-full vp-publish"><label><input id="vpPublished" type="checkbox" checked> Publish this product on the GrabZone marketplace</label></div>
    </div>
    <div class="vp-media">
     <div class="vp-preview" id="vpPreview">No images selected</div>
     <label class="vp-file-button">📷 Choose up to 10 product images<input id="vpFiles" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif"></label>
     <div class="vp-file-note" id="vpFileNote">Maximum 10 images · Maximum 1 MB per image.</div>
     <div class="vp-gallery" id="vpGallery"></div>
    </div>
    <section id="vpVariationPanel" class="vp-variation-panel" hidden>
     <div class="vp-var-head"><div><span class="vp-kicker"><i></i> VARIABLE PRODUCT</span><h3>Options & variations</h3><p>Example: Color → Black, White · Size → S, M, L. Generate every exact combination, then set its price, SKU and stock.</p></div><button type="button" class="gz-btn light" id="vpAddOption">＋ Add option</button></div>
     <div id="vpOptions"></div>
     <div class="vp-var-actions"><button type="button" class="gz-btn primary" id="vpGenerateVariations">Generate / Update Variations</button><input id="vpBulkPrice" type="number" min="0" step="0.01" placeholder="Apply regular price to all"><button type="button" class="gz-btn light" id="vpApplyBulk">Apply price to all</button></div>
     <div id="vpVariationMsg" class="vp-var-msg"></div>
     <div class="vp-variation-table-wrap"><table class="vp-variation-table"><thead><tr><th>Combination</th><th>SKU</th><th>Regular</th><th>Sale</th><th>Stock</th><th>Status</th><th>Image URL</th><th></th></tr></thead><tbody id="vpVariationRows"></tbody></table></div>
    </section>
    <div class="vp-actions"><button class="gz-btn primary" id="vpSubmit" type="submit">Upload &amp; Save Product</button><button type="button" class="gz-btn light" onclick="resetProductEditor()">Reset</button></div>
   </form>
   <div id="vpMsg" class="vp-message"></div>
  </div>
  <div class="vp-panel"><div class="vp-title"><div><h2>Your products</h2><p>Manage only products belonging to this vendor.</p></div><button class="gz-btn light" id="vpRefresh" type="button">↻ Refresh</button></div><div class="vp-toolbar"><input id="vpSearch" placeholder="Search your products…"><select id="vpFilter"><option value="all">All products</option><option value="published">Published</option><option value="hidden">Hidden</option><option value="low">Low stock</option></select></div><div id="vpProductList" class="vp-product-list"></div></div>`;
 $('#vpNewTop').onclick=()=>newProduct();$('#vpCancel').onclick=resetForm;$('#vpRefresh').onclick=loadProducts;$('#vpSearch').oninput=renderProducts;$('#vpFilter').onchange=renderProducts;$('#vpFiles').onchange=handleFiles;$('#vpProductType').onchange=toggleVariationPanel;$('#vpAddOption').onclick=()=>addOptionRow();$('#vpGenerateVariations').onclick=generateVariations;$('#vpApplyBulk').onclick=applyBulkPrice;$('#vpForm').onsubmit=saveProduct;
 resetForm();loadProducts();
}
function resetForm(){state.editing=null;state.files=[];state.mainIndex=0;state.variationOptions=[];state.variations=[];$('#vpForm').reset();$('#vpId').value='';$('#vpPublished').checked=true;$('#vpProductType').value='simple';$('#vpLowStock').value=5;$('#vpMinQty').value=1;$('#vpMaxQty').value='';$('#vpFormTitle').textContent='＋ Add new product';$('#vpSubmit').textContent='Upload & Save Product';$('#vpCancel').hidden=true;$('#vpFiles').value='';renderMedia();renderOptionRows();renderVariationRows();toggleVariationPanel();message('')}
function resetProductEditor(){resetForm();window.scrollTo({top:document.querySelector('#products')?.getBoundingClientRect().top+window.scrollY-20||0,behavior:'smooth'})}
async function newProduct(){if(!$('#vpForm'))return;resetForm();$('#vpName').focus()}
async function editProduct(id){
 const p=state.products.find(x=>String(x.id)===String(id));if(!p)return;
 state.editing=p;state.files=[];state.mainIndex=0;
 $('#vpId').value=p.id;$('#vpName').value=p.name||'';$('#vpCategory').value=p.category||'';$('#vpProductType').value=p.product_type==='variable'?'variable':'simple';$('#vpPrice').value=p.price??'';$('#vpSalePrice').value=p.sale_price??'';$('#vpOldPrice').value=p.old_price??'';$('#vpSku').value=p.sku||'';$('#vpStock').value=p.stock??0;$('#vpLowStock').value=p.low_stock_threshold??5;$('#vpMinQty').value=p.min_qty??1;$('#vpMaxQty').value=p.max_qty??'';$('#vpTag').value=p.tag||'';$('#vpDescription').value=p.description||'';$('#vpPublished').checked=!!p.published;
 $('#vpFormTitle').textContent='✎ Edit product';$('#vpSubmit').textContent='Save Product Changes';$('#vpCancel').hidden=false;renderMedia();toggleVariationPanel();
 if(p.product_type==='variable'){await loadVariations(p.id)}else{state.variationOptions=[];state.variations=[];renderOptionRows();renderVariationRows()}
 window.scrollTo({top:$('#products').getBoundingClientRect().top+window.scrollY-20,behavior:'smooth'});
}
function handleFiles(){const files=[...($('#vpFiles').files||[])];if(files.length>MAX){alert('Maximum 10 images per product.');$('#vpFiles').value='';state.files=[];renderMedia();return}const bad=files.find(f=>f.size>MB||!/^image\/(jpeg|png|webp|gif|avif)$/i.test(f.type));if(bad){alert(`${bad.name} is not a supported image or is larger than 1 MB.`);$('#vpFiles').value='';state.files=[];renderMedia();return}state.files=files;state.mainIndex=0;renderMedia()}
function renderMedia(){const preview=$('#vpPreview'),gallery=$('#vpGallery'),note=$('#vpFileNote');if(!preview||!gallery)return;gallery.innerHTML='';if(state.files.length){note.textContent=state.files.map((f,i)=>`${i===state.mainIndex?'★ ':''}${f.name} (${Math.ceil(f.size/1024)} KB)`).join(' • ');state.files.forEach((file,i)=>{const item=document.createElement('button');item.type='button';item.className='vp-thumb '+(i===state.mainIndex?'main':'');item.title='Click to make main image';const img=document.createElement('img');img.alt='';img.src=URL.createObjectURL(file);item.appendChild(img);item.onclick=()=>{state.mainIndex=i;renderMedia()};gallery.appendChild(item)});preview.innerHTML=`<img alt="" src="${URL.createObjectURL(state.files[state.mainIndex])}"><span class="vp-main-label">MAIN IMAGE</span>`;return}
 const existing=(state.editing?.image_urls||[]).filter(Boolean);if(existing.length){note.textContent='Existing images. Choose new files above to replace the gallery.';existing.forEach((url,i)=>{const item=document.createElement('button');item.type='button';item.className='vp-thumb '+(i===0?'main':'');item.title=i===0?'Current main image':'Current gallery image';const img=document.createElement('img');img.alt='';img.src=url;item.appendChild(img);gallery.appendChild(item)});preview.innerHTML=`<img alt="" src="${esc(existing[0])}"><span class="vp-main-label">MAIN IMAGE</span>`}else{note.textContent='Maximum 10 images · Maximum 1 MB per image.';preview.textContent='No images selected'}}
async function upload(file){if(file.size>MB)throw Error(`${file.name} is larger than 1 MB.`);const fd=new FormData();fd.append('file',file,file.name);fd.append('kind','product-image');const r=await fetch('/api/vendor/upload',{method:'POST',credentials:'include',body:fd});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Image upload failed');return d.url}
function toggleVariationPanel(){const on=$('#vpProductType')?.value==='variable';const panel=$('#vpVariationPanel');if(panel)panel.hidden=!on}
function addOptionRow(o={name:'',values:[]}){
 const box=$('#vpOptions');if(!box)return;
 const row=document.createElement('div');row.className='vp-option-row';row.innerHTML=`<input class="vp-option-name" placeholder="Option name (e.g. Color)" value="${esc(o.name||'')}"><input class="vp-option-values" placeholder="Values separated by commas (e.g. Black, White)" value="${esc((o.values||[]).join(', '))}"><button type="button" class="gz-btn light vp-remove-option">Remove</button>`;
 row.querySelector('.vp-remove-option').onclick=()=>{row.remove();collectOptionRows()};box.appendChild(row)
}
function collectOptionRows(){state.variationOptions=[...document.querySelectorAll('#vpOptions .vp-option-row')].map(r=>({name:r.querySelector('.vp-option-name')?.value.trim()||'',values:(r.querySelector('.vp-option-values')?.value||'').split(',').map(x=>x.trim()).filter(Boolean)})).filter(x=>x.name&&x.values.length)}
function renderOptionRows(){const box=$('#vpOptions');if(!box)return;box.innerHTML='';(state.variationOptions.length?state.variationOptions:[]).forEach(addOptionRow)}
async function loadVariations(pid){
 const msg=$('#vpVariationMsg');if(msg)msg.textContent='Loading variations…';
 try{const d=await api('/api/vendor/variations?product_id='+encodeURIComponent(pid));state.variationOptions=(d.options||[]).map(o=>({name:o.name,values:(o.values||[]).map(v=>v.value)}));state.variations=d.variations||[];renderOptionRows();renderVariationRows();if(msg)msg.textContent=state.variations.length?`${state.variations.length} variations loaded.`:'No variations yet. Add options and generate combinations.'}
 catch(e){state.variationOptions=[];state.variations=[];renderOptionRows();renderVariationRows();if(msg)msg.textContent='⚠ '+e.message}
}
async function generateVariations(){
 collectOptionRows();if(!state.variationOptions.length)return alert('Add at least one option with values.');
 let count=1;for(const o of state.variationOptions)count*=o.values.length;if(count>MAX_VARIATIONS)return alert(`This will create ${count} variations. Maximum is ${MAX_VARIATIONS}.`);
 const pid=$('#vpId').value.trim();if(!pid){message('Save the product first, then generate variations.',false);return}
 const msg=$('#vpVariationMsg');msg.textContent='Generating combinations…';
 try{const d=await api('/api/vendor/variations?product_id='+encodeURIComponent(pid),{method:'POST',body:JSON.stringify({options:state.variationOptions})});state.variations=d.variations||[];renderVariationRows();msg.textContent=`✓ ${d.count} variations generated.`;$('#vpProductType').value='variable'}catch(e){msg.textContent='⚠ '+e.message}
}
function renderVariationRows(){
 const body=$('#vpVariationRows');if(!body)return;
 if(!state.variations.length){body.innerHTML='<tr><td colspan="8" class="vp-var-empty">No variations yet. Save the product, add options and click Generate / Update Variations.</td></tr>';return}
 body.innerHTML=state.variations.map(v=>{const labels=Object.entries(v.options||{}).map(([k,x])=>k+': '+x).join(' · ');return `<tr data-variation-id="${esc(v.id)}"><td><b>${esc(labels||'Variation')}</b></td><td><input data-v="sku" value="${esc(v.sku||'')}"></td><td><input data-v="regular" type="number" min="0" step="0.01" value="${Number(v.regular_price??0)}"></td><td><input data-v="sale" type="number" min="0" step="0.01" value="${v.sale_price==null?'':Number(v.sale_price)}"></td><td><input data-v="stock" type="number" min="0" step="1" value="${Number(v.stock||0)}"></td><td><select data-v="status"><option ${v.status==='Available'?'selected':''}>Available</option><option ${v.status==='Out of Stock'?'selected':''}>Out of Stock</option><option ${v.status==='Disabled'?'selected':''}>Disabled</option></select></td><td><input data-v="image" value="${esc(v.image_url||'')}" placeholder="/api/vendor/media/..."></td><td><button type="button" class="gz-btn light vp-save-variation">Save</button></td></tr>`}).join('');
 body.querySelectorAll('.vp-save-variation').forEach(btn=>btn.onclick=saveVariation)
}
async function saveVariation(e){
 const row=e.currentTarget.closest('tr'),id=row?.dataset.variationId;if(!id)return;
 const val=k=>row.querySelector('[data-v="'+k+'"]')?.value??'',btn=e.currentTarget;
 btn.disabled=true;
 try{await api('/api/vendor/variations/'+encodeURIComponent(id)+'?product_id='+encodeURIComponent($('#vpId').value),{method:'PATCH',body:JSON.stringify({sku:val('sku'),regular_price:Number(val('regular')||0),sale_price:val('sale')===''?null:Number(val('sale')),stock:Number(val('stock')||0),status:val('status'),image_url:val('image')})});btn.textContent='Saved ✓';setTimeout(()=>btn.textContent='Save',900)}catch(err){alert(err.message)}finally{btn.disabled=false}
}
async function applyBulkPrice(){
 const price=$('#vpBulkPrice').value;if(price==='')return alert('Enter a regular price first.');
 const rows=[...document.querySelectorAll('#vpVariationRows tr[data-variation-id]')];if(!rows.length)return alert('Generate variations first.');
 try{for(const row of rows){await api('/api/vendor/variations/'+encodeURIComponent(row.dataset.variationId)+'?product_id='+encodeURIComponent($('#vpId').value),{method:'PATCH',body:JSON.stringify({regular_price:Number(price)})})}await loadVariations($('#vpId').value);$('#vpBulkPrice').value=''}catch(e){alert(e.message)}
}
async function saveProduct(e){
 e.preventDefault();const btn=$('#vpSubmit');btn.disabled=true;message('Saving product…',true);
 try{
  const id=$('#vpId').value.trim();let urls=null,mainUrl=null;
  if(state.files.length){if(state.files.length>MAX)throw Error('Maximum 10 images per product.');const uploaded=[];for(const f of state.files)uploaded.push(await upload(f));urls=uploaded;mainUrl=uploaded[state.mainIndex]||uploaded[0]}
  else if(state.editing){urls=(state.editing.image_urls||[]).filter(Boolean);mainUrl=urls[0]||state.editing.image_url||''}
  else throw Error('Please choose at least one product image.');
  const body={name:$('#vpName').value.trim(),category:$('#vpCategory').value.trim(),price:Number($('#vpPrice').value),sale_price:$('#vpSalePrice').value===''?null:Number($('#vpSalePrice').value),old_price:$('#vpOldPrice').value===''?null:Number($('#vpOldPrice').value),low_stock_threshold:Number($('#vpLowStock').value||0),min_qty:Number($('#vpMinQty').value||1),max_qty:$('#vpMaxQty').value===''?null:Number($('#vpMaxQty').value),product_type:$('#vpProductType').value,sku:$('#vpSku').value.trim(),stock:Number($('#vpStock').value||0),tag:$('#vpTag').value.trim(),description:$('#vpDescription').value,published:$('#vpPublished').checked,image_url:mainUrl,image_urls:urls};
  if(id)body.id=id;
  const d=await api('/api/vendor/products',{method:id?'PATCH':'POST',body:JSON.stringify(body)});
  const productId=id||d.id||d.product?.id;
  if(!productId)throw Error('Product was saved but no product ID was returned.');
  if($('#vpProductType').value==='variable'){
   collectOptionRows();
   if(!state.variationOptions.length)throw Error('Variable product needs at least one option with values.');
   const vr=await api('/api/vendor/variations?product_id='+encodeURIComponent(productId),{method:'POST',body:JSON.stringify({options:state.variationOptions})});
   state.variations=vr.variations||[];
   state.editing={...(d.product||{}),id:productId,image_urls:urls||[]};
   renderVariationRows();
   message(id?'Product updated and variations regenerated.':'Product added. Variations generated successfully.',true);
  }else{
   message(id?'Product updated successfully.':'Product added successfully.',true);
  }
  await loadProducts();if(typeof window.loadDash==='function')window.loadDash();if(!id){state.editing=d.product||{id:productId,image_urls:urls||[]};$('#vpId').value=productId;$('#vpFormTitle').textContent='✎ Edit product';$('#vpSubmit').textContent='Save Product Changes';$('#vpCancel').hidden=false}
 }catch(err){message(err.message||'Could not save product.')}finally{btn.disabled=false}
}
async function loadProducts(){try{const d=await api('/api/vendor/products');state.products=Array.isArray(d.products)?d.products:[];renderProducts()}catch(err){const list=$('#vpProductList');if(list)list.innerHTML=`<div class="vp-error">${esc(err.message)}</div>`}}
function renderProducts(){const q=($('#vpSearch')?.value||'').trim().toLowerCase(),f=$('#vpFilter')?.value||'all';const rows=state.products.filter(p=>{const text=[p.name,p.sku,p.category,p.tag].join(' ').toLowerCase();if(q&&!text.includes(q))return false;if(f==='published'&&!p.published)return false;if(f==='hidden'&&p.published)return false;if(f==='low'&&Number(p.stock||0)>5)return false;return true});const list=$('#vpProductList');if(!list)return;list.innerHTML=rows.map(p=>{const imgs=(p.image_urls||[]).filter(Boolean),src=imgs[0]||p.image_url||'';return `<article class="vp-product-card"><div class="vp-card-image">${src?`<img src="${esc(src)}" alt="">`:'<span>No image</span>'}</div><div class="vp-card-info"><h3>${esc(p.name)}</h3><div class="vp-meta">${esc(p.category||'No category')} · SKU ${esc(p.sku||'—')}</div><div class="vp-meta">${p.product_type==='variable'?'Variable':'Simple'} · Price <b>${money(p.price)}</b> · Stock <b>${Number(p.stock||0)}</b> · ${p.published?'Published':'Hidden'}</div><div class="vp-meta">${imgs.length||p.image_url?'📷 '+(imgs.length||1)+' image'+((imgs.length||1)>1?'s':''):'No image'}${p.tag?' · '+esc(p.tag):''}</div></div><button class="gz-btn light vp-edit" type="button" data-id="${esc(p.id)}">Edit Product</button></article>`}).join('')||'<div class="vp-empty">No products match your search.</div>';list.querySelectorAll('.vp-edit').forEach(b=>b.onclick=()=>editProduct(b.dataset.id))}
window.newProduct=newProduct;window.editProduct=editProduct;window.loadProducts=loadProducts;window.renderProducts=renderProducts;window.resetProductEditor=resetProductEditor;
const start=()=>{build()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();